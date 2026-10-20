'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { formatarDataExtenso, obterDataHojeLocal } from '@/lib/formatters';

interface DateNavigatorProps {
  dataSelecionada: string; // YYYY-MM-DD
  onMudarData: (novaData: string) => void;
}

export const DateNavigator: React.FC<DateNavigatorProps> = ({
  dataSelecionada,
  onMudarData,
}) => {
  const hojeStr = obterDataHojeLocal();
  const isHoje = dataSelecionada === hojeStr;

  const alterarDia = (dias: number) => {
    const [ano, mes, dia] = dataSelecionada.split('-').map(Number);
    const dataObj = new Date(ano, mes - 1, dia);
    dataObj.setDate(dataObj.getDate() + dias);
    const novoAno = dataObj.getFullYear();
    const novoMes = String(dataObj.getMonth() + 1).padStart(2, '0');
    const novoDia = String(dataObj.getDate()).padStart(2, '0');
    onMudarData(`${novoAno}-${novoMes}-${novoDia}`);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        backgroundColor: 'var(--bg-card)',
        padding: '16px 20px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-sm)',
        marginBottom: '20px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={() => alterarDia(-1)}
          aria-label="Dia anterior"
          style={{
            padding: '8px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-main)',
            backgroundColor: 'var(--bg-card)',
          }}
        >
          <ChevronLeft size={18} />
        </button>

        <button
          onClick={() => onMudarData(hojeStr)}
          style={{
            padding: '8px 14px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)',
            fontSize: '0.875rem',
            fontWeight: 600,
            backgroundColor: isHoje ? 'var(--primary-soft)' : 'var(--bg-card)',
            color: isHoje ? 'var(--primary)' : 'var(--text-main)',
          }}
        >
          Hoje
        </button>

        <button
          onClick={() => alterarDia(1)}
          aria-label="Próximo dia"
          style={{
            padding: '8px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-main)',
            backgroundColor: 'var(--bg-card)',
          }}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Título da Data Atual Extensa */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontFamily: 'var(--font-serif)',
          fontSize: '1.2rem',
          fontWeight: 600,
          color: 'var(--text-main)',
          textTransform: 'capitalize',
        }}
      >
        <CalendarIcon size={18} color="var(--primary)" />
        <span>{formatarDataExtenso(dataSelecionada)}</span>
      </div>

      {/* Input Picker de Data */}
      <div>
        <input
          type="date"
          value={dataSelecionada}
          onChange={(e) => onMudarData(e.target.value)}
          style={{
            padding: '8px 12px',
            fontSize: '0.875rem',
            cursor: 'pointer',
            color: 'var(--text-main)',
            backgroundColor: 'var(--bg-card)',
          }}
        />
      </div>
    </div>
  );
};
