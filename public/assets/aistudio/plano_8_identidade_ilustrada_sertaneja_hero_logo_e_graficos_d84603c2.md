# Plano 8 de Implementação: Ajuste do Topo da `index.html` (Sem Botões Duplicados + Logo Grande), Ilustrações em Medalhão Sertanejo e Gráficos/Medidores Visuais Intuitivos

Este documento analisa as **2 capturas de tela atuais da `index.html` (`142754.png` e `142808.png`)** e as **3 imagens de referência de artes e gráficos (`vnlwfivnlwfivnlw.jpg`, `ogh0tyogh0tyogh0.jpg` e `m67bhym67bhym67b.jpg`)**, estruturando o **Oitavo Plano de Implementação** em **5 prompts leves, atômicos e sequenciais** para o Google AI Studio.

---

## 1. Diagnóstico das Mudanças Solicitadas e Soluções no Plano 8

| Ponto Solicitado / Imagem de Referência | Como Está Hoje | Como Ficará no Plano 8 (Mobile, Tablet e Desktop) |
| :--- | :--- | :--- |
| **1. Botões de Entrar/Cadastrar duplicados na `index.html` (`142754.png` e `142808.png`)** | Os botões `"Entrar na minha conta →"` e `"Criar meu cadastro"` aparecem duas vezes: no bloco superior (Hero) e novamente no card inferior (`"Pronto para acompanhar o clima..."`). | **Remoção dos botões da parte de cima**: o bloco superior exibe **apenas o texto institucional** (*"TERRA, TEMPO E CUIDADO · SEMIÁRIDO BAIANO / O seu lugar. / O tempo de plantar. / Acompanhe a chuva que cai na sua terra..."*) ao lado da **Logo Oficial Grande**, mantendo os botões de Entrar/Cadastrar **exclusivamente na seção inferior**. |
| **2. Logo minúscula no topo da `index.html` (`142754.png`)** | A logo `/assets/images/logo.png` está espremida num círculo minúsculo de `40px` ao lado do subtítulo, enquanto à direita aparece um retângulo verde-escuro antigo. | **Logo Oficial Grande com Texto (`MANEJO CAATINGUEIRO`)**: remoção da bolinha de `40px` e do retângulo verde-escuro; a coluna direita do bloco superior passa a exibir em destaque a arte completa `/assets/images/logo.png` (Calango, Sol, Mandacaru e tipografia *MANEJO CAATINGUEIRO*), responsiva em Desktop (`300px`), Tablet (`240px`) e Celular (`200px`). |
| **3. Estilo das Ilustrações nos Cards (`vnlwfivnlwfivnlw.jpg` e `ogh0tyogh0tyogh0.jpg`)** | Os cards ainda usavam SVGs retangulares de fundo verde-escuro chapado que não combinavam com a estética editorial areia/marfim. | **Ilustrações em Medalhão Circular Sertanejo (Estilo Xilogravura / Editorial Colorido)**: criação de 6 SVGs vetoriais em formato de **medalhão circular** com aro marrom-terra (`#542817`), sol ocre (`#bd7627`), cactos verde-oliva (`#5d603d`), solo em camadas terracota (`#a64f2e`) e água (`#7ba39b`), retratando *Chuva na Sua Terra (Pluviômetro)*, *Calendário da Roça*, *Água dos Açudes*, *Condição Favorável*, *Atenção às Chuvas* e *Reserva da Cisterna*. |
| **4. Gráficos, Medidores e Tabelas para Compreensão de Dados (`m67bhym67bhym67b.jpg`)** | Alguns indicadores climáticos e hídricos exibiam apenas texto corrido ou números soltos sem representação visual rápida. | **Visualização de Dados Editorial (Somente Onde Facilita a Leitura do Agricultor)**: inclusão do **Medidor Semicircular de Umidade do Solo (`Crítico | Alerta | Ideal` com ponteiro e raízes)**, do **Gráfico de Barras Editorial de Histórico de Chuvas (`Precipitação mm`)** no Painel, de **Barras Comparativas + Tabela de Ciclo das Culturas** em Plantio e do **Medidor Visual da Cisterna** em Reservatórios. |

