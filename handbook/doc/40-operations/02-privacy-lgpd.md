---
status: active
last-reviewed: 2026-05-13
owners: [core]
---

# Privacidade e LGPD

> Política de privacidade do **Mermã, a Música!** alinhada com a **Lei Geral de Proteção de Dados Pessoais (LGPD — Lei nº 13.709/2018)**. Cobre tudo que o servidor coleta, processa e armazena.
>
> Documento operacional. Para texto público voltado ao usuário, gerar versão derivada (em `apps/web/legal/privacy.tsx`).

## Sumário

1. [Princípios](#1-princípios)
2. [Dados coletados e tratados](#2-dados-coletados-e-tratados)
3. [Base legal por categoria](#3-base-legal-por-categoria)
4. [Compartilhamento com terceiros](#4-compartilhamento-com-terceiros)
5. [Retenção e exclusão](#5-retenção-e-exclusão)
6. [Direitos do titular](#6-direitos-do-titular)
7. [Segurança técnica](#7-segurança-técnica)
8. [Incidentes e notificação](#8-incidentes-e-notificação)

---

## 1. Princípios

Em ordem:

1. **Minimização (LGPD Art. 6º, III):** coletamos **apenas** o que é necessário para fazer o jogo funcionar. Sem analytics third-party, sem fingerprinting, sem rastros cross-site.
2. **Anonimato por padrão:** jogar não exige cadastro. `player_uuid` é gerado no browser, não vinculado a identidade externa salvo se o usuário **conecta** uma plataforma musical.
3. **Transparência:** este documento + política pública versionada em `apps/web/legal/privacy`. Mudanças anunciadas no log de versão.
4. **Soberania do usuário:** export e exclusão de dados são **direitos do usuário**, não favores nossos. Endpoints públicos previstos.

## 2. Dados coletados e tratados

### 2.1 Categoria A — Dados estritamente operacionais (sempre coletados)

| Dado | Onde | Por que |
|---|---|---|
| `player_uuid` (UUID v4) | `localStorage` no browser + cookie + Postgres se conta conectada | Identificação para reconexão durante a partida. **Não é PII** (não vinculado a identidade real). |
| `nickname` (string) | `localStorage` no browser + memória do `RoomActor` no servidor | Mostrar quem é quem na sala. Pseudonimo. |
| Estado da partida ativa | Memória do server + Redis snapshot | Necessário para o jogo funcionar. Transiente — apagado ao fim da partida. |
| Endereço IP (efêmero) | Logs do Caddy (acceso log) + Bun (rate limit) | Rate limiting + diagnóstico operacional. Não correlacionamos com `player_uuid`. |

### 2.2 Categoria B — Dados quando OAuth conectado

Coletamos **apenas se o usuário voluntariamente conecta uma conta** (Spotify, Deezer ou YouTube Music).

| Dado | Onde | Por que |
|---|---|---|
| Identificador externo (Spotify ID, Deezer user_id, Google sub) | Postgres `connected_accounts` | Vínculo OAuth — necessário para refresh token e revogação. |
| OAuth refresh token | Postgres **encrypted at rest** | Para renovar access token automaticamente sem pedir login de novo. Cripto: AES-256-GCM com chave em `OAUTH_TOKEN_ENCRYPTION_KEY`. |
| OAuth access token | **Apenas em memória do processo** (nunca persistido) | Para chamar API da plataforma. Expira naturalmente (1h típico). |
| Playlists importadas (metadata + lista de tracks) | Postgres `imported_playlists` + `tracks` | Para uso em partidas. Inclui ISRC, nome, artista, álbum, capa. |
| Email da conta externa | **Não coletado** | Não precisamos. Plataformas oferecem; não pedimos no scope OAuth. |
| Lista completa de plataformas musicais do usuário | **Não coletado** | Apenas a que o usuário conectou aqui. |

### 2.3 Categoria C — Dados de jogo persistidos

| Dado | Onde | Por que |
|---|---|---|
| Histórico de partidas concluídas | Postgres `matches` + `match_player_score` + `match_round` | Para tela de "minhas partidas anteriores" (futuro) e métricas agregadas. Inclui `player_uuid`, **NÃO** inclui `answer_text` por princípio de minimização. |
| Recordes pessoais do modo solo | Postgres `solo_personal_best` | Para comparação com tentativas futuras (feature core do solo). |

### 2.4 Categoria D — Telemetria operacional

Ver [`../10-product/04-metrics-telemetry.md`](../10-product/04-metrics-telemetry.md) para o que medimos:

- Métricas agregadas (Prometheus) — **sem PII**.
- Logs estruturados (stdout JSON) — `player_uuid` aparece, **`answer_text` nunca**, OAuth tokens **nunca**.
- Sentry — apenas stack traces de erros + contexto técnico; sanitizamos qualquer payload antes de enviar.

### 2.5 Lista explícita do que **NÃO** coletamos

- Email pessoal.
- Telefone, CPF, endereço, qualquer documento.
- Dados biométricos ou de saúde.
- Localização precisa (lat/lon). User-Agent agregado é o máximo (Chrome/Firefox/Safari/Mobile).
- Browser fingerprint detalhado.
- Histórico de navegação fora do Mermã.
- Conteúdo de `answer_text` em logs ou métricas.
- Dados de crianças < 13 anos (que serve como anti-persona — ver [personas](../10-product/02-personas.md)).

---

## 3. Base legal por categoria

LGPD Art. 7º — toda operação de tratamento precisa de base legal.

| Categoria | Base legal | Justificativa |
|---|---|---|
| **A — Operacional** | **Execução de contrato** (Art. 7º, V) | Sem `player_uuid` e estado de partida, o jogo não funciona. |
| **B — OAuth** | **Consentimento** (Art. 7º, I) | Usuário escolhe conectar; OAuth flow exige aceite explícito. |
| **C — Histórico** | **Legítimo interesse** (Art. 7º, IX) | Para feature de "minhas partidas" e recordes; balanço com expectativa razoável do usuário. |
| **D — Telemetria** | **Execução de contrato** + **legítimo interesse** | Necessário para operar; sem PII expõe dado pessoal de forma minimal. |

### 3.1 Retirada do consentimento (OAuth)

O usuário pode revogar acesso a qualquer momento via:
- `DELETE /api/v1/playlists/{id}` para remover playlists específicas.
- `POST /api/v1/auth/disconnect` (a especificar em [`../30-specs/05-rest.yaml`](../30-specs/05-rest.yaml)) para desconectar a conta inteira.
- Diretamente nas configurações da plataforma externa (Spotify "Conectados", etc.).

Ao revogar:
- Tokens são apagados do nosso Postgres imediatamente.
- Playlists importadas: **opt-in** entre manter ou apagar (algumas pessoas podem querer manter o pool para jogar sem reimportar).

---

## 4. Compartilhamento com terceiros

Dados **podem trafegar** para:

| Terceiro | O que vai? | Por que |
|---|---|---|
| **Spotify / Deezer / YouTube Music** | Apenas dados necessários para chamar a API deles (access token, IDs de playlist). **Nada do nosso lado vai para eles que eles já não tenham.** | Funcionalidade core (importar playlist, resolver áudio). |
| **Sentry** | Stack traces de erros + contexto técnico (URL, método, status). Sanitizamos payloads (sem `answer_text`, sem tokens, sem PII). | Diagnóstico de bugs. |
| **Backblaze B2 (ou similar)** | Backups encriptados do Postgres. | Disaster recovery. Backup encriptado com chave dedicada. |
| **Hostinger / Magalu Cloud / outro VPS provider** | Tudo (são o substrato físico). | Hosting. Acordo via Terms do provedor. |

**Não compartilhamos com:**
- Anunciantes (não temos).
- Brokers de dados.
- Marketing/CRM (não temos).
- Governo, salvo ordem judicial expressa.

### 4.1 Transferência internacional

- Backups B2 podem ficar fora do Brasil (geralmente US/EU). LGPD permite com base legal adequada — neste caso, **execução de contrato** + **garantia contratual** do provedor.
- Sentry SaaS é fora do Brasil. Mesmo racional.

---

## 5. Retenção e exclusão

### 5.1 Tempos de retenção

| Dado | Retenção máxima |
|---|---|
| `player_uuid` (apenas no servidor: sessão ativa) | Enquanto WS aberto + 24h após desconexão (para reconexão) |
| `player_uuid` em logs | 90 dias rolantes (rotação automática via journald) |
| Estado de partida ativa (memória / Redis) | Vida da partida + TTL 30 min snapshot Redis |
| Histórico de partidas (Postgres `matches`) | **2 anos**, depois agregado e anonimizado |
| Recordes pessoais solo | Enquanto a conta existir |
| OAuth refresh tokens | Enquanto a conta externa estiver conectada |
| Playlists importadas | Enquanto o usuário não solicitar exclusão |
| Backups | 14 dias rolantes |

### 5.2 Exclusão automática

- Jogador que não retorna em **6 meses** → `player_uuid` é apagado do Postgres; histórico mantido **anonimizado** (player_uuid substituído por hash truncado).
- Jogadores anônimos sem conta conectada: apenas existem em memória/Redis durante a partida + 24h de eventual reconexão.

### 5.3 Exclusão manual

Endpoint `DELETE /api/v1/me` (a especificar): apaga **tudo** do solicitante. Cascade em:

- `connected_accounts` (com revoke nos providers via API quando possível)
- `imported_playlists` + `tracks` associadas
- `solo_personal_best`
- `match_player_score` referentes → mantém histórico anonimizado por interesse legítimo (analytics agregado)

Confirmação por email **não obrigatória** porque não coletamos email — ou seja, qualquer um com sessão válida pode apagar a própria conta.

---

## 6. Direitos do titular (LGPD Art. 18)

| Direito | Como exercer |
|---|---|
| **Confirmação** de tratamento | `GET /auth/me` (lista contas conectadas) + `GET /api/v1/me/data-summary` (resumo do que temos) |
| **Acesso** aos dados | `GET /api/v1/me/export` retorna JSON com tudo (suas playlists, recordes, histórico) — *a implementar* |
| **Correção** | Editar `nickname` direto na UI; correção de outros dados via desconectar/reconectar |
| **Anonimização ou exclusão** | `DELETE /api/v1/me` |
| **Portabilidade** | `GET /api/v1/me/export` (mesmo do acesso); formato JSON estruturado, livre |
| **Eliminação de dados** com base legal cessada | Automático via §5.2 |
| **Informação sobre compartilhamento** | Este documento + política pública |
| **Revogação de consentimento** | `POST /api/v1/auth/disconnect/{platform}` |

### 6.1 Tempo de resposta

LGPD Art. 19 — até 15 dias. Como tudo aqui é automatizável via endpoint, alvo: **imediato (< 1 minuto)** para 95% dos pedidos.

---

## 7. Segurança técnica

### 7.1 Cripto

| Dado | Como protegemos |
|---|---|
| OAuth refresh tokens | AES-256-GCM com `OAUTH_TOKEN_ENCRYPTION_KEY` (32 bytes random, fora do código) |
| Cookies de sessão | `__Host-session` HttpOnly + Secure + SameSite=Strict |
| Comunicação cliente↔server | TLS 1.3 via Caddy + HSTS |
| Comunicação server↔Postgres | TLS (em Fase 1; localhost em Fase 0) |
| Comunicação server↔Redis | localhost + `requirepass` (em Fase 1: TLS + ACL) |
| Backups Postgres | Encriptados com chave dedicada antes de subir para B2 |

### 7.2 Acesso

- **Banco de dados**: acesso direto via SSH para a VPS apenas, autenticação por chave pública.
- **Variáveis de ambiente** com secrets: `chmod 600 .env`, owner root.
- **Logs**: contêm `player_uuid` (pseudonimo). Acesso restrito ao admin via SSH; rotação 90d.

### 7.3 Auditoria de mudanças sensíveis

Logs estruturados com nível `audit` para:

- `OAuth_account_connected`
- `OAuth_account_disconnected`
- `data_export_requested`
- `account_deleted`
- `playlist_deleted`

Retenção: 90 dias.

---

## 8. Incidentes e notificação

### 8.1 Definição de incidente de privacidade

- Vazamento de OAuth tokens (decryption mass).
- Acesso não autorizado ao Postgres.
- Bug que expõe `player_uuid` cross-room.
- Backup vazado.

### 8.2 Resposta

1. **Contenção** (< 1h): revogar tokens, fechar acesso vazado, ativar mode read-only se necessário.
2. **Investigação** (< 24h): escopo, raiz, dados afetados.
3. **Notificação aos titulares** (LGPD Art. 48, § 1º — prazo razoável; alvo 72h): comunicado claro, sem jargão.
4. **Notificação à ANPD** se risco relevante (mesma janela).
5. **Postmortem público** em `40-operations/incidents/`.

### 8.3 Encarregado de proteção de dados (DPO)

Para o MVP, o **mantenedor do projeto** (titular do GitHub Org) atua como DPO de fato. Contato via issues do GitHub Org. Quando o projeto crescer, formalizar com email dedicado.

---

## Changelog

- **2026-05-13:** primeira versão. Estabelece minimização como princípio primário; categoriza dados em A/B/C/D; mapeia base legal por categoria; lista explícita do que NÃO coletamos; políticas de retenção e exclusão; cripto de OAuth refresh tokens com AES-256-GCM; processo de resposta a incidentes.
