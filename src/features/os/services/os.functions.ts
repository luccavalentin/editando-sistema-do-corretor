import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { OSStatusSchema } from "../types/os.types";
import { getOSStatsServer, getOSListServer } from "./os.server";
import { pushOSOmie } from "../../omie/services/omie.functions";

export const getOSStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: any) => z.void().optional().parse(data))
  .handler(async ({ context }) => {
    return getOSStatsServer(context.supabase);
  });

export const getOSList = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: any) => z.void().optional().parse(data))
  .handler(async ({ context }) => {
    return getOSListServer(context.supabase);
  });

export const updateOSStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: any) => z.object({
    os_id: z.string(),
    novo_status: OSStatusSchema
  }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.rpc('transicionar_status_os', {
      _os_id: data.os_id,
      _novo_status: data.novo_status,
      _usuario_id: userId
    });
    if (error) throw new Error(error.message);

    // Automação Omie: Se status transicionou para 'enviado_financeiro', enviar para Omie
    if (data.novo_status === 'enviado_financeiro') {
      try {
        // Chamada interna da server function
        await pushOSOmie({ data: { os_id: data.os_id } });
      } catch (err) {
        console.error("[OMIE] Erro no push automático:", err);
      }
    }

    return { success: true };
  });

export const searchClienteLocal = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: any) => z.object({ query: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    
    // 1. Tentar busca local
    const { data: clientesLocais, error: localError } = await supabase
      .from("clientes")
      .select("*")
      .or(`documento.ilike.%${data.query}%,nome.ilike.%${data.query}%,nome_fantasia.ilike.%${data.query}%,razao_social.ilike.%${data.query}%,email.ilike.%${data.query}%`)
      .limit(20);
    
    if (localError) throw new Error(localError.message);

    // 2. Se não encontrou nada ou se o usuário estiver digitando (busca proativa na Omie)
    // Para simplificar, se local trouxer pouco resultado ou o termo for específico, buscamos na Omie
    // Aqui implementamos a busca em tempo real na Omie se configurado
    if (data.query.length >= 3) {
      try {
        const { searchClientesOmie } = await import("../../omie/services/omie.functions");
        const omieResults = await searchClientesOmie({ data: { query: data.query } });
        
        // Merge e De-duplicate (prioridade local para campos extras, mas Omie para novos)
        const localIds = new Set(clientesLocais.map(c => c.omie_codigo_cliente));
        const newFromOmie = (omieResults as any[]).filter(c => !localIds.has(c.codigo_cliente_omie));

        // Mapear Omie para o formato local da tabela 'clientes'
        const mappedOmie = newFromOmie.map(c => ({
          omie_codigo_cliente: c.codigo_cliente_omie,
          nome: c.nome_fantasia || c.razao_social,
          documento: c.cnpj_cpf,
          telefone: (c.telefone1_ddd || '') + (c.telefone1_numero || ''),
          email: c.email,
          endereco_rua: c.endereco,
          endereco_bairro: c.bairro,
          endereco_cidade: c.cidade,
          endereco_uf: c.estado,
          endereco_cep: c.cep,
          is_omie_temp: true // Flag para UI saber que veio da Omie agora
        }));

        return [...clientesLocais, ...mappedOmie];
      } catch (err) {
        console.error("[SEARCH] Erro ao buscar na Omie:", err);
      }
    }

    return clientesLocais;
  });

export const getVeiculosByCliente = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: any) => z.object({ cliente_id: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: veiculos, error } = await context.supabase
      .from("veiculos")
      .select("*")
      .eq("cliente_id", data.cliente_id);
    if (error) throw new Error(error.message);
    return veiculos;
  });

export const upsertClienteFromOmie = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: any) => z.object({ cliente_omie: z.any() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: cliente, error } = await supabase
      .from('clientes')
      .upsert({
        omie_codigo_cliente: data.cliente_omie.omie_codigo_cliente,
        nome: data.cliente_omie.nome,
        documento: data.cliente_omie.documento,
        telefone: data.cliente_omie.telefone,
        email: data.cliente_omie.email,
        endereco_rua: data.cliente_omie.endereco_rua,
        endereco_bairro: data.cliente_omie.endereco_bairro,
        endereco_cidade: data.cliente_omie.endereco_cidade,
        endereco_uf: data.cliente_omie.endereco_uf,
        endereco_cep: data.cliente_omie.endereco_cep,
        ativo: true
      }, { onConflict: 'omie_codigo_cliente' })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    return cliente;
  });

export const openOS = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: any) => z.object({
    cliente_id: z.string(),
    veiculo_id: z.string(),
    box: z.string().optional(),
    motorista_cliente: z.string().optional(),
    km_entrada: z.number().optional(),
    fotos_entrada: z.array(z.string()).optional(),
    observacoes_gerais: z.string().optional(),
  }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const year = new Date().getFullYear();
    const { count } = await supabase
      .from("ordens_servico")
      .select("*", { count: "exact", head: true });
    const protocolo = `TNR-${year}-${String((count || 0) + 1).padStart(6, "0")}`;
    const { data: os, error } = await supabase
      .from("ordens_servico")
      .insert({ ...data, protocolo, responsavel_abertura_id: userId, status: "aberta" })
      .select().single();
    if (error) throw new Error(error.message);
    return os;
  });
import { getReportsDataServer, getRankingServer } from "./os.server";

export const getReportsData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: any) => z.object({
    period: z.enum(['day', 'week', 'month', 'year', 'all']).default('all'),
    tecnico_id: z.string().optional(),
    cliente_id: z.string().optional()
  }).parse(data))
  .handler(async ({ data, context }) => {
    return getReportsDataServer(context.supabase, data);
  });

export const getRanking = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: any) => z.void().optional().parse(data))
  .handler(async ({ context }) => {
    return getRankingServer(context.supabase);
  });