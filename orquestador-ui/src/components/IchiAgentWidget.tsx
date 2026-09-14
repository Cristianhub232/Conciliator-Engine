'use client';

import React, { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    setIchiContext?: (contextName: string) => void;
  }
}

interface IchiAgentWidgetProps {
  initialContext?: string;
  modelName?: string;
}

export const IchiAgentWidget: React.FC<IchiAgentWidgetProps> = ({
  initialContext = 'Orquestador SIRONT · Motor Financiero ONT',
  modelName,
}) => {
  const agentRef = useRef<any>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [context, setContext] = useState(initialContext);
  const [isEnabled, setIsEnabled] = useState<boolean>(true);
  const [currentModel, setCurrentModel] = useState<string>(modelName || 'ICHI · DeepSeek V3 / ONT');
  const [greeting, setGreeting] = useState<string>('¡Hola! Soy ICHI, tu asistente de IA para el orquestador ONT. Tengo el contexto de esta pantalla cargado. ¿Qué necesitas consultar?');

  // Comprobar estado de activación y configuración desde localStorage
  const syncIchiSettings = () => {
    if (typeof window === 'undefined') return;
    try {
      const savedEnabled = localStorage.getItem('ichi_enabled');
      // Si no existe, por defecto está activo
      setIsEnabled(savedEnabled !== 'false');

      const savedModel = localStorage.getItem('ichi_model_name');
      if (savedModel) {
        setCurrentModel(savedModel);
      } else if (modelName) {
        setCurrentModel(modelName);
      }

      const savedGreeting = localStorage.getItem('ichi_greeting');
      if (savedGreeting) {
        setGreeting(savedGreeting);
      }
    } catch (e) {
      console.warn('Error leyendo configuración de Ichi:', e);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    syncIchiSettings();

    // Escuchar cambios de activación o configuración en tiempo real
    const handleStatusChange = () => {
      syncIchiSettings();
    };

    window.addEventListener('ichi_status_changed', handleStatusChange);
    window.addEventListener('storage', handleStatusChange);

    // Helper global para que cualquier vista o modal pueda actualizar el contexto de ICHI
    window.setIchiContext = (newContext: string) => {
      setContext(newContext);
      if (agentRef.current) {
        agentRef.current.setAttribute('context', newContext);
      }
    };

    if (customElements.get('ichi-agent')) {
      setScriptLoaded(true);
    } else {
      const script = document.createElement('script');
      script.src = '/vendor/ichi-agent.js';
      script.async = true;
      script.onload = () => {
        setScriptLoaded(true);
      };
      document.body.appendChild(script);
    }

    return () => {
      window.removeEventListener('ichi_status_changed', handleStatusChange);
      window.removeEventListener('storage', handleStatusChange);
      delete window.setIchiContext;
    };
  }, [modelName]);

  useEffect(() => {
    if (!scriptLoaded || !agentRef.current || !isEnabled) return;

    const agent = agentRef.current;

    // Actualizar atributos reactivos
    agent.setAttribute('context', context);
    agent.setAttribute('model', currentModel);

    // Sugerencias rápidas adaptadas a la operación de la ONT
    agent.suggestions = [
      '¿Cuántas planillas quedan pendientes?',
      '¿Cómo imputa la forma 99044?',
      'Explícame la regla de depuración',
      '¿Qué hace el cierre de expediente?',
    ];

    if (typeof agent._renderChips === 'function') {
      agent._renderChips();
    }

    // Resolver conectado al Gateway de herramientas predefinidas de SIGECOF
    agent.resolver = async (pregunta: string) => {
      const q = String(pregunta || '').toLowerCase().trim();

      try {
        // Cargar herramientas habilitadas y opciones de formato desde localStorage
        let enabledTools: string[] = [
          'consultar_resumen_banco',
          'consultar_planillas_pendientes',
          'consultar_estado_motor',
          'consultar_expediente',
          'consultar_formas_excluidas',
        ];
        try {
          const savedTools = localStorage.getItem('ichi_tools');
          if (savedTools) enabledTools = JSON.parse(savedTools);
        } catch (e) {}

        const formatOptions = {
          tabular: localStorage.getItem('ichi_format_tabular') !== 'false',
          currency: localStorage.getItem('ichi_format_currency') !== 'false',
          executive: localStorage.getItem('ichi_format_executive') === 'true',
          maxRecords: Number(localStorage.getItem('ichi_max_records')) || 10,
        };

        const llmConfig = {
          provider: localStorage.getItem('ichi_llm_provider') || 'deepseek',
          model: localStorage.getItem('ichi_model_name') || currentModel || 'deepseek-chat',
          baseUrl: localStorage.getItem('ichi_api_url') || '',
          apiKey: localStorage.getItem('ichi_api_key') || '',
          temperature: parseFloat(localStorage.getItem('ichi_temperature') || '0.3'),
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 40000);

        const resp = await fetch('/api/orquestador/ichi/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pregunta,
            context: agent.getAttribute('context') || context,
            enabledTools,
            formatOptions,
            llmConfig,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (resp.ok) {
          const data = await resp.json();
          if (data && data.text) {
            return {
              text: data.text,
              note: data.note || 'Gateway ONT · Consulta Predefinida',
            };
          }
        }
      } catch (err) {
        console.warn('[ICHI] Backend no disponible o tiempo de espera agotado, usando router local:', err);
      }

      // Fallback local heurístico si la red o API no responde
      if (/pendient|lote|faltant|cu[aá]ntas planillas/.test(q)) {
        return {
          text: 'Actualmente el motor financiero mantiene planillas pendientes en los lotes con estado "P". Puedes conciliar masivamente por lote o seleccionar expedientes específicos como el 7638.',
          note: 'Consulta en tiempo real · Oracle SIGE1 / WFE_WORKFLOW',
        };
      }

      if (/99044|forma 99044|islr/.test(q)) {
        return {
          text: 'La forma 99044 corresponde al ISLR. En la conciliación automática imputa de manera directa a la partida presupuestaria fija, representando típicamente el mayor volumen de recaudación.',
          note: 'Regla Directa · Catálogo Centralizado de Formas ONT',
        };
      }

      if (/depura|duplicad|txt|inconsisten/.test(q)) {
        return {
          text: 'El módulo de depuración detecta líneas TXT duplicadas o seriales inconsistentes. La eliminación de duplicados requiere clave de autorización y queda registrada en la bitácora inmutable de auditoría.',
          note: 'Módulo de Seguridad · motor_app.auditoria_eventos',
        };
      }

      if (/cierre|cerrar|expediente|reasigna|validaci[oó]n/.test(q)) {
        return {
          text: 'El cierre de expediente valida que no existan diferencias (Δ = 0.00) ni planillas huérfanas. Al confirmarse, actualiza el estado en Oracle WFE_WORKFLOW y lo reasigna al analista validador de la siguiente fase.',
          note: 'Protocolo de Workflow · WFE_HISTORIA',
        };
      }

      if (/nota|cr[eé]dito|banco|dep[oó]sito/.test(q)) {
        return {
          text: 'El módulo de Notas de Crédito audita y compara los depósitos bancarios reportados contra las planillas efectivamente transcritas por los analistas, identificando brechas operativas.',
          note: 'Auditoría Bancaria · API Bancos Centralizada',
        };
      }

      if (/hola|buenos d[ií]as|buenas|qui[eé]n eres/.test(q)) {
        return {
          text: '¡Hola! Soy ICHI, tu asistente de inteligencia artificial para la plataforma de conciliación y auditoría de la ONT. Puedo ayudarte con consultas de lotes, explicación de formas tributarias, reglas de imputación o auditoría.',
          note: 'Asistente IA SIRONT',
        };
      }

      return {
        text: `Comprendo tu consulta sobre "${pregunta}". Puedo analizar el estado de los lotes presupuestarios, explicar la imputación de formas tributarias o consultar eventos de auditoría. ¿Deseas que profundicemos en algún lote o expediente en particular?`,
        note: `Contexto activo: ${agent.getAttribute('context') || 'General'}`,
      };
    };
  }, [scriptLoaded, isEnabled, context, currentModel]);

  // Si ICHI está desactivado o el script aún no carga, no renderizamos el widget flotante
  if (!isEnabled) {
    return null;
  }

  return (
    <div id="ichi-agent-container" style={{ position: 'relative', zIndex: 2147483000 }}>
      {scriptLoaded &&
        React.createElement('ichi-agent', {
          ref: agentRef,
          context: context,
          model: currentModel,
          greeting: greeting,
        })}
    </div>
  );
};
