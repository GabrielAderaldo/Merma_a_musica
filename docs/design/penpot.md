# Penpot com IA: guia operacional

A decisão de usar o Penpot e as restrições estão no [ADR-0018](../adr/0018-design-no-penpot-via-mcp-remoto.md). Este guia cobre como operar. O que está aqui foi aferido em 2026-10-21 (Penpot SaaS 2.18.4, MCP em **beta**). Item marcado com **a confirmar** ainda não foi testado com o MCP conectado.

## Como funciona

```
Claude Code ──HTTP──► design.penpot.app/mcp/stream?userToken=… ──WebSocket──► aba do Penpot (plugin MCP embutido) ──► arquivo
```

- O servidor **não acessa o arquivo sozinho**. Quem executa é a aba do browser com o arquivo aberto e o MCP conectado. Sem aba conectada, as tools falham.
- O agente escreve **JavaScript da Plugin API** (`execute_code`), e esse código roda dentro da aba. Na prática, qualquer coisa que a Plugin API faça, o agente faz.
- Cada aba conectada é uma **sessão**, com um ID curto. Com uma sessão só, o servidor a escolhe sozinho. Com várias, o agente precisa do ID (toolbar → **MCP → Copy session ID**).

## Setup (uma vez, quem faz é o mantenedor)

1. **Your account → Integrations → MCP Server**: ligar o **Status** e gerar a **MCP key**. Ela aparece **uma vez só** e tem data de expiração.
2. Gravar a chave no cofre do caninha_games (`~/Desktop/Projetos/dev/projetos_pessoais/caninha_games/secrets`, bucket `penpot`), como `PENPOT_MCP_KEY`. Só a chave, sem a URL. O agente pode rodar `sbox --dir ~/Desktop/Projetos/dev/projetos_pessoais/caninha_games/secrets set penpot PENPOT_MCP_KEY --dialog`: abre uma janela nativa e o valor nunca passa pelo chat. A chave **não** vai para `.env` nem `~/.claude.json`.
3. Abrir o Claude Code com a chave no ambiente: `sbox --dir ~/Desktop/Projetos/dev/projetos_pessoais/caninha_games/secrets run penpot -- claude` (caminho literal: no fish, `<…>` é redirecionamento). O `.mcp.json` monta a URL com `${PENPOT_MCP_KEY}`. Sem a variável, o `/mcp` mostra aviso no `penpot` e os outros MCPs seguem normais.
4. No Chrome: **Settings → Performance → Always keep these sites active** → `design.penpot.app`. Fixar a aba também ajuda. O Chrome congela aba inativa, e aí o MCP falha rápido com "tab appears to be suspended".

## Uso diário

1. Abrir o arquivo de design no Penpot e clicar em **MCP → Connect** no toolbar. Ligar o MCP na conta não conecta arquivo nenhum.
2. Deixar a aba aberta e ativa enquanto o agente trabalha. Se ela recarregar, é preciso conectar de novo, e o ID da sessão muda.
3. No `/mcp` do Claude Code, conferir que o `penpot` está conectado.

## Tools (remoto)

| Tool | Para quê | Nota |
|---|---|---|
| `high_level_overview` | Mapa do arquivo: páginas, boards, componentes | Primeira chamada de qualquer tarefa |
| `penpot_api_info` | Doc da Plugin API servida pelo próprio servidor | Fonte oficial da API (ADR-0011): consultar antes de escrever `execute_code` |
| `execute_code` | Roda JS da Plugin API na aba | Lê **e escreve**. Timeout padrão de 120 s por chamada |
| `export_shape` | Exporta um shape como imagem | É assim que o agente **vê** o resultado. No remoto não salva em disco |
| `import_image` | Importa imagem de caminho local | **Não existe no remoto.** Use a UI ou o MCP local (`@penpot/mcp@stable`) |

## Divisão de trabalho: MCP × Claude in Chrome