---

## 2. Mapa de Execução dos 5 Prompts do Plano 8

| Ordem | Etapa do Plano 8 | O que Faz | Arquivos Alvo | Consumo |
| :---: | :--- | :--- | :--- | :---: |
| **Prompt 01** | Etapa 1: Criação das 6 Artes em Medalhão Circular Sertanejo (Estilo Xilogravura Editorial das Fotos de Referência) | Substitui os SVGs retangulares antigos por medalhões circulares ricos na paleta do projeto (`roca-favoravel.svg`, `roca-atencao.svg`, `roca-estiagem.svg`, `arte-chuva-terra.svg`, `arte-calendario-roca.svg`, `arte-agua-acudes.svg`). | `public/assets/images/*.svg` | Médio |
| **Prompt 02** | Etapa 2: CSS Responsivo dos Medalhões, Logo Hero, Gráficos Editoriais e Tabelas (Mobile, Tablet e Desktop) | Cria em `elements.css` e `painel.css` o estilo dos cards com medalhão circular, do gráfico de barras rústico-editorial, do medidor semicircular (`gauge`) e das tabelas limpas nos 3 dispositivos. | `public/assets/css/global/elements.css`, `public/assets/css/painel.css` | Baixo |
| **Prompt 03** | Etapa 3: Nova `public/index.html` (Topo Sem Botões Duplicados + Logo Grande com Texto + Cards com Medalhões Circulares) | Remove os botões de Entrar/Cadastrar do topo da `index.html`, coloca a logo grande `/assets/images/logo.png` ao lado do texto inicial, aplica os medalhões circulares nos cards e mantém os botões apenas embaixo. | `public/index.html` | Médio |
| **Prompt 04** | Etapa 4: Gráficos e Medidores Visuais em `public/pages/painel.html` (Gráfico `Histórico de Chuvas` + Medidor `Umidade do Solo`) | Adiciona no Painel do Usuário o **Gráfico de Barras de Histórico de Chuvas** e o **Medidor Semicircular de Umidade do Solo (`Crítico / Alerta / Ideal`)** idênticos à imagem de referência `m67bhym67bhym67b.jpg`. | `public/pages/painel.html`, `public/assets/js/clima-dinamico.js` | Médio |
| **Prompt 05** | Etapa 5: Visualização Intuitiva de Dados (Gráficos/Tabelas) em `plantio.html`, `reservatorios.html` e `comunidade.html` | Adiciona barras comparativas e tabela de ciclo agrícola em `plantio.html`, medidor visual de volume e tabela histórica em `reservatorios.html`, e barras térmicas comparativas em `comunidade.html`. | `public/pages/plantio.html`, `reservatorios.html`, `comunidade.html` | Médio |

---

## 3. Prompts Sequenciais Prontos para Copiar e Colar no Google AI Studio

### Prompt 01 — Etapa 1: Criação das Artes Vetoriais em Medalhão Circular Sertanejo (Fiel às Imagens de Referência)

> **Quando usar:** Primeiro passo do Plano 8. Cria/atualiza os arquivos SVG em `public/assets/images/` seguindo exatamente o estilo artístico das imagens enviadas (medalhões circulares com traço marrom-terra `#542817`, sol ocre `#bd7627` com raios, cactos mandacaru em verde-oliva `#5d603d`, camadas de solo terracota `#a64f2e` e água `#7ba39b`).

```text
Atue como Ilustrador Vetorial Sênior e Designer UI. Vamos iniciar o PLANO 8 (Etapa 1): substituir as ilustrações antigas por medalhões circulares estilizados no tema xilogravura/editorial sertanejo, usando exatamente a paleta do projeto (`#542817`, `#bd7627`, `#5d603d`, `#a64f2e`, `#7ba39b`, `#f4eddb`, `#fffaf0`).

