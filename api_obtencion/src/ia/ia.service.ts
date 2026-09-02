import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class IaService {
  private readonly logger = new Logger(IaService.name);

  /**
   * Intenta extraer parámetros de conciliación desde lenguaje natural
   */
  async interpretarPeticion(texto: string): Promise<{
    banco?: string;
    fechaInicio?: string;
    fechaFin?: string;
    accion?: 'conciliar' | 'estado' | 'detener' | 'desconocido';
    interpretacion?: string;
  }> {
    const apiKey = process.env.LLM_API_KEY;

    // Si hay API Key de LLM configurada, se puede usar OpenAI / Anthropic / Gemini
    if (apiKey) {
      try {
        return await this.interpretarConLLM(texto, apiKey);
      } catch (err: any) {
        this.logger.warn(`[IA] Fallo llamada LLM: ${err.message}. Usando parser heurístico.`);
      }
    }

    // Heurística determinista por expresiones regulares (Costo $0)
    return this.interpretarHeuristica(texto);
  }

  private async interpretarConLLM(texto: string, apiKey: string): Promise<any> {
    // LLM universal (OpenAI format / compatible con gateways)
    const baseUrl = process.env.LLM_BASE_URL || 'https://api.openai.com/v1';
    const model = process.env.LLM_MODEL || 'gpt-4o-mini';

    const systemPrompt = `Eres un asistente del motor de conciliación bancaria ONT SIGECOF. 
Tu tarea es extraer de la petición del usuario los siguientes parámetros en JSON:
- accion: "conciliar" | "estado" | "detener"
- banco: código del banco (ej. "105" para Mercantil, "102" para Venezuela, etc.)
- fechaInicio: fecha en formato YYYY-MM-DD
- fechaFin: fecha en formato YYYY-MM-DD (igual a fechaInicio si es un solo día)
- interpretacion: breve resumen de lo que entendiste
Responde ÚNICAMENTE con el objeto JSON válido.`;

    const resp = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: texto }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      })
    });

    if (!resp.ok) {
      throw new Error(`LLM Error HTTP ${resp.status}`);
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content;
    return JSON.parse(content);
  }

  private interpretarHeuristica(texto: string): any {
    const lower = texto.toLowerCase();

    if (lower.includes('estado') || lower.includes('status') || lower.includes('como va')) {
      return { accion: 'estado', interpretacion: 'Consulta de estado' };
    }

    if (lower.includes('deten') || lower.includes('parar') || lower.includes('cancelar')) {
      return { accion: 'detener', interpretacion: 'Solicitud de detención' };
    }

    // Buscar banco (ej: "105", "102", "0105", "banco 105")
    const bancoMatch = texto.match(/\b(?:banco\s*)?(\d{3,4})\b/i);
    const banco = bancoMatch ? bancoMatch[1] : undefined;

    // Buscar fechas YYYY-MM-DD o DD/MM/YYYY
    const fechaRegexIso = /\b(\d{4}-\d{2}-\d{2})\b/g;
    const fechasIso = texto.match(fechaRegexIso);

    if (fechasIso && fechasIso.length > 0) {
      return {
        accion: 'conciliar',
        banco,
        fechaInicio: fechasIso[0],
        fechaFin: fechasIso[1] || fechasIso[0],
        interpretacion: `Conciliar Banco ${banco || 'no especificado'} desde ${fechasIso[0]} hasta ${fechasIso[1] || fechasIso[0]}`
      };
    }

    return { accion: 'desconocido', interpretacion: 'No se identificaron parámetros claros de conciliación' };
  }
}
