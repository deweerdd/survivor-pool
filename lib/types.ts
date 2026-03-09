// This file contains shared TypeScript types.
// Database types should be generated via:
//   supabase gen types typescript --project-id <id> --schema public > lib/types.ts
// The Database type below is a placeholder until you connect your Supabase project.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      seasons: {
        Row: {
          id: string;
          name: string;
          number: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          number: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          number?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      survivors: {
        Row: {
          id: string;
          season_id: string;
          name: string;
          image_url: string | null;
          is_active: boolean;
          eliminated_episode_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          season_id: string;
          name: string;
          image_url?: string | null;
          is_active?: boolean;
          eliminated_episode_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          season_id?: string;
          name?: string;
          image_url?: string | null;
          is_active?: boolean;
          eliminated_episode_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      pools: {
        Row: {
          id: string;
          season_id: string;
          name: string;
          commissioner_id: string;
          invite_code: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          season_id: string;
          name: string;
          commissioner_id: string;
          invite_code: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          season_id?: string;
          name?: string;
          commissioner_id?: string;
          invite_code?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      pool_members: {
        Row: {
          id: string;
          pool_id: string;
          user_id: string;
          joined_at: string;
        };
        Insert: {
          id?: string;
          pool_id: string;
          user_id: string;
          joined_at?: string;
        };
        Update: {
          id?: string;
          pool_id?: string;
          user_id?: string;
          joined_at?: string;
        };
        Relationships: [];
      };
      episodes: {
        Row: {
          id: string;
          season_id: string;
          episode_number: number;
          air_date: string;
          picks_lock_at: string;
          results_release_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          season_id: string;
          episode_number: number;
          air_date: string;
          picks_lock_at: string;
          results_release_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          season_id?: string;
          episode_number?: number;
          air_date?: string;
          picks_lock_at?: string;
          results_release_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      picks: {
        Row: {
          id: string;
          pool_id: string;
          user_id: string;
          episode_id: string;
          survivor_id: string;
          points: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          pool_id: string;
          user_id: string;
          episode_id: string;
          survivor_id: string;
          points: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          pool_id?: string;
          user_id?: string;
          episode_id?: string;
          survivor_id?: string;
          points?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          is_super_admin: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          is_super_admin?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          is_super_admin?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// Convenience row types
export type Season = Database["public"]["Tables"]["seasons"]["Row"];
export type Survivor = Database["public"]["Tables"]["survivors"]["Row"];
export type Pool = Database["public"]["Tables"]["pools"]["Row"];
export type PoolMember = Database["public"]["Tables"]["pool_members"]["Row"];
export type Episode = Database["public"]["Tables"]["episodes"]["Row"];
export type Pick = Database["public"]["Tables"]["picks"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

// Extended types used in the UI
export type PoolWithSeason = Pool & { seasons: Season };

export type PoolMemberWithProfile = PoolMember & {
  profiles: { display_name: string | null; avatar_url: string | null } | null;
};

export type SurvivorWithPoints = Survivor & { points: number };

export type LeaderboardEntry = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  total_points: number;
};
