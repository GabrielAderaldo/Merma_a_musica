# Atomic Design: o método de design do projeto

O design system segue o *Atomic Design* do Brad Frost ([ADR-0019](../adr/0019-design-system-em-atomic-design.md)). O livro é aberto e está em [atomicdesign.bradfrost.com](https://atomicdesign.bradfrost.com/table-of-contents/), lido inteiro em 2026-10-21. Este doc é o método **adaptado** a este projeto, com IA operando o Penpot. A operação do Penpot está em [penpot.md](penpot.md), e o que desenhar está no [brief](brief.md). Para criar ou mudar um pattern, use a skill `/design-pattern`.

A ideia central: a interface não é um conjunto de páginas, e sim um sistema de peças (**patterns**) que se compõem. Os cinco níveis são um modelo mental para ir da parte ao todo e voltar. Eles não são etapas em sequência.

## Os níveis

Os tokens (brief §8) ficam por baixo de tudo: são os valores que os atoms consomem. Eles não são pattern.

| Nível | O que é | Teste para classificar | Exemplos aqui |
|---|---|---|---|
| **atom** | A menor peça que ainda funciona. Se quebrar, perde o sentido. | Não contém nenhum outro pattern. | `Button`, `Input`, `Avatar`, `Badge`, `Toggle` |
| **molecule** | Poucos atoms que juntos fazem **uma** coisa. | Dá para descrever o que ela faz numa frase, sem "e". | `RoomCodeDisplay` (código + copiar), `VoteSkipButton`, `Timer` |
| **organism** | Uma seção da interface, feita de molecules, atoms ou outros organisms. | Faz sentido sozinha como um bloco da tela. | `PlayerList` (lista de `PlayerCard`), `PersonalBestPanel` |
| **template** | O layout da tela com os organisms no lugar e **sem** conteúdo real. Mostra a estrutura: tamanhos, quantidades, limites de texto. | Responde "o que vai aqui e em que ordem", não "o que está escrito". | Template do Lobby, da Partida |
| **page** | Um template preenchido com conteúdo **real e representativo**, mais as variações. | É o que o jogador vê numa situação concreta. | Lobby com 1 jogador, Lobby com 20 |

Na fronteira (molecule ou organism?), fica o nível mais baixo. Se uma molecule começa a fazer duas coisas, ela vira organism ou se divide.

> **Atenção ao nome:** a *page* do Atomic Design (o nível) é diferente da *página do Penpot* (a aba do arquivo). Neste projeto, o nível é sempre "page", em inglês, e a aba é sempre "página do Penpot".

## Regras de composição

- **Só para baixo:** atom não contém pattern, molecule só contém atoms, organism pode conter atoms, molecules e organisms, e template monta organisms. Uma page é um template com conteúdo (ADR-0019.R2).
- **Uma responsabilidade por molecule:** é o que a deixa reutilizável e fácil de testar.
- **O nome diz a estrutura, não o lugar:** nada de `LobbyPlayerCard` ou `HomeButton`. Se a peça muda conforme o lugar, isso é uma variante. Nome de domínio é permitido quando a peça só existe no domínio (`SongRevealCard`), porque a linguagem ubíqua do [glossário](../glossary.md) vale também para o design (ADR-0019.R3).
- **Variante em vez de cópia:** `Button` tem `variant`, `size` e `state` (brief §7). Um botão novo quase sempre é uma variante.
- **Parte e todo:** um defeito visto numa page (nickname longo quebrando a linha) se corrige no pattern de origem, nunca só naquela tela.

## A ficha de cada pattern

O Frost pede que cada pattern venha documentado junto dele. No Penpot, o componente não tem campo de descrição (só `name`, `path` e `pluginData`). Por isso, a ficha é um **bloco de texto ao lado do componente principal**, na página do nível. Ela fica visível para humanos e é lida pelo MCP. O conteúdo:

| Campo | O quê |
|---|---|
| **Descrição** | O que é, numa frase. |
| **Uso** | Quando usar e quando **não** usar (aponte o pattern certo para o outro caso). |
| **Estados e variantes** | Todos, inclusive os chatos: loading, disabled, erro, vazio, texto longo. Brief §7: estado sem hover e focus visível é trabalho incompleto. |
| **A11y** | Contraste, alvo ≥ 48px, foco, o que o leitor de tela anuncia (brief §9). |
| **Tokens** | Quais tokens de componente ele consome. |

A **linhagem** (de que o pattern é feito e onde é usado) não entra na ficha, porque dá para calcular pelo MCP. A skill `/design-pattern` traz a consulta. Ela diz o que conferir de novo depois de uma mudança, e mostra pattern que ninguém usa.

## Pages: o teste de estresse

Template bonito com texto de exemplo prova pouco. A page usa conteúdo real e as variações que as regras do jogo produzem. As mínimas para este jogo:

- Sala com 1 jogador e com 20, o máximo (R-005).
- Host e não host. O host não tem `ready` (R-006).
- Nickname curto e nickname longo, sem unicidade (R-003).
- Música sem capa, com nome e artista longos (R-130).
- Autocomplete vazio, com 1 sugestão e com o máximo de 10 (R-104).
- Reconectando, depois de uma queda (R-604), e os estados especiais do brief (Tela 13).
- Larguras de 360px e de desktop (brief §8.7).

## Fluxo de trabalho

1. **Direção antes de fidelidade.** Antes de componentes acabados, mostre a atmosfera: um *style tile* (cores, tipografia, textura e ícones a partir dos tokens, sem layout) e um *element collage* (alguns atoms e molecules reais com essa estética, ainda sem tela). Esta é a etapa de Discovery do brief §15. Proponha 2 ou 3 variantes e pare para o mantenedor escolher.
2. **De baixo para cima, sem esquecer o topo.** Tokens → atoms → molecules → organisms → templates → pages. Volte um nível sempre que a page revelar um defeito. Não se termina um nível inteiro antes de olhar o próximo.
3. **Templates feitos de patterns.** Uma tela nova deveria ser quase só montagem. Se ela pede muita peça nova, falta pattern no sistema ou a tela está fugindo dele.
4. **Para o meio final cedo.** Quando o `apps/web` existir, o pattern vira componente Solid e é conferido no browser (Claude in Chrome). Comportamento, performance e responsividade só se provam lá. O Penpot é a referência visual. O browser é onde se decide.
5. **Inventário de interface.** O sistema começa do zero, então não há inventário na largada. Quando houver código, faça um de tempos em tempos: compare a biblioteca do Penpot com os componentes do `apps/web` e liste o que divergiu, o que duplicou e o que morreu.

## Ciclo de vida (1 mantenedor + IA)

O Frost trata o design system como **produto**, e não como projeto com fim. Aqui, quem mantém é o mantenedor, e a IA executa.

- **Adicionar:** primeiro tente uma variante de um pattern existente. Peça usada numa tela só fica dentro do organism ou do template até aparecer o segundo uso. O catálogo do brief §7 é a exceção: já foi pensado.
- **Mudar:** a mudança pedida por uma tela é feita no pattern. Antes, rode a linhagem e confira as telas afetadas depois.
- **Remover:** mova o componente para o grupo `deprecated` e escreva na ficha qual pattern o substitui. Só apague quando a linhagem mostrar zero usos.
- **Fonte única:** o mesmo nome no Penpot e no código (ADR-0019.R5). Tokens exportados para TS e CSS (brief §12).
- **Marcos:** ao fechar uma etapa do brief §15, salve uma versão nomeada do arquivo no Penpot. **a confirmar:** se dá para fazer isso pela Plugin API.
