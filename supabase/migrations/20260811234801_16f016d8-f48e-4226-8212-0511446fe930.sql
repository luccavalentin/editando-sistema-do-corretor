
CREATE OR REPLACE FUNCTION public.buscar_conhecimento(
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  titulo text,
  conteudo text,
  tags text[],
  marca text,
  categoria text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    k.id,
    k.titulo,
    k.conteudo,
    k.tags,
    k.marca,
    k.categoria,
    1 - (k.embedding <=> query_embedding) AS similarity
  FROM public.ia_base_conhecimento k
  WHERE 1 - (k.embedding <=> query_embedding) > match_threshold
  ORDER BY k.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
