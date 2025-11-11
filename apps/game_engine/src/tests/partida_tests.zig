const std = @import("std");
const domain = @import("domain/partida.zig");

const EventoTag = @typeInfo(domain.Evento).Union.tag_type.?;

test "partida não inicia quando ao menos um jogador não está pronto" {
    const jogadores = Fixtures.jogadoresBasicos();
    var partida = try domain.Partida.init(std.testing.allocator, Fixtures.configBasica(4), jogadores);
    defer partida.deinit();

    try partida.marcarJogadorPronto(jogadores[0].id);

    try std.testing.expectError(domain.PartidaError.JogadoresNaoProntos, partida.iniciar());
}

test "partida inicia quando todos os jogadores estão prontos e produz evento PartidaIniciada" {
    const jogadores = Fixtures.jogadoresBasicos();
    var partida = try domain.Partida.init(std.testing.allocator, Fixtures.configBasica(4), jogadores);
    defer partida.deinit();

    try partida.marcarJogadorPronto(jogadores[0].id);
    try partida.marcarJogadorPronto(jogadores[1].id);

    const evento = try partida.iniciar();
    try expectEventoTag(.PartidaIniciada, evento);
}

test "jogadores não podem responder mais de uma vez por rodada" {
    const jogadores = Fixtures.jogadoresBasicos();
    var partida = try domain.Partida.init(std.testing.allocator, Fixtures.configBasica(4), jogadores);
    defer partida.deinit();

    try partida.marcarJogadorPronto(jogadores[0].id);
    try partida.marcarJogadorPronto(jogadores[1].id);
    _ = try partida.iniciar();

    const resposta_inicial = Fixtures.resposta(jogadores[0].id, "Song A");
    _ = try partida.registrarResposta(resposta_inicial);

    try std.testing.expectError(domain.PartidaError.RespostaDuplicada, partida.registrarResposta(Fixtures.resposta(jogadores[0].id, "Song A - tentativa 2")));
}

test "respostas não são aceitas após a rodada ser finalizada" {
    const jogadores = Fixtures.jogadoresBasicos();
    var partida = try domain.Partida.init(std.testing.allocator, Fixtures.configBasica(4), jogadores);
    defer partida.deinit();

    try partida.marcarJogadorPronto(jogadores[0].id);
    try partida.marcarJogadorPronto(jogadores[1].id);
    _ = try partida.iniciar();

    _ = try partida.finalizarRodada();

    try std.testing.expectError(domain.PartidaError.RodadaEncerrada, partida.registrarResposta(Fixtures.resposta(jogadores[1].id, "Song B")));
}

test "total de músicas deve ser divisível pelo número de jogadores para iniciar a partida" {
    const jogadores = Fixtures.jogadoresBasicos();

    try std.testing.expectError(
        domain.PartidaError.ConfiguracaoInvalida,
        domain.Partida.init(std.testing.allocator, Fixtures.configBasica(5), jogadores),
    );
}

test "não permite marcar jogador inexistente como pronto" {
    const jogadores = Fixtures.jogadoresBasicos();
    var partida = try domain.Partida.init(std.testing.allocator, Fixtures.configBasica(4), jogadores);
    defer partida.deinit();

    try std.testing.expectError(domain.PartidaError.JogadorNaoEncontrado, partida.marcarJogadorPronto(9999));
}

test "registrar resposta antes da partida iniciar gera erro PartidaNaoIniciada" {
    const jogadores = Fixtures.jogadoresBasicos();
    var partida = try domain.Partida.init(std.testing.allocator, Fixtures.configBasica(4), jogadores);
    defer partida.deinit();

    try std.testing.expectError(
        domain.PartidaError.PartidaNaoIniciada,
        partida.registrarResposta(Fixtures.resposta(jogadores[0].id, "Song A")),
    );
}

test "não é possível finalizar rodada sem iniciar a partida" {
    const jogadores = Fixtures.jogadoresBasicos();
    var partida = try domain.Partida.init(std.testing.allocator, Fixtures.configBasica(4), jogadores);
    defer partida.deinit();

    try std.testing.expectError(domain.PartidaError.PartidaNaoIniciada, partida.finalizarRodada());
}

test "iniciar rodada sem partida iniciada retorna erro" {
    const jogadores = Fixtures.jogadoresBasicos();
    var partida = try domain.Partida.init(std.testing.allocator, Fixtures.configBasica(4), jogadores);
    defer partida.deinit();

    try std.testing.expectError(domain.PartidaError.PartidaNaoIniciada, partida.iniciarRodada());
}

