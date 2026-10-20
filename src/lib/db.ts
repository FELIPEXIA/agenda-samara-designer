import { Pool } from 'pg';
import { Agendamento, Cliente, Servico, CriarAgendamentoDTO, StatusAgendamento } from '@/types';
import { calcularHorarioFim, haConflitoDeHorario } from './time-calc';

// Configuração do pool de conexões PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost')
    ? { rejectUnauthorized: false }
    : false,
});

// ==============================================================
// BASE DE DADOS EM MEMÓRIA (MOCK DATA)
// Garante pleno funcionamento imediato mesmo antes da configuração do .env
// ==============================================================
let mockServicos: Servico[] = [
  // Procedimentos Individuais de Unhas e Sobrancelhas
  { id: 'srv-1', nome_servico: 'Pé e Mão', categoria: 'Unhas Tradicionais', valor_base: 45.0, duracao_minutos: 120, ativo: true },
  { id: 'srv-2', nome_servico: 'Pé', categoria: 'Unhas Tradicionais', valor_base: 35.0, duracao_minutos: 60, ativo: true },
  { id: 'srv-3', nome_servico: 'Mão', categoria: 'Unhas Tradicionais', valor_base: 30.0, duracao_minutos: 60, ativo: true },
  { id: 'srv-4', nome_servico: 'Henna', categoria: 'Sobrancelhas', valor_base: 35.0, duracao_minutos: 60, ativo: true },
  { id: 'srv-5', nome_servico: 'Sobrancelhas', categoria: 'Sobrancelhas', valor_base: 25.0, duracao_minutos: 40, ativo: true },

  // Combos Tradicionais + Sobrancelhas / Henna
  { id: 'srv-6', nome_servico: 'Pé e Mão Henna', categoria: 'Combos Tradicionais', valor_base: 80.0, duracao_minutos: 180, ativo: true },
  { id: 'srv-7', nome_servico: 'Pé e Mão Sobrancelhas', categoria: 'Combos Tradicionais', valor_base: 70.0, duracao_minutos: 180, ativo: true },
  { id: 'srv-8', nome_servico: 'Pé Henna', categoria: 'Combos Tradicionais', valor_base: 70.0, duracao_minutos: 120, ativo: true },
  { id: 'srv-9', nome_servico: 'Pé Sobrancelhas', categoria: 'Combos Tradicionais', valor_base: 60.0, duracao_minutos: 90, ativo: true },
  { id: 'srv-10', nome_servico: 'Mão e Henna', categoria: 'Combos Tradicionais', valor_base: 65.0, duracao_minutos: 100, ativo: true },
  { id: 'srv-11', nome_servico: 'Mão Sobrancelhas', categoria: 'Combos Tradicionais', valor_base: 55.0, duracao_minutos: 90, ativo: true },

  // Procedimentos em Gel
  { id: 'srv-12', nome_servico: 'Unha de Gel', categoria: 'Unhas em Gel', valor_base: 120.0, duracao_minutos: 210, ativo: true },
  { id: 'srv-13', nome_servico: 'Banho de Gel', categoria: 'Unhas em Gel', valor_base: 90.0, duracao_minutos: 150, ativo: true },
  { id: 'srv-14', nome_servico: 'Esmaltação em Gel', categoria: 'Unhas em Gel', valor_base: 60.0, duracao_minutos: 120, ativo: true },
  { id: 'srv-15', nome_servico: 'Manutenção', categoria: 'Unhas em Gel', valor_base: 90.0, duracao_minutos: 180, ativo: true },

  // Combos com Unha de Gel
  { id: 'srv-16', nome_servico: 'Unha de Gel e Pé', categoria: 'Combos Gel', valor_base: 155.0, duracao_minutos: 240, ativo: true },
  { id: 'srv-17', nome_servico: 'Unha de Gel e Sobrancelhas', categoria: 'Combos Gel', valor_base: 145.0, duracao_minutos: 240, ativo: true },
  { id: 'srv-18', nome_servico: 'Unha de Gel e Henna', categoria: 'Combos Gel', valor_base: 155.0, duracao_minutos: 240, ativo: true },

  // Combos com Banho de Gel
  { id: 'srv-19', nome_servico: 'Banho de Gel e Pé', categoria: 'Combos Gel', valor_base: 125.0, duracao_minutos: 210, ativo: true },
  { id: 'srv-20', nome_servico: 'Banho de Gel Henna', categoria: 'Combos Gel', valor_base: 125.0, duracao_minutos: 210, ativo: true },
  { id: 'srv-21', nome_servico: 'Banho de Gel Sobrancelhas', categoria: 'Combos Gel', valor_base: 160.0, duracao_minutos: 210, ativo: true },

  // Combos com Esmaltação em Gel
  { id: 'srv-22', nome_servico: 'Esmaltação em Gel e Henna', categoria: 'Combos Gel', valor_base: 95.0, duracao_minutos: 180, ativo: true },
  { id: 'srv-23', nome_servico: 'Esmaltação em Gel Sobrancelhas', categoria: 'Combos Gel', valor_base: 85.0, duracao_minutos: 180, ativo: true },

  // Combos de Manutenção
  { id: 'srv-24', nome_servico: 'Manutenção e Henna', categoria: 'Combos Gel', valor_base: 125.0, duracao_minutos: 240, ativo: true },
];

