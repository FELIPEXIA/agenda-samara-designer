/**
 * Formata um número para o formato de moeda Real Brasileiro (BRL)
 */
export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
}

/**
 * Formata um número de telefone para o padrão brasileiro: (99) 99999-9999 ou (99) 9999-9999
 */
export function formatarTelefone(telefone: string): string {
  const digitos = telefone.replace(/\D/g, '');
  
  // Se vier com o DDI 55 no início e tiver 12 ou 13 dígitos
  let num = digitos;
  if ((num.length === 12 || num.length === 13) && num.startsWith('55')) {
    num = num.substring(2);
  }

  if (num.length === 11) {
    return num.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  } else if (num.length === 10) {
    return num.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  }

  return telefone;
}

/**
 * Limpa o telefone mantendo apenas números para links do WhatsApp com DDI (padrão Brasil 55)
 */
export function sanitizeTelefoneWhatsApp(telefone: string): string {
  let digitos = telefone.replace(/\D/g, '');
  if (!digitos.startsWith('55') && (digitos.length === 10 || digitos.length === 11)) {
    digitos = '55' + digitos;
  }
  return digitos;
}

/**
 * Formata data YYYY-MM-DD para formato legível no Brasil (ex: "Sexta-feira, 24 de Outubro")
 */
export function formatarDataExtenso(dataStr: string): string {
  if (!dataStr) return '';
  const [ano, mes, dia] = dataStr.split('-').map(Number);
  const data = new Date(ano, mes - 1, dia);

  return data.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

/**
 * Formata data YYYY-MM-DD para DD/MM/AAAA
 */
export function formatarDataCurta(dataStr: string): string {
  if (!dataStr) return '';
  const [ano, mes, dia] = dataStr.split('-');
  return `${dia}/${mes}/${ano}`;
}

/**
 * Formata minutos em formato amigável de horas (ex: 120 -> "2h", 210 -> "3h30", 40 -> "40 min")
 */
export function formatarDuracaoHoras(minutos: number): string {
  if (!minutos || minutos <= 0) return '0 min';
  const horas = Math.floor(minutos / 60);
  const minRestantes = minutos % 60;

  if (horas === 0) {
    return `${minRestantes} min`;
  }
  if (minRestantes === 0) {
    return `${horas}h`;
  }
  return `${horas}h${minRestantes.toString().padStart(2, '0')}`;
}
