# 🌵 Manejo Caatingueiro

> **Painel de Chuva Hiperlocal, Diagnóstico Automático da Roça e Assistente de Plantio com IA para a Agricultura Familiar no Semiárido**  
> *Grupo Garimpeiros · IFBA Campus Irecê (Bahia)*

[![Code Health Agent](https://img.shields.io/badge/Code%20Health-100%25-brightgreen)](AGENT.md)
[![Security Skills](https://img.shields.io/badge/Security-Hardened-blue)](DOCUMENTACAO.md)
[![Deploy Vercel](https://img.shields.io/badge/Frontend-Vercel-black)](https://vercel.com)
[![Deploy Render](https://img.shields.io/badge/Backend-Render-46E3B7)](https://render.com)
[![Database Supabase](https://img.shields.io/badge/Database-Supabase%20Postgres-3ECF8E)](https://supabase.com)

---

## 📖 Visão Geral do Projeto

O **Manejo Caatingueiro** é uma plataforma web responsiva (Mobile, Tablet e Desktop) e *offline-first* voltada para apoiar agricultores familiares do Território de Identidade de Irecê e Presidente Dutra (BA) no acompanhamento da chuva, manejo do plantio (Milho, Mamona e Feijão-Caupi) e conservação de água em poços e cisternas.

### Principais Funcionalidades

1. **Clima e Chuva com Atualização Automática**:
   - Integração contínua em segundo plano com estações meteorológicas do **INMET (`A424` Irecê, `83228` e `A429`)**, dados de satélite (**Open-Meteo**) e pluviômetros comunitários, sem necessidade de atualização manual.
   - Opção de detectar a **localização atual por GPS** ou selecionar a comunidade/povoado.

2. **Diagnóstico Automático da Situação da Roça e Guia de Manejo**:
   - O sistema identifica automaticamente em qual condição a propriedade se encontra (**Situação Favorável**, **Situação de Transição · Atenção ao Solo** ou **Situação de Estiagem**) e orienta o agricultor sobre **como agir agora no manejo do plantio**.

3. **Inteligência Artificial Integrada ao Clima (Voz e Chat)**:
   - **Leitura Natural por IA (`🔊`)**: Um único ícone de som no cabeçalho que gera um resumo falado acolhedor e natural sobre o clima da localidade e o manejo recomendado, convertido em voz em Português do Brasil.
   - **Chat Assistente de Plantio**: Assistente conversacional conectado aos dados reais de chuva, temperatura, umidade e limiares de culturas da localidade para tirar dúvidas e dar dicas práticas ao agricultor.

4. **Menu Lateral com Configurações de Acessibilidade**:
   - **Temas Visuais**: Modo **Claro**, Modo **Escuro**, Modo **Daltônico (paleta Okabe-Ito)** e Modo **Alto Contraste / Baixa Visão**.
   - **Ajuste de Tamanho da Fonte**: Controles `A-`, `Padrão (100%)` e `A+` (até `145%`) pensados para agricultores idosos ou com baixa visão.
   - **Ajuste de Velocidade do Áudio**: Opções de leitura mais pausada, normal ou rápida.

5. **Tela de Perfil do Usuário Editável**:
   - Visualização e edição completa dos dados cadastrais (Nome, Telefone/WhatsApp, E-mail, Localidade padrão da propriedade, Fonte principal de água e Senha) via `PUT /api/v1/usuarios/me`.

6. **Autenticação Segura e Persistência Offline**:
   - Login e cadastro sucintos com **Conta Google (OAuth 2.0 / OpenID Connect)** ou telefone/e-mail, com validação de e-mail por código.
   - Armazenamento local com **IndexedDB**, **LocalStorage** e **Service Worker (`sw.js`)**, mantendo o painel funcional mesmo sem internet na roça.

---

## 🏗️ Estrutura do Ecossistema

1. **Frontend (`supernovaweb/` e `public/`):**
   - Interface limpa, intuitiva e responsiva para celulares, tablets e computadores;
   - Menu lateral retrátil com navegação, temas de acessibilidade e controle de fonte;
   - Hospedado na **Vercel**.

2. **Backend (`server.ts` e `repositorio-backend/server.js`):**
   - API RESTful (`/api/v1/*`) com autenticação JWT, OAuth Google e validação de e-mail;
   - Rotas de IA (`/api/v1/ia/resumo-voz` e `/api/v1/ia/chat`) fundamentadas nos dados meteorológicos reais da localidade;
   - Hospedado no **Render.com**.

3. **Banco de Dados Relacional (`supabase/schema.sql`):**
   - 13 tabelas estruturadas no **PostgreSQL (Supabase)**.

4. **Agente de Código (`scripts/code-agent.js`):**
   - Scanner automático de conformidade, segurança e arquitetura (`npm run agent`).

---

## ⚡ Como Executar Localmente

```bash
# 1. Instalar dependências
npm install

# 2. Executar auditoria de saúde do código
npm run agent

# 3. Iniciar o servidor em desenvolvimento (porta 3000)
npm run dev
```

### Credenciais de Demonstração:
- **Agricultor:** Telefone `74988880000` | Senha `senha123` (Zé Ronaldo · Irecê)
- **Gestora:** Telefone `74999990000` | Senha `senha123` (Ana Carolina · IFBA)

---

*Grupo Garimpeiros · IFBA Campus Irecê · 2026*
