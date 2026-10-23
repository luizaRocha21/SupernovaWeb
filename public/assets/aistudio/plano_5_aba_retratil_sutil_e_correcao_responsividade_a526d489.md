# Plano 5 de Implementação: Aba Lateral Retrátil Sutil (Botão `☰ Menu`) e Correção Definitiva de Responsividade (Mobile, Tablet e Desktop)

Este documento analisa os **erros de layout e responsividade identificados nas 2 novas capturas de tela enviadas** (pós-Plano 4) e divide a solução em **5 prompts leves, diretos e sequenciais** para execução no Google AI Studio.

## 1. Diagnóstico Exato dos Erros Mostrados nas 2 Novas Fotos

| Captura de Tela / Erro Visual | Causa Técnica no Código | Correção Aplicada no Plano 5 |
| :--- | :--- | :--- |
| **Foto 1 (Esquerda) — Aba lateral fixa com barra de rolagem horizontal/vertical grossa, texto quebrado e botão `✕` cortado** | O layout forçava uma coluna fixa de `280px` sempre aberta no Desktop (`grid-template-columns: 280px 1fr`), com elementos internos mais largos que a coluna (gerando `overflow-x: scroll`) e esmagando a área útil da página. | **Aba 100% Retrátil e Sutil em Todas as Telas**: remoção da coluna lateral fixa. A página inteira fica livre e limpa, com um botão discreto e intuitivo **`[ ☰ Menu ]`** no topo esquerdo. A aba lateral (`Offcanvas` / Drawer sutil de `300px`, com `overflow-x: hidden`) fica oculta por padrão e **só desliza suavemente quando o botão `☰ Menu` é pressionado**. |
| **Foto 1 (Direita) — Select truncado em `"Carregando ro"` e botão `"🗺️ Cadastrar ou editar roças"` vazando para fora do card** | O `<select>` de roças tinha largura insuficiente e ficava preso no texto `"Carregando..."` antes da resposta da API, enquanto o botão ao lado tinha `white-space: nowrap` dentro de uma linha flex sem quebra adequada (`flex-wrap`) e sem colunas responsivas do Bootstrap. | Pré-carregamento imediato das roças da sessão (exibindo `"Roça Fazenda Baixio — Irecê, BA"` instantaneamente, sem travar em `"Carregando..."`) e organização em Grid Bootstrap responsivo (`row g-2 align-items-stretch`, `col-12 col-md-7` para o select e `col-12 col-md-5` para o botão com `white-space: normal`). |
| **Foto 2 — Lista `"Cuidados práticos recomendados para hoje"` com bolinhas (`•`) fora da borda esquerda e última linha cortada ao meio** | A tag `<ul>` recebeu `border` e `border-radius` diretamente com `padding-left` insuficiente (deixando os marcadores `list-style-position: outside` para fora da caixa!) e um `max-height` / `overflow: hidden` que decepou a última frase no meio. | Remoção de qualquer `max-height` ou `overflow: hidden` em caixas de texto; aplicação de `padding: 1.25rem 1.5rem 1.25rem 2.25rem` (ou `list-style: none` com ícones internos alinhados) para que os itens fiquem 100% dentro do card com respiro visual perfeito. |

## 2. Arquitetura de Responsividade nas 3 Plataformas (Mobile, Tablet e Desktop)

Com a **Aba Lateral 100% Retrátil** acionada pelo botão **`☰ Menu`**, o conteúdo principal passa a respirar livremente nos 3 tamanhos de tela:

