import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { Agendamento, Cliente, Servico, CriarAgendamentoDTO, StatusAgendamento } from '@/types';
import { calcularHorarioFim, haConflitoDeHorario } from './time-calc';

// Configuração do pool de conexões PostgreSQL com timeout resiliente
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost')
    ? { rejectUnauthorized: false }
    : false,
  connectionTimeoutMillis: 4000,
  idleTimeoutMillis: 10000,
});

// ==============================================================
// CATÁLOGO OFICIAL DE SERVIÇOS (SAMARA DESIGNER)
// ==============================================================
export const catalogoServicos: Servico[] = [
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

export const mockServicos = catalogoServicos; // Retrocompatibilidade

// ==============================================================
// PERSISTÊNCIA MULTI-CAMADA RESILIENTE (DISCO + TMP + MEMÓRIA)
// ==============================================================
const DATA_FILE = path.join(process.cwd(), 'database', 'data.json');
const TMP_FILE = path.join(os.tmpdir(), 'agenda_samara_data.json');

interface StorageShape {
  clientes: Cliente[];
  agendamentos: Agendamento[];
}

// Memória persistente global da instância do Node.js
const globalObj = globalThis as unknown as {
  __agendaSamaraStore?: StorageShape;
};

if (!globalObj.__agendaSamaraStore) {
  globalObj.__agendaSamaraStore = {
    clientes: [],
    agendamentos: [],
  };
}

const memoryStore = globalObj.__agendaSamaraStore;

function mesclarNaMemoria(clientes: Cliente[], agendamentos: Agendamento[]) {
  if (Array.isArray(clientes)) {
    for (const c of clientes) {
      if (!memoryStore.clientes.some((x) => x.id === c.id || (x.telefone && x.telefone === c.telefone))) {
        memoryStore.clientes.push(c);
      }
    }
  }
  if (Array.isArray(agendamentos)) {
    for (const a of agendamentos) {
      const idx = memoryStore.agendamentos.findIndex((x) => x.id === a.id);
      if (idx >= 0) {
        memoryStore.agendamentos[idx] = a;
      } else {
        memoryStore.agendamentos.push(a);
      }
    }
  }
}

function carregarDadosLocais(): StorageShape {
  // 1. Tenta ler de database/data.json do projeto
  try {
    if (fs.existsSync(DATA_FILE)) {
      const conteudo = fs.readFileSync(DATA_FILE, 'utf-8');
      if (conteudo && conteudo.trim()) {
        const parsed = JSON.parse(conteudo);
        mesclarNaMemoria(parsed.clientes || [], parsed.agendamentos || []);
      }
    }
  } catch (err) {
    // Ignora se não for legível
  }

  // 2. Tenta ler de TMP_FILE (útil em ambientes serverless como Vercel)
  try {
    if (fs.existsSync(TMP_FILE)) {
      const conteudoTmp = fs.readFileSync(TMP_FILE, 'utf-8');
      if (conteudoTmp && conteudoTmp.trim()) {
        const parsedTmp = JSON.parse(conteudoTmp);
        mesclarNaMemoria(parsedTmp.clientes || [], parsedTmp.agendamentos || []);
      }
    }
  } catch (err) {
    // Ignora
  }

  return {
    clientes: [...memoryStore.clientes],
    agendamentos: [...memoryStore.agendamentos],
  };
}

function salvarDadosLocais(clientes: Cliente[], agendamentos: Agendamento[], permiteEsvaziar = false): void {
  // 1. Proteção de integridade: nunca esvaziar o arquivo database/data.json acidentalmente
  if (agendamentos.length === 0 && !permiteEsvaziar) {
    const existentes = carregarDadosLocais();
    if (existentes.agendamentos.length > 0) {
      console.warn('Proteção de integridade: preservando agendamentos existentes em disco contra sobreposição vazia.');
      agendamentos = existentes.agendamentos;
    }
  }

  // 2. Atualiza a memória em primeiro lugar
  memoryStore.clientes = clientes;
  memoryStore.agendamentos = agendamentos;

  const jsonStr = JSON.stringify({ clientes, agendamentos }, null, 2);

  // 3. Grava no arquivo do projeto (database/data.json)
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, jsonStr, 'utf-8');
  } catch (err) {
    // Pode falhar em ambiente serverless com sistema de arquivos somente leitura (Vercel)
  }

  // 4. Grava também no TMP como fallback garantido para ambientes serverless
  try {
    fs.writeFileSync(TMP_FILE, jsonStr, 'utf-8');
  } catch (err) {
    // Ignora
  }
}

