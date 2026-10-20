'use client';

import React, { useState } from 'react';
import {
  Clock,
  Sparkles,
  Check,
  X,
  FileText,
  Trash2,
  MessageCircle,
  RotateCcw,
} from 'lucide-react';
import { Agendamento, StatusAgendamento } from '@/types';
import { formatarMoeda } from '@/lib/formatters';
import {
  criarLinkAprovacaoSamara,
  criarLinkRecusaSamara,
  criarLinkWhatsApp,
} from '@/lib/whatsapp';
import { BadgeStatus } from '../ui/BadgeStatus';
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

  // Bordas baseadas no status
  const coresBordaPorStatus: Record<StatusAgendamento, string> = {
    Confirmado: 'var(--status-confirmado)',
    Pendente: 'var(--status-pendente)',
    Cancelado: 'var(--status-cancelado)',
    Concluido: '#9ca3af',
  };

  // Alteração genérica de status
  const handleStatusChange = async (novoStatus: StatusAgendamento) => {
    if (agendamento.status === novoStatus || atualizando) return;
    setAtualizando(true);
    try {
      await onAtualizarStatus(agendamento.id, novoStatus);
    } finally {
      setAtualizando(false);
    }
  };

  // 1. CONFIRMAR SOLICITAÇÃO PENDENTE
  const handleConfirmar = async () => {
    if (atualizando) return;
    setAtualizando(true);
    try {
      await onAtualizarStatus(agendamento.id, 'Confirmado');
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
        '✅ Agendamento CONFIRMADO com sucesso!\n\nDeseja abrir o WhatsApp para enviar a confirmação para a cliente agora?'
      );
      if (confirmarWhats) {
        window.open(link, '_blank');
      }
    } catch (err) {
      console.error('Falha ao confirmar agendamento:', err);
    } finally {
      setAtualizando(false);
    }
  };

  // 2. REJEITAR SOLICITAÇÃO PENDENTE (Substitui o botão de status antigo)
  const handleRejeitar = async () => {
    if (atualizando) return;
    const confirmarRecusa = window.confirm(
      `Deseja realmente rejeitar a solicitação de "${agendamento.cliente_nome}"?\n\nO horário ficará liberado na agenda e você poderá sugerir um novo horário à cliente via WhatsApp.`
    );
    if (!confirmarRecusa) return;

    setAtualizando(true);
    try {
      await onAtualizarStatus(agendamento.id, 'Cancelado');
      const link = criarLinkRecusaSamara({
        clienteNome: agendamento.cliente_nome,
        clienteTelefone: agendamento.cliente_telefone,
        data: agendamento.data,
        horarioInicio: agendamento.horario_inicio.substring(0, 5),
        servicosTexto: agendamento.lista_servicos || 'Procedimentos',
      });
      const avisarWhats = window.confirm(
        '❌ Solicitação rejeitada e horário liberado!\n\nDeseja abrir o WhatsApp para avisar a cliente com o template carinhoso de reagendamento?'
      );
      if (avisarWhats) {
        window.open(link, '_blank');
      }
    } catch (err) {
      console.error('Falha ao rejeitar agendamento:', err);
    } finally {
      setAtualizando(false);
    }
  };

  // 3. CANCELAR AGENDAMENTO QUE ESTAVA CONFIRMADO
  const handleCancelar = async () => {
    if (atualizando) return;
    const confirmou = window.confirm(
      `Deseja cancelar o agendamento de "${agendamento.cliente_nome}"?\n\nO horário ficará livre para novos atendimentos na agenda.`
    );
    if (!confirmou) return;

    setAtualizando(true);
    try {
      await onAtualizarStatus(agendamento.id, 'Cancelado');
    } finally {
      setAtualizando(false);
    }
  };

  // 4. EXCLUIR PERMANENTEMENTE DO BANCO / TELA
  const handleExcluir = async () => {
    if (!onExcluir || excluindo) return;
    const confirmou = window.confirm(
      `Deseja realmente excluir permanentemente o registro de "${agendamento.cliente_nome}"?\n\nEsta ação removerá o card da interface definitivamente.`
    );
    if (!confirmou) return;
    setExcluindo(true);
    try {
      await onExcluir(agendamento.id);
    } finally {
      setExcluindo(false);
    }
  };

  // Template WhatsApp de Confirmação (Para agendamentos Confirmados)
  const linkConfirmacao = criarLinkWhatsApp({
    clienteNome: agendamento.cliente_nome,
    clienteTelefone: agendamento.cliente_telefone,
    data: agendamento.data,
    horarioInicio: agendamento.horario_inicio.substring(0, 5),
    horarioFim: agendamento.horario_fim.substring(0, 5),
    servicosTexto: agendamento.lista_servicos || 'Procedimentos',
    valorTotal: Number(agendamento.valor_total || 0),
  });

  // Template WhatsApp de Cancelamento/Recusa (Para agendamentos Cancelados/Rejeitados)
  const linkRecusa = criarLinkRecusaSamara({
    clienteNome: agendamento.cliente_nome,
    clienteTelefone: agendamento.cliente_telefone,
    data: agendamento.data,
    horarioInicio: agendamento.horario_inicio.substring(0, 5),
    servicosTexto: agendamento.lista_servicos || 'Procedimentos',
  });

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

      {/* Bloco Unificado: Cliente Agendada */}
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

      {/* Aviso contextual para agendamentos cancelados / recusados */}
      {agendamento.status === 'Cancelado' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#fef2f2',
            border: '1px dashed #fca5a5',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 12px',
            fontSize: '0.8125rem',
            color: '#991b1b',
          }}
        >
          <span>⚠️</span>
          <span>Este agendamento foi cancelado / recusado. O horário está livre na agenda.</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* RODAPÉ: VALOR E AÇÕES INTELIGENTES POR STATUS            */}
      {/* ======================================================== */}
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
        {/* Resumo do Valor */}
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

        {/* ====================================================== */}
        {/* 1. SE STATUS === 'Pendente': CONFIRMAR OU REJEITAR     */}
        {/* ====================================================== */}
        {agendamento.status === 'Pendente' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Botão Confirmar (Verde) */}
            <button
              type="button"
              onClick={handleConfirmar}
              disabled={atualizando}
              title="Aprovar e confirmar este agendamento"
              style={{
                height: '38px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '0 18px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.875rem',
                fontWeight: 700,
                backgroundColor: 'var(--status-confirmado)',
                color: '#ffffff',
                border: 'none',
                cursor: atualizando ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!atualizando) {
                  e.currentTarget.style.backgroundColor = '#047857';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--status-confirmado)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <Check size={16} strokeWidth={2.5} />
              <span>{atualizando ? 'Confirmando...' : 'Confirmar'}</span>
            </button>

            {/* Botão Rejeitar (Vermelho/Alerta) */}
            <button
              type="button"
              onClick={handleRejeitar}
              disabled={atualizando}
              title="Recusar a solicitação inicial da cliente"
              style={{
                height: '38px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '0 16px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.875rem',
                fontWeight: 600,
                backgroundColor: '#ffffff',
                color: '#dc2626',
                border: '1.5px solid #fca5a5',
                cursor: atualizando ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!atualizando) {
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
              <X size={16} strokeWidth={2.5} />
              <span>Rejeitar</span>
            </button>
          </div>
        )}

        {/* ====================================================== */}
        {/* 2. SE STATUS === 'Confirmado': CANCELAR, EXCLUIR, WPP */}
        {/* ====================================================== */}
        {agendamento.status === 'Confirmado' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Avisar no WhatsApp (Template de Confirmação) */}
            <a
              href={linkConfirmacao}
              target="_blank"
              rel="noopener noreferrer"
              title="Enviar confirmação oficial no WhatsApp da cliente"
              style={{
                height: '38px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                backgroundColor: '#25D366',
                color: '#ffffff',
                padding: '0 14px',
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
              <span>Avisar no WhatsApp</span>
            </a>

            {/* Cancelar Agendamento */}
            <button
              type="button"
              onClick={handleCancelar}
              disabled={atualizando}
              title="Cancelar este agendamento"
              style={{
                height: '38px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '0 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: '1.5px solid #fecaca',
                backgroundColor: '#fef2f2',
                color: '#b91c1c',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!atualizando) {
                  e.currentTarget.style.backgroundColor = '#fee2e2';
                  e.currentTarget.style.borderColor = '#ef4444';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#fef2f2';
                e.currentTarget.style.borderColor = '#fecaca';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <X size={15} strokeWidth={2.2} />
              <span>Cancelar</span>
            </button>

            {/* Excluir Agendamento */}
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
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '0 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: '#ffffff',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border-color)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!excluindo) {
                    e.currentTarget.style.backgroundColor = '#fee2e2';
                    e.currentTarget.style.color = '#dc2626';
                    e.currentTarget.style.borderColor = '#fca5a5';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#ffffff';
                  e.currentTarget.style.color = 'var(--text-muted)';
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <Trash2 size={15} />
                <span>{excluindo ? 'Excluindo...' : 'Excluir'}</span>
              </button>
            )}
          </div>
        )}

        {/* ====================================================== */}
        {/* 3. SE STATUS === 'Cancelado': EXCLUIR E WPP RECUSA     */}
        {/* ====================================================== */}
        {agendamento.status === 'Cancelado' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Avisar Recusa/Remarcação no WhatsApp */}
            <a
              href={linkRecusa}
              target="_blank"
              rel="noopener noreferrer"
              title="Enviar mensagem carinhosa de recusa e sugestão de novo horário"
              style={{
                height: '38px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                backgroundColor: '#25D366',
                color: '#ffffff',
                padding: '0 14px',
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
              <span>Avisar no WhatsApp</span>
            </a>

            {/* Excluir da Tela (Ação principal para sumir com o card) */}
            {onExcluir && (
              <button
                type="button"
                onClick={handleExcluir}
                disabled={excluindo}
                title="Excluir e remover permanentemente este registro da tela"
                style={{
                  height: '38px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '0 16px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  cursor: excluindo ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!excluindo) {
                    e.currentTarget.style.backgroundColor = '#b91c1c';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#dc2626';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <Trash2 size={15} />
                <span>{excluindo ? 'Removendo...' : 'Excluir da Tela'}</span>
              </button>
            )}

            {/* Reativar (caso cancelado por engano) */}
            <button
              type="button"
              onClick={() => handleStatusChange('Confirmado')}
              disabled={atualizando}
              title="Restaurar este agendamento para confirmado"
              style={{
                height: '38px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                padding: '0 10px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                backgroundColor: '#ffffff',
                color: 'var(--text-muted)',
                border: '1px solid var(--border-color)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-main)';
                e.currentTarget.style.color = 'var(--text-main)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff';
                e.currentTarget.style.color = 'var(--text-muted)';
              }}
            >
              <RotateCcw size={13} />
              <span>Reativar</span>
            </button>
          </div>
        )}

        {/* ====================================================== */}
        {/* 4. SE STATUS === 'Concluido': EXCLUIR E WPP            */}
        {/* ====================================================== */}
        {agendamento.status === 'Concluido' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <a
              href={linkConfirmacao}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                height: '38px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                backgroundColor: '#25D366',
                color: '#ffffff',
                padding: '0 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8125rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <MessageCircle size={16} />
              <span>Avisar no WhatsApp</span>
            </a>

            {onExcluir && (
              <button
                type="button"
                onClick={handleExcluir}
                disabled={excluindo}
                style={{
                  height: '38px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '0 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: '#ffffff',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <Trash2 size={15} />
                <span>Excluir</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
