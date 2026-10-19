import { formatarMoeda, formatarDataCurta, sanitizeTelefoneWhatsApp } from './formatters';

export interface DadosMensagemWhatsApp {
  clienteNome: string;
  clienteTelefone: string;
  data: string;
  horarioInicio: string;
  horarioFim?: string;
  servicosTexto: string;
  valorTotal: number;
}

// Telefone oficial da Samara Designer (padrão fixo: 27 988459016 / 5527988459016)
export const TELEFONE_SAMARA_PADRAO = process.env.NEXT_PUBLIC_SAMARA_PHONE || '5527988459016';
export const TELEFONE_SAMARA_FORMATADO = '(27) 98845-9016';

/**
 * Link direto para conversar com a Samara no WhatsApp
 */
export function criarLinkContatoSamara(mensagemInicial?: string): string {
  const fone = sanitizeTelefoneWhatsApp(TELEFONE_SAMARA_PADRAO);
  const texto = mensagemInicial ? `?text=${encodeURIComponent(mensagemInicial)}` : '';
  return `https://wa.me/${fone}${texto}`;
}

/**
 * 1. Mensagem de Confirmação Regular (Samara para Cliente)
 */
export function gerarMensagemConfirmacao({
  clienteNome,
  data,
  horarioInicio,
  horarioFim,
  servicosTexto,
  valorTotal,
}: Omit<DadosMensagemWhatsApp, 'clienteTelefone'>): string {
  const primeiroNome = clienteNome.split(' ')[0];
  const dataFormatada = formatarDataCurta(data);
  const valorFormatado = formatarMoeda(valorTotal);
  const intervaloHorario = horarioFim ? `${horarioInicio} às ${horarioFim}` : horarioInicio;

  return `Oii, ${primeiroNome}! ✨ Que alegria: seu horário tá mais que confirmado por aqui! 🥰

📅 Data: ${dataFormatada}
⏰ Horário: ${intervaloHorario}
💅 Serviço: ${servicosTexto} 
💰 Valor: ${valorFormatado}

Tudo certinho pra te deixar ainda mais linda! Se precisar de algo ou quiser remarcar, é só me dar um alô por aqui. 

Te espero, viu? Um beijo! 💕`;
}

/**
 * 2. Mensagem da Cliente para a Samara (Notificação de Autoatendimento via Link Público)
 */
export function gerarMensagemSolicitacaoCliente({
  clienteNome,
  data,
  horarioInicio,
  horarioFim,
  servicosTexto,
  valorTotal,
}: Omit<DadosMensagemWhatsApp, 'clienteTelefone'>): string {
  const dataFormatada = formatarDataCurta(data);
  const valorFormatado = formatarMoeda(valorTotal);
  const intervaloHorario = horarioFim ? `${horarioInicio} às ${horarioFim}` : horarioInicio;

  return `Olá, Samara! ✨ Tudo bem?

Acabei de solicitar um agendamento pelo seu link de autoatendimento:

👤 *Nome:* ${clienteNome}
📅 *Data pretendida:* ${dataFormatada}
⏰ *Horário:* ${intervaloHorario}
💅 *Procedimento(s):* ${servicosTexto}
💰 *Valor previsto:* ${valorFormatado}

Fico no aguardo da sua aprovação! 💕`;
}

/**
 * 3. Mensagem de Aprovação da Samara para a Cliente (1 Clique no Painel)
 */
export function gerarMensagemAprovacao({
  clienteNome,
  data,
  horarioInicio,
  horarioFim,
  servicosTexto,
  valorTotal,
}: Omit<DadosMensagemWhatsApp, 'clienteTelefone'>): string {
  const primeiroNome = clienteNome.split(' ')[0];
  const dataFormatada = formatarDataCurta(data);
  const valorFormatado = formatarMoeda(valorTotal);
  const intervaloHorario = horarioFim ? `${horarioInicio} às ${horarioFim}` : horarioInicio;

  return `Oii, ${primeiroNome}! ✨ Que alegria: seu horário tá mais que confirmado por aqui! 🥰

📅 Data: ${dataFormatada}
⏰ Horário: ${intervaloHorario}
💅 Serviço: ${servicosTexto} 
💰 Valor: ${valorFormatado}

Tudo certinho pra te deixar ainda mais linda! Se precisar de algo ou quiser remarcar, é só me dar um alô por aqui. 

Te espero, viu? Um beijo! 💕`;
}

/**
 * 4. Mensagem de Recusa com Sugestão de Novo Horário (Samara para Cliente)
 */
export function gerarMensagemRecusa({
  clienteNome,
  data,
  horarioInicio,
  servicosTexto,
}: {
  clienteNome: string;
  data: string;
  horarioInicio: string;
  servicosTexto: string;
}): string {
  const primeiroNome = clienteNome.split(' ')[0];
  const dataFormatada = formatarDataCurta(data);

  return `Oi, ${primeiroNome}! Tudo bem? 💕

Aqui é a Samara Designer. Infelizmente tive um imprevisto na minha escala e não conseguirei atender no horário solicitado de ${dataFormatada} às ${horarioInicio} para *${servicosTexto}*.

Podemos verificar outro horário ou dia que fique bom para você? Estou à disposição para encaixarmos! ✨`;
}

/**
 * Cria a URL completa para disparar o WhatsApp Web ou App nativo
 */
export function criarLinkWhatsApp(dados: DadosMensagemWhatsApp): string {
  const telefoneLimpo = sanitizeTelefoneWhatsApp(dados.clienteTelefone);
  const mensagem = gerarMensagemConfirmacao(dados);
  return `https://wa.me/${telefoneLimpo}?text=${encodeURIComponent(mensagem)}`;
}

/**
 * Cria o link para a cliente avisar a Samara sobre a nova solicitação
 */
export function criarLinkNotificarSamara(
  dados: Omit<DadosMensagemWhatsApp, 'clienteTelefone'>,
  telefoneSamara = TELEFONE_SAMARA_PADRAO
): string {
  const telefoneLimpo = sanitizeTelefoneWhatsApp(telefoneSamara);
  const mensagem = gerarMensagemSolicitacaoCliente(dados);
  return `https://wa.me/${telefoneLimpo}?text=${encodeURIComponent(mensagem)}`;
}

/**
 * Cria o link para a Samara aprovar e notificar a cliente
 */
export function criarLinkAprovacaoSamara(dados: DadosMensagemWhatsApp): string {
  const telefoneLimpo = sanitizeTelefoneWhatsApp(dados.clienteTelefone);
  const mensagem = gerarMensagemAprovacao(dados);
  return `https://wa.me/${telefoneLimpo}?text=${encodeURIComponent(mensagem)}`;
}

/**
 * Cria o link para a Samara avisar a cliente sobre recusa/reagendamento
 */
export function criarLinkRecusaSamara(
  dados: { clienteNome: string; clienteTelefone: string; data: string; horarioInicio: string; servicosTexto: string }
): string {
  const telefoneLimpo = sanitizeTelefoneWhatsApp(dados.clienteTelefone);
  const mensagem = gerarMensagemRecusa(dados);
  return `https://wa.me/${telefoneLimpo}?text=${encodeURIComponent(mensagem)}`;
}
