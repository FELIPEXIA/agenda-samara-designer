'use client';

import React from 'react';
import { User, Phone } from 'lucide-react';
import { formatarTelefone } from '@/lib/formatters';

interface ClienteDestaqueProps {
  nome: string;
  telefone?: string;
  tag?: string;
  tamanho?: 'grande' | 'medio';
  destaqueCor?: 'primaria' | 'alerta';
}

export const ClienteDestaque: React.FC<ClienteDestaqueProps> = ({
  nome,
  telefone,
  tag = 'CLIENTE AGENDADA',
  tamanho = 'grande',
  destaqueCor = 'primaria',
}) => {
  const isMedio = tamanho === 'medio';
  const isAlerta = destaqueCor === 'alerta';

  const corTag = isAlerta ? '#dc2626' : 'var(--primary)';
  const bgAvatar = isAlerta ? '#fee2e2' : 'var(--primary-soft)';
  const corAvatar = isAlerta ? '#dc2626' : 'var(--primary)';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        backgroundColor: 'var(--bg-card-subtle)',
        padding: isMedio ? '10px 14px' : '14px 18px',
        borderRadius: 'var(--radius-sm)',
        border: `1px solid ${isAlerta ? '#fca5a5' : 'var(--border-color)'}`,
        width: '100%',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
        {/* Avatar Circular */}
        <div
          style={{
            width: isMedio ? '38px' : '44px',
            height: isMedio ? '38px' : '44px',
            borderRadius: '50%',
            backgroundColor: bgAvatar,
            color: corAvatar,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 2px 8px rgba(194, 89, 117, 0.18)',
          }}
        >
          <User size={isMedio ? 20 : 24} />
        </div>

        {/* Informações da Cliente: Tag + Nome Gigante */}
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              color: corTag,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              lineHeight: 1,
              marginBottom: '3px',
            }}
          >
            {tag}
          </div>
          <h2
            style={{
              fontSize: isMedio ? '1.25rem' : '1.45rem',
              fontWeight: 800,
              color: 'var(--text-main)',
              letterSpacing: '-0.015em',
              lineHeight: 1.2,
              wordBreak: 'break-word',
              margin: 0,
            }}
          >
            {nome}
          </h2>
        </div>
      </div>

      {/* Telefone Formatado ao Lado */}
      {telefone && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.875rem',
            fontWeight: 700,
            color: 'var(--text-muted)',
            backgroundColor: '#ffffff',
            padding: '6px 12px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            flexShrink: 0,
          }}
        >
          <Phone size={14} color="var(--primary)" />
          <span>{formatarTelefone(telefone)}</span>
        </div>
      )}
    </div>
  );
};
