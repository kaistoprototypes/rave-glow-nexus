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
      ai_product_content: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          payload: Json
          product_id: string | null
          source_image_url: string | null
          status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          payload: Json
          product_id?: string | null
          source_image_url?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          payload?: Json
          product_id?: string | null
          source_image_url?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_product_content_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          kind: string
          name: string
          position: number
          slug: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          kind: string
          name: string
          position?: number
          slug: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          kind?: string
          name?: string
          position?: number
          slug?: string
          video_url?: string | null
        }
        Relationships: []
      }
      coupons: {
        Row: {
          active: boolean
          amount_off: number | null
          code: string
          created_at: string
          description: string | null
          expires_at: string | null
          id: string
          percent_off: number | null
          times_used: number
          usage_limit: number | null
        }
        Insert: {
          active?: boolean
          amount_off?: number | null
          code: string
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          percent_off?: number | null
          times_used?: number
          usage_limit?: number | null
        }
        Update: {
          active?: boolean
          amount_off?: number | null
          code?: string
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          percent_off?: number | null
          times_used?: number
          usage_limit?: number | null
        }
        Relationships: []
      }
      homepage_sections: {
        Row: {
          created_at: string
          data: Json
          enabled: boolean
          id: string
          position: number
          type: string
        }
        Insert: {
          created_at?: string
          data?: Json
          enabled?: boolean
          id?: string
          position?: number
          type: string
        }
        Update: {
          created_at?: string
          data?: Json
          enabled?: boolean
          id?: string
          position?: number
          type?: string
        }
        Relationships: []
      }
      media_assets: {
        Row: {
          alt: string | null
          created_at: string
          id: string
          kind: string
          metadata: Json | null
          uploaded_by: string | null
          url: string
        }
        Insert: {
          alt?: string | null
          created_at?: string
          id?: string
          kind: string
          metadata?: Json | null
          uploaded_by?: string | null
          url: string
        }
        Update: {
          alt?: string | null
          created_at?: string
          id?: string
          kind?: string
          metadata?: Json | null
          uploaded_by?: string | null
          url?: string
        }
        Relationships: []
      }
      notification_audit_logs: {
        Row: {
          action: string
          changed_keys: string[]
          created_at: string
          diff: Json
          id: string
          new_value: Json | null
          previous_value: Json | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action?: string
          changed_keys?: string[]
          created_at?: string
          diff?: Json
          id?: string
          new_value?: Json | null
          previous_value?: Json | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          changed_keys?: string[]
          created_at?: string
          diff?: Json
          id?: string
          new_value?: Json | null
          previous_value?: Json | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          name: string
          order_id: string
          product_id: string | null
          quantity: number
          subtotal: number
          unit_price: number
          variant: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          name: string
          order_id: string
          product_id?: string | null
          quantity?: number
          subtotal: number
          unit_price: number
          variant?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
          order_id?: string
          product_id?: string | null
          quantity?: number
          subtotal?: number
          unit_price?: number
          variant?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          coupon_code: string | null
          created_at: string
          currency: string
          discount: number
          email: string
          id: string
          notes: string | null
          shipping: number
          shipping_address: Json | null
          status: string
          stripe_customer_id: string | null
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          subtotal: number
          tax: number
          total: number
          tracking_number: string | null
          tracking_url: string | null
          updated_at: string
          user_id: string | null
          yoycol_order_id: string | null
          yoycol_status: string | null
        }
        Insert: {
          coupon_code?: string | null
          created_at?: string
          currency?: string
          discount?: number
          email: string
          id?: string
          notes?: string | null
          shipping?: number
          shipping_address?: Json | null
          status?: string
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          subtotal?: number
          tax?: number
          total?: number
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
          user_id?: string | null
          yoycol_order_id?: string | null
          yoycol_status?: string | null
        }
        Update: {
          coupon_code?: string | null
          created_at?: string
          currency?: string
          discount?: number
          email?: string
          id?: string
          notes?: string | null
          shipping?: number
          shipping_address?: Json | null
          status?: string
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          subtotal?: number
          tax?: number
          total?: number
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
          user_id?: string | null
          yoycol_order_id?: string | null
          yoycol_status?: string | null
        }
        Relationships: []
      }
      product_variants: {
        Row: {
          color: string | null
          created_at: string
          id: string
          inventory: number
          price: number | null
          product_id: string
          size: string | null
          sku: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          inventory?: number
          price?: number | null
          product_id: string
          size?: string | null
          sku?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          inventory?: number
          price?: number | null
          product_id?: string
          size?: string | null
          sku?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_slug: string | null
          collection_slug: string | null
          color_palette: string[]
          colors: string[]
          compare_at_price: number | null
          cost: number | null
          created_at: string
          design_story: string | null
          design_style: string | null
          featured_image: string | null
          gallery: string[]
          gender: string
          hide_colors: boolean
          id: string
          inventory: number
          is_best_seller: boolean
          is_featured: boolean
          is_new_drop: boolean
          long_description: string | null
          name: string
          price: number
          product_type: string
          seo_description: string | null
          seo_title: string | null
          short_description: string | null
          sizes: string[]
          sku: string | null
          slug: string
          sold_count: number
          status: string
          tags: string[]
          updated_at: string
          video_url: string | null
        }
        Insert: {
          category_slug?: string | null
          collection_slug?: string | null
          color_palette?: string[]
          colors?: string[]
          compare_at_price?: number | null
          cost?: number | null
          created_at?: string
          design_story?: string | null
          design_style?: string | null
          featured_image?: string | null
          gallery?: string[]
          gender: string
          hide_colors?: boolean
          id?: string
          inventory?: number
          is_best_seller?: boolean
          is_featured?: boolean
          is_new_drop?: boolean
          long_description?: string | null
          name: string
          price: number
          product_type: string
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          sizes?: string[]
          sku?: string | null
          slug: string
          sold_count?: number
          status?: string
          tags?: string[]
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          category_slug?: string | null
          collection_slug?: string | null
          color_palette?: string[]
          colors?: string[]
          compare_at_price?: number | null
          cost?: number | null
          created_at?: string
          design_story?: string | null
          design_style?: string | null
          featured_image?: string | null
          gallery?: string[]
          gender?: string
          hide_colors?: boolean
          id?: string
          inventory?: number
          is_best_seller?: boolean
          is_featured?: boolean
          is_new_drop?: boolean
          long_description?: string | null
          name?: string
          price?: number
          product_type?: string
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          sizes?: string[]
          sku?: string | null
          slug?: string
          sold_count?: number
          status?: string
          tags?: string[]
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          default_address: Json | null
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          stripe_customer_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_address?: Json | null
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_address?: Json | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      promotions: {
        Row: {
          created_at: string
          enabled: boolean
          ends_at: string
          flat_amount: number | null
          id: string
          kind: string
          name: string
          priority: number
          starts_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          ends_at: string
          flat_amount?: number | null
          id?: string
          kind: string
          name: string
          priority?: number
          starts_at: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          ends_at?: string
          flat_amount?: number | null
          id?: string
          kind?: string
          name?: string
          priority?: number
          starts_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          body: string | null
          created_at: string
          id: string
          product_id: string
          rating: number
          reviewer_name: string | null
          title: string | null
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          product_id: string
          rating: number
          reviewer_name?: string | null
          title?: string | null
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          product_id?: string
          rating?: number
          reviewer_name?: string | null
          title?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      signup_rewards: {
        Row: {
          code: string
          created_at: string
          expires_at: string | null
          id: string
          percent_off: number
          used_at: string | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          percent_off?: number
          used_at?: string | null
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          percent_off?: number
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      stripe_webhook_events: {
        Row: {
          created_at: string
          id: string
          payload: Json
          processed_at: string | null
          type: string
        }
        Insert: {
          created_at?: string
          id: string
          payload: Json
          processed_at?: string | null
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          type?: string
        }
        Relationships: []
      }
      user_carts: {
        Row: {
          items: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          items?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          items?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wishlists: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      yoycol_orders: {
        Row: {
          carrier: string | null
          created_at: string
          delivered_at: string | null
          id: string
          last_error: string | null
          order_id: string
          request_payload: Json | null
          response_payload: Json | null
          shipped_at: string | null
          status: string
          tracking_number: string | null
          tracking_url: string | null
          updated_at: string
          yoycol_order_id: string | null
          yoycol_order_no: string | null
        }
        Insert: {
          carrier?: string | null
          created_at?: string
          delivered_at?: string | null
          id?: string
          last_error?: string | null
          order_id: string
          request_payload?: Json | null
          response_payload?: Json | null
          shipped_at?: string | null
          status?: string
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
          yoycol_order_id?: string | null
          yoycol_order_no?: string | null
        }
        Update: {
          carrier?: string | null
          created_at?: string
          delivered_at?: string | null
          id?: string
          last_error?: string | null
          order_id?: string
          request_payload?: Json | null
          response_payload?: Json | null
          shipped_at?: string | null
          status?: string
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
          yoycol_order_id?: string | null
          yoycol_order_no?: string | null
        }
        Relationships: []
      }
      yoycol_product_mappings: {
        Row: {
          cover_image: string | null
          created_at: string
          id: string
          last_synced_at: string | null
          placements: Json
          product_id: string
          spu_code: string
          sync_direction: string
          template_name: string | null
          updated_at: string
          variant_map: Json
        }
        Insert: {
          cover_image?: string | null
          created_at?: string
          id?: string
          last_synced_at?: string | null
          placements?: Json
          product_id: string
          spu_code: string
          sync_direction?: string
          template_name?: string | null
          updated_at?: string
          variant_map?: Json
        }
        Update: {
          cover_image?: string | null
          created_at?: string
          id?: string
          last_synced_at?: string | null
          placements?: Json
          product_id?: string
          spu_code?: string
          sync_direction?: string
          template_name?: string | null
          updated_at?: string
          variant_map?: Json
        }
        Relationships: []
      }
      yoycol_webhook_events: {
        Row: {
          created_at: string
          error: string | null
          event_type: string | null
          external_id: string | null
          id: string
          payload: Json
          processed_at: string | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          event_type?: string | null
          external_id?: string | null
          id?: string
          payload: Json
          processed_at?: string | null
        }
        Update: {
          created_at?: string
          error?: string | null
          event_type?: string | null
          external_id?: string | null
          id?: string
          payload?: Json
          processed_at?: string | null
        }
        Relationships: []
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
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