- **MCP**: tudo que mexe no arquivo (tokens, componentes, boards, renomear, auditar) e a verificação visual via `export_shape`.
- **Claude in Chrome**: a parte de conta e UI que o MCP não alcança, como conferir o status em Integrations, abrir arquivo, clicar em **MCP → Connect** e tirar screenshot do canvas inteiro. A Plugin API **não** fica exposta no `window` da página (`typeof window.penpot === "undefined"`, aferido no dashboard; dentro do workspace, **a confirmar**). Ela só existe dentro do plugin. Por isso, operar o design por JS no Chrome não é caminho.
- Ligar o MCP, gerar ou regenerar a chave e aceitar termos são ações de conta: quem faz é o mantenedor.

## Como pedir (prompts)

Vale o que o Penpot recomenda no guia oficial ("Good prompting practices" e "token-aware", em help.penpot.app/mcp). Aplicado aqui:

- **Ordem fixa:** tokens → atoms → molecules → organisms → templates → pages (brief §8 → §7 → §6), pela skill `/design-pattern`. Tela sem token vira valor mágico.
- **Ler antes de escrever** (ADR-0018.R3): `high_level_overview`, depois `export_shape` do alvo, depois a proposta e só então a escrita.
- **Transformações pequenas**, uma por vez ("normalize o espaçamento do Lobby com os tokens de spacing"), e não "faça todas as telas".
- **Ruleset compacto** no início da tarefa gasta menos tokens do que prosa:

```
RULESET
- SOURCE: docs/design/brief.md (§ citada)
- TOKENS ONLY: nada de hex/px solto; falta token → criar token, não valor
- COMPONENTS: reusar; variante em vez de duplicar
- NAMING: camadas por função (title, icon); componentes com / (button/primary)
- A11Y: WCAG AA, alvo ≥ 48px, texto 360px legível
- VERIFY: export_shape depois de cada escrita
```

## Convenções do arquivo

- Hierarquia de tokens em 3 níveis: global (`color.coral.500`) → semântico (`color.accent.primary`) → componente (`color.button.primary.bg`). Os nomes semânticos são os do brief §8.1.
- **Uma página do Penpot por nível do Atomic Design**, nesta ordem: Tokens, Atoms, Molecules, Organisms, Templates, Pages ([ADR-0019](../adr/0019-design-system-em-atomic-design.md), método em [atomic-design.md](atomic-design.md)). Em Templates e Pages, um board por área funcional (Lobby, Partida, Revelação), e não um por tela solta.
- Ao lado de cada componente principal, a ficha do pattern num bloco de texto (descrição, uso, estados, a11y, tokens).
- No máximo 3 a 4 níveis de aninhamento. Flex para pilhas, Grid para grades.
- Nomes de componente batem com os do brief §7 (`PlayerCard`, `Timer`, `SongRevealCard`). Na hora do código (`apps/web`), o nome é o mesmo.

## Problemas conhecidos

- **Chamada falha com "suspended" / timeout:** a aba foi congelada. Foque a aba, espere reconectar e repita.
- **Várias sessões listadas:** passe o ID da sessão no prompt.
- **Chave expirada:** Integrations mostra erro. Regenerar revoga a antiga, então é preciso rodar de novo o `sbox --dir ~/Desktop/Projetos/dev/projetos_pessoais/caninha_games/secrets set penpot PENPOT_MCP_KEY --dialog` e reabrir o Claude Code com `sbox --dir ~/Desktop/Projetos/dev/projetos_pessoais/caninha_games/secrets run penpot -- claude`. **Recarregue também a aba do arquivo:** a que conectou antes de gerar a chave nova continua com o **● MCP** verde, mas o servidor não a enxerga (`No Penpot instance connected`). Aferido em 2026-10-21.
- **`Permission user:read is not granted`:** o plugin não lê `penpot.currentUser`. Não atrapalha o trabalho no arquivo. Aferido em 2026-10-21.
- **a confirmar:** se a expansão de `${PENPOT_MCP_KEY}` acontece só na partida do Claude Code. Se for, trocar a chave exige reiniciar a sessão.
