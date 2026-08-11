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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      agenda_servicos: {
        Row: {
          criado_em: string | null
          data_prevista: string
          especialidade: Database["public"]["Enums"]["agenda_especialidade"]
          id: string
          mecanico_id: string | null
          os_id: string
          status: Database["public"]["Enums"]["agenda_status"] | null
        }
        Insert: {
          criado_em?: string | null
          data_prevista: string
          especialidade: Database["public"]["Enums"]["agenda_especialidade"]
          id?: string
          mecanico_id?: string | null
          os_id: string
          status?: Database["public"]["Enums"]["agenda_status"] | null
        }
        Update: {
          criado_em?: string | null
          data_prevista?: string
          especialidade?: Database["public"]["Enums"]["agenda_especialidade"]
          id?: string
          mecanico_id?: string | null
          os_id?: string
          status?: Database["public"]["Enums"]["agenda_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "agenda_servicos_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          payload: Json | null
          record_id: string | null
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          payload?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          payload?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      checklist_garantias: {
        Row: {
          checklist_id: string
          criado_em: string | null
          id: string
          item_descricao: string
          meses_garantia: number | null
          tipo: string | null
          vencimento_em: string
        }
        Insert: {
          checklist_id: string
          criado_em?: string | null
          id?: string
          item_descricao: string
          meses_garantia?: number | null
          tipo?: string | null
          vencimento_em: string
        }
        Update: {
          checklist_id?: string
          criado_em?: string | null
          id?: string
          item_descricao?: string
          meses_garantia?: number | null
          tipo?: string | null
          vencimento_em?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_garantias_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "checklists"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_templates: {
        Row: {
          criado_em: string | null
          id: string
          itens: Json
          ordem: number
          secao: string
          tipo: Database["public"]["Enums"]["checklist_type"]
        }
        Insert: {
          criado_em?: string | null
          id?: string
          itens: Json
          ordem: number
          secao: string
          tipo: Database["public"]["Enums"]["checklist_type"]
        }
        Update: {
          criado_em?: string | null
          id?: string
          itens?: Json
          ordem?: number
          secao?: string
          tipo?: Database["public"]["Enums"]["checklist_type"]
        }
        Relationships: []
      }
      checklists: {
        Row: {
          assinatura_url: string | null
          criado_em: string | null
          criado_por: string | null
          finalizado_em: string | null
          id: string
          os_id: string
          respostas: Json
          tipo: Database["public"]["Enums"]["checklist_type"]
        }
        Insert: {
          assinatura_url?: string | null
          criado_em?: string | null
          criado_por?: string | null
          finalizado_em?: string | null
          id?: string
          os_id: string
          respostas?: Json
          tipo: Database["public"]["Enums"]["checklist_type"]
        }
        Update: {
          assinatura_url?: string | null
          criado_em?: string | null
          criado_por?: string | null
          finalizado_em?: string | null
          id?: string
          os_id?: string
          respostas?: Json
          tipo?: Database["public"]["Enums"]["checklist_type"]
        }
        Relationships: [
          {
            foreignKeyName: "checklists_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          ativo: boolean | null
          contato_nome: string | null
          criado_em: string | null
          documento: string | null
          email: string | null
          endereco_bairro: string | null
          endereco_cep: string | null
          endereco_cidade: string | null
          endereco_rua: string | null
          endereco_uf: string | null
          id: string
          inscricao_estadual: string | null
          inscricao_municipal: string | null
          nome: string
          omie_codigo_cliente: string | null
          telefone: string | null
          ultima_interacao_em: string | null
        }
        Insert: {
          ativo?: boolean | null
          contato_nome?: string | null
          criado_em?: string | null
          documento?: string | null
          email?: string | null
          endereco_bairro?: string | null
          endereco_cep?: string | null
          endereco_cidade?: string | null
          endereco_rua?: string | null
          endereco_uf?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          nome: string
          omie_codigo_cliente?: string | null
          telefone?: string | null
          ultima_interacao_em?: string | null
        }
        Update: {
          ativo?: boolean | null
          contato_nome?: string | null
          criado_em?: string | null
          documento?: string | null
          email?: string | null
          endereco_bairro?: string | null
          endereco_cep?: string | null
          endereco_cidade?: string | null
          endereco_rua?: string | null
          endereco_uf?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          nome?: string
          omie_codigo_cliente?: string | null
          telefone?: string | null
          ultima_interacao_em?: string | null
        }
        Relationships: []
      }
      clientes_follow_up: {
        Row: {
          cliente_id: string | null
          criado_em: string | null
          dias_inativo: number | null
          id: string
          status_follow_up:
            | Database["public"]["Enums"]["follow_up_status"]
            | null
          ultima_os_em: string | null
        }
        Insert: {
          cliente_id?: string | null
          criado_em?: string | null
          dias_inativo?: number | null
          id?: string
          status_follow_up?:
            | Database["public"]["Enums"]["follow_up_status"]
            | null
          ultima_os_em?: string | null
        }
        Update: {
          cliente_id?: string | null
          criado_em?: string | null
          dias_inativo?: number | null
          id?: string
          status_follow_up?:
            | Database["public"]["Enums"]["follow_up_status"]
            | null
          ultima_os_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_follow_up_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_base_conhecimento: {
        Row: {
          categoria: string | null
          conteudo: string
          criado_em: string | null
          documento_origem: string | null
          embedding: string | null
          id: string
          marca: string | null
          ordem_fragmento: number | null
          origem: string
          tags: string[] | null
          titulo: string
        }
        Insert: {
          categoria?: string | null
          conteudo: string
          criado_em?: string | null
          documento_origem?: string | null
          embedding?: string | null
          id?: string
          marca?: string | null
          ordem_fragmento?: number | null
          origem: string
          tags?: string[] | null
          titulo: string
        }
        Update: {
          categoria?: string | null
          conteudo?: string
          criado_em?: string | null
          documento_origem?: string | null
          embedding?: string | null
          id?: string
          marca?: string | null
          ordem_fragmento?: number | null
          origem?: string
          tags?: string[] | null
          titulo?: string
        }
        Relationships: []
      }
      ia_config: {
        Row: {
          atualizado_em: string | null
          id: string
          provider_ativo: string
        }
        Insert: {
          atualizado_em?: string | null
          id?: string
          provider_ativo?: string
        }
        Update: {
          atualizado_em?: string | null
          id?: string
          provider_ativo?: string
        }
        Relationships: []
      }
      ia_conversas: {
        Row: {
          criado_em: string | null
          id: string
          titulo: string | null
          usuario_id: string
        }
        Insert: {
          criado_em?: string | null
          id?: string
          titulo?: string | null
          usuario_id: string
        }
        Update: {
          criado_em?: string | null
          id?: string
          titulo?: string | null
          usuario_id?: string
        }
        Relationships: []
      }
      ia_faqs: {
        Row: {
          aprovado_por_humano: string | null
          criado_em: string | null
          id: string
          pergunta: string
          resposta: string
        }
        Insert: {
          aprovado_por_humano?: string | null
          criado_em?: string | null
          id?: string
          pergunta: string
          resposta: string
        }
        Update: {
          aprovado_por_humano?: string | null
          criado_em?: string | null
          id?: string
          pergunta?: string
          resposta?: string
        }
        Relationships: []
      }
      ia_mensagens: {
        Row: {
          anexos: Json | null
          autor: string
          confianca_resposta: number | null
          conteudo: string
          conversa_id: string
          criado_em: string | null
          escalado_para_humano: boolean | null
          id: string
          provider_usado: string | null
        }
        Insert: {
          anexos?: Json | null
          autor: string
          confianca_resposta?: number | null
          conteudo: string
          conversa_id: string
          criado_em?: string | null
          escalado_para_humano?: boolean | null
          id?: string
          provider_usado?: string | null
        }
        Update: {
          anexos?: Json | null
          autor?: string
          confianca_resposta?: number | null
          conteudo?: string
          conversa_id?: string
          criado_em?: string | null
          escalado_para_humano?: boolean | null
          id?: string
          provider_usado?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ia_mensagens_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "ia_conversas"
            referencedColumns: ["id"]
          },
        ]
      }
      mcp_servers: {
        Row: {
          capabilities: string[] | null
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          status: string
          type: string
          url: string
        }
        Insert: {
          capabilities?: string[] | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          status?: string
          type: string
          url: string
        }
        Update: {
          capabilities?: string[] | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          status?: string
          type?: string
          url?: string
        }
        Relationships: []
      }
      notificacoes: {
        Row: {
          criado_em: string | null
          id: string
          lida: boolean | null
          mensagem: string
          referencia_id: string | null
          referencia_tabela: string | null
          tipo: string
          usuario_id_destino: string
        }
        Insert: {
          criado_em?: string | null
          id?: string
          lida?: boolean | null
          mensagem: string
          referencia_id?: string | null
          referencia_tabela?: string | null
          tipo: string
          usuario_id_destino: string
        }
        Update: {
          criado_em?: string | null
          id?: string
          lida?: boolean | null
          mensagem?: string
          referencia_id?: string | null
          referencia_tabela?: string | null
          tipo?: string
          usuario_id_destino?: string
        }
        Relationships: []
      }
      omie_sync_log: {
        Row: {
          criado_em: string | null
          entidade: string
          id: string
          mensagem: string | null
          payload: Json | null
          status: string
        }
        Insert: {
          criado_em?: string | null
          entidade: string
          id?: string
          mensagem?: string | null
          payload?: Json | null
          status: string
        }
        Update: {
          criado_em?: string | null
          entidade?: string
          id?: string
          mensagem?: string | null
          payload?: Json | null
          status?: string
        }
        Relationships: []
      }
      ordens_servico: {
        Row: {
          box: string | null
          cliente_id: string
          criado_em: string | null
          finalizado_em: string | null
          foto_os_original_url: string | null
          fotos_entrada: string[] | null
          id: string
          km_entrada: number | null
          motorista_cliente: string | null
          numero: number
          observacoes_gerais: string | null
          omie_codigo_os: string | null
          protocolo: string
          responsavel_abertura_id: string
          status: string | null
          tecnico_id: string | null
          valor_pecas: number | null
          valor_servico: number | null
          veiculo_id: string
        }
        Insert: {
          box?: string | null
          cliente_id: string
          criado_em?: string | null
          finalizado_em?: string | null
          foto_os_original_url?: string | null
          fotos_entrada?: string[] | null
          id?: string
          km_entrada?: number | null
          motorista_cliente?: string | null
          numero?: number
          observacoes_gerais?: string | null
          omie_codigo_os?: string | null
          protocolo: string
          responsavel_abertura_id: string
          status?: string | null
          tecnico_id?: string | null
          valor_pecas?: number | null
          valor_servico?: number | null
          veiculo_id: string
        }
        Update: {
          box?: string | null
          cliente_id?: string
          criado_em?: string | null
          finalizado_em?: string | null
          foto_os_original_url?: string | null
          fotos_entrada?: string[] | null
          id?: string
          km_entrada?: number | null
          motorista_cliente?: string | null
          numero?: number
          observacoes_gerais?: string | null
          omie_codigo_os?: string | null
          protocolo?: string
          responsavel_abertura_id?: string
          status?: string | null
          tecnico_id?: string | null
          valor_pecas?: number | null
          valor_servico?: number | null
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ordens_servico_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_servico_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      os_historico_status: {
        Row: {
          criado_em: string | null
          id: string
          os_id: string
          status_anterior: string | null
          status_novo: string
          usuario_id: string
        }
        Insert: {
          criado_em?: string | null
          id?: string
          os_id: string
          status_anterior?: string | null
          status_novo: string
          usuario_id: string
        }
        Update: {
          criado_em?: string | null
          id?: string
          os_id?: string
          status_anterior?: string | null
          status_novo?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "os_historico_status_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      os_itens_peca: {
        Row: {
          descricao: string
          id: string
          omie_codigo_produto: string | null
          os_id: string
          quantidade: number
          unidade: string | null
          valor_total: number | null
          valor_unitario: number
        }
        Insert: {
          descricao: string
          id?: string
          omie_codigo_produto?: string | null
          os_id: string
          quantidade?: number
          unidade?: string | null
          valor_total?: number | null
          valor_unitario?: number
        }
        Update: {
          descricao?: string
          id?: string
          omie_codigo_produto?: string | null
          os_id?: string
          quantidade?: number
          unidade?: string | null
          valor_total?: number | null
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "os_itens_peca_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      os_itens_servico: {
        Row: {
          descricao: string
          id: string
          os_id: string
          quantidade: number
          valor_total: number | null
          valor_unitario: number
        }
        Insert: {
          descricao: string
          id?: string
          os_id: string
          quantidade?: number
          valor_total?: number | null
          valor_unitario?: number
        }
        Update: {
          descricao?: string
          id?: string
          os_id?: string
          quantidade?: number
          valor_total?: number | null
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "os_itens_servico_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      pecas_estoque_cache: {
        Row: {
          atualizado_em: string | null
          descricao: string
          id: string
          omie_codigo_produto: number
          saldo: number | null
        }
        Insert: {
          atualizado_em?: string | null
          descricao: string
          id?: string
          omie_codigo_produto: number
          saldo?: number | null
        }
        Update: {
          atualizado_em?: string | null
          descricao?: string
          id?: string
          omie_codigo_produto?: number
          saldo?: number | null
        }
        Relationships: []
      }
      pecas_teste: {
        Row: {
          cliente_id: string
          criado_em: string | null
          data_entrada: string | null
          descricao_peca: string
          etiqueta_codigo: string | null
          etiqueta_removida_em: string | null
          id: string
          mecanico_id: string | null
          os_id: string | null
          prazo_horas: number | null
          status: Database["public"]["Enums"]["peca_teste_status"] | null
          vencimento_em: string | null
          vendedor_id: string
        }
        Insert: {
          cliente_id: string
          criado_em?: string | null
          data_entrada?: string | null
          descricao_peca: string
          etiqueta_codigo?: string | null
          etiqueta_removida_em?: string | null
          id?: string
          mecanico_id?: string | null
          os_id?: string | null
          prazo_horas?: number | null
          status?: Database["public"]["Enums"]["peca_teste_status"] | null
          vencimento_em?: string | null
          vendedor_id: string
        }
        Update: {
          cliente_id?: string
          criado_em?: string | null
          data_entrada?: string | null
          descricao_peca?: string
          etiqueta_codigo?: string | null
          etiqueta_removida_em?: string | null
          id?: string
          mecanico_id?: string | null
          os_id?: string | null
          prazo_horas?: number | null
          status?: Database["public"]["Enums"]["peca_teste_status"] | null
          vencimento_em?: string | null
          vendedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pecas_teste_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pecas_teste_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      ranking_config: {
        Row: {
          atualizado_em: string | null
          criado_em: string | null
          id: string
          pontos: number
          tipo_evento: string
        }
        Insert: {
          atualizado_em?: string | null
          criado_em?: string | null
          id?: string
          pontos: number
          tipo_evento: string
        }
        Update: {
          atualizado_em?: string | null
          criado_em?: string | null
          id?: string
          pontos?: number
          tipo_evento?: string
        }
        Relationships: []
      }
      ranking_eventos: {
        Row: {
          criado_em: string | null
          criado_por: string | null
          id: string
          os_id: string | null
          pontos_aplicados: number
          tipo_evento: string
          usuario_id: string
        }
        Insert: {
          criado_em?: string | null
          criado_por?: string | null
          id?: string
          os_id?: string | null
          pontos_aplicados: number
          tipo_evento: string
          usuario_id: string
        }
        Update: {
          criado_em?: string | null
          criado_por?: string | null
          id?: string
          os_id?: string | null
          pontos_aplicados?: number
          tipo_evento?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ranking_eventos_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ranking_eventos_tipo_evento_fkey"
            columns: ["tipo_evento"]
            isOneToOne: false
            referencedRelation: "ranking_config"
            referencedColumns: ["tipo_evento"]
          },
        ]
      }
      sla_fases: {
        Row: {
          criado_em: string | null
          limite_horas_amarelo: number
          limite_horas_vermelho: number
          status: string
          updated_at: string | null
        }
        Insert: {
          criado_em?: string | null
          limite_horas_amarelo?: number
          limite_horas_vermelho?: number
          status: string
          updated_at?: string | null
        }
        Update: {
          criado_em?: string | null
          limite_horas_amarelo?: number
          limite_horas_vermelho?: number
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      termos_responsabilidade: {
        Row: {
          assinatura_cliente_url: string
          cliente_recusou_servico: boolean | null
          criado_em: string | null
          criado_por: string | null
          dano_identificado: string
          fotos: string[] | null
          id: string
          os_id: string
        }
        Insert: {
          assinatura_cliente_url: string
          cliente_recusou_servico?: boolean | null
          criado_em?: string | null
          criado_por?: string | null
          dano_identificado: string
          fotos?: string[] | null
          id?: string
          os_id: string
        }
        Update: {
          assinatura_cliente_url?: string
          cliente_recusou_servico?: boolean | null
          criado_em?: string | null
          criado_por?: string | null
          dano_identificado?: string
          fotos?: string[] | null
          id?: string
          os_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "termos_responsabilidade_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      veiculos: {
        Row: {
          cliente_id: string
          criado_em: string | null
          id: string
          km_atual: number | null
          modelo_carreta: string | null
          modelo_cavalo: string | null
          placa_carreta: string | null
          placa_cavalo: string
        }
        Insert: {
          cliente_id: string
          criado_em?: string | null
          id?: string
          km_atual?: number | null
          modelo_carreta?: string | null
          modelo_cavalo?: string | null
          placa_carreta?: string | null
          placa_cavalo: string
        }
        Update: {
          cliente_id?: string
          criado_em?: string | null
          id?: string
          km_atual?: number | null
          modelo_carreta?: string | null
          modelo_cavalo?: string | null
          placa_carreta?: string | null
          placa_cavalo?: string
        }
        Relationships: [
          {
            foreignKeyName: "veiculos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_ranking_points: {
        Args: { _os_id?: string; _tipo_evento: string; _usuario_id: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      transicionar_status_os: {
        Args: { _novo_status: string; _os_id: string; _usuario_id: string }
        Returns: undefined
      }
    }
    Enums: {
      agenda_especialidade:
        | "eletrica"
        | "socorro"
        | "troca_cuicas_aparelho_diag"
        | "teste_valvulas"
        | "troca_valvulas"
        | "vazamentos_ar"
      agenda_status: "pendente" | "em_andamento" | "concluido"
      app_role:
        | "superadmin"
        | "admin_adm"
        | "mecanico"
        | "montador"
        | "vendedor"
        | "financeiro"
        | "lider"
      checklist_type:
        | "diagnostico_defeitos"
        | "conferencia_final"
        | "estado_caminhao"
        | "operacional_lider"
        | "processo_setor"
      follow_up_status: "pendente" | "contatado" | "agendado" | "recusado"
      peca_teste_status:
        | "recebida"
        | "em_teste"
        | "testada_aprovada"
        | "testada_reprovada"
        | "aguardando_retirada"
        | "entregue"
        | "perdida"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      agenda_especialidade: [
        "eletrica",
        "socorro",
        "troca_cuicas_aparelho_diag",
        "teste_valvulas",
        "troca_valvulas",
        "vazamentos_ar",
      ],
      agenda_status: ["pendente", "em_andamento", "concluido"],
      app_role: [
        "superadmin",
        "admin_adm",
        "mecanico",
        "montador",
        "vendedor",
        "financeiro",
        "lider",
      ],
      checklist_type: [
        "diagnostico_defeitos",
        "conferencia_final",
        "estado_caminhao",
        "operacional_lider",
        "processo_setor",
      ],
      follow_up_status: ["pendente", "contatado", "agendado", "recusado"],
      peca_teste_status: [
        "recebida",
        "em_teste",
        "testada_aprovada",
        "testada_reprovada",
        "aguardando_retirada",
        "entregue",
        "perdida",
      ],
    },
  },
} as const
