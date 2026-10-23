# Plano 7 de Implementação: Restauração Fiel da Tipografia (`Newsreader` 400 + `DM Sans`) e da Paleta Original de Cores (Fotos de 21/10) Mantendo o Novo Alinhamento Responsivo

Este documento compara diretamente a **captura de tela atual com problemas de leitura (`Captura de tela 2026-10-23 111447.png`)** com as **duas capturas de tela do estilo original aprovado (`Captura de tela 2026-10-21 150641.png` e `150720.png`)** e divide a correção em **4 prompts leves, cirúrgicos e sequenciais** para o Google AI Studio — restaurando **100% das fontes e cores originais** sem perder **nenhum dos alinhamentos responsivos conquistados no Plano 6**.

---

## 1. Diagnóstico Comparativo: Estilo Novo (Foto de 23/10) vs. Estilo Original Desejado (Fotos de 21/10)

| Elemento Visual | O que Aconteceu de Errado na Foto Atual (`2026-10-23 111447.png`) | Como Era no Estilo Original Aprovado (`2026-10-21 150641.png` e `150720.png`) | Correção Exata no Plano 7 |
| :--- | :--- | :--- | :--- |
| **1. Cor do Parágrafo e Subtítulo na `index.html` (Texto Quase Invisível)** | O parágrafo *"Acompanhe a chuva que cai na sua terra..."* ficou **branco (`#ffffff`) sobre fundo areia claro (`#f4eddb`)**, e o selo superior *"SABEDORIA DA TERRA..."* ficou amarelo-pálido quase invisível, porque uma classe antiga (`.hero` do CSS antigo de fundo escuro) aplicou `color: #fff` sobre o fundo claro. | Texto descritivo em **marrom-taupe médio-escuro de alta legibilidade (`#6e6252` / `#5f5242`)** e selo superior (*eyebrow* `"TERRA, TEMPO E CUIDADO"`) em **verde-oliva escuro nítido (`#4e5944` / `#5d603d`)** sobre o fundo areia `#f4eddb`. | Remover qualquer `color: #fff` ou amarelo-claro em fundos areia/creme e travar `--cor-texto: #542817`, `--cor-texto-suave: #6e6252` e `.eyebrow { color: #4e5944 !important; }`. |
| **2. Fonte dos Títulos (`O seu lugar. O tempo de plantar.` / `Entre na sua conta`)** | A fonte ficou pesada, grossa (`font-weight: 700/800`) e blocada (caindo em `Georgia Bold` ou sem importar o peso `400` da `Newsreader`), além de ter perdido o itálico dourado/ocre na segunda frase. | Fonte editorial **`"Newsreader"`** importada do Google Fonts com **peso leve/regular (`font-weight: 400`, nunca negrito!)**, primeira linha em marrom-terra (`#542817`) e segunda linha em **itálico ocre (`<em>O tempo de plantar.</em>` em `#bd7627`)**. | Importar explicitamente `Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400` no `<head>` e no CSS global, forçando `h1, h2, .serif-title { font-family: "Newsreader", Georgia, serif !important; font-weight: 400 !important; }`. |
| **3. Fonte de Textos, Rótulos, Abas e Botões** | Mistura de fontes padrão do Bootstrap/sistema com pesos inconsistentes. | Fonte geométrica limpa **`"DM Sans"`** (`400`, `500`, `600`, `700`) em todos os parágrafos, labels (`Telefone`, `Senha` em `12px/13px` `font-weight: 700` `#542817`), inputs e botões. | Forçar `body, p, label, input, select, textarea, button, .btn { font-family: "DM Sans", -apple-system, BlinkMacSystemFont, sans-serif !important; }`. |
| **4. Cor dos Botões Principais (`Entrar na minha conta →` / `Entrar →`)** | O botão na `index.html` ficou amarelo-gema berrante (`#fbbc04` / `#ffc107`) com texto preto e fonte grande. | Botão elegante em **verde-oliva profundo da Caatinga (`#5d603d`)** com hover `#484b2f`, texto em **marfim claro (`#fffaf0`)**, `font-weight: 600` e `border-radius: 7px`. | Substituir qualquer botão amarelo (`.btn-warning` / `#fbbc04`) pelo botão verde-oliva oficial (`background-color: #5d603d !important; color: #fffaf0 !important;`) em todas as páginas. |
| **5. Contraste de Fundos, Cards e Inputs** | Alguns fundos ficaram claros demais ou sem contraste com o texto. | Fundo esquerdo editorial `#f4eddb`, fundo direito/geral `#fbf6e9` / `#f5efdf`, cards e inputs em marfim `#fffaf0` com bordas nítidas (`#d2c2a9` nos cards e `#9fa39f` nos inputs). | Restaurar exatamente a tabela de variáveis CSS do estilo de `21/10`, mantendo intacto o grid e o alinhamento responsivo do Plano 6. |