// Inicializa a carga dos dados
carregarDadosLocais();

// ==============================================================
// CONSULTA SQL ROBUSTA E COMPATÍVEL
// ==============================================================
const SQL_SELECT_AGENDAMENTOS = `
  SELECT 
    a.id, 
    to_char(a.data, 'YYYY-MM-DD') AS data, 
    to_char(a.horario_inicio, 'HH24:MI') AS horario_inicio, 
    to_char(a.horario_fim, 'HH24:MI') AS horario_fim, 
    a.duracao_total_minutos, 
    a.valor_total, 
    a.forma_pagamento, 
    a.status, 
    a.observacoes, 
    a.created_at, 
    c.id AS id_cliente,
    c.id AS cliente_id, 
    c.nome AS cliente_nome, 
    c.telefone AS cliente_telefone, 
    COALESCE(string_agg(s.nome_servico, ' + ' ORDER BY s.nome_servico), 'Nenhum serviço especificado') AS lista_servicos
  FROM agendamentos a
  JOIN clientes c ON a.id_cliente = c.id
  LEFT JOIN agendamento_servicos asv ON a.id = asv.id_agendamento
  LEFT JOIN servicos s ON asv.id_servico = s.id
`;

const SQL_GROUP_BY_AGENDAMENTOS = `
  GROUP BY a.id, a.data, a.horario_inicio, a.horario_fim, a.duracao_total_minutos, a.valor_total, a.forma_pagamento, a.status, a.observacoes, a.created_at, c.id, c.nome, c.telefone
`;

// ==============================================================
// SERVIÇOS
// ==============================================================
export async function listarServicos(): Promise<Servico[]> {
  if (process.env.DATABASE_URL) {
    try {
      const res = await pool.query('SELECT * FROM servicos WHERE ativo = true ORDER BY categoria, nome_servico');
      if (res.rows && res.rows.length > 0) {
        return res.rows;
      }

      // Se tabela servicos estiver vazia no PostgreSQL, auto-popula com a tabela oficial de Samara Designer
      for (const s of catalogoServicos) {
        await pool.query(
          `INSERT INTO servicos (id, nome_servico, categoria, valor_base, duracao_minutos, ativo)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO NOTHING`,
          [s.id, s.nome_servico, s.categoria, s.valor_base, s.duracao_minutos, true]
        );
      }

      const resPosSeed = await pool.query('SELECT * FROM servicos WHERE ativo = true ORDER BY categoria, nome_servico');
      if (resPosSeed.rows && resPosSeed.rows.length > 0) {
        return resPosSeed.rows;
      }
    } catch (err) {
      console.warn('Erro ao consultar/popular PostgreSQL para serviços. Usando catálogo local.', err);
    }
  }
  return catalogoServicos.filter((s) => s.ativo);
}

