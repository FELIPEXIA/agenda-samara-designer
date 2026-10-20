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

  // Fila FIFO de Agendamentos Pendentes em qualquer data
  const [agendamentosPendentes, setAgendamentosPendentes] = useState<Agendamento[]>([]);
  const [indiceFilaPendente, setIndiceFilaPendente] = useState<number>(-1);
  const [agendamentoDestacadoId, setAgendamentoDestacadoId] = useState<string | null>(null);

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

  // Busca todos os agendamentos pendentes (presente e futuro) em ordem FIFO de solicitação
  const carregarPendentes = useCallback(async () => {
    try {
      const res = await fetch('/api/agendamentos?pendentes=true');
      const json = await res.json();
      if (json.success) {
        setAgendamentosPendentes(json.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar agendamentos pendentes:', error);
    }
  }, []);

  useEffect(() => {
    carregarAgendamentos();
  }, [carregarAgendamentos]);

  useEffect(() => {
    carregarPendentes();
  }, [carregarPendentes]);

  // Navegação da Fila FIFO ao clicar no Card de Pendentes
  const handleCliqueCardPendentes = () => {
    if (agendamentosPendentes.length === 0) return;

    // Avança circularmente na fila de solicitações mais antigas
    const proximoIndice = (indiceFilaPendente + 1) % agendamentosPendentes.length;
    const alvo = agendamentosPendentes[proximoIndice];

    setIndiceFilaPendente(proximoIndice);
    setAgendamentoDestacadoId(alvo.id);

    // Se o agendamento pendente for de outra data, navega automaticamente o calendário
    if (alvo.data !== dataSelecionada) {
      setDataSelecionada(alvo.data);
    } else {
      // Se já estiver na mesma data, rola suavemente até o elemento
      setTimeout(() => {
        const elemento = document.getElementById(`card-agendamento-${alvo.id}`);
        if (elemento) {
          elemento.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  };

  // Efeito para rolar e manter o agendamento pendente em evidência após carregamento da data
  useEffect(() => {
    if (agendamentoDestacadoId) {
      const timer = setTimeout(() => {
        const elemento = document.getElementById(`card-agendamento-${agendamentoDestacadoId}`);
        if (elemento) {
          elemento.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [dataSelecionada, agendamentoDestacadoId, agendamentos]);

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
        // Atualiza no dia atual
        setAgendamentos((prev) =>
          prev.map((item) => (item.id === id ? { ...item, status: novoStatus } : item))
        );

        // Atualiza a fila geral de pendentes
        setAgendamentosPendentes((prev) => {
          const restantes = prev.filter((item) => item.id !== id);
          if (restantes.length === 0) {
            // Regra de Retorno ao Normal: Fila zerada!
            setIndiceFilaPendente(-1);
            setAgendamentoDestacadoId(null);
          } else if (agendamentoDestacadoId === id) {
            // Se o item respondido era o focado, foca no próximo da fila
            const proximo = restantes[0];
            setAgendamentoDestacadoId(proximo.id);
            if (proximo.data !== dataSelecionada) {
              setDataSelecionada(proximo.data);
            }
          }
          return restantes;
        });

        // Sincroniza estado com a API
        carregarPendentes();
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
        setAgendamentosPendentes((prev) => {
          const restantes = prev.filter((item) => item.id !== id);
          if (restantes.length === 0) {
            setIndiceFilaPendente(-1);
            setAgendamentoDestacadoId(null);
          }
          return restantes;
        });
        carregarPendentes();
      } else {
        alert(json.error || 'Erro ao excluir agendamento.');
      }
    } catch (error) {
      console.error('Erro ao excluir agendamento:', error);
      alert('Erro ao excluir agendamento.');
    }
  };

  const posicaoFila =
    indiceFilaPendente >= 0 && agendamentosPendentes.length > 0
      ? { indice: indiceFilaPendente + 1, total: agendamentosPendentes.length }
      : null;

  return (
    <main
      style={{
        maxWidth: '1000px',
        margin: '0 auto',
        padding: '24px 16px 64px 16px',
      }}
    >
      {/* Resumo e Métricas do Dia + Fila Geral de Pendentes */}
      <HeaderResumo
        agendamentos={agendamentos}
        totalPendentesGeral={agendamentosPendentes.length}
        onAbrirModalNovo={() => setModalNovoAberto(true)}
        onCliquePendentes={handleCliqueCardPendentes}
        posicaoFilaAtual={posicaoFila}
      />

      {/* Navegador de Data */}
      <DateNavigator
        dataSelecionada={dataSelecionada}
        onMudarData={(novaData) => {
          setDataSelecionada(novaData);
        }}
      />

      {/* Linha do Tempo dos Atendimentos com destaque dinâmico de fila */}
      <TimelineDiaria
        agendamentos={agendamentos}
        onAtualizarStatus={handleAtualizarStatus}
        onExcluir={handleExcluirAgendamento}
        onAbrirNovoModal={() => setModalNovoAberto(true)}
        carregando={carregando}
        agendamentoDestacadoId={agendamentoDestacadoId}
      />

      {/* Modal de Novo Agendamento */}
      <ModalNovoAgendamento
        aberto={modalNovoAberto}
        onFechar={() => setModalNovoAberto(false)}
        dataPreSelecionada={dataSelecionada}
        onAgendamentoCriado={() => {
          carregarAgendamentos();
          carregarPendentes();
        }}
      />
    </main>
  );
}
