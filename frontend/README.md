# SupernovaWeb — Manejo Caatingueiro (Front-End)

Interface web responsiva (Mobile, Tablet e Desktop) do **Manejo Caatingueiro** — ferramenta consultiva de decisão de plantio, diagnóstico climático automático e gestão comunitária de água para agricultores familiares do Território de Irecê e Presidente Dutra (BA).

Desenvolvido pelo grupo **Garimpeiros (IFBA Campus Irecê)**:
- **Ana Carolina Estevão De Barros**
- **Wiliam Santos**
- **Luiza Rocha**

---

## Destaques da Interface

- **Menu Lateral Organizado**: Navegação rápida entre *Clima e Situação da Roça*, *Sugestão de Plantio*, *Poço e Cisterna*, *Alertas e Mural*, *Assistente de Plantio (IA)* e *Meu Perfil*, além de configurações de **Tema (Claro, Escuro, Daltônico, Alto Contraste)** e **Tamanho da Fonte (`A-`, `Padrão`, `A+`)**.
- **Diagnóstico Automático de Situação e Manejo**: O aplicativo calcula automaticamente se a propriedade está em **Situação Favorável**, **Situação de Transição (Atenção)** ou **Situação de Estiagem** e exibe orientações práticas de manejo do solo e plantio.
- **Leitura Natural por IA (`🔊`)**: Ícone único e intuitivo de som no topo da página que sintetiza um resumo natural por IA dos dados climáticos atuais em voz alta.
- **Chat Assistente de Plantio**: Suporte interativo baseado nos dados reais das APIs de clima da localidade selecionada.
- **Tela de Perfil do Usuário**: Visualização e edição completa das informações pessoais e da propriedade.

---

## Estrutura de Arquivos (`supernovaweb/`)

```
supernovaweb/
├── index.html                  → Aplicação principal (Clima, Plantio, Água, Mural, Chat IA e Perfil)
├── manifest.json               → Manifesto Web App (PWA offline-first)
├── sw.js                       → Service Worker para funcionamento offline na roça
├── favicon.svg                 → Ícone da aplicação
├── vercel.json                 → Configuração de rotas e proxy para deploy na Vercel
├── DOCUMENTACAO.md             → Documentação técnica e funcional detalhada
├── README.md                   → Visão geral do frontend
├── assets/
│   ├── css/
│   │   ├── global.css          → Paleta Caatinga, temas acessíveis, menu lateral, chat IA e perfil
│   │   ├── painel.css          → Painel de chuva, diagnóstico automático de situação e plantio
│   │   └── comunidade.css      → Reservatórios, checklist sanitário, alertas e mural
│   ├── js/
│   │   ├── acessibilidade-voz.js → Temas, escala de fonte e leitura de resumo natural por IA (🔊)
│   │   ├── clima-dinamico.js   → Atualização automática da situação da roça e passos de manejo
│   │   ├── menu.js             → Controle do menu lateral responsivo (drawer)
│   │   └── app.js              → Integração com a API, GPS, Google OAuth, Perfil, Chat IA e IndexedDB
│   └── images/
│       ├── logo.png
│       ├── logo-mark.svg
│       ├── roca-favoravel.svg
│       ├── roca-atencao.svg
│       └── roca-estiagem.svg
└── pages/
    ├── plantio.html            → Matriz de culturas do semiárido
    ├── reservatorios.html      → Monitoramento de poços e cisternas
    └── comunidade.html         → Alertas climáticos e mural comunitário
```