// ==============================================================
// CLIENTES
// ==============================================================
export async function buscarClientes(termo?: string): Promise<Cliente[]> {
  if (process.env.DATABASE_URL) {
    try {
      if (termo && termo.trim()) {
        const query = `
          SELECT id, nome, telefone, observacoes FROM clientes 
          WHERE nome ILIKE $1 OR telefone ILIKE $1 
          ORDER BY nome LIMIT 15
        `;
        const res = await pool.query(query, [`%${termo}%`]);
        if (res.rows) return res.rows;
      }
      const res = await pool.query('SELECT id, nome, telefone, observacoes FROM clientes ORDER BY nome LIMIT 20');
      if (res.rows) return res.rows;
    } catch (err) {
      console.warn('Erro ao consultar clientes no PostgreSQL. Usando armazenamento local.', err);
    }
  }

  const { clientes } = carregarDadosLocais();
  if (termo && termo.trim()) {
    const t = termo.toLowerCase();
    return clientes.filter((c) => c.nome.toLowerCase().includes(t) || c.telefone.includes(t));
  }
  return clientes;
}

export async function obterOuCriarCliente(dados: {
  id?: string;
  nome: string;
  telefone: string;
  observacoes?: string;
}): Promise<Cliente> {
  const telefoneSanitizado = dados.telefone.trim();

  if (process.env.DATABASE_URL) {
    try {
      // Procura por ID se for UUID válido
      if (dados.id && dados.id.length >= 32) {
        const res = await pool.query('SELECT id, nome, telefone, observacoes FROM clientes WHERE id::text = $1', [dados.id]);
        if (res.rows[0]) return res.rows[0];
      }
      // Procura por telefone antes de criar
      const busca = await pool.query('SELECT id, nome, telefone, observacoes FROM clientes WHERE telefone = $1', [telefoneSanitizado]);
      if (busca.rows[0]) {
        return busca.rows[0];
      }
      // Cria novo no banco
      const ins = await pool.query(
        'INSERT INTO clientes (nome, telefone, observacoes) VALUES ($1, $2, $3) RETURNING id, nome, telefone, observacoes',
        [dados.nome.trim(), telefoneSanitizado, dados.observacoes?.trim() || null]
      );
      if (ins.rows[0]) {
        const dadosLocais = carregarDadosLocais();
        const achadoLocal = dadosLocais.clientes.find((c) => c.telefone === telefoneSanitizado);
        if (!achadoLocal) {
          dadosLocais.clientes.push(ins.rows[0]);
          salvarDadosLocais(dadosLocais.clientes, dadosLocais.agendamentos);
        }
        return ins.rows[0];
      }
    } catch (err) {
      console.warn('Erro ao obter/criar cliente no PostgreSQL. Usando armazenamento local.', err);
    }
  }

  const dadosLocais = carregarDadosLocais();
  if (dados.id) {
    const achado = dadosLocais.clientes.find((c) => c.id === dados.id);
    if (achado) return achado;
  }
  const existentePorTelefone = dadosLocais.clientes.find((c) => c.telefone === telefoneSanitizado);
  if (existentePorTelefone) return existentePorTelefone;

  const novoCliente: Cliente = {
    id: `cli-${Date.now()}`,
    nome: dados.nome.trim(),
    telefone: telefoneSanitizado,
    observacoes: dados.observacoes?.trim(),
  };
  dadosLocais.clientes.push(novoCliente);
  salvarDadosLocais(dadosLocais.clientes, dadosLocais.agendamentos);
  return novoCliente;
}

// ==============================================================
// AGENDAMENTOS: LISTAR POR DATA (TODOS OS STATUS: CONFIRMADO, PENDENTE, CANCELADO)
// ==============================================================
export async function listarAgendamentosPorData(data: string): Promise<Agendamento[]> {
  const dataAlvo = data.substring(0, 10);

  if (process.env.DATABASE_URL) {
    try {
      const sql = `${SQL_SELECT_AGENDAMENTOS} WHERE to_char(a.data, 'YYYY-MM-DD') = $1 ${SQL_GROUP_BY_AGENDAMENTOS} ORDER BY a.horario_inicio ASC`;
      const res = await pool.query(sql, [dataAlvo]);
      if (res && res.rows && res.rows.length > 0) {
        return res.rows;
      }
    } catch (err) {
      console.warn('Erro ao listar agendamentos do PostgreSQL. Usando armazenamento local.', err);
    }
  }

  // Retorna todos os agendamentos reais persistidos na data selecionada
  const { agendamentos } = carregarDadosLocais();
  return agendamentos
    .filter((a) => (a.data ? a.data.substring(0, 10) === dataAlvo : false))
    .sort((a, b) => a.horario_inicio.localeCompare(b.horario_inicio));
}

