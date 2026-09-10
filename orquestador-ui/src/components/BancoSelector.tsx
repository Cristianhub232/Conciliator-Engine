'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Search, ChevronDown, Check, X, Building2 } from 'lucide-react';
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
}) => {
  const [bancos, setBancos] = useState<BancoItem[]>(BANCOS_OFICIALES_BASE);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Cargar catálogo actualizado desde la API
  useEffect(() => {
    fetchBancosCatalog().then((list) => {
      if (list && list.length > 0) {
        setBancos(list);
      }
    });
  }, []);

  // Manejar clic fuera para cerrar el desplegable
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Enfocar input de búsqueda automáticamente al abrir
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setHighlightedIndex(0);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Normalizar valor actual a 3 dígitos (ej: "0102" -> "102")
  const normalizedValue = value && value.length === 4 && value.startsWith('0') 
    ? value.substring(1) 
    : value;

  // Banco actualmente seleccionado
  const selectedBanco = useMemo(() => {
    return bancos.find((b) => b.codigo === normalizedValue || b.codigo_4 === value);
  }, [bancos, normalizedValue, value]);

  // Filtrado reactivo en memoria por texto o código
  const filteredBancos = useMemo(() => {
    if (!searchQuery.trim()) return bancos;
    const q = searchQuery.toLowerCase().trim();
    return bancos.filter((b) => {
      return (
        b.codigo.includes(q) ||
        b.codigo_4.includes(q) ||
        b.nombre_corto.toLowerCase().includes(q) ||
        b.nombre_banco.toLowerCase().includes(q)
      );
    });
  }, [bancos, searchQuery]);

  const handleSelect = (codigo: string) => {
    onChange(codigo);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const maxIndex = filteredBancos.length + (includeTodos ? 1 : 0) - 1;
      setHighlightedIndex((prev) => (prev < maxIndex ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const maxIndex = filteredBancos.length + (includeTodos ? 1 : 0) - 1;
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : maxIndex));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (includeTodos && highlightedIndex === 0) {
        handleSelect('TODOS');
      } else {
        const actualIdx = includeTodos ? highlightedIndex - 1 : highlightedIndex;
        if (filteredBancos[actualIdx]) {
          handleSelect(filteredBancos[actualIdx].codigo);
        }
      }
    }
  };

  return (
    <div
      ref={containerRef}
      id={id}
      style={{
        position: 'relative',
        display: 'inline-block',
        width: '100%',
        minWidth: style?.minWidth || '260px',
        userSelect: 'none',
      }}
      onKeyDown={handleKeyDown}
    >
      {/* Botón Disparador */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={className}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          textAlign: 'left',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          padding: '0 12px',
          ...style,
          background: style?.background || '#ffffff',
          border: isOpen ? '1px solid #2563EB' : style?.border || '1px solid #CBD5E1',
          boxShadow: isOpen ? '0 0 0 3px rgba(37, 99, 235, 0.15)' : 'none',
          transition: 'all 0.15s ease',
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {normalizedValue === 'TODOS' ? (
            <span style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px',
              fontWeight: 700, 
              color: '#2563EB',
              fontSize: '13px'
            }}>
              <Building2 size={15} color="#2563EB" />
              {todosLabel}
            </span>
          ) : selectedBanco ? (
            <>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '2px 6px',
                  borderRadius: '5px',
                  background: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  color: '#0F172A',
                  fontSize: '12px',
                  fontWeight: 800,
                  fontFamily: "'IBM Plex Mono', monospace",
                  flexShrink: 0,
                }}
              >
                {selectedBanco.codigo}
              </span>
              <span
                style={{
                  fontWeight: 600,
                  fontSize: '13.5px',
                  color: '#0F172A',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={selectedBanco.nombre_banco}
              >
                {selectedBanco.nombre_corto}
              </span>
            </>
          ) : (
            <span style={{ color: '#64748B', fontSize: '13px', fontWeight: 500 }}>
              {value ? `Banco ${value}` : 'Seleccione un banco...'}
            </span>
          )}
        </div>

        <ChevronDown
          size={16}
          color="#64748B"
          style={{
            flexShrink: 0,
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
          }}
        />
      </button>

      {/* Popover Desplegable con Buscador */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            width: '100%',
            minWidth: '340px',
            maxWidth: '460px',
            background: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #CBD5E1',
            boxShadow: '0 12px 30px -4px rgba(15, 23, 42, 0.15), 0 4px 6px -2px rgba(15, 23, 42, 0.05)',
            zIndex: 99999,
            overflow: 'hidden',
            animation: 'fadeIn 0.15s ease-out',
          }}
        >
          {/* Header del Popover: Buscador Integrado */}
          <div
            style={{
              padding: '10px 12px',
              borderBottom: '1px solid #E2E8F0',
              background: '#F8FAFC',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: '#ffffff',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                padding: '0 10px',
                height: '34px',
              }}
            >
              <Search size={14} color="#64748B" style={{ flexShrink: 0 }} />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setHighlightedIndex(0);
                }}
                placeholder="Buscar por nombre o código (ej: 102, Banesco)..."
                style={{
                  width: '100%',
                  border: 'none',
                  outline: 'none',
                  fontSize: '13px',
                  color: '#0F172A',
                  background: 'transparent',
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px',
                    color: '#94A3B8',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 2px' }}>
              <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                {filteredBancos.length} {filteredBancos.length === 1 ? 'banco disponible' : 'bancos disponibles'}
              </span>
              <span style={{ fontSize: '10px', color: '#94A3B8', fontFamily: 'monospace' }}>
                SUDEBAN / SENIAT
              </span>
            </div>
          </div>

          {/* Lista de Resultados Desplazable */}
          <div
            ref={listRef}
            style={{
              maxHeight: '260px',
              overflowY: 'auto',
              padding: '6px',
            }}
            role="listbox"
          >
            {/* Opción Especial "TODOS LOS BANCOS" */}
            {includeTodos && !searchQuery.trim() && (
              <div
                onClick={() => handleSelect('TODOS')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  background: normalizedValue === 'TODOS' ? '#EFF6FF' : highlightedIndex === 0 ? '#F1F5F9' : 'transparent',
                  border: normalizedValue === 'TODOS' ? '1px solid #BFDBFE' : '1px solid transparent',
                  marginBottom: '4px',
                  transition: 'background 0.1s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: '#DBEAFE',
                      color: '#1D4ED8',
                      fontSize: '11px',
                      fontWeight: 800,
                      fontFamily: "'IBM Plex Mono', monospace",
                    }}
                  >
                    ALL
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#1D4ED8' }}>
                    {todosLabel}
                  </span>
                </div>
                {normalizedValue === 'TODOS' && <Check size={16} color="#2563EB" />}
              </div>
            )}

            {/* Listado de Bancos Filtrados */}
            {filteredBancos.length > 0 ? (
              filteredBancos.map((b, idx) => {
                const isSelected = b.codigo === normalizedValue || b.codigo_4 === value;
                const isHighlighted = includeTodos && !searchQuery.trim() 
                  ? highlightedIndex === idx + 1 
                  : highlightedIndex === idx;

                return (
                  <div
                    key={b.codigo}
                    onClick={() => handleSelect(b.codigo)}
                    onMouseEnter={() => setHighlightedIndex(includeTodos && !searchQuery.trim() ? idx + 1 : idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      background: isSelected 
                        ? '#EFF6FF' 
                        : isHighlighted 
                          ? '#F8FAFC' 
                          : 'transparent',
                      border: isSelected ? '1px solid #BFDBFE' : '1px solid transparent',
                      marginBottom: '2px',
                      transition: 'all 0.1s ease',
                    }}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '2px 7px',
                          borderRadius: '5px',
                          background: isSelected ? '#DBEAFE' : '#F1F5F9',
                          border: isSelected ? '1px solid #93C5FD' : '1px solid #E2E8F0',
                          color: isSelected ? '#1E40AF' : '#0F172A',
                          fontSize: '12px',
                          fontWeight: 800,
                          fontFamily: "'IBM Plex Mono', monospace",
                          flexShrink: 0,
                        }}
                      >
                        {b.codigo}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '13px',
                            fontWeight: isSelected ? 700 : 600,
                            color: isSelected ? '#1E40AF' : '#0F172A',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {b.nombre_corto}
                        </div>
                        <div
                          style={{
                            fontSize: '11px',
                            color: '#64748B',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {b.codigo_4} · {b.nombre_banco}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <Check size={16} color="#2563EB" style={{ flexShrink: 0, marginLeft: '8px' }} />
                    )}
                  </div>
                );
              })
            ) : (
              <div
                style={{
                  padding: '24px 16px',
                  textAlign: 'center',
                  color: '#64748B',
                  fontSize: '13px',
                }}
              >
                <div style={{ fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  No se encontraron bancos
                </div>
                <div style={{ fontSize: '12px', color: '#94A3B8' }}>
                  Intente buscar con otro nombre o código numérico
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
