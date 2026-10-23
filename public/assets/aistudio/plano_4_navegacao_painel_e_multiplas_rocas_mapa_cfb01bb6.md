# Plano 4 de Implementação: Separação Estrita `index.html` vs. `painel.html`, Barra Lateral Unificada com Configurações, Múltiplas Roças com Mapa Interativo e Correção dos Bugs das Imagens

Este documento analisa cada um dos **8 problemas visuais e de navegabilidade mostrados nas capturas de tela enviadas** e estrutura o **Quarto Plano de Implementação** em **7 prompts leves, atômicos e sequenciais** para o Google AI Studio.

## 1. Diagnóstico das 8 Imagens Enviadas e Soluções Arquiteturais

| Captura de Tela / Problema | Causa Exata no Código Atual | Solução Estruturada no Plano 4 |
| :--- | :--- | :--- |
| **Imagem 1 — Incoerência no Painel de João (`Irecê` no título vs. `Xique-Xique` no select + botão `Minha localização` na roça)** | O painel misturava a localização fixa da roça do agricultor com um buscador livre de qualquer cidade da Bahia e um botão de GPS em tempo real que não atualizava o `<select>` nem fazia sentido de negócio (pois a roça não se move com o agricultor). | **No Painel (`/pages/painel.html`)**: remover a busca aleatória de cidades e remover o botão `"Minha localização"`. O agricultor visualiza suas **Roças Cadastradas** (podendo ter 1, 2 ou mais roças em locais distintos, ex.: *Roça 1 em Irecê* e *Roça 2 em Lapão*), alterna entre elas e vê o ponto exato da roça ativa em um **Mapa Interativo (Leaflet / OpenStreetMap)**. O botão `"📍 Minha localização"` fica **restrito ao Cadastro de Usuário (`login.html`) e ao Cadastro/Edição de Roça (`perfil.html`)**, atualizando automaticamente o select e o mapa. |
| **Imagem 2 — Menu superior empilhado e confuso quando logado** | O `<nav id="menu">` tentava colocar todos os links + 4 botões de tema + crachá do usuário + botão Sair dentro de uma barra superior que colapsava numa lista vertical solta no topo. | Criar um **Layout com Aba Lateral (Sidebar) Unificada** para todas as páginas logadas: fixa à esquerda no **Desktop (`>= 1025px`)** e deslizante (Offcanvas) no **Tablet/Celular (`< 1025px`)**, contendo toda a navegação, link para **Editar Perfil e Minhas Roças** e um botão retrátil **`⚙️ Configurações`** (que abre Temas Claro/Escuro, Daltônico, Baixa Visão e Tamanho da Fonte). |
| **Imagem 3 — Temperaturas exibindo `NaN °C (mín NaN °C)` e cidades sem nome (`- PI`, `- SC`)** | O script lia `item.temp_max`, `item.temp_min` e `item.nome` sem mapear os nomes reais dos campos do JSON da API (`cidade`/`municipio` e `maxima`/`minima`/`temperatura`). Quando vinha `undefined`, `Number(undefined)` gerava `NaN °C`. | Normalizar todos os campos em `clima-dinamico.js` e no `RadarMeteorologicoService.ts` (`nome = item.cidade \|\| item.municipio \|\| item.nome`, `max = Number(item.maxima ?? item.temp_max ?? item.temperatura)`) com validação `Number.isFinite()` e fallback real da Bahia para **nunca** exibir `NaN °C` nem traço sem cidade. |
| **Imagem 4 — Rodapé desalinhado e com links grudados** | O `<footer>` estava sem grid flexbox/Bootstrap e herdando estilos crus. | Padronizar o rodapé com layout flexível entre colunas, separadores visuais e links estilizados na paleta Editorial Sertaneja. |
| **Imagem 5 — Botões cinzas quadrados estilo "anos 90" em `reservatorios.html`** | Os botões `"Ouvir orientação"`, `"Minha Cisterna ou Poço"` e `"Água na Comunidade"` estavam sem estilização de botão `.btn` / `.app-tab-btn`, caindo no estilo nativo cinza do navegador. | Estilizar globalmente todos os `<button>`, `.auth-tab` e `.app-tab-btn` em `elements.css` com a paleta marfim/verde-oliva (`#fffaf0` / `#5d603d`) e bordas arredondadas. |
| **Imagem 6 — Card com borda azul-elétrico (`#0d6efd`) e select cortado em `reservatorios.html`** | O card usava `.border-primary` do CDN do Bootstrap carregado depois do CSS local, exibindo azul-elétrico em vez de marrom-terra (`#542817`), e a coluna do select era estreita demais para o texto. | Garantir que `elements.css` seja sempre o último CSS carregado e sobrescreva `.border-primary { border-color: #542817 !important; }`, ajustando o grid do formulário para não truncar o texto do `<select>`. |
| **Imagem 7 — Quadrado verde-escuro vazio no topo da sidebar e configurações sempre abertas** | A sidebar antiga usava um `span.brand-mark` com fundo verde-escuro sem a imagem `/assets/images/logo.png`, não tinha link para todas as páginas e deixava `"CONFIGURAÇÕES DE TELA"` sempre expandido. | Substituir pela nova **Aba Lateral Unificada** injetada pelo `menu.js` em todas as páginas, com o logo oficial `/assets/images/logo.png`, todos os links do app e o menu retrátil **`⚙️ Configurações`**. |
| **Imagem 8 — Card "Alertas Climáticos da Região" completamente vazio em `comunidade.html`** | A `<div id="alertas-list">` dependia de um script que falhava silenciosamente ou não exibia estado informativo quando a lista vinha vazia. | Renderizar imediatamente os alertas vigentes da Bahia/região com detalhes completos e, quando não houver alerta severo no minuto, exibir um card rico de **"Situação Meteorológica Normal na Região"** com os dados atuais de chuva, vento e umidade da localidade. |

