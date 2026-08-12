
import { IAProvider, IAProviderOptions, IAProviderResponse } from "./ia-types";

async function withFallback<T>(
  providers: IAProvider[],
  activeProviderName: string,
  fn: (provider: IAProvider) => Promise<T>
): Promise<T> {
  const activeIndex = providers.findIndex(p => p.name === activeProviderName);
  const active = providers[activeIndex];
  const others = providers.filter((_, i) => i !== activeIndex);
  const orderedProviders = active ? [active, ...others] : others;

  let lastError: Error | null = null;
  for (const provider of orderedProviders) {
    try {
      return await fn(provider);
    } catch (e) {
      console.error(`[IA] Falha no provedor ${provider.name}:`, e);
      lastError = e as Error;
    }
  }
  throw lastError || new Error("Todos os provedores de IA falharam.");
}

async function callAI(url: string, headers: any, body: any) {
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`AI API Error: ${res.status} - ${error}`);
  }
  return res.json();
}

export class GeminiProvider implements IAProvider {
  name = 'gemini' as const;
  async generateAnswer(options: IAProviderOptions): Promise<IAProviderResponse> {
    const apiKey = process.env['GEMINI_API_KEY'];
    if (!apiKey) throw new Error("GEMINI_API_KEY não configurada");
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
    const data = await callAI(url, { "Content-Type": "application/json" }, {
      contents: [{ parts: [{ text: `${options.contexto ? `Contexto:\n${options.contexto}\n\n` : ''}Pergunta: ${options.pergunta}` }] }]
    });
    
    return { 
      texto: data.candidates?.[0]?.content?.parts?.[0]?.text || "Desculpe, não consegui processar a resposta.", 
      provider: 'gemini' 
    };
  }
  
  async classifyContent(content: string) {
    return { marca: 'geral', categoria: 'geral' };
  }
}

export class OpenAIProvider implements IAProvider {
  name = 'openai' as const;
  async generateAnswer(options: IAProviderOptions): Promise<IAProviderResponse> {
    const apiKey = process.env['OPENAI_API_KEY'];
    if (!apiKey) throw new Error("OPENAI_API_KEY não configurada");
    
    const data = await callAI("https://api.openai.com/v1/chat/completions", {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    }, {
      model: "gpt-4o",
      messages: [
        { role: "system", content: "Você é um assistente técnico especializado em freios a ar para caminhões da Tecnoar Freios." },
        { role: "user", content: `${options.contexto ? `Contexto:\n${options.contexto}\n\n` : ''}Pergunta: ${options.pergunta}` }
      ]
    });
    
    return { 
      texto: data.choices?.[0]?.message?.content || "Erro ao gerar resposta OpenAI.", 
      provider: 'openai' 
    };
  }
  
  async classifyContent(content: string) {
    return { marca: 'geral', categoria: 'geral' };
  }
}

export class ClaudeProvider implements IAProvider {
  name = 'claude' as const;
  async generateAnswer(options: IAProviderOptions): Promise<IAProviderResponse> {
    const apiKey = process.env['ANTHROPIC_API_KEY'];
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY não configurada");
    
    const data = await callAI("https://api.anthropic.com/v1/messages", {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    }, {
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 1024,
      messages: [{ role: "user", content: `${options.contexto ? `Contexto:\n${options.contexto}\n\n` : ''}Pergunta: ${options.pergunta}` }]
    });
    
    return { 
      texto: data.content?.[0]?.text || "Erro ao gerar resposta Claude.", 
      provider: 'claude' 
    };
  }
  
  async classifyContent(content: string) {
    return { marca: 'geral', categoria: 'geral' };
  }
}

export async function getIAProvider(activeProvider: string): Promise<IAProvider> {
  const providers = [
    new GeminiProvider(),
    new OpenAIProvider(),
    new ClaudeProvider()
  ];
  
  const active = providers.find(p => p.name === activeProvider) || providers[0]!;
  
  return {
    name: active.name,
    generateAnswer: (opts) => withFallback(providers, activeProvider, (p) => p.generateAnswer(opts)),
    classifyContent: (content) => withFallback(providers, activeProvider, (p) => p.classifyContent(content))
  } as IAProvider;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env['OPENAI_API_KEY'] || process.env['GEMINI_API_KEY'];
  if (!apiKey) return new Array(1536).fill(0); // Fallback silencioso
  
  if (process.env['OPENAI_API_KEY']) {
    const data = await callAI("https://api.openai.com/v1/embeddings", {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env['OPENAI_API_KEY']}`
    }, {
      input: text,
      model: "text-embedding-3-small"
    });
    return data.data[0].embedding;
  }
  
  return new Array(768).fill(0);
}
