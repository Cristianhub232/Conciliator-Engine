import { Injectable, Logger } from '@nestjs/common';

export interface IaProviderConfig {
  activeProvider: 'deepseek' | 'anthropic' | 'google';
  providers: {
    deepseek: {
      apiKey: string;
      baseUrl: string;
      model: string;
    };
    anthropic: {
      apiKey: string;
      baseUrl: string;
      model: string;
    };
    google: {
      apiKey: string;
      baseUrl: string;
      model: string;
    };
  };
}

@Injectable()
export class IaService {
  private readonly logger = new Logger(IaService.name);

  private config: IaProviderConfig = {
    activeProvider: (process.env.IA_ACTIVE_PROVIDER as any) || 'deepseek',
    providers: {
      deepseek: {
        apiKey: process.env.DEEPSEEK_API_KEY || process.env.LLM_API_KEY || '',
        baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
        model: process.env.DEEPSEEK_MODEL || 'deepseek-chat'
      },
      anthropic: {
        apiKey: process.env.ANTHROPIC_API_KEY || '',
        baseUrl: process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com/v1',
        model: process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-latest'
      },
      google: {
        apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '',
        baseUrl: process.env.GOOGLE_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta',
        model: process.env.GOOGLE_MODEL || 'gemini-1.5-flash'
      }
    }
  };

  /**
   * Obtiene la configuración actual enmascarando las claves secretas
   */
  public getConfig(): any {
    const mask = (key: string) => {
      if (!key) return '';
      if (key.length <= 8) return '********';
      return `${key.slice(0, 4)}...${key.slice(-4)}`;
    };

    return {
      activeProvider: this.config.activeProvider,
      providers: {
        deepseek: {
          hasKey: !!this.config.providers.deepseek.apiKey,
          maskedKey: mask(this.config.providers.deepseek.apiKey),
          baseUrl: this.config.providers.deepseek.baseUrl,
          model: this.config.providers.deepseek.model
        },
        anthropic: {
          hasKey: !!this.config.providers.anthropic.apiKey,
          maskedKey: mask(this.config.providers.anthropic.apiKey),
          baseUrl: this.config.providers.anthropic.baseUrl,
          model: this.config.providers.anthropic.model
        },
        google: {
          hasKey: !!this.config.providers.google.apiKey,
          maskedKey: mask(this.config.providers.google.apiKey),
          baseUrl: this.config.providers.google.baseUrl,
          model: this.config.providers.google.model
        }
      }
    };
  }

  /**
   * Actualiza la configuración en memoria
   */
  public updateConfig(newConfig: Partial<IaProviderConfig>): void {
    if (newConfig.activeProvider) {
      this.config.activeProvider = newConfig.activeProvider;
    }

    if (newConfig.providers) {
      for (const p of ['deepseek', 'anthropic', 'google'] as const) {
        if (newConfig.providers[p]) {
          const incoming = newConfig.providers[p]!;
          if (incoming.apiKey && !incoming.apiKey.includes('...')) {
            this.config.providers[p].apiKey = incoming.apiKey;
          }
          if (incoming.baseUrl) {
            this.config.providers[p].baseUrl = incoming.baseUrl;
          }
          if (incoming.model) {
            this.config.providers[p].model = incoming.model;
          }
        }
      }
    }

    this.logger.log(`[IA] Configuración actualizada. Proveedor activo: ${this.config.activeProvider}`);
  }

  /**
   * Interpreta petición del usuario usando el proveedor activo o fallback heurístico
   */
  async interpretarPeticion(texto: string): Promise<{
    banco?: string;
    fechaInicio?: string;
    fechaFin?: string;
    accion?: 'conciliar' | 'estado' | 'detener' | 'desconocido';
    interpretacion?: string;
  }> {
    const providerKey = this.config.activeProvider;
    const providerConf = this.config.providers[providerKey];

    if (providerConf?.apiKey) {
      try {
        this.logger.log(`[IA] Interpretando con ${providerKey.toUpperCase()} (${providerConf.model})...`);
        return await this.llamarProveedor(providerKey, providerConf, texto);
      } catch (err: any) {
        this.logger.warn(`[IA] Error en llamada a ${providerKey}: ${err.message}. Usando parser heurístico.`);
      }
    }

    return this.interpretarHeuristica(texto);
  }

