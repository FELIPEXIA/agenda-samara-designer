'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Agendamento, StatusAgendamento } from '@/types';
import { HeaderResumo } from '@/components/dashboard/HeaderResumo';
import { DateNavigator } from '@/components/dashboard/DateNavigator';
import { TimelineDiaria } from '@/components/dashboard/TimelineDiaria';
import { ModalNovoAgendamento } from '@/components/agendamento/ModalNovoAgendamento';

export default function DashboardPage() {
  const [dataSelecionada, setDataSelecionada] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modalNovoAberto, setModalNovoAberto] = useState(false);

  // Busca os agendamentos do dia selecionado
  const carregarAgendamentos = useCallback(async () => {
    setCarregando(true);
    try {
      const res = await fetch(`/api/agendamentos?data=${dataSelecionada}`);
      const json = await res.json();
      if (json.success) {
        setAgendamentos(json.data);
      }
    } catch (error) {
      console.error('Erro ao buscar agendamentos:', error);
    } finally {
      setCarregando(false);
    }
  }, [dataSelecionada]);

  useEffect(() => {
    carregarAgendamentos();
  }, [carregarAgendamentos]);

  // Atualização instantânea de status (Confirmado / Pendente / Cancelado)
  const handleAtualizarStatus = async (id: string, novoStatus: StatusAgendamento) => {
    try {
      const res = await fetch(`/api/agendamentos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus }),
      });
      const json = await res.json();
      if (json.success) {
        setAgendamentos((prev) =>
          prev.map((item) => (item.id === id ? { ...item, status: novoStatus } : item))
        );
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  };

  // Exclusão de agendamento (limpeza da agenda)
  const handleExcluirAgendamento = async (id: string) => {
    try {
      const res = await fetch(`/api/agendamentos/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        setAgendamentos((prev) => prev.filter((item) => item.id !== id));
      } else {
        alert(json.error || 'Erro ao excluir agendamento.');
      }
    } catch (error) {
      console.error('Erro ao excluir agendamento:', error);
      alert('Erro ao excluir agendamento.');
    }
  };

  return (
    <main
      style={{
        maxWidth: '1000px',
        margin: '0 auto',
        padding: '24px 16px 64px 16px',
      }}
    >
      {/* Resumo e Métricas do Dia */}
      <HeaderResumo
        agendamentos={agendamentos}
        onAbrirModalNovo={() => setModalNovoAberto(true)}
      />

      {/* Navegador de Data */}
      <DateNavigator
        dataSelecionada={dataSelecionada}
        onMudarData={(novaData) => setDataSelecionada(novaData)}
      />

      {/* Linha do Tempo dos Atendimentos */}
      <TimelineDiaria
        agendamentos={agendamentos}
        onAtualizarStatus={handleAtualizarStatus}
        onExcluir={handleExcluirAgendamento}
        onAbrirNovoModal={() => setModalNovoAberto(true)}
        carregando={carregando}
      />

      {/* Modal de Novo Agendamento */}
      <ModalNovoAgendamento
        aberto={modalNovoAberto}
        onFechar={() => setModalNovoAberto(false)}
        dataPreSelecionada={dataSelecionada}
        onAgendamentoCriado={carregarAgendamentos}
      />
    </main>
  );
}
