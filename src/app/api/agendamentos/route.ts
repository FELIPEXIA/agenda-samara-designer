import { NextRequest, NextResponse } from 'next/server';
import { listarAgendamentosPorData, listarAgendamentosPendentes, criarAgendamento } from '@/lib/db';
import { CriarAgendamentoDTO } from '@/types';
import { obterDataHojeLocal } from '@/lib/formatters';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pendentesOnly = searchParams.get('pendentes') === 'true' || searchParams.get('status') === 'Pendente';

    if (pendentesOnly) {
      const agendamentosPendentes = await listarAgendamentosPendentes();
      return NextResponse.json(
        { success: true, data: agendamentosPendentes },
        { headers: NO_CACHE_HEADERS }
      );
    }

    const data = searchParams.get('data') || obterDataHojeLocal();

    const agendamentos = await listarAgendamentosPorData(data);
    return NextResponse.json(
      { success: true, data: agendamentos },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error('Erro ao buscar agendamentos:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar agendamentos' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const raw: any = await req.json();

    // Normalização flexível de payload (suporta tanto objeto 'cliente' aninhado quanto campos planos)
    const clienteNome = (
      raw.cliente?.nome ||
      raw.cliente_nome ||
      raw.nome_cliente ||
      raw.nome ||
      raw.clientName ||
      ''
    ).trim();

    const clienteTelefone = (
      raw.cliente?.telefone ||
      raw.cliente_telefone ||
      raw.telefone_cliente ||
      raw.telefone ||
      raw.phone ||
      ''
    ).trim();

    const clienteObs = (
      raw.cliente?.observacoes ||
      raw.cliente_observacoes ||
      raw.observacoes ||
      ''
    ).trim();

    if (!clienteNome || !clienteTelefone) {
      return NextResponse.json(
        { success: false, error: 'Nome e telefone da cliente são obrigatórios' },
        { status: 400 }
      );
    }

    // Normalização de data e horário
    let data = (raw.data || raw.date || '').trim();
    let horarioInicio = (raw.horario_inicio || raw.horario || raw.time || '').trim();

    if ((!data || !horarioInicio) && raw.data_hora) {
      const dt = new Date(raw.data_hora);
      if (!isNaN(dt.getTime())) {
        if (!data) data = dt.toISOString().split('T')[0];
        if (!horarioInicio) horarioInicio = dt.toISOString().split('T')[1].substring(0, 5);
      }
    }

    if (!data || !horarioInicio) {
      return NextResponse.json(
        { success: false, error: 'Data e horário de início são obrigatórios' },
        { status: 400 }
      );
    }

    // Normalização de serviços (aceita servicos_ids, servico_id único ou lista de objetos)
    let servicosIds: string[] = [];
    if (Array.isArray(raw.servicos_ids) && raw.servicos_ids.length > 0) {
      servicosIds = raw.servicos_ids.filter(Boolean);
    } else if (raw.servico_id) {
      servicosIds = [raw.servico_id];
    } else if (raw.serviceId) {
      servicosIds = [raw.serviceId];
    } else if (Array.isArray(raw.services) && raw.services.length > 0) {
      servicosIds = raw.services.map((s: any) => (typeof s === 'string' ? s : s?.id)).filter(Boolean);
    }

    if (servicosIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Selecione ao menos um serviço' },
        { status: 400 }
      );
    }

    const payload: CriarAgendamentoDTO = {
      cliente: {
        nome: clienteNome,
        telefone: clienteTelefone,
        observacoes: clienteObs,
      },
      data,
      horario_inicio: horarioInicio,
      servicos_ids: servicosIds,
      forma_pagamento: raw.forma_pagamento || raw.payment_method || 'A combinar',
      status: raw.status || 'Pendente',
      observacoes: clienteObs,
    };

    const novoAgendamento = await criarAgendamento(payload);
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
