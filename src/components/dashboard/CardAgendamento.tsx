'use client';

import React, { useState } from 'react';
import { Clock, Phone, Sparkles, Check, X, AlertTriangle, FileText, Trash2 } from 'lucide-react';
import { Agendamento, StatusAgendamento } from '@/types';
import { formatarMoeda, formatarTelefone } from '@/lib/formatters';
import { criarLinkAprovacaoSamara, criarLinkRecusaSamara } from '@/lib/whatsapp';
import { BadgeStatus } from '../ui/BadgeStatus';
import { BotaoWhatsapp } from '../ui/BotaoWhatsapp';
import { ClienteDestaque } from '../ui/ClienteDestaque';

interface CardAgendamentoProps {
  agendamento: Agendamento;
  onAtualizarStatus: (id: string, novoStatus: StatusAgendamento) => Promise<void>;
  onExcluir?: (id: string) => Promise<void>;
  destacado?: boolean;
}

export const CardAgendamento: React.FC<CardAgendamentoProps> = ({
  agendamento,
  onAtualizarStatus,
  onExcluir,
  destacado = false,
}) => {
  const [atualizando, setAtualizando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  // Bordas e destaques baseados no status
  const coresBordaPorStatus: Record<StatusAgendamento, string> = {
    Confirmado: 'var(--status-confirmado)',
    Pendente: 'var(--status-pendente)',
    Cancelado: 'var(--status-cancelado)',
    Concluido: '#9ca3af',
  };

  const handleStatusChange = async (novoStatus: StatusAgendamento) => {
    if (agendamento.status === novoStatus || atualizando) return;
    setAtualizando(true);
    try {
      await onAtualizarStatus(agendamento.id, novoStatus);
    } finally {
      setAtualizando(false);
    }
  };

  const handleExcluir = async () => {
    if (!onExcluir || excluindo) return;
    const confirmou = window.confirm(
      `Deseja realmente excluir permanentemente o agendamento de "${agendamento.cliente_nome}"?\n\nEsta ação liberará o horário na agenda e removerá o card da interface.`
    );
    if (!confirmou) return;
    setExcluindo(true);
    try {
      await onExcluir(agendamento.id);
    } finally {
      setExcluindo(false);
    }
  };

  return (
    <div
      id={`card-agendamento-${agendamento.id}`}
      className="animate-fade-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: destacado ? '#fffef7' : 'var(--bg-card)',
        borderRadius: 'var(--radius-md)',
        border: destacado ? '2px solid #f59e0b' : '1px solid var(--border-color)',
        borderLeft: `6px solid ${coresBordaPorStatus[agendamento.status]}`,
        boxShadow: destacado
          ? '0 0 0 3px rgba(245, 158, 11, 0.3), 0 8px 24px rgba(245, 158, 11, 0.2)'
          : 'var(--shadow-sm)',
        padding: '20px',
        gap: '14px',
        transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
      }}
    >
      {/* Banner de destaque quando selecionado pela fila FIFO */}
      {destacado && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
            backgroundColor: '#fef3c7',
            border: '1px solid #f59e0b',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 12px',
            fontSize: '0.8125rem',
            fontWeight: 700,
            color: '#92400e',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '1rem' }}>🔔</span>
            <span>Agendamento em Foco na Fila de Pendentes (FIFO)</span>
          </div>
          {agendamento.created_at && (
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#b45309' }}>
              Solicitado em:{' '}
              {new Date(agendamento.created_at).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}
        </div>
      )}
      {/* Topo do Card: Horário, Duração e Badge de Status */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontFamily: 'var(--font-serif)',
              fontSize: '1.25rem',
              fontWeight: 700,
              color: 'var(--text-main)',
            }}
          >
            <Clock size={18} color="var(--primary)" />
            <span>
              {agendamento.horario_inicio.substring(0, 5)} - {agendamento.horario_fim.substring(0, 5)}
            </span>
          </div>
          <span
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              backgroundColor: 'var(--bg-main)',
              padding: '2px 8px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
            }}
          >
            {agendamento.duracao_total_minutos} min
          </span>
        </div>

        <BadgeStatus status={agendamento.status} />
      </div>

      {/* Bloco Unificado e Padronizado: Cliente Agendada */}
      <ClienteDestaque
        nome={agendamento.cliente_nome}
        telefone={agendamento.cliente_telefone}
        tag="CLIENTE AGENDADA"
        tamanho="grande"
        destaqueCor={agendamento.status === 'Cancelado' ? 'alerta' : 'primaria'}
      />

      {/* Procedimentos e Observações */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >

        {/* Serviços */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '6px',
            fontSize: '0.9375rem',
            color: 'var(--primary)',
            fontWeight: 500,
            marginTop: '2px',
          }}
        >
          <Sparkles size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>{agendamento.lista_servicos || 'Serviço personalizado'}</span>
        </div>

        {/* Observações se houver */}
        {agendamento.observacoes && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '6px',
              fontSize: '0.8125rem',
              color: 'var(--text-muted)',
              backgroundColor: 'var(--bg-main)',
              padding: '6px 10px',
              borderRadius: '6px',
              marginTop: '4px',
            }}
          >
            <FileText size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{agendamento.observacoes}</span>
          </div>
        )}
      </div>

      {/* Painel de Aprovação Rápida (1 Clique) para Samara */}
      {agendamento.status === 'Pendente' && (
        <div
          style={{
            backgroundColor: 'var(--status-pendente-bg)',
            border: '1.5px solid var(--status-pendente-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            marginTop: '2px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--status-pendente)' }}>
              ⏳ AGUARDANDO SUA APROVAÇÃO
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Autoatendimento da cliente
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={async () => {
                await handleStatusChange('Confirmado');
                const link = criarLinkAprovacaoSamara({
                  clienteNome: agendamento.cliente_nome,
                  clienteTelefone: agendamento.cliente_telefone,
                  data: agendamento.data,
                  horarioInicio: agendamento.horario_inicio.substring(0, 5),
                  horarioFim: agendamento.horario_fim.substring(0, 5),
                  servicosTexto: agendamento.lista_servicos || 'Procedimentos',
                  valorTotal: Number(agendamento.valor_total || 0),
                });
                const confirmarWhats = window.confirm(
                  '✅ Agendamento APROVADO com sucesso!\n\nDeseja enviar a mensagem de confirmação para a cliente no WhatsApp agora?'
                );
                if (confirmarWhats) {
                  window.open(link, '_blank');
                }
              }}
              disabled={atualizando}
              style={{
                flex: 1,
                minWidth: '160px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                backgroundColor: 'var(--status-confirmado)',
                color: '#ffffff',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.875rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)',
              }}
            >
              <Check size={16} />
              <span>Aprovar Agendamento</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                const confirmarRecusa = window.confirm(
                  'Deseja recusar este agendamento? O horário ficará liberado na agenda e você poderá sugerir outro horário à cliente.'
                );
                if (!confirmarRecusa) return;
                await handleStatusChange('Cancelado');
                const link = criarLinkRecusaSamara({
                  clienteNome: agendamento.cliente_nome,
                  clienteTelefone: agendamento.cliente_telefone,
                  data: agendamento.data,
                  horarioInicio: agendamento.horario_inicio.substring(0, 5),
                  servicosTexto: agendamento.lista_servicos || 'Procedimentos',
                });
                const avisarCliente = window.confirm(
                  '❌ Agendamento recusado e horário liberado!\n\nDeseja abrir o WhatsApp para sugerir outro horário para a cliente?'
                );
                if (avisarCliente) {
                  window.open(link, '_blank');
                }
              }}
              disabled={atualizando}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                backgroundColor: '#ffffff',
                color: 'var(--status-cancelado)',
                border: '1px solid var(--status-cancelado-border)',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <X size={16} />
              <span>Recusar / Reagendar</span>
            </button>
          </div>
        </div>
      )}

      {/* Banner de Limpeza para Agendamentos Cancelados */}
      {agendamento.status === 'Cancelado' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#fef2f2',
            border: '1.5px dashed #fca5a5',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 14px',
            fontSize: '0.85rem',
            color: '#991b1b',
            gap: '10px',
            flexWrap: 'wrap',
          }}
        >
          <span>
            ⚠️ <strong>Agendamento cancelado:</strong> Este horário está livre para novos atendimentos.
          </span>
          {onExcluir && (
            <button
              type="button"
              onClick={handleExcluir}
              disabled={excluindo}
              title="Remover este card cancelado da agenda"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#dc2626',
                color: '#ffffff',
                border: 'none',
                padding: '7px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(220, 38, 38, 0.25)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#b91c1c';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#dc2626';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <Trash2 size={14} />
              <span>{excluindo ? 'Removendo...' : 'Limpar da Tela'}</span>
            </button>
          )}
        </div>
      )}

      {/* Rodapé: Valor, Pagamento, Ações de Status e Botão WhatsApp */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          paddingTop: '14px',
          borderTop: '1px solid var(--border-color)',
        }}
      >
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Valor Total</span>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
            {formatarMoeda(Number(agendamento.valor_total || 0))}
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 500,
                color: 'var(--text-muted)',
                marginLeft: '6px',
              }}
            >
              ({agendamento.forma_pagamento.replace('_', ' ')})
            </span>
          </div>
        </div>

        {/* Grupo de Ações com Alto Destaque e Área de Clique Confortável */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Botão Marcar como Confirmado */}
          <button
            type="button"
            onClick={() => handleStatusChange('Confirmado')}
            disabled={atualizando || agendamento.status === 'Confirmado'}
            title="Marcar como Confirmado"
            style={{
              height: '38px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0 12px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: agendamento.status === 'Confirmado' ? 'default' : 'pointer',
              border: agendamento.status === 'Confirmado' ? '1.5px solid #059669' : '1.5px solid #86efac',
              backgroundColor: agendamento.status === 'Confirmado' ? '#10b981' : '#f0fdf4',
              color: agendamento.status === 'Confirmado' ? '#ffffff' : '#15803d',
              boxShadow: agendamento.status === 'Confirmado' ? '0 2px 8px rgba(16, 185, 129, 0.3)' : 'none',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (agendamento.status !== 'Confirmado' && !atualizando) {
                e.currentTarget.style.backgroundColor = '#dcfce7';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e) => {
              if (agendamento.status !== 'Confirmado') {
                e.currentTarget.style.backgroundColor = '#f0fdf4';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
            <Check size={16} strokeWidth={2.5} />
            <span>Confirmar</span>
          </button>

          {/* Botão Marcar como Pendente */}
          <button
            type="button"
            onClick={() => handleStatusChange('Pendente')}
            disabled={atualizando || agendamento.status === 'Pendente'}
            title="Marcar como Pendente"
            style={{
              height: '38px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0 12px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: agendamento.status === 'Pendente' ? 'default' : 'pointer',
              border: agendamento.status === 'Pendente' ? '1.5px solid #b45309' : '1.5px solid #fde68a',
              backgroundColor: agendamento.status === 'Pendente' ? '#d97706' : '#fffbeb',
              color: agendamento.status === 'Pendente' ? '#ffffff' : '#b45309',
              boxShadow: agendamento.status === 'Pendente' ? '0 2px 8px rgba(217, 119, 6, 0.3)' : 'none',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (agendamento.status !== 'Pendente' && !atualizando) {
                e.currentTarget.style.backgroundColor = '#fef3c7';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e) => {
              if (agendamento.status !== 'Pendente') {
                e.currentTarget.style.backgroundColor = '#fffbeb';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
            <AlertTriangle size={15} strokeWidth={2.2} />
            <span>Pendente</span>
          </button>

          {/* Botão Marcar como Cancelar */}
          <button
            type="button"
            onClick={() => handleStatusChange('Cancelado')}
            disabled={atualizando || agendamento.status === 'Cancelado'}
            title="Cancelar Agendamento"
            style={{
              height: '38px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0 12px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: agendamento.status === 'Cancelado' ? 'default' : 'pointer',
              border: agendamento.status === 'Cancelado' ? '1.5px solid #dc2626' : '1.5px solid #fecaca',
              backgroundColor: agendamento.status === 'Cancelado' ? '#ef4444' : '#fef2f2',
              color: agendamento.status === 'Cancelado' ? '#ffffff' : '#b91c1c',
              boxShadow: agendamento.status === 'Cancelado' ? '0 2px 8px rgba(239, 68, 68, 0.3)' : 'none',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (agendamento.status !== 'Cancelado' && !atualizando) {
                e.currentTarget.style.backgroundColor = '#fee2e2';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e) => {
              if (agendamento.status !== 'Cancelado') {
                e.currentTarget.style.backgroundColor = '#fef2f2';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
            <X size={16} strokeWidth={2.5} />
            <span>Cancelar</span>
          </button>

          {/* Botão Excluir Agendamento */}
          {onExcluir && (
            <button
              type="button"
              onClick={handleExcluir}
              disabled={excluindo}
              title="Excluir este agendamento permanentemente da agenda"
              style={{
                height: '38px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer',
                backgroundColor: '#ffffff',
                color: '#dc2626',
                border: '1.5px solid #fca5a5',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!excluindo) {
                  e.currentTarget.style.backgroundColor = '#fee2e2';
                  e.currentTarget.style.borderColor = '#ef4444';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff';
                e.currentTarget.style.borderColor = '#fca5a5';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <Trash2 size={15} />
              <span>{excluindo ? 'Excluindo...' : 'Excluir'}</span>
            </button>
          )}

          {/* Atalho WhatsApp com Estilo Destacado */}
          <BotaoWhatsapp
            clienteNome={agendamento.cliente_nome}
            clienteTelefone={agendamento.cliente_telefone}
            data={agendamento.data}
            horarioInicio={agendamento.horario_inicio.substring(0, 5)}
            horarioFim={agendamento.horario_fim.substring(0, 5)}
            servicosTexto={agendamento.lista_servicos || 'Procedimento com Samara'}
            valorTotal={Number(agendamento.valor_total || 0)}
          />
        </div>
      </div>
    </div>
  );
};