---

## 2. Mapa de Execução dos 4 Prompts do Plano 7

| Ordem | Etapa do Plano 7 | O que Faz | Arquivos Alvo | Consumo |
| :---: | :--- | :--- | :--- | :---: |
| **Prompt 01** | Etapa 1: Restauração Global das Fontes (`Newsreader` 400 + `DM Sans`) e Paleta de Cores Original no CSS | Restaura no CSS global as fontes exatas (`Newsreader` peso 400 + `DM Sans`) e as cores originais das fotos de 21/10 (`#f4eddb`, `#fbf6e9`, `#fffaf0`, `#542817`, `#6e6252`, `#bd7627`, `#5d603d`), eliminando textos brancos invisíveis e botões amarelos. | `public/assets/css/global/elements.css`, `public/assets/css/global.css`, `public/assets/css/painel.css` | Baixo |
| **Prompt 02** | Etapa 2: Restauração Visual da `index.html` e `login.html` (Fiéis às Fotos de 21/10 + Alinhamento Novo) | Corrige a `index.html` (onde o texto estava branco invisível e o botão amarelo na foto de 23/10) e garante que `login.html` mantenha exatamente o visual das fotos de 21/10 com o novo alinhamento. | `public/index.html`, `public/pages/login.html` | Médio |
| **Prompt 03** | Etapa 3: Aplicação das Fontes e Cores Originais em `painel.html`, `plantio.html` e `assistente-ia.html` | Aplica a tipografia `Newsreader` 400 + `DM Sans` e o alto contraste legível (`#542817` / `#6e6252` sobre `#fffaf0` / `#f4eddb`) nas páginas principais sem alterar o alinhamento do Plano 6. | `public/pages/painel.html`, `public/pages/plantio.html`, `public/pages/assistente-ia.html` | Médio |
| **Prompt 04** | Etapa 4: Padronização Tipográfica e de Cores em `menu.js`, `perfil.html`, `reservatorios.html`, `comunidade.html` e `admin.html` | Conclui a restauração das fontes e cores originais na gaveta retrátil (`menu.js`) e nas 4 páginas restantes, mantendo todos os alinhamentos perfeitos. | `public/assets/js/menu.js`, `public/pages/perfil.html`, `reservatorios.html`, `comunidade.html`, `admin.html` | Médio |

---

## 3. Prompts Sequenciais Prontos para Copiar e Colar no Google AI Studio

### Prompt 01 — Etapa 1: Restauração Global das Fontes (`Newsreader` Regular 400 + `DM Sans`) e das Cores Originais no CSS

> **Quando usar:** Primeiro passo do Plano 7. Restaura imediatamente a família tipográfica original (`Newsreader` com peso 400 sem negrito exagerado + `DM Sans`) e as cores de alto contraste das capturas de 21/10, proibindo texto claro sobre fundo areia e botões amarelos, enquanto preserva 100% das regras de alinhamento do Plano 6.

