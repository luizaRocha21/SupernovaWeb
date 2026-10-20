# SupernovaWeb — Manejo Caatingueiro (Front-End)

Interface web responsiva (Mobile e Desktop) do **Manejo Caatingueiro** — ferramenta consultiva de decisão de plantio e gestão comunitária de água para agricultores familiares do Território de Irecê e Presidente Dutra (BA).

Desenvolvido pelo grupo **Garimpeiros (IFBA Campus Irecê)**:
- **Ana Carolina Estevão De Barros**
- **Wiliam Santos**
- **Luiza Rocha**

---

## Estrutura do projeto (padrão PRG04 - PW)

```
supernovaweb/
├── index.html                  → página inicial (Autenticação + Painel de Chuva Hiperlocal + Registro de Chuva)
├── favicon.svg                 → ícone exibido na aba do navegador
├── vercel.json                 → configuração de hospedagem e proxy na Vercel
├── README.md                   → este arquivo
├── assets/
│   ├── css/
│   │   ├── global.css          → CSS externo compartilhado por todo o projeto
│   │   │                          (paleta Caatinga, tipografia, menu/nav responsivo mobile/desktop)
│   │   ├── painel.css          → CSS externo exclusivo do Painel de Chuva e Sugestão de Plantio
│   │   └── comunidade.css      → CSS externo exclusivo de Poço, Checklist, Monitor, Alertas, Mural e Guia
│   ├── js/
│   │   ├── clima-dinamico.js   → script que troca a ilustração dinâmica da roça conforme a chuva/cultura
│   │   ├── menu.js             → script do menu de navegação (abrir/fechar no mobile e troca de abas)
│   │   └── app.js              → cliente da API REST (Render/Local), cache e fila offline (RF17)
│   └── images/
│       ├── logo.png            → logotipo Manejo Caatingueiro
│       ├── logo-mark.svg       → símbolo do logotipo
│       ├── roca-favoravel.svg  → imagens usadas no recurso de ilustração climática dinâmica
│       ├── roca-atencao.svg
│       └── roca-estiagem.svg
└── pages/
    ├── plantio.html            → Sugestão Consultiva de Plantio e Ajuste de Limiares (RF05, RF06, RN09)
    ├── reservatorios.html      → Nível do Poço/Cisterna, Checklist Sanitário e Monitor Comunitário (RF07, RF08, RF16)
    ├── comunidade.html         → Alertas Climáticos e Mural Comunitário de Avisos (RF12 a RF15)
    └── plano-deploy.html       → Guia passo a passo de Deploy (Supabase + Render + Vercel + GitHub)
```