REGRA DE ESCOPO (ECONOMIA DE TOKENS):
- Atualize/crie APENAS os 6 arquivos SVG dentro de `public/assets/images/`:
  1. `public/assets/images/roca-favoravel.svg`
  2. `public/assets/images/roca-atencao.svg`
  3. `public/assets/images/roca-estiagem.svg`
  4. `public/assets/images/arte-chuva-terra.svg`
  5. `public/assets/images/arte-calendario-roca.svg`
  6. `public/assets/images/arte-agua-acudes.svg`
- NÃO altere arquivos HTML ou TypeScript nesta etapa.

PADRÃO ARTÍSTICO OBRIGATÓRIO PARA TODOS OS 6 SVGs:
- Todos os 6 SVGs devem ter `viewBox="0 0 240 240"`, formato de **medalhão circular** (`<circle cx="120" cy="120" r="112" fill="#fbf6e9" stroke="#542817" stroke-width="5"/>` com `clipPath` circular `r="110"`), traços orgânicos em marrom-terra `#542817` (`stroke-width="2.5"`, `stroke-linecap="round"`) e NUNCA usar aquele fundo retangular verde-escuro antigo!
- Desenhe cada medalhão com riqueza de detalhes inspirada nas artes de referência:
  1. `roca-favoravel.svg` (**Condição Favorável**): Céu creme `#fbf6e9`, sol ocre `#bd7627` à direita, duas nuvens suaves chovendo gotas inclinadas, solo em 3 camadas onduladas (`#542817`, `#6b7048`, `#8c583a`), pé de milho com espiga dourada à esquerda, brotos verdes de feijão no centro e cacto mandacaru `#5d603d` à direita.
  2. `roca-atencao.svg` (**Atenção às Chuvas**): Céu creme, sol ocre `#bd7627` grande à direita, nuvem marrom-escura `#542817` à esquerda com poucas gotas, cobertura morta de palhada dourada (`#d8a452`) protegendo as colinas de solo terracota (`#a64f2e` e `#d2b48c`), galhos secos da caatinga e dois mandacarus `#5d603d`.
  3. `roca-estiagem.svg` (**Reserva da Cisterna**): Céu em pôr do sol ocre/dourado (`#d4943a`) com raios solares irradiando do sol `#bd7627`, colinas terracota `#a64f2e`, cisterna cilíndrica de placas/pedras no centro (`#c8a97e` com linhas de blocos `#542817`) vertendo um caminho de água, duas palmeiras/carnaúbas à esquerda e mandacaru à direita.
  4. `arte-chuva-terra.svg` (**Chuva na Sua Terra / Pluviômetro**): Nuvens chovendo bastante sobre uma casinha sertaneja ao fundo (`#c68b59`), cactos mandacaru nas laterais e, em primeiro plano à direita, um pluviômetro caseiro transparente preso a um mourão de madeira (`#7c4728`) acumulando água (`#7ba39b`) com poça d'água na base.
  5. `arte-calendario-roca.svg` (**Calendário da Roça**): Sol ocre radiante com raios longos no céu, cactos ao fundo e um agricultor sertanejo de chapéu de palha agachado cuidando dos pés de milho com espiga e mudas de feijão sobre solo coberto de palhada.
  6. `arte-agua-acudes.svg` (**Água dos Açudes**): Açude amplo de águas serenas (`#8ab0ab` com linhas de ondulação `#542817`) margeado por barrancos terracota, árvore sertaneja frondosa à esquerda, cactos em primeiro plano, cisterna no alto do morro à direita e sol ocre radiante ao fundo.
