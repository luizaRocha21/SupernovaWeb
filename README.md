# 🌵 Manejo Caatingueiro (`supernovaweb`)

Plataforma web de convivência com o Semiárido Baiano, segurança hídrica familiar e comunitária, orientação de plantio e assistente da roça com acessibilidade por voz (`pt-BR`).

---

## 🎨 Design Editorial Sertanejo, 3 Plataformas & Acessibilidade Rural

A interface foi projetada com a identidade visual **Editorial Sertanejo**, unindo **Bootstrap 5.3** a uma estética acolhedora inspirada na Caatinga e adaptada para **3 plataformas distintas**:

1. **Mobile (`< 768px`)**: Layout em 1 coluna, botões de toque amplos (`min-height: 44px`), leitura fluida em campo e abas compactas.
2. **Tablet (`768px – 1024px`)**: Layout balanceado em 2 colunas (`col-md-6`), aproveitando a largura intermediária para comparar dados de chuva e cisternas.
3. **Desktop Widescreen (`>= 1025px`)**: Containers amplos (`max-width: 1280px`), vitrine editorial com medalhões circulares em xilogravura sertaneja para visitantes e painel de trabalho estruturado com gráficos e medidores visuais para produtores e gestores.

### Paleta e Tipografia
- **Paleta Terrosa Quente & Papel de Algodão**:
  - Fundo principal: `#f4eddb` | Superfícies: `#fffaf0`
  - Tipografia principal: `#362218` | Tipografia secundária: `#5e4736`
  - Destaques: Marrom-Terra (`#542817`), Ocre Solar (`#bd7627`), Verde-Oliva Mandacaru (`#5d603d`), Terracota (`#a64f2e`) e Azul-Água Cisterna (`#7ba39b`).
- **Tipografia Editorial**: Títulos em **Newsreader** (peso 400 editorial) e corpo em **DM Sans** de alta legibilidade.
- **Barra Superior Clean com Ícones Intuitivos**:
  - `☀️` / `🌙` Botão único que alterna entre **Sertão Claro** e **Sertão Escuro**.
  - `👁️` **Alto Contraste** (Fundo preto `#000000` e destaque amarelo `#ffd60a` para leitura sob sol forte).
  - `🎨` **Modo Daltônico** (Paleta segura Okabe-Ito).
  - `A+` Alternador de tamanho de letra (`Normal` ↔ `Grande` ↔ `Extra Grande`).
  - `🔊` Leitor de resumo da página em voz alta (`Web Speech API` `speechSynthesis` em `pt-BR`) e `🎤` ditado por voz (`SpeechRecognition`).

---

## 🔥 Banco de Dados Google Firebase (Cloud Firestore)

O backend utiliza o **Google Firebase (`firebase-admin` / Cloud Firestore)** gerenciado pelo singleton `src/infrastructure/database/FirebaseClient.ts`, contando com espelhamento automático em memória (fallback transparente caso as credenciais ainda não estejam preenchidas no `.env`) e **Auto-Seed** na inicialização.

### As 8 Coleções Oficiais do Cloud Firestore (`FIREBASE_COLLECTIONS`)

| Coleção | Descrição | Exemplo de Chave / Documento |
| :--- | :--- | :--- |
| **`usuarios`** | Cadastro de agricultores familiares, lideranças comunitárias e gestores públicos. | `id` (`1`, `2`, ...) |
| **`rocas`** | Propriedades rurais vinculadas a cada agricultor com coordenadas GPS fixas no mapa (`Leaflet`). | `id` (`1`, `2`, ...) |
| **`localidades`** | Catálogo dos municípios e povoados do Semiárido Baiano com coordenadas e estação INMET. | `id` (`1` = Irecê, `2` = Presidente Dutra) |
| **`culturas`** | Referências agroclimáticas das culturas adaptadas à Caatinga (Milho, Mamona, Feijão-Caupi, Sorgo). | `id` (`1` a `4`) |
| **`limiares_plantio`** | Limiares de chuva mínima (`mm`) calibrados por agricultor e cultura. | `{usuarioId}_{culturaId}` |
| **`precipitacoes`** | Registros de chuva em milímetros (`mm`) anotados no pluviômetro da roça ou estação. | `id` (`1`, `2`, ...) |
| **`reservatorios`** | Cisternas de placa, cisternas calçadão e poços com histórico de nível (`%`) e checklist sanitário. | `id` (`1`, `2`, ...) |
| **`comunidade_avisos`** | Mural comunitário para avisos rurais, mutirões, alertas e trocas de sementes crioulas. | `id` (`1`, `2`, ...) |

### Como Configurar o Firebase Localmente e no Render

