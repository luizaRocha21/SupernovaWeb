# 🌵 Manejo Caatingueiro — Documentação Completa do Projeto

> **Grupo Garimpeiros · IFBA Campus Irecê**  
> *Painel de Chuva Hiperlocal e Sugestão Consultiva de Plantio para a Agricultura Familiar no Semiárido da Bahia*

---

## 📑 Sumário

1. [Visão Geral e Contexto](#1-visão-geral-e-contexto)
2. [Princípio Fundamental (Regra de Ouro RN12)](#2-princípio-fundamental-regra-de-ouro-rn12)
3. [Arquitetura Geral do Sistema](#3-arquitetura-geral-do-sistema)
4. [Matriz de Requisitos e Regras de Negócio](#4-matriz-de-requisitos-e-regras-de-negócio)
5. [Modelo de Dados Relacional (Supabase PostgreSQL)](#5-modelo-de-dados-relacional-supabase-postgresql)
6. [Catálogo de Endpoints da API REST (/api/v1)](#6-catálogo-de-endpoints-da-api-rest-apiv1)
7. [Skills de Segurança e Conformidade](#7-skills-de-segurança-e-conformidade)
8. [Agente de Acompanhamento do Código](#8-agente-de-acompanhamento-do-código)
9. [Guia de Instalação, Execução Local e Deploy](#9-guia-de-instalação-execução-local-e-deploy)

---

## 1. Visão Geral e Contexto

O **Manejo Caatingueiro** nasceu a partir de pesquisas de campo com agricultores familiares da microrregião de **Irecê e Presidente Dutra (Bahia)**. No semiárido brasileiro, as precipitações são marcadas por alta variabilidade espacial e temporal: chuvas torrenciais concentradas em poucos dias alternam-se com estiagens severas dentro da mesma safra.

### Desafios Identificados em Campo:
- **6 de 6 agricultores entrevistados** relataram já ter perdido safras inteiras por estiagem repentina ou por plantio em momento desfavorável.
- **9 de 10 agricultores** percebem mudanças no padrão de chuvas e escassez crescente nas fontes hídricas comunitárias.
- **83% dos agricultores** confirmaram que um painel hiperlocal com dados em "linguagem de roça" é decisivo para planejar o momento de semeadura e a preservação de poços artesianos.

### Persona Central: Zé Ronaldo
- **Perfil:** Agricultor familiar em Irecê (BA), cultivo de milho catingueiro, feijão-caupi e mamona;
- **Dores:** Dificuldade de acesso a previsões confiáveis para a sua comunidade rural e oscilação constante de sinal de internet celular no campo;
- **Necessidade:** Aplicativo leve, direto, legível em sol forte, que funcione offline e permita consultar poços e registrar chuvas comunitárias.

---

## 2. Princípio Fundamental (Regra de Ouro RN12)

> **"Informação para apoiar, nunca para determinar." (RN12)**

O sistema **jamais impõe** ao agricultor a decisão de plantar ou não plantar. Ele traduz dados meteorológicos complexos (precipitação acumulada, janelas de 30 dias, limiares agronômicos da Embrapa Semiárido) em três faixas visuais intuitivas:
- 🟢 **Condição Favorável:** O acumulado atingiu ou superou o limiar da cultura.
- 🟡 **Atenção:** Chuva moderada, mas ainda abaixo do limiar agronômico seguro.
- 🔴 **Estiagem / Janela Inadequada:** Déficit hídrico crítico; recomenda-se cautela ou aguardar novos eventos pluviométricos.

O agricultor possui autonomia total para **personalizar seu próprio limiar de corte** (RN09), sobrepondo a média técnica de acordo com seu conhecimento prático do solo da sua propriedade.

---

## 3. Arquitetura Geral do Sistema

O projeto adota uma arquitetura web moderna, modular e desacoplada, inspirada nas melhores práticas de sistemas distribuídos e conectada pelo **GitHub**:

```
┌────────────────────────────────┐         HTTPS / REST API         ┌────────────────────────────────┐
│      FRONTEND: supernovaweb    │ ────────────────────────────────►│     BACKEND: Java 21 / Node    │
│  • Hospedado na VERCEL         │      /api/v1/* (JWT Bearer)      │  • Hospedado no RENDER         │
│  • HTML5 + CSS3 + JS Modular   │                                  │  • Docker + Open-Meteo Ingest  │
│  • Responsivo (Mobile/Desktop) │ ◄────────────────────────────────│  • CORS + Rate Limiting Defesa │
│  • Cache Offline Local (RF17)  │         JSON / Respostas         │  • Validação e Negócio         │
└────────────────────────────────┘                                  └────────────────────────────────┘
                                                                                    │
                                                                                    │ JDBC Pooler SSL
                                                                                    │ (Porta 6543)
                                                                                    ▼
                                                                    ┌────────────────────────────────┐
                                                                    │    BANCO: Supabase Postgres    │
                                                                    │  • 13 Tabelas Normalizadas     │
                                                                    │  • Normais Climatológicas 30a  │
                                                                    │  • Índices Temporais e FKs     │
                                                                    └────────────────────────────────┘
```

### Tecnologias Empregadas:
- **Frontend (`supernovaweb`):**
  - HTML5 semântico e acessível;
  - CSS3 modularizado (`global.css`, `painel.css`, `comunidade.css`) com CSS Custom Properties e design responsivo fluido (mobile first);
  - JavaScript Vanilla modular (`menu.js`, `clima-dinamico.js`, `app.js`) sem frameworks pesados para garantir carregamento instantâneo em redes 3G rurais;
  - Service Layer com fila offline (`localStorage`) e ressincronização automática (`sync/registros`).
- **Backend:**
  - Java 21 LTS com Spring Boot (ou Node.js 22 LTS com Express e TypeScript em ambiente de desenvolvimento);
  - Autenticação stateless via JSON Web Tokens (JWT) e hashing de senhas via BCrypt;
  - Integração meteorológica automatizada via API Open-Meteo (RF18);
  - Conteinerização com Docker multi-stage build.
- **Banco de Dados (Supabase PostgreSQL):**
  - 13 tabelas relacionais com integridade referencial;
  - Carga inicial (seed) completa para Irecê e Presidente Dutra.

---

## 4. Matriz de Requisitos e Regras de Negócio

### Requisitos Funcionais (RF)
| ID | Nome | Descrição |
| :--- | :--- | :--- |
| **RF01** | Cadastro de Agricultor | Registro com nome, telefone/WhatsApp, senha, localidade, tipo de abastecimento e consentimento de localização. |
| **RF02** | Autenticação Segura | Login via telefone e senha com retorno de token JWT de 8 horas de validade. |
| **RF03** | Painel de Chuva Hiperlocal | Visualização da chuva acumulada nos últimos 30 dias na localidade selecionada. |
| **RF04** | Comparativo Climatológico | Comparação percentual entre a chuva observada e a normal climatológica de 30 anos (INMET/Embrapa). |
| **RF05** | Matriz de Culturas | Catálogo com parâmetros agronômicos de Milho, Mamona, Feijão-Caupi e Sorgo Forrageiro. |
| **RF06** | Sugestão Consultiva de Plantio | Diagnóstico consultivo (Favorável, Atenção, Estiagem) cruzando chuva acumulada e limiar. |
| **RF07** | Registro Manual de Chuva | Envio de medições manuais realizadas em pluviômetros caseiros ou comunitários. |
| **RF08** | Monitoramento de Reservatórios | Consulta ao volume e estado de poços comunitários e cisternas da região. |
| **RF09** | Registro de Nível de Água | Atualização do nível hídrico (cm ou percentual) de reservatórios comunitários. |
| **RF10** | Checklist Sanitário | Registro de vistorias sanitárias e inspeções de manutenção em poços e cisternas. |
| **RF11** | Histórico Pluviométrico | Gráficos e tabelas com a série histórica de precipitações por período. |
| **RF12** | Alertas Meteorológicos | Recepção de avisos extraordinários da Defesa Civil e sistemas de alerta. |
| **RF13** | Notificações de Risco | Exibição destacada de alertas de veranico, tempestade ou escassez hídrica. |
| **RF14** | Mural Comunitário | Visualização de avisos, chamadas de mutirão e ofertas de troca de sementes crioulas. |
| **RF15** | Publicação no Mural | Formulário para postagem de novos comunicados para os agricultores da localidade. |
| **RF16** | Responsividade Total | Interface adaptável a telas de smartphones, tablets e computadores. |
| **RF17** | Operação Offline & Sincronização | Cache local de leituras e fila de envio em caso de queda de sinal de internet. |
| **RF18** | Ingestão Climática Real | Coleta automática de precipitação real via satélite e estações (API Open-Meteo). |

### Regras de Negócio (RN)
- **RN01 (Unicidade de Telefone):** O telefone/WhatsApp é o identificador único da conta do agricultor.
- **RN02 (Janela Padrão de 30 Dias):** O painel hiperlocal calcula acumulados móveis nos 30 dias antecedentes.
- **RN03 (Ponderação de Fontes):** Medições manuais comunitárias validadas têm peso prioritário sobre dados de satélite interpolados.
- **RN08 (Validade dos Avisos do Mural):** Cada publicação no mural comunitário expira automaticamente após 30 dias corridos.
- **RN09 (Autonomia de Limiar):** O agricultor pode editar e salvar o limiar pluviométrico de corte da sua propriedade.
- **RN12 (Natureza Consultiva):** Nenhuma mensagem do sistema pode ter caráter imperativo ou impositivo.
- **RN13 (Degradação Graciosa em Leitura):** Em caso de indisponibilidade de rede, o aplicativo apresenta o último snapshot válido em cache com indicação clara da data do dado.

---

## 5. Modelo de Dados Relacional (Supabase PostgreSQL)

O arquivo `supabase/schema.sql` provisiona as **13 tabelas** do ecossistema:

1. `localidades`: Municípios polo (ex: Irecê, Presidente Dutra) e seus povoados rurais vinculados.
2. `usuarios`: Contas de agricultores, gestores de associações e lideranças comunitárias.
3. `culturas`: Catálogo de culturas do semiárido com tipo de critério, janela de cálculo e limiar padrão (mm).
4. `culturas_limiares_usuarios`: Personalização individual de limiares por agricultor (RN09).
5. `series_historicas`: Séries climatológicas normais de 30 anos (médias mensais de referência).
6. `observacoes_externas`: Registros coletados de fontes externas (Open-Meteo, satélites, INMET).
7. `precipitacoes`: Leituras manuais registradas diretamente pelos agricultores (RF07).
8. `sugestoes_plantio`: Registro histórico de sugestões consultivas geradas pelo sistema.
9. `reservatorios`: Cadastro de poços artesianos, cisternas calçadão e açudes comunitários.
10. `registros_nivel`: Histórico de medições de nível de água dos reservatórios.
11. `checklists_sanitarios`: Vistorias de qualidade, limpeza e tampamento de reservatórios.
12. `alertas`: Alertas meteorológicos e comunicados de emergência emitidos para cada localidade.
13. `avisos_mural`: Publicações comunitárias de troca de sementes crioulas e mutirões (RN08).

---

## 6. Catálogo de Endpoints da API REST (/api/v1)

### Autenticação & Usuários
- `POST /api/v1/auth/login` — Autentica telefone e senha; retorna token JWT (8h) e perfil do usuário.
- `POST /api/v1/usuarios` — Cadastra novo agricultor ou liderança.
- `GET /api/v1/usuarios/me` — Retorna os dados do agricultor autenticado.

### Localidades & Painel Hiperlocal
- `GET /api/v1/localidades` — Lista municípios e povoados atendidos.
- `GET /api/v1/localidades/{id}/painel-chuva` — Retorna chuva acumulada em 30 dias, comparativo normal, lista dos últimos 15 dias e status do clima.
- `GET /api/v1/localidades/{id}/sugestao-plantio?cultura={id}` — Gera o parecer consultivo detalhado (Favorável, Atenção ou Estiagem).

### Registros de Chuva & Sincronização Offline
- `POST /api/v1/precipitacoes` — Registra medição manual pluviométrica.
- `POST /api/v1/sync/registros` — Recebe lote (batch) de registros criados offline no campo para persistência em massa.

### Reservatórios e Água Comunitária
- `GET /api/v1/reservatorios` — Lista poços e reservatórios da localidade com status atual.
- `POST /api/v1/reservatorios/{id}/niveis` — Registra nova leitura de nível de água.
- `POST /api/v1/reservatorios/{id}/checklists` — Registra vistoria sanitária no reservatório.

### Mural da Comunidade & Alertas
- `GET /api/v1/alertas?localidadeId={id}` — Lista alertas climáticos ativos na região.
- `GET /api/v1/avisos?localidadeId={id}` — Lista comunicados do mural vigentes nos últimos 30 dias.
- `POST /api/v1/avisos` — Publica novo comunicado ou oferta de semente crioula no mural.

### Ingestão Automática de Dados Climáticos
- `POST /api/v1/admin/ingestao/todas` — Dispara consulta e sincronização com a API meteorológica Open-Meteo.

---

## 7. Skills de Segurança e Conformidade

O projeto incorpora um conjunto abrangente de **Skills de Segurança defensiva**:

### 1. Confirmação Defensiva de Logout
- **Prevenção de Encerramento Acidental:** Ao clicar no botão de avatar ou sair da conta, um modal de diálogo acessível (`#logout-confirm-modal`) é exibido com foco imediato e fechamento por `Escape` ou clique fora.
- **Higienização Completa de Sessão:** Ao confirmar, o sistema limpa tokens do `sessionStorage`, `localStorage`, caches temporários e reseta campos de formulário sensíveis para evitar vazamento em computadores ou celulares compartilhados de associações rurais.

### 2. Prevenção Ativa de Cross-Site Scripting (XSS)
- Todos os campos inseridos dinamicamente no DOM oriundos de usuários (títulos de avisos, mensagens de trocas, nomes de autores e notas) passam obrigatoriamente pela função `escapeHtml()`, neutralizando tags maliciosas (`<script>`, `<iframe>`, `onerror`).

### 3. Rate Limiting no Login (Proteção contra Força Bruta)
- O endpoint `/api/v1/auth/login` conta com limitador de taxa (máximo de 15 requisições por minuto por IP), bloqueando ataques de dicionário ou tentativas consecutivas de adivinhação de senhas com código de resposta HTTP `429 Too Many Requests`.

### 4. Headers HTTP de Segurança no Backend
- `X-Content-Type-Options: nosniff` — Impede ataques de sniffing de MIME type.
- `X-Frame-Options: SAMEORIGIN` — Protege contra Clickjacking.
- `X-XSS-Protection: 1; mode=block` — Ativa o filtro heurístico de XSS em navegadores legados.
- `Referrer-Policy: strict-origin-when-cross-origin` — Restringe o vazamento de caminhos de URL em requisições de saída.
- `Permissions-Policy` — Desativa acesso indevido a microfone e câmera.

### 5. Conformidade com a LGPD
- O cadastro de agricultores exige declaração de consentimento explícito para coleta e uso de dados de localização geográfica do imóvel rural (campo `consentimentoLocalizacao: true`).

---

## 8. Agente de Acompanhamento do Código

Para manter a saúde contínua da base de código, o projeto disponibiliza um agente automatizado:

```bash
# Executa a auditoria completa do repositório
npm run agent
```

### O que o Agente avalia:
- **Integridade de Arquitetura:** 100% dos arquivos de frontend, backend e schemas presentes.
- **Skills de Segurança:** Verificação estática do modal de logout, sanitização de XSS, rate limiting e headers.
- **Sincronização de Banco:** Confirmação da presença das 13 tabelas do Supabase no `schema.sql`.
- **Geração de Relatório:** Criação automática do `AGENT_HEALTH_REPORT.md` com score de 0 a 100%.

O agente também roda automaticamente no **GitHub Actions** via `.github/workflows/code-health-agent.yml`.

---

## 9. Guia de Instalação, Execução Local e Deploy

### Execução Local (Desenvolvimento Rápido)
```bash
# 1. Instalar dependências
npm install

# 2. Executar o agente de saúde
npm run agent

# 3. Iniciar o servidor com suporte a API e SPA estático
npm run dev
# Acesse no navegador: http://localhost:3000
```

### Credenciais de Teste Pré-cadastradas:
- **Agricultor (Irecê):** Telefone `74988880000` · Senha `senha123`
- **Gestor / Liderança (IFBA):** Telefone `74999990000` · Senha `senha123`

### Deploy em Produção:
1. **Supabase:** Crie o projeto em São Paulo, abra o **SQL Editor**, cole `supabase/schema.sql` e execute.
2. **Render:** Crie um **Web Service** apontando para o repositório do backend, selecione **Docker** e informe as credenciais de banco JDBC do Supabase nas variáveis de ambiente (`PORT=8080`, `DB_URL`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`).
3. **Vercel:** Importe o repositório `supernovaweb` como projeto estático, configure a URL do Render no `vercel.json` e publique.

---

*Manejo Caatingueiro · Grupo Garimpeiros · IFBA Campus Irecê · 2026*
