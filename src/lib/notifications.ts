/**
 * Sistema de Notificações em Tempo Real da Agenda Samara
 * - Áudio via Web Audio API (som chime harmônico e elegante sem dependência de arquivos externos)
 * - Notificações nativas do Navegador / Desktop (com tratamento seguro de permissão)
 */

class NotificationManager {
  private audioCtx: AudioContext | null = null;
  private somHabilitado: boolean = true;

  constructor() {
    if (typeof window !== 'undefined') {
      const salvo = localStorage.getItem('agenda_som_habilitado');
      if (salvo !== null) {
        this.somHabilitado = salvo === 'true';
      }
    }
  }

  public isSomHabilitado(): boolean {
    return this.somHabilitado;
  }

  public toggleSom(): boolean {
    this.somHabilitado = !this.somHabilitado;
    if (typeof window !== 'undefined') {
      localStorage.setItem('agenda_som_habilitado', String(this.somHabilitado));
    }
    return this.somHabilitado;
  }

  private obterAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.audioCtx) {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass) {
          this.audioCtx = new AudioCtxClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      return this.audioCtx;
    } catch (e) {
      console.warn('Web Audio não suportado ou bloqueado:', e);
      return null;
    }
  }

  /**
   * Toca um chime sonoro suave e elegante (Dó5 - Mi5 - Sol5) de aviso de novo agendamento
   */
  public tocarSomNovoAgendamento() {
    if (!this.somHabilitado) return;

    try {
      const ctx = this.obterAudioContext();
      if (!ctx) return;

      const notas = [
        { freq: 523.25, time: 0.0, dur: 0.4 },  // C5
        { freq: 659.25, time: 0.12, dur: 0.4 }, // E5
        { freq: 783.99, time: 0.24, dur: 0.7 }, // G5
        { freq: 1046.50, time: 0.36, dur: 0.9 }, // C6 (brilho suave)
      ];

      notas.forEach(({ freq, time, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + time);

        // Curva de volume suave (ataque rápido, decay gradual tipo sino)
        gain.gain.setValueAtTime(0.0001, ctx.currentTime + time);
        gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + time + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + time + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + time);
        osc.stop(ctx.currentTime + time + dur + 0.05);
      });
    } catch (e) {
      console.warn('Erro ao tocar som:', e);
    }
  }

  /**
   * Solicita permissão para notificações nativas do sistema operacional
   */
  public async solicitarPermissaoNotificacoes(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    try {
      if (Notification.permission === 'default') {
        return await Notification.requestPermission();
      }
      return Notification.permission;
    } catch (e) {
      console.warn('Erro ao pedir permissão de notificação:', e);
      return 'denied';
    }
  }

  /**
   * Dispara uma notificação nativa com clique redirecionável
   */
  public enviarNotificacaoNavegador(
    titulo: string,
    corpo: string,
    onClique?: () => void
  ) {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      try {
        const notif = new Notification(titulo, {
          body: corpo,
          icon: '/favicon.ico',
          tag: 'novo-agendamento',
        });

        if (onClique) {
          notif.onclick = () => {
            window.focus();
            onClique();
            notif.close();
          };
        }
      } catch (e) {
        console.warn('Falha ao instanciar Notification:', e);
      }
    }
  }
}

export const notificacoes = new NotificationManager();
