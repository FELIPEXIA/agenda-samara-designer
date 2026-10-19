'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, Clock, Calendar, User, Phone, Check, Sparkles, CreditCard, AlertCircle, AlertTriangle, Search } from 'lucide-react';
import { Servico, Cliente, FormaPagamento, CriarAgendamentoDTO, Agendamento } from '@/types';
import { formatarMoeda, formatarTelefone, formatarDuracaoHoras } from '@/lib/formatters';
import { calcularHorarioFim, haConflitoDeHorario } from '@/lib/time-calc';
import { ClienteDestaque } from '../ui/ClienteDestaque';

interface ModalNovoAgendamentoProps {
  aberto: boolean;
  onFechar: () => void;
  dataPreSelecionada: string;
  onAgendamentoCriado: () => void;
}

export const ModalNovoAgendamento: React.FC<ModalNovoAgendamentoProps> = ({
  aberto,
  onFechar,
  dataPreSelecionada,
  onAgendamentoCriado,
}) => {
  // Estados do formulário
  const [data, setData] = useState(dataPreSelecionada);
  const [horarioInicio, setHorarioInicio] = useState('09:00');
  const [clienteNome, setClienteNome] = useState('');
  const [clienteTelefone, setClienteTelefone] = useState('');
  const [clienteObs, setClienteObs] = useState('');
  const [servicosSelecionadosIds, setServicosSelecionadosIds] = useState<string[]>([]);
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('Pix');
  const [observacoesAgendamento, setObservacoesAgendamento] = useState('');

  // Estados de catálogo e busca
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [filtroCategoria, setFiltroCategoria] = useState<string>('Todas');
  const [buscaServico, setBuscaServico] = useState<string>('');
  const [clientesSugeridos, setClientesSugeridos] = useState<Cliente[]>([]);
  const [agendamentosDoDia, setAgendamentosDoDia] = useState<Agendamento[]>([]);
  const [buscandoCliente, setBuscandoCliente] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Sincroniza data se mudar externamente
  useEffect(() => {
    if (dataPreSelecionada) {
      setData(dataPreSelecionada);
    }
  }, [dataPreSelecionada]);

  // Carrega catálogo de serviços ao abrir o modal
  useEffect(() => {
    if (aberto) {
      fetch('/api/servicos')
        .then((res) => res.json())
        .then((json) => {
          if (json.success) {
            setServicos(json.data);
          }
        })
        .catch(console.error);
    }
  }, [aberto]);

  // Carrega agendamentos da data selecionada para validação e bloqueio de horários
  useEffect(() => {
    if (aberto && data) {
      fetch(`/api/agendamentos?data=${data}`)
        .then((res) => res.json())
        .then((json) => {
          if (json.success) {
            setAgendamentosDoDia(json.data || []);
          }
        })
        .catch(console.error);
    }
  }, [aberto, data]);

  // Autocomplete rápido de clientes
  useEffect(() => {
    if (clienteNome.length >= 2) {
      setBuscandoCliente(true);
      const timer = setTimeout(() => {
        fetch(`/api/clientes?busca=${encodeURIComponent(clienteNome)}`)
          .then((res) => res.json())
          .then((json) => {
            if (json.success) {
              setClientesSugeridos(json.data);
            }
          })
          .catch(console.error)
          .finally(() => setBuscandoCliente(false));
      }, 250);
      return () => clearTimeout(timer);
    } else {
      setClientesSugeridos([]);
    }
  }, [clienteNome]);
  const servicosEscolhidos = servicos.filter((s) => servicosSelecionadosIds.includes(s.id));
  const duracaoTotal = servicosEscolhidos.reduce((acc, curr) => acc + curr.duracao_minutos, 0);
  const valorTotal = servicosEscolhidos.reduce((acc, curr) => acc + Number(curr.valor_base), 0);
  const horarioFim = duracaoTotal > 0 ? calcularHorarioFim(horarioInicio, duracaoTotal) : horarioInicio;

  // Filtragem e busca de serviços na lista oficial
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

  // Agendamentos ocupados ativos na data selecionada
  const agendamentosOcupados = useMemo(() => {
    return agendamentosDoDia.filter((a) => a.status !== 'Cancelado');
  }, [agendamentosDoDia]);

  // Validação em tempo real de conflito (regra de intersecção):
  // (Novo_Inicio < Fim_Existente) AND (Novo_Fim > Inicio_Existente)
  const conflitoAtivo = useMemo(() => {
    if (!duracaoTotal || !horarioInicio) return null;
    return agendamentosOcupados.find((a) =>
      haConflitoDeHorario(horarioInicio, horarioFim, a.horario_inicio, a.horario_fim)
    ) || null;
  }, [agendamentosOcupados, horarioInicio, horarioFim, duracaoTotal]);

  const toggleServico = (id: string) => {
    setServicosSelecionadosIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selecionarClienteExistente = (cliente: Cliente) => {
    setClienteNome(cliente.nome);
    setClienteTelefone(cliente.telefone);
    if (cliente.observacoes) {
      setClienteObs(cliente.observacoes);
    }
    setClientesSugeridos([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (!clienteNome.trim() || !clienteTelefone.trim()) {
      setErro('Por favor, informe o nome e o telefone da cliente.');
      return;
    }

    if (servicosSelecionadosIds.length === 0) {
      setErro('Selecione ao menos um serviço para o agendamento.');
      return;
    }

    if (conflitoAtivo) {
      setErro(
        `Horário indisponível! O intervalo ${horarioInicio} às ${horarioFim} colide com o atendimento de "${conflitoAtivo.cliente_nome}" (${conflitoAtivo.horario_inicio.substring(0, 5)} - ${conflitoAtivo.horario_fim.substring(0, 5)}).`
      );
      return;
    }

    setSalvando(true);
    try {
      const payload: CriarAgendamentoDTO = {
        cliente: {
          nome: clienteNome.trim(),
          telefone: clienteTelefone.trim(),
          observacoes: clienteObs.trim(),
        },
        data,
        horario_inicio: horarioInicio,
        servicos_ids: servicosSelecionadosIds,
        forma_pagamento: formaPagamento,
        status: 'Confirmado',
        observacoes: observacoesAgendamento.trim(),
      };

      const res = await fetch('/api/agendamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Erro ao salvar agendamento');
      }

      // Sucesso!
      onAgendamentoCriado();
      onFechar();
      // Reseta form
      setClienteNome('');
      setClienteTelefone('');
      setClienteObs('');
      setServicosSelecionadosIds([]);
      setObservacoesAgendamento('');
    } catch (err: any) {
      setErro(err.message || 'Falha ao salvar agendamento.');
    } finally {
      setSalvando(false);
    }
  };

  if (!aberto) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(30, 20, 25, 0.65)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        className="animate-fade-in"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border-color)',
          width: '100%',
          maxWidth: '680px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Cabeçalho do Modal */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--bg-main)',
          }}
        >
          <div>
            <h2
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.4rem',
                fontWeight: 600,
                color: 'var(--text-main)',
              }}
            >
              Novo Agendamento
            </h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Selecione a cliente, os procedimentos e confira a duração automática.
            </p>
          </div>

          <button
            onClick={onFechar}
            aria-label="Fechar modal"
            style={{
              padding: '6px',
              borderRadius: '50%',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-muted)',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Corpo com Scroll */}
        <form
          onSubmit={handleSubmit}
          style={{
            padding: '24px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {erro && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                backgroundColor: 'var(--status-cancelado-bg)',
                border: '1px solid var(--status-cancelado-border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--status-cancelado)',
                fontSize: '0.875rem',
              }}
            >
              <AlertCircle size={16} />
              <span>{erro}</span>
            </div>
          )}

          {/* 1. SEÇÃO DA CLIENTE (Busca rápida ou nova) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
              1. Dados da Cliente
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                position: 'relative',
              }}
            >
              {/* Nome */}
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'relative' }}>
                  <User
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
                    placeholder="Nome da cliente (digite p/ buscar)"
                    value={clienteNome}
                    onChange={(e) => setClienteNome(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 36px',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>

                {/* Dropdown de sugestões de clientes existentes */}
                {clientesSugeridos.length > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      backgroundColor: 'var(--bg-card)',
                      boxShadow: 'var(--shadow-lg)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-color)',
                      zIndex: 10,
                      marginTop: '4px',
                      maxHeight: '180px',
                      overflowY: 'auto',
                    }}
                  >
                    {clientesSugeridos.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => selecionarClienteExistente(c)}
                        style={{
                          padding: '6px 8px',
                          cursor: 'pointer',
                          borderBottom: '1px solid var(--border-color)',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--primary-soft)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <ClienteDestaque
                          nome={c.nome}
                          telefone={c.telefone}
                          tag="CLIENTE CADASTRADA"
                          tamanho="medio"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Telefone */}
              <div style={{ position: 'relative' }}>
                <Phone
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
                  placeholder="WhatsApp / Telefone (com DDD)"
                  value={clienteTelefone}
                  onChange={(e) => setClienteTelefone(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 36px',
                    fontSize: '0.875rem',
                  }}
                />
              </div>
            </div>
          </div>

          {/* 2. SEÇÃO DE DATA E HORÁRIO DE INÍCIO */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                2. Data e Horário de Início
              </label>
              {conflitoAtivo && (
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#dc2626' }}>
                  ⚠️ Horário Indisponível
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ position: 'relative' }}>
                <Calendar
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
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 36px',
                    fontSize: '0.875rem',
                  }}
                />
              </div>

              <div style={{ position: 'relative' }}>
                <Clock
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: conflitoAtivo ? '#dc2626' : 'var(--text-light)',
                  }}
                />
                <input
                  type="time"
                  value={horarioInicio}
                  onChange={(e) => setHorarioInicio(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 36px',
                    fontSize: '0.875rem',
                    borderColor: conflitoAtivo ? '#ef4444' : 'var(--border-color)',
                    backgroundColor: conflitoAtivo ? '#fef2f2' : 'var(--bg-card)',
                  }}
                />
              </div>
            </div>

            {/* ALERTA DE CONFLITO EM TEMPO REAL COM CLIENTEDESTAQUE */}
            {conflitoAtivo && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  padding: '14px',
                  backgroundColor: '#fef2f2',
                  border: '2px solid #ef4444',
                  borderRadius: 'var(--radius-md)',
                  animation: 'fadeIn 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626', fontWeight: 800 }}>
                  <AlertTriangle size={20} />
                  <span>BLOQUEIO DE CONFLITO DE HORÁRIO!</span>
                </div>

                <div style={{ fontSize: '0.875rem', color: '#991b1b', lineHeight: 1.4 }}>
                  O intervalo pretendido (<strong>{horarioInicio} às {horarioFim}</strong>) colide com o horário desta cliente:
                </div>

                {/* Cliente em Conflito com padrão idêntico */}
                <ClienteDestaque
                  nome={conflitoAtivo.cliente_nome}
                  telefone={conflitoAtivo.cliente_telefone}
                  tag="CLIENTE EM CONFLITO"
                  tamanho="grande"
                  destaqueCor="alerta"
                />

                <div style={{ fontSize: '0.8125rem', color: '#b91c1c', fontWeight: 600 }}>
                  Horário ocupado por ela: {conflitoAtivo.horario_inicio.substring(0, 5)} às {conflitoAtivo.horario_fim.substring(0, 5)} ({conflitoAtivo.lista_servicos}).
                  <br />
                  👉 Escolha outro horário livre acima para liberar o agendamento.
                </div>
              </div>
            )}

            {/* LISTA DE HORÁRIOS OCUPADOS NESTA DATA COM CLIENTEDESTAQUE */}
            {agendamentosOcupados.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  marginTop: '6px',
                  backgroundColor: 'var(--bg-card-subtle)',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Horários já ocupados nesta data ({agendamentosOcupados.length}):
                </span>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {agendamentosOcupados.map((ocupado) => (
                    <div
                      key={ocupado.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        backgroundColor: '#ffffff',
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-color)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--primary)' }}>
                        <Clock size={14} />
                        <span>Horário Reservado: {ocupado.horario_inicio.substring(0, 5)} às {ocupado.horario_fim.substring(0, 5)} ({ocupado.duracao_total_minutos} min)</span>
                      </div>
                      <ClienteDestaque
                        nome={ocupado.cliente_nome}
                        telefone={ocupado.cliente_telefone}
                        tag="CLIENTE AGENDADA"
                        tamanho="medio"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 3. SELEÇÃO DE SERVIÇOS (MÚLTIPLOS / COMBOS) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                3. Tabela Oficial de Serviços & Combos ({servicos.length} procedimentos)
              </label>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {servicosSelecionadosIds.length} selecionado(s)
              </span>
            </div>

            {/* Barra de Filtro e Busca Rápida */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ position: 'relative' }}>
                <Search
                  size={15}
                  style={{
                    position: 'absolute',
                    left: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-light)',
                  }}
                />
                <input
                  type="text"
                  placeholder="Buscar procedimento (ex: Henna, Banho, Pé...)"
                  value={buscaServico}
                  onChange={(e) => setBuscaServico(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 32px',
                    fontSize: '0.8125rem',
                    backgroundColor: 'var(--bg-main)',
                  }}
                />
              </div>

              {/* Chips de Categoria */}
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                {[
                  { id: 'Todas', rotulo: 'Todos' },
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
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
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

            {/* Grid dos Cards de Serviços */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: '8px',
                maxHeight: '230px',
                overflowY: 'auto',
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
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: `1.5px solid ${selecionado ? 'var(--primary)' : 'var(--border-color)'}`,
                      backgroundColor: selecionado ? 'var(--primary-soft)' : 'var(--bg-card)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          color: selecionado ? 'var(--primary)' : 'var(--text-main)',
                        }}
                      >
                        {servico.nome_servico}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {servico.duracao_minutos} min ({formatarDuracaoHoras(servico.duracao_minutos)}) •{' '}
                        <strong style={{ color: 'var(--text-main)' }}>
                          {formatarMoeda(Number(servico.valor_base))}
                        </strong>
                      </div>
                    </div>

                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '4px',
                        border: `1.5px solid ${selecionado ? 'var(--primary)' : 'var(--border-color)'}`,
                        backgroundColor: selecionado ? 'var(--primary)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                      }}
                    >
                      {selecionado && <Check size={14} />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. BLOCO DE CÁLCULO AUTOMÁTICO EM TEMPO REAL (DESTAQUE) */}
          <div
            style={{
              backgroundColor: 'var(--primary-soft)',
              border: '1px solid var(--primary-border)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={16} color="var(--primary)" />
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
                  Cálculo Automático de Tempo & Bloqueio na Agenda
                </span>
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-main)', marginTop: '4px' }}>
                Horário reservado:{' '}
                <strong>
                  {horarioInicio} até {horarioFim}
                </strong>{' '}
                ({duracaoTotal} min • {formatarDuracaoHoras(duracaoTotal)} de bloqueio)
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Valor Total Previsto
              </span>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)' }}>
                {formatarMoeda(valorTotal)}
              </div>
            </div>
          </div>

          {/* 5. FORMA DE PAGAMENTO E OBSERVAÇÃO */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px', display: 'block' }}>
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

            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px', display: 'block' }}>
                Observação (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: cutícula fina, esmalte nude..."
                value={observacoesAgendamento}
                onChange={(e) => setObservacoesAgendamento(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '0.875rem',
                }}
              />
            </div>
          </div>

          {/* Rodapé com Botões de Ação */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px',
              paddingTop: '16px',
              borderTop: '1px solid var(--border-color)',
            }}
          >
            <button
              type="button"
              onClick={onFechar}
              disabled={salvando}
              style={{
                padding: '10px 18px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
              }}
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={salvando || !!conflitoAtivo}
              id="btn-confirmar-agendamento"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 24px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: conflitoAtivo ? '#9ca3af' : 'var(--primary)',
                cursor: conflitoAtivo ? 'not-allowed' : 'pointer',
                color: '#fff',
                fontSize: '0.875rem',
                fontWeight: 600,
                boxShadow: conflitoAtivo ? 'none' : 'var(--shadow-sm)',
                opacity: conflitoAtivo ? 0.75 : 1,
                transition: 'all 0.2s ease',
              }}
            >
              {conflitoAtivo ? (
                <>
                  <AlertTriangle size={16} />
                  <span>Horário Ocupado (Bloqueado)</span>
                </>
              ) : (
                <>
                  <Check size={16} />
                  <span>{salvando ? 'Salvando...' : 'Confirmar e Bloquear Horário'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
