'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Calendar,
  Clock,
  User,
  Phone,
  Check,
  Search,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  MessageCircle,
  XCircle,
  CheckCircle2,
  Share2,
} from 'lucide-react';
import { Servico, Agendamento, FormaPagamento } from '@/types';
import { formatarMoeda, formatarDuracaoHoras, formatarDataExtenso, formatarDataCurta } from '@/lib/formatters';
import { calcularHorarioFim, haConflitoDeHorario } from '@/lib/time-calc';
import { criarLinkNotificarSamara, TELEFONE_SAMARA_FORMATADO, criarLinkContatoSamara } from '@/lib/whatsapp';
import { ClienteDestaque } from '@/components/ui/ClienteDestaque';
import { BadgeStatus } from '@/components/ui/BadgeStatus';

// Horários comerciais padrões para atendimento
const HORARIOS_DISPONIVEIS_PADRAO = [
  '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30', '12:00', '13:00',
  '13:30', '14:00', '14:30', '15:00', '15:30', '16:00',
  '16:30', '17:00', '17:30', '18:00', '18:30', '19:00',
];

export default function AgendarPublicoPage() {
  const [etapa, setEtapa] = useState<1 | 2 | 3 | 4>(1);

  // Catálogo de serviços
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [carregandoServicos, setCarregandoServicos] = useState(true);
  const [filtroCategoria, setFiltroCategoria] = useState<string>('Todas');
  const [buscaServico, setBuscaServico] = useState<string>('');

  // Seleções do cliente
  const [servicosSelecionadosIds, setServicosSelecionadosIds] = useState<string[]>([]);
  const [dataSelecionada, setDataSelecionada] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [horarioInicio, setHorarioInicio] = useState<string>('09:00');

  // Dados pessoais
  const [nomeCliente, setNomeCliente] = useState('');
  const [telefoneCliente, setTelefoneCliente] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('Pix');

  // Ocupação do dia escolhido
  const [agendamentosDoDia, setAgendamentosDoDia] = useState<Agendamento[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Agendamento criado com sucesso
  const [agendamentoCriado, setAgendamentoCriado] = useState<Agendamento | null>(null);
  const [cancelando, setCancelando] = useState(false);

  // Carrega catálogo de serviços
  useEffect(() => {
    fetch('/api/servicos')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setServicos(json.data || []);
        }
      })
      .catch(console.error)
      .finally(() => setCarregandoServicos(false));
  }, []);

  // Carrega agendamentos da data selecionada para verificar horários ocupados
  useEffect(() => {
    if (dataSelecionada) {
      fetch(`/api/agendamentos?data=${dataSelecionada}`)
        .then((res) => res.json())
        .then((json) => {
          if (json.success) {
            setAgendamentosDoDia(json.data || []);
          }
        })
        .catch(console.error);
    }
  }, [dataSelecionada]);

  // Cálculos dinâmicos de serviços selecionados
  const servicosEscolhidos = useMemo(() => {
    return servicos.filter((s) => servicosSelecionadosIds.includes(s.id));
  }, [servicos, servicosSelecionadosIds]);

  const duracaoTotal = useMemo(() => {
    return servicosEscolhidos.reduce((acc, curr) => acc + curr.duracao_minutos, 0);
  }, [servicosEscolhidos]);

  const valorTotal = useMemo(() => {
    return servicosEscolhidos.reduce((acc, curr) => acc + Number(curr.valor_base), 0);
  }, [servicosEscolhidos]);

  const horarioFim = useMemo(() => {
    if (!duracaoTotal || !horarioInicio) return horarioInicio;
    return calcularHorarioFim(horarioInicio, duracaoTotal);
  }, [horarioInicio, duracaoTotal]);

  const servicosTexto = useMemo(() => {
    return servicosEscolhidos.map((s) => s.nome_servico).join(' + ');
  }, [servicosEscolhidos]);

  // Agendamentos ativos da data (excluindo cancelados)
  const ocupadosAtivos = useMemo(() => {
    return agendamentosDoDia.filter((a) => a.status !== 'Cancelado');
  }, [agendamentosDoDia]);

  // Checagem de conflito para o horário atual selecionado
  const conflitoAtual = useMemo(() => {
    if (!duracaoTotal || !horarioInicio) return null;
    return ocupadosAtivos.find((a) =>
      haConflitoDeHorario(horarioInicio, horarioFim, a.horario_inicio, a.horario_fim)
    ) || null;
  }, [ocupadosAtivos, horarioInicio, horarioFim, duracaoTotal]);

  // Filtragem do catálogo de serviços
  const servicosFiltrados = useMemo(() => {
    return servicos.filter((s) => {
      const matchBusca = s.nome_servico.toLowerCase().includes(buscaServico.toLowerCase());
      if (!matchBusca) return false;

      if (filtroCategoria === 'Todas') return true;
      if (filtroCategoria === 'Tradicionais') return s.categoria === 'Unhas Tradicionais';
      if (filtroCategoria === 'Gel') return s.categoria === 'Unhas em Gel';
      if (filtroCategoria === 'Sobrancelhas') return s.categoria === 'Sobrancelhas';
      if (filtroCategoria === 'Combos') return s.categoria.includes('Combos');
      return true;
    });
  }, [servicos, filtroCategoria, buscaServico]);

  const toggleServico = (id: string) => {
    setServicosSelecionadosIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Envio da solicitação pelo cliente (sempre nasce como Pendente)
  const handleFinalizarAgendamento = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (!nomeCliente.trim() || !telefoneCliente.trim()) {
      setErro('Por favor, informe seu nome e telefone/WhatsApp.');
      return;
    }

    if (servicosSelecionadosIds.length === 0) {
      setErro('Selecione pelo menos um procedimento para continuar.');
      return;
    }

    if (conflitoAtual) {
      setErro(
        `O horário selecionado (${horarioInicio} às ${horarioFim}) já foi reservado. Por favor, escolha outro horário livre.`
      );
      return;
    }

    setSalvando(true);
    try {
      const payload = {
        cliente: {
          nome: nomeCliente.trim(),
          telefone: telefoneCliente.trim(),
          observacoes: observacoes.trim(),
        },
        data: dataSelecionada,
        horario_inicio: horarioInicio,
        servicos_ids: servicosSelecionadosIds,
        forma_pagamento: formaPagamento,
        status: 'Pendente', // Autoatendimento entra como Pendente / Aguardando Aprovação
        observacoes: observacoes.trim(),
      };

      const res = await fetch('/api/agendamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Erro ao processar agendamento.');
      }

      setAgendamentoCriado(json.data);
      setEtapa(4); // Tela de Sucesso
    } catch (err: any) {
      setErro(err.message || 'Falha ao solicitar agendamento.');
    } finally {
      setSalvando(false);
    }
  };

  // Cancelamento imediato pelo cliente (autonomia sem travas)
  const handleCancelarAgendamento = async () => {
    if (!agendamentoCriado) return;
    const confirmou = window.confirm(
      'Tem certeza de que deseja cancelar esta solicitação de agendamento? O horário será liberado imediatamente.'
    );
    if (!confirmou) return;

    setCancelando(true);
    try {
      const res = await fetch(`/api/agendamentos/${agendamentoCriado.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Cancelado' }),
      });
      const json = await res.json();
      if (json.success) {
        setAgendamentoCriado((prev) => (prev ? { ...prev, status: 'Cancelado' } : null));
        alert('Agendamento cancelado com sucesso. O horário foi liberado.');
      }
    } catch (err) {
      alert('Erro ao cancelar agendamento.');
    } finally {
      setCancelando(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-main)',
        padding:
          etapa === 1 && servicosSelecionadosIds.length > 0
            ? '24px 16px 120px 16px'
            : '24px 16px 80px 16px',
        transition: 'padding-bottom 0.2s ease',
      }}
    >
      <div
        style={{
          maxWidth: '720px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        {/* Topo / Marca Samara Designer */}
        <header
          style={{
            backgroundColor: 'var(--bg-card)',
            padding: '24px',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-sm)',
            border: '1px solid var(--border-color)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary-soft)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(194, 89, 117, 0.2)',
            }}
          >
            <Sparkles size={24} />
          </div>

          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.8rem',
              fontWeight: 700,
              color: 'var(--text-main)',
              letterSpacing: '-0.02em',
              margin: 0,
            }}
          >
            Samara Designer
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '420px', margin: 0 }}>
            Agendamento Online de Manicure, Alongamento em Gel & Design de Sobrancelhas
          </p>

          <a
            href={criarLinkContatoSamara('Olá Samara! Acessei seu site de agendamento e gostaria de tirar uma dúvida.')}
            target="_blank"
            rel="noopener noreferrer"
            title="Falar com Samara no WhatsApp"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: '#15803d',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              padding: '4px 12px',
              borderRadius: '999px',
              textDecoration: 'none',
              marginTop: '4px',
              transition: 'all 0.15s ease',
            }}
          >
            <Phone size={13} />
            <span>WhatsApp Oficial: {TELEFONE_SAMARA_FORMATADO}</span>
          </a>

          {/* Barra de Progresso / Etapas (quando não estiver na tela de sucesso) */}
          {etapa !== 4 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '16px',
                width: '100%',
                maxWidth: '460px',
              }}
            >
              {[
                { num: 1, rotulo: 'Procedimentos' },
                { num: 2, rotulo: 'Data & Hora' },
                { num: 3, rotulo: 'Seus Dados' },
              ].map((step, idx) => {
                const ativo = etapa === step.num;
                const concluido = etapa > step.num;
                return (
                  <React.Fragment key={step.num}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.8125rem',
                        fontWeight: ativo || concluido ? 700 : 500,
                        color: ativo ? 'var(--primary)' : concluido ? 'var(--status-confirmado)' : 'var(--text-light)',
                      }}
                    >
                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          backgroundColor: ativo ? 'var(--primary)' : concluido ? 'var(--status-confirmado)' : 'var(--bg-card-subtle)',
                          color: ativo || concluido ? '#fff' : 'var(--text-light)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                        }}
                      >
                        {concluido ? <Check size={14} /> : step.num}
                      </div>
                      <span style={{ display: 'inline' }}>{step.rotulo}</span>
                    </div>
                    {idx < 2 && (
                      <div
                        style={{
                          flex: 1,
                          height: '2px',
                          backgroundColor: concluido ? 'var(--status-confirmado)' : 'var(--border-color)',
                        }}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </header>

        {erro && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 16px',
              backgroundColor: '#fef2f2',
              border: '1.5px solid #ef4444',
              borderRadius: 'var(--radius-sm)',
              color: '#991b1b',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            <AlertTriangle size={18} color="#dc2626" style={{ flexShrink: 0 }} />
            <span>{erro}</span>
          </div>
        )}

        {/* ======================================================== */}
        {/* ETAPA 1: ESCOLHA DE PROCEDIMENTOS                         */}
        {/* ======================================================== */}
        {etapa === 1 && (
          <div
            className="animate-fade-in"
            style={{
              backgroundColor: 'var(--bg-card)',
              padding: '24px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', color: 'var(--text-main)', margin: 0 }}>
                1. Escolha seus procedimentos
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Selecione os procedimentos desejados. Você pode escolher mais de um combo.
              </p>
            </div>

            {/* Barra de Busca e Filtros */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ position: 'relative' }}>
                <Search
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-light)',
                  }}
                />
                <input
                  type="text"
                  placeholder="Pesquisar por nome (ex: Henna, Banho, Pé...)"
                  value={buscaServico}
                  onChange={(e) => setBuscaServico(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 36px',
                    fontSize: '0.875rem',
                    backgroundColor: 'var(--bg-main)',
                  }}
                />
              </div>

              {/* Categorias */}
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                {[
                  { id: 'Todas', rotulo: 'Todos (24)' },
                  { id: 'Tradicionais', rotulo: 'Unhas Tradicionais' },
                  { id: 'Gel', rotulo: 'Gel & Blindagem' },
                  { id: 'Sobrancelhas', rotulo: 'Sobrancelhas & Henna' },
                  { id: 'Combos', rotulo: 'Combos Especiais' },
                ].map((cat) => {
                  const ativa = filtroCategoria === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setFiltroCategoria(cat.id)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        border: `1px solid ${ativa ? 'var(--primary)' : 'var(--border-color)'}`,
                        backgroundColor: ativa ? 'var(--primary)' : 'var(--bg-card)',
                        color: ativa ? '#fff' : 'var(--text-muted)',
                      }}
                    >
                      {cat.rotulo}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Grid dos Serviços Oficiais */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: '10px',
                padding: '2px',
              }}
            >
              {servicosFiltrados.map((servico) => {
                const selecionado = servicosSelecionadosIds.includes(servico.id);
                return (
                  <div
                    key={servico.id}
                    onClick={() => toggleServico(servico.id)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: `2px solid ${selecionado ? 'var(--primary)' : 'var(--border-color)'}`,
                      backgroundColor: selecionado ? 'var(--primary-soft)' : 'var(--bg-card)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease',
                      boxShadow: selecionado ? '0 4px 12px rgba(194, 89, 117, 0.15)' : 'none',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: '0.9375rem',
                          fontWeight: 700,
                          color: selecionado ? 'var(--primary)' : 'var(--text-main)',
                        }}
                      >
                        {servico.nome_servico}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                        {servico.duracao_minutos} min ({formatarDuracaoHoras(servico.duracao_minutos)}) •{' '}
                        <strong style={{ color: 'var(--text-main)' }}>
                          {formatarMoeda(Number(servico.valor_base))}
                        </strong>
                      </div>
                    </div>

                    <div
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '6px',
                        border: `2px solid ${selecionado ? 'var(--primary)' : 'var(--border-color)'}`,
                        backgroundColor: selecionado ? 'var(--primary)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        flexShrink: 0,
                      }}
                    >
                      {selecionado && <Check size={14} />}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Barra de Resumo e Avançar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                paddingTop: '16px',
                borderTop: '1px solid var(--border-color)',
              }}
            >
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Previsão do Atendimento
                </span>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--primary)' }}>
                  {formatarMoeda(valorTotal)}{' '}
                  <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                    ({duracaoTotal} min • {formatarDuracaoHoras(duracaoTotal)})
                  </span>
                </div>
              </div>

              <button
                type="button"
                disabled={servicosSelecionadosIds.length === 0}
                onClick={() => {
                  setEtapa(2);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: servicosSelecionadosIds.length === 0 ? '#9ca3af' : 'var(--primary)',
                  color: '#fff',
                  padding: '12px 24px',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 700,
                  fontSize: '0.9375rem',
                  cursor: servicosSelecionadosIds.length === 0 ? 'not-allowed' : 'pointer',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <span>Avançar para Data & Horário</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* ETAPA 2: ESCOLHA DE DATA E HORÁRIO                       */}
        {/* ======================================================== */}
        {etapa === 2 && (
          <div
            className="animate-fade-in"
            style={{
              backgroundColor: 'var(--bg-card)',
              padding: '24px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
            }}
          >
            <div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', color: 'var(--text-main)', margin: 0 }}>
                2. Selecione a data e horário desejado
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Procedimento(s): <strong>{servicosTexto}</strong> ({duracaoTotal} min • {formatarDuracaoHoras(duracaoTotal)})
              </p>
            </div>

            {/* Seleção do Dia */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Selecione o Dia:
              </label>
              <div style={{ position: 'relative' }}>
                <Calendar
                  size={18}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-light)',
                  }}
                />
                <input
                  type="date"
                  value={dataSelecionada}
                  onChange={(e) => setDataSelecionada(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  style={{
                    width: '100%',
                    padding: '12px 12px 12px 40px',
                    fontSize: '0.9375rem',
                    fontWeight: 600,
                  }}
                />
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--primary)', fontWeight: 600 }}>
                📅 {formatarDataExtenso(dataSelecionada)}
              </div>
            </div>

            {/* Grade de Horários Livres / Sugeridos */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Horários Disponíveis (Início):
              </label>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
                  gap: '8px',
                }}
              >
                {HORARIOS_DISPONIVEIS_PADRAO.map((slot) => {
                  const slotFim = calcularHorarioFim(slot, duracaoTotal);
                  // Verifica se colide com qualquer agendamento existente
                  const temColisao = ocupadosAtivos.some((a) =>
                    haConflitoDeHorario(slot, slotFim, a.horario_inicio, a.horario_fim)
                  );
                  const isSelecionado = horarioInicio === slot;

                  return (
                    <button
                      key={slot}
                      type="button"
                      disabled={temColisao}
                      onClick={() => setHorarioInicio(slot)}
                      style={{
                        padding: '10px 8px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.875rem',
                        fontWeight: 700,
                        textAlign: 'center',
                        border: `1.5px solid ${
                          temColisao
                            ? '#fecaca'
                            : isSelecionado
                            ? 'var(--primary)'
                            : 'var(--border-color)'
                        }`,
                        backgroundColor: temColisao
                          ? '#fef2f2'
                          : isSelecionado
                          ? 'var(--primary)'
                          : 'var(--bg-card)',
                        color: temColisao
                          ? '#9ca3af'
                          : isSelecionado
                          ? '#ffffff'
                          : 'var(--text-main)',
                        cursor: temColisao ? 'not-allowed' : 'pointer',
                        textDecoration: temColisao ? 'line-through' : 'none',
                        boxShadow: isSelecionado ? '0 2px 8px rgba(194, 89, 117, 0.25)' : 'none',
                      }}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Alerta de Conflito em tempo real */}
            {conflitoAtual && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '12px 14px',
                  backgroundColor: '#fef2f2',
                  border: '1.5px solid #ef4444',
                  borderRadius: 'var(--radius-sm)',
                  color: '#991b1b',
                  fontSize: '0.875rem',
                }}
              >
                <AlertTriangle size={18} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong>Horário Ocupado:</strong> O intervalo das {horarioInicio} às {horarioFim} colide com um agendamento já reservado. Por favor, clique em outro horário acima.
                </div>
              </div>
            )}

            {/* Horário Calculado de Término */}
            <div
              style={{
                backgroundColor: 'var(--primary-soft)',
                border: '1px solid var(--primary-border)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
                  Intervalo Reservado na Agenda
                </span>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                  {horarioInicio} até {horarioFim} ({duracaoTotal} min)
                </div>
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>
                {formatarMoeda(valorTotal)}
              </div>
            </div>

            {/* Ações */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
              <button
                type="button"
                onClick={() => setEtapa(1)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 16px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-muted)',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                }}
              >
                <ArrowLeft size={16} />
                Voltar
              </button>

              <button
                type="button"
                disabled={!!conflitoAtual}
                onClick={() => setEtapa(3)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: conflitoAtual ? '#9ca3af' : 'var(--primary)',
                  color: '#fff',
                  padding: '12px 24px',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 700,
                  fontSize: '0.9375rem',
                  cursor: conflitoAtual ? 'not-allowed' : 'pointer',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <span>Avançar para Seus Dados</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* ETAPA 3: DADOS DA CLIENTE & CONFIRMAÇÃO                    */}
        {/* ======================================================== */}
        {etapa === 3 && (
          <form
            onSubmit={handleFinalizarAgendamento}
            className="animate-fade-in"
            style={{
              backgroundColor: 'var(--bg-card)',
              padding: '24px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
            }}
          >
            <div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', color: 'var(--text-main)', margin: 0 }}>
                3. Preencha seus dados de contato
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                A Samara receberá sua solicitação e você poderá confirmar diretamente via WhatsApp.
              </p>
            </div>

            {/* Resumo Rápido da Escolha */}
            <div
              style={{
                backgroundColor: 'var(--bg-main)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                fontSize: '0.875rem',
              }}
            >
              <div>📅 <strong>Data:</strong> {formatarDataExtenso(dataSelecionada)}</div>
              <div>⏰ <strong>Horário:</strong> {horarioInicio} às {horarioFim}</div>
              <div>💅 <strong>Procedimento(s):</strong> {servicosTexto}</div>
              <div>💰 <strong>Valor Total:</strong> {formatarMoeda(valorTotal)}</div>
            </div>

            {/* Nome Completo */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Seu Nome Completo *
              </label>
              <div style={{ position: 'relative' }}>
                <User
                  size={18}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-light)',
                  }}
                />
                <input
                  type="text"
                  placeholder="Ex: Maria Eduarda Silva"
                  value={nomeCliente}
                  onChange={(e) => setNomeCliente(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 12px 12px 40px',
                    fontSize: '0.9375rem',
                  }}
                />
              </div>
            </div>

            {/* Telefone / WhatsApp */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Seu Telefone / WhatsApp (com DDD) *
              </label>
              <div style={{ position: 'relative' }}>
                <Phone
                  size={18}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-light)',
                  }}
                />
                <input
                  type="text"
                  placeholder="Ex: (27) 98845-9016"
                  value={telefoneCliente}
                  onChange={(e) => setTelefoneCliente(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 12px 12px 40px',
                    fontSize: '0.9375rem',
                  }}
                />
              </div>
            </div>

            {/* Forma de Pagamento Pretendida */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Forma de Pagamento
              </label>
              <select
                value={formaPagamento}
                onChange={(e) => setFormaPagamento(e.target.value as FormaPagamento)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '0.875rem',
                  backgroundColor: 'var(--bg-card)',
                }}
              >
                <option value="Pix">Pix</option>
                <option value="Dinheiro">Dinheiro</option>
                <option value="Cartao_Credito">Cartão de Crédito</option>
                <option value="Cartao_Debito">Cartão de Débito</option>
                <option value="A_Definir">A Definir no Atendimento</option>
              </select>
            </div>

            {/* Observações Opcionais */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Observações para a Samara (Opcional)
              </label>
              <textarea
                placeholder="Ex: cutícula fina, esmalte nude, referência especial..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                rows={2}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '0.875rem',
                  resize: 'none',
                }}
              />
            </div>

            {/* Botões */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
              <button
                type="button"
                onClick={() => setEtapa(2)}
                disabled={salvando}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 16px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-muted)',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                }}
              >
                <ArrowLeft size={16} />
                Voltar
              </button>

              <button
                type="submit"
                disabled={salvando}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: 'var(--primary)',
                  color: '#fff',
                  padding: '12px 28px',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 700,
                  fontSize: '0.9375rem',
                  boxShadow: '0 4px 14px rgba(194, 89, 117, 0.3)',
                }}
              >
                <Check size={18} />
                {salvando ? 'Enviando...' : 'Solicitar Agendamento'}
              </button>
            </div>
          </form>
        )}

        {/* ======================================================== */}
        {/* ETAPA 4: TELA DE CONFIRMAÇÃO & AUTONOMIA DO CLIENTE      */}
        {/* ======================================================== */}
        {etapa === 4 && agendamentoCriado && (
          <div
            className="animate-fade-in"
            style={{
              backgroundColor: 'var(--bg-card)',
              padding: '28px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              textAlign: 'center',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'var(--status-pendente-bg)',
                color: 'var(--status-pendente)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(217, 119, 6, 0.2)',
              }}
            >
              <CheckCircle2 size={36} />
            </div>

            <div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', color: 'var(--text-main)', margin: 0 }}>
                Solicitação Enviada com Sucesso!
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '6px' }}>
                Seu agendamento foi registrado e está <strong>Aguardando Aprovação da Samara Designer</strong>.
              </p>
            </div>

            {/* Badge de Status */}
            <div>
              <BadgeStatus status={agendamentoCriado.status} />
            </div>

            {/* Card com o ClienteDestaque oficial */}
            <div style={{ width: '100%', textAlign: 'left' }}>
              <ClienteDestaque
                nome={agendamentoCriado.cliente_nome}
                telefone={agendamentoCriado.cliente_telefone}
                tag="CLIENTE AGENDADA"
                tamanho="grande"
              />
            </div>

            {/* Resumo dos Detalhes */}
            <div
              style={{
                width: '100%',
                backgroundColor: 'var(--bg-card-subtle)',
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                fontSize: '0.9rem',
                textAlign: 'left',
              }}
            >
              <div>📅 <strong>Data:</strong> {formatarDataCurta(agendamentoCriado.data)} ({formatarDataExtenso(agendamentoCriado.data)})</div>
              <div>⏰ <strong>Horário Reservado:</strong> {agendamentoCriado.horario_inicio.substring(0, 5)} às {agendamentoCriado.horario_fim.substring(0, 5)}</div>
              <div>💅 <strong>Procedimento(s):</strong> {agendamentoCriado.lista_servicos}</div>
              <div>💰 <strong>Valor Total:</strong> {formatarMoeda(Number(agendamentoCriado.valor_total))}</div>
            </div>

            {/* BOTÃO PRINCIPAL: Notificar Samara no WhatsApp */}
            <a
              href={criarLinkNotificarSamara({
                clienteNome: agendamentoCriado.cliente_nome,
                data: agendamentoCriado.data,
                horarioInicio: agendamentoCriado.horario_inicio.substring(0, 5),
                horarioFim: agendamentoCriado.horario_fim.substring(0, 5),
                servicosTexto: agendamentoCriado.lista_servicos || 'Procedimentos',
                valorTotal: Number(agendamentoCriado.valor_total),
              })}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                backgroundColor: '#25D366',
                color: '#ffffff',
                padding: '14px 28px',
                borderRadius: 'var(--radius-md)',
                fontSize: '1rem',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(37, 211, 102, 0.35)',
                width: '100%',
              }}
            >
              <MessageCircle size={20} />
              <span>Avisar Samara no WhatsApp</span>
            </a>

            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '-8px' }}>
              Destinatário: <strong>Samara Designer ({TELEFONE_SAMARA_FORMATADO})</strong>
            </div>

            {/* BOTÃO DE CANCELAMENTO PELO CLIENTE (SEM TRAVAS) */}
            {agendamentoCriado.status !== 'Cancelado' ? (
              <button
                type="button"
                onClick={handleCancelarAgendamento}
                disabled={cancelando}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  backgroundColor: 'transparent',
                  color: 'var(--status-cancelado)',
                  border: '1px solid var(--status-cancelado-border)',
                  padding: '10px 18px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                <XCircle size={16} />
                <span>{cancelando ? 'Cancelando...' : 'Desistir / Cancelar este Agendamento'}</span>
              </button>
            ) : (
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: 'var(--status-cancelado-bg)',
                  border: '1px solid var(--status-cancelado-border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--status-cancelado)',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                }}
              >
                ❌ Este agendamento foi cancelado e o horário liberado na agenda.
              </div>
            )}

            <div style={{ paddingTop: '8px' }}>
              <Link
                href="/agendar"
                onClick={() => {
                  setEtapa(1);
                  setAgendamentoCriado(null);
                  setServicosSelecionadosIds([]);
                  setNomeCliente('');
                  setTelefoneCliente('');
                  setObservacoes('');
                }}
                style={{
                  fontSize: '0.875rem',
                  color: 'var(--primary)',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                Fazer outro agendamento
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Barra Flutuante / Rodapé Fixo de Avanço (Etapa 1) */}
      {etapa === 1 && servicosSelecionadosIds.length > 0 && (
        <div
          className="animate-slide-up"
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 100,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderTop: '1px solid var(--border-color)',
            boxShadow: '0 -6px 24px rgba(43, 35, 38, 0.12)',
            padding: '12px 16px',
            paddingBottom: 'max(14px, env(safe-area-inset-bottom, 14px))',
          }}
        >
          <div
            style={{
              maxWidth: '720px',
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--primary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em',
                  }}
                >
                  {servicosSelecionadosIds.length === 1
                    ? '1 procedimento'
                    : `${servicosSelecionadosIds.length} procedimentos`}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>•</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  {duracaoTotal} min ({formatarDuracaoHoras(duracaoTotal)})
                </span>
              </div>
              <div
                style={{
                  fontSize: '1.35rem',
                  fontWeight: 800,
                  color: 'var(--primary)',
                  lineHeight: 1.2,
                  marginTop: '2px',
                }}
              >
                {formatarMoeda(valorTotal)}
              </div>
            </div>

            <button
              type="button"
              id="btn-avancar-etapa-flutuante"
              onClick={() => {
                setEtapa(2);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                backgroundColor: 'var(--primary)',
                color: '#ffffff',
                padding: '13px 22px',
                borderRadius: 'var(--radius-md)',
                fontWeight: 700,
                fontSize: '0.9375rem',
                boxShadow: '0 4px 14px rgba(194, 89, 117, 0.35)',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <span className="btn-floating-text-full">Avançar para Data & Horário</span>
              <span className="btn-floating-text-short">Avançar</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
