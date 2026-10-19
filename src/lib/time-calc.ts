/**
 * Converte horário "HH:mm" ou "HH:mm:ss" para minutos a partir de 00:00
 */
export function timeParaMinutos(horarioStr: string): number {
  if (!horarioStr) return 0;
  const partes = horarioStr.split(':').map(Number);
  const horas = partes[0] || 0;
  const minutos = partes[1] || 0;
  return horas * 60 + minutos;
}

/**
 * Converte minutos a partir de 00:00 para string "HH:mm"
 */
export function minutosParaTime(totalMinutos: number): string {
  const horas = Math.floor(totalMinutos / 60) % 24;
  const minutos = totalMinutos % 60;
  const hh = horas.toString().padStart(2, '0');
  const mm = minutos.toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Calcula o horário de término baseado no horário de início e duração em minutos
 * Ex: calcularHorarioFim("14:00", 90) => "15:30"
 */
export function calcularHorarioFim(horarioInicio: string, duracaoMinutos: number): string {
  const inicioMin = timeParaMinutos(horarioInicio);
  const fimMin = inicioMin + duracaoMinutos;
  return minutosParaTime(fimMin);
}

/**
 * Verifica se dois intervalos de horário colidem (overlap)
 */
export function haConflitoDeHorario(
  inicioA: string,
  fimA: string,
  inicioB: string,
  fimB: string
): boolean {
  const startA = timeParaMinutos(inicioA);
  const endA = timeParaMinutos(fimA);
  const startB = timeParaMinutos(inicioB);
  const endB = timeParaMinutos(fimB);

  // Conflito existe se o início de um for anterior ao fim do outro e vice-versa
  return Math.max(startA, startB) < Math.min(endA, endB);
}