| Plataforma / Viewport | Comportamento da Navegação (`☰ Menu`) | Grid e Distribuição dos Cards na Tela |
| :--- | :--- | :--- |
| **Celular / Mobile (`< 768px`)** | Barra superior compacta (`58px`) com botão **`☰ Menu`** à esquerda e logo central/direito. Ao tocar em `☰ Menu`, a gaveta desliza suavemente cobrindo `85vw` (`max-width: 300px`) com fundo escurecido (`backdrop`). | **1 Coluna (`col-12`)**: cards empilhados com `height: auto`, selects e botões ocupando `100%` da largura do card (`w-100`) para nunca vazar das bordas. |
| **Tablet (`768px a 1024px`)** | Barra superior limpa (`64px`) com botão **`☰ Menu`**, marca Manejo Caatingueiro e badge da Roça Ativa no topo direito. Gaveta retrátil de `310px` ao clicar no botão. | **2 Colunas (`col-md-6`)**: Container de `100%` (`max-width: 960px`), Chuva Acumulada e Plantio lado a lado (`col-md-6`), Mapa da Roça abaixo em largura total (`col-12`). |
| **Desktop (`>= 1025px`)** | Barra superior elegante (`68px`) com botão sutil **`☰ Menu`** à esquerda, marca + indicador da Roça Ativa ao centro e atalho rápido de voz/sair à direita. Gaveta retrátil de `320px` abre apenas quando solicitada. | **Grid Widescreen (`max-width: 1240px`)**: Cabeçalho da roça distribuído horizontalmente (`col-lg-7` saudação + `col-lg-5` seletor de roça e botão alinhados), e linha principal com Chuva (`col-lg-4`), Plantio (`col-lg-4`) e Mapa Interativo (`col-lg-4`) perfeitamente nivelados. |

## 3. Mapa de Execução dos 5 Prompts do Plano 5

| Ordem | Etapa do Plano 5 | O que Corrige | Arquivos Alvo | Consumo |
| :---: | :--- | :--- | :--- | :---: |
| **Prompt 01** | Etapa 1: CSS da Aba Retrátil Sutil e Correção Geral de Overflow/Listas | Remove a coluna lateral fixa, elimina barras de rolagem duplicadas (Foto 1), corrige as listas com bullets para fora e texto cortado (Foto 2) e impede que botões vazem dos cards. | `public/assets/css/global/elements.css`, `public/assets/css/global.css`, `public/assets/css/painel.css` | Baixo |
| **Prompt 02** | Etapa 2: Novo `menu.js` com Botão Sutil `☰ Menu` e Seletor de Roça Instantâneo | Substitui a sidebar fixa por uma aba retrátil limpa acionada pelo botão `☰ Menu` em todas as telas, corrige o botão `✕` cortado e elimina o travamento em `"Carregando ro..."`. | `public/assets/js/menu.js` | Médio |
| **Prompt 03** | Etapa 3: Correção Responsiva de `painel.html` (Fotos 1 e 2) | Corrige o cabeçalho de `painel.html` (select de roças + botão `"Cadastrar ou editar roças"` dentro do card sem vazar), corrige a lista `"Cuidados práticos"` e ajusta o grid para Mobile, Tablet e Desktop. | `public/pages/painel.html` | Médio |
| **Prompt 04** | Etapa 4: Ajuste Responsivo de `perfil.html` e `login.html` | Garante responsividade limpa em Mobile, Tablet e Desktop no formulário de cadastro de roças, mapa Leaflet e tela de acesso. | `public/pages/perfil.html`, `public/pages/login.html` | Baixo |
| **Prompt 05** | Etapa 5: Ajuste Responsivo Final em `plantio.html`, `reservatorios.html`, `comunidade.html`, `assistente-ia.html` e `admin.html` | Aplica o topo com botão `☰ Menu` e corrige larguras de selects, cards e listas nas 5 páginas restantes. | `public/pages/plantio.html`, `reservatorios.html`, `comunidade.html`, `assistente-ia.html`, `admin.html` | Médio |

## 4. Prompts Sequenciais Prontos para Copiar e Colar no Google AI Studio

### Prompt 01 — Etapa 1: CSS da Aba Lateral Retrátil Sutil e Correção dos Erros das Fotos 1 e 2

> **Quando usar:** Primeiro passo do Plano 5. Corrige no CSS global todos os defeitos visuais mostrados nas duas fotos: remove a sidebar fixa que esmagava a tela, elimina as barras de rolagem feias, impede que botões saiam para fora dos cards e corrige as listas com bolinhas para fora e texto cortado.

