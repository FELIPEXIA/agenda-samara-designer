-- ========================================================
-- DADOS INICIAIS (SEED) PARA A AGENDA SAMARA DESIGNER
-- Tabela Oficial de Serviços e Preços
-- ========================================================

-- Inserir Tabela Oficial de Serviços da Samara Designer
INSERT INTO servicos (nome_servico, categoria, valor_base, duracao_minutos) VALUES
-- Procedimentos Individuais de Unhas e Sobrancelhas
('Pé e Mão', 'Unhas Tradicionais', 45.00, 120),
('Pé', 'Unhas Tradicionais', 35.00, 60),
('Mão', 'Unhas Tradicionais', 30.00, 60),
('Henna', 'Sobrancelhas', 35.00, 60),
('Sobrancelhas', 'Sobrancelhas', 25.00, 40),

-- Combos Tradicionais + Sobrancelhas / Henna
('Pé e Mão Henna', 'Combos Tradicionais', 80.00, 180),
('Pé e Mão Sobrancelhas', 'Combos Tradicionais', 70.00, 180),
('Pé Henna', 'Combos Tradicionais', 70.00, 120),
('Pé Sobrancelhas', 'Combos Tradicionais', 60.00, 90),
('Mão e Henna', 'Combos Tradicionais', 65.00, 100),
('Mão Sobrancelhas', 'Combos Tradicionais', 55.00, 90),

-- Procedimentos em Gel
('Unha de Gel', 'Unhas em Gel', 120.00, 210),
('Banho de Gel', 'Unhas em Gel', 90.00, 150),
('Esmaltação em Gel', 'Unhas em Gel', 60.00, 120),
('Manutenção', 'Unhas em Gel', 90.00, 180),

-- Combos com Unha de Gel
('Unha de Gel e Pé', 'Combos Gel', 155.00, 240),
('Unha de Gel e Sobrancelhas', 'Combos Gel', 145.00, 240),
('Unha de Gel e Henna', 'Combos Gel', 155.00, 240),

-- Combos com Banho de Gel
('Banho de Gel e Pé', 'Combos Gel', 125.00, 210),
('Banho de Gel Henna', 'Combos Gel', 125.00, 210),
('Banho de Gel Sobrancelhas', 'Combos Gel', 160.00, 210),

-- Combos com Esmaltação em Gel
('Esmaltação em Gel e Henna', 'Combos Gel', 95.00, 180),
('Esmaltação em Gel Sobrancelhas', 'Combos Gel', 85.00, 180),

-- Combos de Manutenção
('Manutenção e Henna', 'Combos Gel', 125.00, 240)
ON CONFLICT DO NOTHING;