```

---

### Prompt 02 — Etapa 2: CSS Responsivo para o Novo Topo da `index.html`, Cards com Medalhão Circular, Gráficos e Medidores (Mobile, Tablet e Desktop)

> **Quando usar:** Segundo passo. Prepara no CSS global (`elements.css` e `painel.css`) o dimensionamento responsivo da Logo Grande do Hero, dos medalhões circulares e dos novos gráficos/medidores para Celular, Tablet e Desktop.

```text
Atue como Especialista Sênior em UI/UX e CSS Responsivo. Vamos executar a Etapa 2 do Plano 8: adicionar em `public/assets/css/global/elements.css` e `public/assets/css/painel.css` as classes para a Logo Grande do Hero, os Cards com Medalhão Circular e os Gráficos/Medidores Editoriais adaptados para Mobile, Tablet e Desktop.

REGRA DE ESCOPO (ECONOMIA DE TOKENS):
- Edite APENAS `public/assets/css/global/elements.css` e `public/assets/css/painel.css`.
- Mantenha intocadas as fontes (`Newsreader` 400 + `DM Sans`) e a paleta de cores restauradas no Plano 7.

ESTILOS RESPONSIVOS OBRIGATÓRIOS:
1. Bloco Hero da `index.html` com Logo Grande (`.hero-brand-showcase`):
   - Crie `.hero-brand-showcase`: contêiner elegante para exibir a imagem `/assets/images/logo.png` grande com o texto "MANEJO CAATINGUEIRO":
     * `display: flex; align-items: center; justify-content: center; background: #fbf6e9; border: 1px solid #d2c2a9; border-radius: 16px; padding: 1.5rem; box-shadow: 0 8px 24px rgba(84, 40, 23, 0.06);`
     * A imagem `img.hero-logo-large` dentro dele deve ser responsiva por plataforma:
       - **Mobile (`< 768px`)**: `width: 190px; max-width: 75vw; height: auto; margin: 0 auto;`
       - **Tablet (`768px a 1024px`)**: `width: 240px; height: auto;`
       - **Desktop (`>= 1025px`)**: `width: 290px; max-width: 100%; height: auto;`
2. Cards com Medalhão Circular Sertanejo (`.medallion-card` e `.medallion-img-wrap`):
   - `.medallion-card`: `background: #fffaf0; border: 1px solid #d2c2a9; border-radius: 12px; padding: 1.5rem 1.35rem; height: 100%; display: flex; flex-direction: column; align-items: flex-start; transition: transform 0.2s ease, box-shadow 0.2s ease;`
   - `.medallion-img-wrap`: centraliza o medalhão circular no topo do card (`width: 100%; display: flex; justify-content: center; margin-bottom: 1.25rem;`):
     * `img.medallion-svg`: `border-radius: 50%; object-fit: contain; display: block;` com tamanho adaptativo:
       - **Mobile (`< 768px`)**: `width: 155px; height: 155px;`
       - **Tablet (`768px a 1024px`)**: `width: 170px; height: 170px;`
       - **Desktop (`>= 1025px`)**: `width: 190px; height: 190px;`
   - Abaixo do medalhão, o título `.medallion-card h3` (`font-family: "Newsreader", Georgia, serif; font-weight: 400; font-size: 1.55rem; color: #542817; margin-bottom: 0.55rem; width: 100%;`) e o parágrafo `.medallion-card p` (`font-family: "DM Sans", sans-serif; font-size: 0.96rem; color: #542817; opacity: 0.88; line-height: 1.5; margin-bottom: 0; width: 100%; height: auto; overflow: visible;`) nunca devem cortar palavras no final!
3. Componentes de Visualização de Dados (Gráficos e Medidores Editoriais):
   - `.editorial-chart-box`: caixa em `#fffaf0` com borda `#d2c2a9` e `border-radius: 12px; padding: 1.35rem;` para abrigar o **Gráfico de Barras de Histórico de Chuvas** e o **Medidor Semicircular de Umidade do Solo (`Crítico | Alerta | Ideal`)**.
   - `.editorial-table`: tabela limpa com cabeçalho em `#f4eddb` (`color: #542817; font-weight: 700; border-bottom: 2px solid #d2c2a9;`), células com `padding: 0.75rem 0.9rem; color: #542817; font-variant-numeric: tabular-nums;` e barras de progresso horizontais (`.progress-sertanejo` com fundo `#e9e2d0` e preenchimento em `#5d603d`, `#bd7627` ou `#a64f2e`).
