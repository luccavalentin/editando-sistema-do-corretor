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
      app_role:
        | "superadmin"
        | "admin_adm"
        | "mecanico"
        | "montador"
        | "vendedor"
        | "financeiro"
        | "lider"
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
      app_role: [
        "superadmin",
        "admin_adm",
        "mecanico",
        "montador",
        "vendedor",
        "financeiro",
        "lider",
      ],
    },
  },
} as const
