# 🤖 Agente de Acompanhamento do Código (Code Health Agent)

Este projeto conta com um **Agente Automatizado de Acompanhamento de Código e Segurança** que monitora continuamente a integridade da arquitetura, a conformidade de segurança e a sincronização entre frontend, backend e banco de dados.

---

## 🎯 Objetivo do Agente

1. **Auditoria de Arquitetura**: Garante que todos os módulos essenciais do frontend (CSS modular, JavaScript desacoplado, views responsivas) e do backend (Docker, Maven/pom.xml, Server TS) existam e estejam íntegros.
2. **Skills de Segurança**:
   - Valida a presença e o funcionamento do **Modal de Confirmação de Logout** para prevenir encerramento acidental de sessão.
   - Audita sanitização de strings com `escapeHtml` para blindagem contra **XSS** em alertas e murais.
   - Confirma presença de **Headers HTTP defensivos** (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`).
   - Verifica **Rate Limiting** no endpoint de autenticação para proteção contra ataques de força bruta.
3. **Consistência de Banco de Dados**: Valida o `supabase/schema.sql`, conferindo se as 13 tabelas do domínio estão declaradas e prontas para uso no PostgreSQL.
4. **Relatório Contínuo**: Gera um relatório legível em Markdown (`AGENT_HEALTH_REPORT.md`) com a pontuação de saúde (0 a 100%).

---

## 🚀 Como Executar o Agente

### Modo Rápido (Linha de Comando)
```bash
npm run agent
```
ou diretamente via Node:
```bash
node scripts/code-agent.js
```

### Modo CI/CD (GitHub Actions)
O fluxo `.github/workflows/code-health-agent.yml` executa automaticamente o agente a cada `push` e `pull request` nos branches `main` e `master`. Se alguma verificação crítica falhar, o build do GitHub Actions alertará a equipe.

---

## 📋 Métricas Monitoradas

| Verificação | Critério | Ação em Caso de Falha |
| :--- | :--- | :--- |
| **Arquivos Frontend** | Presença de CSS, JS e HTML modulares | Aponta caminhos ausentes |
| **Backend & Deploy** | Presença de `Dockerfile`, `render.yaml` e `pom.xml` | Bloqueia deploy inconsistente |
| **Modal de Logout** | Presença do modal e event listeners de confirmação | Alerta risco de UX e sessão |
| **Sanitização XSS** | Uso de `escapeHtml` em renderização dinâmica | Alerta vulnerabilidade de injeção |
| **Headers HTTP** | Configuração de headers defensivos no Express | Alerta risco de clickjacking/MIME |
| **Rate Limiter** | Limitação de requisições em `/api/v1/auth/login` | Alerta risco de brute force |
| **Tabelas Supabase** | 13 tabelas essenciais no `schema.sql` | Alerta divergência de modelo relacional |

---

*Manejo Caatingueiro · Grupo Garimpeiros · IFBA Campus Irecê*
