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
          created_at: string;
          created_by: string | null;
          done: Json | null;
          id: string;
          kind: string;
          location: string;
          memo: string;
          place: Json | null;
          setting: string;
          space_id: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          category: string;
          created_at?: string;
          created_by?: string | null;
          done?: Json | null;
          id: string;
          kind: string;
          location?: string;
          memo?: string;
          place?: Json | null;
          setting: string;
          space_id: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          created_by?: string | null;
          done?: Json | null;
          id?: string;
          kind?: string;
          location?: string;
          memo?: string;
          place?: Json | null;
          setting?: string;
          space_id?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'bucket_items_space_id_fkey';
            columns: ['space_id'];
            isOneToOne: false;
            referencedRelation: 'spaces';
            referencedColumns: ['id'];
          },
        ];
      };
      space_members: {
        Row: {
          joined_at: string;
          space_id: string;
          user_id: string;
        };
        Insert: {
          joined_at?: string;
          space_id: string;
          user_id: string;
        };
        Update: {
          joined_at?: string;
          space_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'space_members_space_id_fkey';
            columns: ['space_id'];
            isOneToOne: false;
            referencedRelation: 'spaces';
            referencedColumns: ['id'];
          },
        ];
      };
      spaces: {
        Row: {
          created_at: string;
          created_by: string | null;
          emoji: string;
          id: string;
          image_path: string | null;
          invite_code: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          emoji?: string;
          id?: string;
          image_path?: string | null;
          invite_code: string;
          name?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          emoji?: string;
          id?: string;
          image_path?: string | null;
          invite_code?: string;
          name?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_space: {
        Args: { space_emoji: string; space_name: string };
        Returns: {
          created_at: string;
          created_by: string | null;
          emoji: string;
          id: string;
          image_path: string | null;
          invite_code: string;
          name: string;
        };
        SetofOptions: {
          from: '*';
          to: 'spaces';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      generate_invite_code: { Args: never; Returns: string };
      join_space: {
        Args: { code: string };
        Returns: {
          created_at: string;
          created_by: string | null;
          emoji: string;
          id: string;
          image_path: string | null;
          invite_code: string;
          name: string;
        };
        SetofOptions: {
          from: '*';
          to: 'spaces';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      leave_space: { Args: { target_space: string }; Returns: undefined };
      my_space_ids: { Args: never; Returns: string[] };
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
export type SpaceRow = Database['public']['Tables']['spaces']['Row'];
