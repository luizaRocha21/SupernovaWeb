# Documentação Técnica e Funcional — Manejo Caatingueiro (SupernovaWeb)

**Território de Identidade de Irecê · Bahia · IFBA Campus Irecê · Grupo Garimpeiros**

---

## 1. Visão Geral do Projeto

O **Manejo Caatingueiro** é uma plataforma web progressiva (PWA) offline-first de inteligência agroclimática comunitária e segurança hídrica desenvolvida para agricultores familiares, lideranças comunitárias e gestores públicos do Semiárido Baiano (Irecê, Presidente Dutra e povoados).

O sistema respeita o **Princípio de Autonomia do Agricultor (RN12)**: *"Informação para apoiar, nunca para determinar"*.

---

## 2. Principais Funcionalidades e Integrações Implementadas

### 2.1. Integração Oficial com a API do INMET + Atualização Automática
- **Estações Meteorológicas em Tempo Real (`GET /api/v1/inmet/estacoes`)**:
  -Monitoramento automático da **Estação Automática INMET A424 (Irecê - BA)** (`-11.3286°, -41.8650°`, altitude `768m`, IBGE `2914604`), **Estação Convencional 83228 (Irecê)** e **Estação Automática A429 (Morro do Chapéu)**, fornecendo dados horários e diários de precipitação, temperatura atual/mínima/máxima, umidade relativa do ar e velocidade do vento.
- **Sincronização Automática Sem Botão Manual**:
  - O servidor executa um agendador automático a cada **5 minutos** e na partida, enquanto o painel no navegador sincroniza automaticamente a cada **60 segundos** e na troca de localidade, mantendo os dados sempre atualizados sem que o agricultor precise apertar nenhum botão.
- **Avisos de Chuva e Tempestades (`GET /api/v1/inmet/avisos`)**:
  - Alertas meteorológicos categorizados nos níveis oficiais do INMET:
    - 🟡 **Amarelo** (Perigo Potencial)
    - 🟠 **Laranja** (Perigo / Severidade Moderada a Alta)
    - 🔴 **Vermelho** (Grande Perigo)
  - Vinculados aos códigos IBGE de **Irecê (`2914604`)** e **Presidente Dutra (`2925709`)**.
- **Alertas Gratuitos por SMS da Defesa Civil (`40199`)**:
  - Módulo integrado (`POST /api/v1/inmet/defesa-civil/sms`) orientando e vinculando o CEP da localidade (`44900-000` para Irecê / `44930-000` para Presidente Dutra) ao serviço gratuito `40199` da Defesa Civil Nacional.

### 2.2. Localização Atual do Usuário via GPS
- O usuário pode clicar em **"📍 Usar minha localização atual"** (tanto no Painel Principal quanto no formulário de Cadastro) ou selecionar a opção de GPS na lista de localidades.
- O endpoint `GET /api/v1/localidades/proxima?lat=...&lon=...` calcula a distância geodésica (fórmula de Haversine) até os municípios/povoados monitorados ou cria dinamicamente um ponto de monitoramento nas coordenadas GPS exatas da roça do agricultor.

### 2.3. Autenticação Google (OAuth 2.0 e OpenID Connect) + Validação Real de E-mail
- **Login e Cadastro com Conta do Google**:
  - Implementado segundo o padrão **OAuth 2.0 + OpenID Connect (OIDC)** (`GET /api/v1/auth/google/url`, `GET /api/v1/auth/google/callback` e `POST /api/v1/auth/google`), com proteção `state` (anti-CSRF) e `nonce` (anti-replay).
- **Validação Real de E-mail (`POST /api/v1/auth/email/enviar-codigo` e `POST /api/v1/auth/email/verificar-codigo`)**:
  - Dispara um e-mail real de confirmação via protocolo **SMTP (Nodemailer)** contendo o código numérico de 6 dígitos (OTP) e o link direto de validação. Suporta SMTP de produção (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`) e provisionamento automático de caixa de entrada Webmail real (Ethereal SMTP) para verificação imediata.

### 2.4. Persistência Offline Reforçada (IndexedDB + LocalStorage + Service Worker PWA)
- **Service Worker (`/sw.js`) e Web App Manifest (`/manifest.json`)**:
  - Armazena todas as páginas, folhas de estilo, scripts, ícones e respostas de leitura da API para funcionamento mesmo sem internet na zona rural.
- **Banco de Dados Local Duplo (`IndexedDB` + `localStorage`)**:
  - Todos os registros criados sem sinal de internet (precipitações de pluviômetro, níveis de poço/cisterna, checklists sanitários, avisos no mural comunitário e calibragem de limiares de culturas) são gravados localmente com atualização visual imediata e sincronizados em lote de forma idempotente (`POST /api/v1/sync/registros`) assim que a conexão retorna.

### 2.5. Acessibilidade Visual (Claro, Escuro, Daltônico e Baixa Visão / Idosos)
- **☀️ Modo Claro (Atual)**: Paleta orgânica inspirada na Caatinga (`#f4f5ed`, `#173d2c`, `#286947`).
- **🌙 Modo Escuro**: Fundo escuro de alto conforto luminoso (`#0e1711`, `#17251c`, `#eef3ec`) com contraste WCAG AAA.
- **👁️ Modo Daltônico (Paleta Universal Okabe-Ito)**: Substitui a distinção verde/vermelho por **Azul Cobalto (`#005ab5`)**, **Âmbar (`#d55e00`)** e **Magenta Escuro (`#ad1457`)**, acompanhados de símbolos explícitos (`✓`, `⚠`, `⛔`).
- **🔍 Modo Baixa Visão e Idosos + Escala de Fonte (`A-`, `A`, `A+`, `A++`)**: Permite ampliar todas as letras em até **130%**, engrossar bordas (`2px solid`), aumentar áreas de toque (`52px+`) e ampliar o espaçamento entre linhas.

### 2.6. Leitura da Página em Voz Humana (Google Cloud Text-to-Speech API + Síntese pt-BR)
- Pensado para pequenos agricultores idosos ou com baixa escolaridade, a barra superior traz os botões **"🔊 Ouvir Página"** e **"🌾 Ouvir Resumo da Roça"**.
- Conecta-se ao endpoint `POST /api/v1/tts/sintetizar` integrado à **Google Cloud Text-to-Speech API** (`pt-BR-Neural2-B`, `pt-BR-Neural2-C`, `pt-BR-Wavenet-A`) / Gemini TTS e síntese nativa `pt-BR` offline, permitindo ajustar:
  - **Velocidade da leitura** (`0.75x Pausada para Idosos` a `1.25x Rápida`)
  - **Volume** (`20%` a `100%`)
  - **Entonação / Tom da Voz** (`Grave`, `Natural`, `Aguda`)