  /**
   * Prueba un proveedor específico y calcula latencia
   */
  async testProvider(
    provider: 'deepseek' | 'anthropic' | 'google',
    apiKeyOverride?: string,
    baseUrlOverride?: string,
    modelOverride?: string,
    prompt: string = 'Por favor concilia el banco 105 desde 2024-04-15 hasta 2024-04-18'
  ): Promise<{
    success: boolean;
    provider: string;
    model: string;
    latencyMs: number;
    resultado: any;
    error?: string;
  }> {
    const conf = {
      apiKey: apiKeyOverride || this.config.providers[provider]?.apiKey || '',
      baseUrl: baseUrlOverride || this.config.providers[provider]?.baseUrl || '',
      model: modelOverride || this.config.providers[provider]?.model || ''
    };

    if (!conf.apiKey) {
      return {
        success: false,
        provider,
        model: conf.model,
        latencyMs: 0,
        resultado: null,
        error: `No hay API Key configurada para ${provider}`
      };
    }

    const t0 = Date.now();
    try {
      const res = await this.llamarProveedor(provider, conf, prompt);
      const latencyMs = Date.now() - t0;
      return {
        success: true,
        provider,
        model: conf.model,
        latencyMs,
        resultado: res
      };
    } catch (err: any) {
      return {
        success: false,
        provider,
        model: conf.model,
        latencyMs: Date.now() - t0,
        resultado: null,
        error: err.message
      };
    }
  }

  private async llamarProveedor(
    provider: 'deepseek' | 'anthropic' | 'google',
    conf: { apiKey: string; baseUrl: string; model: string },
    texto: string
  ): Promise<any> {
    const systemPrompt = `Eres un asistente del motor de conciliación bancaria ONT SIGECOF. 
Tu tarea es extraer de la petición del usuario los siguientes parámetros en JSON:
- accion: "conciliar" | "estado" | "detener"
- banco: código del banco (ej. "105" para Mercantil, "102" para Venezuela, etc.)
- fechaInicio: fecha en formato YYYY-MM-DD
- fechaFin: fecha en formato YYYY-MM-DD (igual a fechaInicio si es un solo día)
- interpretacion: breve resumen de lo que entendiste
Responde ÚNICAMENTE con el objeto JSON válido, sin delimitadores de markdown.`;

    if (provider === 'deepseek') {
      return this.llamarOpenAiCompatible(conf.baseUrl, conf.apiKey, conf.model, systemPrompt, texto);
    } else if (provider === 'anthropic') {
      return this.llamarAnthropic(conf.baseUrl, conf.apiKey, conf.model, systemPrompt, texto);
    } else if (provider === 'google') {
      return this.llamarGoogleGemini(conf.baseUrl, conf.apiKey, conf.model, systemPrompt, texto);
    }
    throw new Error(`Proveedor desconocido: ${provider}`);
  }

  private async llamarOpenAiCompatible(
    baseUrl: string,
    apiKey: string,
    model: string,
    systemPrompt: string,
    texto: string
  ): Promise<any> {
    const url = baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl.replace(/\/$/, '')}/chat/completions`;
    const resp = await fetch(url, {
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
      const errTxt = await resp.text();
      throw new Error(`DeepSeek/OpenAI HTTP ${resp.status}: ${errTxt}`);
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content;
    return this.parsearJson(content);
  }

  private async llamarAnthropic(
    baseUrl: string,
    apiKey: string,
    model: string,
    systemPrompt: string,
    texto: string
  ): Promise<any> {
    const url = baseUrl.endsWith('/messages') ? baseUrl : `${baseUrl.replace(/\/$/, '')}/messages`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens: 500,
        system: systemPrompt,
        messages: [
          { role: 'user', content: texto }
        ],
        temperature: 0.1
      })
    });

    if (!resp.ok) {
      const errTxt = await resp.text();
      throw new Error(`Anthropic HTTP ${resp.status}: ${errTxt}`);
    }

    const data = await resp.json();
    const content = data.content?.[0]?.text;
    return this.parsearJson(content);
  }

  private async llamarGoogleGemini(
    baseUrl: string,
    apiKey: string,
    model: string,
    systemPrompt: string,
    texto: string
  ): Promise<any> {
    const cleanBase = baseUrl.replace(/\/$/, '');
    const url = `${cleanBase}/models/${model}:generateContent?key=${apiKey}`;

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [
          { role: 'user', parts: [{ text: texto }] }
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json'
        }
      })
    });

    if (!resp.ok) {
      const errTxt = await resp.text();
      throw new Error(`Google Gemini HTTP ${resp.status}: ${errTxt}`);
    }

    const data = await resp.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return this.parsearJson(content);
  }

  private parsearJson(content: string): any {
    if (!content) throw new Error('Respuesta vacía del modelo de IA');
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  }

  private interpretarHeuristica(texto: string): any {
    const lower = texto.toLowerCase();

    if (lower.includes('estado') || lower.includes('status') || lower.includes('como va')) {
      return { accion: 'estado', interpretacion: 'Consulta de estado' };
    }

    if (lower.includes('deten') || lower.includes('parar') || lower.includes('cancelar')) {
      return { accion: 'detener', interpretacion: 'Solicitud de detención' };
    }

    const bancoMatch = texto.match(/\b(?:banco\s*)?(\d{3,4})\b/i);
    const banco = bancoMatch ? bancoMatch[1] : undefined;

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