```text
Atue como Especialista Sênior em CSS Responsivo e Bootstrap 5. Vamos iniciar o PLANO 5 (Etapa 1): transformar a aba lateral em uma gaveta retrátil sutil (acionada apenas por botão de menu) e corrigir os erros de responsividade e overflow nas telas.

REGRA DE ESCOPO (ECONOMIA DE TOKENS):
- Edite APENAS `public/assets/css/global/elements.css`, `public/assets/css/global.css` e `public/assets/css/painel.css`.
- NÃO altere arquivos HTML nem o backend nesta etapa.

CORREÇÕES OBRIGATÓRIAS NO CSS:
1. Aba Lateral 100% Retrátil em Todos os Dispositivos (Fim da Sidebar Fixa da Foto 1):
   - Em `.app-layout-shell`: NUNCA use `grid-template-columns: 280px 1fr`! Defina `display: block; width: 100%; min-height: 100vh; overflow-x: hidden;` tanto no Mobile quanto no Tablet e no Desktop.
   - Crie/estilize a barra superior sutil `.app-topbar` (visível em Mobile, Tablet e Desktop):
     * `height: 64px; background: #f4eddb; border-bottom: 1px solid #d2c2a9; padding: 0 1.25rem; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 1030;`
   - Estilize o botão de abrir menu `.btn-menu-drawer`:
     * Botão sutil e intuitivo (`display: inline-flex; align-items: center; gap: 0.5rem; height: 42px; padding: 0 0.9rem; border-radius: 8px; background: #fffaf0; border: 1px solid #d2c2a9; color: #542817; font-weight: 700; font-size: 0.92rem; cursor: pointer; box-shadow: 0 1px 2px rgba(84,40,23,0.06);`).
   - Estilize a Aba Lateral Retrátil (`.app-sidebar-nav` / `#app-sidebar`):
     * Em TODAS as resoluções (Mobile, Tablet e Desktop), ela deve ser uma gaveta flutuante oculta por padrão: `position: fixed; top: 0; left: 0; bottom: 0; width: min(88vw, 310px); max-width: 310px; background: #f4eddb; border-right: 1px solid #d2c2a9; z-index: 1055; transform: translateX(-105%); transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1); overflow-y: auto; overflow-x: hidden !important; padding: 1.25rem 1rem; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box;`.
     * Quando receber a classe `.open`, aplica `transform: translateX(0); box-shadow: 8px 0 30px rgba(84,40,23,0.18);`.
     * Garanta que todos os elementos filhos da `.app-sidebar-nav` tenham `max-width: 100%; box-sizing: border-box;` e que o botão de fechar (`#sidebar-close` / `.btn-close-drawer`) tenha `width: 36px; height: 36px; min-width: 36px; min-height: 36px; flex-shrink: 0;` para NUNCA ficar cortado ou gerar barra de rolagem horizontal (como ocorreu na Foto 1).
2. Fim dos Botões Vazando do Card e Selects Espremidos (Foto 1 — Direita):
   - Em `.btn, button, a.btn`: adicione `max-width: 100%; white-space: normal; word-break: break-word; text-align: center; height: auto; line-height: 1.35;` para que nenhum botão saia para fora da borda de um card!
   - Em `select, .form-select`: garanta `width: 100%; min-width: 0; max-width: 100%; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; padding-right: 2.25rem;`.
3. Fim das Bolinhas (`•`) Fora da Borda e do Texto Cortado em Listas (Foto 2):
   - Em qualquer `ul`, `ol`, `.manejo-passos-list` ou lista dentro de cards:
     * Remova qualquer `max-height` ou `overflow: hidden` que estivesse cortando a última linha de texto! Defina `height: auto !important; max-height: none !important; overflow: visible !important;`.
     * Quando uma `ul` tiver borda ou fundo de caixa (ou para `.manejo-passos-list`), aplique `padding: 1.15rem 1.25rem 1.15rem 2.15rem !important; margin: 0; list-style-position: outside;` e `li { margin-bottom: 0.65rem; line-height: 1.55; word-break: break-word; }` (com `li:last-child { margin-bottom: 0; }`), garantindo que as bolinhas (`•`) e todo o texto fiquem 100% dentro da borda da caixa com folga.