```

---

### Prompt 03 — Etapa 3: Reestruturação da `public/index.html` — Fim dos Botões Duplicados no Topo, Logo Grande com Texto e Cards com Medalhões Circulares

> **Quando usar:** Terceiro passo. Aplica exatamente as mudanças pedidas na `public/index.html`:
> 1. Remove os botões de Entrar e Cadastrar da parte de cima (deixando-os **apenas na parte de baixo**).
> 2. Substitui a bolinha pequena da logo e o card verde-escuro antigo pela **imagem grande da logo do Manejo Caatingueiro com texto (`/assets/images/logo.png`)** ao lado do texto inicial.
> 3. Atualiza os cards para exibirem as novas artes em **medalhão circular** (fiel às imagens de referência enviadas).

```text
Atue como Engenheiro Frontend Sênior. Vamos executar a Etapa 3 do Plano 8: atualizar `public/index.html` conforme as instruções visuais do usuário.

REGRA DE ESCOPO (ECONOMIA DE TOKENS):
- Edite APENAS `public/index.html`.
- NÃO altere arquivos do backend nesta etapa.

MUDANÇAS OBRIGATÓRIAS EM `public/index.html`:
1. Remoção de Botões de Entrar/Cadastrar do Topo (Fim da Duplicação mostrada nas Fotos 1 e 2):
   - Se o visitante estiver no `<header>` / topbar da `index.html`, deixe apenas a marca à esquerda e controles de acessibilidade/som (sem botões duplicados de Entrar/Cadastrar no topo).
   - **Na Primeira Seção (Hero Superior da `index.html`)**:
     * **REMOVA completamente** os botões `"Entrar na minha conta →"` e `"Criar meu cadastro"` desta parte de cima!
     * **REMOVA** aquela miniatura circular pequena de `40px` da logo que ficava antes do texto `"TERRA, TEMPO E CUIDADO"` e remova o card retangular verde-escuro antigo da direita.
     * Estruture o bloco superior em `<div class="row g-4 align-items-center">`:
       - **Coluna Esquerda (`col-12 col-lg-7`)**: deixe **APENAS** o texto exatamente como solicitado:
         ```html
         <p class="eyebrow mb-2">TERRA, TEMPO E CUIDADO · SEMIÁRIDO BAIANO</p>
         <h1 class="mb-3" style="font-family: 'Newsreader', Georgia, serif; font-weight: 400; color: #542817; font-size: clamp(2.5rem, 4.8vw, 3.8rem); line-height: 1.06;">
           O seu lugar.<br>
           <em style="font-style: italic; font-weight: 400; color: #bd7627;">O tempo de plantar.</em>
         </h1>
         <p class="mb-0" style="font-family: 'DM Sans', sans-serif; color: #6e6252; font-size: 1.08rem; line-height: 1.65; max-width: 58ch;">
           Acompanhe a chuva que cai na sua terra, saiba a hora certa de semear mandioca, milho, feijão e palma, veja o nível dos açudes e converse com quem vive do campo no Semiárido Baiano.
         </p>
         ```
       - **Coluna Direita (`col-12 col-lg-5 d-flex justify-content-center`)**: exiba a **imagem grande da logo oficial do Manejo Caatingueiro com o texto (`MANEJO CAATINGUEIRO`)**:
         ```html
         <div class="hero-brand-showcase">
           <img
             src="/assets/images/logo.png"
             alt="Manejo Caatingueiro — Calango, Sol e Mandacaru"
             class="hero-logo-large"
           />
         </div>
         ```
