'use client';

import React from 'react';
import { CalendarX, PlusCircle } from 'lucide-react';
import { Agendamento, StatusAgendamento } from '@/types';
import { CardAgendamento } from './CardAgendamento';

interface TimelineDiariaProps {
  agendamentos: Agendamento[];
  onAtualizarStatus: (id: string, novoStatus: StatusAgendamento) => Promise<void>;
  onExcluir?: (id: string) => Promise<void>;
  onAbrirNovoModal: () => void;
  carregando?: boolean;
  agendamentoDestacadoId?: string | null;
}

export const TimelineDiaria: React.FC<TimelineDiariaProps> = ({
  agendamentos,
  onAtualizarStatus,
  onExcluir,
  onAbrirNovoModal,
  carregando = false,
  agendamentoDestacadoId = null,
}) => {
  if (carregando) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 20px',
          backgroundColor: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          color: 'var(--text-muted)',
          gap: '12px',
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            border: '3px solid var(--primary-border)',
            borderTopColor: 'var(--primary)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <style jsx>{`
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
        <span style={{ fontSize: '0.9375rem' }}>Carregando agendamentos...</span>
      </div>
    );
  }

  if (agendamentos.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 20px',
          backgroundColor: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '2px dashed var(--border-color)',
          textAlign: 'center',
          gap: '16px',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'var(--primary-soft)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CalendarX size={32} />
        </div>

        <div>
          <h3
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.25rem',
              fontWeight: 600,
              color: 'var(--text-main)',
            }}
          >
            Nenhum agendamento neste dia
          </h3>
          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--text-muted)',
              marginTop: '4px',
              maxWidth: '380px',
            }}
          >
            A agenda está livre para novos horários. Clique abaixo para cadastrar um novo atendimento.
          </p>
        </div>

        <button
          onClick={onAbrirNovoModal}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            backgroundColor: 'var(--primary)',
            color: '#fff',
            borderRadius: 'var(--radius-md)',
            fontWeight: 600,
            fontSize: '0.875rem',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <PlusCircle size={16} />
          Agendar Primeiro Horário
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {agendamentos.map((agendamento) => (
        <CardAgendamento
          key={agendamento.id}
          agendamento={agendamento}
          onAtualizarStatus={onAtualizarStatus}
          onExcluir={onExcluir}
          destacado={agendamento.id === agendamentoDestacadoId}
        />
      ))}
    </div>
  );
};
