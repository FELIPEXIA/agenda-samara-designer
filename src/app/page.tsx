'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Agendamento, StatusAgendamento } from '@/types';
import { HeaderResumo } from '@/components/dashboard/HeaderResumo';
import { DateNavigator } from '@/components/dashboard/DateNavigator';
import { TimelineDiaria } from '@/components/dashboard/TimelineDiaria';
import { ModalNovoAgendamento } from '@/components/agendamento/ModalNovoAgendamento';
import { NotificationToast } from '@/components/NotificationToast';
import { notificacoes } from '@/lib/notifications';
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

  // Sistema de Notificações e Som
  const [toastAgendamento, setToastAgendamento] = useState<Agendamento | null>(null);
  const [somHabilitado, setSomHabilitado] = useState<boolean>(() => notificacoes.isSomHabilitado());
  const idsConhecidosRef = useRef<Set<string>>(new Set());
  const isPrimeiraCargaRef = useRef<boolean>(true);

  // Solicita permissão de notificação nativa ao carregar
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        const handler = () => {
          notificacoes.solicitarPermissaoNotificacoes();
          window.removeEventListener('click', handler);
        };
        window.addEventListener('click', handler, { once: true });
      }
    }
  }, []);

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
        const lista: Agendamento[] = json.data || [];
        setAgendamentosPendentes(lista);

        // Detecção de novos agendamentos para tocar som e exibir notificação
        if (!isPrimeiraCargaRef.current && idsConhecidosRef.current.size > 0) {
          const novos = lista.filter((item) => !idsConhecidosRef.current.has(item.id));
          if (novos.length > 0) {
            const maisRecente = novos[novos.length - 1];
            // Toca som suave tipo sino de estúdio
            notificacoes.tocarSomNovoAgendamento();
            // Exibe Toast flutuante com detalhes
            setToastAgendamento(maisRecente);
            // Dispara notificação nativa do sistema / desktop
            notificacoes.enviarNotificacaoNavegador(
              '🎉 Novo Agendamento Recebido!',
              `${maisRecente.cliente_nome} solicitou ${maisRecente.lista_servicos || 'atendimento'}.`,
              () => {
                const alvoData = (maisRecente.data || '').substring(0, 10);
                if (alvoData) setDataSelecionada(alvoData);
                setAgendamentoDestacadoId(maisRecente.id);
              }
            );
          }
        }

        // Atualiza a lista de IDs conhecidos
        idsConhecidosRef.current = new Set(lista.map((item) => item.id));
        isPrimeiraCargaRef.current = false;
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

  // Sincronização entre abas via BroadcastChannel (mesma janela)
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;

    const channel = new BroadcastChannel('agenda_samara_sync_channel');
    channel.onmessage = (event) => {
      if (event.data?.type === 'NOVO_AGENDAMENTO') {
        notificacoes.tocarSomNovoAgendamento();
        carregarPendentes();
        carregarAgendamentos(true);
      } else if (event.data?.type === 'STATUS_ALTERADO' || event.data?.type === 'EXCLUIDO') {
        carregarPendentes();
        carregarAgendamentos(true);
      }
    };

    return () => {
      channel.close();
    };
  }, [carregarAgendamentos, carregarPendentes]);

  // Sincronização entre abas via localStorage storage event (funciona cross-tab)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'agenda_samara_sync') {
        carregarPendentes();
        carregarAgendamentos(true);
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [carregarAgendamentos, carregarPendentes]);

  // Polling automático a cada 10 segundos para detecção em tempo real mesmo em outros dispositivos
  useEffect(() => {
    const intervalo = setInterval(() => {
      carregarPendentes();
      carregarAgendamentos(true);
    }, 10000);

    return () => clearInterval(intervalo);
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
    const alvoDataCurta = (alvo.data || '').substring(0, 10);
    if (alvoDataCurta && alvoDataCurta !== dataSelecionada) {
      setDataSelecionada(alvoDataCurta);
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
    // 1. Atualização otimista imediata para resposta instantânea na tela
    setAgendamentos((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: novoStatus } : item
      )
    );
    if (novoStatus !== 'Pendente') {
      setAgendamentosPendentes((prev) => prev.filter((item) => item.id !== id));
    }

    try {
      const res = await fetch(`/api/agendamentos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        // Se houve erro na gravação, reverte o estado e avisa
        console.error('Erro na resposta do backend:', json.error);
        alert(json.error || 'Não foi possível atualizar o status do agendamento.');
        await carregarAgendamentos(true);
        await carregarPendentes();
        throw new Error(json.error || 'Erro ao atualizar status');
      }

      // 2. Confirma com os dados consolidados do servidor
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
            channel.postMessage({ type: 'STATUS_ALTERADO', id, status: novoStatus });
            channel.close();
          }
        }
      } catch (e) {}
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      throw error;
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
        onRecarregar={() => {
          carregarAgendamentos();
          carregarPendentes();
        }}
        carregando={carregando}
        somHabilitado={somHabilitado}
        onToggleSom={() => {
          const novoEstado = notificacoes.toggleSom();
          setSomHabilitado(novoEstado);
          if (novoEstado) {
            notificacoes.tocarSomNovoAgendamento();
          }
        }}
        onTestarSom={() => {
          notificacoes.tocarSomNovoAgendamento();
        }}
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

      {/* Toast Flutuante de Alerta em Tempo Real */}
      <NotificationToast
        agendamento={toastAgendamento}
        onFechar={() => setToastAgendamento(null)}
        somHabilitado={somHabilitado}
        onToggleSom={() => {
          const novoEstado = notificacoes.toggleSom();
          setSomHabilitado(novoEstado);
        }}
        onTestarSom={() => notificacoes.tocarSomNovoAgendamento()}
        onVerDetalhes={(agendamento) => {
          setToastAgendamento(null);
          const alvoData = (agendamento.data || '').substring(0, 10);
          if (alvoData && alvoData !== dataSelecionada) {
            setDataSelecionada(alvoData);
          }
          setAgendamentoDestacadoId(agendamento.id);
          setTimeout(() => {
            const el = document.getElementById(`card-agendamento-${agendamento.id}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 300);
        }}
      />
    </main>
  );
}
