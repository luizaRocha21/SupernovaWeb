# 🌵 Manejo Caatingueiro (`supernovaweb`)

Plataforma web de convivência com o Semiárido Baiano, segurança hídrica familiar e comunitária, orientação de plantio e assistente da roça com acessibilidade por voz (`pt-BR`).

---

## 🎨 Design Editorial Sertanejo, 3 Plataformas & Acessibilidade Rural

A interface foi projetada com a identidade visual **Editorial Sertanejo**, unindo **Bootstrap 5.3** a uma estética acolhedora inspirada na Caatinga e adaptada para **3 plataformas distintas**:

1. **Mobile (`< 768px`)**: Layout em 1 coluna, botões de toque amplos (`min-height: 44px`), leitura fluida em campo e abas compactas.
2. **Tablet (`768px – 1024px`)**: Layout balanceado em 2 colunas (`col-md-6`), aproveitando a largura intermediária para comparar dados de chuva e cisternas.
3. **Desktop Widescreen (`>= 1025px`)**: Containers amplos (`max-width: 1280px`), vitrine comercial em duas colunas para visitantes e painel de trabalho estruturado em abas e grades de 3 a 4 colunas para produtores e gestores.

### Paleta e Tipografia
- **Paleta Terrosa Quente & Papel de Algodão**:
  - Fundo principal: `#f5efdf` / `#f4eddb` | Superfícies: `#fbf6e9` / `#fffaf0`
  - Tipografia principal: `#1e1b18` | Tipografia secundária: `#4a3b2c`
  - Destaques: Terracota (`#542817`), Ocre Solar (`#d97706`), Verde Mandacaru (`#2d6a4f`) e Azul Cisterna (`#1d4ed8`).
- **Tipografia Editorial**: Títulos em **Fraunces** (serifada com personalidade) e corpo em **Source Sans 3** de alta legibilidade.
- **Barra Superior Clean com Ícones Intuitivos**:
  - `☀️` / `🌙` Botão único que alterna entre **Sertão Claro** e **Sertão Escuro**.
  - `👁️` **Alto Contraste** (Fundo preto `#000000` e destaque amarelo `#ffd60a` para leitura sob sol forte).
  - `🎨` **Modo Daltônico** (Paleta segura Okabe-Ito).
  - `A+` Alternador de tamanho de letra (`Normal` ↔ `Grande` ↔ `Extra Grande`).
  - `🔊` Leitor de resumo da página em voz alta (`Web Speech API` `speechSynthesis` em `pt-BR`) e `🎤` ditado por voz (`SpeechRecognition`).

---

## 🌦️ Integração Climática e Radar Meteorológico da Bahia

O sistema combina dados da **Open-Meteo**, **INMET** e da **API Pública do Radar Meteorológico (`https://radarmeteorologico.com.br/api/v1`)** com botão **`📍 Minha localização`** (que atualiza imediatamente o `<select>` para a cidade baiana mais próxima via GPS + Haversine) e cache inteligente em `localStorage`:

| Recurso | Endpoint Público (Radar) | Rota Backend (Fallback / Proxy) | Cache Front-End |
| :--- | :--- | :--- | :--- |
| **Alertas INMET (Bahia)** | `GET /api/v1/alertas?uf=BA&codigo_ibge=...` | `GET /api/v1/clima/alertas` | **10 minutos** |
| **Temperaturas de Hoje** | `GET /api/v1/temperaturas?limite=5` | `GET /api/v1/clima/temperaturas` | **1 hora** |
| **Cidades da Bahia (IBGE)** | `GET /api/v1/cidades?uf=BA` | `GET /api/v1/clima/cidades` | **24 horas** |
| **Diagnóstico de Plantio** | Open-Meteo + Pluviômetro Local | `GET /api/v1/clima/diagnostico` | Tempo real |

---

## 🏛️ Arquitetura Limpa do Repositório

O projeto segue uma árvore de diretórios enxuta, sem pastas duplicadas:

```text
├── public/                        # Frontend Oficial (Servido na raiz)
│   ├── index.html                 # Vitrine Comercial (Visitante) + Painel em Abas (Logado)
│   ├── manifest.json              # Manifesto PWA e funcionamento offline
│   ├── sw.js                      # Service Worker
│   ├── assets/
│   │   ├── css/
│   │   │   ├── global/elements.css # Tokens Editoriais Sertanejos + 3 Plataformas + 4 Temas
│   │   │   ├── global.css         # Folha de estilo global
│   │   │   └── painel.css         # Estilos operacionais dos cards e painéis
│   │   └── js/
│   │       ├── menu.js            # Sessão unificada + Barra de temas/voz por ícones
│   │       ├── acessibilidade-voz.js # Motor Web Speech API (TTS 🔊 + STT 🎤)
│   │       ├── clima-dinamico.js  # Cliente window.MC_Radar + GPS no <select>
│   │       └── app.js             # Controlador principal da Vitrine e do Painel em Abas
│   └── pages/
│       ├── login.html             # Autenticação unificada em abas + redirecionamento se logado
│       ├── plantio.html           # Orientação para o Plantio + Checklist de solo
│       ├── reservatorios.html     # 2 Abas: Minha Cisterna ou Poço + Água na Comunidade
│       ├── comunidade.html        # 2 Abas: Mural de Sementes + Alertas de Clima e Temperaturas
│       ├── assistente-ia.html     # Assistente da Sua Roça (2 colunas no Desktop + Voz)
│       └── admin.html             # Gestão de Cadastros (3 cards de resumo + Tabela CRUD)
├── src/                           # Backend TypeScript / Express em Camadas
│   ├── config/                    # Banco de dados (Supabase / SQLite Fallback) e constantes
│   ├── controllers/               # Auth, Clima, IA, Localidade, Monitoramento, Reservatorio, Usuario
│   ├── middlewares/               # Autenticação JWT (Bearer) e RBAC
│   ├── models/                    # Interfaces e tipos de domínio
│   ├── repositories/              # Persistência híbrida (Supabase PostgreSQL + SQLite)
│   ├── routes/                    # Roteador central REST (/api/v1/*)
│   └── services/                  # Lógica de negócio agronômica, hídrica, clima e IA
├── supabase/
│   └── schema.sql                 # Script DDL PostgreSQL / Supabase
├── scripts/
│   └── code-agent.js              # Auditoria automatizada da arquitetura e rotas
└── server.ts                      # Ponto de entrada do servidor Express (Porta 3000)
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
Verifica a estrutura em camadas, a existência das páginas oficiais em `public/` e a proteção anti-XSS (`escapeHtml`):
```bash
npm run agent
```

### 4. Compilar para Produção
```bash
npm run build
npm start
```