2. Seções de Cards Ilustrados com os Novos Medalhões Circulares (Fiel às Fotos de Referência 3 e 4):
   - **Primeira Linha de 3 Cards (`Condição Favorável`, `Atenção às Chuvas`, `Reserva da Cisterna` — fiel à Foto 4)**:
     * Use `<div class="row g-4 mb-5">` com 3 colunas (`col-12 col-md-4`). Cada card usa `.medallion-card` contendo no topo `.medallion-img-wrap > img.medallion-svg`:
       1) **Condição Favorável** (`/assets/images/roca-favoravel.svg`): *"Solo com umidade adequada e janela segura para semear milho, feijão-caupi e mandioca na sua roça."*
       2) **Atenção às Chuvas** (`/assets/images/roca-atencao.svg`): *"Orientações práticas de cobertura morta com palhada e retenção de água na terra durante veranicos."*
       3) **Reserva da Cisterna** (`/assets/images/roca-estiagem.svg`): *"Planejamento econômico da água armazenada e priorização de culturas resistentes na estiagem."*
   - **Segunda Linha de 3 Cards (`Chuva na Sua Terra`, `Calendário da Roça`, `Água dos Açudes` — fiel à Foto 3)**:
     * Use `<div class="row g-4 mb-5">` com 3 colunas (`col-12 col-md-4`) usando `.medallion-card`:
       1) **Chuva na Sua Terra** (`/assets/images/arte-chuva-terra.svg`): *"Veja o acumulado dos últimos 30 dias direto nas coordenadas da sua roça e anote os milímetros do seu pluviômetro caseiro."*
       2) **Calendário da Roça** (`/assets/images/arte-calendario-roca.svg`): *"Saiba o ciclo das culturas da Caatinga, espaçamento ideal, adubação orgânica e como proteger o solo com cobertura morta."*
       3) **Água dos Açudes** (`/assets/images/arte-agua-acudes.svg`): *"Consulte o volume útil dos principais reservatórios e cisternas da sua região para planejar o consumo familiar e da criação."*
3. Botões de Entrar e Cadastrar Mantidos APENAS na Parte de Baixo da Página (Foto 2):
   - Mantenha os botões **`"Entrar na minha conta →"`** (`/pages/login.html`, em verde-oliva `#5d603d` com texto `#fffaf0`) e **`"Criar meu cadastro"`** (`/pages/login.html?modo=cadastro`, em marfim `#fffaf0` com borda `#d2c2a9`) **exclusivamente** dentro do card final de chamada para ação (`"ACESSO GRATUITO — Pronto para acompanhar o clima e o plantio da sua propriedade?"`).
```

---

### Prompt 04 — Etapa 4: Gráficos Editoriais e Medidores Visuais em `public/pages/painel.html` (Fiel à Imagem de Referência 5: `Histórico de Chuvas` + `Umidade do Solo`)

> **Quando usar:** Quarto passo. Implementa dentro do Painel do Usuário (`public/pages/painel.html`) os gráficos e medidores visuais mostrados na 5ª imagem enviada (`Gemini_Generated_Image_m67bhym67bhym67b.jpg`): os cards com medalhões circulares de **Clima e Tempo** e **Previsão de Chuva**, o **Gráfico de Barras Editorial de Histórico de Chuvas (`Precipitação mm`)** e o **Medidor Semicircular de Umidade do Solo (`Crítico | Alerta | Ideal` com ponteiro e raízes)**, todos alimentados pelos dados reais da roça ativa.

```text
Atue como Engenheiro Frontend Sênior especialista em Visualização de Dados SVG. Vamos executar a Etapa 4 do Plano 8: implementar em `public/pages/painel.html` e `public/assets/js/clima-dinamico.js` os gráficos e medidores visuais inspirados na imagem de referência (`Clima e Tempo`, `Previsão de Chuva`, gráfico `Histórico de Chuvas` e medidor `Umidade do Solo`).

