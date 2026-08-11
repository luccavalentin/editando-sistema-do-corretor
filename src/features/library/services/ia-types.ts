
export interface IAProviderOptions {
  pergunta: string;
  contexto?: string;
  anexos?: Array<{
    type: 'image' | 'audio' | 'text';
    content: string; // base64 or URL
    mimeType?: string;
  }>;
}

export interface IAProviderResponse {
  texto: string;
  confianca?: number;
  provider: 'gemini' | 'openai' | 'claude';
  metadata?: any;
}

export interface IAProvider {
  name: 'gemini' | 'openai' | 'claude';
  generateAnswer(options: IAProviderOptions): Promise<IAProviderResponse>;
  classifyContent(content: string): Promise<{ marca: string; categoria: string }>;
}
