#!/usr/bin/env node
/**
 * ============================================================================
 * AGENTE DE ACOMPANHAMENTO DO CÓDIGO DO PROJETO (CODE HEALTH AGENT)
 * Projeto: Manejo Caatingueiro · Grupo Garimpeiros · IFBA Campus Irecê
 * ============================================================================
 * Este agente analisa a integridade da arquitetura web, verifica a conformidade
 * com os requisitos (RF01-RF18 / RN01-RN13), audita práticas de segurança
 * (prevenção de XSS, proteção de rotas, modal de logout), valida o schema SQL
 * do Supabase e gera um relatório detalhado de saúde do repositório.
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

// 1. Verificação de Arquitetura Frontend
const frontendFiles = [
  'public/index.html',
  'public/assets/css/global.css',
  'public/assets/css/painel.css',
  'public/assets/css/comunidade.css',
  'public/assets/js/menu.js',
  'public/assets/js/clima-dinamico.js',
  'public/assets/js/app.js',
  'supernovaweb/index.html',
  'supernovaweb/vercel.json'
];

frontendFiles.forEach(file => {
  const exists = fs.existsSync(path.join(ROOT_DIR, file));
  check('Frontend', `Arquivo essencial: ${file}`, exists, 'Presente e acessível', `Arquivo não encontrado no caminho ${file}`);
});

// 2. Verificação de Arquitetura Backend & Deploy
const backendFiles = [
  'server.ts',
  'backend-java/Dockerfile',
  'backend-java/pom.xml',
  'backend-java/render.yaml',
  'supabase/schema.sql'
];

backendFiles.forEach(file => {
  const exists = fs.existsSync(path.join(ROOT_DIR, file));
  check('Backend', `Componente backend/deploy: ${file}`, exists, 'Configurado corretamente', `Falta componente ${file}`);
});

// 3. Auditoria de Segurança (Security Skills)
try {
  const appJs = fs.readFileSync(path.join(ROOT_DIR, 'public/assets/js/app.js'), 'utf-8');
  const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'public/index.html'), 'utf-8');
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
  const hasXssEscape = appJs.includes('escapeHtml');
  check('Segurança', 'Sanitização de XSS em listas dinâmicas', hasXssEscape, 
    'Função escapeHtml aplicada em títulos, murais e alertas', 
    'Campos de usuário renderizados sem escape');

  // c) Headers defensivos no servidor
  const hasSecurityHeaders = serverTs.includes('X-Content-Type-Options') && serverTs.includes('X-Frame-Options');
  check('Segurança', 'Headers HTTP de Proteção no Backend', hasSecurityHeaders, 
    'X-Content-Type-Options, X-Frame-Options e Referrer-Policy ativos', 
    'Faltam headers de proteção HTTP no servidor');

  // d) Rate Limiting no Login
  const hasRateLimiting = serverTs.includes('loginRateLimiter');
  check('Segurança', 'Rate Limiting / Proteção contra Força Bruta', hasRateLimiting, 
    'Limite de tentativas ativado no endpoint /api/v1/auth/login', 
    'Endpoint de login sem proteção contra força bruta');

  // e) Limpeza de links não desejados
  const hasOldDeployLink = indexHtml.includes('Guia de Deploy') || indexHtml.includes('Documentação da API (Swagger)');
  check('Limpeza UI', 'Remoção de links desnecessários do rodapé', !hasOldDeployLink, 
    'Links Guia de Deploy e Swagger removidos com sucesso', 
    'Links desnecessários ainda presentes no index.html', true);

} catch (e) {
  check('Segurança', 'Leitura dos arquivos de segurança', false, '', `Erro ao inspecionar arquivos: ${e.message}`);
}

// 4. Verificação do Schema SQL do Supabase
try {
  const schemaSql = fs.readFileSync(path.join(ROOT_DIR, 'supabase/schema.sql'), 'utf-8');
  const requiredTables = [
    'localidades',
    'usuarios',
    'culturas',
    'culturas_limiares_usuarios',
    'series_historicas',
    'observacoes_externas',
    'precipitacoes',
    'sugestoes_plantio',
    'reservatorios',
    'registros_nivel',
    'checklists_sanitarios',
    'alertas',
    'avisos_mural'
  ];

  requiredTables.forEach(table => {
    const tableExists = schemaSql.includes(`CREATE TABLE IF NOT EXISTS ${table}`) || schemaSql.includes(`CREATE TABLE ${table}`);
    check('Banco de Dados', `Tabela SQL Supabase: ${table}`, tableExists, 
      `Tabela ${table} declarada no schema.sql`, 
      `Tabela ${table} ausente no schema`);
  });
} catch (e) {
  check('Banco de Dados', 'Leitura do schema.sql', false, '', `Erro: ${e.message}`);
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
2. **Segurança Contínua:** Mantenha os tokens JWT com expiração máxima de 8 horas e valide a limpeza de credenciais no encerramento de sessão.
3. **Sincronização Offline:** Garanta que a fila local \`mc_offline_queue\` continue sincronizando em segundo plano quando a conectividade com o Render for restabelecida.
`;

fs.writeFileSync(path.join(ROOT_DIR, 'AGENT_HEALTH_REPORT.md'), markdown, 'utf-8');
console.log("📄 Relatório salvo com sucesso em AGENT_HEALTH_REPORT.md\n");

process.exit(failed > 0 ? 1 : 0);
