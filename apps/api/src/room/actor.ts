// Dono de uma sala num único processo (ADR-0002). Toda mutação entra na fila `#enqueue` e roda uma de cada vez,
// inclusive as que esperam I/O (playlist, áudio, Postgres); as transições são as da engine (@merma/domain).
import {
  configureMatch,
  currentRound,
  derivePhase,
  endMatch,
  endRound,
  err,
  findPlayer,
  finishCountdown,
  hasNextRound,
  joinRoom,
  leaveRoom,
  markAudioResolved,
  markPersisted,
  normalize,
  ok,
  PlaylistId,
  replaceUnplayableSong,
  returnToLobby,
  selectPlaylist,
  setAfk,
  setConnectionStatus,
  setReady,
  shouldEndRound,
  skipVotesNeeded,
  songRange,
  startGame,
  startGracePeriod,
  startRound,
  startTimer,
  submitAnswer,
  terminateRoom,
  transferHost,
  voteSkip,
  type DomainError,
  type LeaveReason,
  type Match,
  type PlayerUuid,
  type Result,
  type Room,
  type RoundId,
  type Song,
  type SoloOutcome,
} from "@merma/domain";
import { CloseCode, type ErrorCode, type Phase, type WsClientMessage, type WsServerMessage } from "@merma/schema";
import type { Logger } from "../http/logger.ts";
import type { Metrics } from "../observability/metrics.ts";
import type { ServerSocket } from "../http/socket.ts";
import type {
  AudioResolver,
  Cancel,
  Clock,
  CompletedMatch,
  Ids,
  MatchRepository,
  ResolvedAudio,
  SnapshotStore,
  SoloRecords,
  SongSource,
} from "./ports.ts";
import { suspiciousPlayers } from "./suspicious.ts";
import { errorMessage, fromWireConfig, gameEnded, roomState, roundEnded, toErrorCode, toWireConfig, toWirePlayer } from "./wire.ts";

export type ActorDeps = Readonly<{
  clock: Clock;
  ids: Ids;
  logger: Logger;
  snapshots: SnapshotStore;
  songs: SongSource;
  audio: AudioResolver;
  matches: MatchRepository;
  solo: SoloRecords;
  metrics: Metrics;
}>;

// Mensagens que chegam ao actor: join_room e ping o WsGateway trata antes.
export type RoomCommand = Exclude<WsClientMessage, { type: "join_room" | "ping" }>;

// Tempos das máquinas de estado (docs/architecture.md) e do GDD.
export const TIMING = {
  countdownMs: 3_000, // game_starting
  gracePeriodMs: 3_000, // R-101
  revealMs: 3_000, // R-130
  resultsMs: 5_000, // R-703
  reconnectWindowMs: 120_000, // R-602
  hostTimeoutMs: 60_000, // R-603
  emptyRoomMs: 600_000, // 10 min vazia → terminated
  snapshotEveryMs: 5_000, // ADR-0009
} as const;

const AUTOCOMPLETE_LIMIT = 10; // R-104
// S-12: o token da rodada sai no round_starting e é reemitido a cada reconexão, até 3 por jogador.
export const MAX_AUDIO_TOKENS_PER_ROUND = 3;

export type AudioError = "round_expired" | "token_already_used" | "audio_not_ready";

export type RoomSummary = Readonly<{ invite_code: string; phase: Phase; player_count: number }>;

export class RoomActor {
  #room: Room;
  readonly #deps: ActorDeps;
  readonly #onTerminated: (invite_code: string) => void;
  readonly #sockets = new Map<PlayerUuid, ServerSocket>();
  // Músicas tocáveis da playlist escolhida por cada jogador: o pool do sorteio e do autocomplete (R-104).
  readonly #songs = new Map<PlayerUuid, readonly Song[]>();
  readonly #timers = new Map<string, Cancel>();
  #audio: Readonly<{ round_id: RoundId; audio: ResolvedAudio }> | null = null;
  // Tokens da rodada atual (S-12): o último emitido para cada jogador e os já usados ou substituídos.
  readonly #audioTokens = new Map<PlayerUuid, Readonly<{ token: string; issued: number }>>();
  readonly #usedAudioTokens = new Set<string>();
  #tail: Promise<void> = Promise.resolve();
  // round_duration_seconds: do round_starting ao round_ended.
  #roundStartedAt: number | null = null;