REGRA DE ESCOPO (ECONOMIA DE TOKENS):
- Edite APENAS `public/pages/painel.html` e `public/assets/js/clima-dinamico.js`.
- Mantenha o Mapa Interativo Leaflet da roça ativa e a lista das 283 cidades do Semiárido Baiano.

NOVAS VISUALIZAÇÕES DE DADOS EM `public/pages/painel.html` (FIÉIS À IMAGEM DE REFERÊNCIA 5):
1. Cards Ilustrados de Clima e Previsão + Painel Visual de Dados (Grid Responsivo para Mobile `col-12`, Tablet `col-md-6` e Desktop `col-lg-4`):
   - Substitua qualquer imagem retangular antiga em `painel.html` pelos novos medalhões circulares (`/assets/images/roca-favoravel.svg`, `roca-atencao.svg`, `roca-estiagem.svg`, `arte-chuva-terra.svg`).
2. Gráfico de Barras Editorial **"Histórico de Chuvas (Precipitação em mm)"** (`#grafico-historico-chuvas-svg`):
   - Crie um card `.editorial-chart-box` contendo um gráfico SVG responsivo (`viewBox="0 0 360 175"`) no estilo exato da imagem de referência:
     * Eixo vertical à esquerda com legenda `"Precipitação (mm)"` e linhas horizontais tracejadas sutis em `#542817`.
     * Base de terra marrom (`#542817`) sobre a qual se erguem as barras dos meses (`Jan`, `Fev`, `Mar`, `Abr`, `Mai`, `Jun`, `Jul`, `Ago`, `Set`, `Out`, `Nov`, `Dez` ou os últimos meses/semanas da roça ativa):
       - Meses secos (`< 40 mm`): barras em terracota (`#a64f2e`) com textura de gotas/hachuras.
       - Meses de transição (`40 a 90 mm`): barras em ocre (`#bd7627`).
       - Meses chuvosos (`> 90 mm`): barras em verde-oliva (`#5d603d`).
     * Abaixo do gráfico: título `"Histórico de Chuvas"` em `Newsreader` 400 (`#542817`) e resumo claro do acumulado atual vs. média histórica do mês.
3. Medidor Semicircular Editorial **"Umidade do Solo"** (`#medidor-umidade-solo-svg`):
   - Crie um card `.editorial-chart-box` contendo o velocímetro/arco semicircular SVG (`viewBox="0 0 300 175"`) idêntico ao canto inferior direito da imagem de referência:
     * Arco externo dividido em 3 faixas com contorno `#542817`:
       1) Esquerda: **`Crítico`** (preenchimento terracota `#b85d3b`).
       2) Centro: **`Alerta`** (preenchimento ocre `#d48c32`).
       3) Direita: **`Ideal`** (preenchimento verde-oliva `#6e7548`).
     * Semicírculo solar ocre (`#d48c32`) no centro com raios finos ao redor e **raízes de planta desenhadas na base abaixo da linha do solo (`#542817`)**!
     * **Ponteiro dinâmico (`#ponteiro-umidade-solo`)**: gira automaticamente via JavaScript (`transform: rotate(Xdeg)`) conforme a chuva acumulada / umidade real da roça ativa (apontando para `Crítico` se `< 45 mm`, `Alerta` entre `45 e 95 mm`, ou `Ideal` se `>= 95 mm`).
     * Abaixo do medidor: título `"Umidade do Solo"` em `Newsreader` 400 (`#542817`) e texto indicando o nível atual de água disponível nas camadas monitoradas para o plantio.
4. Na Aba **"Pluviômetro da Roça"**:
   - Exiba ao lado do formulário de anotação uma **Tabela Limpa de Registros de Chuva (`.editorial-table`)** com colunas `Data`, `Volume Anotado (mm)`, `Condição da Terra` e barra visual proporcional, facilitando a leitura imediata pelo agricultor.
