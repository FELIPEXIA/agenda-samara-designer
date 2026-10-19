'use client';

import React from 'react';
import { MessageCircle } from 'lucide-react';
import { criarLinkWhatsApp } from '@/lib/whatsapp';

interface BotaoWhatsappProps {
  clienteNome: string;
  clienteTelefone: string;
  data: string;
  horarioInicio: string;
  horarioFim?: string;
  servicosTexto: string;
  valorTotal: number;
  estilo?: 'completo' | 'icone';
}

export const BotaoWhatsapp: React.FC<BotaoWhatsappProps> = ({
  clienteNome,
  clienteTelefone,
  data,
  horarioInicio,
  horarioFim,
  servicosTexto,
  valorTotal,
  estilo = 'completo',
}) => {
  const link = criarLinkWhatsApp({
    clienteNome,
    clienteTelefone,
    data,
    horarioInicio,
    horarioFim,
    servicosTexto,
    valorTotal,
  });

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      title="Enviar confirmação pelo WhatsApp"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        backgroundColor: '#25D366',
        color: '#ffffff',
        padding: estilo === 'completo' ? '6px 12px' : '8px',
        borderRadius: 'var(--radius-sm)',
        fontSize: '0.8125rem',
        fontWeight: 600,
        textDecoration: 'none',
        boxShadow: '0 2px 6px rgba(37, 211, 102, 0.25)',
        transition: 'transform 0.15s ease, background-color 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.backgroundColor = '#20bd5a';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.backgroundColor = '#25D366';
      }}
    >
      <MessageCircle size={16} />
      {estilo === 'completo' && <span>Avisar no WhatsApp</span>}
    </a>
  );
};
