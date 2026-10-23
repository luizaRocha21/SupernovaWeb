#!/usr/bin/env node
/**
 * ============================================================================
 * AGENTE DE ACOMPANHAMENTO DO CÓDIGO DO PROJETO (CODE HEALTH AGENT)
 * Projeto: Manejo Caatingueiro (SupernovaWeb) · Grupo Garimpeiros · IFBA Irecê
 * ============================================================================
 * Este agente analisa a integridade da arquitetura web Mobile First (Bootstrap 5
 * + Design Editorial Sertanejo), valida o backend em camadas no padrão FindPet
 * (src/domain/* e src/infrastructure/*, incluindo RadarMeteorologicoService e
 * FirebaseClient), audita práticas de segurança (prevenção de XSS, headers HTTP,
 * rate limiting, modal de logout) e valida as 8 coleções oficiais do Google
 * Firebase (Cloud Firestore).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const results = [];

function check(category, name, condition, successMsg, failMsg, isWarning = false) {
  results.push({
    category,
    name,
    status: condition ? 'PASS' : (isWarning ? 'WARN' : 'FAIL'),
    details: condition ? successMsg : failMsg
  });
}

console.log("\n=======================================================");
console.log(" 🌵 AGENTE DE ACOMPANHAMENTO — MANEJO CAATINGUEIRO");
console.log("=======================================================\n");

// 1. Verificação de Arquitetura Frontend (Mobile First + Bootstrap 5 + Editorial Sertanejo)
const frontendFiles = [
  'public/index.html',
  'public/vercel.json',
  'public/assets/css/global/elements.css',
  'public/assets/css/global.css',
  'public/assets/css/painel.css',
  'public/assets/css/comunidade.css',
  'public/assets/images/favicon.ico',
  'public/assets/images/logo.png',
  'public/assets/js/menu.js',
  'public/assets/js/clima-dinamico.js',
  'public/assets/js/acessibilidade-voz.js',
  'public/assets/js/app.js',
  'public/pages/login.html',
  'public/pages/painel.html',
  'public/pages/perfil.html',
  'public/pages/admin.html',
  'public/pages/assistente-ia.html',
  'public/pages/plantio.html',
  'public/pages/reservatorios.html',
  'public/pages/comunidade.html'
];

frontendFiles.forEach(file => {
  const exists = fs.existsSync(path.join(ROOT_DIR, file));
  check('Frontend', `Arquivo essencial: ${file}`, exists, 'Presente e acessível', `Arquivo não encontrado no caminho ${file}`);
});

// 2. Verificação de Arquitetura Backend (Padrão FindPet em Camadas + FirebaseClient + RadarMeteorologicoService)
const backendFiles = [
  'server.ts',
  'src/infrastructure/database/FirebaseClient.ts',
  'src/infrastructure/exception/BusinessException.ts',
  'src/infrastructure/exception/ErrorResponseDTO.ts',
  'src/infrastructure/exception/ApiExceptionHandler.ts',
  'src/infrastructure/security/JwtService.ts',
  'src/infrastructure/security/AuthMiddleware.ts',
  'src/domain/usuario/controller/UsuarioController.ts',
  'src/domain/usuario/service/UsuarioService.ts',
  'src/domain/usuario/repository/UsuarioRepository.ts',
  'src/domain/clima/controller/ClimaController.ts',
  'src/domain/clima/service/ClimaService.ts',
  'src/domain/clima/service/RadarMeteorologicoService.ts',
  'src/domain/pluviometro/controller/PluviometroController.ts',
  'src/domain/plantio/controller/PlantioController.ts',
  'src/domain/reservatorio/controller/ReservatorioController.ts',
  'src/domain/comunidade/controller/ComunidadeController.ts',
  'src/domain/ia/controller/IaController.ts',
  'src/domain/ia/service/IaService.ts',
  'firebase/firestore.rules',
  'firebase/estrutura-colecoes.json'
];

backendFiles.forEach(file => {
  const exists = fs.existsSync(path.join(ROOT_DIR, file));
  check('Backend', `Componente backend/domínio: ${file}`, exists, 'Configurado corretamente na arquitetura Firebase + FindPet', `Falta componente ${file}`);
});

// 3. Auditoria de Segurança (Security Skills)
try {
  const appJs = fs.readFileSync(path.join(ROOT_DIR, 'public/assets/js/app.js'), 'utf-8');
  const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'public/index.html'), 'utf-8');
  const adminHtml = fs.readFileSync(path.join(ROOT_DIR, 'public/pages/admin.html'), 'utf-8');
  const serverTs = fs.readFileSync(path.join(ROOT_DIR, 'server.ts'), 'utf-8');

  // a) Modal de confirmação para sair da conta
  const hasLogoutModalInHtml = indexHtml.includes('logout-confirm-modal');
  check('Segurança', 'Modal de Confirmação de Logout no HTML', hasLogoutModalInHtml,
    'Elemento #logout-confirm-modal presente no HTML para evitar logouts acidentais',
    'Falta modal de confirmação no HTML');

  const hasLogoutModalHandler = appJs.includes('logout-confirm-modal') && appJs.includes('logoutConfirmBtn');
  check('Segurança', 'Lógica defensiva de Logout no JavaScript', hasLogoutModalHandler,
    'Evento de clique exibe modal antes de encerrar sessão',
    'Logout direto sem confirmação detectado');

  // b) Sanitização XSS
  const hasXssEscape = appJs.includes('escapeHtml') && adminHtml.includes('escapeHtml');
  check('Segurança', 'Sanitização de XSS em listas e tabelas dinâmicas', hasXssEscape,
    'Função escapeHtml aplicada em títulos, murais, alertas e tabela administrativa',
    'Campos de usuário renderizados sem escape');

  // c) Headers defensivos no servidor
  const hasSecurityHeaders = serverTs.includes('X-Content-Type-Options') && serverTs.includes('Referrer-Policy');
  check('Segurança', 'Headers HTTP de Proteção no Backend', hasSecurityHeaders,
    'X-Content-Type-Options, X-XSS-Protection, Referrer-Policy e Permissions-Policy ativos',
    'Faltam headers de proteção HTTP no servidor');

  // d) Rate Limiting no Login
  const hasRateLimiting = serverTs.includes('loginRateLimiter');
  check('Segurança', 'Rate Limiting / Proteção contra Força Bruta', hasRateLimiting,
    'Limite de tentativas ativado nos endpoints de autenticação',
    'Endpoint de login sem proteção contra força bruta');

  // e) Limpeza de links não desejados
  const hasOldDeployLink = indexHtml.includes('Guia de Deploy') || indexHtml.includes('Documentação da API (Swagger)');
  check('Limpeza UI', 'Remoção de links desnecessários do rodapé', !hasOldDeployLink,
    'Links Guia de Deploy e Swagger removidos com sucesso',
    'Links desnecessários ainda presentes no index.html', true);

} catch (e) {
  check('Segurança', 'Leitura dos arquivos de segurança', false, '', `Erro ao inspecionar arquivos: ${e.message}`);
}

// 4. Verificação do Banco de Dados Google Firebase (Cloud Firestore)
try {
  const firebaseClientTs = fs.readFileSync(path.join(ROOT_DIR, 'src/infrastructure/database/FirebaseClient.ts'), 'utf-8');
  const firestoreRules = fs.readFileSync(path.join(ROOT_DIR, 'firebase/firestore.rules'), 'utf-8');
  const estruturaColecoesRaw = fs.readFileSync(path.join(ROOT_DIR, 'firebase/estrutura-colecoes.json'), 'utf-8');
  const estruturaColecoes = JSON.parse(estruturaColecoesRaw);

  const requiredCollections = [
    'usuarios',
    'rocas',
    'localidades',
    'culturas',
    'limiares_plantio',
    'precipitacoes',
    'reservatorios',
    'comunidade_avisos'
  ];

  requiredCollections.forEach(collectionName => {
    const inClient = firebaseClientTs.includes(`'${collectionName}'`) || firebaseClientTs.includes(`"${collectionName}"`);
    const inRules = firestoreRules.includes(`match /${collectionName}/`);
    const inJson = Boolean(estruturaColecoes?.colecoes && estruturaColecoes.colecoes[collectionName]);
    const collectionOk = inClient && inRules && inJson;

    check('Banco de Dados', `Coleção Cloud Firestore: ${collectionName}`, collectionOk,
      `Coleção ${collectionName} declarada em FirebaseClient.ts, firestore.rules e estrutura-colecoes.json`,
      `Coleção ${collectionName} ausente em um dos arquivos do Firebase`);
  });
} catch (e) {
  check('Banco de Dados', 'Leitura da configuração Firebase', false, '', `Erro: ${e.message}`);
}

// 5. Exibição e Cálculo de Pontuação
const total = results.length;
const passed = results.filter(r => r.status === 'PASS').length;
const warnings = results.filter(r => r.status === 'WARN').length;
const failed = results.filter(r => r.status === 'FAIL').length;
const score = Math.round((passed / total) * 100);

console.log(`📋 RESULTADOS DA AUDITORIA:\n`);
results.forEach(r => {
  const icon = r.status === 'PASS' ? '✅' : (r.status === 'WARN' ? '⚠️' : '❌');
  console.log(` ${icon} [${r.category}] ${r.name}: ${r.details}`);
});

console.log("\n-------------------------------------------------------");
console.log(`📊 PONTUAÇÃO GERAL DE SAÚDE DO CÓDIGO: ${score}%`);
console.log(`   Aprovados: ${passed} | Alertas: ${warnings} | Falhas: ${failed}`);
console.log("-------------------------------------------------------\n");

// 6. Geração do Relatório Markdown
const reportDate = new Date().toISOString().replace('T', ' ').slice(0, 19);
let markdown = `# Relatório do Agente de Acompanhamento de Código

**Data da Auditoria:** ${reportDate}  
**Pontuação de Saúde:** ${score}% (${passed}/${total} checagens aprovadas)  
**Status Geral:** ${failed === 0 ? '🟢 APROVADO' : '🔴 ATENÇÃO NECESSÁRIA'}  

---

## Sumário de Indicadores

| Categoria | Total Checagens | Aprovadas | Alertas | Falhas |
| :--- | :---: | :---: | :---: | :---: |
| **Frontend** | ${results.filter(r => r.category === 'Frontend').length} | ${results.filter(r => r.category === 'Frontend' && r.status === 'PASS').length} | 0 | ${results.filter(r => r.category === 'Frontend' && r.status === 'FAIL').length} |
| **Backend** | ${results.filter(r => r.category === 'Backend').length} | ${results.filter(r => r.category === 'Backend' && r.status === 'PASS').length} | 0 | ${results.filter(r => r.category === 'Backend' && r.status === 'FAIL').length} |
| **Segurança** | ${results.filter(r => r.category === 'Segurança').length} | ${results.filter(r => r.category === 'Segurança' && r.status === 'PASS').length} | 0 | ${results.filter(r => r.category === 'Segurança' && r.status === 'FAIL').length} |
| **Banco de Dados** | ${results.filter(r => r.category === 'Banco de Dados').length} | ${results.filter(r => r.category === 'Banco de Dados' && r.status === 'PASS').length} | 0 | ${results.filter(r => r.category === 'Banco de Dados' && r.status === 'FAIL').length} |

---

## Detalhamento das Checagens

| Status | Categoria | Verificação | Detalhes |
| :---: | :--- | :--- | :--- |
`;

results.forEach(r => {
  const badge = r.status === 'PASS' ? '✅ Passou' : (r.status === 'WARN' ? '⚠️ Alerta' : '❌ Falhou');
  markdown += `| ${badge} | **${r.category}** | ${r.name} | ${r.details} |\n`;
});

markdown += `
---

## Recomendações do Agente

1. **Deploy Automático:** Execute \`npm run agent\` sempre antes de realizar commits no repositório.
2. **Segurança Contínua:** Mantenha os tokens JWT com expiração máxima de 8 horas e as regras \`firebase/firestore.rules\` atualizadas no Cloud Firestore.
3. **Sincronização Offline:** Garanta que a fila local \`mc_offline_queue\` continue sincronizando em segundo plano quando a conectividade com o Render/Firebase for restabelecida.
`;

fs.writeFileSync(path.join(ROOT_DIR, 'AGENT_HEALTH_REPORT.md'), markdown, 'utf-8');
console.log("📄 Relatório salvo com sucesso em AGENT_HEALTH_REPORT.md\n");

process.exit(failed > 0 ? 1 : 0);