// ==============================================================
// AGENDAMENTOS: LISTAR PENDENTES (FILA GERAL FIFO)
// ==============================================================
export async function listarAgendamentosPendentes(): Promise<Agendamento[]> {
  if (process.env.DATABASE_URL) {
    try {
      const sql = `${SQL_SELECT_AGENDAMENTOS} WHERE a.status = 'Pendente' ${SQL_GROUP_BY_AGENDAMENTOS} ORDER BY a.created_at ASC, a.data ASC, a.horario_inicio ASC`;
      const res = await pool.query(sql);
      if (res && res.rows && res.rows.length > 0) {
        return res.rows;
      }
    } catch (err) {
      console.warn('Erro ao listar agendamentos pendentes do PostgreSQL. Usando armazenamento local.', err);
    }
  }

  const { agendamentos } = carregarDadosLocais();
  return agendamentos
    .filter((a) => a.status === 'Pendente')
    .sort((a, b) => {
      if (a.created_at && b.created_at) {
        const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        if (diff !== 0) return diff;
      }
      const cmpData = (a.data || '').localeCompare(b.data || '');
      if (cmpData !== 0) return cmpData;
      return a.horario_inicio.localeCompare(b.horario_inicio);
    });
}

// ==============================================================
// AGENDAMENTOS: CONSULTAR POR ID
// ==============================================================
export async function obterAgendamentoPorId(id: string): Promise<Agendamento | null> {
  if (process.env.DATABASE_URL) {
    try {
      const sql = `${SQL_SELECT_AGENDAMENTOS} WHERE a.id::text = $1 ${SQL_GROUP_BY_AGENDAMENTOS} LIMIT 1`;
      const res = await pool.query(sql, [id]);
      if (res && res.rows[0]) {
        return res.rows[0];
      }
    } catch (err) {
      console.warn('Erro ao consultar agendamento por ID no PostgreSQL. Usando armazenamento local.', err);
    }
  }

  const { agendamentos } = carregarDadosLocais();
  const achado = agendamentos.find((a) => a.id === id);
  return achado || null;
}

