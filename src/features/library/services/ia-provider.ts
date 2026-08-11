
import { IAProvider, IAProviderOptions, IAProviderResponse } from "./ia-types";

// Helper para falha e log
async function withFallback<T>(
  providers: IAProvider[],
  activeProviderName: string,
  fn: (provider: IAProvider) => Promise<T>
): Promise<T> {
  const activeIndex = providers.findIndex(p => p.name === activeProviderName);
  const orderedProviders = [
    providers[activeIndex],
    ...providers.slice(0, activeIndex),
    ...providers.slice(activeIndex + 1)
  ].filter(Boolean);

  let lastError: Error | null = null;
  for (const provider of orderedProviders) {
    try {
      console.log(`[IA] Tentando provedor: ${provider.name}`);
      return await fn(provider);
    } catch (e) {
      console.error(`[IA] Falha no provedor ${provider.name}:`, e);
      lastError = e as Error;
    }
  }
  throw lastError || new Error("Todos os provedores de IA falharam.");
}

export class GeminiProvider implements IAProvider {
  name = 'gemini' as const;
  async generateAnswer(options: IAProviderOptions): Promise<IAProviderResponse> {
    const apiKey = process.env['GEMINI_API_KEY'];
    if (!apiKey) throw new Error("GEMINI_API_KEY não configurada");
    
    // Simulação da chamada real via fetch
    // No mundo real, usaríamos a SDK @google/generative-ai
    console.log("Chamando Gemini API...");
    return { texto: `[Gemini] Resposta para: ${options.pergunta}`, provider: 'gemini' };
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
    
    console.log("Chamando OpenAI API...");
    return { texto: `[OpenAI] Resposta para: ${options.pergunta}`, provider: 'openai' };
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
    
    console.log("Chamando Claude API...");
    return { texto: `[Claude] Resposta para: ${options.pergunta}`, provider: 'claude' };
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
  
  return {
    name: activeProvider as any,
    generateAnswer: (opts) => withFallback(providers, activeProvider, (p) => p.generateAnswer(opts)),
    classifyContent: (content) => withFallback(providers, activeProvider, (p) => p.classifyContent(content))
  } as IAProvider;
}

// Embedding helper (Sempre Gemini ou OpenAI)
export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env['GEMINI_API_KEY'] || process.env['OPENAI_API_KEY'];
  console.log("Gerando embedding...");
  // Retorna vetor de zeros com dimensão 768 para propósitos de mock/estrutura
  return new Array(768).fill(0);
}