// Armazenamento em memória para clientes e agendamentos reais (sem dados fictícios ou recriação automática).
// Usamos globalThis para preservar agendamentos reais e deleções durante Hot Module Replacement (HMR) em desenvolvimento.
const globalStore = globalThis as unknown as {
  mockClientes?: Cliente[];
  mockAgendamentos?: Agendamento[];
};

if (!globalStore.mockClientes) {
  globalStore.mockClientes = [];
}

if (!globalStore.mockAgendamentos) {
  globalStore.mockAgendamentos = [];
}

const mockClientes: Cliente[] = globalStore.mockClientes;
const mockAgendamentos: Agendamento[] = globalStore.mockAgendamentos;

// ==============================================================
// FUNÇÕES DE ACESSO A DADOS (HÍBRIDO POSTGRESQL + MEMORY FALLBACK)
// ==============================================================

export async function listarServicos(): Promise<Servico[]> {
  if (process.env.DATABASE_URL) {
    try {
      const res = await pool.query('SELECT * FROM servicos WHERE ativo = true ORDER BY categoria, nome_servico');
      return res.rows;
    } catch (err) {
      console.warn('Erro ao consultar PostgreSQL para serviços. Usando dados locais.', err);
    }
  }
  return mockServicos.filter((s) => s.ativo);
}

export async function buscarClientes(termo?: string): Promise<Cliente[]> {
  if (process.env.DATABASE_URL) {
    try {
      if (termo && termo.trim()) {
        const query = `
          SELECT * FROM clientes 
          WHERE nome ILIKE $1 OR telefone ILIKE $1 
          ORDER BY nome LIMIT 15
        `;
        const res = await pool.query(query, [`%${termo}%`]);
        return res.rows;
      }
      const res = await pool.query('SELECT * FROM clientes ORDER BY nome LIMIT 20');
      return res.rows;
    } catch (err) {
      console.warn('Erro ao consultar clientes no PostgreSQL. Usando dados locais.', err);
    }
  }

  if (termo && termo.trim()) {
    const t = termo.toLowerCase();
    return mockClientes.filter((c) => c.nome.toLowerCase().includes(t) || c.telefone.includes(t));
  }
  return mockClientes;
}

export async function obterOuCriarCliente(dados: {
  id?: string;
  nome: string;
  telefone: string;
  observacoes?: string;
}): Promise<Cliente> {
  if (process.env.DATABASE_URL) {
    try {
      if (dados.id) {
        const res = await pool.query('SELECT * FROM clientes WHERE id = $1', [dados.id]);
        if (res.rows[0]) return res.rows[0];
      }
      // Procura por telefone antes de criar
      const busca = await pool.query('SELECT * FROM clientes WHERE telefone = $1', [dados.telefone]);
      if (busca.rows[0]) {
        return busca.rows[0];
      }
      // Cria novo
      const ins = await pool.query(
        'INSERT INTO clientes (nome, telefone, observacoes) VALUES ($1, $2, $3) RETURNING *',
        [dados.nome, dados.telefone, dados.observacoes || null]
      );
      return ins.rows[0];
    } catch (err) {
      console.warn('Erro ao obter/criar cliente no PostgreSQL. Usando mock.', err);
    }
  }

  if (dados.id) {
    const achado = mockClientes.find((c) => c.id === dados.id);
    if (achado) return achado;
  }
  const existentePorTelefone = mockClientes.find((c) => c.telefone === dados.telefone);
  if (existentePorTelefone) return existentePorTelefone;

  const novoCliente: Cliente = {
    id: `cli-${Date.now()}`,
    nome: dados.nome,
    telefone: dados.telefone,
    observacoes: dados.observacoes,
  };
  mockClientes.push(novoCliente);
  return novoCliente;
}

