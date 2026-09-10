'use client';

import React, { useEffect, useState } from 'react';
import { BANCOS_OFICIALES_BASE, fetchBancosCatalog, BancoItem } from '../services/bancosCatalog';

export interface BancoSelectorProps {
  value: string;
  onChange: (bancoCodigo: string) => void;
  includeTodos?: boolean;
  todosLabel?: string;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
  required?: boolean;
}

export const BancoSelector: React.FC<BancoSelectorProps> = ({
  value,
  onChange,
  includeTodos = false,
  todosLabel = 'TODOS LOS BANCOS',
  disabled = false,
  className,
  style,
  id,
  required = true,
}) => {
  const [bancos, setBancos] = useState<BancoItem[]>(BANCOS_OFICIALES_BASE);

  useEffect(() => {
    fetchBancosCatalog().then((list) => {
      if (list && list.length > 0) {
        setBancos(list);
      }
    });
  }, []);

  // Si el valor actual viene en 4 dígitos (ej: "0102"), normalizar a 3 ("102") para el select
  const normalizedValue = value && value.length === 4 && value.startsWith('0') 
    ? value.substring(1) 
    : value;

  return (
    <select
      id={id}
      value={normalizedValue}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      required={required}
      className={className}
      style={{
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...style,
      }}
    >
      {includeTodos && (
        <option value="TODOS" style={{ fontWeight: 700, color: '#2563EB' }}>
          {todosLabel}
        </option>
      )}
      {bancos.map((b) => (
        <option key={b.codigo} value={b.codigo}>
          {b.label}
        </option>
      ))}
    </select>
  );
};
