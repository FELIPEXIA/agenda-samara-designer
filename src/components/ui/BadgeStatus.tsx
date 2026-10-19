import React from 'react';
import { StatusAgendamento } from '@/types';

interface BadgeStatusProps {
  status: StatusAgendamento;
  tamanho?: 'sm' | 'md';
}

export const BadgeStatus: React.FC<BadgeStatusProps> = ({ status, tamanho = 'md' }) => {
  const configs: Record<
    StatusAgendamento,
    { label: string; cor: string; bg: string; border: string; dot: string }
  > = {
    Confirmado: {
      label: 'Confirmado',
      cor: 'var(--status-confirmado)',
      bg: 'var(--status-confirmado-bg)',
      border: 'var(--status-confirmado-border)',
      dot: '#10b981',
    },
    Pendente: {
      label: 'Pendente',
      cor: 'var(--status-pendente)',
      bg: 'var(--status-pendente-bg)',
      border: 'var(--status-pendente-border)',
      dot: '#f59e0b',
    },
    Cancelado: {
      label: 'Cancelado',
      cor: 'var(--status-cancelado)',
      bg: 'var(--status-cancelado-bg)',
      border: 'var(--status-cancelado-border)',
      dot: '#ef4444',
    },
    Concluido: {
      label: 'Concluído',
      cor: '#4b5563',
      bg: '#f3f4f6',
      border: '#e5e7eb',
      dot: '#6b7280',
    },
  };

  const config = configs[status] || configs.Pendente;
  const isSm = tamanho === 'sm';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: isSm ? '2px 8px' : '4px 12px',
        fontSize: isSm ? '0.75rem' : '0.8125rem',
        fontWeight: 600,
        borderRadius: '9999px',
        color: config.cor,
        backgroundColor: config.bg,
        border: `1px solid ${config.border}`,
        lineHeight: 1.2,
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: config.dot,
        }}
      />
      {config.label}
    </span>
  );
};