export async function listarAgendamentosPorData(data: string): Promise<Agendamento[]> {
  if (process.env.DATABASE_URL) {
    try {
      const res = await pool.query(
        `SELECT * FROM vw_agendamentos_dashboard 
         WHERE data = $1 
         ORDER BY horario_inicio ASC`,
        [data]
      );
      return res.rows;
    } catch (err) {
      console.warn('Erro ao listar agendamentos do PostgreSQL. Usando mock.', err);
    }
  }

  return mockAgendamentos
    .filter((a) => a.data === data)
    .sort((a, b) => a.horario_inicio.localeCompare(b.horario_inicio));
}

export async function listarAgendamentosPendentes(): Promise<Agendamento[]> {
  if (process.env.DATABASE_URL) {
    try {
      const res = await pool.query(
        `SELECT * FROM vw_agendamentos_dashboard 
         WHERE status = 'Pendente' 
         ORDER BY created_at ASC, data ASC, horario_inicio ASC`
      );
      return res.rows;
    } catch (err) {
      console.warn('Erro ao listar agendamentos pendentes do PostgreSQL. Usando mock.', err);
    }
  }

  return [...mockAgendamentos]
    .filter((a) => a.status === 'Pendente')
    .sort((a, b) => {
      if (a.created_at && b.created_at) {
        const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        if (diff !== 0) return diff;
      }
      const cmpData = a.data.localeCompare(b.data);
      if (cmpData !== 0) return cmpData;
      return a.horario_inicio.localeCompare(b.horario_inicio);
    });
}

