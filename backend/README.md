# Manejo Caatingueiro — Backend API

Backend da ferramenta consultiva **Manejo Caatingueiro** preparado para deploy no **Render.com**.

## Estrutura deste repositório
```
.
├── server.js            → Servidor com todos os endpoints (/api/v1/*), JWT, Open-Meteo e monitor comunitário
├── package.json         → Configuração de dependências (Express, CORS, JWT, bcryptjs)
├── Dockerfile           → Suporte opcional a deploy via container Docker
├── render.yaml          → Blueprint de configuração automática no Render
├── .env.example         → Exemplo de variáveis de ambiente
└── supabase/
    └── schema.sql       → Script SQL para executar no Supabase (PostgreSQL)
```

## Como rodar localmente
```bash
npm install
node server.js
```

## Como configurar no Render
- **Build Command:** `npm install`
- **Start Command:** `node server.js`
- **Environment:** `Node` ou `Docker`
- **Variáveis de Ambiente:**
  - `PORT`: `10000`
  - `JWT_SECRET`: Uma chave secreta de 32 caracteres
  - `ALLOWED_ORIGINS`: URL da sua Vercel (ex: `https://supernovaweb.vercel.app`)