test "iniciar rodada após partida começar emite evento RodadaIniciada" {
    const jogadores = Fixtures.jogadoresBasicos();
    var partida = try domain.Partida.init(std.testing.allocator, Fixtures.configBasica(4), jogadores);
    defer partida.deinit();

    try partida.marcarJogadorPronto(jogadores[0].id);
    try partida.marcarJogadorPronto(jogadores[1].id);
    _ = try partida.iniciar();

    const evento = try partida.iniciarRodada();
    try expectEventoTag(.RodadaIniciada, evento);
}

test "finalizar rodada após rodada em andamento emite evento RodadaFinalizada" {
    const jogadores = Fixtures.jogadoresBasicos();
    var partida = try domain.Partida.init(std.testing.allocator, Fixtures.configBasica(4), jogadores);
    defer partida.deinit();

    try partida.marcarJogadorPronto(jogadores[0].id);
    try partida.marcarJogadorPronto(jogadores[1].id);
    _ = try partida.iniciar();
    _ = try partida.iniciarRodada();

    const evento = try partida.finalizarRodada();
    try expectEventoTag(.RodadaFinalizada, evento);
}

test "registrar resposta válida emite evento RespostaAceita" {
    const jogadores = Fixtures.jogadoresBasicos();
    var partida = try domain.Partida.init(std.testing.allocator, Fixtures.configBasica(4), jogadores);
    defer partida.deinit();

    try partida.marcarJogadorPronto(jogadores[0].id);
    try partida.marcarJogadorPronto(jogadores[1].id);
    _ = try partida.iniciar();
    _ = try partida.iniciarRodada();

    const evento = try partida.registrarResposta(Fixtures.resposta(jogadores[0].id, "Song A"));
    try expectEventoTag(.RespostaAceita, evento);
}

test "não permite repetição de música entre playlists quando repeticao_permitida é falso" {
    const jogadores = Fixtures.jogadoresComMusicasRepetidas();

    try std.testing.expectError(
        domain.PartidaError.MusicaRepetidaNaoPermitida,
        domain.Partida.init(std.testing.allocator, Fixtures.configBasica(4), jogadores),
    );
}

fn expectEventoTag(expected: EventoTag, evento: domain.Evento) !void {
    try std.testing.expectEqual(expected, std.meta.activeTag(evento));
}

const Fixtures = struct {
    pub fn configBasica(total_de_musicas: u8) domain.ConfiguracaoDaPartida {
        return .{
            .tempo_por_rodada = 15,
            .total_de_musicas = total_de_musicas,
            .tipo_de_resposta = .ambos,
            .repeticao_permitida = false,
            .regra_pontuacao = .simples,
        };
    }

    pub fn jogadoresBasicos() []const domain.Jogador {
        return &[_]domain.Jogador{
            .{
                .id = 1,
                .nome = "Alice",
                .playlist = playlistAlpha(),
            },
            .{
                .id = 2,
                .nome = "Bob",
                .playlist = playlistBeta(),
            },
        };
    }

    pub fn jogadoresComMusicasRepetidas() []const domain.Jogador {
        return &[_]domain.Jogador{
            .{
                .id = 1,
                .nome = "Alice",
                .playlist = playlistComum("track-shared"),
            },
            .{
                .id = 2,
                .nome = "Bob",
                .playlist = playlistComum("track-shared"),
            },
        };
    }

    fn playlistAlpha() []const domain.Musica {
        return &[_]domain.Musica{
            .{ .id = "track-1", .nome = "Song A", .artista = "Artist A", .preview_url = "preview://track-1" },
            .{ .id = "track-2", .nome = "Song B", .artista = "Artist B", .preview_url = "preview://track-2" },
        };
    }

    fn playlistBeta() []const domain.Musica {
        return &[_]domain.Musica{
            .{ .id = "track-3", .nome = "Song C", .artista = "Artist C", .preview_url = "preview://track-3" },
            .{ .id = "track-4", .nome = "Song D", .artista = "Artist D", .preview_url = "preview://track-4" },
        };
    }

    fn playlistComum(id: []const u8) []const domain.Musica {
        return &[_]domain.Musica{
            .{ .id = id, .nome = "Shared Song", .artista = "Various", .preview_url = "preview://shared" },
        };
    }

    pub fn resposta(jogador_id: domain.JogadorId, texto: []const u8) domain.Resposta {
        return .{
            .jogador_id = jogador_id,
            .texto = texto,
            .tempo_resposta_ms = 1200,
        };
    }
};
