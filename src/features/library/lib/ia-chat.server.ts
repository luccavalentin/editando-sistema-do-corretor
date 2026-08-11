
import { getIAProvider, generateEmbedding } from "../services/ia-provider";

export async function chatHandler(data: any, context: any) {
  const { supabase, userId } = context;
  
  // 1. Obter config ativa
  const { data: config } = await supabase.from('ia_config').select('provider_ativo').single();
  const providerName = config?.provider_ativo || 'gemini';
  const provider = await getIAProvider(providerName);

  // 2. Transcrição se necessário (Claude + Audio)
  let perguntaFinal = data.mensagem;
  const audioAnexo = data.anexos?.find((a: any) => a.type === 'audio');
  if (audioAnexo && providerName === 'claude') {
    console.log("Transcrevendo áudio para Claude...");
    // Mock de transcrição
    perguntaFinal = "[Transcrição do áudio] " + data.mensagem;
  }

  // 3. Embedding e RAG
  const embedding = await generateEmbedding(perguntaFinal);
  
  // Busca no pgvector (<=> operador de distância)
  const { data: fragments } = await supabase.rpc('buscar_conhecimento', {
    query_embedding: embedding,
    match_threshold: 0.5,
    match_count: 5
  });

  const contexto = fragments?.map((f: any) => f.conteudo).join("\n\n") || "";

  // 4. Gerar resposta
  const response = await provider.generateAnswer({
    pergunta: perguntaFinal,
    contexto,
    anexos: data.anexos
  });

  // 5. Salvar na base
  let conversaId = data.conversa_id;
  if (!conversaId) {
    const { data: conversa } = await supabase.from('ia_conversas').insert({
      titulo: perguntaFinal.substring(0, 50),
      usuario_id: userId
    }).select().single();
    conversaId = conversa.id;
  }

  // Mensagem do usuário
  await supabase.from('ia_mensagens').insert({
    conversa_id: conversaId,
    autor: 'usuario',
    conteudo: data.mensagem,
    anexos: data.anexos || []
  });

  // Mensagem da IA
  const { data: msgIA } = await supabase.from('ia_mensagens').insert({
    conversa_id: conversaId,
    autor: 'ia',
    conteudo: response.texto,
    provider_usado: response.provider,
    confianca_resposta: contexto ? 0.9 : 0.3,
    escalado_para_humano: !contexto
  }).select().single();

  // 6. Registrar sugestão no checklist se for o caso
  if (data.is_suggestion && contexto) {
    // Lógica para sugestão rápida
  }

  return {
    conversa_id: conversaId,
    mensagem: msgIA,
    contexto_encontrado: !!contexto
  };
}

