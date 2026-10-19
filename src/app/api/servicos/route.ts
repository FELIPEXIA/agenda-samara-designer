import { NextResponse } from 'next/server';
import { listarServicos } from '@/lib/db';

export async function GET() {
  try {
    const servicos = await listarServicos();
    return NextResponse.json({ success: true, data: servicos });
  } catch (error) {
    console.error('Erro ao listar serviços:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao carregar serviços' },
      { status: 500 }
    );
  }
}