```text
Atue como Designer Sênior de UI/Tipografia e Especialista em CSS. Vamos iniciar o PLANO 7 (Etapa 1): restaurar fielmente a estilização de letras (tipografia) e a paleta de cores anterior do projeto, mantendo intacto todo o novo alinhamento responsivo implementado no Plano 6.

REGRA DE ESCOPO (ECONOMIA DE TOKENS):
- Edite APENAS `public/assets/css/global/elements.css`, `public/assets/css/global.css` e `public/assets/css/painel.css`.
- NÃO altere o alinhamento de grids, colunas ou flexbox já ajustados no Plano 6.

CORREÇÕES OBRIGATÓRIAS DE FONTES E CORES:
1. Importação e Aplicação Fiel das Fontes Originais (`Newsreader` + `DM Sans`):
   - No topo de `elements.css` e `global.css`, garanta o `@import`:
     `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&display=swap');`
   - **Títulos (`h1, h2, .auth-story h1, .auth-panel h2, .serif-heading`)**:
     * Use obrigatoriamente `font-family: "Newsreader", Georgia, serif !important;`.
     * **PESO DA FONTE (`font-weight`)**: nos títulos editoriais (`h1`, `h2`), use **`font-weight: 400 !important`** (ou `500` em subtítulos `h3`), NUNCA `700` ou `800`! O charme do estilo anterior está no traço fino e elegante da `Newsreader` regular (`400`) com `letter-spacing: -0.02em; line-height: 1.08;` e `color: #542817;`.
     * Para trechos em itálico dentro de títulos (`h1 em, h2 em, .text-ochre-italic`): aplique `font-family: "Newsreader", Georgia, serif !important; font-style: italic !important; font-weight: 400 !important; color: #bd7627 !important;`.
   - **Corpo de Texto, Rótulos, Inputs, Abas e Botões (`body, p, span, li, label, input, select, textarea, button, .btn`)**:
     * Use obrigatoriamente `font-family: "DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;`.
2. Restauração Exata da Paleta de Cores Anterior e Correção de Contraste (Fim do Texto Branco Invisível na Foto de 23/10):
   - Defina no `:root` e `[data-theme="claro"]`:
     * `--paper` / `--cor-fundo`: `#f5efdf` (fundo geral areia suave)
     * `--story-bg`: `#f4eddb` (fundo quente de painéis editoriais e hero)
     * `--panel-bg`: `#fbf6e9` (fundo creme de áreas de formulário)
     * `--surface` / `--cor-superficie`: `#fffaf0` (fundo marfim de todos os cards, caixas internas, inputs e selects)
     * `--ink` / `--cor-primaria` / `--cor-texto`: `#542817` (marrom-terra escuro para títulos, nomes e textos principais)
     * `--muted` / `--cor-texto-suave`: `#6e6252` (marrom-taupe médio-escuro para parágrafos explicativos — alto contraste e leitura confortável sobre `#f4eddb`, `#f5efdf` e `#fffaf0`!)
     * `--green` / `--cor-secundaria`: `#5d603d` (verde-oliva profundo da Caatinga para botões principais e destaques ativos)
     * `--green-hover` / `--cor-secundaria-hover`: `#484b2f`
     * `--ochre` / `--sun`: `#bd7627` (ocre dourado para itálicos de destaque e ícone solar `✳`)
     * `--line` / `--cor-borda`: `#d2c2a9` (borda suave de cards e divisórias)
     * `--input-border`: `#9fa39f` (borda nítida de inputs e selects, idêntica às fotos de 21/10)
     * `--tab-track`: `#eeefeb` (fundo cinza-areia claro da barra de abas segmentadas)
   - **CORREÇÃO CRÍTICA CONTRA TEXTO BRANCO OU AMARELO-CLARO EM FUNDO CLARO**:
     * Em `global.css` e `elements.css`, remova qualquer regra `.hero { color: #fff }` ou `.hero p { color: rgba(255,255,255,...) }` que estava deixando o texto branco invisível sobre o fundo areia no tema claro!
     * No tema padrão (`:root`, `body:not([data-theme="escuro"]):not([data-theme="baixa-visao"])`), force que qualquer `.hero`, `.hero-commercial`, `.auth-story`, `.card` ou `<section>` tenha títulos em `#542817`, parágrafos em `#6e6252` e `.eyebrow` em `#4e5944` / `#5d603d` (`font-size: 0.72rem; font-weight: 700; letter-spacing: 0.11em; text-transform: uppercase;`).
3. Botões Principais no Verde-Oliva `#5d603d` (Fim do Botão Amarelo Berrante):
   - Estilize `.btn-primary, .btn-success, .button-primary, .btn-cta-hero` com:
     `background-color: #5d603d !important; border-color: #5d603d !important; color: #fffaf0 !important; font-family: "DM Sans", sans-serif !important; font-weight: 600 !important; border-radius: 7px !important;` (e `:hover` em `#484b2f !important`).
   - Estilize botões secundários (`.btn-outline-primary, .btn-outline-secondary, .button-secondary`) com:
     `background-color: #fffaf0 !important; border: 1px solid #d2c2a9 !important; color: #542817 !important; font-weight: 600 !important; border-radius: 7px !important;`.
