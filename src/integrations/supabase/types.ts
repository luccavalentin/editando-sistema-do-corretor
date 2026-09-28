export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      auditoria: {
        Row: {
          acao: string
          agente_usuario: string | null
          antes: Json | null
          autor_email: string | null
          autor_id: string | null
          autor_papel:
            | "proprietario"
            | "admin_equipe"
            | "corretor"
            | "assistente"
            | "secretaria"
            | "sdr"
            | "financeiro"
            | "visualizacao"
            | null
          criado_em: string
          depois: Json | null
          entidade: string
          entidade_id: string | null
          id: number
          ip: unknown
          justificativa: string | null
          metadados: Json
          resultado: "permitido" | "negado" | "erro"
          tenant_id: string | null
        }
        Insert: {
          acao: string
          agente_usuario?: string | null
          antes?: Json | null
          autor_email?: string | null
          autor_id?: string | null
          autor_papel?:
            | "proprietario"
            | "admin_equipe"
            | "corretor"
            | "assistente"
            | "secretaria"
            | "sdr"
            | "financeiro"
            | "visualizacao"
            | null
          criado_em?: string
          depois?: Json | null
          entidade: string
          entidade_id?: string | null
          id?: number
          ip?: unknown
          justificativa?: string | null
          metadados?: Json
          resultado?: "permitido" | "negado" | "erro"
          tenant_id?: string | null
        }
        Update: {
          acao?: string
          agente_usuario?: string | null
          antes?: Json | null
          autor_email?: string | null
          autor_id?: string | null
          autor_papel?:
            | "proprietario"
            | "admin_equipe"
            | "corretor"
            | "assistente"
            | "secretaria"
            | "sdr"
            | "financeiro"
            | "visualizacao"
            | null
          criado_em?: string
          depois?: Json | null
          entidade?: string
          entidade_id?: string | null
          id?: number
          ip?: unknown
          justificativa?: string | null
          metadados?: Json
          resultado?: "permitido" | "negado" | "erro"
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auditoria_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auditoria_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "portfolio_corretores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auditoria_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      automacoes: {
        Row: {
          ativa: boolean
          atualizado_em: string
          criado_em: string
          id: string
          parametros: Json
          regra:
            | "negocio_parado"
            | "visita_sem_retorno"
            | "simulacao_aprovada"
            | "aniversario_do_cliente"
          tenant_id: string
          ultima_execucao_em: string | null
          ultimo_resultado: Json | null
        }
        Insert: {
          ativa?: boolean
          atualizado_em?: string
          criado_em?: string
          id?: string
          parametros?: Json
          regra:
            | "negocio_parado"
            | "visita_sem_retorno"
            | "simulacao_aprovada"
            | "aniversario_do_cliente"
          tenant_id: string
          ultima_execucao_em?: string | null
          ultimo_resultado?: Json | null
        }
        Update: {
          ativa?: boolean
          atualizado_em?: string
          criado_em?: string
          id?: string
          parametros?: Json
          regra?:
            | "negocio_parado"
            | "visita_sem_retorno"
            | "simulacao_aprovada"
            | "aniversario_do_cliente"
          tenant_id?: string
          ultima_execucao_em?: string | null
          ultimo_resultado?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "automacoes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "portfolio_corretores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automacoes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      compromissos: {
        Row: {
          atualizado_em: string
          compareceu: boolean | null
          confirmado_em: string | null
          criado_em: string
          criado_por: string | null
          deslocamento_min: number | null
          endereco: string | null
          fim: string
          google_evento_id: string | null
          google_sincronizado_em: string | null
          id: string
          inicio: string
          intervalo: unknown
          negocio_id: string | null
          observacoes: string | null
          pessoa_id: string | null
          responsavel_id: string | null
          situacao:
            | "agendado"
            | "confirmado"
            | "realizado"
            | "faltou"
            | "cancelado"
            | "remarcado"
          tenant_id: string
          tipo:
            | "visita"
            | "retorno"
            | "ligacao"
            | "reuniao"
            | "assinatura"
            | "avaliacao"
            | "parceiro"
            | "interna"
          titulo: string
        }
        Insert: {
          atualizado_em?: string
          compareceu?: boolean | null
          confirmado_em?: string | null
          criado_em?: string
          criado_por?: string | null
          deslocamento_min?: number | null
          endereco?: string | null
          fim: string
          google_evento_id?: string | null
          google_sincronizado_em?: string | null
          id?: string
          inicio: string
          intervalo?: unknown
          negocio_id?: string | null
          observacoes?: string | null
          pessoa_id?: string | null
          responsavel_id?: string | null
          situacao?:
            | "agendado"
            | "confirmado"
            | "realizado"
            | "faltou"
            | "cancelado"
            | "remarcado"
          tenant_id: string
          tipo?:
            | "visita"
            | "retorno"
            | "ligacao"
            | "reuniao"
            | "assinatura"
            | "avaliacao"
            | "parceiro"
            | "interna"
          titulo: string
        }
        Update: {
          atualizado_em?: string
          compareceu?: boolean | null
          confirmado_em?: string | null
          criado_em?: string
          criado_por?: string | null
          deslocamento_min?: number | null
          endereco?: string | null
          fim?: string
          google_evento_id?: string | null
          google_sincronizado_em?: string | null
          id?: string
          inicio?: string
          intervalo?: unknown
          negocio_id?: string | null
          observacoes?: string | null
          pessoa_id?: string | null
          responsavel_id?: string | null
          situacao?:
            | "agendado"
            | "confirmado"
            | "realizado"
            | "faltou"
            | "cancelado"
            | "remarcado"
          tenant_id?: string
          tipo?:
            | "visita"
            | "retorno"
            | "ligacao"
            | "reuniao"
            | "assinatura"
            | "avaliacao"
            | "parceiro"
            | "interna"
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "compromissos_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compromissos_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compromissos_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compromissos_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compromissos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "portfolio_corretores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compromissos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contadores: {
        Row: {
          nome: string
          tenant_id: string
          valor: number
        }
        Insert: {
          nome: string
          tenant_id: string
          valor?: number
        }
        Update: {
          nome?: string
          tenant_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "contadores_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "portfolio_corretores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contadores_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      convites: {
        Row: {
          aceito_em: string | null
          convidado_por: string | null
          criado_em: string
          email: string
          expira_em: string
          id: string
          papel:
            | "proprietario"
            | "admin_equipe"
            | "corretor"
            | "assistente"
            | "secretaria"
            | "sdr"
            | "financeiro"
            | "visualizacao"
          revogado_em: string | null
          tenant_id: string
          token_hash: string
        }
        Insert: {
          aceito_em?: string | null
          convidado_por?: string | null
          criado_em?: string
          email: string
          expira_em: string
          id?: string
          papel?:
            | "proprietario"
            | "admin_equipe"
            | "corretor"
            | "assistente"
            | "secretaria"
            | "sdr"
            | "financeiro"
            | "visualizacao"
          revogado_em?: string | null
          tenant_id: string
          token_hash: string
        }
        Update: {
          aceito_em?: string | null
          convidado_por?: string | null
          criado_em?: string
          email?: string
          expira_em?: string
          id?: string
          papel?:
            | "proprietario"
            | "admin_equipe"
            | "corretor"
            | "assistente"
            | "secretaria"
            | "sdr"
            | "financeiro"
            | "visualizacao"
          revogado_em?: string | null
          tenant_id?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "convites_convidado_por_fkey"
            columns: ["convidado_por"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "convites_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "portfolio_corretores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "convites_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      etapas: {
        Row: {
          cor: string | null
          criado_em: string
          encerra_como: "aberto" | "ganho" | "perdido" | "pausado" | null
          id: string
          nome: string
          nome_publico: string | null
          ordem: number
          tenant_id: string
        }
        Insert: {
          cor?: string | null
          criado_em?: string
          encerra_como?: "aberto" | "ganho" | "perdido" | "pausado" | null
          id?: string
          nome: string
          nome_publico?: string | null
          ordem: number
          tenant_id: string
        }
        Update: {
          cor?: string | null
          criado_em?: string
          encerra_como?: "aberto" | "ganho" | "perdido" | "pausado" | null
          id?: string
          nome?: string
          nome_publico?: string | null
          ordem?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "etapas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "portfolio_corretores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etapas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      followups: {
        Row: {
          atualizado_em: string
          automatico: boolean
          canal_sugerido:
            | "whatsapp"
            | "telefone"
            | "email"
            | "presencial"
            | "portal"
            | "portal_imobiliario"
            | "indicacao"
            | "outro"
            | null
          concluido_em: string | null
          criado_em: string
          criado_por: string | null
          gerado_por: string | null
          id: string
          mensagem_sugerida: string | null
          motivo: string
          negocio_id: string | null
          pessoa_id: string
          prazo: string
          prioridade: "baixa" | "media" | "alta" | "critica"
          responsavel_id: string | null
          resultado: string | null
          revisado_em: string | null
          revisado_por: string | null
          situacao: "pendente" | "feito" | "cancelado" | "sem_resposta"
          tenant_id: string
          tentativas: number
        }
        Insert: {
          atualizado_em?: string
          automatico?: boolean
          canal_sugerido?:
            | "whatsapp"
            | "telefone"
            | "email"
            | "presencial"
            | "portal"
            | "portal_imobiliario"
            | "indicacao"
            | "outro"
            | null
          concluido_em?: string | null
          criado_em?: string
          criado_por?: string | null
          gerado_por?: string | null
          id?: string
          mensagem_sugerida?: string | null
          motivo: string
          negocio_id?: string | null
          pessoa_id: string
          prazo: string
          prioridade?: "baixa" | "media" | "alta" | "critica"
          responsavel_id?: string | null
          resultado?: string | null
          revisado_em?: string | null
          revisado_por?: string | null
          situacao?: "pendente" | "feito" | "cancelado" | "sem_resposta"
          tenant_id: string
          tentativas?: number
        }
        Update: {
          atualizado_em?: string
          automatico?: boolean
          canal_sugerido?:
            | "whatsapp"
            | "telefone"
            | "email"
            | "presencial"
            | "portal"
            | "portal_imobiliario"
            | "indicacao"
            | "outro"
            | null
          concluido_em?: string | null
          criado_em?: string
          criado_por?: string | null
          gerado_por?: string | null
          id?: string
          mensagem_sugerida?: string | null
          motivo?: string
          negocio_id?: string | null
          pessoa_id?: string
          prazo?: string
          prioridade?: "baixa" | "media" | "alta" | "critica"
          responsavel_id?: string | null
          resultado?: string | null
          revisado_em?: string | null
          revisado_por?: string | null
          situacao?: "pendente" | "feito" | "cancelado" | "sem_resposta"
          tenant_id?: string
          tentativas?: number
        }
        Relationships: [
          {
            foreignKeyName: "followups_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followups_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followups_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followups_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followups_revisado_por_fkey"
            columns: ["revisado_por"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "portfolio_corretores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      imoveis: {
        Row: {
          aceita_fgts: boolean
          aceita_financiamento: boolean
          aceita_permuta: boolean
          aceita_pet: boolean
          andar: number | null
          ano_construcao: number | null
          area_total: number | null
          area_util: number | null
          atualizado_em: string
          bairro: string | null
          banheiros: number | null
          cep: string | null
          cidade: string | null
          codigo: string
          comissao_percentual: number | null
          comodidades: string[]
          complemento: string | null
          conservacao: "novo" | "usado" | "na_planta" | "em_construcao"
          contatos_gerados: number
          criado_em: string
          criado_por: string | null
          descricao_publica: string | null
          endereco_publico: string | null
          excluido_em: string | null
          exclusividade: boolean
          exclusividade_ate: string | null
          favoritos: number
          finalidade: "venda" | "aluguel" | "venda_aluguel"
          id: string
          latitude: number | null
          latitude_publica: number | null
          logradouro: string | null
          longitude: number | null
          longitude_publica: number | null
          mobiliado: boolean
          mostrar_endereco_no_portfolio: boolean
          negocios_abertos: number
          numero: string | null
          observacoes_internas: string | null
          pedidos_visita: number
          proprietario_id: string | null
          publicado_em: string | null
          publicado_no_portfolio: boolean
          quartos: number | null
          responsavel_id: string | null
          situacao:
            | "rascunho"
            | "disponivel"
            | "reservado"
            | "em_negociacao"
            | "vendido"
            | "alugado"
            | "suspenso"
          slug: string | null
          suites: number | null
          tenant_id: string
          tipo:
            | "apartamento"
            | "casa"
            | "casa_condominio"
            | "terreno"
            | "terreno_condominio"
            | "galpao"
            | "sala_comercial"
            | "loja"
            | "chacara"
            | "sobrado"
            | "cobertura"
            | "kitnet"
            | "outro"
          titulo: string
          uf: string | null
          uso: "residencial" | "comercial"
          vagas: number | null
          valor: number | null
          valor_aluguel: number | null
          valor_condominio: number | null
          valor_iptu: number | null
          visivel_no_portfolio: boolean
          visualizacoes: number
        }
        Insert: {
          aceita_fgts?: boolean
          aceita_financiamento?: boolean
          aceita_permuta?: boolean
          aceita_pet?: boolean
          andar?: number | null
          ano_construcao?: number | null
          area_total?: number | null
          area_util?: number | null
          atualizado_em?: string
          bairro?: string | null
          banheiros?: number | null
          cep?: string | null
          cidade?: string | null
          codigo: string
          comissao_percentual?: number | null
          comodidades?: string[]
          complemento?: string | null
          conservacao?: "novo" | "usado" | "na_planta" | "em_construcao"
          contatos_gerados?: number
          criado_em?: string
          criado_por?: string | null
          descricao_publica?: string | null
          endereco_publico?: string | null
          excluido_em?: string | null
          exclusividade?: boolean
          exclusividade_ate?: string | null
          favoritos?: number
          finalidade?: "venda" | "aluguel" | "venda_aluguel"
          id?: string
          latitude?: number | null
          latitude_publica?: number | null
          logradouro?: string | null
          longitude?: number | null
          longitude_publica?: number | null
          mobiliado?: boolean
          mostrar_endereco_no_portfolio?: boolean
          negocios_abertos?: number
          numero?: string | null
          observacoes_internas?: string | null
          pedidos_visita?: number
          proprietario_id?: string | null
          publicado_em?: string | null
          publicado_no_portfolio?: boolean
          quartos?: number | null
          responsavel_id?: string | null
          situacao?:
            | "rascunho"
            | "disponivel"
            | "reservado"
            | "em_negociacao"
            | "vendido"
            | "alugado"
            | "suspenso"
          slug?: string | null
          suites?: number | null
          tenant_id: string
          tipo?:
            | "apartamento"
            | "casa"
            | "casa_condominio"
            | "terreno"
            | "terreno_condominio"
            | "galpao"
            | "sala_comercial"
            | "loja"
            | "chacara"
            | "sobrado"
            | "cobertura"
            | "kitnet"
            | "outro"
          titulo: string
          uf?: string | null
          uso?: "residencial" | "comercial"
          vagas?: number | null
          valor?: number | null
          valor_aluguel?: number | null
          valor_condominio?: number | null
          valor_iptu?: number | null
          visivel_no_portfolio?: boolean
          visualizacoes?: number
        }
        Update: {
          aceita_fgts?: boolean
          aceita_financiamento?: boolean
          aceita_permuta?: boolean
          aceita_pet?: boolean
          andar?: number | null
          ano_construcao?: number | null
          area_total?: number | null
          area_util?: number | null
          atualizado_em?: string
          bairro?: string | null
          banheiros?: number | null
          cep?: string | null
          cidade?: string | null
          codigo?: string
          comissao_percentual?: number | null
          comodidades?: string[]
          complemento?: string | null
          conservacao?: "novo" | "usado" | "na_planta" | "em_construcao"
          contatos_gerados?: number
          criado_em?: string
          criado_por?: string | null
          descricao_publica?: string | null
          endereco_publico?: string | null
          excluido_em?: string | null
          exclusividade?: boolean
          exclusividade_ate?: string | null
          favoritos?: number
          finalidade?: "venda" | "aluguel" | "venda_aluguel"
          id?: string
          latitude?: number | null
          latitude_publica?: number | null
          logradouro?: string | null
          longitude?: number | null
          longitude_publica?: number | null
          mobiliado?: boolean
          mostrar_endereco_no_portfolio?: boolean
          negocios_abertos?: number
          numero?: string | null
          observacoes_internas?: string | null
          pedidos_visita?: number
          proprietario_id?: string | null
          publicado_em?: string | null
          publicado_no_portfolio?: boolean
          quartos?: number | null
          responsavel_id?: string | null
          situacao?:
            | "rascunho"
            | "disponivel"
            | "reservado"
            | "em_negociacao"
            | "vendido"
            | "alugado"
            | "suspenso"
          slug?: string | null
          suites?: number | null
          tenant_id?: string
          tipo?:
            | "apartamento"
            | "casa"
            | "casa_condominio"
            | "terreno"
            | "terreno_condominio"
            | "galpao"
            | "sala_comercial"
            | "loja"
            | "chacara"
            | "sobrado"
            | "cobertura"
            | "kitnet"
            | "outro"
          titulo?: string
          uf?: string | null
          uso?: "residencial" | "comercial"
          vagas?: number | null
          valor?: number | null
          valor_aluguel?: number | null
          valor_condominio?: number | null
          valor_iptu?: number | null
          visivel_no_portfolio?: boolean
          visualizacoes?: number
        }
        Relationships: [
          {
            foreignKeyName: "imoveis_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imoveis_proprietario_id_fkey"
            columns: ["proprietario_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imoveis_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imoveis_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "portfolio_corretores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imoveis_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      imovel_interesses: {
        Row: {
          criado_em: string
          id: number
          imovel_id: string
          observacao: string | null
          origem:
            | "whatsapp"
            | "telefone"
            | "email"
            | "presencial"
            | "portal"
            | "portal_imobiliario"
            | "indicacao"
            | "outro"
            | null
          pessoa_id: string | null
          tenant_id: string
          tipo:
            | "favorito"
            | "pedido_visita"
            | "pedido_simulacao"
            | "visualizacao"
            | "contato"
        }
        Insert: {
          criado_em?: string
          id?: number
          imovel_id: string
          observacao?: string | null
          origem?:
            | "whatsapp"
            | "telefone"
            | "email"
            | "presencial"
            | "portal"
            | "portal_imobiliario"
            | "indicacao"
            | "outro"
            | null
          pessoa_id?: string | null
          tenant_id: string
          tipo:
            | "favorito"
            | "pedido_visita"
            | "pedido_simulacao"
            | "visualizacao"
            | "contato"
        }
        Update: {
          criado_em?: string
          id?: number
          imovel_id?: string
          observacao?: string | null
          origem?:
            | "whatsapp"
            | "telefone"
            | "email"
            | "presencial"
            | "portal"
            | "portal_imobiliario"
            | "indicacao"
            | "outro"
            | null
          pessoa_id?: string | null
          tenant_id?: string
          tipo?:
            | "favorito"
            | "pedido_visita"
            | "pedido_simulacao"
            | "visualizacao"
            | "contato"
        }
        Relationships: [
          {
            foreignKeyName: "imovel_interesses_imovel_id_fkey"
            columns: ["imovel_id"]
            isOneToOne: false
            referencedRelation: "imoveis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imovel_interesses_imovel_id_fkey"
            columns: ["imovel_id"]
            isOneToOne: false
            referencedRelation: "portfolio_imoveis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imovel_interesses_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imovel_interesses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "portfolio_corretores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imovel_interesses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      imovel_midias: {
        Row: {
          altura: number | null
          bytes: number | null
          capa: boolean
          chave: string
          criado_em: string
          criado_por: string | null
          id: string
          imovel_id: string
          largura: number | null
          legenda: string | null
          ordem: number
          tenant_id: string
          tipo: "foto" | "video" | "planta" | "tour_virtual" | "documento"
          tipo_conteudo: string | null
          url_externa: string | null
        }
        Insert: {
          altura?: number | null
          bytes?: number | null
          capa?: boolean
          chave: string
          criado_em?: string
          criado_por?: string | null
          id?: string
          imovel_id: string
          largura?: number | null
          legenda?: string | null
          ordem?: number
          tenant_id: string
          tipo?: "foto" | "video" | "planta" | "tour_virtual" | "documento"
          tipo_conteudo?: string | null
          url_externa?: string | null
        }
        Update: {
          altura?: number | null
          bytes?: number | null
          capa?: boolean
          chave?: string
          criado_em?: string
          criado_por?: string | null
          id?: string
          imovel_id?: string
          largura?: number | null
          legenda?: string | null
          ordem?: number
          tenant_id?: string
          tipo?: "foto" | "video" | "planta" | "tour_virtual" | "documento"
          tipo_conteudo?: string | null
          url_externa?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "imovel_midias_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imovel_midias_imovel_id_fkey"
            columns: ["imovel_id"]
            isOneToOne: false
            referencedRelation: "imoveis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imovel_midias_imovel_id_fkey"
            columns: ["imovel_id"]
            isOneToOne: false
            referencedRelation: "portfolio_imoveis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imovel_midias_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "portfolio_corretores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imovel_midias_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      integracao_chamadas: {
        Row: {
          caminho: string
          criado_em: string
          duracao_ms: number | null
          erro: string | null
          id: number
          metodo: string
          operacao: string
          provedor: string
          requisicao: Json | null
          resposta: Json | null
          simulacao_id: string | null
          status_http: number | null
          sucesso: boolean
          tenant_id: string | null
          tentativas: number
        }
        Insert: {
          caminho: string
          criado_em?: string
          duracao_ms?: number | null
          erro?: string | null
          id?: number
          metodo: string
          operacao: string
          provedor?: string
          requisicao?: Json | null
          resposta?: Json | null
          simulacao_id?: string | null
          status_http?: number | null
          sucesso: boolean
          tenant_id?: string | null
          tentativas?: number
        }
        Update: {
          caminho?: string
          criado_em?: string
          duracao_ms?: number | null
          erro?: string | null
          id?: number
          metodo?: string
          operacao?: string
          provedor?: string
          requisicao?: Json | null
          resposta?: Json | null
          simulacao_id?: string | null
          status_http?: number | null
          sucesso?: boolean
          tenant_id?: string | null
          tentativas?: number
        }
        Relationships: [
          {
            foreignKeyName: "integracao_chamadas_simulacao_id_fkey"
            columns: ["simulacao_id"]
            isOneToOne: false
            referencedRelation: "simulacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integracao_chamadas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "portfolio_corretores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integracao_chamadas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      membros: {
        Row: {
          atualizado_em: string
          convidado_por: string | null
          criado_em: string
          id: string
          papel:
            | "proprietario"
            | "admin_equipe"
            | "corretor"
            | "assistente"
            | "secretaria"
            | "sdr"
            | "financeiro"
            | "visualizacao"
          permissoes_extra: Json
          situacao: "ativo" | "convidado" | "suspenso" | "removido"
          tenant_id: string
          usuario_id: string
        }
        Insert: {
          atualizado_em?: string
          convidado_por?: string | null
          criado_em?: string
          id?: string
          papel?:
            | "proprietario"
            | "admin_equipe"
            | "corretor"
            | "assistente"
            | "secretaria"
            | "sdr"
            | "financeiro"
            | "visualizacao"
          permissoes_extra?: Json
          situacao?: "ativo" | "convidado" | "suspenso" | "removido"
          tenant_id: string
          usuario_id: string
        }
        Update: {
          atualizado_em?: string
          convidado_por?: string | null
          criado_em?: string
          id?: string
          papel?:
            | "proprietario"
            | "admin_equipe"
            | "corretor"
            | "assistente"
            | "secretaria"
            | "sdr"
            | "financeiro"
            | "visualizacao"
          permissoes_extra?: Json
          situacao?: "ativo" | "convidado" | "suspenso" | "removido"
          tenant_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "membros_convidado_por_fkey"
            columns: ["convidado_por"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membros_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "portfolio_corretores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membros_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membros_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      negocio_etapa_historico: {
        Row: {
          autor_id: string | null
          criado_em: string
          desfeito: boolean
          etapa_de: string | null
          etapa_para: string
          id: number
          negocio_id: string
          observacao: string | null
          segundos_na_etapa_anterior: number | null
          tenant_id: string
        }
        Insert: {
          autor_id?: string | null
          criado_em?: string
          desfeito?: boolean
          etapa_de?: string | null
          etapa_para: string
          id?: number
          negocio_id: string
          observacao?: string | null
          segundos_na_etapa_anterior?: number | null
          tenant_id: string
        }
        Update: {
          autor_id?: string | null
          criado_em?: string
          desfeito?: boolean
          etapa_de?: string | null
          etapa_para?: string
          id?: number
          negocio_id?: string
          observacao?: string | null
          segundos_na_etapa_anterior?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "negocio_etapa_historico_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negocio_etapa_historico_etapa_de_fkey"
            columns: ["etapa_de"]
            isOneToOne: false
            referencedRelation: "etapas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negocio_etapa_historico_etapa_para_fkey"
            columns: ["etapa_para"]
            isOneToOne: false
            referencedRelation: "etapas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negocio_etapa_historico_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negocio_etapa_historico_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "portfolio_corretores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negocio_etapa_historico_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      negocio_participantes: {
        Row: {
          compoe_renda: boolean
          criado_em: string
          id: string
          negocio_id: string
          papel:
            | "comprador"
            | "proprietario"
            | "fiador"
            | "conjuge"
            | "participante_renda"
            | "procurador"
          percentual: number | null
          pessoa_id: string
          tenant_id: string
        }
        Insert: {
          compoe_renda?: boolean
          criado_em?: string
          id?: string
          negocio_id: string
          papel:
            | "comprador"
            | "proprietario"
            | "fiador"
            | "conjuge"
            | "participante_renda"
            | "procurador"
          percentual?: number | null
          pessoa_id: string
          tenant_id: string
        }
        Update: {
          compoe_renda?: boolean
          criado_em?: string
          id?: string
          negocio_id?: string
          papel?:
            | "comprador"
            | "proprietario"
            | "fiador"
            | "conjuge"
            | "participante_renda"
            | "procurador"
          percentual?: number | null
          pessoa_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "negocio_participantes_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negocio_participantes_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negocio_participantes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "portfolio_corretores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negocio_participantes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      negocios: {
        Row: {
          atualizado_em: string
          codigo: string
          criado_em: string
          criado_por: string | null
          etapa_desde: string
          etapa_id: string
          excluido_em: string | null
          fechado_em: string | null
          id: string
          imovel_id: string | null
          motivo_perda: string | null
          pessoa_id: string
          previsao_fechamento: string | null
          probabilidade: number | null
          responsavel_id: string | null
          situacao: "aberto" | "ganho" | "perdido" | "pausado"
          tenant_id: string
          titulo: string | null
          ultima_atividade_em: string
          valor: number | null
          valor_proposta: number | null
        }
        Insert: {
          atualizado_em?: string
          codigo: string
          criado_em?: string
          criado_por?: string | null
          etapa_desde?: string
          etapa_id: string
          excluido_em?: string | null
          fechado_em?: string | null
          id?: string
          imovel_id?: string | null
          motivo_perda?: string | null
          pessoa_id: string
          previsao_fechamento?: string | null
          probabilidade?: number | null
          responsavel_id?: string | null
          situacao?: "aberto" | "ganho" | "perdido" | "pausado"
          tenant_id: string
          titulo?: string | null
          ultima_atividade_em?: string
          valor?: number | null
          valor_proposta?: number | null
        }
        Update: {
          atualizado_em?: string
          codigo?: string
          criado_em?: string
          criado_por?: string | null
          etapa_desde?: string
          etapa_id?: string
          excluido_em?: string | null
          fechado_em?: string | null
          id?: string
          imovel_id?: string | null
          motivo_perda?: string | null
          pessoa_id?: string
          previsao_fechamento?: string | null
          probabilidade?: number | null
          responsavel_id?: string | null
          situacao?: "aberto" | "ganho" | "perdido" | "pausado"
          tenant_id?: string
          titulo?: string | null
          ultima_atividade_em?: string
          valor?: number | null
          valor_proposta?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "negocios_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negocios_etapa_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "etapas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negocios_imovel_id_fkey"
            columns: ["imovel_id"]
            isOneToOne: false
            referencedRelation: "imoveis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negocios_imovel_id_fkey"
            columns: ["imovel_id"]
            isOneToOne: false
            referencedRelation: "portfolio_imoveis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negocios_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negocios_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negocios_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "portfolio_corretores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negocios_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      perfis: {
        Row: {
          admin_plataforma: boolean
          atualizado_em: string
          avatar_url: string | null
          criado_em: string
          densidade: string
          email: string
          id: string
          nome: string
          telefone: string | null
          tema: string
          ultimo_acesso_em: string | null
        }
        Insert: {
          admin_plataforma?: boolean
          atualizado_em?: string
          avatar_url?: string | null
          criado_em?: string
          densidade?: string
          email: string
          id: string
          nome?: string
          telefone?: string | null
          tema?: string
          ultimo_acesso_em?: string | null
        }
        Update: {
          admin_plataforma?: boolean
          atualizado_em?: string
          avatar_url?: string | null
          criado_em?: string
          densidade?: string
          email?: string
          id?: string
          nome?: string
          telefone?: string | null
          tema?: string
          ultimo_acesso_em?: string | null
        }
        Relationships: []
      }
      pessoa_telefones: {
        Row: {
          criado_em: string
          id: string
          numero: string
          pessoa_id: string
          principal: boolean
          rotulo: string | null
          tenant_id: string
          whatsapp: boolean
        }
        Insert: {
          criado_em?: string
          id?: string
          numero: string
          pessoa_id: string
          principal?: boolean
          rotulo?: string | null
          tenant_id: string
          whatsapp?: boolean
        }
        Update: {
          criado_em?: string
          id?: string
          numero?: string
          pessoa_id?: string
          principal?: boolean
          rotulo?: string | null
          tenant_id?: string
          whatsapp?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "pessoa_telefones_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pessoa_telefones_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "portfolio_corretores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pessoa_telefones_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pessoas: {
        Row: {
          atualizado_em: string
          cidade: string | null
          cpf: string | null
          criado_em: string
          criado_por: string | null
          data_nascimento: string | null
          email: string | null
          excluido_em: string | null
          faixa_valor_max: number | null
          faixa_valor_min: number | null
          id: string
          nome: string
          objetivo: string | null
          observacoes: string | null
          origem:
            | "whatsapp"
            | "telefone"
            | "email"
            | "presencial"
            | "portal"
            | "portal_imobiliario"
            | "indicacao"
            | "outro"
            | null
          origem_detalhe: string | null
          portal_lgpd_aceito_em: string | null
          portal_lgpd_versao: string | null
          portal_liberado: boolean
          portal_liberado_em: string | null
          portal_ultimo_acesso_em: string | null
          renda: number | null
          renda_composta: number | null
          responsavel_id: string | null
          temperatura: "quente" | "morno" | "frio"
          tenant_id: string
          uf: string | null
          ultima_interacao_em: string | null
        }
        Insert: {
          atualizado_em?: string
          cidade?: string | null
          cpf?: string | null
          criado_em?: string
          criado_por?: string | null
          data_nascimento?: string | null
          email?: string | null
          excluido_em?: string | null
          faixa_valor_max?: number | null
          faixa_valor_min?: number | null
          id?: string
          nome: string
          objetivo?: string | null
          observacoes?: string | null
          origem?:
            | "whatsapp"
            | "telefone"
            | "email"
            | "presencial"
            | "portal"
            | "portal_imobiliario"
            | "indicacao"
            | "outro"
            | null
          origem_detalhe?: string | null
          portal_lgpd_aceito_em?: string | null
          portal_lgpd_versao?: string | null
          portal_liberado?: boolean
          portal_liberado_em?: string | null
          portal_ultimo_acesso_em?: string | null
          renda?: number | null
          renda_composta?: number | null
          responsavel_id?: string | null
          temperatura?: "quente" | "morno" | "frio"
          tenant_id: string
          uf?: string | null
          ultima_interacao_em?: string | null
        }
        Update: {
          atualizado_em?: string
          cidade?: string | null
          cpf?: string | null
          criado_em?: string
          criado_por?: string | null
          data_nascimento?: string | null
          email?: string | null
          excluido_em?: string | null
          faixa_valor_max?: number | null
          faixa_valor_min?: number | null
          id?: string
          nome?: string
          objetivo?: string | null
          observacoes?: string | null
          origem?:
            | "whatsapp"
            | "telefone"
            | "email"
            | "presencial"
            | "portal"
            | "portal_imobiliario"
            | "indicacao"
            | "outro"
            | null
          origem_detalhe?: string | null
          portal_lgpd_aceito_em?: string | null
          portal_lgpd_versao?: string | null
          portal_liberado?: boolean
          portal_liberado_em?: string | null
          portal_ultimo_acesso_em?: string | null
          renda?: number | null
          renda_composta?: number | null
          responsavel_id?: string | null
          temperatura?: "quente" | "morno" | "frio"
          tenant_id?: string
          uf?: string | null
          ultima_interacao_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pessoas_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pessoas_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pessoas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "portfolio_corretores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pessoas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_acessos: {
        Row: {
          agente_usuario: string | null
          cpf_hash: string
          criado_em: string
          id: number
          ip: unknown
          motivo: string | null
          pessoa_id: string | null
          sucesso: boolean
          tenant_id: string | null
        }
        Insert: {
          agente_usuario?: string | null
          cpf_hash: string
          criado_em?: string
          id?: number
          ip?: unknown
          motivo?: string | null
          pessoa_id?: string | null
          sucesso: boolean
          tenant_id?: string | null
        }
        Update: {
          agente_usuario?: string | null
          cpf_hash?: string
          criado_em?: string
          id?: number
          ip?: unknown
          motivo?: string | null
          pessoa_id?: string | null
          sucesso?: boolean
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_acessos_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_acessos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "portfolio_corretores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_acessos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      simulacao_bancos: {
        Row: {
          atualizado_em: string
          codigo_banco: number | null
          codigo_situacao_banco: string | null
          criado_em: string
          enviado_em: string | null
          escolhido: boolean
          homefin_id_banco: number
          homefin_id_simulacao: string | null
          id: string
          indexador: string | null
          nome_banco: string
          prazo_aprovado: number | null
          prazo_maximo: number | null
          respondido_em: string | null
          retorno_integracao: string | null
          simulacao_id: string
          situacao:
            | "rascunho"
            | "sem_integracao"
            | "erro_no_envio"
            | "em_analise"
            | "aprovado"
            | "recusado"
          taxa_juros_ano: number | null
          tenant_id: string
          valor_financiamento_aprovado: number | null
          valor_financiamento_maximo: number | null
          valor_iof: number | null
          valor_parcela: number | null
          valor_parcela_maxima: number | null
        }
        Insert: {
          atualizado_em?: string
          codigo_banco?: number | null
          codigo_situacao_banco?: string | null
          criado_em?: string
          enviado_em?: string | null
          escolhido?: boolean
          homefin_id_banco: number
          homefin_id_simulacao?: string | null
          id?: string
          indexador?: string | null
          nome_banco: string
          prazo_aprovado?: number | null
          prazo_maximo?: number | null
          respondido_em?: string | null
          retorno_integracao?: string | null
          simulacao_id: string
          situacao?:
            | "rascunho"
            | "sem_integracao"
            | "erro_no_envio"
            | "em_analise"
            | "aprovado"
            | "recusado"
          taxa_juros_ano?: number | null
          tenant_id: string
          valor_financiamento_aprovado?: number | null
          valor_financiamento_maximo?: number | null
          valor_iof?: number | null
          valor_parcela?: number | null
          valor_parcela_maxima?: number | null
        }
        Update: {
          atualizado_em?: string
          codigo_banco?: number | null
          codigo_situacao_banco?: string | null
          criado_em?: string
          enviado_em?: string | null
          escolhido?: boolean
          homefin_id_banco?: number
          homefin_id_simulacao?: string | null
          id?: string
          indexador?: string | null
          nome_banco?: string
          prazo_aprovado?: number | null
          prazo_maximo?: number | null
          respondido_em?: string | null
          retorno_integracao?: string | null
          simulacao_id?: string
          situacao?:
            | "rascunho"
            | "sem_integracao"
            | "erro_no_envio"
            | "em_analise"
            | "aprovado"
            | "recusado"
          taxa_juros_ano?: number | null
          tenant_id?: string
          valor_financiamento_aprovado?: number | null
          valor_financiamento_maximo?: number | null
          valor_iof?: number | null
          valor_parcela?: number | null
          valor_parcela_maxima?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "simulacao_bancos_simulacao_id_fkey"
            columns: ["simulacao_id"]
            isOneToOne: false
            referencedRelation: "simulacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulacao_bancos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "portfolio_corretores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulacao_bancos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      simulacoes: {
        Row: {
          atualizado_em: string
          celular_titular: string | null
          codigo: string
          compoe_renda: boolean
          cpf_coparticipante: string | null
          cpf_titular: string
          criado_em: string
          criado_por: string | null
          data_nascimento_coparticipante: string | null
          data_nascimento_titular: string
          email_titular: string | null
          enviado_em: string | null
          estado_civil_homefin: string | null
          excluido_em: string | null
          financiar_despesas: boolean
          homefin_codigo_oportunidade: string | null
          homefin_id_oportunidade: string | null
          id: string
          imovel_id: string | null
          melhor_banco_id: string | null
          melhor_parcela: number | null
          negocio_id: string | null
          nome_coparticipante: string | null
          nome_titular: string
          observacoes: string | null
          pessoa_id: string
          prazo_meses: number
          reconciliado_em: string | null
          renda_coparticipante: number | null
          renda_total: number
          respondido_em: string | null
          responsavel_id: string | null
          sistema_amortizacao: "sac" | "price"
          situacao:
            | "rascunho"
            | "sem_integracao"
            | "erro_no_envio"
            | "em_analise"
            | "aprovado"
            | "recusado"
          situacao_imovel_homefin: string
          tenant_id: string
          tipo_imovel_homefin: string
          uf: string
          usa_fgts: boolean
          uso_imovel_homefin: string
          valor_entrada: number
          valor_financiamento: number
          valor_imovel: number
        }
        Insert: {
          atualizado_em?: string
          celular_titular?: string | null
          codigo: string
          compoe_renda?: boolean
          cpf_coparticipante?: string | null
          cpf_titular: string
          criado_em?: string
          criado_por?: string | null
          data_nascimento_coparticipante?: string | null
          data_nascimento_titular: string
          email_titular?: string | null
          enviado_em?: string | null
          estado_civil_homefin?: string | null
          excluido_em?: string | null
          financiar_despesas?: boolean
          homefin_codigo_oportunidade?: string | null
          homefin_id_oportunidade?: string | null
          id?: string
          imovel_id?: string | null
          melhor_banco_id?: string | null
          melhor_parcela?: number | null
          negocio_id?: string | null
          nome_coparticipante?: string | null
          nome_titular: string
          observacoes?: string | null
          pessoa_id: string
          prazo_meses: number
          reconciliado_em?: string | null
          renda_coparticipante?: number | null
          renda_total: number
          respondido_em?: string | null
          responsavel_id?: string | null
          sistema_amortizacao?: "sac" | "price"
          situacao?:
            | "rascunho"
            | "sem_integracao"
            | "erro_no_envio"
            | "em_analise"
            | "aprovado"
            | "recusado"
          situacao_imovel_homefin?: string
          tenant_id: string
          tipo_imovel_homefin?: string
          uf: string
          usa_fgts?: boolean
          uso_imovel_homefin?: string
          valor_entrada?: number
          valor_financiamento: number
          valor_imovel: number
        }
        Update: {
          atualizado_em?: string
          celular_titular?: string | null
          codigo?: string
          compoe_renda?: boolean
          cpf_coparticipante?: string | null
          cpf_titular?: string
          criado_em?: string
          criado_por?: string | null
          data_nascimento_coparticipante?: string | null
          data_nascimento_titular?: string
          email_titular?: string | null
          enviado_em?: string | null
          estado_civil_homefin?: string | null
          excluido_em?: string | null
          financiar_despesas?: boolean
          homefin_codigo_oportunidade?: string | null
          homefin_id_oportunidade?: string | null
          id?: string
          imovel_id?: string | null
          melhor_banco_id?: string | null
          melhor_parcela?: number | null
          negocio_id?: string | null
          nome_coparticipante?: string | null
          nome_titular?: string
          observacoes?: string | null
          pessoa_id?: string
          prazo_meses?: number
          reconciliado_em?: string | null
          renda_coparticipante?: number | null
          renda_total?: number
          respondido_em?: string | null
          responsavel_id?: string | null
          sistema_amortizacao?: "sac" | "price"
          situacao?:
            | "rascunho"
            | "sem_integracao"
            | "erro_no_envio"
            | "em_analise"
            | "aprovado"
            | "recusado"
          situacao_imovel_homefin?: string
          tenant_id?: string
          tipo_imovel_homefin?: string
          uf?: string
          usa_fgts?: boolean
          uso_imovel_homefin?: string
          valor_entrada?: number
          valor_financiamento?: number
          valor_imovel?: number
        }
        Relationships: [
          {
            foreignKeyName: "simulacoes_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulacoes_imovel_id_fkey"
            columns: ["imovel_id"]
            isOneToOne: false
            referencedRelation: "imoveis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulacoes_imovel_id_fkey"
            columns: ["imovel_id"]
            isOneToOne: false
            referencedRelation: "portfolio_imoveis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulacoes_melhor_banco_fkey"
            columns: ["melhor_banco_id"]
            isOneToOne: false
            referencedRelation: "simulacao_bancos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulacoes_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulacoes_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulacoes_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulacoes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "portfolio_corretores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulacoes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tarefas: {
        Row: {
          atualizado_em: string
          concluida_em: string | null
          concluida_por: string | null
          criado_em: string
          criado_por: string | null
          descricao: string | null
          id: string
          negocio_id: string | null
          pessoa_id: string | null
          prazo: string | null
          prioridade: "baixa" | "media" | "alta" | "critica"
          responsavel_id: string | null
          situacao: "aberta" | "feita" | "cancelada"
          tenant_id: string
          titulo: string
        }
        Insert: {
          atualizado_em?: string
          concluida_em?: string | null
          concluida_por?: string | null
          criado_em?: string
          criado_por?: string | null
          descricao?: string | null
          id?: string
          negocio_id?: string | null
          pessoa_id?: string | null
          prazo?: string | null
          prioridade?: "baixa" | "media" | "alta" | "critica"
          responsavel_id?: string | null
          situacao?: "aberta" | "feita" | "cancelada"
          tenant_id: string
          titulo: string
        }
        Update: {
          atualizado_em?: string
          concluida_em?: string | null
          concluida_por?: string | null
          criado_em?: string
          criado_por?: string | null
          descricao?: string | null
          id?: string
          negocio_id?: string | null
          pessoa_id?: string | null
          prazo?: string | null
          prioridade?: "baixa" | "media" | "alta" | "critica"
          responsavel_id?: string | null
          situacao?: "aberta" | "feita" | "cancelada"
          tenant_id?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarefas_concluida_por_fkey"
            columns: ["concluida_por"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "portfolio_corretores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          atualizado_em: string
          cpf_cnpj: string | null
          creci: string | null
          criado_em: string
          excluido_em: string | null
          fuso_horario: string
          id: string
          limite_armazenamento_mb: number
          limite_imoveis: number
          limite_usuarios: number
          mfa_obrigatorio: boolean
          nome: string
          portfolio_ativo: boolean
          portfolio_bio: string | null
          portfolio_capa_chave: string | null
          portfolio_email: string | null
          portfolio_logo_chave: string | null
          portfolio_titulo: string | null
          portfolio_whatsapp: string | null
          retencao_dias: number
          situacao:
            | "teste"
            | "ativo"
            | "inadimplente"
            | "suspenso"
            | "cancelado"
          slug: string | null
        }
        Insert: {
          atualizado_em?: string
          cpf_cnpj?: string | null
          creci?: string | null
          criado_em?: string
          excluido_em?: string | null
          fuso_horario?: string
          id?: string
          limite_armazenamento_mb?: number
          limite_imoveis?: number
          limite_usuarios?: number
          mfa_obrigatorio?: boolean
          nome: string
          portfolio_ativo?: boolean
          portfolio_bio?: string | null
          portfolio_capa_chave?: string | null
          portfolio_email?: string | null
          portfolio_logo_chave?: string | null
          portfolio_titulo?: string | null
          portfolio_whatsapp?: string | null
          retencao_dias?: number
          situacao?:
            | "teste"
            | "ativo"
            | "inadimplente"
            | "suspenso"
            | "cancelado"
          slug?: string | null
        }
        Update: {
          atualizado_em?: string
          cpf_cnpj?: string | null
          creci?: string | null
          criado_em?: string
          excluido_em?: string | null
          fuso_horario?: string
          id?: string
          limite_armazenamento_mb?: number
          limite_imoveis?: number
          limite_usuarios?: number
          mfa_obrigatorio?: boolean
          nome?: string
          portfolio_ativo?: boolean
          portfolio_bio?: string | null
          portfolio_capa_chave?: string | null
          portfolio_email?: string | null
          portfolio_logo_chave?: string | null
          portfolio_titulo?: string | null
          portfolio_whatsapp?: string | null
          retencao_dias?: number
          situacao?:
            | "teste"
            | "ativo"
            | "inadimplente"
            | "suspenso"
            | "cancelado"
          slug?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      portfolio_corretores: {
        Row: {
          creci: string | null
          id: string | null
          nome: string | null
          portfolio_bio: string | null
          portfolio_capa_chave: string | null
          portfolio_email: string | null
          portfolio_logo_chave: string | null
          portfolio_titulo: string | null
          portfolio_whatsapp: string | null
          slug: string | null
        }
        Insert: {
          creci?: string | null
          id?: string | null
          nome?: string | null
          portfolio_bio?: string | null
          portfolio_capa_chave?: string | null
          portfolio_email?: string | null
          portfolio_logo_chave?: string | null
          portfolio_titulo?: string | null
          portfolio_whatsapp?: string | null
          slug?: string | null
        }
        Update: {
          creci?: string | null
          id?: string | null
          nome?: string | null
          portfolio_bio?: string | null
          portfolio_capa_chave?: string | null
          portfolio_email?: string | null
          portfolio_logo_chave?: string | null
          portfolio_titulo?: string | null
          portfolio_whatsapp?: string | null
          slug?: string | null
        }
        Relationships: []
      }
      portfolio_imoveis: {
        Row: {
          aceita_fgts: boolean | null
          aceita_financiamento: boolean | null
          aceita_pet: boolean | null
          andar: number | null
          ano_construcao: number | null
          area_total: number | null
          area_util: number | null
          bairro: string | null
          banheiros: number | null
          cidade: string | null
          codigo: string | null
          comodidades: string[] | null
          conservacao: "novo" | "usado" | "na_planta" | "em_construcao" | null
          descricao_publica: string | null
          endereco_publico: string | null
          finalidade: "venda" | "aluguel" | "venda_aluguel" | null
          id: string | null
          latitude_publica: number | null
          longitude_publica: number | null
          mobiliado: boolean | null
          publicado_em: string | null
          quartos: number | null
          situacao:
            | "rascunho"
            | "disponivel"
            | "reservado"
            | "em_negociacao"
            | "vendido"
            | "alugado"
            | "suspenso"
            | null
          slug: string | null
          suites: number | null
          tenant_id: string | null
          tipo:
            | "apartamento"
            | "casa"
            | "casa_condominio"
            | "terreno"
            | "terreno_condominio"
            | "galpao"
            | "sala_comercial"
            | "loja"
            | "chacara"
            | "sobrado"
            | "cobertura"
            | "kitnet"
            | "outro"
            | null
          titulo: string | null
          uf: string | null
          uso: "residencial" | "comercial" | null
          vagas: number | null
          valor: number | null
          valor_aluguel: number | null
          valor_condominio: number | null
          valor_iptu: number | null
        }
        Insert: {
          aceita_fgts?: boolean | null
          aceita_financiamento?: boolean | null
          aceita_pet?: boolean | null
          andar?: number | null
          ano_construcao?: number | null
          area_total?: number | null
          area_util?: number | null
          bairro?: string | null
          banheiros?: number | null
          cidade?: string | null
          codigo?: string | null
          comodidades?: string[] | null
          conservacao?: "novo" | "usado" | "na_planta" | "em_construcao" | null
          descricao_publica?: string | null
          endereco_publico?: string | null
          finalidade?: "venda" | "aluguel" | "venda_aluguel" | null
          id?: string | null
          latitude_publica?: number | null
          longitude_publica?: number | null
          mobiliado?: boolean | null
          publicado_em?: string | null
          quartos?: number | null
          situacao?:
            | "rascunho"
            | "disponivel"
            | "reservado"
            | "em_negociacao"
            | "vendido"
            | "alugado"
            | "suspenso"
            | null
          slug?: string | null
          suites?: number | null
          tenant_id?: string | null
          tipo?:
            | "apartamento"
            | "casa"
            | "casa_condominio"
            | "terreno"
            | "terreno_condominio"
            | "galpao"
            | "sala_comercial"
            | "loja"
            | "chacara"
            | "sobrado"
            | "cobertura"
            | "kitnet"
            | "outro"
            | null
          titulo?: string | null
          uf?: string | null
          uso?: "residencial" | "comercial" | null
          vagas?: number | null
          valor?: number | null
          valor_aluguel?: number | null
          valor_condominio?: number | null
          valor_iptu?: number | null
        }
        Update: {
          aceita_fgts?: boolean | null
          aceita_financiamento?: boolean | null
          aceita_pet?: boolean | null
          andar?: number | null
          ano_construcao?: number | null
          area_total?: number | null
          area_util?: number | null
          bairro?: string | null
          banheiros?: number | null
          cidade?: string | null
          codigo?: string | null
          comodidades?: string[] | null
          conservacao?: "novo" | "usado" | "na_planta" | "em_construcao" | null
          descricao_publica?: string | null
          endereco_publico?: string | null
          finalidade?: "venda" | "aluguel" | "venda_aluguel" | null
          id?: string | null
          latitude_publica?: number | null
          longitude_publica?: number | null
          mobiliado?: boolean | null
          publicado_em?: string | null
          quartos?: number | null
          situacao?:
            | "rascunho"
            | "disponivel"
            | "reservado"
            | "em_negociacao"
            | "vendido"
            | "alugado"
            | "suspenso"
            | null
          slug?: string | null
          suites?: number | null
          tenant_id?: string | null
          tipo?:
            | "apartamento"
            | "casa"
            | "casa_condominio"
            | "terreno"
            | "terreno_condominio"
            | "galpao"
            | "sala_comercial"
            | "loja"
            | "chacara"
            | "sobrado"
            | "cobertura"
            | "kitnet"
            | "outro"
            | null
          titulo?: string | null
          uf?: string | null
          uso?: "residencial" | "comercial" | null
          vagas?: number | null
          valor?: number | null
          valor_aluguel?: number | null
          valor_condominio?: number | null
          valor_iptu?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "imoveis_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "portfolio_corretores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imoveis_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_midias: {
        Row: {
          altura: number | null
          capa: boolean | null
          chave: string | null
          id: string | null
          imovel_id: string | null
          largura: number | null
          legenda: string | null
          ordem: number | null
          tipo:
            | "foto"
            | "video"
            | "planta"
            | "tour_virtual"
            | "documento"
            | null
          tipo_conteudo: string | null
          url_externa: string | null
        }
        Insert: {
          altura?: number | null
          capa?: boolean | null
          chave?: string | null
          id?: string | null
          imovel_id?: string | null
          largura?: number | null
          legenda?: string | null
          ordem?: number | null
          tipo?:
            | "foto"
            | "video"
            | "planta"
            | "tour_virtual"
            | "documento"
            | null
          tipo_conteudo?: string | null
          url_externa?: string | null
        }
        Update: {
          altura?: number | null
          capa?: boolean | null
          chave?: string | null
          id?: string | null
          imovel_id?: string | null
          largura?: number | null
          legenda?: string | null
          ordem?: number | null
          tipo?:
            | "foto"
            | "video"
            | "planta"
            | "tour_virtual"
            | "documento"
            | null
          tipo_conteudo?: string | null
          url_externa?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "imovel_midias_imovel_id_fkey"
            columns: ["imovel_id"]
            isOneToOne: false
            referencedRelation: "imoveis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imovel_midias_imovel_id_fkey"
            columns: ["imovel_id"]
            isOneToOne: false
            referencedRelation: "portfolio_imoveis"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      autenticar_no_portal: {
        Args: {
          p_agente?: string
          p_cpf: string
          p_ip?: unknown
          p_nascimento: string
        }
        Returns: {
          autorizado: boolean
          motivo: string
          nome: string
          pessoa_id: string
          segundos_de_espera: number
          tenant_id: string
        }[]
      }
      executar_automacoes: {
        Args: { p_tenant_id: string }
        Returns: {
          criados: number
          limitado: boolean
          regra: string
        }[]
      }
      painel_funil: {
        Args: { p_tenant_id: string }
        Returns: {
          etapa_cor: string
          etapa_id: string
          etapa_nome: string
          etapa_ordem: number
          parados: number
          quantidade: number
          segundos_medios_na_etapa: number
          valor_total: number
        }[]
      }
      painel_indicadores: {
        Args: { p_fim: string; p_inicio: string; p_tenant_id: string }
        Returns: {
          followups_pendentes: number
          followups_vencidos: number
          negocios_ativos: number
          negocios_ganhos: number
          negocios_parados: number
          negocios_perdidos: number
          pessoas_novas: number
          pessoas_quentes: number
          tarefas_vencidas: number
          taxa_conversao: number
          ticket_medio: number
          valor_em_negociacao: number
          valor_fechado: number
          visitas_marcadas: number
          visitas_realizadas: number
        }[]
      }
      painel_prioridades: {
        Args: { p_limite?: number; p_tenant_id: string }
        Returns: {
          acao: string
          motivo: string
          negocio_codigo: string
          negocio_id: string
          negocio_valor: number
          parado_desde: string
          peso: number
          pessoa_id: string
          pessoa_nome: string
          risco: string
          temperatura: string
          tipo: string
        }[]
      }
      portal_aceitar_termo: {
        Args: { p_pessoa_id: string; p_versao: string }
        Returns: boolean
      }
      portal_excluir_meus_dados: {
        Args: { p_pessoa_id: string }
        Returns: boolean
      }
      portal_meu_resumo: {
        Args: { p_pessoa_id: string }
        Returns: {
          corretor_creci: string
          corretor_email: string
          corretor_nome: string
          corretor_whatsapp: string
          imoveis_de_interesse: number
          lgpd_aceito: boolean
          nome: string
          simulacao_aprovada: boolean
          simulacoes: number
        }[]
      }
      portal_meus_imoveis: {
        Args: { p_pessoa_id: string }
        Returns: {
          area_util: number
          bairro: string
          banheiros: number
          cidade: string
          codigo: string
          descricao_publica: string
          finalidade: string
          foto_chave: string
          id: string
          interesse: string
          interesse_em: string
          quartos: number
          situacao: string
          slug: string
          tipo: string
          titulo: string
          uf: string
          vagas: number
          valor: number
          valor_aluguel: number
          valor_condominio: number
        }[]
      }
      portal_minhas_simulacoes: {
        Args: { p_pessoa_id: string }
        Returns: {
          bancos: Json
          codigo: string
          criado_em: string
          id: string
          imovel_titulo: string
          melhor_parcela: number
          prazo_meses: number
          respondido_em: string
          situacao: string
          valor_entrada: number
          valor_financiamento: number
          valor_imovel: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
