'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Agendamento, StatusAgendamento } from '@/types';
import { HeaderResumo } from '@/components/dashboard/HeaderResumo';
import { DateNavigator } from '@/components/dashboard/DateNavigator';
import { TimelineDiaria } from '@/components/dashboard/TimelineDiaria';
import { ModalNovoAgendamento } from '@/components/agendamento/ModalNovoAgendamento';
import { obterDataHojeLocal } from '@/lib/formatters';

export default function DashboardPage() {
  const [dataSelecionada, setDataSelecionada] = useState<string>(() => {
    return obterDataHojeLocal();
  });
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modalNovoAberto, setModalNovoAberto] = useState(false);

  // Fila FIFO de Agendamentos Pendentes em qualquer data
  const [agendamentosPendentes, setAgendamentosPendentes] = useState<Agendamento[]>([]);
  const [indiceFilaPendente, setIndiceFilaPendente] = useState<number>(-1);
  const [agendamentoDestacadoId, setAgendamentoDestacadoId] = useState<string | null>(null);

  // Busca os agendamentos do dia selecionado
  const carregarAgendamentos = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setCarregando(true);
      try {
        const res = await fetch(`/api/agendamentos?data=${dataSelecionada}&_t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
          },
        });
        const json = await res.json();
        if (json.success) {
          setAgendamentos(json.data || []);
        }
      } catch (error) {
        console.error('Erro ao buscar agendamentos:', error);
      } finally {
        if (!isSilent) setCarregando(false);
      }
    },
    [dataSelecionada]
  );

  // Busca todos os agendamentos pendentes (presente e futuro) em ordem FIFO de solicitação
  const carregarPendentes = useCallback(async () => {
    try {
      const res = await fetch(`/api/agendamentos?pendentes=true&_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });
      const json = await res.json();
      if (json.success) {
        setAgendamentosPendentes(json.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar agendamentos pendentes:', error);
    }
  }, []);

  // Carregamento inicial ao montar ou trocar de data
  useEffect(() => {
    carregarAgendamentos();
    carregarPendentes();
  }, [carregarAgendamentos, carregarPendentes]);

  // Sincronização em tempo real:
  // 1. Polling contínuo (a cada 4 segundos)
  // 2. Revalidate on Focus & Visibility Change (quando a Samara volta ao navegador após checar WhatsApp)
  // 3. Notificação cross-tab instantânea (BroadcastChannel + LocalStorage)
  useEffect(() => {
    const sincronizarTudo = () => {
      carregarAgendamentos(true);
      carregarPendentes();
    };

    // 1. Polling a cada 4 segundos
    const intervalId = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        sincronizarTudo();
      }
    }, 4000);

    // 2. Revalidação ao focar na janela / aba
    const handleRevalidate = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        sincronizarTudo();
      }
    };
    window.addEventListener('focus', handleRevalidate);
    document.addEventListener('visibilitychange', handleRevalidate);

    // 3. Sincronização entre abas
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'agenda_samara_sync') {
        sincronizarTudo();
      }
    };
    window.addEventListener('storage', handleStorage);

    let channel: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      channel = new BroadcastChannel('agenda_samara_sync_channel');
      channel.onmessage = () => {
        sincronizarTudo();
      };
    }

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleRevalidate);
      document.removeEventListener('visibilitychange', handleRevalidate);
      window.removeEventListener('storage', handleStorage);
      if (channel) {
        channel.close();
      }
    };
  }, [carregarAgendamentos, carregarPendentes]);

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
        // Atualiza no dia atual mantendo o card visível na tela com o novo status
        setAgendamentos((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, ...(json.data || {}), status: novoStatus } : item
          )
        );

        // Atualiza a fila geral de pendentes e remove o destaque FIFO sem trocar a data da tela
        setAgendamentosPendentes((prev) => prev.filter((item) => item.id !== id));
        setIndiceFilaPendente(-1);
        setAgendamentoDestacadoId(null);

        // Sincroniza estado com a API e notifica abas
        carregarPendentes();
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem('agenda_samara_sync', Date.now().toString());
            if ('BroadcastChannel' in window) {
              const channel = new BroadcastChannel('agenda_samara_sync_channel');
              channel.postMessage({ type: 'STATUS_ALTERADO', id });
              channel.close();
            }
          }
        } catch (e) {}
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
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem('agenda_samara_sync', Date.now().toString());
            if ('BroadcastChannel' in window) {
              const channel = new BroadcastChannel('agenda_samara_sync_channel');
              channel.postMessage({ type: 'EXCLUIDO', id });
              channel.close();
            }
          }
        } catch (e) {}
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
