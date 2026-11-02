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
      app_versions: {
        Row: {
          message: string | null;
          min_version: string;
          platform: string;
          store_url: string;
          updated_at: string;
        };
        Insert: {
          message?: string | null;
          min_version: string;
          platform: string;
          store_url: string;
          updated_at?: string;
        };
        Update: {
          message?: string | null;
          min_version?: string;
          platform?: string;
          store_url?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      bucket_items: {
        Row: {
          category: string;
          created_at: string;
          created_by: string | null;
          done: Json | null;
          goal: Json | null;
          id: string;
          kind: string;
          location: string;
          memo: string;
          photos: Json | null;
          repeat: Json | null;
          started: Json | null;
          todos: Json | null;
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
          goal?: Json | null;
          id: string;
          kind: string;
          location?: string;
          memo?: string;
          photos?: Json | null;
          repeat?: Json | null;
          started?: Json | null;
          todos?: Json | null;
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
          goal?: Json | null;
          id?: string;
          kind?: string;
          location?: string;
          memo?: string;
          photos?: Json | null;
          repeat?: Json | null;
          started?: Json | null;
          todos?: Json | null;
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
      content_reports: {
        Row: {
          comment_body: string | null;
          comment_id: string | null;
          created_at: string;
          id: string;
          reason: string;
          reporter_id: string | null;
          resolved_at: string | null;
          space_id: string;
          target_user_id: string | null;
        };
        Insert: {
          comment_body?: string | null;
          comment_id?: string | null;
          created_at?: string;
          id?: string;
          reason: string;
          reporter_id?: string | null;
          resolved_at?: string | null;
          space_id: string;
          target_user_id?: string | null;
        };
        Update: {
          comment_body?: string | null;
          comment_id?: string | null;
          created_at?: string;
          id?: string;
          reason?: string;
          reporter_id?: string | null;
          resolved_at?: string | null;
          space_id?: string;
          target_user_id?: string | null;
        };
        Relationships: [];
      };
      item_comments: {
        Row: {
          body: string;
          created_at: string;
          edited_at: string | null;
          id: string;
          item_id: string;
          space_id: string;
          user_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          edited_at?: string | null;
          id?: string;
          item_id: string;
          space_id: string;
          user_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          edited_at?: string | null;
          id?: string;
          item_id?: string;
          space_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'item_comments_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'bucket_items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'item_comments_space_id_fkey';
            columns: ['space_id'];
            isOneToOne: false;
            referencedRelation: 'spaces';
            referencedColumns: ['id'];
          },
        ];
      };
      comment_reactions: {
        Row: {
          comment_id: string;
          created_at: string;
          emoji: string;
          item_id: string;
          space_id: string;
          user_id: string;
        };
        Insert: {
          comment_id: string;
          created_at?: string;
          emoji: string;
          item_id?: string;
          space_id?: string;
          user_id: string;
        };
        Update: {
          comment_id?: string;
          created_at?: string;
          emoji?: string;
          item_id?: string;
          space_id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      item_reactions: {
        Row: {
          created_at: string;
          emoji: string;
          item_id: string;
          space_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          emoji: string;
          item_id: string;
          space_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          emoji?: string;
          item_id?: string;
          space_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'item_reactions_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'bucket_items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'item_reactions_space_id_fkey';
            columns: ['space_id'];
            isOneToOne: false;
            referencedRelation: 'spaces';
            referencedColumns: ['id'];
          },
        ];
      };
      item_reviews: {
        Row: {
          created_at: string;
          item_id: string;
          rating: number | null;
          review: string;
          space_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          item_id: string;
          rating?: number | null;
          review?: string;
          space_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          item_id?: string;
          rating?: number | null;
          review?: string;
          space_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'item_reviews_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'bucket_items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'item_reviews_space_id_fkey';
            columns: ['space_id'];
            isOneToOne: false;
            referencedRelation: 'spaces';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          item_id: string | null;
          kind: string;
          read_at: string | null;
          space_id: string | null;
          title: string;
          user_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          item_id?: string | null;
          kind: string;
          read_at?: string | null;
          space_id?: string | null;
          title: string;
          user_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          item_id?: string | null;
          kind?: string;
          read_at?: string | null;
          space_id?: string | null;
          title?: string;
          user_id?: string;
        };
        Relationships: [];
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
      push_tokens: {
        Row: {
          platform: string;
          token: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          platform?: string;
          token: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          platform?: string;
          token?: string;
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
          is_personal: boolean;
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
          is_personal?: boolean;
        };
        Relationships: [];
      };
      user_blocks: {
        Row: {
          blocked_id: string;
          blocker_id: string;
          created_at: string;
        };
        Insert: {
          blocked_id: string;
          blocker_id?: string;
          created_at?: string;
        };
        Update: {
          blocked_id?: string;
          blocker_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      apply_item_todo_ops: {
        Args: { p_item_id: string; p_ops: Json };
        Returns: undefined;
      };
      claim_push_token: {
        Args: { push_platform: string; push_token: string };
        Returns: undefined;
      };
      create_shared_list: {
        Args: { list_title: string; list_items: Json };
        Returns: string;
      };
      get_shared_list: {
        Args: { share_code: string };
        Returns: {
          title: string;
          items: Json;
          sender: string | null;
          created_at: string;
        }[];
      };
      create_space: {
        Args: { space_emoji: string; space_name: string; personal?: boolean };
        Returns: {
          created_at: string;
          created_by: string | null;
          emoji: string;
          id: string;
          image_path: string | null;
          invite_code: string;
          name: string;
          owner_id: string | null;
          is_personal: boolean;
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
          is_personal: boolean;
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
      set_space_personal: {
        Args: { target_space: string; personal: boolean };
        Returns: undefined;
      };
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
export type ItemReviewRow = Database['public']['Tables']['item_reviews']['Row'];
export type ItemCommentRow =
  Database['public']['Tables']['item_comments']['Row'];
export type ItemReactionRow =
  Database['public']['Tables']['item_reactions']['Row'];
export type CommentReactionRow =
  Database['public']['Tables']['comment_reactions']['Row'];
export type NotificationRow =
  Database['public']['Tables']['notifications']['Row'];
export type MemberProfile =
  Database['public']['Functions']['space_member_profiles']['Returns'][number];
