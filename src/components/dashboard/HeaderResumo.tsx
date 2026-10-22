'use client';

import React from 'react';
import { Sparkles, CalendarPlus, CheckCircle2, Clock, AlertCircle, RotateCw } from 'lucide-react';
import { Agendamento } from '@/types';
import { formatarMoeda } from '@/lib/formatters';

interface HeaderResumoProps {
  agendamentos: Agendamento[];
  totalPendentesGeral: number;
  onAbrirModalNovo: () => void;
  onCliquePendentes: () => void;
  posicaoFilaAtual?: { indice: number; total: number } | null;
  onRecarregar?: () => void;
  carregando?: boolean;
  somHabilitado?: boolean;
  onToggleSom?: () => void;
  onTestarSom?: () => void;
}

export const HeaderResumo: React.FC<HeaderResumoProps> = ({
  agendamentos,
  totalPendentesGeral,
  onAbrirModalNovo,
  onCliquePendentes,
  posicaoFilaAtual = null,
  onRecarregar,
  carregando = false,
  somHabilitado = true,
  onToggleSom,
  onTestarSom,
}) => {
  const confirmados = agendamentos.filter((a) => a.status === 'Confirmado');
  
  // Total previsto apenas de agendamentos confirmados ou pendentes do dia
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

          {/* Botão de Atualizar Manualmente sob demanda */}
          {onRecarregar && (
            <button
              onClick={onRecarregar}
              disabled={carregando}
              title="Recarregar dados da agenda"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'var(--bg-main)',
                color: 'var(--text-main)',
                border: '1.5px solid var(--border-color)',
                padding: '11px 14px',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: carregando ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (!carregando) e.currentTarget.style.backgroundColor = 'var(--bg-card)';
              }}
              onMouseLeave={(e) => {
                if (!carregando) e.currentTarget.style.backgroundColor = 'var(--bg-main)';
              }}
            >
              <RotateCw size={15} style={{ animation: carregando ? 'spin 1s linear infinite' : 'none' }} />
              <span>{carregando ? 'Atualizando...' : 'Atualizar'}</span>
            </button>
          )}

          {/* Controle de Notificações Sonoras */}
          {onToggleSom && (
            <button
              onClick={onToggleSom}
              title={
                somHabilitado
                  ? 'Notificações sonoras ATIVAS. Clique para silenciar.'
                  : 'Notificações sonoras SILENCIADAS. Clique para ativar.'
              }
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: somHabilitado ? 'rgba(236, 72, 153, 0.1)' : 'var(--bg-main)',
                color: somHabilitado ? 'var(--primary)' : 'var(--text-muted)',
                border: somHabilitado ? '1.5px solid var(--primary)' : '1.5px solid var(--border-color)',
                padding: '11px 14px',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <span>{somHabilitado ? '🔔 Som Ativo' : '🔕 Mudo'}</span>
            </button>
          )}

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

      {/* Alerta Geral de Agendamentos Pendentes Aguardando Aprovação */}
      {totalPendentesGeral > 0 && (
        <div
          onClick={onCliquePendentes}
          title="Clique para ir ao próximo agendamento pendente por ordem de chegada"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            backgroundColor: '#fffbeb',
            border: '1.5px solid #f59e0b',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            color: '#b45309',
            fontSize: '0.9rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 10px rgba(245, 158, 11, 0.15)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#fef3c7';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#fffbeb';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={20} color="#f59e0b" style={{ flexShrink: 0 }} />
            <span>
              <strong>Atenção, Samara:</strong> Você tem{' '}
              <strong style={{ color: '#d97706', textDecoration: 'underline' }}>
                {totalPendentesGeral} agendamento{totalPendentesGeral > 1 ? 's' : ''} pendente{totalPendentesGeral > 1 ? 's' : ''}
              </strong>{' '}
              na sua fila de aprovação!
            </span>
          </div>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#92400e', display: 'flex', alignItems: 'center', gap: '4px' }}>
            Atender Fila FIFO 👉
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

        {/* Card Dinâmico de Pendentes: Alerta Ativo (Amarelo/Laranja) ou Retorno ao Normal (Verde Fila Limpa) */}
        <div
          id="card-metrica-pendentes"
          onClick={totalPendentesGeral > 0 ? onCliquePendentes : undefined}
          title={
            totalPendentesGeral > 0
              ? 'Clique para ir ao próximo agendamento pendente por ordem de solicitação (FIFO)'
              : 'Fila limpa! Todos os agendamentos foram respondidos.'
          }
          style={{
            backgroundColor: totalPendentesGeral > 0 ? '#fffbeb' : '#f0fdf4',
            padding: '14px 16px',
            borderRadius: 'var(--radius-md)',
            border: totalPendentesGeral > 0 ? '2px solid #f59e0b' : '1.5px solid #86efac',
            boxShadow:
              totalPendentesGeral > 0 ? '0 4px 14px rgba(245, 158, 11, 0.25)' : 'var(--shadow-sm)',
            cursor: totalPendentesGeral > 0 ? 'pointer' : 'default',
            transition: 'all 0.2s ease',
            position: 'relative',
          }}
          onMouseEnter={(e) => {
            if (totalPendentesGeral > 0) {
              e.currentTarget.style.backgroundColor = '#fef3c7';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }
          }}
          onMouseLeave={(e) => {
            if (totalPendentesGeral > 0) {
              e.currentTarget.style.backgroundColor = '#fffbeb';
              e.currentTarget.style.transform = 'translateY(0)';
            }
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {totalPendentesGeral > 0 ? (
                <Clock size={15} color="#d97706" />
              ) : (
                <CheckCircle2 size={15} color="#16a34a" />
              )}
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: totalPendentesGeral > 0 ? '#d97706' : '#16a34a',
                  textTransform: 'uppercase',
                }}
              >
                Pendentes
              </span>
            </div>

            <span
              style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                backgroundColor: totalPendentesGeral > 0 ? '#f59e0b' : '#dcfce7',
                color: totalPendentesGeral > 0 ? '#ffffff' : '#15803d',
                padding: '2px 7px',
                borderRadius: '999px',
                textTransform: 'uppercase',
                letterSpacing: '0.02em',
              }}
            >
              {totalPendentesGeral > 0
                ? posicaoFilaAtual
                  ? `Fila ${posicaoFilaAtual.indice}/${posicaoFilaAtual.total}`
                  : 'Fila Ativa'
                : 'Fila Limpa ✨'}
            </span>
          </div>

          <div
            style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              color: totalPendentesGeral > 0 ? '#b45309' : '#15803d',
              marginTop: '4px',
            }}
          >
            {totalPendentesGeral}
          </div>

          <div
            style={{
              fontSize: '0.72rem',
              fontWeight: totalPendentesGeral > 0 ? 700 : 500,
              color: totalPendentesGeral > 0 ? '#d97706' : '#16a34a',
              marginTop: '4px',
            }}
          >
            {totalPendentesGeral > 0 ? '👉 Clique p/ atender (FIFO)' : 'Nenhum pendente'}
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