export async function criarAgendamento(dto: CriarAgendamentoDTO): Promise<Agendamento> {
  const cliente = await obterOuCriarCliente(dto.cliente);
  const todosServicos = await listarServicos();
  const servicosSelecionados = todosServicos.filter((s) => dto.servicos_ids.includes(s.id));

  const duracaoTotal = servicosSelecionados.reduce((acc, curr) => acc + curr.duracao_minutos, 0);
  const valorTotal = servicosSelecionados.reduce((acc, curr) => acc + curr.valor_base, 0);

  if (servicosSelecionados.length === 0 || duracaoTotal <= 0) {
    throw new Error('Nenhum serviço válido foi selecionado para o agendamento.');
  }

  const horarioFim = calcularHorarioFim(dto.horario_inicio, duracaoTotal);
  const listaServicosTexto = servicosSelecionados.map((s) => s.nome_servico).join(' + ');

  if (process.env.DATABASE_URL) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Validação de conflito de horário no PostgreSQL (regra de intersecção)
      const checkConflict = await client.query(
        `SELECT a.id, a.horario_inicio, a.horario_fim, c.nome AS cliente_nome
         FROM agendamentos a
         JOIN clientes c ON a.id_cliente = c.id
         WHERE a.data = $1
           AND a.status != 'Cancelado'
           AND (a.horario_inicio < $3::time AND a.horario_fim > $2::time)
         LIMIT 1`,
        [dto.data, dto.horario_inicio, horarioFim]
      );

      if (checkConflict.rows[0]) {
        const c = checkConflict.rows[0];
        const hInicio = c.horario_inicio.toString().substring(0, 5);
        const hFim = c.horario_fim.toString().substring(0, 5);
        throw new Error(
          `Conflito de horário! O intervalo pretendido (${dto.horario_inicio} às ${horarioFim}) colide com o atendimento de "${c.cliente_nome}" (${hInicio} às ${hFim}).`
        );
      }

      const insAg = await client.query(
        `INSERT INTO agendamentos 
         (id_cliente, data, horario_inicio, horario_fim, duracao_total_minutos, valor_total, forma_pagamento, status, observacoes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          cliente.id,
          dto.data,
          dto.horario_inicio,
          horarioFim,
          duracaoTotal,
          valorTotal,
          dto.forma_pagamento,
          dto.status || 'Confirmado',
          dto.observacoes || null,
        ]
      );

      const agendamentoCriado = insAg.rows[0];

      for (const s of servicosSelecionados) {
        await client.query(
          `INSERT INTO agendamento_servicos (id_agendamento, id_servico, valor_cobrado, duracao_minutos)
           VALUES ($1, $2, $3, $4)`,
          [agendamentoCriado.id, s.id, s.valor_base, s.duracao_minutos]
        );
      }

      await client.query('COMMIT');

      return {
        ...agendamentoCriado,
        cliente_nome: cliente.nome,
        cliente_telefone: cliente.telefone,
        lista_servicos: listaServicosTexto,
      };
    } catch (err: any) {
      await client.query('ROLLBACK');
      if (err.message && err.message.includes('Conflito de horário')) {
        throw err;
      }
      console.warn('Erro ao inserir agendamento no PostgreSQL. Usando mock.', err);
    } finally {
      client.release();
    }
  }

  // Fallback em memória com validação estrita de sobreposição
  const conflitoMemoria = mockAgendamentos.find(
    (a) =>
      a.data === dto.data &&
      a.status !== 'Cancelado' &&
      haConflitoDeHorario(dto.horario_inicio, horarioFim, a.horario_inicio, a.horario_fim)
  );

  if (conflitoMemoria) {
    const hInicio = conflitoMemoria.horario_inicio.substring(0, 5);
    const hFim = conflitoMemoria.horario_fim.substring(0, 5);
    throw new Error(
      `Conflito de horário! O intervalo pretendido (${dto.horario_inicio} às ${horarioFim}) colide com o atendimento de "${conflitoMemoria.cliente_nome}" (${hInicio} às ${hFim}).`
    );
  }

  const novoAgendamento: Agendamento = {
    id: `ag-${Date.now()}`,
    id_cliente: cliente.id,
    cliente_nome: cliente.nome,
    cliente_telefone: cliente.telefone,
    data: dto.data,
    horario_inicio: dto.horario_inicio,
    horario_fim: horarioFim,
    duracao_total_minutos: duracaoTotal,
    valor_total: valorTotal,
    forma_pagamento: dto.forma_pagamento,
    status: dto.status || 'Confirmado',
    observacoes: dto.observacoes,
    lista_servicos: listaServicosTexto,
    created_at: new Date().toISOString(),
  };

  mockAgendamentos.push(novoAgendamento);
  return novoAgendamento;
}

export async function atualizarStatusAgendamento(
  id: string,
  novoStatus: StatusAgendamento
): Promise<Agendamento | null> {
  if (process.env.DATABASE_URL) {
    try {
      const res = await pool.query(
        `UPDATE agendamentos 
         SET status = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2 
         RETURNING *`,
        [novoStatus, id]
      );
      if (res.rows[0]) {
        return res.rows[0];
      }
    } catch (err) {
      console.warn('Erro ao atualizar status no PostgreSQL. Usando mock.', err);
    }
  }

  const ag = mockAgendamentos.find((a) => a.id === id);
  if (ag) {
    ag.status = novoStatus;
    return ag;
  }
  return null;
}

export async function obterAgendamentoPorId(id: string): Promise<Agendamento | null> {
  if (process.env.DATABASE_URL) {
    try {
      const res = await pool.query(
        `SELECT * FROM vw_agendamentos_dashboard WHERE id = $1 LIMIT 1`,
        [id]
      );
      if (res.rows[0]) {
        return res.rows[0];
      }
    } catch (err) {
      console.warn('Erro ao consultar agendamento por ID no PostgreSQL. Usando mock.', err);
    }
  }

  const achado = mockAgendamentos.find((a) => a.id === id);
  return achado || null;
}

export async function excluirAgendamento(id: string): Promise<boolean> {
  if (process.env.DATABASE_URL) {
    try {
      // Remove vínculos de serviços antes de excluir o agendamento
      await pool.query('DELETE FROM agendamento_servicos WHERE id_agendamento = $1', [id]);
      const res = await pool.query('DELETE FROM agendamentos WHERE id = $1 RETURNING id', [id]);
      return (res.rowCount ?? 0) > 0;
    } catch (err) {
      console.warn('Erro ao excluir agendamento no PostgreSQL. Usando mock.', err);
    }
  }

  const idx = mockAgendamentos.findIndex((a) => a.id === id);
  if (idx !== -1) {
    mockAgendamentos.splice(idx, 1);
    return true;
  }
  return false;
}
