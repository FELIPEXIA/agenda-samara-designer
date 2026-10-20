import { NextRequest, NextResponse } from 'next/server';
import { listarAgendamentosPorData, listarAgendamentosPendentes, criarAgendamento } from '@/lib/db';
import { CriarAgendamentoDTO } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pendentesOnly = searchParams.get('pendentes') === 'true' || searchParams.get('status') === 'Pendente';

    if (pendentesOnly) {
      const agendamentosPendentes = await listarAgendamentosPendentes();
      return NextResponse.json({ success: true, data: agendamentosPendentes });
    }

    const data = searchParams.get('data') || new Date().toISOString().split('T')[0];

    const agendamentos = await listarAgendamentosPorData(data);
    return NextResponse.json({ success: true, data: agendamentos });
  } catch (error) {
    console.error('Erro ao buscar agendamentos:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar agendamentos' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: CriarAgendamentoDTO = await req.json();

    if (!body.cliente?.nome || !body.cliente?.telefone) {
      return NextResponse.json(
        { success: false, error: 'Dados da cliente são obrigatórios' },
        { status: 400 }
      );
    }

    if (!body.data || !body.horario_inicio) {
      return NextResponse.json(
        { success: false, error: 'Data e horário de início são obrigatórios' },
        { status: 400 }
      );
    }

    if (!body.servicos_ids || body.servicos_ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Selecione ao menos um serviço' },
        { status: 400 }
      );
    }

    const novoAgendamento = await criarAgendamento(body);
    return NextResponse.json({ success: true, data: novoAgendamento }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao criar agendamento:', error);
    const mensagem = error?.message || 'Erro ao processar agendamento';
    const isConflito = mensagem.includes('Conflito de horário');
    return NextResponse.json(
      { success: false, error: mensagem },
      { status: isConflito ? 409 : 500 }
    );
  }
}