1. Acesse o [Firebase Console](https://console.firebase.google.com/), crie ou selecione seu projeto e ative o **Cloud Firestore**.
2. Em **Configurações do Projeto > Contas de serviço**, clique em **Gerar nova chave privada** para baixar o JSON da Service Account.
3. Configure as variáveis de ambiente no arquivo `.env` local ou no painel **Environment** do **Render**:

```env
FIREBASE_PROJECT_ID=seu-projeto-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@seu-projeto-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nSUA_CHAVE_PRIVADA_AQUI\n-----END PRIVATE KEY-----\n"
```

*(Opcionalmente, você também pode informar o JSON completo em uma única variável `FIREBASE_SERVICE_ACCOUNT_JSON`).*

4. As regras de segurança do banco estão documentadas em `firebase/firestore.rules` e o dicionário completo de coleções encontra-se em `firebase/estrutura-colecoes.json`.

---

## 🌦️ Integração Climática e Radar Meteorológico da Bahia

O sistema combina dados da **Open-Meteo**, **INMET** e da **API Pública do Radar Meteorológico (`https://radarmeteorologico.com.br/api/v1`)** com coordenadas fixas por roça cadastrada e cache inteligente:

| Recurso | Endpoint Público (Radar) | Rota Backend (Fallback / Proxy) | Cache Front-End |
| :--- | :--- | :--- | :--- |
| **Alertas INMET (Bahia)** | `GET /api/v1/alertas?uf=BA&codigo_ibge=...` | `GET /api/v1/clima/alertas` | **10 minutos** |
| **Temperaturas de Hoje** | `GET /api/v1/temperaturas?limite=5` | `GET /api/v1/clima/temperaturas` | **1 hora** |
| **Cidades da Bahia (IBGE)** | `GET /api/v1/cidades?uf=BA` | `GET /api/v1/clima/cidades` | **24 horas** |
| **Diagnóstico de Plantio** | Open-Meteo + Pluviômetro Local | `GET /api/v1/clima/diagnostico` | Tempo real |

---

## 🏛️ Arquitetura Limpa do Repositório

```text
├── public/                        # Frontend Oficial (Servido na raiz)
│   ├── index.html                 # Vitrine Editorial com Logo Grande e Medalhões Circulares
│   ├── manifest.json              # Manifesto PWA e funcionamento offline
│   ├── sw.js                      # Service Worker
│   ├── assets/
│   │   ├── css/
│   │   │   ├── global/elements.css # Tokens Editoriais Sertanejos + Responsividade 3 Plataformas
│   │   │   ├── global.css         # Folha de estilo global
│   │   │   └── painel.css         # Estilos dos medalhões, gráficos e medidores visuais
│   │   ├── images/                # Logo oficial e medalhões SVG em estilo xilogravura
│   │   └── js/
│   │       ├── menu.js            # Sessão unificada + Seletor global de Roça Ativa
│   │       ├── acessibilidade-voz.js # Motor Web Speech API (TTS 🔊 + STT 🎤)
│   │       ├── clima-dinamico.js  # Gráficos SVG de chuva, medidor de solo e Radar da Bahia
│   │       └── app.js             # Controlador principal do painel e sincronização offline
│   └── pages/
│       ├── login.html             # Autenticação Split-Screen (.auth-story) + Google OAuth + OTP
│       ├── painel.html            # Painel Hiperlocal com Gráficos de Chuva e Medidor de Solo
│       ├── perfil.html            # Gestão da Conta e Múltiplas Roças com Mapa Interativo (Leaflet)
│       ├── plantio.html           # Barras comparativas de chuva mínima vs. atual + Calendário
│       ├── reservatorios.html     # Medidor visual de nível da cisterna/poço + Evolução
│       ├── comunidade.html        # Mural Comunitário (Firestore) + Barras térmicas da Bahia
│       ├── assistente-ia.html     # Assistente da Roça (Gemini 2.5 Flash + Voz pt-BR)
│       └── admin.html             # Gestão Administrativa de Cadastros (RBAC)
├── src/                           # Backend TypeScript / Express em Camadas
│   ├── infrastructure/
│   │   ├── database/FirebaseClient.ts # Cliente Singleton Cloud Firestore + Espelho em Memória
│   │   ├── exception/             # BusinessException e ApiExceptionHandler
│   │   └── security/              # JwtService e AuthMiddleware
│   └── domain/                    # Domínios: usuario, clima, pluviometro, plantio, reservatorio, comunidade, ia
├── firebase/
│   ├── firestore.rules            # Regras de segurança RBAC do Cloud Firestore
│   └── estrutura-colecoes.json    # Documentação das 8 coleções NoSQL do Firestore
├── scripts/
│   └── code-agent.js              # Auditoria automatizada da arquitetura, segurança e Firebase
└── server.ts                      # Ponto de entrada unificado do servidor Express (Porta 3000)
```

---

## 🚀 Como Executar e Auditar o Projeto

### 1. Instalar dependências
```bash
npm install
```

### 2. Iniciar o servidor em desenvolvimento (Porta 3000)
```bash
npm run dev
```

### 3. Executar o Agente Auditor de Qualidade (`code-agent.js`)
Verifica os arquivos essenciais de Frontend e Backend, as práticas de segurança e as 8 coleções do Cloud Firestore:
```bash
npm run agent
```

### 4. Compilar para Produção
```bash
npm run build
npm start
```
