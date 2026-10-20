-- ========================================================
-- BANCO DE DADOS: AGENDA SAMARA DESIGNER
-- Sistema de Agendamento Profissional para Área da Beleza
-- Compatível com: PostgreSQL (Neon, Supabase, Vercel Postgres)
-- ========================================================

-- Habilitar extensão para geração de UUID (se aplicável)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================================================
-- 1. TIPOS ENUMERADOS (STATUS E FORMAS DE PAGAMENTO)
-- ========================================================
DO $$ BEGIN
    CREATE TYPE status_agendamento AS ENUM ('Confirmado', 'Pendente', 'Cancelado', 'Concluido');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE forma_pagamento AS ENUM ('Pix', 'Dinheiro', 'Cartao_Credito', 'Cartao_Debito', 'A_Definir');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ========================================================
-- 2. TABELA: CLIENTES
-- ========================================================
CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(120) NOT NULL,
    telefone VARCHAR(20) NOT NULL,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índice para busca rápida de clientes por telefone ou nome
CREATE INDEX IF NOT EXISTS idx_clientes_telefone ON clientes(telefone);
CREATE INDEX IF NOT EXISTS idx_clientes_nome ON clientes(nome);

-- ========================================================
-- 3. TABELA: SERVICOS
-- ========================================================
CREATE TABLE IF NOT EXISTS servicos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_servico VARCHAR(100) NOT NULL,
    categoria VARCHAR(50) DEFAULT 'Geral', -- 'Unhas', 'Sobrancelhas', etc.
    valor_base NUMERIC(10, 2) NOT NULL CHECK (valor_base >= 0),
    duracao_minutos INTEGER NOT NULL CHECK (duracao_minutos > 0),
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================================================
-- 4. TABELA: AGENDAMENTOS
-- ========================================================
CREATE TABLE IF NOT EXISTS agendamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_cliente UUID NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
    data DATE NOT NULL,
    horario_inicio TIME NOT NULL,
    horario_fim TIME NOT NULL,
    duracao_total_minutos INTEGER NOT NULL,
    valor_total NUMERIC(10, 2) NOT NULL CHECK (valor_total >= 0),
    forma_pagamento forma_pagamento DEFAULT 'A_Definir',
    status status_agendamento DEFAULT 'Confirmado',
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Validação: horário de término deve ser após o início
    CONSTRAINT check_horario_valido CHECK (horario_fim > horario_inicio)
);

-- Índices cruciais para o Dashboard Diário e checagem de conflitos de horários
CREATE INDEX IF NOT EXISTS idx_agendamentos_data_status ON agendamentos(data, status);
CREATE INDEX IF NOT EXISTS idx_agendamentos_cliente ON agendamentos(id_cliente);
CREATE INDEX IF NOT EXISTS idx_agendamentos_horarios ON agendamentos(data, horario_inicio, horario_fim) WHERE status != 'Cancelado';

-- ========================================================
-- 4.1 TRIGGER DE PREVENÇÃO DE CONFLITO DE HORÁRIOS (OVERLAP)
-- Impede inserções ou alterações que sobreponham horários já ocupados
-- Regra de Intersecção: (Novo_Inicio < Fim_Existente) AND (Novo_Fim > Inicio_Existente)
-- ========================================================
CREATE OR REPLACE FUNCTION check_agendamento_overlap()
RETURNS TRIGGER AS $$
DECLARE
    v_conflito RECORD;
BEGIN
    IF NEW.status != 'Cancelado' THEN
        SELECT a.id, a.horario_inicio, a.horario_fim, c.nome AS cliente_nome
        INTO v_conflito
        FROM agendamentos a
        JOIN clientes c ON a.id_cliente = c.id
        WHERE a.data = NEW.data
          AND a.status != 'Cancelado'
          AND a.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
          AND (NEW.horario_inicio < a.horario_fim AND NEW.horario_fim > a.horario_inicio)
        LIMIT 1;

        IF FOUND THEN
            RAISE EXCEPTION 'Conflito de horário! Já existe um atendimento para "%" no intervalo das % às %.',
                v_conflito.cliente_nome, 
                to_char(v_conflito.horario_inicio, 'HH24:MI'), 
                to_char(v_conflito.horario_fim, 'HH24:MI')
                USING ERRCODE = '23P01';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_agendamento_overlap ON agendamentos;
CREATE TRIGGER trg_check_agendamento_overlap
BEFORE INSERT OR UPDATE ON agendamentos
FOR EACH ROW EXECUTE FUNCTION check_agendamento_overlap();

-- ========================================================
-- 5. TABELA ASSOCIATIVA: AGENDAMENTO_SERVICOS
-- Armazena os serviços contratados no agendamento.
-- Permite guardar o valor e duração cobrados na época (histórico íntegro).
-- ========================================================
CREATE TABLE IF NOT EXISTS agendamento_servicos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_agendamento UUID NOT NULL REFERENCES agendamentos(id) ON DELETE CASCADE,
    id_servico UUID NOT NULL REFERENCES servicos(id) ON DELETE RESTRICT,
    valor_cobrado NUMERIC(10, 2) NOT NULL,
    duracao_minutos INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agendamento_servicos_agendamento ON agendamento_servicos(id_agendamento);

-- ========================================================
-- 6. VIEW OTIMIZADA PARA O DASHBOARD DIÁRIO
-- Retorna os agendamentos já com nome da cliente, telefone
-- e lista concatenada dos serviços selecionados.
-- ========================================================
CREATE OR REPLACE VIEW vw_agendamentos_dashboard AS
SELECT 
    a.id,
    a.data,
    a.horario_inicio,
    a.horario_fim,
    a.duracao_total_minutos,
    a.valor_total,
    a.forma_pagamento,
    a.status,
    a.observacoes,
    a.created_at,
    c.id AS cliente_id,
    c.nome AS cliente_nome,
    c.telefone AS cliente_telefone,
    COALESCE(
        string_agg(s.nome_servico, ' + ' ORDER BY s.nome_servico),
        'Nenhum serviço especificado'
    ) AS lista_servicos
FROM agendamentos a
JOIN clientes c ON a.id_cliente = c.id
LEFT JOIN agendamento_servicos asv ON a.id = asv.id_agendamento
LEFT JOIN servicos s ON asv.id_servico = s.id
GROUP BY a.id, c.id;

