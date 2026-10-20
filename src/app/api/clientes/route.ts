import { NextRequest, NextResponse } from 'next/server';
import { buscarClientes, obterOuCriarCliente } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const termo = searchParams.get('busca') || '';
    const clientes = await buscarClientes(termo);
    return NextResponse.json(
      { success: true, data: clientes },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('Erro ao buscar clientes:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar clientes' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.nome || !body.telefone) {
      return NextResponse.json(
        { success: false, error: 'Nome e telefone são obrigatórios' },
        { status: 400 }
      );
    }

    const cliente = await obterOuCriarCliente(body);
    return NextResponse.json({ success: true, data: cliente }, { status: 201 });
  } catch (error) {
    console.error('Erro ao cadastrar cliente:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao cadastrar cliente' },
      { status: 500 }
    );
  }
}