4. Breakpoints Responsivos Claros para as 3 Plataformas (Mobile, Tablet e Desktop):
   - **Mobile (`< 768px`)**: `.app-main-workspace, .container { padding-left: 1rem; padding-right: 1rem; }` e `.card-body { padding: 1.15rem; }`.
   - **Tablet (`768px a 1024px`)**: `.app-main-workspace, .container { max-width: 960px; padding-left: 1.5rem; padding-right: 1.5rem; }` e `.card-body { padding: 1.5rem; }`.
   - **Desktop (`>= 1025px`)**: `.app-main-workspace, .container { max-width: 1220px; padding-left: 2rem; padding-right: 2rem; }` e `.card-body { padding: 1.75rem; }`.
```

### Prompt 02 — Etapa 2: Refinamento do `menu.js` — Botão `☰ Menu` Intuitivo, Gaveta Retrátil Sutil e Roça Pré-Carregada

> **Quando usar:** Segundo passo. Atualiza `public/assets/js/menu.js` para substituir a barra lateral fixa por um botão sutil **`☰ Menu`** no cabeçalho que abre a gaveta retrátil quando pressionado, além de eliminar o texto `"Carregando ro..."` que aparecia cortado no seletor de roças.

```text
Atue como Engenheiro Frontend Sênior. Vamos executar a Etapa 2 do Plano 5: atualizar `public/assets/js/menu.js` para usar exclusivamente a Aba Lateral Retrátil Sutil acionada por um botão de Menu intuitivo e corrigir o carregamento das roças do usuário.

REGRA DE ESCOPO (ECONOMIA DE TOKENS):
- Edite APENAS `public/assets/js/menu.js`.
- NÃO reescreva páginas HTML nesta etapa.

REQUISITOS TÉCNICOS PARA `public/assets/js/menu.js`:
1. Substituição da Sidebar Fixa pelo Botão Sutil `☰ Menu` + Gaveta Retrátil (Drawer):
   - Nas páginas autenticadas (`painel.html`, `perfil.html`, `plantio.html`, `reservatorios.html`, `comunidade.html`, `assistente-ia.html`, `admin.html`), renderize no `<header>` uma barra superior limpa e sutil (`.app-topbar` / `<nav id="menu">`) contendo:
     * **À esquerda**: O botão intuitivo **`#btn-open-drawer`** (`.btn-menu-drawer`) com ícone SVG de 3 linhas (`☰`) + texto `"Menu"`, seguido da logo `/assets/images/logo.png` e título `"Manejo Caatingueiro"`.
     * **À direita**: Indicador discreto da Roça Ativa no Desktop/Tablet (ex.: `"🌱 Roça Fazenda Baixio · Irecê"`), botão de ícone de som (`🔊` `#btn-tts-icon`) para ouvir a página e botão rápido de `"Sair"`.
   - **Gaveta Lateral Retrátil (`.app-sidebar-nav`)**:
     * Fica **fechada por padrão** em todas as telas (Mobile, Tablet e Desktop) e abre suavemente apenas quando o usuário clica no botão **`☰ Menu`**!
     * Topo da gaveta: Logo `/assets/images/logo.png` + título `"Manejo Caatingueiro"` + botão de fechar (`✕` `#sidebar-close`) perfeitamente alinhado dentro da gaveta (sem cortar na borda direita e sem gerar scroll horizontal).
     * Resumo compacto do agricultor conectado + Seletor `"Roça analisada"` (`#sidebar-select-roca`).
     * Lista de links de navegação limpos com ícones:
       - `🏠 Painel do Usuário` (`/pages/painel.html`)
       - `🗺️ Meu Perfil e Minhas Roças` (`/pages/perfil.html`)
       - `🌱 Recomendações de Plantio` (`/pages/plantio.html`)
       - `💧 Cisterna e Poço` (`/pages/reservatorios.html`)
       - `📢 Alertas e Mural` (`/pages/comunidade.html`)
       - `💬 Assistente da Roça` (`/pages/assistente-ia.html`)
       - `🏛️ Administração` (`/pages/admin.html` — se gestor)
     * Botão retrátil **`⚙️ Configurações`**: ao clicar, expande/recolhe suavemente as opções de **Temas** (Claro/Escuro em botão único toggle, Daltônico e Baixa Visão) e **Tamanho da Fonte** (`A-`, `100%`, `A+`).
     * Rodapé da gaveta: botão `"🚪 Sair da conta"` (abre `#logout-confirm-modal`).