```

---

### Prompt 02 — Etapa 2: Restauração do Estilo Original na `public/index.html` e `public/pages/login.html` (Mantendo o Novo Alinhamento)

> **Quando usar:** Segundo passo. Corrige diretamente a `public/index.html` (que apareceu na foto de 23/10 com parágrafo branco ilegível, selo apagado, fonte grossa sem o itálico ocre e botão amarelo) e garante que `public/pages/login.html` fique 100% idêntica às duas fotos de referência de 21/10 mantendo o alinhamento responsivo.

```text
Atue como Engenheiro Frontend Sênior. Vamos executar a Etapa 2 do Plano 7: aplicar a tipografia (`Newsreader` 400 + `DM Sans`) e as cores originais aprovadas em `public/index.html` e `public/pages/login.html`, mantendo todo o alinhamento responsivo do Plano 6.

REGRA DE ESCOPO (ECONOMIA DE TOKENS):
- Edite APENAS `public/index.html` e `public/pages/login.html`.
- Mantenha o alinhamento dos cards (ilustração no topo e texto em 100% da largura) e a lista das 283 cidades do Semiárido Baiano já implementados no Plano 6.

CORREÇÕES OBRIGATÓRIAS:
1. Em `public/index.html` (Correção Direta da Foto `Captura de tela 2026-10-23 111447.png`):
   - Inclua no `<head>` o link das fontes Google (`Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400` e `DM+Sans:wght@400;500;600;700`).
   - **No Bloco Principal de Boas-Vindas (Hero)**:
     * Fundo em areia quente (`background-color: #f4eddb; border: 1px solid #d2c2a9; border-radius: 12px;`).
     * **Selo superior (`.eyebrow`)**: texto `"TERRA, TEMPO E CUIDADO · SEMIÁRIDO BAIANO"` em **verde-oliva escuro nítido (`color: #4e5944 !important; font-family: 'DM Sans', sans-serif; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.11em; text-transform: uppercase;`)** — NUNCA em amarelo-claro ou branco!
     * **Título Principal (`<h1>`)**: escrito em duas linhas com a fonte **`Newsreader` regular (`font-weight: 400`, sem negrito pesado!)**:
       ```html
       <h1 style="font-family: 'Newsreader', Georgia, serif; font-weight: 400; color: #542817; font-size: clamp(2.4rem, 4.5vw, 3.6rem); line-height: 1.06; letter-spacing: -0.02em; margin-bottom: 1.1rem;">
         O seu lugar.<br>
         <em style="font-style: italic; font-weight: 400; color: #bd7627;">O tempo de plantar.</em>
       </h1>
       ```
     * **Parágrafo Descritivo (`<p>`)**: escrito em **`DM Sans`** com cor **marrom-taupe escura perfeitamente legível (`color: #6e6252 !important; font-size: 1.05rem; line-height: 1.6; font-weight: 400;`)** — NUNCA em branco (`#fff`)!
     * **Botões de Ação (Alinhados lado a lado no Desktop/Tablet e 100% no Mobile)**:
       - Botão 1: **`"Entrar na minha conta →"`** no **verde-oliva oficial (`background-color: #5d603d; color: #fffaf0; border: 1px solid #5d603d; border-radius: 7px; padding: 0.75rem 1.5rem; font-family: 'DM Sans', sans-serif; font-weight: 600;`)** — remova totalmente aquele botão amarelo (`#fbbc04` / `.btn-warning`)!
       - Botão 2: **`"Criar meu cadastro"`** em marfim (`background-color: #fffaf0; color: #542817; border: 1px solid #d2c2a9; border-radius: 7px; padding: 0.75rem 1.5rem; font-family: 'DM Sans', sans-serif; font-weight: 600;`).
   - **Nos 3 Cards Ilustrados (`Condição Favorável`, `Atenção às Chuvas`, `Reserva da Cisterna`)**:
     * Mantenha o excelente alinhamento vertical do Plano 6 (ilustração no topo ocupando `100%` da largura + título e texto abaixo ocupando `100%` da largura), estilizando o card com `background-color: #fffaf0; border: 1px solid #d2c2a9; border-radius: 9px;`, títulos em `Newsreader` (`color: #542817; font-weight: 500;`) e parágrafos em `DM Sans` (`color: #6e6252;`).
