-- ========================================================
-- DADOS INICIAIS (SEED) PARA A AGENDA SAMARA DESIGNER
-- Tabela Oficial de Serviços e Preços
-- ========================================================

-- Inserir Tabela Oficial de Serviços da Samara Designer
INSERT INTO servicos (id, nome_servico, categoria, valor_base, duracao_minutos) VALUES
-- Procedimentos Individuais de Unhas e Sobrancelhas
('srv-1', 'Pé e Mão', 'Unhas Tradicionais', 45.00, 120),
('srv-2', 'Pé', 'Unhas Tradicionais', 35.00, 60),
('srv-3', 'Mão', 'Unhas Tradicionais', 30.00, 60),
('srv-4', 'Henna', 'Sobrancelhas', 35.00, 60),
('srv-5', 'Sobrancelhas', 'Sobrancelhas', 25.00, 40),

-- Combos Tradicionais + Sobrancelhas / Henna
('srv-6', 'Pé e Mão Henna', 'Combos Tradicionais', 80.00, 180),
('srv-7', 'Pé e Mão Sobrancelhas', 'Combos Tradicionais', 70.00, 180),
('srv-8', 'Pé Henna', 'Combos Tradicionais', 70.00, 120),
('srv-9', 'Pé Sobrancelhas', 'Combos Tradicionais', 60.00, 90),
('srv-10', 'Mão e Henna', 'Combos Tradicionais', 65.00, 100),
('srv-11', 'Mão Sobrancelhas', 'Combos Tradicionais', 55.00, 90),

-- Procedimentos em Gel
('srv-12', 'Unha de Gel', 'Unhas em Gel', 120.00, 210),
('srv-13', 'Banho de Gel', 'Unhas em Gel', 90.00, 150),
('srv-14', 'Esmaltação em Gel', 'Unhas em Gel', 60.00, 120),
('srv-15', 'Manutenção', 'Unhas em Gel', 90.00, 180),

-- Combos com Unha de Gel
('srv-16', 'Unha de Gel e Pé', 'Combos Gel', 155.00, 240),
('srv-17', 'Unha de Gel e Sobrancelhas', 'Combos Gel', 145.00, 240),
('srv-18', 'Unha de Gel e Henna', 'Combos Gel', 155.00, 240),

-- Combos com Banho de Gel
('srv-19', 'Banho de Gel e Pé', 'Combos Gel', 125.00, 210),
('srv-20', 'Banho de Gel Henna', 'Combos Gel', 125.00, 210),
('srv-21', 'Banho de Gel Sobrancelhas', 'Combos Gel', 160.00, 210),

-- Combos com Esmaltação em Gel
('srv-22', 'Esmaltação em Gel e Henna', 'Combos Gel', 95.00, 180),
('srv-23', 'Esmaltação em Gel Sobrancelhas', 'Combos Gel', 85.00, 180),

-- Combos de Manutenção
('srv-24', 'Manutenção e Henna', 'Combos Gel', 125.00, 240)
ON CONFLICT (id) DO UPDATE SET 
    nome_servico = EXCLUDED.nome_servico,
    categoria = EXCLUDED.categoria,
    valor_base = EXCLUDED.valor_base,
    duracao_minutos = EXCLUDED.duracao_minutos;