2. Fim do Texto `"Carregando ro..."` no Seletor de Roças (Foto 1):
   - Em `getRocasUsuario()` e `getRocaAtiva()`, caso a requisição `GET /api/v1/usuario/rocas` ainda esteja em andamento ou falhe, popule **imediatamente de forma síncrona** as roças a partir da sessão do usuário (`session.usuario.rocas`) ou das duas roças padrão do agricultor (ex.: `Roça Fazenda Baixio — Irecê, BA` e `Roça Sítio Caraíbas — Presidente Dutra, BA`), garantindo que qualquer `<select>` de roças mostre imediatamente o nome real da roça e NUNCA fique travado em `"Carregando..."`!
```

### Prompt 03 — Etapa 3: Correção Responsiva de `public/pages/painel.html` (Solução Direta das Fotos 1 e 2)

> **Quando usar:** Terceiro passo. Corrige diretamente no HTML e script de `public/pages/painel.html` o card de boas-vindas com o seletor e botão que estavam vazando na Foto 1, a lista de cuidados práticos cortada na Foto 2 e o grid responsivo para Mobile, Tablet e Desktop.

```text
Atue como Engenheiro Frontend Sênior. Vamos executar a Etapa 3 do Plano 5: corrigir o layout e a responsividade de `public/pages/painel.html` (resolvendo diretamente os defeitos mostrados nas Fotos 1 e 2) para Celular, Tablet e Desktop.

REGRA DE ESCOPO (ECONOMIA DE TOKENS):
- Edite APENAS `public/pages/painel.html`.
- NÃO altere arquivos do backend nesta etapa.

CORREÇÕES OBRIGATÓRIAS EM `public/pages/painel.html`:
1. Cabeçalho do Painel do Usuário (Correção da Foto 1 — Direita):
   - Dentro do card de boas-vindas (`"Olá, João Agricultor! Acompanhe o manejo da sua roça..."`), organize a área de seleção de roça usando um Grid Bootstrap 5 responsivo que NUNCA esprema o `<select>` nem deixe o botão vazar para fora do card:
     ```html
     <div class="row g-3 align-items-end mt-1">
       <div class="col-12 col-sm-7 col-lg-5">
         <label for="painel-select-roca" class="form-label mb-1">Alternar entre minhas roças</label>
         <select id="painel-select-roca" class="form-select w-100">
           <option value="1">Roça Fazenda Baixio — Irecê, BA</option>
           <option value="2">Roça Sítio Caraíbas — Presidente Dutra, BA</option>
         </select>
       </div>
       <div class="col-12 col-sm-5 col-lg-auto">
         <a href="/pages/perfil.html#secao-rocas" class="btn btn-outline-primary w-100 px-3">
           🗺️ Cadastrar ou editar roças
         </a>
       </div>
     </div>
     ```
   - Sincronize `#painel-select-roca` com `window.MC_Menu.getRocasUsuario()` e `window.MC_Menu.setRocaAtiva()`, já trazendo as opções preenchidas no HTML inicial para nunca exibir `"Carregando ro..."`.
