export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1";
  };
  public: {
    Tables: {
      allocations: {
        Row: {
          contestant_id: number;
          created_at: string;
          episode_id: number;
          id: number;
          points: number;
          pool_id: number;
          user_id: string;
        };
        Insert: {
          contestant_id: number;
          created_at?: string;
          episode_id: number;
          id?: number;
          points: number;
          pool_id: number;
          user_id: string;
        };
        Update: {
          contestant_id?: number;
          created_at?: string;
          episode_id?: number;
          id?: number;
          points?: number;
          pool_id?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "allocations_contestant_id_fkey";
            columns: ["contestant_id"];
            isOneToOne: false;
            referencedRelation: "contestants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "allocations_episode_id_fkey";
            columns: ["episode_id"];
            isOneToOne: false;
            referencedRelation: "episodes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "allocations_pool_id_fkey";
            columns: ["pool_id"];
            isOneToOne: false;
            referencedRelation: "pools";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "allocations_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      contestants: {
        Row: {
          created_at: string;
          id: number;
          img_url: string | null;
          is_active: boolean;
          name: string;
          season_id: number;
          tribe: string | null;
          wiki_slug: string | null;
        };
        Insert: {
          created_at?: string;
          id?: number;
          img_url?: string | null;
          is_active?: boolean;
          name: string;
          season_id: number;
          tribe?: string | null;
          wiki_slug?: string | null;
        };
        Update: {
          created_at?: string;
          id?: number;
          img_url?: string | null;
          is_active?: boolean;
          name?: string;
          season_id?: number;
          tribe?: string | null;
          wiki_slug?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "contestants_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
        ];
      };
      eliminations: {
        Row: {
          contestant_id: number;
          created_at: string;
          episode_id: number;
          id: number;
        };
        Insert: {
          contestant_id: number;
          created_at?: string;
          episode_id: number;
          id?: number;
        };
        Update: {
          contestant_id?: number;
          created_at?: string;
          episode_id?: number;
          id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "eliminations_contestant_id_fkey";
            columns: ["contestant_id"];
            isOneToOne: false;
            referencedRelation: "contestants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "eliminations_episode_id_fkey";
            columns: ["episode_id"];
            isOneToOne: false;
            referencedRelation: "episodes";
            referencedColumns: ["id"];
          },
        ];
      };
      episodes: {
        Row: {
          air_date: string | null;
          created_at: string;
          episode_number: number;
          id: number;
          is_locked: boolean;
          season_id: number;
          title: string | null;
        };
        Insert: {
          air_date?: string | null;
          created_at?: string;
          episode_number: number;
          id?: number;
          is_locked?: boolean;
          season_id: number;
          title?: string | null;
        };
        Update: {
          air_date?: string | null;
          created_at?: string;
          episode_number?: number;
          id?: number;
          is_locked?: boolean;
          season_id?: number;
          title?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "episodes_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
        ];
      };
      pool_members: {
        Row: {
          id: number;
          joined_at: string;
          pool_id: number;
          user_id: string;
        };
        Insert: {
          id?: number;
          joined_at?: string;
          pool_id: number;
          user_id: string;
        };
        Update: {
          id?: number;
          joined_at?: string;
          pool_id?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pool_members_pool_id_fkey";
            columns: ["pool_id"];
            isOneToOne: false;
            referencedRelation: "pools";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pool_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      pools: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: number;
          invite_code: string | null;
          is_public: boolean;
          name: string;
          season_id: number;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: number;
          invite_code?: string | null;
          is_public?: boolean;
          name: string;
          season_id: number;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: number;
          invite_code?: string | null;
          is_public?: boolean;
          name?: string;
          season_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "pools_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pools_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string | null;
          email: string | null;
          id: string;
          is_admin: boolean;
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          email?: string | null;
          id: string;
          is_admin?: boolean;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          email?: string | null;
          id?: string;
          is_admin?: boolean;
        };
        Relationships: [];
      };
      seasons: {
        Row: {
          created_at: string;
          id: number;
          is_active: boolean;
          name: string;
          wiki_url: string | null;
        };
        Insert: {
          created_at?: string;
          id?: number;
          is_active?: boolean;
          name: string;
          wiki_url?: string | null;
        };
        Update: {
          created_at?: string;
          id?: number;
          is_active?: boolean;
          name?: string;
          wiki_url?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_pool_scores: {
        Args: { p_pool_id: number };
        Returns: {
          display_name: string;
          total_points: number;
          user_id: string;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