// ==============================================================
// AGENDAMENTOS: CRIAR (COM PERSISTÊNCIA DUAL POSTGRESQL + MULTI-CAMADA)
// ==============================================================
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
  const dataFormatada = dto.data.substring(0, 10);
  const horarioInicioFormatado = dto.horario_inicio.substring(0, 5);

  if (process.env.DATABASE_URL) {
    let client;
    try {
      client = await pool.connect();
      await client.query('BEGIN');

      // Garante que o cliente existe no Postgres com ID válido
      let idClientePg = cliente.id;
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cliente.id);
      if (!isUUID) {
        const buscaCli = await client.query(
          'SELECT id FROM clientes WHERE telefone = $1 LIMIT 1',
          [cliente.telefone]
        );
        if (buscaCli.rows[0]) {
          idClientePg = buscaCli.rows[0].id;
        } else {
          const novoCliPg = await client.query(
            'INSERT INTO clientes (nome, telefone, observacoes) VALUES ($1, $2, $3) RETURNING id',
            [cliente.nome, cliente.telefone, cliente.observacoes || null]
          );
          idClientePg = novoCliPg.rows[0].id;
        }
      }

      // Validação de conflito de horário no PostgreSQL
      const checkConflict = await client.query(
        `SELECT a.id, to_char(a.horario_inicio, 'HH24:MI') as horario_inicio, to_char(a.horario_fim, 'HH24:MI') as horario_fim, c.nome AS cliente_nome
         FROM agendamentos a
         JOIN clientes c ON a.id_cliente = c.id
         WHERE to_char(a.data, 'YYYY-MM-DD') = $1
           AND a.status != 'Cancelado'
           AND (a.horario_inicio < $3::time AND a.horario_fim > $2::time)
         LIMIT 1`,
        [dataFormatada, horarioInicioFormatado, horarioFim]
      );

      if (checkConflict.rows[0]) {
        const c = checkConflict.rows[0];
        throw new Error(
          `Conflito de horário! O intervalo pretendido (${horarioInicioFormatado} às ${horarioFim}) colide com o atendimento de "${c.cliente_nome}" (${c.horario_inicio} às ${c.horario_fim}).`
        );
      }

      const insAg = await client.query(
        `INSERT INTO agendamentos 
         (id_cliente, data, horario_inicio, horario_fim, duracao_total_minutos, valor_total, forma_pagamento, status, observacoes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, to_char(data, 'YYYY-MM-DD') as data, to_char(horario_inicio, 'HH24:MI') as horario_inicio, to_char(horario_fim, 'HH24:MI') as horario_fim, duracao_total_minutos, valor_total, forma_pagamento, status, observacoes, created_at`,
        [
          idClientePg,
          dataFormatada,
          horarioInicioFormatado,
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
        try {
          await client.query(
            `INSERT INTO servicos (id, nome_servico, categoria, valor_base, duracao_minutos, ativo)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (id) DO NOTHING`,
            [s.id, s.nome_servico, s.categoria, s.valor_base, s.duracao_minutos, true]
          );
          await client.query(
            `INSERT INTO agendamento_servicos (id_agendamento, id_servico, valor_cobrado, duracao_minutos)
             VALUES ($1, $2, $3, $4)`,
            [agendamentoCriado.id, s.id, s.valor_base, s.duracao_minutos]
          );
        } catch (sErr) {
          console.warn('Aviso: item de serviço salvo parcialmente no Postgres:', sErr);
        }
      }

      await client.query('COMMIT');

      const retornoPg: Agendamento = {
        ...agendamentoCriado,
        id_cliente: idClientePg,
        cliente_id: idClientePg,
        cliente_nome: cliente.nome,
        cliente_telefone: cliente.telefone,
        lista_servicos: listaServicosTexto,
      };

      // Espelha no armazenamento local
      const dadosLocais = carregarDadosLocais();
      const idxLocal = dadosLocais.agendamentos.findIndex((a) => a.id === retornoPg.id);
      if (idxLocal >= 0) {
        dadosLocais.agendamentos[idxLocal] = retornoPg;
      } else {
        dadosLocais.agendamentos.push(retornoPg);
      }
      salvarDadosLocais(dadosLocais.clientes, dadosLocais.agendamentos);

      return retornoPg;
    } catch (err: any) {
      if (client) {
        try {
          await client.query('ROLLBACK');
        } catch (rbErr) {}
      }
      if (err.message && err.message.includes('Conflito de horário')) {
        throw err;
      }
      console.warn('Erro ao inserir agendamento no PostgreSQL. Usando armazenamento local resiliente.', err);
    } finally {
      if (client) {
        try {
          client.release();
        } catch (relErr) {}
      }
    }
  }

  // Fallback em armazenamento local com validação estrita de sobreposição
  const dadosLocais = carregarDadosLocais();
  const conflitoMemoria = dadosLocais.agendamentos.find(
    (a) =>
      a.data?.substring(0, 10) === dataFormatada &&
      a.status !== 'Cancelado' &&
      haConflitoDeHorario(horarioInicioFormatado, horarioFim, a.horario_inicio, a.horario_fim)
  );

  if (conflitoMemoria) {
    const hInicio = conflitoMemoria.horario_inicio.substring(0, 5);
    const hFim = conflitoMemoria.horario_fim.substring(0, 5);
    throw new Error(
      `Conflito de horário! O intervalo pretendido (${horarioInicioFormatado} às ${horarioFim}) colide com o atendimento de "${conflitoMemoria.cliente_nome}" (${hInicio} às ${hFim}).`
    );
  }

  const novoAgendamento: Agendamento = {
    id: `ag-${Date.now()}`,
    id_cliente: cliente.id,
    cliente_nome: cliente.nome,
    cliente_telefone: cliente.telefone,
    data: dataFormatada,
    horario_inicio: horarioInicioFormatado,
    horario_fim: horarioFim,
    duracao_total_minutos: duracaoTotal,
    valor_total: valorTotal,
    forma_pagamento: dto.forma_pagamento,
    status: dto.status || 'Confirmado',
    observacoes: dto.observacoes,
    lista_servicos: listaServicosTexto,
    created_at: new Date().toISOString(),
  };

  dadosLocais.agendamentos.push(novoAgendamento);
  salvarDadosLocais(dadosLocais.clientes, dadosLocais.agendamentos);
  return novoAgendamento;
}