## 2. Nova Arquitetura de Navegação e Domínio de Múltiplas Roças

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ 1. VISITANTE (DESLOGADO)                                                     │
│ • index.html: SOMENTE Vitrine Comercial Limpa (Arte do Sertão, informações   │
│   comerciais e botões para Login / Cadastro). Zero painéis técnicos.         │
│ • pages/login.html: Autenticação e Cadastro (com botão "📍 Minha localização"│
│   que atualiza automaticamente o campo da cidade e cadastra a 1ª roça).      │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │ Login / Sessão Ativa (Redireciona)
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ 2. AMBIENTE DO USUÁRIO LOGADO (LAYOUT COM ABA LATERAL UNIFICADA)             │
│                                                                              │
│ ┌──────────────────────────────┐  ┌────────────────────────────────────────┐ │
│ │ ABA LATERAL (SIDEBAR)        │  │ ÁREA PRINCIPAL DA PÁGINA ATIVA         │ │
│ │ • Logo + Nome do Agricultor  │  │                                        │ │
│ │ • Seletor: "Roça Ativa"      │  │ • pages/painel.html (Painel do Usuário)│ │
│ │   (Alterna entre Roça 1, 2..)│  │   - Dados fixos da Roça Selecionada    │ │
│ │ ──────────────────────────── │  │   - Mapa Interativo (Leaflet) mostrando│ │
│ │ • 🏠 Painel do Usuário       │  │     o ponto exato da roça analisada    │ │
│ │ • 🗺️ Meu Perfil e Roças      │  │   - Cards de Chuva, Plantio e Pluviôm. │ │
│ │ • 🌱 Recomendações Plantio   │  │   - (SEM busca aleatória de cidade e   │ │
│ │ • 💧 Cisterna e Poço         │  │      SEM botão GPS solto no painel!)   │ │
│ │ • 📢 Alertas e Mural         │  │                                        │ │
│ │ • 💬 Assistente da Roça (IA) │  │ • pages/perfil.html (Perfil e Roças)   │ │
│ │ • 🏛️ Painel Admin (se gestor)│  │   - Editar dados do usuário            │ │
│ │ ──────────────────────────── │  │   - Cadastrar / Editar múltiplas roças │ │
│ │ • ⚙️ Configurações (Retrátil)│  │     com Mapa Clicável + botão          │ │
│ │   ├─ Tema: Claro / Escuro    │  │     "📍 Minha localização" que preenche│ │
│ │   ├─ Daltônico / Baixa Visão │  │     cidade e coordenadas automaticamente│ │
│ │   └─ Tamanho da Fonte (A-/A+)│  │                                        │ │
│ │ • 🚪 Sair da Conta           │  │ • Demais páginas (Plantio, Cisterna,   │ │
│ └──────────────────────────────┘  │   Comunidade, IA, Admin) sincronizadas │ │
└───────────────────────────────────┴────────────────────────────────────────┘
```

## 3. Mapa de Execução dos 7 Prompts do Plano 4

| Ordem | Etapa do Plano 4 | Escopo Técnico | Arquivos Alvo | Consumo |
| :---: | :--- | :--- | :--- | :---: |
| **Prompt 01** | Etapa 1: Suporte a Múltiplas Roças por Usuário (Backend + Modelo) | Adiciona o gerenciamento de múltiplas roças/plantios por usuário (`id`, `nome`, `municipio`, `uf`, `codigoIbge`, `latitude`, `longitude`, `culturas`, `areaHa`) com rotas `GET/POST/PUT/DELETE /api/v1/usuario/rocas`. | `src/domain/usuario/**`, `server.ts` | Médio |
| **Prompt 02** | Etapa 2: Design System do Layout com Aba Lateral (3 Plataformas) e Correção Visual | Cria o layout da Sidebar responsiva (fixa no Desktop, Offcanvas no Mobile/Tablet), corrige os botões cinzas (Imagem 5), a borda azul-elétrico (Imagem 6) e o rodapé (Imagem 4). | `public/assets/css/global/elements.css`, `public/assets/css/global.css` | Baixo |
| **Prompt 03** | Etapa 3: Nova Aba Lateral Unificada (`menu.js`) com Botão Retrátil `⚙️ Configurações` e Seletor de Roça | Reconstrói `menu.js` e `acessibilidade-voz.js` para injetar a mesma Aba Lateral organizada em todas as páginas logadas, com seletor da roça ativa e gaveta retrátil `⚙️ Configurações`. | `public/assets/js/menu.js`, `public/assets/js/acessibilidade-voz.js` | Médio |
| **Prompt 04** | Etapa 4: Correção do `NaN °C` (Imagem 3) e Sincronização da Roça Ativa no `clima-dinamico.js` | Corrige definitivamente o bug `NaN °C` e nomes vazios no ranking térmico e faz o `clima-dinamico.js` carregar sempre o clima das coordenadas fixas da **Roça Ativa** do agricultor. | `public/assets/js/clima-dinamico.js`, `src/domain/clima/service/RadarMeteorologicoService.ts` | Baixo |
| **Prompt 05** | Etapa 5: `index.html` Exclusivamente Comercial + Nova Página `/pages/painel.html` com Mapa da Roça | Deixa `index.html` apenas como página de entrada comercial (redirecionando logados para `/pages/painel.html`) e cria `/pages/painel.html` com o Mapa Interativo (Leaflet) da roça ativa, sem busca incoerente de cidades. | `public/index.html`, `public/pages/painel.html` | Médio |
| **Prompt 06** | Etapa 6: Nova Página `/pages/perfil.html` (Editar Usuário + Cadastrar Múltiplas Roças no Mapa) + Ajuste em `login.html` | Cria `/pages/perfil.html` onde o agricultor edita seus dados e cadastra/edita suas roças (em locais distintos) com Mapa Interativo e botão `"📍 Minha localização"` que atualiza o campo de cidade automaticamente. | `public/pages/perfil.html`, `public/pages/login.html` | Médio |
| **Prompt 07** | Etapa 7: Integração da Aba Lateral e Correção dos Cards Vazios em `plantio`, `reservatorios`, `comunidade`, `assistente-ia` e `admin` | Aplica o layout da Aba Lateral nas páginas internas, corrige os botões e o select de `reservatorios.html` (Imagens 5 e 6), preenche o card vazio de `comunidade.html` (Imagem 8) e atualiza `code-agent.js`. | `public/pages/plantio.html`, `reservatorios.html`, `comunidade.html`, `assistente-ia.html`, `admin.html`, `scripts/code-agent.js` | Médio |

## 4. Prompts Sequenciais Prontos para Copiar e Colar no Google AI Studio

### Prompt 01 — Etapa 1: Suporte a Múltiplas Roças por Agricultor no Backend

> **Quando usar:** Primeiro passo do Plano 4. Permite que cada agricultor possua 1, 2 ou mais roças/plantios em locais distintos (cada uma com coordenadas e município fixos), acabando com a incoerência de a roça mudar de lugar sozinha.

```text
Atue como Arquiteto Backend TypeScript/Express. Vamos iniciar o PLANO 4 (Etapa 1): suporte a múltiplas roças/plantios por agricultor com localização geográfica fixa.

REGRA DE ESCOPO (ECONOMIA DE TOKENS):
- Edite APENAS os arquivos do domínio `src/domain/usuario/` (`model/Usuario.ts`, `repository/UsuarioRepository.ts`, `service/UsuarioService.ts`, `controller/UsuarioController.ts`) e exponha as rotas no `server.ts`.
- NÃO altere arquivos HTML ou CSS nesta etapa.

REQUISITOS TÉCNICOS:
1. Modelo de Roça / Propriedade (`RocaUsuario` dentro de `src/domain/usuario/model/Usuario.ts`):
   - Campos: `id: number`, `usuarioId: number`, `nome: string` (ex.: `"Roça Baixio Verde"`), `municipio: string` (ex.: `"Irecê"`), `uf: string` (`"BA"`), `codigoIbge: string` (ex.: `"2914604"`), `latitude: number`, `longitude: number`, `culturas: string[]` (ex.: `["Milho", "Feijão-Caupi"]`), `areaHectares?: number`, `principal: boolean`.
   - Adicione a propriedade `rocas: RocaUsuario[]` ao modelo `Usuario` e ao `UsuarioResponseDTO`.
2. Carga Inicial Realista no `UsuarioRepository.ts`:
   - Para o usuário ID 1 (**João Agricultor**), pré-cadastre **2 roças em locais distintos** para demonstrar o suporte multi-propriedade:
     * Roça 1 (Principal): `"Roça Fazenda Baixio"` — Município: `"Irecê"`, UF: `"BA"`, IBGE: `"2914604"`, Latitude: `-11.3042`, Longitude: `-41.8558`, Culturas: `["Milho", "Feijão-Caupi"]`.
     * Roça 2: `"Roça Sítio Caraíbas"` — Município: `"Presidente Dutra"`, UF: `"BA"`, IBGE: `"2925709"`, Latitude: `-11.2958`, Longitude: `-41.9869`, Culturas: `["Mamona", "Feijão-Caupi"]`.
   - Para os demais usuários, garanta pelo menos 1 roça inicial vinculada às coordenadas do município deles.
3. Endpoints de Perfil e Gestão de Roças no `UsuarioController.ts` (e compatibilidade em `server.ts`):
   - `GET /api/v1/usuario/me` e `PUT /api/v1/usuario/me` (atualiza nome, telefone, e-mail, fonte de água e senha do usuário logado).
   - `GET /api/v1/usuario/rocas` (lista todas as roças do usuário logado).
   - `POST /api/v1/usuario/rocas` (cadastra uma nova roça com nome, município, código IBGE, latitude, longitude e culturas).
   - `PUT /api/v1/usuario/rocas/:rocaId` (edita uma roça existente ou define como principal).
   - `DELETE /api/v1/usuario/rocas/:rocaId` (remove uma roça, mantendo sempre ao menos 1 roça ativa).
4. Adicione no `server.ts` as rotas estáticas amigáveis para as novas páginas `/painel.html` (`public/pages/painel.html`) e `/perfil.html` (`public/pages/perfil.html`).
```

### Prompt 02 — Etapa 2: CSS do Layout com Aba Lateral (Desktop, Tablet e Mobile) e Correção Visual das Imagens 4, 5 e 6

> **Quando usar:** Segundo passo. Cria toda a estrutura CSS do novo layout com Aba Lateral (Sidebar) responsiva e corrige os botões cinzas sem estilo (Imagem 5), a borda azul-elétrico (Imagem 6) e o rodapé desalinhado (Imagem 4).

```text
Atue como Designer de UI/UX Sênior especialista em Bootstrap 5. Vamos executar a Etapa 2 do Plano 4: criação do sistema de layout com Aba Lateral (Sidebar) para Desktop, Tablet e Mobile e correção definitiva dos problemas visuais das telas.

REGRA DE ESCOPO (ECONOMIA DE TOKENS):
- Edite APENAS `public/assets/css/global/elements.css` e `public/assets/css/global.css`.
- NÃO edite arquivos HTML nem o backend nesta etapa.

REQUISITOS VISUAIS E DE LAYOUT OBRIGATÓRIOS:
1. Layout Principal do Usuário Logado (`.app-layout-shell` + `.app-sidebar-nav` + `.app-main-workspace`):
   - **No Desktop (`@media (min-width: 1025px)`)**:
     * `.app-layout-shell`: `display: grid; grid-template-columns: 280px minmax(0, 1fr); min-height: 100vh; background: var(--cor-fundo);`.
     * `.app-sidebar-nav`: Aba lateral fixa à esquerda (`position: sticky; top: 0; height: 100vh; overflow-y: auto; background: #f4eddb; border-right: 1px solid #d2c2a9; padding: 1.5rem 1.15rem; display: flex; flex-direction: column; justify-content: space-between;`).
     * `.app-mobile-topbar`: oculta no Desktop (`display: none !important;`).
     * `.app-main-workspace`: área principal ampla à direita (`padding: 2rem 2.5rem; max-width: 1320px; width: 100%; margin: 0 auto;`).
   - **No Tablet (`768px a 1024px`) e Mobile (`< 768px`)**:
     * `.app-layout-shell`: `display: block; min-height: 100vh;`.
     * `.app-mobile-topbar`: barra superior compacta e elegante (`height: 62px; background: #f4eddb; border-bottom: 1px solid #d2c2a9; padding: 0 1rem; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 1030;`).
     * `.app-sidebar-nav`: gaveta deslizante suave (`position: fixed; top: 0; left: 0; bottom: 0; width: min(86vw, 310px); z-index: 1050; transform: translateX(-100%); transition: transform 0.25s ease; box-shadow: 4px 0 24px rgba(84,40,23,0.18);`), abrindo quando recebe a classe `.open` (com `.app-sidebar-backdrop`).
2. Estilização Interna da Aba Lateral (`.app-sidebar-nav`):
   - Cabeçalho com a imagem real `/assets/images/logo.png` (`width: 42px; height: 42px; border-radius: 8px; object-fit: contain; background: #fffaf0; border: 1px solid #d2c2a9; padding: 2px;` — NUNCA um quadrado escuro vazio!).
   - Caixa **"Roça Analisada no Momento"** (`.sidebar-roca-switcher`): card compacto em `#fffaf0` com borda `#d2c2a9` onde o agricultor vê e alterna entre suas roças cadastradas.
   - Links de navegação (`.sidebar-link-item`): botões largos (`min-height: 44px; padding: 0.6rem 0.9rem; border-radius: 8px; color: #542817; font-weight: 600; text-decoration: none; display: flex; align-items: center; gap: 0.65rem;`), com estado `.active` em verde-oliva (`background: #5d603d; color: #fffaf0 !important;`).
   - Botão retrátil **`⚙️ Configurações`** (`.sidebar-settings-toggle`): abre/fecha suavemente a gaveta `.sidebar-settings-collapse` contendo:
     * Botão de alternância de Tema Claro/Escuro + Daltônico + Baixa Visão.
     * Controles de Tamanho da Fonte (`A-`, `100%`, `A+`).
3. Correção Definitiva dos Problemas das Imagens 4, 5 e 6:
   - **Fim dos botões cinzas quadrados (Imagem 5)**: garanta que qualquer `<button>` sem classe específica, `.auth-tab` ou `.escala-btn` tenha `background-color: #fffaf0; color: #542817; border: 1px solid #d2c2a9; border-radius: 7px; padding: 0.5rem 1rem; font-weight: 600;` e quando `.active` tenha `background-color: #5d603d !important; color: #fffaf0 !important; border-color: #5d603d !important;`.
   - **Fim da borda azul-elétrico do Bootstrap (Imagem 6)**: force `.border-primary { border-color: var(--cor-primaria, #542817) !important; }` e `--bs-primary: #542817; --bs-primary-rgb: 84, 40, 23;`.
   - **Rodapé alinhado e elegante (Imagem 4)**: estilize `.footer` / `footer` com `background: #f4eddb; border-top: 1px solid #d2c2a9; padding: 1.25rem 1.5rem; margin-top: 3rem; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 1rem; font-size: 0.86rem; color: #766750;` e `.footer-links { display: flex; flex-wrap: wrap; gap: 1.25rem; }`.
```

### Prompt 03 — Etapa 3: Aba Lateral Unificada no `menu.js` (Navegação Completa + Seletor de Roça + Botão Retrátil `⚙️ Configurações`)

> **Quando usar:** Terceiro passo. Atualiza `public/assets/js/menu.js` e `public/assets/js/acessibilidade-voz.js` para injetar automaticamente a Aba Lateral Unificada em todas as páginas internas e gerenciar a roça ativa do agricultor.

```text
Atue como Engenheiro Frontend Sênior. Vamos executar a Etapa 3 do Plano 4: transformar `public/assets/js/menu.js` e `public/assets/js/acessibilidade-voz.js` no gerenciador central da Aba Lateral Unificada, do Seletor de Roça Ativa e do menu retrátil de Configurações.

REGRA DE ESCOPO (ECONOMIA DE TOKENS):
- Edite APENAS `public/assets/js/menu.js` e `public/assets/js/acessibilidade-voz.js`.
- NÃO reescreva páginas HTML nesta etapa.

REQUISITOS TÉCNICOS PARA `public/assets/js/menu.js`:
1. Separação Estrita entre Página de Entrada (`index.html` / `login.html`) e Páginas do Painel Logado:
   - Se o usuário estiver em `/index.html` e já tiver sessão ativa (`getAuthSession()`), redirecione para `/pages/painel.html`.
   - Se o usuário estiver em `/index.html` ou `/pages/login.html` deslogado, renderize apenas a topbar limpa de visitante (Logo + botão `"Entrar na conta"` / `"Criar cadastro"`).
2. Injeção Automática da Aba Lateral Unificada nas Páginas Logadas (`painel.html`, `perfil.html`, `plantio.html`, `reservatorios.html`, `comunidade.html`, `assistente-ia.html`, `admin.html`):
   - Construa/envolva automaticamente o conteúdo da página dentro de `.app-layout-shell` contendo:
     a) **Topbar Mobile/Tablet (`.app-mobile-topbar`)**: visível apenas em telas `< 1025px`, com logo `/assets/images/logo.png`, nome `"Manejo Caatingueiro"` e botão `"☰ Menu"` que abre a Aba Lateral.
     b) **Aba Lateral (`.app-sidebar-nav`, mantendo também `<nav id="menu">` para compatibilidade)**:
        - **Topo da Aba**: Logo `<img src="/assets/images/logo.png" alt="Manejo Caatingueiro">` + Nome do usuário conectado.
        - **Seletor `"Minha Roça Ativa"` (`#sidebar-select-roca`)**: lista as roças cadastradas do usuário (vindas da sessão ou de `GET /api/v1/usuario/rocas`, ex.: *"Roça Fazenda Baixio — Irecê"* e *"Roça Sítio Caraíbas — Pres. Dutra"*). Ao trocar de roça no seletor, salva a roça ativa em `localStorage` (`mc_roca_ativa_v1`) e dispara o evento global `window.dispatchEvent(new CustomEvent('mc:roca-changed', { detail: rocaAtiva }))` para atualizar imediatamente o mapa e os dados climáticos da página!
        - **Links de Navegação Intuitivos**:
          * `🏠 Painel do Usuário` (`/pages/painel.html`)
          * `🗺️ Meu Perfil e Minhas Roças` (`/pages/perfil.html`)
          * `🌱 Recomendações de Plantio` (`/pages/plantio.html`)
          * `💧 Cisterna e Poço` (`/pages/reservatorios.html`)
          * `📢 Alertas e Mural` (`/pages/comunidade.html`)
          * `💬 Assistente da Roça` (`/pages/assistente-ia.html`)
          * `🏛️ Administração` (`/pages/admin.html` — exibido se perfil gestor)
        - **Botão Retrátil `⚙️ Configurações` (`#btn-toggle-sidebar-settings`)**:
          * Ao clicar, abre/fecha um bloco colapsável (`.sidebar-settings-collapse`) contendo:
            1. **Tema Visual**: botão de alternância **Claro / Escuro** (`☀️ / 🌙`), botão **Daltônico** (`👁️`) e botão **Baixa Visão** (`◐`).
            2. **Tamanho da Fonte**: botões `A-`, `100%`, `A+`.
            3. **Leitura em Voz Alta**: botão `🔊 Ouvir resumo da página` e seletor de velocidade.
        - **Rodapé da Aba**: botão `"🚪 Sair da conta"` (acionando o modal de confirmação `#logout-confirm-modal`, que ao confirmar limpa a sessão e leva para `/index.html`).
3. Exponha em `window.MC_Menu` os helpers `getRocaAtiva()`, `setRocaAtiva(rocaId)` e `getRocasUsuario()`.
```

### Prompt 04 — Etapa 4: Correção Definitiva do Bug `NaN °C` (Imagem 3) e Clima Vinculado à Roça Ativa no `clima-dinamico.js`

> **Quando usar:** Quarto passo. Elimina o erro `NaN °C (mín NaN °C)` e os nomes em branco (`- PI`) mostrados na Imagem 3, e faz o script climático usar sempre as coordenadas fixas da **Roça Ativa** do agricultor.

```text
Atue como Engenheiro Full-Stack. Vamos executar a Etapa 4 do Plano 4: correção definitiva do bug `NaN °C` e das cidades sem nome no ranking de temperaturas (visto nas capturas de tela) e vinculação do `clima-dinamico.js` às coordenadas fixas da Roça Ativa do usuário.

REGRA DE ESCOPO (ECONOMIA DE TOKENS):
- Edite APENAS `public/assets/js/clima-dinamico.js` e `src/domain/clima/service/RadarMeteorologicoService.ts`.
- NÃO edite arquivos HTML nesta etapa.

CORREÇÕES OBRIGATÓRIAS:
1. Fim Definitivo do `NaN °C` e Nomes em Branco (`"- PI"`) em `RadarMeteorologicoService.ts` e `clima-dinamico.js`:
   - Na API `https://radarmeteorologico.com.br/api/v1/temperaturas`, os objetos podem vir com chaves variadas (`cidade`, `municipio`, `nome`, `uf`, `estado`, `maxima`, `temp_max`, `temperatura`, `minima`, `temp_min`, `condicao`, `tempo`).
   - Crie uma função normalizadora `normalizarItemTemperatura(raw, idx, tipo)` tanto no `RadarMeteorologicoService.ts` quanto em `MC_Radar.obterTemperaturas` no `clima-dinamico.js`:
     * `nome`: `String(raw?.nome || raw?.cidade || raw?.municipio || raw?.localidade || "").trim()` (se vier vazio, use fallback real como `"Irecê"`, `"Juazeiro"`, `"Barreiras"`, `"Piatã"`, `"Morro do Chapéu"` — NUNCA deixe string vazia!).
     * `uf`: `String(raw?.uf || raw?.estado || "BA").trim().toUpperCase()`.
     * `temp_max`: converta `raw?.temp_max ?? raw?.maxima ?? raw?.max ?? raw?.temperatura` com `Number()`. Se `!Number.isFinite(val)`, aplique valor numérico seguro (ex.: `33.5` para mais quentes ou `24.0` para mais amenas).
     * `temp_min`: converta `raw?.temp_min ?? raw?.minima ?? raw?.min ?? (temp_max - 11)` com `Number()`. Se `!Number.isFinite(val)`, aplique valor numérico seguro (ex.: `21.0` ou `14.5`).
   - Limpe chaves antigas de cache (`mc_radar_temperaturas_v1_*` -> mude a chave para `mc_radar_temperaturas_v2_*`) para que nenhum cache antigo com `NaN` seja lido do `localStorage`!
2. Clima Sempre Sincronizado com a Roça Ativa do Usuário (`window.MC_Menu.getRocaAtiva()`):
   - Em `carregarDiagnosticoClima(opcoes)` dentro de `clima-dinamico.js`, se `opcoes.lat` não for passado explicitamente, obtenha automaticamente a **Roça Ativa** do usuário (`window.MC_Menu?.getRocaAtiva()`) e use `roca.latitude`, `roca.longitude`, `roca.codigoIbge` e `roca.municipio`!
   - Escute o evento `window.addEventListener('mc:roca-changed', (e) => { ... })` para recarregar automaticamente o diagnóstico de chuva, plantio e alertas sempre que o agricultor alternar entre a Roça 1 e a Roça 2 na Aba Lateral.
3. Função `detectarCidadeMaisProximaNoSelect(selectEl, btnEl, onCoordsDetected)` (Uso Exclusivo no Cadastro de Usuário e Cadastro de Roça):
   - Quando acionada em `login.html` ou `perfil.html`, obtém o GPS (`navigator.geolocation`), encontra a cidade mais próxima pela fórmula de Haversine, **atualiza o `selectEl.value` e o texto selecionado**, e devolve `{ latitude, longitude, municipio, codigoIbge }` para atualizar o pino no mapa interativo.
```

### Prompt 05 — Etapa 5: `index.html` Exclusivamente Comercial + Nova Página `/pages/painel.html` (Painel do Usuário com Mapa da Roça)

> **Quando usar:** Quinto passo. Deixa a `public/index.html` apenas como vitrine comercial de entrada (como solicitado) e cria a nova página dedicada `/pages/painel.html` (Painel do Usuário) com o Mapa Interativo mostrando onde a roça ativa se situa, eliminando a busca incoerente de cidades e o botão de GPS solto no painel.

```text
Atue como Engenheiro Frontend Sênior. Vamos executar a Etapa 5 do Plano 4: deixar `public/index.html` exclusivamente como página comercial de entrada e criar a página dedicada `public/pages/painel.html` (Painel do Usuário) com Mapa Interativo da Roça.

REGRA DE ESCOPO (ECONOMIA DE TOKENS):
- Edite `public/index.html` e crie `public/pages/painel.html`.
- NÃO altere os arquivos do backend nesta etapa.

REQUISITOS PARA `public/index.html` (SOMENTE PÁGINA DE ENTRADA COMERCIAL):
1. `public/index.html` deve conter **exclusivamente** a página de apresentação comercial/institucional do Manejo Caatingueiro para quem chega ao site:
   - Se o usuário já estiver logado (`mc_auth_session_v4`), redirecione automaticamente para `/pages/painel.html`.
   - Mantenha a estética Editorial Sertaneja com a arte oficial `/assets/images/logo.png` (Calango, Sol e Mandacaru), o título `"O seu lugar. O tempo de plantar."`, as ilustrações do semiárido (`roca-favoravel.svg`, `roca-atencao.svg`, `roca-estiagem.svg`), os cartões explicando os benefícios comerciais do aplicativo e os botões de destaque **`"Entrar na minha conta →"`** (`/pages/login.html`) e **`"Criar meu cadastro"`** (`/pages/login.html?modo=cadastro`).
   - Mantenha `#logout-confirm-modal` no HTML para conformidade com o `code-agent.js`.

REQUISITOS PARA A NOVA PÁGINA `public/pages/painel.html` (PAINEL DO USUÁRIO LOGADO):
1. Estrutura com a Aba Lateral Unificada (`menu.js`):
   - Carregue Bootstrap 5.3 CSS/JS, **Leaflet CSS/JS** (`https://unpkg.com/leaflet@1.9.4/dist/leaflet.css` e `leaflet.js` — mapa 100% gratuito com OpenStreetMap), `/assets/css/global/elements.css`, `acessibilidade-voz.js`, `clima-dinamico.js` e `menu.js`.
2. Cabeçalho Coerente da Roça Ativa (FIM DA INCOERÊNCIA DA IMAGEM 1):
   - **NÃO coloque** campo de pesquisar cidade aleatória nem botão `"Minha localização"` no Painel da Roça (pois a roça tem local fixo!).
   - No topo do `painel.html`, exiba um cabeçalho limpo mostrando:
     * Saudação ao agricultor: `"Olá, [Nome do Agricultor]!"`
     * Identificação clara da roça que está sendo analisada: **`"Roça analisada: [Nome da Roça] — [Município - BA]"`** (ex.: *"Roça Fazenda Baixio — Irecê - BA"*).
     * Se o agricultor tiver mais de uma roça cadastrada, exiba um seletor rápido **`"Alternar entre minhas roças"`** + um botão **`"🗺️ Cadastrar ou editar roças"`** que leva para `/pages/perfil.html`.
3. Mapa Interativo da Localização da Roça + Resumo Agroclimático (Grid Responsivo para Desktop, Tablet e Mobile):
   - **Seção Superior (2 Colunas no Desktop `col-lg-7` + `col-lg-5`)**:
     * **Coluna 1**: Cards de **Chuva Acumulada** (`.card.h-100.border-primary`, `#texto-chuva-acumulada`) e **Condição de Plantio** (`.card.h-100.border-success`, `#texto-sugestao-plantio`) com os dados reais das coordenadas da roça ativa.
     * **Coluna 2 (Mapa da Roça)**: Card **"📍 Localização da Sua Roça no Mapa"** contendo o mapa interativo `#mapa-roca-painel` (Leaflet + OpenStreetMap) centralizado nas coordenadas exatas (`latitude`, `longitude`) da roça analisada, com um marcador (pino) exibindo o nome da roça, o município e as culturas plantadas! Quando o usuário alternar entre a Roça 1 e a Roça 2, o mapa voa (`map.setView`) automaticamente para a localização da outra roça.
   - **Abas Inferiores Organizadas**:
     * **Aba 1: Como Agir Hoje na Terra** (Ilustração dinâmica da roça + guia prático de manejo).
     * **Aba 2: Pluviômetro da Roça** (Formulário para anotar a chuva caída nesta roça + histórico de chuvas anotadas).
     * **Aba 3: Alertas e Temperaturas da Região** (Avisos do INMET para o município da roça + comparativo de temperaturas sem `NaN °C`!).
```

### Prompt 06 — Etapa 6: Nova Página `/pages/perfil.html` (Editar Usuário + Cadastrar Múltiplas Roças com Mapa e `"📍 Minha localização"`) e Ajuste em `login.html`

> **Quando usar:** Sexto passo. Cria a página dedicada de **Editar Informações e Cadastrar Roças (`/pages/perfil.html`)** com Mapa Interativo clicável e botão `"📍 Minha localização"` funcional, além de ajustar `login.html` para redirecionar para `/pages/painel.html`.

```text
Atue como Engenheiro Full-Stack. Vamos executar a Etapa 6 do Plano 4: criação da página `public/pages/perfil.html` (Meu Perfil e Cadastro de Roças com Mapa Interativo) e ajuste do redirecionamento e GPS em `public/pages/login.html`.

REGRA DE ESCOPO (ECONOMIA DE TOKENS):
- Crie `public/pages/perfil.html` e edite `public/pages/login.html`.
- NÃO altere outras páginas HTML nesta etapa.

REQUISITOS PARA `public/pages/perfil.html` (EDIÇÃO DO USUÁRIO + GESTÃO DE MÚLTIPLAS ROÇAS COM MAPA):
1. Layout integrado à Aba Lateral Unificada (`menu.js`), dividido em 2 seções/abas claras no Desktop (`col-lg-5` + `col-lg-7`):
   - **Coluna / Seção 1: Meus Dados Pessoais (`PUT /api/v1/usuario/me`)**:
     * Formulário para editar Nome completo, Telefone/WhatsApp, E-mail, Fonte principal de água (`Cisterna`, `Poço`, `Água encanada`) e Nova Senha.
     * Ao salvar, atualiza tanto o backend quanto a sessão `mc_auth_session_v4` no `localStorage`.
   - **Coluna / Seção 2: Minhas Roças e Locais de Plantio (`GET/POST/PUT/DELETE /api/v1/usuario/rocas`)**:
     * **Lista das Roças Cadastradas do Agricultor**: exibe cards para cada roça (ex.: *Roça 1: Fazenda Baixio — Irecê, BA* e *Roça 2: Sítio Caraíbas — Presidente Dutra, BA*), com botões **"Ver no Painel"**, **"Ver no Mapa"**, **"Editar"** e **"Excluir"**.
     * **Formulário + Mapa Interativo para Cadastrar Nova Roça (ou Editar Roça)**:
       - Campo **Nome da Roça / Plantio** (ex.: `"Roça da Chapada"`, `"Plantio de Mandioca"`).
       - Campo **Cidade ou Povoado (`<select id="roca-select-municipio">`)** populado com os municípios da Bahia + botão **`"📍 Minha localização"`** ao lado!
       - **Comportamento obrigatório do botão `"📍 Minha localização"`**: ao clicar, obtém a localização GPS do usuário, encontra a cidade correspondente, **muda automaticamente o valor selecionado no `<select id="roca-select-municipio">`**, preenche os campos de `latitude` e `longitude` e posiciona o pino no mapa!
       - **Mapa Interativo Clicável (`#mapa-cadastro-roca` com Leaflet + OpenStreetMap)**: mostra o ponto exato da roça. O agricultor também pode clicar ou arrastar o pino no mapa para marcar o ponto exato do seu sítio/roça na zona rural, e ao escolher outra cidade no `<select>`, o mapa centraliza imediatamente naquela cidade!
       - Seleção das **Culturas plantadas nesta roça** (checkboxes: `Milho`, `Feijão-Caupi`, `Mamona`, `Mandioca / Outras`).
       - Botão **"Salvar Roça"** que grava na API (`POST /api/v1/usuario/rocas`) e atualiza o seletor de roças da Aba Lateral.

REQUISITOS PARA `public/pages/login.html`:
1. Redirecionamento Pós-Login:
   - Quando o agricultor fizer login ou concluir o cadastro (ou se já estiver logado ao abrir `login.html`), redirecione para **`/pages/painel.html`** (ou `/pages/admin.html` se perfil gestor).
2. Botão `"📍 Minha localização"` no Cadastro (`#btn-gps-cadastro`):
   - Garanta que ao clicar em `"📍 Minha localização"` na aba de Criar Cadastro, o `<select id="cad-localidade">` **mude visualmente na hora** para a cidade correspondente à localização do usuário (e exiba um pequeno mapa de confirmação ou mensagem com o nome da cidade selecionada), salvando a cidade correta como a 1ª roça do usuário.
```

### Prompt 07 — Etapa 7: Padronização da Aba Lateral e Correção das Imagens 5, 6, 7 e 8 nas Demais Páginas (`plantio`, `reservatorios`, `comunidade`, `assistente-ia`, `admin`)

> **Quando usar:** Sétimo e último passo. Conecta todas as páginas restantes à nova Aba Lateral Unificada, corrige os botões cinzas e a borda azul de `reservatorios.html` (Imagens 5 e 6), preenche o card vazio de `comunidade.html` (Imagem 8) e atualiza o `scripts/code-agent.js`.

```text
Atue como Engenheiro Full-Stack. Vamos concluir o Plano 4 (Etapa 7): integrar a Aba Lateral Unificada e corrigir os detalhes visuais e de dados nas páginas `plantio.html`, `reservatorios.html`, `comunidade.html`, `assistente-ia.html`, `admin.html` e no `scripts/code-agent.js`.

REGRA DE ESCOPO (ECONOMIA DE TOKENS):
- Edite `public/pages/plantio.html`, `public/pages/reservatorios.html`, `public/pages/comunidade.html`, `public/pages/assistente-ia.html`, `public/pages/admin.html` e `scripts/code-agent.js`.

CORREÇÕES OBRIGATÓRIAS BASEADAS NAS IMAGENS ENVIADAS:
1. Navegação Unificada por Aba Lateral em Todas as 5 Páginas:
   - Remova sidebars antigas duplicadas (como a da Imagem 7 que tinha um quadrado verde-escuro vazio e configurações abertas) e deixe o `menu.js` montar a **Aba Lateral Unificada** (com logo `/assets/images/logo.png`, seletor de Roça Ativa, links para `Painel do Usuário`, `Meu Perfil e Roças`, `Plantio`, `Cisterna e Poço`, `Alertas e Mural`, `Assistente IA` e botão retrátil `⚙️ Configurações`).
   - Garanta que `/assets/css/global/elements.css` seja carregado **DEPOIS** do CSS do Bootstrap em todas as páginas para que nunca apareça borda azul-elétrico (`#0d6efd`) nem botões cinzas sem estilo.
2. Em `public/pages/plantio.html`:
   - Remova o seletor solto de município e o botão de GPS da página de plantio: a página deve exibir automaticamente as recomendações de plantio para a **Roça Ativa** selecionada pelo agricultor (exibindo no topo: *"Analisando plantio para: [Nome da Roça] ([Município - BA])"* + miniatura do local ou link para trocar de roça na barra lateral).
3. Em `public/pages/reservatorios.html` (Correção das Imagens 5 e 6):
   - Substitua os botões cinzas sem estilo (`"Ouvir orientação"`, `"Minha Cisterna ou Poço"`, `"Água na Comunidade"`) por botões estilizados com `.btn` e `.auth-tabs` / `.auth-tab` da paleta Editorial Sertaneja (`#5d603d` ativo e `#fffaf0` inativo).
   - No card `"Quanto de água tem hoje no seu reservatório?"` (Imagem 6), troque a borda azul por `border: 1px solid #d2c2a9; border-left: 4px solid #542817;` e dê largura suficiente (`col-12 col-md-6`) ao `<select>` de `"Escala rápida visual"` para que o texto `"Acima da metade (55% a 75%)"` nunca fique cortado.
4. Em `public/pages/comunidade.html` (Correção das Imagens 3 e 8):
   - **Fim do Card Vazio em "Alertas Climáticos da Região" (Imagem 8)**: ao carregar a página, popule imediatamente a lista de alertas com os avisos do Radar Meteorológico / INMET para o município da Roça Ativa e para a Bahia. Se não houver tempestade severa ativa no momento, renderize dentro do card um painel informativo completo (**" Clima Estável em [Município da Roça] — Sem Alertas Severos no Momento"**) mostrando temperatura atual, umidade, vento, acumulado de chuva e recomendações preventivas para cisternas e plantio — nunca deixe o card em branco!
   - Na aba de temperaturas, use os dados normalizados do `MC_Radar.obterTemperaturas` garantindo zero `NaN °C`.
5. Atualize `scripts/code-agent.js` para incluir a verificação de `public/pages/painel.html` e `public/pages/perfil.html`, mantendo 100% de aprovação em `npm run agent`.
```
