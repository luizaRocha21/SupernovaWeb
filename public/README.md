# SupernovaWeb — Manejo Caatingueiro (Front-End)

Interface web responsiva (Mobile, Tablet e Desktop) do **Manejo Caatingueiro** — ferramenta consultiva de decisão de plantio, diagnóstico climático automático e gestão de água para a agricultura familiar no semiárido baiano.

## Destaques de Interface e Usabilidade

- **Página Inicial Limpa Antes do Login**: Antes de entrar na conta, exibe apenas a apresentação do aplicativo (*acompanhamento do manejo da roça, assistente de IA, pluviômetro, poço/cisterna e acessibilidade*) e o painel de login/cadastro, sem carregar dados de outras contas.
- **Informações de Manejo Exclusivas para Usuário Logado**: Após autenticar-se, o agricultor visualiza o diagnóstico automático da sua roça (**Favorável**, **Transição/Atenção** ou **Estiagem**), o painel de chuva da sua localidade e seus próprios registros.
- **Assistente de IA em Nova Página Dedicada (`pages/assistente-ia.html`)**: Ícone de chat posicionado ao lado do botão de áudio no topo, liberado apenas quando o usuário está logado, abrindo uma página exclusiva somente com o chat com o Assistente de IA.
- **Menu Lateral Responsivo**: Reúne a navegação (quando logado) e as configurações de acessibilidade (**Temas Claro, Escuro, Daltônico e Alto Contraste**, além de ajuste de **Tamanho da Fonte** e **Velocidade do Áudio**).
- **Ícone Único de Áudio com Resumo por IA**: Leitura natural da página em voz alta com um clique no ícone de som no cabeçalho.

## Estrutura de Arquivos

- `index.html` — Aplicação principal (Boas-vindas e Login para visitantes; Painel de Manejo, Plantio, Reservatórios, Comunidade e Perfil para usuários conectados)
- `pages/assistente-ia.html` — Página exclusiva do Chat com o Assistente de IA
- `assets/css/global.css`, `painel.css`, `comunidade.css` — Estilos responsivos e temas de acessibilidade
- `assets/js/app.js` — Isolamento de sessão por conta, integração com APIs de clima e sincronização offline
- `assets/js/acessibilidade-voz.js` — Controle de temas, escala tipográfica e leitura por voz
- `assets/js/clima-dinamico.js` — Diagnóstico automático da situação da roça e guia de manejo
- `assets/js/menu.js` — Controle do menu lateral responsivo
- `sw.js` e `manifest.json` — Suporte PWA e persistência offline