2. Caixa `"Cuidados práticos recomendados para hoje"` (Correção da Foto 2):
   - Substitua a `<ul id="manejo-passos-list">` que estava com as bolinhas (`•`) para fora da borda e o final cortado por um contêiner `<div class="p-3 rounded-3 border" style="background-color: #fffaf0; border-color: #d2c2a9 !important; height: auto; overflow: visible;">` envolvendo `<ul class="mb-0 ps-3" id="manejo-passos-list" style="line-height: 1.6;">`, garantindo que os marcadores e todas as linhas de texto fiquem 100% dentro da caixa com espaçamento confortável e sem nenhum corte inferior!
3. Grid Responsivo para as 3 Plataformas (Mobile `< 768px`, Tablet `768–1024px`, Desktop `>= 1025px`):
   - **Linha Principal (`.row.g-4.mb-4`)**:
     * Card 1 — **Chuva Acumulada na Roça**: `col-12 col-md-6 col-lg-4` (`.card.h-100.border-primary`).
     * Card 2 — **Sugestão de Plantio da Roça**: `col-12 col-md-6 col-lg-4` (`.card.h-100.border-success`).
     * Card 3 — **Mapa Interativo da Roça (`#mapa-roca-painel`)**: `col-12 col-md-12 col-lg-4` (com altura responsiva `min-height: 280px; width: 100%; border-radius: 8px;` e chamada `map.invalidateSize()` ao redimensionar a tela ou trocar de aba).
   - **Abas Inferiores Responsivas**:
     * Botões das 3 abas (`Como Agir Hoje na Terra`, `Pluviômetro da Roça`, `Alertas e Temperaturas`) em grupo flexível (`d-flex flex-wrap gap-2`) que se adapta perfeitamente a telas de 360px (celular), 768px (tablet) e 1366px (desktop).
```

### Prompt 04 — Etapa 4: Ajuste Responsivo de `public/pages/perfil.html` e `public/pages/login.html`

> **Quando usar:** Quarto passo. Garante que a página de perfil/cadastro de roças com mapa (`perfil.html`) e a tela de login/cadastro (`login.html`) funcionem com responsividade impecável em celulares, tablets e desktops.

```text
Atue como Engenheiro Frontend Sênior. Vamos executar a Etapa 4 do Plano 5: ajuste fino de responsividade para Mobile, Tablet e Desktop nas páginas `public/pages/perfil.html` e `public/pages/login.html`.

REGRA DE ESCOPO (ECONOMIA DE TOKENS):
- Edite APENAS `public/pages/perfil.html` e `public/pages/login.html`.
- NÃO altere outros arquivos HTML nesta etapa.

REQUISITOS DE RESPONSIVIDADE E UX:
1. Em `public/pages/perfil.html` (Meu Perfil e Cadastro de Múltiplas Roças com Mapa):
   - Utilize o topo sutil com o botão **`☰ Menu`** (gerenciado pelo `menu.js`).
   - Organize a página em 2 Abas ou Seções amplas e bem espaçadas:
     * ** no Desktop (`>= 1025px`)**: Coluna esquerda (`col-12 col-lg-5`) com **Meus Dados Pessoais** e **Lista das Minhas Roças Cadastradas** (cards limpos com botões `"Analisar no Painel"`, `"Editar"` e `"Excluir"` que nunca vazam do card); Coluna direita (`col-12 col-lg-7`) com o **Formulário de Cadastrar / Editar Roça** e o **Mapa Interativo Clicável (`#mapa-cadastro-roca`)**.
     * **No Tablet e Mobile**: empilhamento limpo (`col-12`) com o campo `<select id="roca-select-municipio">` e o botão **`"📍 Minha localização"`** em colunas separadas (`col-12 col-sm-8` e `col-12 col-sm-4`) para nunca espremer o select nem cortar o texto do botão!
   - Confirme que clicar em **`"📍 Minha localização"`** atualiza imediatamente o `<select id="roca-select-municipio">`, os campos de coordenadas e a posição do pino no mapa Leaflet.
