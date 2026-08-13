import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getSecretValue } from "@/features/settings/services/secrets.server";

export const checkOmieStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: any) => z.void().optional().parse(data))
  .handler(async () => {
    const appKey = await getSecretValue('OMIE_APP_KEY');
    const appSecret = await getSecretValue('OMIE_APP_SECRET');
    return { 
      configured: !!(appKey && appSecret) 
    };
  });

const OMIE_API_URL = "https://app.omie.com.br/api/v1";

async function callOmie(endpoint: string, method: string, params: any, retryCount = 0): Promise<any> {
  const appKey = await getSecretValue('OMIE_APP_KEY');
  const appSecret = await getSecretValue('OMIE_APP_SECRET');

  if (!appKey || !appSecret) {
    throw new Error("OMIE_APP_KEY e OMIE_APP_SECRET não configurados.");
  }

  try {
    const response = await fetch(`${OMIE_API_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        call: method,
        app_key: appKey,
        app_secret: appSecret,
        param: [params]
      })
    });

    if (!response.ok && retryCount < 3) {
      const waitTime = Math.pow(2, retryCount) * 1000;
      console.log(`[OMIE] Erro ${response.status}. Tentando novamente em ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return callOmie(endpoint, method, params, retryCount + 1);
    }

    const data = await response.json();
    if (data.faultString) {
      throw new Error(`Omie API Error: ${data.faultString}`);
    }
    return data;
  } catch (error) {
    if (retryCount < 3) {
      const waitTime = Math.pow(2, retryCount) * 1000;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return callOmie(endpoint, method, params, retryCount + 1);
    }
    throw error;
  }
}

export const syncClientesOmie = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: any) => z.void().optional().parse(data))
  .handler(async ({ context }) => {
    const { supabase } = context;
    
    try {
      const result = await callOmie("/geral/clientes/", "ListarClientes", {
        pagina: 1,
        registros_por_pagina: 100,
        apenas_importado_api: "N"
      });

      for (const c of result.clientes_cadastro || []) {
        await supabase.from('clientes').upsert({
          omie_codigo_cliente: c.codigo_cliente_omie,
          nome: c.nome_fantasia || c.razao_social,
          documento: c.cnpj_cpf,
          inscricao_estadual: c.inscricao_estadual,
          inscricao_municipal: c.inscricao_municipal,
          telefone: c.telefone1_ddd + c.telefone1_numero,
          email: c.email,
          endereco_rua: c.endereco,
          endereco_bairro: c.bairro,
          endereco_cidade: c.cidade,
          endereco_uf: c.estado,
          endereco_cep: c.cep,
          contato_nome: c.contato,
          ativo: c.inativo === "N"
        }, { onConflict: 'omie_codigo_cliente' });
      }

      await supabase.from('omie_sync_log').insert({
        entidade: 'clientes',
        status: 'success',
        mensagem: `Sincronizados ${result.clientes_cadastro?.length || 0} clientes`
      });

      return { success: true, count: result.clientes_cadastro?.length || 0 };
    } catch (error: any) {
      await supabase.from('omie_sync_log').insert({
        entidade: 'clientes',
        status: 'error',
        mensagem: error.message
      });
      throw error;
    }
  });

export const syncEstoqueOmie = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: any) => z.void().optional().parse(data))
  .handler(async ({ context }) => {
    const { supabase } = context;
    try {
      const result = await callOmie("/estoque/resumo/", "ListarResumoEstoque", {
        pagina: 1,
        registros_por_pagina: 100
      });

      for (const item of result.resumoEstoque || []) {
        await supabase.from('pecas_estoque_cache').upsert({
          omie_codigo_produto: item.nCodProd,
          descricao: item.cDescricao,
          saldo: item.nSaldo,
          atualizado_em: new Date().toISOString()
        }, { onConflict: 'omie_codigo_produto' });
      }

      return { success: true };
    } catch (error: any) {
      console.error(error);
      throw error;
    }
  });

export const pushOSOmie = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ os_id: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    
    const { data: os } = await supabase
      .from('ordens_servico')
      .select('*, cliente:clientes(*), veiculo:veiculos(*)')
      .eq('id', data.os_id)
      .single();

    if (!os) throw new Error("OS não encontrada");

    try {
      const omieOS = await callOmie("/servicos/os/", "IncluirOS", {
        Cabecalho: {
          CodCli: os.cliente.omie_codigo_cliente,
          DataPrevisao: new Date().toLocaleDateString('pt-BR'),
          Etapa: "10"
        },
        InformacoesAdicionais: {
          CodManut: "OS-" + os.protocolo
        }
      });

      await supabase.from('ordens_servico')
        .update({ omie_codigo_os: omieOS.nCodOS })
        .eq('id', os.id);

      return { success: true, omie_id: omieOS.nCodOS };
    } catch (error: any) {
      throw error;
    }
  });

export const searchClientesOmie = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: any) => z.object({ query: z.string() }).parse(data))
  .handler(async ({ data }) => {
    try {
      console.log(`[OMIE] Buscando cliente: ${data.query}`);
      const result = await callOmie("/geral/clientes/", "ListarClientes", {
        pagina: 1,
        registros_por_pagina: 50,
        apenas_importado_api: "N",
        clientes_filtro: {
          nome_fantasia: `%${data.query}%`
        },
        exibir_obs: "S"
      });
      
      let clientes = result.clientes_cadastro || [];
      
      // Se não veio nada pelo nome fantasia, tenta por documento ou razão social se a query parecer um documento
      if (clientes.length === 0) {
        const docResult = await callOmie("/geral/clientes/", "ListarClientes", {
          pagina: 1,
          registros_por_pagina: 50,
          clientes_filtro: {
            cnpj_cpf: data.query.replace(/\D/g, '') || data.query
          }
        });
        clientes = docResult.clientes_cadastro || [];
      }

      console.log(`[OMIE] Encontrados ${clientes.length} clientes`);
      return clientes;
    } catch (error) {
      console.error("[OMIE] Erro na busca de clientes:", error);
      return [];
    }
  });

export const searchProdutosOmie = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: any) => z.object({ query: z.string() }).parse(data))
  .handler(async ({ data }) => {
    try {
      console.log(`[OMIE] Buscando produto: ${data.query}`);
      // A Omie às vezes falha com % no ListarProdutos dependendo do campo.
      // Vamos tentar buscar por descrição simplificada primeiro.
      const result = await callOmie("/estoque/produto/", "ListarProdutos", {
        pagina: 1,
        registros_por_pagina: 50,
        filtrar_apenas_descricao: data.query, // Removendo % manual se o campo já for de filtro
        exibir_obs: "S"
      });
      
      let produtos = result.produto_servico_cadastro || [];
      
      // Se não trouxe nada, tenta com o coringa explicitamente ou por código
      if (produtos.length === 0) {
         const altResult = await callOmie("/estoque/produto/", "ListarProdutos", {
            pagina: 1,
            registros_por_pagina: 50,
            filtrar_apenas_codigo: data.query
         });
         produtos = altResult.produto_servico_cadastro || [];
      }

      console.log(`[OMIE] Encontrados ${produtos.length} produtos`);
      return produtos;
    } catch (error) {
      console.error("[OMIE] Erro na busca de produtos:", error);
      return [];
    }
  });