// ==============================================================
// AGENDAMENTOS: ATUALIZAR STATUS (CONFIRMADO, CANCELADO, ETC.)
// ==============================================================
export async function atualizarStatusAgendamento(
  id: string,
  novoStatus: StatusAgendamento
): Promise<Agendamento | null> {
  let resultado: Agendamento | null = null;

  if (process.env.DATABASE_URL) {
    try {
      await pool.query(
        `UPDATE agendamentos 
         SET status = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE id::text = $2`,
        [novoStatus, id]
      );
      const sql = `${SQL_SELECT_AGENDAMENTOS} WHERE a.id::text = $1 ${SQL_GROUP_BY_AGENDAMENTOS} LIMIT 1`;
      const res = await pool.query(sql, [id]);
      if (res && res.rows[0]) {
        resultado = res.rows[0];
      }
    } catch (err) {
      console.warn('Erro ao atualizar status no PostgreSQL. Usando armazenamento local.', err);
    }
  }

  // Atualiza no armazenamento persistente local
  const dadosLocais = carregarDadosLocais();
  const idx = dadosLocais.agendamentos.findIndex((a) => a.id === id);
  if (idx !== -1) {
    dadosLocais.agendamentos[idx].status = novoStatus;
    if (!resultado) {
      resultado = dadosLocais.agendamentos[idx];
    }
  } else if (resultado) {
    dadosLocais.agendamentos.push(resultado);
  }

  salvarDadosLocais(dadosLocais.clientes, dadosLocais.agendamentos);
  return resultado;
}

// ==============================================================
// AGENDAMENTOS: EXCLUIR
// ==============================================================
export async function excluirAgendamento(id: string): Promise<boolean> {
  let excluiuPg = false;

  if (process.env.DATABASE_URL) {
    try {
      await pool.query('DELETE FROM agendamento_servicos WHERE id_agendamento::text = $1', [id]);
      const res = await pool.query('DELETE FROM agendamentos WHERE id::text = $1 RETURNING id', [id]);
      excluiuPg = (res.rowCount ?? 0) > 0;
    } catch (err) {
      console.warn('Erro ao excluir agendamento no PostgreSQL. Usando armazenamento local.', err);
    }
  }

  const dadosLocais = carregarDadosLocais();
  const idx = dadosLocais.agendamentos.findIndex((a) => a.id === id);
  let excluiuLocal = false;
  if (idx !== -1) {
    dadosLocais.agendamentos.splice(idx, 1);
    salvarDadosLocais(dadosLocais.clientes, dadosLocais.agendamentos, true);
    excluiuLocal = true;
  }

  return excluiuPg || excluiuLocal;
}
