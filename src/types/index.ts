export type StatusAgendamento = 'Confirmado' | 'Pendente' | 'Cancelado' | 'Concluido';

export type FormaPagamento = 'Pix' | 'Dinheiro' | 'Cartao_Credito' | 'Cartao_Debito' | 'A_Definir';

export interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  observacoes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Servico {
  id: string;
  nome_servico: string;
  categoria: string;
  valor_base: number;
  duracao_minutos: number;
  ativo: boolean;
  created_at?: string;
}

export interface AgendamentoServicoItem {
  id_servico: string;
  nome_servico: string;
  valor_cobrado: number;
  duracao_minutos: number;
}

export interface Agendamento {
  id: string;
  id_cliente: string;
  cliente_id?: string;
  cliente_nome: string;
  cliente_telefone: string;
  data: string; // YYYY-MM-DD
  horario_inicio: string; // HH:mm
  horario_fim: string; // HH:mm
  duracao_total_minutos: number;
  valor_total: number;
  forma_pagamento: FormaPagamento;
  status: StatusAgendamento;
  observacoes?: string | null;
  lista_servicos?: string;
  servicos_detalhados?: AgendamentoServicoItem[];
  created_at?: string;
}

export interface CriarAgendamentoDTO {
  cliente: {
    id?: string; // se já existir
    nome: string;
    telefone: string;
    observacoes?: string;
  };
  data: string; // YYYY-MM-DD
  horario_inicio: string; // HH:mm
  servicos_ids: string[];
  forma_pagamento: FormaPagamento;
  status?: StatusAgendamento;
  observacoes?: string;
}