2. Em `public/pages/login.html`:
   - Garanta que em celulares (`< 768px`) o painel editorial `.auth-story` fique compacto no topo e o formulário `.auth-panel` ocupe 100% da largura útil sem barra de rolagem interna, e que no Desktop (`>= 1025px`) as duas colunas (`.auth-shell`) fiquem perfeitamente proporcionais.
   - Na aba **Criar cadastro**, coloque o `<select id="cad-localidade">` e o botão **`"📍 Minha localização"`** bem alinhados e garanta que clicar em `"📍 Minha localização"` mude visualmente a cidade selecionada no `<select>`.
```

### Prompt 05 — Etapa 5: Padronização do Botão `☰ Menu` e Responsividade Final nas Demais Páginas (`plantio`, `reservatorios`, `comunidade`, `assistente-ia` e `admin`)

> **Quando usar:** Quinto e último passo. Aplica o cabeçalho sutil com o botão `☰ Menu` e revisa o grid responsivo (Mobile, Tablet e Desktop) nas 5 páginas restantes para que nenhum botão, select ou lista fique cortado.

```text
Atue como Engenheiro Frontend Sênior. Vamos concluir o Plano 5 (Etapa 5): padronizar a navegação retrátil pelo botão `☰ Menu` e garantir responsividade perfeita (Mobile, Tablet e Desktop) em `public/pages/plantio.html`, `public/pages/reservatorios.html`, `public/pages/comunidade.html`, `public/pages/assistente-ia.html` e `public/pages/admin.html`.

REGRA DE ESCOPO (ECONOMIA DE TOKENS):
- Edite APENAS `public/pages/plantio.html`, `public/pages/reservatorios.html`, `public/pages/comunidade.html`, `public/pages/assistente-ia.html` e `public/pages/admin.html`.

REQUISITOS OBRIGATÓRIOS NAS 5 PÁGINAS:
1. Navegação Sutil Unificada:
   - Remova qualquer `<aside>` ou barra lateral fixa antiga que estivesse escrita diretamente no HTML dessas páginas, deixando o `menu.js` renderizar a barra superior limpa com o botão **`☰ Menu`** e a gaveta retrátil sob demanda.
2. Revisão de Cards, Selects, Botões e Listas (Mobile `< 768px`, Tablet `768–1024px`, Desktop `>= 1025px`):
   - Em `public/pages/plantio.html`:
     * Exiba no topo a identificação clara da roça ativa (`"Roça analisada: [Nome da Roça] — [Município - BA]"` com botão para alternar de roça se o agricultor tiver mais de uma).
     * Garanta que as listas de orientações de manejo de Milho, Feijão-Caupi e Mamona tenham `padding` interno adequado e `height: auto`, sem bolinhas (`•`) fora da caixa e sem texto cortado.
   - Em `public/pages/reservatorios.html`:
     * Garanta que os campos `"Qual cisterna ou aguada você está medindo?"`, `"Volume estimado (Litros)"` e `"Escala rápida visual"` usem colunas `col-12 col-md-6` amplas para que o texto nunca fique truncado, e que os botões de abas (`"Minha Cisterna ou Poço"` e `"Água na Comunidade"`) se ajustem em `flex-wrap` no celular.
   - Em `public/pages/comunidade.html`:
     * Distribua os cards de Alertas da Região, Temperaturas de Hoje e Mural Comunitário em grid responsivo (`col-12 col-lg-6`) com textos e badges que quebram linha suavemente (`flex-wrap: wrap`).
   - Em `public/pages/assistente-ia.html`:
     * No Desktop (`>= 1025px`), exiba painel lateral de resumo da roça (`col-lg-4`) + janela de chat (`col-lg-8`); no Mobile e Tablet, empilhe em `col-12` com barra de digitação e botões de voz (`🔊` e `🎤`) confortáveis para toque (`44x44px`).
   - Em `public/pages/admin.html`:
     * Mantenha os cards de resumo em `col-12 col-md-4` e a tabela dentro de `.table-responsive` com botões de ação alinhados.
```