```

---

### Prompt 05 — Etapa 5: Gráficos, Medidores e Tabelas Intuitivas em `plantio.html`, `reservatorios.html` e `comunidade.html`

> **Quando usar:** Quinto e último passo do Plano 8. Adiciona visualizações gráficas e tabelas enxutas **apenas onde são necessárias para compreensão de dados** nas páginas de Plantio (barras comparativas de chuva mínima vs. chuva atual + tabela-calendário de culturas), Reservatórios (medidor visual de nível da cisterna/açude + tabela de evolução) e Comunidade (barras térmicas comparativas das cidades do Semiárido Baiano).

```text
Atue como Engenheiro Frontend Sênior. Vamos concluir o Plano 8 (Etapa 5): adicionar gráficos comparativos, medidores visuais e tabelas intuitivas (somente onde auxiliam a compreensão real dos dados) em `public/pages/plantio.html`, `public/pages/reservatorios.html` e `public/pages/comunidade.html`, mantendo total responsividade para Mobile, Tablet e Desktop.

REGRA DE ESCOPO (ECONOMIA DE TOKENS):
- Edite APENAS `public/pages/plantio.html`, `public/pages/reservatorios.html` e `public/pages/comunidade.html`.

MELHORIAS VISUAIS E DE DADOS NAS 3 PÁGINAS:
1. Em `public/pages/plantio.html` (Gráfico Comparativo de Aptidão Hídrica + Tabela-Calendário da Roça):
   - Nos 3 cards principais de culturas (**🌽 Milho**, **🫘 Feijão-Caupi (Corda)** e **🌿 Mamona**), adicione dentro de cada card uma **Barra Visual de Progresso Hídrico (`.progress-sertanejo`)** comparando visualmente o **`Acumulado atual na roça (mm)`** com a **`Chuva mínima exigida (mm)`**, preenchendo em `#5d603d` (verde-oliva) quando atingir a meta, `#bd7627` (ocre) quando estiver acima de 50% e `#a64f2e` (terracota) quando abaixo de 50%.
   - Adicione um card ilustrado com o medalhão `/assets/images/arte-calendario-roca.svg` ao lado de uma **Tabela Resumo do Calendário e Ciclo de Plantio (`.editorial-table` dentro de `.table-responsive`)** com as colunas: `Lavoura`, `Chuva Mínima Ideal`, `Ciclo até a Colheita`, `Espaçamento Recomendado`, `Consórcio Indicado` e `Situação Hoje na Roça`.
2. Em `public/pages/reservatorios.html` (Medidor Visual da Cisterna/Açude + Tabela de Medições):
   - No card principal de nível do reservatório, exiba o medalhão `/assets/images/arte-agua-acudes.svg` (ou `/assets/images/roca-estiagem.svg`) e um **Medidor Gráfico de Volume da Cisterna (SVG cilíndrico graduado de `0%` a `100%` com onda de água animada em `#7ba39b` e marcadores de `25% Crítico`, `50% Atenção` e `75%+ Seguro`)** que sobe ou desce conforme o percentual real registrado pelo agricultor!
   - Abaixo do formulário de registro, apresente o histórico de leituras em uma **Tabela Limpa de Evolução Hídrica (`.editorial-table` em `.table-responsive`)** mostrando `Data da Medição`, `Reservatório`, `Volume Estimado (L)`, `Nível (%)` com barra visual e `Autonomia Estimada`.
3. Em `public/pages/comunidade.html` (Tabela Visual de Temperaturas do Semiárido Baiano):
   - No comparativo de temperaturas das **283 cidades do Semiárido Baiano** (`Municípios mais quentes hoje` vs. `Municípios mais amenos hoje`), adicione em cada linha uma **barra térmica horizontal proporcional** (em terracota `#a64f2e` para os mais quentes e verde-oliva `#5d603d` para os mais amenos) entre o nome do município e os valores `Máx °C / Mín °C`, tornando a comparação visual instantânea em qualquer tela (Celular, Tablet ou Desktop).
```
