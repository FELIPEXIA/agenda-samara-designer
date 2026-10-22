import { NextRequest, NextResponse } from 'next/server';
import { atualizarStatusAgendamento, obterAgendamentoPorId, excluirAgendamento } from '@/lib/db';
import { StatusAgendamento } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const { id } = resolvedParams;
    const agendamento = await obterAgendamentoPorId(id);

    if (!agendamento) {
      return NextResponse.json(
        { success: false, error: 'Agendamento não encontrado' },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json({ success: true, data: agendamento }, { headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error('Erro ao buscar agendamento por ID:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao carregar agendamento' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const { id } = resolvedParams;
    const body = await req.json();
    const novoStatus: StatusAgendamento = body.status;

    if (!novoStatus) {
      return NextResponse.json(
        { success: false, error: 'Status não informado' },
        { status: 400 }
      );
    }

    const atualizado = await atualizarStatusAgendamento(id, novoStatus);

    if (!atualizado) {
      return NextResponse.json(
        { success: false, error: 'Agendamento não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: atualizado });
  } catch (error) {
    console.error('Erro ao atualizar status do agendamento:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar status' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const { id } = resolvedParams;
    const deletado = await excluirAgendamento(id);

    if (!deletado) {
      return NextResponse.json(
        { success: false, error: 'Agendamento não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Agendamento excluído com sucesso.',
    });
  } catch (error) {
    console.error('Erro ao excluir agendamento:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao excluir agendamento' },
      { status: 500 }
    );
  }
}
