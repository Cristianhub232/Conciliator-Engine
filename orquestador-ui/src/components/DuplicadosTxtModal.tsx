"use client";

import React, { useState } from 'react';
import { 
  AlertTriangle, 
  X, 
  Copy, 
  Check, 
  FileText, 
  Layers, 
  HelpCircle,
  TrendingDown
} from 'lucide-react';

export interface DuplicadoTxtItem {
  planilla: string;
  forma_codigo: string;
  monto: number;
  agencia: string;
  repeticiones: number;
  monto_excedente: number;
}

interface DuplicadosTxtModalProps {
  isOpen: boolean;
  onClose: () => void;
  duplicados: DuplicadoTxtItem[];
  totalDuplicadas: number;
  montoTotalDuplicadas: number;
  fecha: string;
  banco: string;
  totalBrutoTxt?: number;
  totalUnico?: number;
}

export const DuplicadosTxtModal: React.FC<DuplicadosTxtModalProps> = ({
  isOpen,
  onClose,
  duplicados = [],
  totalDuplicadas,
  montoTotalDuplicadas,
  fecha,
  banco,
  totalBrutoTxt,
  totalUnico,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyAllPlanillas = () => {
    const list = duplicados.map((d) => d.planilla).join('\n');
    navigator.clipboard.writeText(list);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  const filtered = duplicados.filter(
    (d) =>
      d.planilla.includes(searchTerm.trim()) ||
      d.forma_codigo.includes(searchTerm.trim()) ||
      d.agencia.includes(searchTerm.trim())
  );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(5px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '820px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}
      >
        {/* Cabecera */}
        <div
          style={{
            padding: '20px 24px',
            background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
            borderBottom: '1px solid #FDE68A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: '#D97706',
                color: '#ffffff',
                display: 'grid',
                placeItems: 'center',
                boxShadow: '0 4px 10px rgba(217, 119, 6, 0.25)',
              }}
            >
              <Layers size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    backgroundColor: '#B45309',
                    color: '#ffffff',
                    padding: '2px 7px',
                    borderRadius: '4px',
                  }}
                >
                  Auditoría Forense TXT
                </span>
                <span style={{ fontSize: '12px', color: '#92400E', fontWeight: 600 }}>
                  Fecha: {fecha} | Banco: {banco}
                </span>
              </div>
              <h3
                style={{
                  margin: '3px 0 0',
                  fontSize: '17px',
                  fontWeight: 800,
                  color: '#78350F',
                }}
              >
                Planillas Duplicadas en Archivo Bancario (TXT SENIAT)
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#92400E',
              padding: '6px',
              borderRadius: '8px',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Resumen KPI y Nota Aclaratoria */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', background: '#fafafa' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
              marginBottom: '14px',
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                background: '#ffffff',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
              }}
            >
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Registros Duplicados
              </span>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#d97706', marginTop: '2px' }}>
                {totalDuplicadas}{' '}
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8' }}>filas sobrantes</span>
              </div>
            </div>

            <div
              style={{
                padding: '12px 16px',
                background: '#ffffff',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
              }}
            >
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Monto Excedente Duplicado
              </span>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#b45309', marginTop: '2px' }}>
                Bs.{' '}
                {montoTotalDuplicadas.toLocaleString('es-VE', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>

            {totalBrutoTxt !== undefined && totalUnico !== undefined && (
              <div
                style={{
                  padding: '12px 16px',
                  background: '#ffffff',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Consolidación Contable
                </span>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                  <span style={{ color: '#64748b' }}>{totalBrutoTxt} brutos</span> →{' '}
                  <strong style={{ color: '#059669' }}>{totalUnico} únicas procesables</strong>
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              padding: '12px 14px',
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#1E40AF',
              lineHeight: 1.45,
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
            }}
          >
            <HelpCircle size={17} style={{ flexShrink: 0, marginTop: '2px', color: '#2563EB' }} />
            <div>
              <strong>¿Por qué ocurre esta diferencia?</strong> El banco recaudador transmitió el mismo registro
              tributario 2 o más veces dentro del archivo TXT original. El motor de <strong>Conciliación Masiva</strong>{' '}
              unifica automáticamente estas planillas aplicando <code>SELECT DISTINCT</code> para proteger la base de datos{' '}
              <code>ORG_LIQ.PLANILLA</code> de cobros o registros duplicados.
            </div>
          </div>
        </div>

        {/* Barra de búsqueda y acciones rápidas */}
        <div
          style={{
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            borderBottom: '1px solid #f1f5f9',
          }}
        >
          <input
            type="text"
            placeholder="Buscar por planilla, forma o agencia..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              maxWidth: '360px',
              height: '36px',
              padding: '0 12px',
              fontSize: '12.5px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              outline: 'none',
            }}
          />

          <button
            onClick={handleCopyAllPlanillas}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              height: '36px',
              padding: '0 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: copiedAll ? '#F0FDF4' : '#ffffff',
              color: copiedAll ? '#16A34A' : '#334155',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {copiedAll ? <Check size={14} /> : <Copy size={14} />}
            {copiedAll ? '¡Planillas Copiadas!' : 'Copiar Lista de Planillas'}
          </button>
        </div>

        {/* Tabla de duplicados */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 20px' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '12.5px',
              textAlign: 'left',
              marginTop: '12px',
            }}
          >
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '11px', fontWeight: 800 }}>
                <th style={{ padding: '8px 10px' }}>N° PLANILLA</th>
                <th style={{ padding: '8px 10px' }}>FORMA</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>MONTO TXT (Bs.)</th>
                <th style={{ padding: '8px 10px', textAlign: 'center' }}>VECES EN TXT</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>MONTO EXCEDENTE</th>
                <th style={{ padding: '8px 10px', textAlign: 'center' }}>AGENCIA</th>
                <th style={{ padding: '8px 10px', textAlign: 'center' }}>ACCIÓN</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                    No se encontraron registros con los criterios indicados.
                  </td>
                </tr>
              ) : (
                filtered.map((item, i) => (
                  <tr
                    key={i}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: i % 2 === 0 ? '#ffffff' : '#f8fafc',
                    }}
                  >
                    <td style={{ padding: '10px', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>
                      {item.planilla}
                    </td>
                    <td style={{ padding: '10px' }}>
                      <span
                        style={{
                          backgroundColor: '#fef3c7',
                          color: '#92400e',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: 700,
                          fontSize: '11px',
                        }}
                      >
                        {item.forma_codigo}
                      </span>
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 600 }}>
                      Bs.{' '}
                      {item.monto.toLocaleString('es-VE', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <span
                        style={{
                          backgroundColor: '#fee2e2',
                          color: '#b91c1c',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontWeight: 800,
                          fontSize: '11px',
                        }}
                      >
                        {item.repeticiones} veces
                      </span>
                    </td>
                    <td
                      style={{
                        padding: '10px',
                        textAlign: 'right',
                        fontWeight: 800,
                        color: '#b45309',
                      }}
                    >
                      +Bs.{' '}
                      {item.monto_excedente.toLocaleString('es-VE', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center', color: '#64748b' }}>
                      {item.agencia || 'S/A'}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleCopy(item.planilla, item.planilla)}
                        title="Copiar N° de Planilla"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: copiedId === item.planilla ? '#16a34a' : '#64748b',
                          padding: '4px',
                        }}
                      >
                        {copiedId === item.planilla ? <Check size={15} /> : <Copy size={15} />}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pie de modal */}
        <div
          style={{
            padding: '16px 24px',
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            Mostrando {filtered.length} de {duplicados.length} casos duplicados
          </span>
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px',
              backgroundColor: '#334155',
              color: '#ffffff',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Cerrar Auditoría
          </button>
        </div>
      </div>
    </div>
  );
};
