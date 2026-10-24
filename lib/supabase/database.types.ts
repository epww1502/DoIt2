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
      profiles: {
        Row: {
          avatar_path: string | null;
          nickname: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          avatar_path?: string | null;
          nickname?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          avatar_path?: string | null;
          nickname?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      space_members: {
        Row: {
          sort_order: number | null;
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
          owner_id: string | null;
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
          owner_id?: string | null;
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
          owner_id: string | null;
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
          owner_id: string | null;
        };
        SetofOptions: {
          from: '*';
          to: 'spaces';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      kick_space_member: {
        Args: { member: string; target_space: string };
        Returns: undefined;
      };
      leave_space: { Args: { target_space: string }; Returns: undefined };
      reset_invite_code: { Args: { target_space: string }; Returns: string };
      set_space_order: { Args: { ordered: string[] }; Returns: undefined };
      transfer_space_owner: {
        Args: { new_owner: string; target_space: string };
        Returns: undefined;
      };
      my_space_ids: { Args: never; Returns: string[] };
      set_space_profile: {
        Args: {
          target_space: string;
          visible: boolean;
          space_nickname: string | null;
          space_avatar_path: string | null;
        };
        Returns: undefined;
      };
      space_member_profiles: {
        Args: { target_space: string };
        // 그 공간에서 공개를 끈 사람은 nickname·avatar_path가 null로 온다
        Returns: {
          avatar_path: string | null;
          is_me: boolean;
          is_owner: boolean;
          show_profile: boolean;
          space_nickname: string | null;
          space_avatar_path: string | null;
          joined_at: string;
          nickname: string | null;
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

export type BucketItemRow = Database['public']['Tables']['bucket_items']['Row'];
export type SpaceRow = Database['public']['Tables']['spaces']['Row'];
export type ProfileRow = Database['public']['Tables']['profiles']['Row'];
export type MemberProfile =
  Database['public']['Functions']['space_member_profiles']['Returns'][number];
