// Supabase MCP generate_typescript_types로 만든 파일. 스키마를 바꾸면 다시 생성한다.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.18';
  };
  public: {
    Tables: {
      bucket_items: {
        Row: {
          category: string;
          couple_id: string;
          created_at: string;
          created_by: string | null;
          done: Json | null;
          id: string;
          kind: string;
          location: string;
          memo: string;
          place: Json | null;
          setting: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          category: string;
          couple_id: string;
          created_at?: string;
          created_by?: string | null;
          done?: Json | null;
          id: string;
          kind: string;
          location?: string;
          memo?: string;
          place?: Json | null;
          setting: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          category?: string;
          couple_id?: string;
          created_at?: string;
          created_by?: string | null;
          done?: Json | null;
          id?: string;
          kind?: string;
          location?: string;
          memo?: string;
          place?: Json | null;
          setting?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'bucket_items_couple_id_fkey';
            columns: ['couple_id'];
            isOneToOne: false;
            referencedRelation: 'couples';
            referencedColumns: ['id'];
          },
        ];
      };
      couple_members: {
        Row: {
          couple_id: string;
          joined_at: string;
          user_id: string;
        };
        Insert: {
          couple_id: string;
          joined_at?: string;
          user_id: string;
        };
        Update: {
          couple_id?: string;
          joined_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'couple_members_couple_id_fkey';
            columns: ['couple_id'];
            isOneToOne: false;
            referencedRelation: 'couples';
            referencedColumns: ['id'];
          },
        ];
      };
      couples: {
        Row: {
          created_at: string;
          id: string;
          invite_code: string;
          started_on: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          invite_code: string;
          started_on?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          invite_code?: string;
          started_on?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_couple: {
        Args: never;
        Returns: {
          created_at: string;
          id: string;
          invite_code: string;
          started_on: string | null;
        };
        SetofOptions: {
          from: '*';
          to: 'couples';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      generate_invite_code: { Args: never; Returns: string };
      join_couple: {
        Args: { code: string };
        Returns: {
          created_at: string;
          id: string;
          invite_code: string;
          started_on: string | null;
        };
        SetofOptions: {
          from: '*';
          to: 'couples';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      leave_couple: { Args: never; Returns: undefined };
      my_couple_id: { Args: never; Returns: string };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type BucketItemRow = Database['public']['Tables']['bucket_items']['Row'];
export type CoupleRow = Database['public']['Tables']['couples']['Row'];
