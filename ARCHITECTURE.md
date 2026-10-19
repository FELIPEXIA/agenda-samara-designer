# 🌸 Agenda Samara Designer - Arquitetura do Sistema

Aplicativo web profissional de agendamento e gestão para estética e beleza, desenhado para alta performance na **Vercel** com banco de dados **PostgreSQL na nuvem** (Neon, Supabase ou Vercel Postgres).

---

## 📁 1. Estrutura de Pastas Recomendada (Next.js 14+ App Router)

```text
AGENDA SAMARA/
├── database/
│   ├── schema.sql              # DDL: Tabelas, Enums, Índices, Constraints e Views
│   └── seed.sql                # DML: Catálogo inicial de serviços e dados de teste
├── public/
│   └── icons/                  # Ícones, favicons e logo Samara Designer
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── agendamentos/
│   │   │   │   ├── route.ts    # GET (listar por dia), POST (criar agendamento)
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts# PATCH (mudar status), DELETE (cancelar)
│   │   │   ├── clientes/
│   │   │   │   └── route.ts    # GET (busca rápida/autocomplete), POST (novo cliente)
│   │   │   └── servicos/
│   │   │       └── route.ts    # GET (catálogo de serviços ativos)
│   │   ├── layout.tsx          # Layout global com fontes elegantes e tema
│   │   ├── page.tsx            # Página principal (Dashboard Diário e Linha do Tempo)
│   │   └── globals.css         # Estilização moderna, variáveis de cor e micro-animações
│   │
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── HeaderResumo.tsx      # Métricas do dia (total atendimentos, faturamento previsto)
│   │   │   ├── DateNavigator.tsx     # Seletor de data (Hoje, Anterior, Próximo)
│   │   │   ├── TimelineDiaria.tsx    # Linha do tempo visual com cards de horário
│   │   │   └── CardAgendamento.tsx   # Card com cores de status (Verde, Amarelo, Vermelho)
│   │   ├── agendamento/
│   │   │   ├── ModalNovoAgendamento.tsx  # Modal de marcação com cálculo automático
│   │   │   ├── SeletorClientes.tsx       # Autocomplete/cadastro instantâneo
│   │   │   └── SeletorServicos.tsx       # Seleção múltipla de combos e soma em tempo real
│   │   └── ui/
│   │       ├── BotaoWhatsapp.tsx         # Disparador do WhatsApp com mensagem pronta
│   │       ├── BadgeStatus.tsx           # Pílula de status estilizada
│   │       └── Modal.tsx                 # Componente base de modal com animação suave
│   │
│   ├── lib/
│   │   ├── db.ts               # Conexão Pool com PostgreSQL (pg ou @neondatabase/serverless)
│   │   ├── whatsapp.ts         # Formatador de links e mensagens do WhatsApp
│   │   ├── time-calc.ts        # Cálculo de horário_fim a partir de horário_inicio + duracao
│   │   └── formatters.ts       # Formatação de BRL (R$), telefone celular e datas
│   │
│   └── types/
│       ├── cliente.ts          # Interfaces TypeScript do Cliente
│       ├── servico.ts          # Interfaces TypeScript do Serviço
│       └── agendamento.ts      # Interfaces do Agendamento e Payload do Form
├── .env.example                # Variáveis de ambiente (DATABASE_URL)
├── package.json
└── tsconfig.json
```

---

## ⚡ 2. Regras de Negócio e Cálculos Automáticos

1. **Cálculo Automático de Horário de Término**:
   - `Duração Total = Σ (duracao_minutos de todos os serviços selecionados)`
   - `horario_fim = horario_inicio + duracao_total`
   - O sistema valida no back-end se há sobreposição com agendamentos já existentes e confirmados no mesmo dia.

2. **Cálculo de Valor Total**:
   - `Valor Total = Σ (valor_base de cada serviço)`
   - Permite flexibilidade de desconto manual se a Samara desejar aplicar na hora.

3. **Status e Identificação Visual**:
   - 🟢 **Confirmado**: Verde esmeralda (#10B981 / #059669)
   - 🟡 **Pendente**: Âmbar dourado (#F59E0B / #D97706)
   - 🔴 **Cancelado**: Rosa escuro / Carmim (#EF4444 / #DC2626)

4. **Mensagem do WhatsApp Pré-formatada**:
   - Exemplo:
     ```text
     Olá, {nome}! ✨
     Aqui é a Samara Designer.
     Passando para confirmar seu agendamento:
     📅 Data: {data}
     ⏰ Horário: {horario_inicio}
     💅 Serviços: {lista_servicos}
     💰 Valor total: {valor_total}
     
     Podemos confirmar? Nos vemos em breve! 💕
     ```