  constructor(room: Room, deps: ActorDeps, onTerminated: (invite_code: string) => void = () => {}) {
    this.#room = room;
    this.#deps = deps;
    this.#onTerminated = onTerminated;
    if (room.state === "empty") this.#schedule("empty", TIMING.emptyRoomMs, () => this.#enqueue(() => this.#terminate()));
  }

  get inviteCode(): string {
    return this.#room.invite_code;
  }

  get roomId(): string {
    return this.#room.room_id;
  }

  // Leitura sem mutação: não precisa da fila.
  get state(): Room {
    return this.#room;
  }

  // A rodada que está tocando, para o proxy de áudio achar a sala pelo round_id do token.
  get playingRoundId(): RoundId | undefined {
    const match = this.#room.match;
    const round = match === null ? undefined : currentRound(match);
    return round?.state === "grace_period" || round?.state === "timer_running" ? round.round_id : undefined;
  }

  summary(): RoomSummary {
    return { invite_code: this.#room.invite_code, phase: derivePhase(this.#room), player_count: this.#room.players.length };
  }

  // Resolve quando tudo o que já está na fila terminou. Para os testes e o desligamento.
  idle(): Promise<void> {
    return this.#tail;
  }

  // --- Entrada (WsGateway) -------------------------------------------------------------------------------------------

  // join_room. Entrar de novo é reconectar (R-602); a conexão anterior do mesmo jogador fecha com 4001 (R-605, S-03).
  async join(player: PlayerUuid, nickname: string, socket: ServerSocket): Promise<boolean> {
    let accepted = false;
    await this.#enqueue(() => {
      const before = this.#room;
      const reconnecting = findPlayer(before, player)?.connection_status === "reconnecting";
      const known = findPlayer(before, player) !== undefined;
      const joined = joinRoom(before, { player_uuid: player, nickname, platform: null }, this.#deps.clock.now());
      if (!joined.ok) return this.#reject(socket, toErrorCode(joined.error));
      accepted = true;
      const previous = this.#sockets.get(player);
      if (previous !== undefined && previous !== socket) previous.close(CloseCode.duplicate_identity, "duplicate_identity");
      this.#sockets.set(player, socket);
      this.#cancel(`reconnect:${player}`);
      if (joined.value.host_uuid === player) this.#cancel("host");
      this.#commit(before, joined.value);
      const me = findPlayer(this.#room, player);
      this.#sendTo(player, this.#roomStateFor(player));
      if (me !== undefined) this.#broadcast({ type: "player_joined", player: toWirePlayer(this.#room, me) }, player);
      if (!known) this.#deps.logger.info("room_player_joined", { invite_code: before.invite_code, player_uuid: player });
      if (reconnecting) this.#deps.logger.info("player_reconnected", { invite_code: before.invite_code, player_uuid: player });
    });
    return accepted;
  }

  receive(player: PlayerUuid, command: RoomCommand, socket: ServerSocket): Promise<void> {
    return this.#enqueue(() => this.#handle(player, command, socket));
  }

  // O socket caiu. Só conta se ainda for a conexão atual do jogador (a antiga fechada por 4001 não conta).
  disconnect(player: PlayerUuid, socket: ServerSocket): Promise<void> {
    return this.#enqueue(() => {
      if (this.#sockets.get(player) !== socket) return;
      this.#sockets.delete(player);
      const before = this.#room;
      const status = setConnectionStatus(before, player, "reconnecting", this.#deps.clock.now());
      if (!status.ok) return;
      this.#commit(before, status.value);
      this.#scheduleReconnect(player);
    });
  }

  // Grava o snapshot agora (desligamento, ADR-0017.R8). Fora de in_match não grava nada (ADR-0009.R2).
  async snapshot(): Promise<void> {
    let written: Promise<void> = Promise.resolve();
    await this.#enqueue(() => {
      written = this.#writeSnapshot();
    });
    await written;
  }

  // RecoveryService (docs/architecture.md#recuperação): todos voltam como reconectando e o fluxo retoma de onde estava.
  resume(): Promise<void> {
    return this.#enqueue(async () => {
      const now = this.#deps.clock.now();
      for (const p of this.#room.players) {
        const status = setConnectionStatus(this.#room, p.player_uuid, "reconnecting", now);
        if (status.ok) this.#room = status.value;
        this.#scheduleReconnect(p.player_uuid);
      }
      const match = this.#room.match;
      if (this.#room.state !== "in_match" || match === null) return;
      this.#startSnapshots();
      if (match.state === "countdown") return this.#schedule("flow", TIMING.countdownMs, () => this.#enqueue(() => this.#countdownDone()));
      const round = currentRound(match);
      if (round === undefined) return this.#nextRound();
      if (round.state === "streaming" || round.state === "grace_period" || round.state === "timer_running") {
        const audio = await this.#deps.audio.resolve(round.round_id, round.song);
        if (audio !== null) this.#audio = { round_id: round.round_id, audio };
      }
      if (round.state === "resolving") return this.#resolveRound();
      if (round.state === "streaming") return this.#beginGracePeriod();
      if (round.state === "grace_period") return this.#schedule("flow", TIMING.gracePeriodMs, () => this.#enqueue(() => this.#beginTimer()));
      if (round.state === "reveal") return this.#schedule("flow", TIMING.revealMs, () => this.#enqueue(() => this.#afterReveal()));
      this.#scheduleRoundEnd();
    });
  }

  // Proxy de áudio (ADR-0025.R3, S-12, S-14), depois de o token ter sido verificado: a rodada ainda toca, o token não
  // foi usado nem substituído, e o MP3 existe. Marcar o token como usado é mutação, por isso entra na fila.
  async takeAudio(player: PlayerUuid, round_id: string, token: string): Promise<Result<Uint8Array<ArrayBuffer>, AudioError>> {
    let result: Result<Uint8Array<ArrayBuffer>, AudioError> = err("round_expired");
    await this.#enqueue(() => {
      result = this.#takeAudio(player, round_id, token);
    });
    return result;
  }

  #takeAudio(player: PlayerUuid, round_id: string, token: string): Result<Uint8Array<ArrayBuffer>, AudioError> {
    if (this.playingRoundId !== round_id) return err("round_expired");
    if (this.#usedAudioTokens.has(token)) return err("token_already_used");
    const audio = this.#audio?.round_id === round_id ? this.#audio.audio : undefined;
    if (audio === undefined) return err("audio_not_ready");
    this.#usedAudioTokens.add(token);
    // Token assinado mas não emitido por este actor: só acontece com um emitido antes de uma recuperação.
    if (this.#audioTokens.get(player)?.token !== token) this.#deps.logger.warn("audio_token_unknown", { invite_code: this.#room.invite_code });
    return ok(audio.mp3);
  }

  // --- Comandos ------------------------------------------------------------------------------------------------------

  async #handle(player: PlayerUuid, command: RoomCommand, socket: ServerSocket): Promise<void> {
    if (this.#sockets.get(player) !== socket) return;
    const room = this.#room;
    switch (command.type) {
      case "player_ready":
      case "player_unready": {
        const ready = command.type === "player_ready";
        if (!this.#apply(socket, setReady(room, player, ready))) return;
        return this.#broadcast({ type: "player_ready_changed", player_uuid: player, ready });
      }
      case "player_afk_changed":
        if (!this.#apply(socket, setAfk(room, player, command.afk))) return;
        return this.#broadcast({ type: "player_afk_changed", player_uuid: player, afk: command.afk });
      case "configure_match":
        if (!this.#apply(socket, configureMatch(room, player, fromWireConfig(command.config)))) return;
        return this.#broadcastConfig();
      case "select_playlist":
        return this.#selectPlaylist(player, command, socket);
      case "start_game":
        return this.#startGame(player, socket);
      case "submit_answer": {
        if (!this.#apply(socket, submitAnswer(room, player, command.answer_text, this.#deps.clock.now()))) return;
        this.#sendTo(player, { type: "answer_confirmed" }); // S-21: sem dizer se acertou
        return this.#checkRoundEnd();
      }
      case "vote_skip": {
        if (!this.#apply(socket, voteSkip(room, player))) return;
        const match = this.#room.match;
        const votes = (match === null ? undefined : currentRound(match))?.skip_votes.length ?? 1;
        this.#broadcast({ type: "player_voted_skip", player_uuid: player, skip_votes: votes, votes_needed: skipVotesNeeded(this.#room) });
        return this.#checkRoundEnd();
      }
      case "autocomplete_search":
        return this.#sendTo(player, { type: "autocomplete_results", query: command.query, results: this.#autocomplete(command.query) });
      case "player_leave":
        this.#leave(player, "voluntary");
        return socket.close(CloseCode.normal, "player_leave");
    }
  }

  async #selectPlaylist(
    player: PlayerUuid,
    command: Extract<RoomCommand, { type: "select_playlist" }>,
    socket: ServerSocket,
  ): Promise<void> {
    if (this.#room.state !== "lobby") return this.#reject(socket, "illegal_state_transition");
    const playlist_id = PlaylistId(command.playlist_id);
    if (!playlist_id.ok) return this.#reject(socket, "invalid_payload");
    const songs = await this.#deps.songs.playlist(player, playlist_id.value);
    if (!songs.ok) return this.#reject(socket, songs.error === "source_unavailable" ? "internal_error" : songs.error);
    const selection = { playlist_id: playlist_id.value, platform: songs.value.platform, playable_songs: songs.value.playable_songs };
    if (!this.#apply(socket, selectPlaylist(this.#room, player, selection))) return;
    this.#songs.set(player, songs.value.songs);
    // Nenhum evento parcial diz "escolheu playlist" (R-006): todos recebem o estado inteiro.
    this.#broadcastRoomState();
  }

  #startGame(player: PlayerUuid, socket: ServerSocket): void {
    const songs = [...this.#songs].map(([player_uuid, list]) => ({ player_uuid, songs: list }));
    const input = { match_id: this.#deps.ids.matchId(), songs, seed: this.#deps.ids.seed(), now: this.#deps.clock.now() };
    if (!this.#apply(socket, startGame(this.#room, player, input))) return;
    this.#broadcast({ type: "game_starting", countdown_seconds: 3 });
    const match = this.#room.match;
    this.#deps.logger.info("match_started", {
      invite_code: this.#room.invite_code,
      match_id: match?.match_id,
      game_mode: match?.config.game_mode,
      total_rounds: match?.total_rounds,
      players: match?.participants.length,
    });
    this.#startSnapshots();
    this.#schedule("flow", TIMING.countdownMs, () => this.#enqueue(() => this.#countdownDone()));
  }

  #leave(player: PlayerUuid, reason: LeaveReason): void {
    this.#sockets.delete(player);
    this.#cancel(`reconnect:${player}`);
    this.#songs.delete(player);
    const before = this.#room;
    const left = leaveRoom(before, player, this.#deps.clock.now());
    if (!left.ok) return;
    this.#commit(before, left.value);
    this.#broadcast({ type: "player_left", player_uuid: player, reason });
    if (reason === "timeout") this.#deps.logger.info("player_timeout", { invite_code: this.#room.invite_code, player_uuid: player });
    if (this.#room.state === "lobby") this.#broadcastConfig();
    this.#checkRoundEnd();
  }

  // R-104: substring no pool total de quem está na sala, sem fuzzy. Nunca devolve o pool inteiro (S-22).
  #autocomplete(query: string): Extract<WsServerMessage, { type: "autocomplete_results" }>["results"] {
    const needle = normalize(query);
    if (needle === "") return [];
    const present = new Set(this.#room.players.map((p) => p.player_uuid));
    const seen = new Set<string>();
    const results: { text: string; kind: "song" | "artist" }[] = [];
    for (const [owner, songs] of this.#songs) {
      if (!present.has(owner)) continue;
      for (const song of songs) {
        for (const [text, kind] of [[song.name, "song"], [song.artist, "artist"]] as const) {
          const key = `${kind}:${normalize(text)}`;
          if (seen.has(key) || !normalize(text).includes(needle)) continue;
          seen.add(key);
          results.push({ text, kind });
          if (results.length === AUTOCOMPLETE_LIMIT) return results;
        }
      }
    }
    return results;
  }

  // --- Fluxo da partida ----------------------------------------------------------------------------------------------

  async #countdownDone(): Promise<void> {
    if (this.#advance(finishCountdown(this.#room))) await this.#nextRound();
  }

  async #nextRound(): Promise<void> {
    if (this.#advance(startRound(this.#room, this.#deps.ids.roundId()))) await this.#resolveRound();
  }

  // resolving → streaming. Música sem áudio sai pela reserva, ou a rodada some (R-307).
  async #resolveRound(): Promise<void> {
    for (;;) {
      const round = this.#room.match === null ? undefined : currentRound(this.#room.match);
      // A rodada saiu sem reserva (R-307): segue para a próxima, ou encerra.
      if (round?.state !== "resolving") return this.#afterReveal();
      const audio = await this.#deps.audio.resolve(round.round_id, round.song);
      if (audio !== null) {
        this.#audio = { round_id: round.round_id, audio };
        if (this.#advance(markAudioResolved(this.#room))) this.#beginGracePeriod();
        return;
      }
      this.#deps.logger.warn("audio_unavailable", { invite_code: this.#room.invite_code, round_id: round.round_id });
      if (!this.#advance(replaceUnplayableSong(this.#room))) return;
    }
  }

  // streaming → grace_period: round_starting leva o audio_token de cada jogador (ADR-0025).
  #beginGracePeriod(): void {
    if (!this.#advance(startGracePeriod(this.#room))) return;
    this.#roundStartedAt = this.#deps.clock.now();
    const match = this.#room.match;
    const round = match === null ? undefined : currentRound(match);
    if (match === null || round === undefined) return;
    for (const player of this.#sockets.keys()) {
      const audio = this.#audioFor(player, round.round_id);
      if (audio === undefined) continue;
      this.#sendTo(player, { type: "round_starting", round_index: round.index, total_rounds: match.total_rounds, audio, grace_period_seconds: 3 });
    }
    this.#schedule("flow", TIMING.gracePeriodMs, () => this.#enqueue(() => this.#beginTimer()));
  }

  #beginTimer(): void {
    const now = this.#deps.clock.now();
    if (!this.#advance(startTimer(this.#room, now))) return;
    const duration = Math.round((this.#room.match?.config.time_per_round ?? 0) / 1000);
    this.#broadcast({ type: "timer_started", duration_seconds: duration, server_now: now });
    this.#scheduleRoundEnd();
  }

  #scheduleRoundEnd(): void {
    const match = this.#room.match;
    const round = match === null ? undefined : currentRound(match);
    if (match === null || round?.timer_started_at == null) return;
    const remaining = round.timer_started_at + match.config.time_per_round - this.#deps.clock.now();
    this.#schedule("flow", Math.max(0, remaining), () => this.#enqueue(() => this.#checkRoundEnd()));
  }

  // A engine decide se a rodada acaba (timer ou maioria pulou); chamado a cada resposta, voto, saída e no timer.
  #checkRoundEnd(): void {
    const reason = shouldEndRound(this.#room, this.#deps.clock.now());
    if (reason === null || !this.#advance(endRound(this.#room, reason))) return;
    this.#cancel("flow");
    this.#clearAudio(); // S-14: o token morre com a rodada
    const match = this.#room.match;
    const round = match === null ? undefined : currentRound(match);
    if (match !== null && round !== undefined) {
      this.#broadcast(roundEnded(match, round));
      this.#deps.logger.info("round_completed", {
        invite_code: this.#room.invite_code,
        match_id: match.match_id,
        round_index: round.index,
        end_reason: round.end_reason,
        answers: round.answers.length,
        correct: round.answers.filter((a) => a.is_correct).length,
      });
    }
    if (this.#roundStartedAt !== null) this.#deps.metrics.roundDuration.observe((this.#deps.clock.now() - this.#roundStartedAt) / 1000);
    this.#roundStartedAt = null;
    this.#schedule("flow", TIMING.revealMs, () => this.#enqueue(() => this.#afterReveal()));
  }

  async #afterReveal(): Promise<void> {
    this.#clearAudio();
    const match = this.#room.match;
    if (match !== null && hasNextRound(match)) return this.#nextRound();
    return this.#finishIfDone();
  }

  #finishIfDone(): void {
    const match = this.#room.match;
    if (match === null || match.state !== "in_progress" || hasNextRound(match)) return;
    const before = this.#room;
    const ended = endMatch(before, this.#deps.clock.now());
    if (!ended.ok) return this.#logIllegal(ended.error);
    this.#commit(before, ended.value);
  }

  // in_match → finished, pelo fim da partida ou porque todos saíram. A escrita única no Postgres (ADR-0006.R1).
  // Roda na fila, numa tarefa própria: o markPersisted depois do await também é mutação.
  async #matchCompleted(): Promise<void> {
    const match = this.#room.match;
    if (match === null) return;
    this.#stopSnapshots();
    // Todos saíram antes do fim: a engine encerra a partida do mesmo jeito (in_match → finished).
    const abandoned = this.#room.players.length === 0;
    this.#deps.logger.info(abandoned ? "match_abandoned" : "match_completed", {
      invite_code: this.#room.invite_code,
      match_id: match.match_id,
      rounds: match.rounds.length,
    });
    for (let n = suspiciousPlayers(match).length; n > 0; n--) this.#deps.metrics.suspiciousPatterns.inc();
    if (!abandoned) this.#broadcast(gameEnded(match, await this.#soloOutcome(match)));
    this.#schedule("flow", TIMING.resultsMs, () => this.#enqueue(() => this.#backToLobby()));
    const saved = await this.#deps.matches.saveCompleted(completedMatch(this.#room.room_id, match));
    if (!saved.ok) {
      this.#deps.logger.error("match_persist_failed", { invite_code: this.#room.invite_code, match_id: match.match_id });
      return;
    }
    const persisted = markPersisted(this.#room);
    if (persisted.ok) this.#room = persisted.value;
    await this.#deps.snapshots.delete(this.#room.invite_code);
  }

  // R-704: o game_ended do solo espera a Progression. Se ela falhar, sai sem solo_comparison (o campo é opcional).
  async #soloOutcome(match: Match): Promise<SoloOutcome | null> {
    const playlist = this.#room.players[0]?.playlist;
    if (match.config.game_mode !== "solo" || playlist == null) return null;
    const outcome = await this.#deps.solo.complete(match, playlist.playlist_id);
    if (outcome.ok) {
      if (outcome.value?.is_new_personal_best === true) {
        this.#deps.logger.info("solo_personal_best_broken", { player_uuid: this.#room.players[0]?.player_uuid, match_id: match.match_id });
      }
      return outcome.value;
    }
    this.#deps.logger.error("solo_record_failed", { invite_code: this.#room.invite_code, match_id: match.match_id });
    return null;
  }

  #backToLobby(): void {
    const before = this.#room;
    const back = returnToLobby(before);
    if (!back.ok) return this.#logIllegal(back.error);
    this.#commit(before, back.value);
    this.#broadcastRoomState();
  }

  #terminate(): void {
    const ended = terminateRoom(this.#room);
    if (!ended.ok) return;
    this.#room = ended.value;
    this.#cancelAll();
    this.#onTerminated(this.#room.invite_code);
  }

  // --- Conexão e host ------------------------------------------------------------------------------------------------

  #scheduleReconnect(player: PlayerUuid): void {
    this.#schedule(`reconnect:${player}`, TIMING.reconnectWindowMs, () => this.#enqueue(() => this.#leave(player, "timeout")));
    if (this.#room.host_uuid === player) this.#scheduleHostTimeout();
  }

  #scheduleHostTimeout(): void {
    this.#schedule("host", TIMING.hostTimeoutMs, () => this.#enqueue(() => this.#replaceHost()));
  }

  // R-603: 60s com o host fora. Se ele voltou (host_still_connected) ou não há quem assuma, nada muda.
  #replaceHost(): void {
    const before = this.#room;
    const next = transferHost(before);
    if (next.ok) this.#commit(before, next.value);
  }

  // --- Estado, efeitos e envio ---------------------------------------------------------------------------------------

  #enqueue(task: () => void | Promise<void>): Promise<void> {
    const run = this.#tail.then(task).catch((error: unknown) => {
      this.#deps.logger.error("room_task_failed", { invite_code: this.#room.invite_code, error });
    });
    this.#tail = run;
    return run;
  }

  // Resultado de um comando do jogador: erro volta para ele, sucesso vira o novo estado.
  #apply(socket: ServerSocket, result: Result<Room, DomainError>): boolean {
    if (!result.ok) {
      this.#reject(socket, toErrorCode(result.error));
      return false;
    }
    this.#commit(this.#room, result.value);
    return true;
  }

  // Transição do fluxo, pedida pelo próprio actor: falhar é bug, e vai para o log.
  #advance(result: Result<Room, DomainError>): boolean {
    if (!result.ok) {
      this.#logIllegal(result.error);
      return false;
    }
    this.#commit(this.#room, result.value);
    return true;
  }

  // Efeitos que dependem só de antes/depois: host trocado, partida concluída, sala vazia.
  #commit(before: Room, after: Room): void {
    this.#room = after;
    const host = after.host_uuid === null ? undefined : findPlayer(after, after.host_uuid);
    if (host !== undefined && before.host_uuid !== null && before.host_uuid !== host.player_uuid) {
      this.#broadcast({ type: "host_changed", new_host_uuid: host.player_uuid, new_host_nickname: host.nickname, reason: "previous_host_disconnected" });
      this.#deps.logger.info("host_changed", { invite_code: after.invite_code, player_uuid: host.player_uuid });
      this.#cancel("host");
      if (host.connection_status !== "connected") this.#scheduleHostTimeout();
    }
    if (before.state === "in_match" && after.state === "finished") void this.#enqueue(() => this.#matchCompleted());
    if (after.state === "empty" && before.state !== "empty") {
      this.#schedule("empty", TIMING.emptyRoomMs, () => this.#enqueue(() => this.#terminate()));
    } else if (after.state !== "empty") this.#cancel("empty");
  }

  #reject(socket: ServerSocket, code: ErrorCode): void {
    send(socket, errorMessage(code));
  }

  #logIllegal(error: DomainError): void {
    this.#deps.logger.error("engine_invalid_state", { invite_code: this.#room.invite_code, error });
  }

  // Emite o token do jogador para a rodada e invalida o anterior (S-12). Depois do 3º, não há mais áudio para ele.
  #audioFor(player: PlayerUuid, round_id: RoundId): WireAudio | undefined {
    if (this.#audio?.round_id !== round_id) return undefined;
    const previous = this.#audioTokens.get(player);
    const issued = previous?.issued ?? 0;
    if (issued >= MAX_AUDIO_TOKENS_PER_ROUND) return undefined;
    const token = this.#deps.audio.token(player, round_id, this.#roundDeadline());
    if (previous !== undefined) this.#usedAudioTokens.add(previous.token);
    this.#audioTokens.set(player, { token, issued: issued + 1 });
    return { audio_source: "deezer", audio_token: token };
  }

  // S-14: o token vale até o fim previsto da rodada. Antes do timer, conta o grace period inteiro.
  #roundDeadline(): number {
    const match = this.#room.match;
    const round = match === null ? undefined : currentRound(match);
    const duration = match?.config.time_per_round ?? 0;
    const start = round?.timer_started_at ?? this.#deps.clock.now() + TIMING.gracePeriodMs;
    return start + duration;
  }

  #clearAudio(): void {
    this.#audio = null;
    this.#audioTokens.clear();
    this.#usedAudioTokens.clear();
  }

  #roomStateFor(player: PlayerUuid) {
    const match = this.#room.match;
    const round = match === null ? undefined : currentRound(match);
    // R-602: quem volta com a rodada correndo recebe o áudio de novo.
    const playing = round !== undefined && (round.state === "grace_period" || round.state === "timer_running");
    const audio = playing ? this.#audioFor(player, round.round_id) : undefined;
    return roomState(this.#room, this.#room.host_uuid ?? player, audio);
  }

  #broadcastRoomState(): void {
    for (const player of this.#sockets.keys()) this.#sendTo(player, this.#roomStateFor(player));
  }

  #broadcastConfig(): void {
    this.#broadcast({ type: "config_updated", config: toWireConfig(this.#room.config), song_range: songRange(this.#room) });
  }

  #broadcast(message: WsServerMessage, except?: PlayerUuid): void {
    for (const [player, socket] of this.#sockets) if (player !== except) send(socket, message);
  }

  #sendTo(player: PlayerUuid, message: WsServerMessage): void {
    const socket = this.#sockets.get(player);
    if (socket !== undefined) send(socket, message);
  }

  // --- Snapshot (ADR-0009) -------------------------------------------------------------------------------------------

  // O estado é lido dentro da fila; a gravação não segura a fila.
  #startSnapshots(): void {
    const tick = () => {
      void this.#enqueue(() => {
        void this.#writeSnapshot();
      });
      this.#schedule("snapshot", TIMING.snapshotEveryMs, tick);
    };
    this.#schedule("snapshot", TIMING.snapshotEveryMs, tick);
  }

  #stopSnapshots(): void {
    this.#cancel("snapshot");
  }

  // ADR-0009.R2: só a sala em in_match tem snapshot.
  async #writeSnapshot(): Promise<void> {
    if (this.#room.state !== "in_match") return;
    const saved = await this.#deps.snapshots.save({ version: 1, saved_at: this.#deps.clock.now(), room: this.#room });
    this.#deps.metrics.redisSnapshots.inc({ result: saved.ok ? "ok" : "failed" });
    if (!saved.ok) this.#deps.logger.error("redis_snapshot_failed", { invite_code: this.#room.invite_code, error: saved.error });
  }

  // --- Timers --------------------------------------------------------------------------------------------------------

  #schedule(key: string, delayMs: number, run: () => void): void {
    this.#cancel(key);
    this.#timers.set(key, this.#deps.clock.schedule(delayMs, () => {
      this.#timers.delete(key);
      run();
    }));
  }

  #cancel(key: string): void {
    this.#timers.get(key)?.();
    this.#timers.delete(key);
  }

  #cancelAll(): void {
    for (const cancel of this.#timers.values()) cancel();
    this.#timers.clear();
  }
}

type WireAudio = Extract<WsServerMessage, { type: "round_starting" }>["audio"];

const send = (socket: ServerSocket, message: WsServerMessage) => socket.send(JSON.stringify(message));

// O que vai para o Postgres não tem answer_text nem nickname (docs/privacy.md).
export const completedMatch = (room_id: Room["room_id"], match: NonNullable<Room["match"]>): CompletedMatch => ({
  match_id: match.match_id,
  room_id,
  config: match.config,
  started_at: match.started_at,
  ended_at: match.ended_at ?? match.started_at,
  scores: match.participants.map((p) => ({ player_uuid: p.player_uuid, total_points: match.scores[p.player_uuid] ?? 0 })),
  rounds: match.rounds.map((r) => ({
    index: r.index,
    isrc: r.song.isrc,
    answers: r.answers.map((a) => ({
      player_uuid: a.player_uuid,
      is_correct: a.is_correct,
      is_near_miss: a.is_near_miss,
      points: a.points_earned,
      response_time: a.response_time,
    })),
  })),
});