2. Em `public/pages/login.html` (Fidelidade Total às Fotos `150641.png` e `150720.png`):
   - Confirme que a página mantém o layout Split-Screen `.auth-shell` exatamente com as fontes e cores das fotos de 21/10:
     * Coluna esquerda (`.auth-story` em `#f4eddb`): Logo `/assets/images/logo.png` centralizado num quadro suave, eyebrow `"TERRA, TEMPO E CUIDADO"` (`#4e5944`), título `<h1>O seu lugar.<br><em>O tempo de plantar.</em></h1>` em `Newsreader` `font-weight: 400` (`#542817` e itálico em `#bd7627`), parágrafo em `DM Sans` (`#6e6252`) e rodapé `"✳ Feito para quem cultiva no semiárido."`.
     * Coluna direita (`.auth-panel` em `#fbf6e9`): seletor segmentado `.auth-tabs` (`#eeefeb` com borda `#d2c2a9` e aba ativa `#fffaf0`), eyebrow `"BEM-VINDO DE VOLTA"`, título `<h2>Entre na sua conta</h2>` em `Newsreader` `font-weight: 400` (`#542817`), subtítulo `"Acesse o painel da sua comunidade."` (`#6e6252`), inputs em `#fffaf0` com borda `#9fa39f` e botão **`"Entrar →"`** em verde-oliva `#5d603d` com texto `#fffaf0` — preservando o alinhamento do seletor das 283 cidades do Semiárido Baiano + botão `"📍 Minha localização"` na aba de cadastro.
```

---

### Prompt 03 — Etapa 3: Restauração das Fontes e Cores Originais em `painel.html`, `plantio.html` e `assistente-ia.html` (Mantendo o Novo Alinhamento)

> **Quando usar:** Terceiro passo. Aplica a tipografia `Newsreader` 400 + `DM Sans` e a paleta de alto contraste (`#542817`, `#6e6252`, `#bd7627`, `#5d603d`, `#fffaf0`, `#f4eddb`) nas páginas `painel.html`, `plantio.html` e `assistente-ia.html`, mantendo intocado todo o alinhamento de cards, badges e botões conquistado no Plano 6.

```text
Atue como Engenheiro Frontend Sênior. Vamos executar a Etapa 3 do Plano 7: aplicar a tipografia original (`Newsreader` peso 400 para títulos + `DM Sans` para textos e controles) e a paleta de cores legível de 21/10 nas páginas `public/pages/painel.html`, `public/pages/plantio.html` e `public/pages/assistente-ia.html`, mantendo 100% do alinhamento estrutural do Plano 6.

REGRA DE ESCOPO (ECONOMIA DE TOKENS):
- Edite APENAS `public/pages/painel.html`, `public/pages/plantio.html` e `public/pages/assistente-ia.html`.
- NÃO altere a disposição das colunas Bootstrap (`row`, `col-*`, `align-items-stretch`, `mt-auto`) que já deixou tudo bem alinhado no Plano 6.

AJUSTES DE TIPOGRAFIA E CORES NAS 3 PÁGINAS:
1. Inclusão das Fontes Google no `<head>` das 3 páginas:
   - Garanta a presença do link para `Newsreader` (`wght@400;500` + `ital@1`) e `DM Sans` (`wght@400;500;600;700`).
2. Cabeçalhos e Títulos de Seção/Cards:
   - Todos os títulos principais (`h1`, `h2`) devem usar `font-family: 'Newsreader', Georgia, serif; font-weight: 400; color: #542817;` (sem negrito pesado), podendo destacar palavras-chave em `<em style="color: #bd7627; font-style: italic;">`.
   - Todos os subtítulos superior (`.eyebrow`) devem usar `font-family: 'DM Sans', sans-serif; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.11em; text-transform: uppercase; color: #5d603d;`.
   - Todos os parágrafos descritivos e textos de apoio devem usar `font-family: 'DM Sans', sans-serif; color: #6e6252; line-height: 1.55;` sobre superfícies `#fffaf0` ou `#f4eddb` — garantindo contraste nítido e confortável para leitura!
