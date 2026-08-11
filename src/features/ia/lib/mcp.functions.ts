import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Registra um novo servidor MCP (Model Context Protocol) no sistema.
 * Estes servidores permitem que agentes de IA acessem ferramentas e dados da Tecnoar.
 */
export const registerMCPServer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({
    name: z.string(),
    url: z.string().url(),
    type: z.enum(['internal', 'external']),
    capabilities: z.array(z.string())
  }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    
    const { data: server, error } = await supabase
      .from('mcp_servers')
      .insert([{
        ...data,
        created_by: userId,
        status: 'active'
      }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return server;
  });

/**
 * Lista servidores MCP ativos para integração com agentes.
 */
export const listMCPServers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    
    const { data, error } = await supabase
      .from('mcp_servers')
      .select('*')
      .eq('status', 'active');

    if (error) throw new Error(error.message);
    return data || [];
  });
