-- ============================================================================
-- MANEJO CAATINGUEIRO — SCRIPT SQL COMPLETO PARA SUPABASE (PostgreSQL)
-- Grupo Garimpeiros · IFBA Campus Irecê
-- ============================================================================
-- Como usar:
-- 1. Acesse https://supabase.com e abra seu projeto.
-- 2. No menu lateral esquerdo, clique em "SQL Editor" -> "New query".
-- 3. Cole todo este script e clique em "Run" (ou Ctrl+Enter).
-- ============================================================================

-- 1. TABELA DE LOCALIDADES (Município -> Povoado)
CREATE TABLE IF NOT EXISTS localidades (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(120) NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('MUNICIPIO', 'POVOADO')),
    pai_id BIGINT REFERENCES localidades(id) ON DELETE SET NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    uf VARCHAR(2) NOT NULL DEFAULT 'BA'
);

-- 2. TABELA DE USUÁRIOS (RF01, RF02)
CREATE TABLE IF NOT EXISTS usuarios (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(120) NOT NULL,
    telefone VARCHAR(20) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    perfil VARCHAR(30) NOT NULL CHECK (perfil IN ('AGRICULTOR', 'LIDERANCA_COMUNITARIA', 'GESTOR_PUBLICO')),
    abastecimento VARCHAR(20) NOT NULL CHECK (abastecimento IN ('ENCANADA', 'POCO', 'CISTERNA', 'MISTO')),
    localidade_id BIGINT NOT NULL REFERENCES localidades(id),
    consentimento_localizacao BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABELA DE CULTURAS (RF05)
CREATE TABLE IF NOT EXISTS culturas (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(80) NOT NULL UNIQUE,
    tipo_criterio VARCHAR(30) NOT NULL CHECK (tipo_criterio IN ('ACUMULADO_JANELA', 'VOLUME_POR_EVENTO', 'INICIO_ESTACAO')),
    janela_dias INTEGER,
    limiar_padrao_mm DOUBLE PRECISION NOT NULL,
    fonte_limiar VARCHAR(255) NOT NULL
);

-- 4. TABELA DE LIMIARES PERSONALIZADOS PELO AGRICULTOR (RN09)
CREATE TABLE IF NOT EXISTS culturas_limiares_usuarios (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    cultura_id BIGINT NOT NULL REFERENCES culturas(id) ON DELETE CASCADE,
    limiar_mm DOUBLE PRECISION NOT NULL,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_limiar_usuario_cultura UNIQUE (usuario_id, cultura_id)
);

-- 5. TABELA DE SÉRIE HISTÓRICA CLIMATOLÓGICA (RF18, RN04)
CREATE TABLE IF NOT EXISTS series_historicas (
    id BIGSERIAL PRIMARY KEY,
    localidade_id BIGINT NOT NULL REFERENCES localidades(id) ON DELETE CASCADE,
    mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
    normal_mm DOUBLE PRECISION NOT NULL,
    anos_base INTEGER NOT NULL DEFAULT 30,
    fonte VARCHAR(160) NOT NULL,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_serie_localidade_mes UNIQUE (localidade_id, mes)
);

-- 6. TABELA DE OBSERVAÇÕES CLIMÁTICAS EXTERNAS (RF18 - Open-Meteo / INMET / CHIRPS)
CREATE TABLE IF NOT EXISTS observacoes_externas (
    id BIGSERIAL PRIMARY KEY,
    localidade_id BIGINT NOT NULL REFERENCES localidades(id) ON DELETE CASCADE,
    data_observacao DATE NOT NULL,
    volume_mm DOUBLE PRECISION NOT NULL CHECK (volume_mm >= 0),
    fonte VARCHAR(160) NOT NULL,
    capturado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_obs_externa_localidade_data UNIQUE (localidade_id, data_observacao)
);

-- 7. TABELA DE PRECIPITAÇÕES REGISTRADAS PELOS AGRICULTORES (RF03, RF17)
CREATE TABLE IF NOT EXISTS precipitacoes (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    localidade_id BIGINT NOT NULL REFERENCES localidades(id) ON DELETE CASCADE,
    volume_mm DOUBLE PRECISION NOT NULL CHECK (volume_mm >= 0 AND volume_mm <= 500),
    data_evento DATE NOT NULL,
    fonte VARCHAR(30) NOT NULL CHECK (fonte IN ('PLUVIOMETRO_PROPRIO', 'ESTACAO', 'ESTIMATIVA')),
    pendente_sincronizacao BOOLEAN NOT NULL DEFAULT FALSE,
    id_cliente_sync VARCHAR(64) UNIQUE,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. TABELA DE SUGESTÕES DE PLANTIO EMITIDAS (RF06, RN12, RN16)
CREATE TABLE IF NOT EXISTS sugestoes_plantio (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    localidade_id BIGINT NOT NULL REFERENCES localidades(id) ON DELETE CASCADE,
    cultura_id BIGINT NOT NULL REFERENCES culturas(id) ON DELETE CASCADE,
    resultado VARCHAR(40) NOT NULL CHECK (resultado IN ('CONDICAO_FAVORAVEL', 'ATENCAO_CONSIDERE_ADIAR', 'CONSIDERE_CULTURA_ALTERNATIVA', 'DADOS_INSUFICIENTES')),
    dado_usado_mm DOUBLE PRECISION,
    referencia_mm DOUBLE PRECISION NOT NULL,
    fonte_dado VARCHAR(160) NOT NULL,
    data_dado TIMESTAMP,
    grau_confianca DOUBLE PRECISION NOT NULL,
    justificativa VARCHAR(600) NOT NULL,
    emitida_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 9. TABELA DE RESERVATÓRIOS (RF07, RN01)
CREATE TABLE IF NOT EXISTS reservatorios (
    id BIGSERIAL PRIMARY KEY,
    responsavel_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    localidade_id BIGINT NOT NULL REFERENCES localidades(id) ON DELETE CASCADE,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('POCO', 'CISTERNA')),
    apelido VARCHAR(80),
    capacidade_litros INTEGER,
    consentimento_agregacao BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 10. TABELA DE REGISTROS DE NÍVEL DO RESERVATÓRIO (RF07, RN02, RN10)
CREATE TABLE IF NOT EXISTS registros_nivel (
    id BIGSERIAL PRIMARY KEY,
    reservatorio_id BIGINT NOT NULL REFERENCES reservatorios(id) ON DELETE CASCADE,
    data_registro DATE NOT NULL,
    nivel_percentual DOUBLE PRECISION CHECK (nivel_percentual BETWEEN 0 AND 100),
    escala VARCHAR(20) NOT NULL CHECK (escala IN ('CHEIO', 'MEDIO', 'BAIXO', 'CRITICO')),
    nivel_lencol_metros DOUBLE PRECISION,
    pendente_sincronizacao BOOLEAN NOT NULL DEFAULT FALSE,
    id_cliente_sync VARCHAR(64) UNIQUE,
    sincronizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_registro_reservatorio_data UNIQUE (reservatorio_id, data_registro)
);

-- 11. TABELA DE CHECKLIST SANITÁRIO DO RESERVATÓRIO (RF16, RN11)
CREATE TABLE IF NOT EXISTS checklists_sanitarios (
    id BIGSERIAL PRIMARY KEY,
    reservatorio_id BIGINT NOT NULL REFERENCES reservatorios(id) ON DELETE CASCADE,
    data_avaliacao DATE NOT NULL,
    protecao_entrada BOOLEAN NOT NULL,
    agua_sem_odor_ou_cor BOOLEAN NOT NULL,
    entorno_limpo BOOLEAN NOT NULL,
    estrutura_integra BOOLEAN NOT NULL,
    risco_potabilidade BOOLEAN NOT NULL,
    observacao VARCHAR(300),
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 12. TABELA DE ALERTAS CLIMÁTICOS (RF12, RF13, RN07)
CREATE TABLE IF NOT EXISTS alertas (
    id BIGSERIAL PRIMARY KEY,
    localidade_id BIGINT NOT NULL REFERENCES localidades(id) ON DELETE CASCADE,
    emissor_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    tipo VARCHAR(40) NOT NULL CHECK (tipo IN ('CHUVA_ABAIXO_ESPERADO', 'INICIO_CHUVAS', 'RISCO_ESTIAGEM', 'OUTRO')),
    severidade VARCHAR(20) NOT NULL CHECK (severidade IN ('INFO', 'ATENCAO', 'ALTA')),
    titulo VARCHAR(140) NOT NULL,
    mensagem VARCHAR(500) NOT NULL,
    fonte VARCHAR(160) NOT NULL,
    vigente_ate DATE NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 13. TABELA DO MURAL COMUNITÁRIO DE AVISOS E TROCAS (RF14, RF15, RN08)
CREATE TABLE IF NOT EXISTS avisos_mural (
    id BIGSERIAL PRIMARY KEY,
    localidade_id BIGINT NOT NULL REFERENCES localidades(id) ON DELETE CASCADE,
    autor_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    titulo VARCHAR(120) NOT NULL,
    conteudo VARCHAR(500) NOT NULL,
    publicado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    visivel_ate DATE NOT NULL
);

-- ============================================================================
-- DADOS INICIAIS (SEED) DO TERRITÓRIO DE IRECÊ E PRESIDENTE DUTRA (BA)
-- ============================================================================

INSERT INTO localidades (id, nome, tipo, pai_id, latitude, longitude, uf) VALUES
    (1, 'Irecê', 'MUNICIPIO', NULL, -11.3042, -41.8558, 'BA'),
    (2, 'Presidente Dutra', 'MUNICIPIO', NULL, -11.2958, -41.9869, 'BA'),
    (3, 'Povoado de Achado (Irecê)', 'POVOADO', 1, -11.2610, -41.8210, 'BA'),
    (4, 'Povoado de Umbuzeiro (Irecê)', 'POVOADO', 1, -11.3412, -41.8840, 'BA'),
    (5, 'Povoado de Campo Formoso (Pres. Dutra)', 'POVOADO', 2, -11.3120, -41.9650, 'BA')
ON CONFLICT (id) DO NOTHING;

SELECT setval('localidades_id_seq', (SELECT MAX(id) FROM localidades));

INSERT INTO culturas (id, nome, tipo_criterio, janela_dias, limiar_padrao_mm, fonte_limiar) VALUES
    (1, 'milho', 'ACUMULADO_JANELA', 30, 120.0, 'Referência agroclimática Semiárido (Embrapa Semiárido / ZARC BA) — editável pelo agricultor'),
    (2, 'mamona', 'ACUMULADO_JANELA', 30, 90.0, 'Referência agroclimática Território de Irecê e Presidente Dutra — tolerante à seca'),
    (3, 'feijão', 'INICIO_ESTACAO', NULL, 110.0, 'Referência para feijão-caupi/rotação no semiárido baiano — editável pelo agricultor'),
    (4, 'sorgo', 'VOLUME_POR_EVENTO', 7, 45.0, 'Cultura alternativa de alta resiliência hídrica para anos de chuva irregular')
ON CONFLICT (id) DO NOTHING;

SELECT setval('culturas_id_seq', (SELECT MAX(id) FROM culturas));

-- Série Histórica Climatológica (Normais Mensais de 30 anos para Irecê e Presidente Dutra - INMET/CHIRPS)
INSERT INTO series_historicas (localidade_id, mes, normal_mm, anos_base, fonte) VALUES
    (1, 1, 95.0, 30, 'Climatologia INMET/CHIRPS (1991-2020) · Irecê-BA'),
    (1, 2, 82.0, 30, 'Climatologia INMET/CHIRPS (1991-2020) · Irecê-BA'),
    (1, 3, 92.0, 30, 'Climatologia INMET/CHIRPS (1991-2020) · Irecê-BA'),
    (1, 4, 54.0, 30, 'Climatologia INMET/CHIRPS (1991-2020) · Irecê-BA'),
    (1, 5, 18.0, 30, 'Climatologia INMET/CHIRPS (1991-2020) · Irecê-BA'),
    (1, 6, 9.0, 30, 'Climatologia INMET/CHIRPS (1991-2020) · Irecê-BA'),
    (1, 7, 7.0, 30, 'Climatologia INMET/CHIRPS (1991-2020) · Irecê-BA'),
    (1, 8, 5.0, 30, 'Climatologia INMET/CHIRPS (1991-2020) · Irecê-BA'),
    (1, 9, 12.0, 30, 'Climatologia INMET/CHIRPS (1991-2020) · Irecê-BA'),
    (1, 10, 38.0, 30, 'Climatologia INMET/CHIRPS (1991-2020) · Irecê-BA'),
    (1, 11, 88.0, 30, 'Climatologia INMET/CHIRPS (1991-2020) · Irecê-BA'),
    (1, 12, 112.0, 30, 'Climatologia INMET/CHIRPS (1991-2020) · Irecê-BA'),
    (2, 1, 92.0, 30, 'Climatologia INMET/CHIRPS (1991-2020) · Presidente Dutra-BA'),
    (2, 2, 78.0, 30, 'Climatologia INMET/CHIRPS (1991-2020) · Presidente Dutra-BA'),
    (2, 3, 89.0, 30, 'Climatologia INMET/CHIRPS (1991-2020) · Presidente Dutra-BA'),
    (2, 4, 51.0, 30, 'Climatologia INMET/CHIRPS (1991-2020) · Presidente Dutra-BA'),
    (2, 5, 16.0, 30, 'Climatologia INMET/CHIRPS (1991-2020) · Presidente Dutra-BA'),
    (2, 6, 8.0, 30, 'Climatologia INMET/CHIRPS (1991-2020) · Presidente Dutra-BA'),
    (2, 7, 6.0, 30, 'Climatologia INMET/CHIRPS (1991-2020) · Presidente Dutra-BA'),
    (2, 8, 5.0, 30, 'Climatologia INMET/CHIRPS (1991-2020) · Presidente Dutra-BA'),
    (2, 9, 11.0, 30, 'Climatologia INMET/CHIRPS (1991-2020) · Presidente Dutra-BA'),
    (2, 10, 36.0, 30, 'Climatologia INMET/CHIRPS (1991-2020) · Presidente Dutra-BA'),
    (2, 11, 85.0, 30, 'Climatologia INMET/CHIRPS (1991-2020) · Presidente Dutra-BA'),
    (2, 12, 108.0, 30, 'Climatologia INMET/CHIRPS (1991-2020) · Presidente Dutra-BA')
ON CONFLICT (localidade_id, mes) DO NOTHING;
