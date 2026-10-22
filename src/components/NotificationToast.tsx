'use client';

import React from 'react';
import { Agendamento } from '@/types';
import { formatarHorario, formatarMoeda } from '@/lib/formatters';

interface NotificationToastProps {
  agendamento: Agendamento | null;
  onFechar: () => void;
  onVerDetalhes: (agendamento: Agendamento) => void;
  somHabilitado: boolean;
  onToggleSom: () => void;
  onTestarSom: () => void;
}

export function NotificationToast({
  agendamento,
  onFechar,
  onVerDetalhes,
  somHabilitado,
  onToggleSom,
  onTestarSom,
}: NotificationToastProps) {
  if (!agendamento) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        maxWidth: '380px',
        width: 'calc(100vw - 40px)',
        background: 'linear-gradient(135deg, #1e1e24 0%, #2b1f2d 100%)',
        color: '#ffffff',
        borderRadius: '16px',
        padding: '16px',
        boxShadow: '0 12px 32px rgba(219, 39, 119, 0.25), 0 4px 16px rgba(0,0,0,0.4)',
        border: '1px solid rgba(244, 114, 182, 0.35)',
        animation: 'slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <style>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(40px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            flexShrink: 0,
            boxShadow: '0 4px 12px rgba(236, 72, 153, 0.4)',
          }}
        >
          ✨
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#f472b6',
              }}
            >
              Novo Agendamento Recebido
            </span>
            <button
              onClick={onFechar}
              aria-label="Fechar notificação"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#9ca3af',
                cursor: 'pointer',
                fontSize: '16px',
                lineHeight: 1,
                padding: '2px',
              }}
            >
              ✕
            </button>
          </div>

          <h4
            style={{
              margin: '0 0 4px 0',
              fontSize: '15px',
              fontWeight: 700,
              color: '#ffffff',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {agendamento.cliente_nome}
          </h4>

          <p
            style={{
              margin: '0 0 10px 0',
              fontSize: '13px',
              color: '#d1d5db',
              lineHeight: 1.3,
            }}
          >
            <strong>{agendamento.lista_servicos || 'Serviço agendado'}</strong>
            <br />
            📅 {agendamento.data} às {formatarHorario(agendamento.horario_inicio)}
            {agendamento.valor_total ? ` • ${formatarMoeda(agendamento.valor_total)}` : ''}
          </p>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => onVerDetalhes(agendamento)}
              style={{
                flex: 1,
                padding: '8px 12px',
                background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(236, 72, 153, 0.3)',
              }}
            >
              Visualizar Agendamento
            </button>

            <button
              onClick={onToggleSom}
              title={somHabilitado ? 'Som ativo (clique para silenciar)' : 'Som mutado (clique para ativar)'}
              style={{
                padding: '8px 10px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                color: somHabilitado ? '#fb7185' : '#9ca3af',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              {somHabilitado ? '🔔' : '🔕'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