3. Botões, Badges e Bordas:
   - Substitua qualquer cor amarela forte, texto branco sobre fundo claro ou verde-azulado estranho pelos tons originais:
     * Botões de ação principal (`Salvar`, `Enviar →`, `Atualizar`): fundo verde-oliva `#5d603d` e texto `#fffaf0`.
     * Botões secundários (`🎤 Falar`, `🔊 Ouvir orientação`, `🌾 Gerenciar Minhas Roças`): fundo marfim `#fffaf0`, borda `#d2c2a9` e texto marrom-terra `#542817`.
     * Badges de status nos cards de plantio e temperatura:
       - Favorável / Amenas: fundo `#e9efe2`, borda `#b8c7a6`, texto `#3e4a26` (verde-oliva suave e legível).
       - Atenção / Aguardar chuva: fundo `#f7ecda`, borda `#dfc298`, texto `#7d4e14` (ocre terroso legível).
       - Quentes / Alerta: fundo `#f9e5dc`, borda `#e2b4a0`, texto `#8c3719` (terracota legível).
```

---

### Prompt 04 — Etapa 4: Padronização Final de Fontes e Cores em `menu.js`, `perfil.html`, `reservatorios.html`, `comunidade.html` e `admin.html`

> **Quando usar:** Quarto e último passo do Plano 7. Garante que a barra superior com o botão `☰ Menu`, a gaveta retrátil (`menu.js`) e as páginas `perfil.html`, `reservatorios.html`, `comunidade.html` e `admin.html` utilizem exatamente a mesma tipografia (`Newsreader` 400 + `DM Sans`) e paleta de cores original de 21/10, mantendo todos os alinhamentos do Plano 6.

```text
Atue como Engenheiro Frontend Sênior. Vamos concluir o Plano 7 (Etapa 4): padronizar a tipografia original (`Newsreader` 400 + `DM Sans`) e a paleta de cores de alta legibilidade em `public/assets/js/menu.js`, `public/pages/perfil.html`, `public/pages/reservatorios.html`, `public/pages/comunidade.html` e `public/pages/admin.html`, preservando todos os alinhamentos do Plano 6.

REGRA DE ESCOPO (ECONOMIA DE TOKENS):
- Edite APENAS `public/assets/js/menu.js`, `public/pages/perfil.html`, `public/pages/reservatorios.html`, `public/pages/comunidade.html` e `public/pages/admin.html`.

AJUSTES OBRIGATÓRIOS:
1. Em `public/assets/js/menu.js` (Barra Superior e Gaveta Retrátil):
   - Mantenha a gaveta retrátil alinhada do Plano 6 (os 3 botões de tema na mesma linha, botão de ouvir retangular, seletor de velocidade completo e fechamento automático da gaveta antes de abrir o modal de sair).
   - Aplique as cores e fontes originais:
     * Barra superior (`.app-topbar`): fundo `#f4eddb`, borda inferior `#d2c2a9`, nome `"Manejo Caatingueiro"` em `Newsreader` (`font-weight: 500; color: #542817; font-size: 1.15rem;`), botão **`☰ Menu`** em `#fffaf0` com borda `#d2c2a9` e texto `#542817` (`DM Sans`, `font-weight: 600`).
     * Gaveta lateral (`.app-sidebar-nav`): fundo `#f4eddb`, cards internos em `#fffaf0` com borda `#d2c2a9`, links em `DM Sans` `#542817` e item ativo da página em verde-oliva `#5d603d` com texto `#fffaf0`.
2. Nas 4 páginas (`perfil.html`, `reservatorios.html`, `comunidade.html`, `admin.html`):
   - Garanta a importação das fontes `Newsreader` (`400;500`) e `DM Sans` (`400;500;600;700`) no `<head>`.
   - Aplique `Newsreader` (`font-weight: 400`, cor `#542817`, com destaques opcionais em itálico ocre `#bd7627`) nos títulos `h1` e `h2`, e `DM Sans` (`#542817` para labels/valores e `#6e6252` para descrições) em todo o restante.
   - Certifique-se de que nenhum texto fique claro/branco sobre fundo areia ou marfim e que todos os botões principais usem o verde-oliva `#5d603d` com texto `#fffaf0`, mantendo intacto o alinhamento responsivo de todos os formulários, abas e tabelas.
```
