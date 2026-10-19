'use client';

import React from 'react';
import { Sparkles, CalendarPlus, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { Agendamento } from '@/types';
import { formatarMoeda } from '@/lib/formatters';

interface HeaderResumoProps {
  agendamentos: Agendamento[];
  onAbrirModalNovo: () => void;
}

export const HeaderResumo: React.FC<HeaderResumoProps> = ({
  agendamentos,
  onAbrirModalNovo,
}) => {
  const confirmados = agendamentos.filter((a) => a.status === 'Confirmado');
  const pendentes = agendamentos.filter((a) => a.status === 'Pendente');
  
  // Total previsto apenas de agendamentos confirmados ou pendentes
  const faturamentoPrevisto = agendamentos
    .filter((a) => a.status !== 'Cancelado')
    .reduce((acc, curr) => acc + Number(curr.valor_total || 0), 0);

  return (
    <header
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        padding: '24px',
        backgroundColor: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-md)',
        border: '1px solid var(--border-color)',
        marginBottom: '24px',
      }}
    >
      {/* Topo: Logo & Botão de Ação */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                background: 'var(--primary-soft)',
                color: 'var(--primary)',
                padding: '6px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles size={20} />
            </span>
            <h1
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.75rem',
                fontWeight: 600,
                color: 'var(--text-main)',
                letterSpacing: '-0.02em',
              }}
            >
              Samara Designer
            </h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '4px' }}>
            Manicure, Nail Designer em Gel & Sobrancelhas
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Botão Copiar Link Público de Autoatendimento */}
          <button
            onClick={() => {
              const url = `${window.location.origin}/agendar`;
              navigator.clipboard.writeText(url);
              alert('✨ Link de autoatendimento copiado com sucesso!\n\nEnvie para suas clientes:\n' + url);
            }}
            title="Copiar link público para enviar às clientes"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'var(--bg-main)',
              color: 'var(--primary)',
              border: '1.5px solid var(--primary)',
              padding: '11px 16px',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--primary-soft)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-main)';
            }}
          >
            <span>🔗 Copiar Link Público</span>
          </button>

          <button
            onClick={onAbrirModalNovo}
            id="btn-novo-agendamento"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'var(--primary)',
              color: '#ffffff',
              padding: '12px 20px',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              fontSize: '0.9375rem',
              boxShadow: '0 4px 12px rgba(194, 89, 117, 0.3)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--primary-hover)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--primary)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <CalendarPlus size={18} />
            <span>Novo Agendamento</span>
          </button>
        </div>
      </div>

      {/* Alerta de Agendamentos Pendentes Aguardando Aprovação */}
      {pendentes.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            backgroundColor: '#fffbeb',
            border: '1.5px solid #f59e0b',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            color: '#b45309',
            fontSize: '0.9rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={20} color="#f59e0b" style={{ flexShrink: 0 }} />
            <span>
              <strong>Atenção, Samara:</strong> Você tem{' '}
              <strong style={{ color: '#d97706', textDecoration: 'underline' }}>
                {pendentes.length} agendamento{pendentes.length > 1 ? 's' : ''} pendente{pendentes.length > 1 ? 's' : ''}
              </strong>{' '}
              nesta data aguardando sua aprovação!
            </span>
          </div>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#92400e' }}>
            Aprove ou Recuse no card abaixo 👇
          </span>
        </div>
      )}

      {/* Cards de Métricas do Dia */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '12px',
          paddingTop: '16px',
          borderTop: '1px solid var(--border-color)',
        }}
      >
        <div
          style={{
            backgroundColor: 'var(--bg-main)',
            padding: '14px 16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
          }}
        >
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Total no Dia
          </span>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
            {agendamentos.length}
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'var(--status-confirmado-bg)',
            padding: '14px 16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--status-confirmado-border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={14} color="var(--status-confirmado)" />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--status-confirmado)', textTransform: 'uppercase' }}>
              Confirmados
            </span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--status-confirmado)', marginTop: '4px' }}>
            {confirmados.length}
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'var(--status-pendente-bg)',
            padding: '14px 16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--status-pendente-border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={14} color="var(--status-pendente)" />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--status-pendente)', textTransform: 'uppercase' }}>
              Pendentes
            </span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--status-pendente)', marginTop: '4px' }}>
            {pendentes.length}
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'var(--accent-gold-soft)',
            padding: '14px 16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid #ebd9c3',
          }}
        >
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-gold)', textTransform: 'uppercase' }}>
            Previsão do Dia
          </span>
          <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--accent-gold)', marginTop: '4px' }}>
            {formatarMoeda(faturamentoPrevisto)}
          </div>
        </div>
      </div>
    </header>
  );
};
