# 🌵 Manejo Caatingueiro

> **Painel de Chuva Hiperlocal, Diagnóstico Automático da Roça e Assistente de Plantio com IA para a Agricultura Familiar no Semiárido**  
> *Grupo Garimpeiros · IFBA Campus Irecê (Bahia)*

[![Code Health Agent](https://img.shields.io/badge/Code_Health-100%25_Aprovado-286947?style=for-the-badge)](./AGENT_HEALTH_REPORT.md)
[![Stack](https://img.shields.io/badge/Stack-HTML5%20%7C%20CSS3%20%7C%20JS%20%7C%20Node%20%7C%20PostgreSQL-c47a2b?style=for-the-badge)](#arquitetura-do-projeto)

---

## 📋 Visão Geral do Projeto

O **Manejo Caatingueiro** é uma plataforma web progressiva (PWA) construída para apoiar agricultores e agricultoras familiares do **Território de Irecê e Presidente Dutra (BA)** na tomada de decisão sobre o manejo do plantio de sequeiro (**milho**, **mamona** e **feijão-caupi**) e na segurança hídrica de **cisternas e poços**.

### Principais Funcionalidades Implementadas

1. **Página Inicial Separada por Estado de Acesso (Visitante x Agricultor Conectado)**
   - **Antes de Entrar na Conta**: A tela inicial exibe apenas a apresentação clara dos recursos do aplicativo (*acompanhamento do manejo da roça, assistente de IA, pluviômetro, cisterna/poço e acessibilidade*) ao lado do painel de login e cadastro, sem carregar nem expor dados de outras contas.
   - **Após Entrar na Conta**: O painel libera os dados exclusivos da conta conectada, incluindo o diagnóstico da propriedade, o painel de chuva da localidade, o pluviômetro pessoal e as abas de manejo.

2. **Diagnóstico Automático da Situação da Roça e Guia de Manejo**
   - Ao entrar na conta, o sistema analisa automaticamente a precipitação acumulada e a necessidade hídrica da cultura, indicando a situação atual (**Situação Favorável**, **Situação de Transição / Atenção** ou **Situação de Estiagem**) e exibindo orientações práticas de manejo do solo.

3. **Assistente de IA em Página Exclusiva (`/pages/assistente-ia.html`)**
   - **Ícone de Chat ao lado do Botão de Áudio**: Posicionado no cabeçalho ao lado do ícone de som, com acesso liberado **exclusivamente quando o usuário está logado**.
   - **Página Dedicada de Chat**: Ao clicar no ícone de chat conectado, abre-se uma página exclusiva apenas com o chat do agricultor com o Assistente de IA (`/pages/assistente-ia.html`), fundamentado nos dados meteorológicos da localidade do usuário.

4. **Leitura Natural da Página em Voz Alta (Ícone de Som)**
   - Um único botão com **ícone de alto-falante (`🔊`)** no topo gera um resumo natural por IA (`POST /api/v1/ia/resumo-voz`) e lê o conteúdo em Português do Brasil.

5. **Menu Lateral com Configurações de Acessibilidade e Tela**
   - **Temas Visuais**: **Claro**, **Escuro**, **Daltônico** e **Alto Contraste (Baixa Visão)**.
   - **Tamanho da Fonte**: Controles **A-**, **Padrão** e **A+** (de `100%` a `145%`).
   - **Velocidade do Áudio**: Ajuste da cadência da fala (`0.85x`, `1.0x`, `1.2x`).

6. **Perfil do Usuário com Edição de Dados (`PUT /api/v1/usuarios/me`)**
   - Tela dedicada (**Meu Perfil**) permitindo consultar e atualizar nome, telefone/WhatsApp, e-mail, localidade da propriedade, fonte principal de água e senha.

7. **Login e Cadastro Simplificados + Funcionamento Offline**
   - Acesso rápido com **Conta Google** ou telefone/e-mail, com validação de e-mail e fila de sincronização offline (`IndexedDB` + `Service Worker`).

---

## 🏗️ Arquitetura do Projeto

```text
├── public/ & supernovaweb/         # Frontend Web Responsivo (PWA)
│   ├── index.html                  # Tela inicial (Apresentação Visitante / Painel Logado)
│   ├── pages/
│   │   ├── assistente-ia.html      # Página exclusiva do Chat com o Assistente de IA
│   │   ├── plantio.html            # Matriz consultiva de culturas
│   │   ├── reservatorios.html      # Gestão de poços, cisternas e qualidade da água
│   │   └── comunidade.html         # Alertas e mural comunitário
│   ├── assets/
│   │   ├── css/                    # Estilos responsivos e temas de acessibilidade
│   │   └── js/                     # Lógica de sessão isolada, áudio IA, menu e clima
│   └── sw.js                       # Service Worker Offline-First
├── server.ts                       # Servidor Full-Stack TypeScript / Express
├── repositorio-backend/            # Pacote isolado do Backend para deploy no Render
├── backend-java/                   # Implementação de referência Spring Boot 3 / Java 21
└── supabase/schema.sql             # Modelagem relacional PostgreSQL
```

---

## 🚀 Como Executar Localmente

```bash
# 1. Instalar dependências
npm install

# 2. Iniciar o servidor na porta 3000
npm run dev
```

---

## 👥 Autoria

**Grupo Garimpeiros — IFBA Campus Irecê**  
- Ana Carolina Estevão · Luiza Rocha · Wiliam Santos · Zé Ronaldo
