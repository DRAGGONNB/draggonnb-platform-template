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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      accommodation_access_pack_instances: {
        Row: {
          access_count: number | null
          accessible_from: string | null
          accessible_until: string | null
          booking_id: string
          created_at: string | null
          first_accessed_at: string | null
          id: string
          organization_id: string
          overrides: Json | null
          template_id: string
          token: string
        }
        Insert: {
          access_count?: number | null
          accessible_from?: string | null
          accessible_until?: string | null
          booking_id: string
          created_at?: string | null
          first_accessed_at?: string | null
          id?: string
          organization_id: string
          overrides?: Json | null
          template_id: string
          token?: string
        }
        Update: {
          access_count?: number | null
          accessible_from?: string | null
          accessible_until?: string | null
          booking_id?: string
          created_at?: string | null
          first_accessed_at?: string | null
          id?: string
          organization_id?: string
          overrides?: Json | null
          template_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_access_pack_instances_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "accommodation_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_access_pack_instances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_access_pack_instances_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "accommodation_access_pack_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_access_pack_templates: {
        Row: {
          check_in_instructions: string | null
          check_out_instructions: string | null
          created_at: string | null
          custom_sections: Json | null
          directions: string | null
          emergency_contacts: Json | null
          gate_code: string | null
          house_rules: string | null
          id: string
          organization_id: string
          property_id: string
          updated_at: string | null
          wifi_network: string | null
          wifi_password: string | null
        }
        Insert: {
          check_in_instructions?: string | null
          check_out_instructions?: string | null
          created_at?: string | null
          custom_sections?: Json | null
          directions?: string | null
          emergency_contacts?: Json | null
          gate_code?: string | null
          house_rules?: string | null
          id?: string
          organization_id: string
          property_id: string
          updated_at?: string | null
          wifi_network?: string | null
          wifi_password?: string | null
        }
        Update: {
          check_in_instructions?: string | null
          check_out_instructions?: string | null
          created_at?: string | null
          custom_sections?: Json | null
          directions?: string | null
          emergency_contacts?: Json | null
          gate_code?: string | null
          house_rules?: string | null
          id?: string
          organization_id?: string
          property_id?: string
          updated_at?: string | null
          wifi_network?: string | null
          wifi_password?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_access_pack_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_access_pack_templates_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "accommodation_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_addon_orders: {
        Row: {
          booking_id: string
          created_at: string | null
          guest_id: string | null
          id: string
          notes: string | null
          organization_id: string
          quantity: number
          requested_date: string | null
          requested_time: string | null
          service_id: string
          status: string
          total: number
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string | null
          guest_id?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          quantity?: number
          requested_date?: string | null
          requested_time?: string | null
          service_id: string
          status?: string
          total: number
          unit_price: number
          updated_at?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string | null
          guest_id?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          quantity?: number
          requested_date?: string | null
          requested_time?: string | null
          service_id?: string
          status?: string
          total?: number
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_addon_orders_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "accommodation_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_addon_orders_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "accommodation_guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_addon_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_addon_orders_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "accommodation_service_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_addons: {
        Row: {
          available_from: string | null
          available_to: string | null
          category: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          max_per_booking: number | null
          name: string
          organization_id: string
          price_basis: string
          price_per_unit: number
          property_id: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          available_from?: string | null
          available_to?: string | null
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_per_booking?: number | null
          name: string
          organization_id: string
          price_basis?: string
          price_per_unit: number
          property_id?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          available_from?: string | null
          available_to?: string | null
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_per_booking?: number | null
          name?: string
          organization_id?: string
          price_basis?: string
          price_per_unit?: number
          property_id?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_addons_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "accommodation_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_ai_configs: {
        Row: {
          agent_type: string
          config: Json | null
          created_at: string | null
          id: string
          is_enabled: boolean | null
          model_override: string | null
          organization_id: string
          system_prompt_override: string | null
          updated_at: string | null
        }
        Insert: {
          agent_type: string
          config?: Json | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          model_override?: string | null
          organization_id: string
          system_prompt_override?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_type?: string
          config?: Json | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          model_override?: string | null
          organization_id?: string
          system_prompt_override?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_ai_configs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_amenities: {
        Row: {
          category: string
          created_at: string | null
          icon: string | null
          id: string
          is_global: boolean | null
          name: string
          organization_id: string
        }
        Insert: {
          category?: string
          created_at?: string | null
          icon?: string | null
          id?: string
          is_global?: boolean | null
          name: string
          organization_id: string
        }
        Update: {
          category?: string
          created_at?: string | null
          icon?: string | null
          id?: string
          is_global?: boolean | null
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_amenities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_automation_rules: {
        Row: {
          channel: string
          conditions: Json | null
          created_at: string | null
          delay_minutes: number | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          template_id: string | null
          trigger_event: string
          updated_at: string | null
        }
        Insert: {
          channel: string
          conditions?: Json | null
          created_at?: string | null
          delay_minutes?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          template_id?: string | null
          trigger_event: string
          updated_at?: string | null
        }
        Update: {
          channel?: string
          conditions?: Json | null
          created_at?: string | null
          delay_minutes?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          template_id?: string | null
          trigger_event?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_automation_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_availability_blocks: {
        Row: {
          block_date: string
          block_type: string
          booking_id: string | null
          created_at: string | null
          id: string
          notes: string | null
          organization_id: string
          room_id: string | null
          unit_id: string
        }
        Insert: {
          block_date: string
          block_type?: string
          booking_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          room_id?: string | null
          unit_id: string
        }
        Update: {
          block_date?: string
          block_type?: string
          booking_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          room_id?: string | null
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_availability_blocks_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "accommodation_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_availability_blocks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_availability_blocks_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "accommodation_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_availability_blocks_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "accommodation_units"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_booking_addons: {
        Row: {
          addon_id: string
          booking_id: string
          created_at: string | null
          id: string
          payment_transaction_id: string | null
          quantity: number
          status: string
          total_price: number
          unit_price: number
        }
        Insert: {
          addon_id: string
          booking_id: string
          created_at?: string | null
          id?: string
          payment_transaction_id?: string | null
          quantity?: number
          status?: string
          total_price: number
          unit_price: number
        }
        Update: {
          addon_id?: string
          booking_id?: string
          created_at?: string | null
          id?: string
          payment_transaction_id?: string | null
          quantity?: number
          status?: string
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_booking_addons_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "accommodation_addons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_booking_addons_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "accommodation_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_booking_addons_payment_transaction_id_fkey"
            columns: ["payment_transaction_id"]
            isOneToOne: false
            referencedRelation: "accommodation_payment_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_booking_party: {
        Row: {
          age_from: number | null
          age_to: number | null
          booking_id: string
          count: number
          created_at: string | null
          guest_category: string
          id: string
          organization_id: string
          segment_id: string | null
        }
        Insert: {
          age_from?: number | null
          age_to?: number | null
          booking_id: string
          count?: number
          created_at?: string | null
          guest_category?: string
          id?: string
          organization_id: string
          segment_id?: string | null
        }
        Update: {
          age_from?: number | null
          age_to?: number | null
          booking_id?: string
          count?: number
          created_at?: string | null
          guest_category?: string
          id?: string
          organization_id?: string
          segment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_booking_party_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "accommodation_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_booking_party_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_booking_party_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "accommodation_booking_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_booking_segments: {
        Row: {
          booking_id: string
          check_in_date: string
          check_out_date: string
          created_at: string | null
          id: string
          organization_id: string
          property_id: string
          room_id: string | null
          segment_total: number | null
          sort_order: number | null
          unit_id: string | null
        }
        Insert: {
          booking_id: string
          check_in_date: string
          check_out_date: string
          created_at?: string | null
          id?: string
          organization_id: string
          property_id: string
          room_id?: string | null
          segment_total?: number | null
          sort_order?: number | null
          unit_id?: string | null
        }
        Update: {
          booking_id?: string
          check_in_date?: string
          check_out_date?: string
          created_at?: string | null
          id?: string
          organization_id?: string
          property_id?: string
          room_id?: string | null
          segment_total?: number | null
          sort_order?: number | null
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_booking_segments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "accommodation_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_booking_segments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_booking_segments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "accommodation_properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_booking_segments_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "accommodation_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_booking_segments_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "accommodation_units"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_bookings: {
        Row: {
          abandoned_at: string | null
          adults: number
          amount_paid: number | null
          balance_due: number | null
          booking_ref: string
          cancellation_policy_id: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          check_in_date: string
          check_out_date: string
          children: number | null
          confirmed_at: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          discount_code: string | null
          discount_total: number | null
          fee_total: number | null
          grand_total: number | null
          guest_id: string
          id: string
          infants: number | null
          internal_notes: string | null
          loyalty_discount_pct: number | null
          nights: number | null
          organization_id: string
          property_id: string
          rate_plan_id: string | null
          recovery_nudge_count: number | null
          recovery_nudge_sent_at: string | null
          source: string | null
          special_requests: string | null
          status: string
          subtotal: number | null
          tax_total: number | null
          total_guests: number
          updated_at: string | null
        }
        Insert: {
          abandoned_at?: string | null
          adults?: number
          amount_paid?: number | null
          balance_due?: number | null
          booking_ref: string
          cancellation_policy_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          check_in_date: string
          check_out_date: string
          children?: number | null
          confirmed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          discount_code?: string | null
          discount_total?: number | null
          fee_total?: number | null
          grand_total?: number | null
          guest_id: string
          id?: string
          infants?: number | null
          internal_notes?: string | null
          loyalty_discount_pct?: number | null
          nights?: number | null
          organization_id: string
          property_id: string
          rate_plan_id?: string | null
          recovery_nudge_count?: number | null
          recovery_nudge_sent_at?: string | null
          source?: string | null
          special_requests?: string | null
          status?: string
          subtotal?: number | null
          tax_total?: number | null
          total_guests?: number
          updated_at?: string | null
        }
        Update: {
          abandoned_at?: string | null
          adults?: number
          amount_paid?: number | null
          balance_due?: number | null
          booking_ref?: string
          cancellation_policy_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          check_in_date?: string
          check_out_date?: string
          children?: number | null
          confirmed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          discount_code?: string | null
          discount_total?: number | null
          fee_total?: number | null
          grand_total?: number | null
          guest_id?: string
          id?: string
          infants?: number | null
          internal_notes?: string | null
          loyalty_discount_pct?: number | null
          nights?: number | null
          organization_id?: string
          property_id?: string
          rate_plan_id?: string | null
          recovery_nudge_count?: number | null
          recovery_nudge_sent_at?: string | null
          source?: string | null
          special_requests?: string | null
          status?: string
          subtotal?: number | null
          tax_total?: number | null
          total_guests?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_bookings_cancellation_policy_id_fkey"
            columns: ["cancellation_policy_id"]
            isOneToOne: false
            referencedRelation: "accommodation_cancellation_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_bookings_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "accommodation_guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_bookings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_bookings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "accommodation_properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_bookings_rate_plan_id_fkey"
            columns: ["rate_plan_id"]
            isOneToOne: false
            referencedRelation: "accommodation_rate_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_calendar_blocks: {
        Row: {
          created_at: string | null
          end_date: string
          external_uid: string | null
          id: string
          notes: string | null
          organization_id: string
          property_id: string | null
          source: string
          start_date: string
          unit_id: string | null
        }
        Insert: {
          created_at?: string | null
          end_date: string
          external_uid?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          property_id?: string | null
          source?: string
          start_date: string
          unit_id?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string
          external_uid?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          property_id?: string | null
          source?: string
          start_date?: string
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_calendar_blocks_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "accommodation_properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_calendar_blocks_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "accommodation_units"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_cancellation_policies: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          no_show_charge_percentage: number | null
          organization_id: string
          property_id: string | null
          tiers: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          no_show_charge_percentage?: number | null
          organization_id: string
          property_id?: string | null
          tiers?: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          no_show_charge_percentage?: number | null
          organization_id?: string
          property_id?: string | null
          tiers?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_cancellation_policies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_cancellation_policies_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "accommodation_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_charge_line_items: {
        Row: {
          booking_id: string
          created_at: string | null
          description: string
          id: string
          line_type: string
          metadata: Json | null
          organization_id: string
          quantity: number | null
          segment_id: string | null
          total: number
          unit_price: number
        }
        Insert: {
          booking_id: string
          created_at?: string | null
          description: string
          id?: string
          line_type: string
          metadata?: Json | null
          organization_id: string
          quantity?: number | null
          segment_id?: string | null
          total?: number
          unit_price?: number
        }
        Update: {
          booking_id?: string
          created_at?: string | null
          description?: string
          id?: string
          line_type?: string
          metadata?: Json | null
          organization_id?: string
          quantity?: number | null
          segment_id?: string | null
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_charge_line_items_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "accommodation_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_charge_line_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_charge_line_items_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "accommodation_booking_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_checklist_instances: {
        Row: {
          assigned_to: string | null
          booking_id: string | null
          completed_at: string | null
          created_at: string | null
          id: string
          items_completed: Json | null
          notes: string | null
          organization_id: string
          room_id: string | null
          started_at: string | null
          status: string
          template_id: string
          unit_id: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          booking_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          items_completed?: Json | null
          notes?: string | null
          organization_id: string
          room_id?: string | null
          started_at?: string | null
          status?: string
          template_id: string
          unit_id: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          booking_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          items_completed?: Json | null
          notes?: string | null
          organization_id?: string
          room_id?: string | null
          started_at?: string | null
          status?: string
          template_id?: string
          unit_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_checklist_instances_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "accommodation_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_checklist_instances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_checklist_instances_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "accommodation_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_checklist_instances_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "accommodation_checklist_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_checklist_instances_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "accommodation_units"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_checklist_templates: {
        Row: {
          checklist_type: string
          created_at: string | null
          estimated_minutes: number | null
          id: string
          items: Json
          name: string
          organization_id: string
          property_id: string | null
          requires_photo: boolean | null
          status: string
          updated_at: string | null
        }
        Insert: {
          checklist_type?: string
          created_at?: string | null
          estimated_minutes?: number | null
          id?: string
          items?: Json
          name: string
          organization_id: string
          property_id?: string | null
          requires_photo?: boolean | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          checklist_type?: string
          created_at?: string | null
          estimated_minutes?: number | null
          id?: string
          items?: Json
          name?: string
          organization_id?: string
          property_id?: string | null
          requires_photo?: boolean | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_checklist_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_checklist_templates_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "accommodation_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_comms_log: {
        Row: {
          booking_id: string | null
          channel: string
          content_summary: string | null
          created_at: string | null
          direction: string | null
          external_id: string | null
          guest_id: string | null
          id: string
          message_type: string
          metadata: Json | null
          organization_id: string
          recipient: string | null
          status: string | null
        }
        Insert: {
          booking_id?: string | null
          channel: string
          content_summary?: string | null
          created_at?: string | null
          direction?: string | null
          external_id?: string | null
          guest_id?: string | null
          id?: string
          message_type: string
          metadata?: Json | null
          organization_id: string
          recipient?: string | null
          status?: string | null
        }
        Update: {
          booking_id?: string | null
          channel?: string
          content_summary?: string | null
          created_at?: string | null
          direction?: string | null
          external_id?: string | null
          guest_id?: string | null
          id?: string
          message_type?: string
          metadata?: Json | null
          organization_id?: string
          recipient?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_comms_log_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "accommodation_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_comms_log_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "accommodation_guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_comms_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_comms_timeline: {
        Row: {
          booking_id: string | null
          channel: string
          content: string | null
          created_at: string | null
          direction: string
          guest_id: string | null
          id: string
          metadata: Json | null
          organization_id: string
          sent_by: string | null
          subject: string | null
        }
        Insert: {
          booking_id?: string | null
          channel: string
          content?: string | null
          created_at?: string | null
          direction?: string
          guest_id?: string | null
          id?: string
          metadata?: Json | null
          organization_id: string
          sent_by?: string | null
          subject?: string | null
        }
        Update: {
          booking_id?: string | null
          channel?: string
          content?: string | null
          created_at?: string | null
          direction?: string
          guest_id?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string
          sent_by?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_comms_timeline_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "accommodation_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_comms_timeline_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "accommodation_guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_comms_timeline_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_cost_categories: {
        Row: {
          category_type: string
          created_at: string | null
          default_amount: number | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          unit_of_measure: string | null
          updated_at: string | null
        }
        Insert: {
          category_type: string
          created_at?: string | null
          default_amount?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          unit_of_measure?: string | null
          updated_at?: string | null
        }
        Update: {
          category_type?: string
          created_at?: string | null
          default_amount?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          unit_of_measure?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_cost_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_cost_defaults: {
        Row: {
          category_id: string
          created_at: string | null
          default_amount: number
          id: string
          organization_id: string
          property_type: string | null
          unit_type: string | null
        }
        Insert: {
          category_id: string
          created_at?: string | null
          default_amount: number
          id?: string
          organization_id: string
          property_type?: string | null
          unit_type?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string | null
          default_amount?: number
          id?: string
          organization_id?: string
          property_type?: string | null
          unit_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_cost_defaults_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "accommodation_cost_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_cost_defaults_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_deposit_policies: {
        Row: {
          created_at: string | null
          deposit_type: string
          due_days_before_arrival: number | null
          id: string
          is_default: boolean | null
          name: string
          organization_id: string
          property_id: string | null
          updated_at: string | null
          value: number
        }
        Insert: {
          created_at?: string | null
          deposit_type?: string
          due_days_before_arrival?: number | null
          id?: string
          is_default?: boolean | null
          name: string
          organization_id: string
          property_id?: string | null
          updated_at?: string | null
          value?: number
        }
        Update: {
          created_at?: string | null
          deposit_type?: string
          due_days_before_arrival?: number | null
          id?: string
          is_default?: boolean | null
          name?: string
          organization_id?: string
          property_id?: string | null
          updated_at?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_deposit_policies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_deposit_policies_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "accommodation_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_discounts: {
        Row: {
          created_at: string | null
          current_uses: number | null
          days_before_arrival: number | null
          discount_type: string
          id: string
          max_uses: number | null
          min_guests: number | null
          min_nights: number | null
          name: string
          organization_id: string
          promo_code: string | null
          property_id: string | null
          stackable: boolean | null
          status: string
          updated_at: string | null
          valid_from: string | null
          valid_to: string | null
          value: number
          value_type: string
        }
        Insert: {
          created_at?: string | null
          current_uses?: number | null
          days_before_arrival?: number | null
          discount_type: string
          id?: string
          max_uses?: number | null
          min_guests?: number | null
          min_nights?: number | null
          name: string
          organization_id: string
          promo_code?: string | null
          property_id?: string | null
          stackable?: boolean | null
          status?: string
          updated_at?: string | null
          valid_from?: string | null
          valid_to?: string | null
          value: number
          value_type?: string
        }
        Update: {
          created_at?: string | null
          current_uses?: number | null
          days_before_arrival?: number | null
          discount_type?: string
          id?: string
          max_uses?: number | null
          min_guests?: number | null
          min_nights?: number | null
          name?: string
          organization_id?: string
          promo_code?: string | null
          property_id?: string | null
          stackable?: boolean | null
          status?: string
          updated_at?: string | null
          valid_from?: string | null
          valid_to?: string | null
          value?: number
          value_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_discounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_discounts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "accommodation_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_email_templates: {
        Row: {
          body: string
          created_at: string | null
          id: string
          is_active: boolean | null
          organization_id: string
          property_id: string | null
          send_days_offset: number | null
          subject: string
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          organization_id: string
          property_id?: string | null
          send_days_offset?: number | null
          subject: string
          trigger_type: string
          updated_at?: string | null
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string
          property_id?: string | null
          send_days_offset?: number | null
          subject?: string
          trigger_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_email_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_email_templates_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "accommodation_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_fees: {
        Row: {
          amount: number
          applies_to: string | null
          created_at: string | null
          fee_type: string
          id: string
          is_mandatory: boolean | null
          is_taxable: boolean | null
          name: string
          organization_id: string
          property_id: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          amount?: number
          applies_to?: string | null
          created_at?: string | null
          fee_type?: string
          id?: string
          is_mandatory?: boolean | null
          is_taxable?: boolean | null
          name: string
          organization_id: string
          property_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          applies_to?: string | null
          created_at?: string | null
          fee_type?: string
          id?: string
          is_mandatory?: boolean | null
          is_taxable?: boolean | null
          name?: string
          organization_id?: string
          property_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_fees_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_fees_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "accommodation_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_financial_snapshots: {
        Row: {
          avg_daily_rate: number | null
          bookings_count: number | null
          created_at: string | null
          id: string
          metadata: Json | null
          occupancy_rate: number | null
          organization_id: string
          snapshot_date: string
          total_deposits_received: number | null
          total_outstanding: number | null
          total_revenue: number | null
        }
        Insert: {
          avg_daily_rate?: number | null
          bookings_count?: number | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          occupancy_rate?: number | null
          organization_id: string
          snapshot_date: string
          total_deposits_received?: number | null
          total_outstanding?: number | null
          total_revenue?: number | null
        }
        Update: {
          avg_daily_rate?: number | null
          bookings_count?: number | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          occupancy_rate?: number | null
          organization_id?: string
          snapshot_date?: string
          total_deposits_received?: number | null
          total_outstanding?: number | null
          total_revenue?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_financial_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_guest_preferences: {
        Row: {
          booking_id: string | null
          category: string
          created_at: string | null
          guest_id: string
          id: string
          preference: string
          source: string
        }
        Insert: {
          booking_id?: string | null
          category: string
          created_at?: string | null
          guest_id: string
          id?: string
          preference: string
          source?: string
        }
        Update: {
          booking_id?: string | null
          category?: string
          created_at?: string | null
          guest_id?: string
          id?: string
          preference?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_guest_preferences_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "accommodation_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_guest_preferences_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "accommodation_guests"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_guests: {
        Row: {
          created_at: string | null
          date_of_birth: string | null
          dietary: string[] | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          first_name: string
          id: string
          id_number: string | null
          id_type: string | null
          language: string | null
          last_name: string
          last_stay_date: string | null
          loyalty_tier: string | null
          nationality: string | null
          notes: string | null
          organization_id: string
          phone: string | null
          preferences: Json | null
          source: string | null
          tags: string[] | null
          total_spend: number | null
          total_spent: number | null
          total_stays: number | null
          updated_at: string | null
          vip_status: boolean | null
        }
        Insert: {
          created_at?: string | null
          date_of_birth?: string | null
          dietary?: string[] | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name: string
          id?: string
          id_number?: string | null
          id_type?: string | null
          language?: string | null
          last_name: string
          last_stay_date?: string | null
          loyalty_tier?: string | null
          nationality?: string | null
          notes?: string | null
          organization_id: string
          phone?: string | null
          preferences?: Json | null
          source?: string | null
          tags?: string[] | null
          total_spend?: number | null
          total_spent?: number | null
          total_stays?: number | null
          updated_at?: string | null
          vip_status?: boolean | null
        }
        Update: {
          created_at?: string | null
          date_of_birth?: string | null
          dietary?: string[] | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name?: string
          id?: string
          id_number?: string | null
          id_type?: string | null
          language?: string | null
          last_name?: string
          last_stay_date?: string | null
          loyalty_tier?: string | null
          nationality?: string | null
          notes?: string | null
          organization_id?: string
          phone?: string | null
          preferences?: Json | null
          source?: string | null
          tags?: string[] | null
          total_spend?: number | null
          total_spent?: number | null
          total_stays?: number | null
          updated_at?: string | null
          vip_status?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_guests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_images: {
        Row: {
          alt_text: string | null
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          is_primary: boolean | null
          organization_id: string
          sort_order: number | null
          url: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          is_primary?: boolean | null
          organization_id: string
          sort_order?: number | null
          url: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          is_primary?: boolean | null
          organization_id?: string
          sort_order?: number | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_images_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_inquiries: {
        Row: {
          add_ons: Json | null
          check_in_date: string | null
          check_out_date: string | null
          created_at: string | null
          created_by: string | null
          guest_email: string | null
          guest_id: string | null
          guest_name: string
          guest_phone: string | null
          guests_count: number | null
          id: string
          notes: string | null
          organization_id: string
          property_id: string | null
          quoted_price: number | null
          source: string | null
          special_requests: string | null
          stage: string
          unit_id: string | null
          updated_at: string | null
        }
        Insert: {
          add_ons?: Json | null
          check_in_date?: string | null
          check_out_date?: string | null
          created_at?: string | null
          created_by?: string | null
          guest_email?: string | null
          guest_id?: string | null
          guest_name: string
          guest_phone?: string | null
          guests_count?: number | null
          id?: string
          notes?: string | null
          organization_id: string
          property_id?: string | null
          quoted_price?: number | null
          source?: string | null
          special_requests?: string | null
          stage?: string
          unit_id?: string | null
          updated_at?: string | null
        }
        Update: {
          add_ons?: Json | null
          check_in_date?: string | null
          check_out_date?: string | null
          created_at?: string | null
          created_by?: string | null
          guest_email?: string | null
          guest_id?: string | null
          guest_name?: string
          guest_phone?: string | null
          guests_count?: number | null
          id?: string
          notes?: string | null
          organization_id?: string
          property_id?: string | null
          quoted_price?: number | null
          source?: string | null
          special_requests?: string | null
          stage?: string
          unit_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_inquiries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_inquiries_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "accommodation_guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_inquiries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_inquiries_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "accommodation_properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_inquiries_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "accommodation_units"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_invoices: {
        Row: {
          amount_paid: number | null
          balance_due: number | null
          booking_id: string
          created_at: string | null
          currency: string | null
          due_date: string | null
          grand_total: number
          id: string
          invoice_number: string
          invoice_type: string
          notes: string | null
          organization_id: string
          paid_at: string | null
          sent_at: string | null
          status: string
          subtotal: number
          tax_total: number | null
          updated_at: string | null
        }
        Insert: {
          amount_paid?: number | null
          balance_due?: number | null
          booking_id: string
          created_at?: string | null
          currency?: string | null
          due_date?: string | null
          grand_total?: number
          id?: string
          invoice_number: string
          invoice_type?: string
          notes?: string | null
          organization_id: string
          paid_at?: string | null
          sent_at?: string | null
          status?: string
          subtotal?: number
          tax_total?: number | null
          updated_at?: string | null
        }
        Update: {
          amount_paid?: number | null
          balance_due?: number | null
          booking_id?: string
          created_at?: string | null
          currency?: string | null
          due_date?: string | null
          grand_total?: number
          id?: string
          invoice_number?: string
          invoice_type?: string
          notes?: string | null
          organization_id?: string
          paid_at?: string | null
          sent_at?: string | null
          status?: string
          subtotal?: number
          tax_total?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_invoices_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "accommodation_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_issues: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          organization_id: string
          photos: string[] | null
          priority: string
          property_id: string
          reported_by: string | null
          resolution_notes: string | null
          resolved_at: string | null
          room_id: string | null
          sla_target_hours: number | null
          status: string
          title: string
          unit_id: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          organization_id: string
          photos?: string[] | null
          priority?: string
          property_id: string
          reported_by?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          room_id?: string | null
          sla_target_hours?: number | null
          status?: string
          title: string
          unit_id?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          organization_id?: string
          photos?: string[] | null
          priority?: string
          property_id?: string
          reported_by?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          room_id?: string | null
          sla_target_hours?: number | null
          status?: string
          title?: string
          unit_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_issues_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_issues_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "accommodation_properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_issues_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "accommodation_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_issues_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "accommodation_units"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_message_queue: {
        Row: {
          booking_id: string | null
          channel: string
          created_at: string | null
          error_message: string | null
          guest_id: string | null
          id: string
          organization_id: string
          recipient: string
          rule_id: string | null
          scheduled_for: string
          sent_at: string | null
          status: string | null
          template_data: Json
        }
        Insert: {
          booking_id?: string | null
          channel: string
          created_at?: string | null
          error_message?: string | null
          guest_id?: string | null
          id?: string
          organization_id: string
          recipient: string
          rule_id?: string | null
          scheduled_for: string
          sent_at?: string | null
          status?: string | null
          template_data?: Json
        }
        Update: {
          booking_id?: string | null
          channel?: string
          created_at?: string | null
          error_message?: string | null
          guest_id?: string | null
          id?: string
          organization_id?: string
          recipient?: string
          rule_id?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string | null
          template_data?: Json
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_message_queue_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "accommodation_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_message_queue_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "accommodation_guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_message_queue_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_message_queue_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "accommodation_automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_operator_payables: {
        Row: {
          created_at: string | null
          gross_amount: number
          id: string
          net_amount: number
          organization_id: string
          paid_at: string | null
          payout_reference: string | null
          platform_fee: number
          status: string
          transaction_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          gross_amount: number
          id?: string
          net_amount: number
          organization_id: string
          paid_at?: string | null
          payout_reference?: string | null
          platform_fee?: number
          status?: string
          transaction_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          gross_amount?: number
          id?: string
          net_amount?: number
          organization_id?: string
          paid_at?: string | null
          payout_reference?: string | null
          platform_fee?: number
          status?: string
          transaction_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_operator_payables_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_operator_payables_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "accommodation_payment_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_payment_allocations: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          line_item_id: string
          organization_id: string
          transaction_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          line_item_id: string
          organization_id: string
          transaction_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          line_item_id?: string
          organization_id?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_payment_allocations_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "accommodation_charge_line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_payment_allocations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_payment_allocations_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "accommodation_payment_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_payment_links: {
        Row: {
          amount: number
          booking_id: string | null
          created_at: string | null
          currency: string | null
          expires_at: string | null
          gateway: string | null
          gateway_reference: string | null
          id: string
          organization_id: string
          paid_at: string | null
          payment_type: string
          payment_url: string | null
          status: string | null
        }
        Insert: {
          amount: number
          booking_id?: string | null
          created_at?: string | null
          currency?: string | null
          expires_at?: string | null
          gateway?: string | null
          gateway_reference?: string | null
          id?: string
          organization_id: string
          paid_at?: string | null
          payment_type: string
          payment_url?: string | null
          status?: string | null
        }
        Update: {
          amount?: number
          booking_id?: string | null
          created_at?: string | null
          currency?: string | null
          expires_at?: string | null
          gateway?: string | null
          gateway_reference?: string | null
          id?: string
          organization_id?: string
          paid_at?: string | null
          payment_type?: string
          payment_url?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_payment_links_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "accommodation_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_payment_links_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_payment_provider_config: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          is_sandbox: boolean | null
          merchant_id: string | null
          merchant_key: string | null
          metadata: Json | null
          organization_id: string
          passphrase: string | null
          payment_mode: string
          provider: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_sandbox?: boolean | null
          merchant_id?: string | null
          merchant_key?: string | null
          metadata?: Json | null
          organization_id: string
          passphrase?: string | null
          payment_mode?: string
          provider?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_sandbox?: boolean | null
          merchant_id?: string | null
          merchant_key?: string | null
          metadata?: Json | null
          organization_id?: string
          passphrase?: string | null
          payment_mode?: string
          provider?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_payment_provider_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_payment_transactions: {
        Row: {
          amount: number
          booking_id: string
          completed_at: string | null
          created_at: string | null
          currency: string | null
          gateway: string
          gateway_reference: string | null
          id: string
          invoice_id: string | null
          metadata: Json | null
          organization_id: string
          payer_email: string | null
          payment_method: string | null
          payment_mode: string
          status: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          booking_id: string
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          gateway?: string
          gateway_reference?: string | null
          id?: string
          invoice_id?: string | null
          metadata?: Json | null
          organization_id: string
          payer_email?: string | null
          payment_method?: string | null
          payment_mode?: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          booking_id?: string
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          gateway?: string
          gateway_reference?: string | null
          id?: string
          invoice_id?: string | null
          metadata?: Json | null
          organization_id?: string
          payer_email?: string | null
          payment_method?: string | null
          payment_mode?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_payment_transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "accommodation_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_payment_transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "accommodation_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_payment_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_platform_fees: {
        Row: {
          calculated_amount: number
          created_at: string | null
          fee_type: string
          fixed_amount: number | null
          id: string
          organization_id: string
          percentage: number | null
          transaction_id: string
        }
        Insert: {
          calculated_amount: number
          created_at?: string | null
          fee_type: string
          fixed_amount?: number | null
          id?: string
          organization_id: string
          percentage?: number | null
          transaction_id: string
        }
        Update: {
          calculated_amount?: number
          created_at?: string | null
          fee_type?: string
          fixed_amount?: number | null
          id?: string
          organization_id?: string
          percentage?: number | null
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_platform_fees_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_platform_fees_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "accommodation_payment_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_pricing_suggestions: {
        Row: {
          current_multiplier: number | null
          decided_at: string | null
          decided_by: string | null
          id: string
          occupancy_pct: number | null
          organization_id: string
          property_id: string | null
          reasoning: string | null
          season_type: string
          status: string
          suggested_at: string | null
          suggested_multiplier: number
        }
        Insert: {
          current_multiplier?: number | null
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          occupancy_pct?: number | null
          organization_id: string
          property_id?: string | null
          reasoning?: string | null
          season_type: string
          status?: string
          suggested_at?: string | null
          suggested_multiplier: number
        }
        Update: {
          current_multiplier?: number | null
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          occupancy_pct?: number | null
          organization_id?: string
          property_id?: string | null
          reasoning?: string | null
          season_type?: string
          status?: string
          suggested_at?: string | null
          suggested_multiplier?: number
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_pricing_suggestions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "accommodation_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_properties: {
        Row: {
          address: string | null
          airbnb_id: string | null
          amenities: string[] | null
          booking_com_id: string | null
          check_in_time: string | null
          check_out_time: string | null
          city: string | null
          contact_email: string | null
          contact_phone: string | null
          country: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          organization_id: string
          policies: Json | null
          postal_code: string | null
          property_type_config: string | null
          province: string | null
          star_rating: number | null
          status: string
          timezone: string | null
          total_units: number | null
          type: string
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          airbnb_id?: string | null
          amenities?: string[] | null
          booking_com_id?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          organization_id: string
          policies?: Json | null
          postal_code?: string | null
          property_type_config?: string | null
          province?: string | null
          star_rating?: number | null
          status?: string
          timezone?: string | null
          total_units?: number | null
          type: string
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          airbnb_id?: string | null
          amenities?: string[] | null
          booking_com_id?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          organization_id?: string
          policies?: Json | null
          postal_code?: string | null
          property_type_config?: string | null
          province?: string | null
          star_rating?: number | null
          status?: string
          timezone?: string | null
          total_units?: number | null
          type?: string
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_properties_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_properties_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_property_config: {
        Row: {
          config_key: string
          config_value: Json
          created_at: string | null
          id: string
          organization_id: string
          property_id: string
          updated_at: string | null
        }
        Insert: {
          config_key: string
          config_value: Json
          created_at?: string | null
          id?: string
          organization_id: string
          property_id: string
          updated_at?: string | null
        }
        Update: {
          config_key?: string
          config_value?: Json
          created_at?: string | null
          id?: string
          organization_id?: string
          property_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_property_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_property_config_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "accommodation_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_rate_plan_prices: {
        Row: {
          created_at: string | null
          day_of_week: string | null
          guest_category: string
          id: string
          min_nights: number | null
          organization_id: string
          price: number
          rate_plan_id: string
          season: string | null
          unit_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          day_of_week?: string | null
          guest_category?: string
          id?: string
          min_nights?: number | null
          organization_id: string
          price?: number
          rate_plan_id: string
          season?: string | null
          unit_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          day_of_week?: string | null
          guest_category?: string
          id?: string
          min_nights?: number | null
          organization_id?: string
          price?: number
          rate_plan_id?: string
          season?: string | null
          unit_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_rate_plan_prices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_rate_plan_prices_rate_plan_id_fkey"
            columns: ["rate_plan_id"]
            isOneToOne: false
            referencedRelation: "accommodation_rate_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_rate_plan_prices_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "accommodation_units"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_rate_plans: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          description: string | null
          id: string
          is_default: boolean | null
          meal_plan: string | null
          multiplier: number | null
          name: string
          organization_id: string
          price_basis: string
          property_id: string
          season_type: string | null
          status: string
          updated_at: string | null
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          meal_plan?: string | null
          multiplier?: number | null
          name: string
          organization_id: string
          price_basis?: string
          property_id: string
          season_type?: string | null
          status?: string
          updated_at?: string | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          meal_plan?: string | null
          multiplier?: number | null
          name?: string
          organization_id?: string
          price_basis?: string
          property_id?: string
          season_type?: string | null
          status?: string
          updated_at?: string | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_rate_plans_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_rate_plans_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "accommodation_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_readiness_status: {
        Row: {
          assigned_to: string | null
          id: string
          last_status_change: string | null
          notes: string | null
          organization_id: string
          room_id: string | null
          status: string
          unit_id: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          id?: string
          last_status_change?: string | null
          notes?: string | null
          organization_id: string
          room_id?: string | null
          status?: string
          unit_id: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          id?: string
          last_status_change?: string | null
          notes?: string | null
          organization_id?: string
          room_id?: string | null
          status?: string
          unit_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_readiness_status_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_readiness_status_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "accommodation_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_readiness_status_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "accommodation_units"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_rooms: {
        Row: {
          amenities: string[] | null
          bed_config: string | null
          created_at: string | null
          description: string | null
          has_ensuite: boolean | null
          id: string
          max_guests: number
          name: string
          organization_id: string
          room_code: string | null
          room_type: string
          sort_order: number | null
          status: string
          unit_id: string
          updated_at: string | null
        }
        Insert: {
          amenities?: string[] | null
          bed_config?: string | null
          created_at?: string | null
          description?: string | null
          has_ensuite?: boolean | null
          id?: string
          max_guests?: number
          name: string
          organization_id: string
          room_code?: string | null
          room_type?: string
          sort_order?: number | null
          status?: string
          unit_id: string
          updated_at?: string | null
        }
        Update: {
          amenities?: string[] | null
          bed_config?: string | null
          created_at?: string | null
          description?: string | null
          has_ensuite?: boolean | null
          id?: string
          max_guests?: number
          name?: string
          organization_id?: string
          room_code?: string | null
          room_type?: string
          sort_order?: number | null
          status?: string
          unit_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_rooms_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_rooms_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "accommodation_units"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_service_catalog: {
        Row: {
          advance_hours: number | null
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean | null
          name: string
          organization_id: string
          price: number
          price_type: string | null
          property_id: string
          requires_advance_booking: boolean | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          advance_hours?: number | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          name: string
          organization_id: string
          price?: number
          price_type?: string | null
          property_id: string
          requires_advance_booking?: boolean | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          advance_hours?: number | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          name?: string
          organization_id?: string
          price?: number
          price_type?: string | null
          property_id?: string
          requires_advance_booking?: boolean | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_service_catalog_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_service_catalog_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "accommodation_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_staff: {
        Row: {
          created_at: string | null
          department: string | null
          email: string | null
          first_name: string
          id: string
          is_active: boolean | null
          last_name: string | null
          organization_id: string
          permissions: Json | null
          phone: string | null
          role: string | null
          shift_pattern: string | null
          telegram_chat_id: string | null
          telegram_username: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          email?: string | null
          first_name: string
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          organization_id: string
          permissions?: Json | null
          phone?: string | null
          role?: string | null
          shift_pattern?: string | null
          telegram_chat_id?: string | null
          telegram_username?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          department?: string | null
          email?: string | null
          first_name?: string
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          organization_id?: string
          permissions?: Json | null
          phone?: string | null
          role?: string | null
          shift_pattern?: string | null
          telegram_chat_id?: string | null
          telegram_username?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_staff_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_stock_items: {
        Row: {
          category: string
          created_at: string | null
          current_stock: number | null
          id: string
          is_active: boolean | null
          location: string | null
          min_stock_level: number | null
          name: string
          organization_id: string
          reorder_quantity: number | null
          sku: string | null
          supplier: string | null
          unit_cost: number | null
          unit_of_measure: string
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          current_stock?: number | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          min_stock_level?: number | null
          name: string
          organization_id: string
          reorder_quantity?: number | null
          sku?: string | null
          supplier?: string | null
          unit_cost?: number | null
          unit_of_measure: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          current_stock?: number | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          min_stock_level?: number | null
          name?: string
          organization_id?: string
          reorder_quantity?: number | null
          sku?: string | null
          supplier?: string | null
          unit_cost?: number | null
          unit_of_measure?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_stock_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_stock_movements: {
        Row: {
          booking_id: string | null
          created_at: string | null
          id: string
          movement_type: string
          notes: string | null
          organization_id: string
          quantity: number
          recorded_by: string | null
          reference: string | null
          stock_item_id: string
          unit_id: string | null
        }
        Insert: {
          booking_id?: string | null
          created_at?: string | null
          id?: string
          movement_type: string
          notes?: string | null
          organization_id: string
          quantity: number
          recorded_by?: string | null
          reference?: string | null
          stock_item_id: string
          unit_id?: string | null
        }
        Update: {
          booking_id?: string | null
          created_at?: string | null
          id?: string
          movement_type?: string
          notes?: string | null
          organization_id?: string
          quantity?: number
          recorded_by?: string | null
          reference?: string | null
          stock_item_id?: string
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_stock_movements_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "accommodation_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_stock_movements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_stock_movements_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "accommodation_stock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_stock_movements_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "accommodation_units"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_task_assignments: {
        Row: {
          accepted_at: string | null
          assigned_at: string | null
          assigned_by: string | null
          completed_at: string | null
          created_at: string | null
          id: string
          notes: string | null
          organization_id: string
          photo_urls: string[] | null
          staff_id: string | null
          started_at: string | null
          status: string | null
          task_id: string
          task_type: string
          telegram_message_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          photo_urls?: string[] | null
          staff_id?: string | null
          started_at?: string | null
          status?: string | null
          task_id: string
          task_type: string
          telegram_message_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          photo_urls?: string[] | null
          staff_id?: string | null
          started_at?: string | null
          status?: string | null
          task_id?: string
          task_type?: string
          telegram_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_task_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_task_assignments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "accommodation_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_tasks: {
        Row: {
          assigned_to: string | null
          booking_id: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          due_time: string | null
          id: string
          issue_id: string | null
          notes: string | null
          organization_id: string
          priority: string
          property_id: string
          room_id: string | null
          status: string
          task_type: string
          title: string
          unit_id: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          booking_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          issue_id?: string | null
          notes?: string | null
          organization_id: string
          priority?: string
          property_id: string
          room_id?: string | null
          status?: string
          task_type?: string
          title: string
          unit_id?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          booking_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          issue_id?: string | null
          notes?: string | null
          organization_id?: string
          priority?: string
          property_id?: string
          room_id?: string | null
          status?: string
          task_type?: string
          title?: string
          unit_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_tasks_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "accommodation_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_tasks_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "accommodation_issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_tasks_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "accommodation_properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_tasks_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "accommodation_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_tasks_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "accommodation_units"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_telegram_channels: {
        Row: {
          bot_token: string | null
          channel_name: string | null
          chat_id: string
          created_at: string | null
          department: string
          id: string
          is_active: boolean | null
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          bot_token?: string | null
          channel_name?: string | null
          chat_id: string
          created_at?: string | null
          department: string
          id?: string
          is_active?: boolean | null
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          bot_token?: string | null
          channel_name?: string | null
          chat_id?: string
          created_at?: string | null
          department?: string
          id?: string
          is_active?: boolean | null
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_telegram_channels_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_unit_amenities: {
        Row: {
          amenity_id: string
          id: string
          organization_id: string
          unit_id: string
        }
        Insert: {
          amenity_id: string
          id?: string
          organization_id: string
          unit_id: string
        }
        Update: {
          amenity_id?: string
          id?: string
          organization_id?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_unit_amenities_amenity_id_fkey"
            columns: ["amenity_id"]
            isOneToOne: false
            referencedRelation: "accommodation_amenities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_unit_amenities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_unit_amenities_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "accommodation_units"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_unit_costs: {
        Row: {
          amount: number
          booking_id: string | null
          category_id: string
          cost_date: string
          created_at: string | null
          id: string
          notes: string | null
          organization_id: string
          quantity: number | null
          recorded_by: string | null
          unit_id: string
        }
        Insert: {
          amount: number
          booking_id?: string | null
          category_id: string
          cost_date: string
          created_at?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          quantity?: number | null
          recorded_by?: string | null
          unit_id: string
        }
        Update: {
          amount?: number
          booking_id?: string | null
          category_id?: string
          cost_date?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          quantity?: number | null
          recorded_by?: string | null
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_unit_costs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "accommodation_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_unit_costs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "accommodation_cost_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_unit_costs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_unit_costs_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "accommodation_units"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_unit_profitability: {
        Row: {
          cost_breakdown: Json | null
          created_at: string | null
          gross_margin: number | null
          id: string
          margin_percentage: number | null
          occupancy_days: number | null
          occupancy_rate: number | null
          organization_id: string
          period_end: string
          period_start: string
          revenue_per_available_day: number | null
          total_costs: number | null
          total_days: number | null
          total_revenue: number | null
          unit_id: string
        }
        Insert: {
          cost_breakdown?: Json | null
          created_at?: string | null
          gross_margin?: number | null
          id?: string
          margin_percentage?: number | null
          occupancy_days?: number | null
          occupancy_rate?: number | null
          organization_id: string
          period_end: string
          period_start: string
          revenue_per_available_day?: number | null
          total_costs?: number | null
          total_days?: number | null
          total_revenue?: number | null
          unit_id: string
        }
        Update: {
          cost_breakdown?: Json | null
          created_at?: string | null
          gross_margin?: number | null
          id?: string
          margin_percentage?: number | null
          occupancy_days?: number | null
          occupancy_rate?: number | null
          organization_id?: string
          period_end?: string
          period_start?: string
          revenue_per_available_day?: number | null
          total_costs?: number | null
          total_days?: number | null
          total_revenue?: number | null
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_unit_profitability_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_unit_profitability_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "accommodation_units"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_units: {
        Row: {
          amenities: string[] | null
          base_price_per_night: number
          bathrooms: number | null
          bedrooms: number | null
          created_at: string | null
          description: string | null
          floor_level: number | null
          has_rooms: boolean | null
          id: string
          max_adults: number | null
          max_capacity: number | null
          max_children: number | null
          max_guests: number
          name: string
          organization_id: string
          property_id: string
          size_sqm: number | null
          sort_order: number | null
          status: string
          type: string
          unit_code: string | null
          updated_at: string | null
        }
        Insert: {
          amenities?: string[] | null
          base_price_per_night?: number
          bathrooms?: number | null
          bedrooms?: number | null
          created_at?: string | null
          description?: string | null
          floor_level?: number | null
          has_rooms?: boolean | null
          id?: string
          max_adults?: number | null
          max_capacity?: number | null
          max_children?: number | null
          max_guests?: number
          name: string
          organization_id: string
          property_id: string
          size_sqm?: number | null
          sort_order?: number | null
          status?: string
          type: string
          unit_code?: string | null
          updated_at?: string | null
        }
        Update: {
          amenities?: string[] | null
          base_price_per_night?: number
          bathrooms?: number | null
          bedrooms?: number | null
          created_at?: string | null
          description?: string | null
          floor_level?: number | null
          has_rooms?: boolean | null
          id?: string
          max_adults?: number | null
          max_capacity?: number | null
          max_children?: number | null
          max_guests?: number
          name?: string
          organization_id?: string
          property_id?: string
          size_sqm?: number | null
          sort_order?: number | null
          status?: string
          type?: string
          unit_code?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_units_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_units_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "accommodation_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_waiver_acceptances: {
        Row: {
          accepted_at: string
          booking_id: string
          guest_id: string
          id: string
          ip_address: string | null
          organization_id: string
          signature_data: string | null
          waiver_id: string
        }
        Insert: {
          accepted_at?: string
          booking_id: string
          guest_id: string
          id?: string
          ip_address?: string | null
          organization_id: string
          signature_data?: string | null
          waiver_id: string
        }
        Update: {
          accepted_at?: string
          booking_id?: string
          guest_id?: string
          id?: string
          ip_address?: string | null
          organization_id?: string
          signature_data?: string | null
          waiver_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_waiver_acceptances_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "accommodation_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_waiver_acceptances_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "accommodation_guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_waiver_acceptances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_waiver_acceptances_waiver_id_fkey"
            columns: ["waiver_id"]
            isOneToOne: false
            referencedRelation: "accommodation_waivers"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_waivers: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_required: boolean | null
          organization_id: string
          property_id: string
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          organization_id: string
          property_id: string
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          organization_id?: string
          property_id?: string
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_waivers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_waivers_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "accommodation_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      activities: {
        Row: {
          assigned_to: string | null
          completed: boolean | null
          contact_id: string | null
          created_at: string | null
          created_by: string | null
          deal_id: string | null
          description: string | null
          due_date: string | null
          id: string
          organization_id: string
          priority: string | null
          subject: string | null
          triggered_by_automation_id: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          completed?: boolean | null
          contact_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deal_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          organization_id: string
          priority?: string | null
          subject?: string | null
          triggered_by_automation_id?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          completed?: boolean | null
          contact_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deal_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          organization_id?: string
          priority?: string | null
          subject?: string | null
          triggered_by_automation_id?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_sessions: {
        Row: {
          agent_type: string
          cache_read_tokens: number | null
          cache_write_tokens: number | null
          cost_zar_cents: number | null
          created_at: string
          id: string
          input_tokens: number | null
          lead_id: string | null
          messages: Json
          model: string | null
          organization_id: string | null
          output_tokens: number | null
          result: Json | null
          status: string
          tokens_used: number
          updated_at: string
        }
        Insert: {
          agent_type: string
          cache_read_tokens?: number | null
          cache_write_tokens?: number | null
          cost_zar_cents?: number | null
          created_at?: string
          id?: string
          input_tokens?: number | null
          lead_id?: string | null
          messages?: Json
          model?: string | null
          organization_id?: string | null
          output_tokens?: number | null
          result?: Json | null
          status?: string
          tokens_used?: number
          updated_at?: string
        }
        Update: {
          agent_type?: string
          cache_read_tokens?: number | null
          cache_write_tokens?: number | null
          cost_zar_cents?: number | null
          created_at?: string
          id?: string
          input_tokens?: number | null
          lead_id?: string | null
          messages?: Json
          model?: string | null
          organization_id?: string | null
          output_tokens?: number | null
          result?: Json | null
          status?: string
          tokens_used?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_sessions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_sessions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "v_leads_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_content_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          include_emojis: boolean | null
          include_hashtags: boolean | null
          is_active: boolean | null
          is_template: boolean | null
          max_tokens: number | null
          model: string | null
          name: string
          optimize_for_platforms: string[] | null
          organization_id: string | null
          prompt_variables: Json | null
          system_prompt: string
          temperature: number | null
          template_category: string | null
          tone: string | null
          updated_at: string | null
          usage_count: number | null
          user_prompt_template: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          include_emojis?: boolean | null
          include_hashtags?: boolean | null
          is_active?: boolean | null
          is_template?: boolean | null
          max_tokens?: number | null
          model?: string | null
          name: string
          optimize_for_platforms?: string[] | null
          organization_id?: string | null
          prompt_variables?: Json | null
          system_prompt: string
          temperature?: number | null
          template_category?: string | null
          tone?: string | null
          updated_at?: string | null
          usage_count?: number | null
          user_prompt_template: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          include_emojis?: boolean | null
          include_hashtags?: boolean | null
          is_active?: boolean | null
          is_template?: boolean | null
          max_tokens?: number | null
          model?: string | null
          name?: string
          optimize_for_platforms?: string[] | null
          organization_id?: string | null
          prompt_variables?: Json | null
          system_prompt?: string
          temperature?: number | null
          template_category?: string | null
          tone?: string | null
          updated_at?: string | null
          usage_count?: number | null
          user_prompt_template?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_content_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_generation_logs: {
        Row: {
          cost: number | null
          created_at: string | null
          generated_by: string | null
          generated_content: string
          generated_variations: Json | null
          generation_time_ms: number | null
          id: string
          input_data: Json | null
          model: string
          organization_id: string
          post_id: string | null
          prompt_used: string
          template_id: string | null
          tokens_used: number | null
          user_feedback: string | null
          user_rating: number | null
          was_accepted: boolean | null
        }
        Insert: {
          cost?: number | null
          created_at?: string | null
          generated_by?: string | null
          generated_content: string
          generated_variations?: Json | null
          generation_time_ms?: number | null
          id?: string
          input_data?: Json | null
          model: string
          organization_id: string
          post_id?: string | null
          prompt_used: string
          template_id?: string | null
          tokens_used?: number | null
          user_feedback?: string | null
          user_rating?: number | null
          was_accepted?: boolean | null
        }
        Update: {
          cost?: number | null
          created_at?: string | null
          generated_by?: string | null
          generated_content?: string
          generated_variations?: Json | null
          generation_time_ms?: number | null
          id?: string
          input_data?: Json | null
          model?: string
          organization_id?: string
          post_id?: string | null
          prompt_used?: string
          template_id?: string | null
          tokens_used?: number | null
          user_feedback?: string | null
          user_rating?: number | null
          was_accepted?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_generation_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_generation_logs_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_generation_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "ai_content_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_ledger: {
        Row: {
          agent_session_id: string | null
          agent_type: string
          cache_read_tokens: number
          cache_write_tokens: number
          cost_zar_cents: number
          error: string | null
          id: string
          input_tokens: number
          model: string
          organization_id: string
          output_tokens: number
          recorded_at: string
          request_id: string | null
          was_retry: boolean
        }
        Insert: {
          agent_session_id?: string | null
          agent_type: string
          cache_read_tokens?: number
          cache_write_tokens?: number
          cost_zar_cents: number
          error?: string | null
          id?: string
          input_tokens?: number
          model: string
          organization_id: string
          output_tokens?: number
          recorded_at?: string
          request_id?: string | null
          was_retry?: boolean
        }
        Update: {
          agent_session_id?: string | null
          agent_type?: string
          cache_read_tokens?: number
          cache_write_tokens?: number
          cost_zar_cents?: number
          error?: string | null
          id?: string
          input_tokens?: number
          model?: string
          organization_id?: string
          output_tokens?: number
          recorded_at?: string
          request_id?: string | null
          was_retry?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_ledger_agent_session_id_fkey"
            columns: ["agent_session_id"]
            isOneToOne: false
            referencedRelation: "agent_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_ledger_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_snapshots: {
        Row: {
          avg_engagement_rate: number | null
          created_at: string | null
          id: string
          organization_id: string | null
          period_type: string | null
          platform_breakdown: Json | null
          snapshot_date: string | null
          top_performing_posts: Json | null
          total_engagement: number | null
          total_impressions: number | null
          total_posts: number | null
          total_reach: number | null
        }
        Insert: {
          avg_engagement_rate?: number | null
          created_at?: string | null
          id?: string
          organization_id?: string | null
          period_type?: string | null
          platform_breakdown?: Json | null
          snapshot_date?: string | null
          top_performing_posts?: Json | null
          total_engagement?: number | null
          total_impressions?: number | null
          total_posts?: number | null
          total_reach?: number | null
        }
        Update: {
          avg_engagement_rate?: number | null
          created_at?: string | null
          id?: string
          organization_id?: string | null
          period_type?: string | null
          platform_breakdown?: Json | null
          snapshot_date?: string | null
          top_performing_posts?: Json | null
          total_engagement?: number | null
          total_impressions?: number | null
          total_posts?: number | null
          total_reach?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          key_hash: string
          last_used_at: string | null
          name: string
          organization_id: string
          revoked_at: string | null
          scopes: string[] | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          key_hash: string
          last_used_at?: string | null
          name: string
          organization_id: string
          revoked_at?: string | null
          scopes?: string[] | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          key_hash?: string
          last_used_at?: string | null
          name?: string
          organization_id?: string
          revoked_at?: string | null
          scopes?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_actions: {
        Row: {
          action: string
          action_at: string | null
          approval_request_id: string
          approver_id: string
          comments: string | null
          created_at: string | null
          id: string
          suggested_changes: Json | null
        }
        Insert: {
          action: string
          action_at?: string | null
          approval_request_id: string
          approver_id: string
          comments?: string | null
          created_at?: string | null
          id?: string
          suggested_changes?: Json | null
        }
        Update: {
          action?: string
          action_at?: string | null
          approval_request_id?: string
          approver_id?: string
          comments?: string | null
          created_at?: string | null
          id?: string
          suggested_changes?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_actions_approval_request_id_fkey"
            columns: ["approval_request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_requests: {
        Row: {
          action_payload: Json | null
          action_type: string | null
          approval_rule_id: string | null
          assigned_approvers: string[] | null
          assigned_to: string[]
          created_at: string | null
          expires_at: string | null
          handler_run_count: number
          id: string
          notify_on_complete: Json | null
          organization_id: string
          post_id: string | null
          product: string | null
          proposed_to: string | null
          rejection_reason: string | null
          rejection_reason_code: string | null
          request_notes: string | null
          requested_at: string | null
          requested_by: string
          status: string | null
          target_org_id: string | null
          target_resource_id: string | null
          target_resource_type: string | null
          telegram_chat_id: number | null
          telegram_message_id: number | null
          updated_at: string | null
          urgency: string | null
        }
        Insert: {
          action_payload?: Json | null
          action_type?: string | null
          approval_rule_id?: string | null
          assigned_approvers?: string[] | null
          assigned_to: string[]
          created_at?: string | null
          expires_at?: string | null
          handler_run_count?: number
          id?: string
          notify_on_complete?: Json | null
          organization_id: string
          post_id?: string | null
          product?: string | null
          proposed_to?: string | null
          rejection_reason?: string | null
          rejection_reason_code?: string | null
          request_notes?: string | null
          requested_at?: string | null
          requested_by: string
          status?: string | null
          target_org_id?: string | null
          target_resource_id?: string | null
          target_resource_type?: string | null
          telegram_chat_id?: number | null
          telegram_message_id?: number | null
          updated_at?: string | null
          urgency?: string | null
        }
        Update: {
          action_payload?: Json | null
          action_type?: string | null
          approval_rule_id?: string | null
          assigned_approvers?: string[] | null
          assigned_to?: string[]
          created_at?: string | null
          expires_at?: string | null
          handler_run_count?: number
          id?: string
          notify_on_complete?: Json | null
          organization_id?: string
          post_id?: string | null
          product?: string | null
          proposed_to?: string | null
          rejection_reason?: string | null
          rejection_reason_code?: string | null
          request_notes?: string | null
          requested_at?: string | null
          requested_by?: string
          status?: string | null
          target_org_id?: string | null
          target_resource_id?: string | null
          target_resource_type?: string | null
          telegram_chat_id?: number | null
          telegram_message_id?: number | null
          updated_at?: string | null
          urgency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_requests_approval_rule_id_fkey"
            columns: ["approval_rule_id"]
            isOneToOne: false
            referencedRelation: "approval_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_rules: {
        Row: {
          applies_to_accounts: string[] | null
          applies_to_platforms: string[] | null
          auto_approve_after_hours: number | null
          content_value_threshold: number | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          required_approval_count: number | null
          required_approvers: string[] | null
          updated_at: string | null
        }
        Insert: {
          applies_to_accounts?: string[] | null
          applies_to_platforms?: string[] | null
          auto_approve_after_hours?: number | null
          content_value_threshold?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          required_approval_count?: number | null
          required_approvers?: string[] | null
          updated_at?: string | null
        }
        Update: {
          applies_to_accounts?: string[] | null
          applies_to_platforms?: string[] | null
          auto_approve_after_hours?: number | null
          content_value_threshold?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          required_approval_count?: number | null
          required_approvers?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      areas: {
        Row: {
          created_at: string | null
          description: string | null
          gps_boundary: Json | null
          id: string
          is_active: boolean | null
          name: string
          org_id: string
          province: string | null
          size_hectares: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          gps_boundary?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          org_id: string
          province?: string | null
          size_hectares?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          gps_boundary?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          org_id?: string
          province?: string | null
          size_hectares?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "areas_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_logs: {
        Row: {
          affected_entities: Json | null
          automation_rule_id: string | null
          error_message: string | null
          executed_at: string | null
          execution_status: string | null
          id: string
          organization_id: string
          trigger_data: Json | null
        }
        Insert: {
          affected_entities?: Json | null
          automation_rule_id?: string | null
          error_message?: string | null
          executed_at?: string | null
          execution_status?: string | null
          id?: string
          organization_id: string
          trigger_data?: Json | null
        }
        Update: {
          affected_entities?: Json | null
          automation_rule_id?: string | null
          error_message?: string | null
          executed_at?: string | null
          execution_status?: string | null
          id?: string
          organization_id?: string
          trigger_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_automation_rule_id_fkey"
            columns: ["automation_rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          actions: Json
          conditions: Json
          created_at: string | null
          created_by: string | null
          description: string | null
          execution_count: number | null
          id: string
          is_active: boolean | null
          is_template: boolean | null
          last_run_at: string | null
          last_run_status: string | null
          latenode_webhook_url: string | null
          latenode_workflow_id: string | null
          name: string
          organization_id: string
          template_category: string | null
          template_source_id: string | null
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          actions: Json
          conditions: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          execution_count?: number | null
          id?: string
          is_active?: boolean | null
          is_template?: boolean | null
          last_run_at?: string | null
          last_run_status?: string | null
          latenode_webhook_url?: string | null
          latenode_workflow_id?: string | null
          name: string
          organization_id: string
          template_category?: string | null
          template_source_id?: string | null
          trigger_type: string
          updated_at?: string | null
        }
        Update: {
          actions?: Json
          conditions?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          execution_count?: number | null
          id?: string
          is_active?: boolean | null
          is_template?: boolean | null
          last_run_at?: string | null
          last_run_status?: string | null
          latenode_webhook_url?: string | null
          latenode_workflow_id?: string | null
          name?: string
          organization_id?: string
          template_category?: string | null
          template_source_id?: string | null
          trigger_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_rules_template_source_id_fkey"
            columns: ["template_source_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_items: {
        Row: {
          added_by: string | null
          bill_id: string
          created_at: string | null
          id: string
          line_total: number | null
          menu_item_id: string | null
          modifier_notes: string | null
          name: string
          organization_id: string
          quantity: number
          unit_price: number
          void_reason: string | null
          voided: boolean | null
          voided_by: string | null
        }
        Insert: {
          added_by?: string | null
          bill_id: string
          created_at?: string | null
          id?: string
          line_total?: number | null
          menu_item_id?: string | null
          modifier_notes?: string | null
          name: string
          organization_id: string
          quantity?: number
          unit_price: number
          void_reason?: string | null
          voided?: boolean | null
          voided_by?: string | null
        }
        Update: {
          added_by?: string | null
          bill_id?: string
          created_at?: string | null
          id?: string
          line_total?: number | null
          menu_item_id?: string | null
          modifier_notes?: string | null
          name?: string
          organization_id?: string
          quantity?: number
          unit_price?: number
          void_reason?: string | null
          voided?: boolean | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bill_items_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "restaurant_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_items_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_items_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "restaurant_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_payers: {
        Row: {
          amount_due: number | null
          amount_paid: number | null
          bill_id: string
          display_name: string | null
          id: string
          organization_id: string
          paid_at: string | null
          payfast_token: string | null
          slot_number: number
          status: string | null
          tip_amount: number | null
          whatsapp_number: string | null
        }
        Insert: {
          amount_due?: number | null
          amount_paid?: number | null
          bill_id: string
          display_name?: string | null
          id?: string
          organization_id: string
          paid_at?: string | null
          payfast_token?: string | null
          slot_number: number
          status?: string | null
          tip_amount?: number | null
          whatsapp_number?: string | null
        }
        Update: {
          amount_due?: number | null
          amount_paid?: number | null
          bill_id?: string
          display_name?: string | null
          id?: string
          organization_id?: string
          paid_at?: string | null
          payfast_token?: string | null
          slot_number?: number
          status?: string | null
          tip_amount?: number | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bill_payers_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_payers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_payments: {
        Row: {
          amount: number
          bill_id: string
          created_at: string | null
          id: string
          itn_payload: Json | null
          organization_id: string
          payer_id: string | null
          payfast_ref: string | null
          payment_method: string | null
          tip: number | null
        }
        Insert: {
          amount: number
          bill_id: string
          created_at?: string | null
          id?: string
          itn_payload?: Json | null
          organization_id: string
          payer_id?: string | null
          payfast_ref?: string | null
          payment_method?: string | null
          tip?: number | null
        }
        Update: {
          amount?: number
          bill_id?: string
          created_at?: string | null
          id?: string
          itn_payload?: Json | null
          organization_id?: string
          payer_id?: string | null
          payfast_ref?: string | null
          payment_method?: string | null
          tip?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bill_payments_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_payments_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "bill_payers"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_addons_catalog: {
        Row: {
          billing_cycle: string
          created_at: string
          description: string | null
          display_name: string
          id: string
          is_active: boolean
          kind: string
          min_tier: string | null
          payfast_item_code: string | null
          price_zar_cents: number
          quantity_unit: string | null
          quantity_value: number | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          billing_cycle: string
          created_at?: string
          description?: string | null
          display_name: string
          id: string
          is_active?: boolean
          kind: string
          min_tier?: string | null
          payfast_item_code?: string | null
          price_zar_cents: number
          quantity_unit?: string | null
          quantity_value?: number | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean
          kind?: string
          min_tier?: string | null
          payfast_item_code?: string | null
          price_zar_cents?: number
          quantity_unit?: string | null
          quantity_value?: number | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_addons_catalog_min_tier_fkey"
            columns: ["min_tier"]
            isOneToOne: false
            referencedRelation: "billing_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_invoices: {
        Row: {
          amount_zar: number
          created_at: string | null
          due_date: string | null
          id: string
          invoice_number: string
          issued_at: string | null
          line_items: Json | null
          metadata: Json | null
          organization_id: string
          paid_at: string | null
          payfast_payment_id: string | null
          plan_id: string | null
          status: string
          tax_zar: number | null
          total_zar: number
          updated_at: string | null
        }
        Insert: {
          amount_zar: number
          created_at?: string | null
          due_date?: string | null
          id?: string
          invoice_number: string
          issued_at?: string | null
          line_items?: Json | null
          metadata?: Json | null
          organization_id: string
          paid_at?: string | null
          payfast_payment_id?: string | null
          plan_id?: string | null
          status?: string
          tax_zar?: number | null
          total_zar: number
          updated_at?: string | null
        }
        Update: {
          amount_zar?: number
          created_at?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string
          issued_at?: string | null
          line_items?: Json | null
          metadata?: Json | null
          organization_id?: string
          paid_at?: string | null
          payfast_payment_id?: string | null
          plan_id?: string | null
          status?: string
          tax_zar?: number | null
          total_zar?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_invoices_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "billing_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_plan_changes: {
        Row: {
          changed_by: string | null
          created_at: string | null
          effective_at: string | null
          from_plan_id: string | null
          id: string
          organization_id: string
          reason: string | null
          to_plan_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string | null
          effective_at?: string | null
          from_plan_id?: string | null
          id?: string
          organization_id: string
          reason?: string | null
          to_plan_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string | null
          effective_at?: string | null
          from_plan_id?: string | null
          id?: string
          organization_id?: string
          reason?: string | null
          to_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_plan_changes_from_plan_id_fkey"
            columns: ["from_plan_id"]
            isOneToOne: false
            referencedRelation: "billing_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_plan_changes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_plan_changes_to_plan_id_fkey"
            columns: ["to_plan_id"]
            isOneToOne: false
            referencedRelation: "billing_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_plans: {
        Row: {
          created_at: string | null
          description: string | null
          display_name: string
          features: Json
          frequency: string
          id: string
          is_active: boolean | null
          limits: Json
          payfast_item_code: string | null
          price_zar: number
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_name: string
          features?: Json
          frequency?: string
          id: string
          is_active?: boolean | null
          limits?: Json
          payfast_item_code?: string | null
          price_zar: number
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_name?: string
          features?: Json
          frequency?: string
          id?: string
          is_active?: boolean | null
          limits?: Json
          payfast_item_code?: string | null
          price_zar?: number
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      bills: {
        Row: {
          created_at: string | null
          currency: string | null
          id: string
          organization_id: string
          payfast_m_payment_id: string | null
          restaurant_id: string
          service_charge: number | null
          service_charge_pct: number | null
          session_id: string
          status: string
          subtotal: number | null
          tip_total: number | null
          total: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          id?: string
          organization_id: string
          payfast_m_payment_id?: string | null
          restaurant_id: string
          service_charge?: number | null
          service_charge_pct?: number | null
          session_id: string
          status?: string
          subtotal?: number | null
          tip_total?: number | null
          total?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          id?: string
          organization_id?: string
          payfast_m_payment_id?: string | null
          restaurant_id?: string
          service_charge?: number | null
          service_charge_pct?: number | null
          session_id?: string
          status?: string
          subtotal?: number | null
          tip_total?: number | null
          total?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bills_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "table_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      call_logs: {
        Row: {
          ai_summary: string | null
          call_duration: number | null
          call_notes: string | null
          call_outcome: string | null
          call_type: string | null
          contact_id: string | null
          created_at: string | null
          deal_id: string | null
          follow_up_date: string | null
          follow_up_required: boolean | null
          id: string
          organization_id: string | null
          recording_url: string | null
          transcription: string | null
          user_id: string | null
        }
        Insert: {
          ai_summary?: string | null
          call_duration?: number | null
          call_notes?: string | null
          call_outcome?: string | null
          call_type?: string | null
          contact_id?: string | null
          created_at?: string | null
          deal_id?: string | null
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          id?: string
          organization_id?: string | null
          recording_url?: string | null
          transcription?: string | null
          user_id?: string | null
        }
        Update: {
          ai_summary?: string | null
          call_duration?: number | null
          call_notes?: string | null
          call_outcome?: string | null
          call_type?: string | null
          contact_id?: string | null
          created_at?: string | null
          deal_id?: string | null
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          id?: string
          organization_id?: string | null
          recording_url?: string | null
          transcription?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_analytics: {
        Row: {
          avg_engagement_rate: number | null
          campaign_id: string
          conversion_rate: number | null
          created_at: string | null
          id: string
          period_end: string
          period_start: string
          revenue: number | null
          roi: number | null
          spend: number | null
          total_clicks: number | null
          total_conversions: number | null
          total_engagement: number | null
          total_impressions: number | null
          total_posts: number | null
          total_reach: number | null
        }
        Insert: {
          avg_engagement_rate?: number | null
          campaign_id: string
          conversion_rate?: number | null
          created_at?: string | null
          id?: string
          period_end: string
          period_start: string
          revenue?: number | null
          roi?: number | null
          spend?: number | null
          total_clicks?: number | null
          total_conversions?: number | null
          total_engagement?: number | null
          total_impressions?: number | null
          total_posts?: number | null
          total_reach?: number | null
        }
        Update: {
          avg_engagement_rate?: number | null
          campaign_id?: string
          conversion_rate?: number | null
          created_at?: string | null
          id?: string
          period_end?: string
          period_start?: string
          revenue?: number | null
          roi?: number | null
          spend?: number | null
          total_clicks?: number | null
          total_conversions?: number | null
          total_engagement?: number | null
          total_impressions?: number | null
          total_posts?: number | null
          total_reach?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_analytics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_drafts: {
        Row: {
          agent_session_id: string | null
          approved_at: string | null
          body_html: string | null
          body_text: string | null
          brand_safe: boolean | null
          campaign_id: string
          channel: Database["public"]["Enums"]["campaign_channel"]
          created_at: string
          id: string
          is_approved: boolean
          media_urls: string[]
          organization_id: string
          regeneration_count: number
          safety_flags: string[]
          subject: string | null
          updated_at: string
        }
        Insert: {
          agent_session_id?: string | null
          approved_at?: string | null
          body_html?: string | null
          body_text?: string | null
          brand_safe?: boolean | null
          campaign_id: string
          channel: Database["public"]["Enums"]["campaign_channel"]
          created_at?: string
          id?: string
          is_approved?: boolean
          media_urls?: string[]
          organization_id: string
          regeneration_count?: number
          safety_flags?: string[]
          subject?: string | null
          updated_at?: string
        }
        Update: {
          agent_session_id?: string | null
          approved_at?: string | null
          body_html?: string | null
          body_text?: string | null
          brand_safe?: boolean | null
          campaign_id?: string
          channel?: Database["public"]["Enums"]["campaign_channel"]
          created_at?: string
          id?: string
          is_approved?: boolean
          media_urls?: string[]
          organization_id?: string
          regeneration_count?: number
          safety_flags?: string[]
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_drafts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_drafts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_posts: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          campaign_id: string | null
          channel_id: string | null
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          media_urls: string[] | null
          metadata: Json | null
          published_at: string | null
          scheduled_for: string | null
          status: Database["public"]["Enums"]["post_status"] | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          campaign_id?: string | null
          channel_id?: string | null
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          media_urls?: string[] | null
          metadata?: Json | null
          published_at?: string | null
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["post_status"] | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          campaign_id?: string | null
          channel_id?: string | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          media_urls?: string[] | null
          metadata?: Json | null
          published_at?: string | null
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["post_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_posts_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "marketing_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_run_items: {
        Row: {
          campaign_draft_id: string | null
          channel: Database["public"]["Enums"]["campaign_channel"]
          created_at: string
          error_code: string | null
          error_message: string | null
          id: string
          provider_message_id: string | null
          published_url: string | null
          recipient_ref: string | null
          run_id: string
          sent_at: string | null
          status: Database["public"]["Enums"]["run_item_status"]
          verified_at: string | null
        }
        Insert: {
          campaign_draft_id?: string | null
          channel: Database["public"]["Enums"]["campaign_channel"]
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          provider_message_id?: string | null
          published_url?: string | null
          recipient_ref?: string | null
          run_id: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["run_item_status"]
          verified_at?: string | null
        }
        Update: {
          campaign_draft_id?: string | null
          channel?: Database["public"]["Enums"]["campaign_channel"]
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          provider_message_id?: string | null
          published_url?: string | null
          recipient_ref?: string | null
          run_id?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["run_item_status"]
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_run_items_campaign_draft_id_fkey"
            columns: ["campaign_draft_id"]
            isOneToOne: false
            referencedRelation: "campaign_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_run_items_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "campaign_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_runs: {
        Row: {
          campaign_id: string
          completed_at: string | null
          created_at: string
          cron_job_name: string | null
          error_message: string | null
          id: string
          items_failed: number
          items_sent: number
          items_total: number
          organization_id: string
          scheduled_at: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["run_status"]
        }
        Insert: {
          campaign_id: string
          completed_at?: string | null
          created_at?: string
          cron_job_name?: string | null
          error_message?: string | null
          id?: string
          items_failed?: number
          items_sent?: number
          items_total?: number
          organization_id: string
          scheduled_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["run_status"]
        }
        Update: {
          campaign_id?: string
          completed_at?: string | null
          created_at?: string
          cron_job_name?: string | null
          error_message?: string | null
          id?: string
          items_failed?: number
          items_sent?: number
          items_total?: number
          organization_id?: string
          scheduled_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["run_status"]
        }
        Relationships: [
          {
            foreignKeyName: "campaign_runs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          channels: Database["public"]["Enums"]["campaign_channel"][]
          created_at: string
          created_by: string | null
          force_review: boolean
          id: string
          intent: string
          name: string
          organization_id: string
          published_at: string | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["campaign_status"]
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          channels?: Database["public"]["Enums"]["campaign_channel"][]
          created_at?: string
          created_by?: string | null
          force_review?: boolean
          id?: string
          intent: string
          name: string
          organization_id: string
          published_at?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          channels?: Database["public"]["Enums"]["campaign_channel"][]
          created_at?: string
          created_by?: string | null
          force_review?: boolean
          id?: string
          intent?: string
          name?: string
          organization_id?: string
          published_at?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_completions: {
        Row: {
          checklist_id: string
          completed_at: string | null
          completed_by: string | null
          completion_date: string
          id: string
          items_completed: Json
          organization_id: string
          restaurant_id: string
        }
        Insert: {
          checklist_id: string
          completed_at?: string | null
          completed_by?: string | null
          completion_date: string
          id?: string
          items_completed?: Json
          organization_id: string
          restaurant_id: string
        }
        Update: {
          checklist_id?: string
          completed_at?: string | null
          completed_by?: string | null
          completion_date?: string
          id?: string
          items_completed?: Json
          organization_id?: string
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_completions_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_completions_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "restaurant_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_completions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_completions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      checklists: {
        Row: {
          checklist_type: string
          created_at: string | null
          frequency: string | null
          id: string
          is_active: boolean | null
          items: Json
          name: string
          organization_id: string
          restaurant_id: string
        }
        Insert: {
          checklist_type: string
          created_at?: string | null
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          items?: Json
          name: string
          organization_id: string
          restaurant_id: string
        }
        Update: {
          checklist_type?: string
          created_at?: string | null
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          items?: Json
          name?: string
          organization_id?: string
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklists_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklists_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      client_health_metrics: {
        Row: {
          active_users_count: number | null
          automations_active: number | null
          calculated_at: string | null
          churn_risk: string | null
          contacts_count: number | null
          created_at: string | null
          feature_adoption_rate: number | null
          health_score: number | null
          id: string
          last_login_date: string | null
          mrr: number | null
          organization_id: string
          payment_status: string | null
          risk_factors: string[] | null
          support_tickets_count: number | null
        }
        Insert: {
          active_users_count?: number | null
          automations_active?: number | null
          calculated_at?: string | null
          churn_risk?: string | null
          contacts_count?: number | null
          created_at?: string | null
          feature_adoption_rate?: number | null
          health_score?: number | null
          id?: string
          last_login_date?: string | null
          mrr?: number | null
          organization_id: string
          payment_status?: string | null
          risk_factors?: string[] | null
          support_tickets_count?: number | null
        }
        Update: {
          active_users_count?: number | null
          automations_active?: number | null
          calculated_at?: string | null
          churn_risk?: string | null
          contacts_count?: number | null
          created_at?: string | null
          feature_adoption_rate?: number | null
          health_score?: number | null
          id?: string
          last_login_date?: string | null
          mrr?: number | null
          organization_id?: string
          payment_status?: string | null
          risk_factors?: string[] | null
          support_tickets_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "client_health_metrics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_profiles: {
        Row: {
          auto_generate_day: string | null
          autopilot_enabled: boolean | null
          brand_do: string[] | null
          brand_dont: string[] | null
          brand_values: string[] | null
          brand_voice_prompt: string | null
          brand_voice_updated_at: string | null
          business_description: string | null
          business_name: string
          company_size: string | null
          competitor_names: string[] | null
          content_pillars: string[] | null
          created_at: string | null
          email_campaigns_per_week: number | null
          email_send_day: string | null
          email_send_time: string | null
          example_phrases: string[]
          forbidden_topics: string[]
          id: string
          industry: string
          last_calendar_generated_at: string | null
          last_calendar_week: string | null
          location: string | null
          organization_id: string
          posting_frequency: Json | null
          preferred_email_goals: string[] | null
          preferred_platforms: string[] | null
          preferred_post_times: Json | null
          seo_keywords: string[] | null
          sub_industry: string | null
          tagline: string | null
          target_market: string
          timezone: string | null
          tone: string
          unique_selling_points: string[] | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          auto_generate_day?: string | null
          autopilot_enabled?: boolean | null
          brand_do?: string[] | null
          brand_dont?: string[] | null
          brand_values?: string[] | null
          brand_voice_prompt?: string | null
          brand_voice_updated_at?: string | null
          business_description?: string | null
          business_name: string
          company_size?: string | null
          competitor_names?: string[] | null
          content_pillars?: string[] | null
          created_at?: string | null
          email_campaigns_per_week?: number | null
          email_send_day?: string | null
          email_send_time?: string | null
          example_phrases?: string[]
          forbidden_topics?: string[]
          id?: string
          industry: string
          last_calendar_generated_at?: string | null
          last_calendar_week?: string | null
          location?: string | null
          organization_id: string
          posting_frequency?: Json | null
          preferred_email_goals?: string[] | null
          preferred_platforms?: string[] | null
          preferred_post_times?: Json | null
          seo_keywords?: string[] | null
          sub_industry?: string | null
          tagline?: string | null
          target_market: string
          timezone?: string | null
          tone?: string
          unique_selling_points?: string[] | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          auto_generate_day?: string | null
          autopilot_enabled?: boolean | null
          brand_do?: string[] | null
          brand_dont?: string[] | null
          brand_values?: string[] | null
          brand_voice_prompt?: string | null
          brand_voice_updated_at?: string | null
          business_description?: string | null
          business_name?: string
          company_size?: string | null
          competitor_names?: string[] | null
          content_pillars?: string[] | null
          created_at?: string | null
          email_campaigns_per_week?: number | null
          email_send_day?: string | null
          email_send_time?: string | null
          example_phrases?: string[]
          forbidden_topics?: string[]
          id?: string
          industry?: string
          last_calendar_generated_at?: string | null
          last_calendar_week?: string | null
          location?: string | null
          organization_id?: string
          posting_frequency?: Json | null
          preferred_email_goals?: string[] | null
          preferred_platforms?: string[] | null
          preferred_post_times?: Json | null
          seo_keywords?: string[] | null
          sub_industry?: string | null
          tagline?: string | null
          target_market?: string
          timezone?: string | null
          tone?: string
          unique_selling_points?: string[] | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_subscriptions: {
        Row: {
          contract_terms: string | null
          created_at: string | null
          custom_features: Json | null
          end_date: string | null
          id: string
          monthly_price: number
          next_billing_date: string | null
          organization_id: string
          package_id: string | null
          start_date: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          contract_terms?: string | null
          created_at?: string | null
          custom_features?: Json | null
          end_date?: string | null
          id?: string
          monthly_price: number
          next_billing_date?: string | null
          organization_id: string
          package_id?: string | null
          start_date: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          contract_terms?: string | null
          created_at?: string | null
          custom_features?: Json | null
          end_date?: string | null
          id?: string
          monthly_price?: number
          next_billing_date?: string | null
          organization_id?: string
          package_id?: string | null
          start_date?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_subscriptions_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "service_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          company_name: string | null
          created_at: string | null
          email: string
          id: string
          name: string
          phone: string | null
          service_types: string[] | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          company_name?: string | null
          created_at?: string | null
          email: string
          id?: string
          name: string
          phone?: string | null
          service_types?: string[] | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          company_name?: string | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          phone?: string | null
          service_types?: string[] | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      cold_room_entries: {
        Row: {
          condition_on_entry: string | null
          condition_on_exit: string | null
          created_at: string | null
          entered_at: string | null
          entry_type: string
          exited_at: string | null
          exited_to: string | null
          handled_by: string | null
          id: string
          location: string | null
          notes: string | null
          org_id: string
          temperature_zone: string | null
          trophy_id: string | null
          weight_kg: number | null
        }
        Insert: {
          condition_on_entry?: string | null
          condition_on_exit?: string | null
          created_at?: string | null
          entered_at?: string | null
          entry_type: string
          exited_at?: string | null
          exited_to?: string | null
          handled_by?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          org_id: string
          temperature_zone?: string | null
          trophy_id?: string | null
          weight_kg?: number | null
        }
        Update: {
          condition_on_entry?: string | null
          condition_on_exit?: string | null
          created_at?: string | null
          entered_at?: string | null
          entry_type?: string
          exited_at?: string | null
          exited_to?: string | null
          handled_by?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          org_id?: string
          temperature_zone?: string | null
          trophy_id?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cold_room_entries_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cold_room_entries_trophy_id_fkey"
            columns: ["trophy_id"]
            isOneToOne: false
            referencedRelation: "trophies"
            referencedColumns: ["id"]
          },
        ]
      }
      communications: {
        Row: {
          attachments: Json | null
          body: string | null
          channel: string
          clicked_at: string | null
          contact_id: string | null
          created_at: string | null
          created_by: string | null
          deal_id: string | null
          direction: string
          email_cc: string[] | null
          email_from: string | null
          email_message_id: string | null
          email_to: string[] | null
          id: string
          opened_at: string | null
          organization_id: string
          replied_at: string | null
          social_message_id: string | null
          social_platform: string | null
          social_post_url: string | null
          status: string | null
          subject: string | null
        }
        Insert: {
          attachments?: Json | null
          body?: string | null
          channel: string
          clicked_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deal_id?: string | null
          direction: string
          email_cc?: string[] | null
          email_from?: string | null
          email_message_id?: string | null
          email_to?: string[] | null
          id?: string
          opened_at?: string | null
          organization_id: string
          replied_at?: string | null
          social_message_id?: string | null
          social_platform?: string | null
          social_post_url?: string | null
          status?: string | null
          subject?: string | null
        }
        Update: {
          attachments?: Json | null
          body?: string | null
          channel?: string
          clicked_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deal_id?: string | null
          direction?: string
          email_cc?: string[] | null
          email_from?: string | null
          email_message_id?: string | null
          email_to?: string[] | null
          id?: string
          opened_at?: string | null
          organization_id?: string
          replied_at?: string | null
          social_message_id?: string | null
          social_platform?: string | null
          social_post_url?: string | null
          status?: string | null
          subject?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          address: string | null
          created_at: string | null
          domain: string | null
          id: string
          industry: string | null
          name: string
          notes: string | null
          organization_id: string
          phone: string | null
          size: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          domain?: string | null
          id?: string
          industry?: string | null
          name: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          size?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          domain?: string | null
          id?: string
          industry?: string | null
          name?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          size?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_accounts: {
        Row: {
          account_handle: string
          account_url: string | null
          avg_engagement_rate: number | null
          competitor_name: string
          created_at: string | null
          followers_count: number | null
          id: string
          is_active: boolean | null
          last_scraped_at: string | null
          notes: string | null
          organization_id: string
          platform_id: string
          posting_frequency: number | null
          updated_at: string | null
        }
        Insert: {
          account_handle: string
          account_url?: string | null
          avg_engagement_rate?: number | null
          competitor_name: string
          created_at?: string | null
          followers_count?: number | null
          id?: string
          is_active?: boolean | null
          last_scraped_at?: string | null
          notes?: string | null
          organization_id: string
          platform_id: string
          posting_frequency?: number | null
          updated_at?: string | null
        }
        Update: {
          account_handle?: string
          account_url?: string | null
          avg_engagement_rate?: number | null
          competitor_name?: string
          created_at?: string | null
          followers_count?: number | null
          id?: string
          is_active?: boolean | null
          last_scraped_at?: string | null
          notes?: string | null
          organization_id?: string
          platform_id?: string
          posting_frequency?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competitor_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitor_accounts_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "social_platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          address: string | null
          address_line1: string | null
          address_line2: string | null
          assigned_to: string | null
          city: string | null
          company: string | null
          contact_type: string | null
          country: string | null
          created_at: string | null
          created_by: string | null
          custom_fields: Json | null
          email: string | null
          first_name: string | null
          id: string
          job_title: string | null
          last_name: string | null
          lead_score: number | null
          lead_source: string | null
          lifecycle_stage: string | null
          linked_organization_id: string | null
          name: string | null
          notes: string | null
          organization_id: string
          phone: string | null
          postal_code: string | null
          preferences: Json | null
          state: string | null
          status: string | null
          tags: string[] | null
          updated_at: string | null
          whatsapp_number: string | null
        }
        Insert: {
          address?: string | null
          address_line1?: string | null
          address_line2?: string | null
          assigned_to?: string | null
          city?: string | null
          company?: string | null
          contact_type?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_fields?: Json | null
          email?: string | null
          first_name?: string | null
          id?: string
          job_title?: string | null
          last_name?: string | null
          lead_score?: number | null
          lead_source?: string | null
          lifecycle_stage?: string | null
          linked_organization_id?: string | null
          name?: string | null
          notes?: string | null
          organization_id: string
          phone?: string | null
          postal_code?: string | null
          preferences?: Json | null
          state?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          address?: string | null
          address_line1?: string | null
          address_line2?: string | null
          assigned_to?: string | null
          city?: string | null
          company?: string | null
          contact_type?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_fields?: Json | null
          email?: string | null
          first_name?: string | null
          id?: string
          job_title?: string | null
          last_name?: string | null
          lead_score?: number | null
          lead_source?: string | null
          lifecycle_stage?: string | null
          linked_organization_id?: string | null
          name?: string | null
          notes?: string | null
          organization_id?: string
          phone?: string | null
          postal_code?: string | null
          preferences?: Json | null
          state?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_linked_organization_id_fkey"
            columns: ["linked_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      content_generation_requests: {
        Row: {
          created_at: string | null
          error_message: string | null
          generated_content: Json | null
          generation_time_ms: number | null
          id: string
          organization_id: string | null
          platform_ids: string[]
          post_id: string | null
          prompt: string
          selected_variation_id: string | null
          status: string | null
          template_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          generated_content?: Json | null
          generation_time_ms?: number | null
          id?: string
          organization_id?: string | null
          platform_ids: string[]
          post_id?: string | null
          prompt: string
          selected_variation_id?: string | null
          status?: string | null
          template_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          generated_content?: Json | null
          generation_time_ms?: number | null
          id?: string
          organization_id?: string | null
          platform_ids?: string[]
          post_id?: string | null
          prompt?: string
          selected_variation_id?: string | null
          status?: string | null
          template_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_generation_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_generation_requests_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_generation_requests_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "ai_content_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      content_ideas: {
        Row: {
          category: string | null
          content_type: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          generated_by_ai: boolean | null
          generation_prompt: string | null
          id: string
          organization_id: string
          status: string | null
          suggested_platforms: string[] | null
          suggested_publish_date: string | null
          title: string
          updated_at: string | null
          used_in_post_id: string | null
          user_rating: number | null
        }
        Insert: {
          category?: string | null
          content_type?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          generated_by_ai?: boolean | null
          generation_prompt?: string | null
          id?: string
          organization_id: string
          status?: string | null
          suggested_platforms?: string[] | null
          suggested_publish_date?: string | null
          title: string
          updated_at?: string | null
          used_in_post_id?: string | null
          user_rating?: number | null
        }
        Update: {
          category?: string | null
          content_type?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          generated_by_ai?: boolean | null
          generation_prompt?: string | null
          id?: string
          organization_id?: string
          status?: string | null
          suggested_platforms?: string[] | null
          suggested_publish_date?: string | null
          title?: string
          updated_at?: string | null
          used_in_post_id?: string | null
          user_rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "content_ideas_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_ideas_used_in_post_id_fkey"
            columns: ["used_in_post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      content_queue: {
        Row: {
          attempts: number | null
          created_at: string | null
          error_message: string | null
          id: string
          last_attempt_at: string | null
          max_retries: number | null
          next_retry_at: string | null
          organization_id: string
          platform_post_id: string | null
          platform_response: Json | null
          post_id: string
          priority: number | null
          published_at: string | null
          retry_delay_minutes: number | null
          scheduled_for: string
          social_account_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          last_attempt_at?: string | null
          max_retries?: number | null
          next_retry_at?: string | null
          organization_id: string
          platform_post_id?: string | null
          platform_response?: Json | null
          post_id: string
          priority?: number | null
          published_at?: string | null
          retry_delay_minutes?: number | null
          scheduled_for: string
          social_account_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          last_attempt_at?: string | null
          max_retries?: number | null
          next_retry_at?: string | null
          organization_id?: string
          platform_post_id?: string | null
          platform_response?: Json | null
          post_id?: string
          priority?: number | null
          published_at?: string | null
          retry_delay_minutes?: number | null
          scheduled_for?: string
          social_account_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_queue_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_queue_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_queue_social_account_id_fkey"
            columns: ["social_account_id"]
            isOneToOne: false
            referencedRelation: "social_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_summaries: {
        Row: {
          action_items: Json | null
          contact_id: string | null
          conversation_type: string | null
          created_at: string | null
          created_by: string | null
          deal_id: string | null
          generated_by: string | null
          id: string
          key_points: string[] | null
          next_steps: string | null
          sentiment: string | null
          summary: string
        }
        Insert: {
          action_items?: Json | null
          contact_id?: string | null
          conversation_type?: string | null
          created_at?: string | null
          created_by?: string | null
          deal_id?: string | null
          generated_by?: string | null
          id?: string
          key_points?: string[] | null
          next_steps?: string | null
          sentiment?: string | null
          summary: string
        }
        Update: {
          action_items?: Json | null
          contact_id?: string | null
          conversation_type?: string | null
          created_at?: string | null
          created_by?: string | null
          deal_id?: string | null
          generated_by?: string | null
          id?: string
          key_points?: string[] | null
          next_steps?: string | null
          sentiment?: string | null
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_summaries_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_summaries_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          client_id: string | null
          created_at: string | null
          id: string
          messages: Json | null
          service_type: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          id?: string
          messages?: Json | null
          service_type: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          id?: string
          messages?: Json | null
          service_type?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_ledger: {
        Row: {
          amount: number
          balance_after: number
          created_at: string | null
          description: string | null
          id: string
          metric: string
          organization_id: string
          purchase_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string | null
          description?: string | null
          id?: string
          metric: string
          organization_id: string
          purchase_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string | null
          description?: string | null
          id?: string
          metric?: string
          organization_id?: string
          purchase_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_ledger_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_ledger_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "credit_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_pack_catalog: {
        Row: {
          created_at: string | null
          credit_amount: number
          description: string | null
          display_name: string
          id: string
          is_active: boolean | null
          metric: string
          min_tier: string | null
          price_zar: number
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          credit_amount: number
          description?: string | null
          display_name: string
          id: string
          is_active?: boolean | null
          metric: string
          min_tier?: string | null
          price_zar: number
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          credit_amount?: number
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          metric?: string
          min_tier?: string | null
          price_zar?: number
          sort_order?: number | null
        }
        Relationships: []
      }
      credit_purchases: {
        Row: {
          credits_purchased: number
          credits_remaining: number
          depleted_at: string | null
          expires_at: string | null
          id: string
          metric: string
          organization_id: string
          pack_id: string
          payfast_payment_id: string | null
          price_zar: number
          purchased_at: string | null
          status: string
        }
        Insert: {
          credits_purchased: number
          credits_remaining: number
          depleted_at?: string | null
          expires_at?: string | null
          id?: string
          metric: string
          organization_id: string
          pack_id: string
          payfast_payment_id?: string | null
          price_zar: number
          purchased_at?: string | null
          status?: string
        }
        Update: {
          credits_purchased?: number
          credits_remaining?: number
          depleted_at?: string | null
          expires_at?: string | null
          id?: string
          metric?: string
          organization_id?: string
          pack_id?: string
          payfast_payment_id?: string | null
          price_zar?: number
          purchased_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_purchases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_purchases_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "credit_pack_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_action_dismissals: {
        Row: {
          dismissed_at: string
          entity_id: string
          entity_type: string | null
          expires_at: string
          id: string
          organization_id: string
          suggestion_card_type: string
          user_id: string
        }
        Insert: {
          dismissed_at?: string
          entity_id: string
          entity_type?: string | null
          expires_at?: string
          id?: string
          organization_id: string
          suggestion_card_type: string
          user_id: string
        }
        Update: {
          dismissed_at?: string
          entity_id?: string
          entity_type?: string | null
          expires_at?: string
          id?: string
          organization_id?: string
          suggestion_card_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_action_dismissals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_action_suggestions: {
        Row: {
          card_type: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          n8n_run_id: string | null
          organization_id: string
          refreshed_at: string
          score: number
          score_breakdown: Json
          updated_at: string
        }
        Insert: {
          card_type: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          n8n_run_id?: string | null
          organization_id: string
          refreshed_at?: string
          score?: number
          score_breakdown?: Json
          updated_at?: string
        }
        Update: {
          card_type?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          n8n_run_id?: string | null
          organization_id?: string
          refreshed_at?: string
          score?: number
          score_breakdown?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_action_suggestions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_activities: {
        Row: {
          action_type: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          metadata: Json
          organization_id: string
          source: string
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json
          organization_id: string
          source?: string
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json
          organization_id?: string
          source?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_activities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_metrics_daily: {
        Row: {
          calls_made: number | null
          converted_leads: number | null
          created_at: string | null
          deals_lost: number | null
          deals_won: number | null
          emails_sent: number | null
          id: string
          meetings_held: number | null
          metric_date: string
          new_deals: number | null
          new_leads: number | null
          organization_id: string
          pipeline_value: number | null
          qualified_leads: number | null
          social_interactions: number | null
          total_deal_value: number | null
          weighted_pipeline: number | null
          won_deal_value: number | null
        }
        Insert: {
          calls_made?: number | null
          converted_leads?: number | null
          created_at?: string | null
          deals_lost?: number | null
          deals_won?: number | null
          emails_sent?: number | null
          id?: string
          meetings_held?: number | null
          metric_date: string
          new_deals?: number | null
          new_leads?: number | null
          organization_id: string
          pipeline_value?: number | null
          qualified_leads?: number | null
          social_interactions?: number | null
          total_deal_value?: number | null
          weighted_pipeline?: number | null
          won_deal_value?: number | null
        }
        Update: {
          calls_made?: number | null
          converted_leads?: number | null
          created_at?: string | null
          deals_lost?: number | null
          deals_won?: number | null
          emails_sent?: number | null
          id?: string
          meetings_held?: number | null
          metric_date?: string
          new_deals?: number | null
          new_leads?: number | null
          organization_id?: string
          pipeline_value?: number | null
          qualified_leads?: number | null
          social_interactions?: number | null
          total_deal_value?: number | null
          weighted_pipeline?: number | null
          won_deal_value?: number | null
        }
        Relationships: []
      }
      cross_product_org_links: {
        Row: {
          created_at: string
          draggonnb_org_id: string
          id: string
          status: string
          trophy_org_id: string
        }
        Insert: {
          created_at?: string
          draggonnb_org_id: string
          id?: string
          status?: string
          trophy_org_id: string
        }
        Update: {
          created_at?: string
          draggonnb_org_id?: string
          id?: string
          status?: string
          trophy_org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cross_product_org_links_draggonnb_org_id_fkey"
            columns: ["draggonnb_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_product_org_links_trophy_org_id_fkey"
            columns: ["trophy_org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_contacts: {
        Row: {
          created_at: string | null
          customer_id: string | null
          email: string | null
          id: string
          is_primary: boolean | null
          name: string
          notes: string | null
          phone: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name: string
          notes?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name?: string
          notes?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_contacts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_contacts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_activity"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_notes: {
        Row: {
          created_at: string | null
          customer_id: string | null
          id: string
          note: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          id?: string
          note: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          id?: string
          note?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_activity"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          assigned_to: string | null
          company: string | null
          created_at: string | null
          created_by: string | null
          custom_fields: Json | null
          email: string | null
          id: string
          name: string
          organization_id: string | null
          phone: string | null
          status: Database["public"]["Enums"]["customer_status"] | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          assigned_to?: string | null
          company?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_fields?: Json | null
          email?: string | null
          id?: string
          name: string
          organization_id?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["customer_status"] | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          assigned_to?: string | null
          company?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_fields?: Json | null
          email?: string | null
          id?: string
          name?: string
          organization_id?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["customer_status"] | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_cost_rollup: {
        Row: {
          call_count: number
          failed_call_count: number
          id: string
          organization_id: string
          rolled_up_at: string
          rollup_date: string
          total_cache_read_tokens: number
          total_cache_write_tokens: number
          total_cost_zar_cents: number
          total_input_tokens: number
          total_output_tokens: number
        }
        Insert: {
          call_count?: number
          failed_call_count?: number
          id?: string
          organization_id: string
          rolled_up_at?: string
          rollup_date: string
          total_cache_read_tokens?: number
          total_cache_write_tokens?: number
          total_cost_zar_cents?: number
          total_input_tokens?: number
          total_output_tokens?: number
        }
        Update: {
          call_count?: number
          failed_call_count?: number
          id?: string
          organization_id?: string
          rolled_up_at?: string
          rollup_date?: string
          total_cache_read_tokens?: number
          total_cache_write_tokens?: number
          total_cost_zar_cents?: number
          total_input_tokens?: number
          total_output_tokens?: number
        }
        Relationships: [
          {
            foreignKeyName: "daily_cost_rollup_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      data_sync_logs: {
        Row: {
          completed_at: string | null
          entity_type: string
          error_details: Json | null
          id: string
          metadata: Json | null
          organization_id: string
          records_failed: number | null
          records_processed: number | null
          records_success: number | null
          started_at: string | null
          status: string
          sync_type: string
          triggered_by: string | null
        }
        Insert: {
          completed_at?: string | null
          entity_type: string
          error_details?: Json | null
          id?: string
          metadata?: Json | null
          organization_id: string
          records_failed?: number | null
          records_processed?: number | null
          records_success?: number | null
          started_at?: string | null
          status?: string
          sync_type: string
          triggered_by?: string | null
        }
        Update: {
          completed_at?: string | null
          entity_type?: string
          error_details?: Json | null
          id?: string
          metadata?: Json | null
          organization_id?: string
          records_failed?: number | null
          records_processed?: number | null
          records_success?: number | null
          started_at?: string | null
          status?: string
          sync_type?: string
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_sync_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dbe_agent_conversations: {
        Row: {
          agent_type: string | null
          client_id: string | null
          conversation_context: Json | null
          created_at: string | null
          escalated: boolean | null
          escalation_reason: string | null
          id: string
          lead_id: string | null
          messages: Json | null
          metadata: Json | null
          resolution_summary: string | null
          sentiment: string | null
          updated_at: string | null
        }
        Insert: {
          agent_type?: string | null
          client_id?: string | null
          conversation_context?: Json | null
          created_at?: string | null
          escalated?: boolean | null
          escalation_reason?: string | null
          id?: string
          lead_id?: string | null
          messages?: Json | null
          metadata?: Json | null
          resolution_summary?: string | null
          sentiment?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_type?: string | null
          client_id?: string | null
          conversation_context?: Json | null
          created_at?: string | null
          escalated?: boolean | null
          escalation_reason?: string | null
          id?: string
          lead_id?: string | null
          messages?: Json | null
          metadata?: Json | null
          resolution_summary?: string | null
          sentiment?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dbe_agent_conversations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "dbe_client_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dbe_agent_conversations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "dbe_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dbe_agent_conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "dbe_lead_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dbe_agent_conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "dbe_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      dbe_billing_subscriptions: {
        Row: {
          cancel_at: string | null
          cancelled_at: string | null
          client_id: string | null
          created_at: string | null
          currency: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          last_payment_date: string | null
          metadata: Json | null
          monthly_amount: number
          next_payment_date: string | null
          payment_method: Json | null
          status: string | null
          subscription_tier: Database["public"]["Enums"]["dbe_subscription_tier"]
          trial_end: string | null
          updated_at: string | null
          yoco_customer_id: string | null
          yoco_subscription_id: string | null
        }
        Insert: {
          cancel_at?: string | null
          cancelled_at?: string | null
          client_id?: string | null
          created_at?: string | null
          currency?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          last_payment_date?: string | null
          metadata?: Json | null
          monthly_amount: number
          next_payment_date?: string | null
          payment_method?: Json | null
          status?: string | null
          subscription_tier: Database["public"]["Enums"]["dbe_subscription_tier"]
          trial_end?: string | null
          updated_at?: string | null
          yoco_customer_id?: string | null
          yoco_subscription_id?: string | null
        }
        Update: {
          cancel_at?: string | null
          cancelled_at?: string | null
          client_id?: string | null
          created_at?: string | null
          currency?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          last_payment_date?: string | null
          metadata?: Json | null
          monthly_amount?: number
          next_payment_date?: string | null
          payment_method?: Json | null
          status?: string | null
          subscription_tier?: Database["public"]["Enums"]["dbe_subscription_tier"]
          trial_end?: string | null
          updated_at?: string | null
          yoco_customer_id?: string | null
          yoco_subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dbe_billing_subscriptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "dbe_client_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dbe_billing_subscriptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "dbe_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      dbe_clients: {
        Row: {
          business_name: string
          contact_person: string | null
          created_at: string | null
          email: string
          github_repo_url: string | null
          id: string
          industry: string | null
          lead_id: string | null
          metadata: Json | null
          n8n_agent_id: string | null
          onboarded_at: string | null
          org_id: string
          phone: string | null
          status: Database["public"]["Enums"]["dbe_client_status"] | null
          subscription_tier:
            | Database["public"]["Enums"]["dbe_subscription_tier"]
            | null
          supabase_project_id: string | null
          trial_ends_at: string | null
          updated_at: string | null
          vercel_deployment_url: string | null
          website: string | null
        }
        Insert: {
          business_name: string
          contact_person?: string | null
          created_at?: string | null
          email: string
          github_repo_url?: string | null
          id?: string
          industry?: string | null
          lead_id?: string | null
          metadata?: Json | null
          n8n_agent_id?: string | null
          onboarded_at?: string | null
          org_id: string
          phone?: string | null
          status?: Database["public"]["Enums"]["dbe_client_status"] | null
          subscription_tier?:
            | Database["public"]["Enums"]["dbe_subscription_tier"]
            | null
          supabase_project_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          vercel_deployment_url?: string | null
          website?: string | null
        }
        Update: {
          business_name?: string
          contact_person?: string | null
          created_at?: string | null
          email?: string
          github_repo_url?: string | null
          id?: string
          industry?: string | null
          lead_id?: string | null
          metadata?: Json | null
          n8n_agent_id?: string | null
          onboarded_at?: string | null
          org_id?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["dbe_client_status"] | null
          subscription_tier?:
            | Database["public"]["Enums"]["dbe_subscription_tier"]
            | null
          supabase_project_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          vercel_deployment_url?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dbe_clients_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "dbe_lead_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dbe_clients_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "dbe_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      dbe_human_escalations: {
        Row: {
          ai_suggested_solution: string | null
          assigned_to: string | null
          category: string | null
          client_id: string | null
          conversation_id: string | null
          created_at: string | null
          description: string
          id: string
          lead_id: string | null
          metadata: Json | null
          priority:
            | Database["public"]["Enums"]["dbe_escalation_priority"]
            | null
          resolution_notes: string | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["dbe_escalation_status"] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          ai_suggested_solution?: string | null
          assigned_to?: string | null
          category?: string | null
          client_id?: string | null
          conversation_id?: string | null
          created_at?: string | null
          description: string
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          priority?:
            | Database["public"]["Enums"]["dbe_escalation_priority"]
            | null
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["dbe_escalation_status"] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          ai_suggested_solution?: string | null
          assigned_to?: string | null
          category?: string | null
          client_id?: string | null
          conversation_id?: string | null
          created_at?: string | null
          description?: string
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          priority?:
            | Database["public"]["Enums"]["dbe_escalation_priority"]
            | null
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["dbe_escalation_status"] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dbe_human_escalations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "dbe_client_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dbe_human_escalations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "dbe_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dbe_human_escalations_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "dbe_agent_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dbe_human_escalations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "dbe_lead_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dbe_human_escalations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "dbe_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      dbe_leads: {
        Row: {
          assessment_pdf_url: string | null
          business_name: string
          contact_person: string | null
          converted_to_client_id: string | null
          created_at: string | null
          demo_scheduled_at: string | null
          email: string | null
          id: string
          industry: string | null
          initial_message: string | null
          lost_reason: string | null
          metadata: Json | null
          pain_points: string[] | null
          phone: string | null
          proposal_sent_at: string | null
          quick_win_areas: string[] | null
          social_handles: Json | null
          source: string | null
          status: Database["public"]["Enums"]["dbe_lead_status"] | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          assessment_pdf_url?: string | null
          business_name: string
          contact_person?: string | null
          converted_to_client_id?: string | null
          created_at?: string | null
          demo_scheduled_at?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          initial_message?: string | null
          lost_reason?: string | null
          metadata?: Json | null
          pain_points?: string[] | null
          phone?: string | null
          proposal_sent_at?: string | null
          quick_win_areas?: string[] | null
          social_handles?: Json | null
          source?: string | null
          status?: Database["public"]["Enums"]["dbe_lead_status"] | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          assessment_pdf_url?: string | null
          business_name?: string
          contact_person?: string | null
          converted_to_client_id?: string | null
          created_at?: string | null
          demo_scheduled_at?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          initial_message?: string | null
          lost_reason?: string | null
          metadata?: Json | null
          pain_points?: string[] | null
          phone?: string | null
          proposal_sent_at?: string | null
          quick_win_areas?: string[] | null
          social_handles?: Json | null
          source?: string | null
          status?: Database["public"]["Enums"]["dbe_lead_status"] | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      dbe_solution_templates: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          estimated_setup_hours: number | null
          github_template_path: string | null
          id: string
          industry_tags: string[] | null
          is_active: boolean | null
          n8n_workflow_json: Json | null
          name: string
          pricing_impact: number | null
          success_rate: number | null
          technical_requirements: Json | null
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          estimated_setup_hours?: number | null
          github_template_path?: string | null
          id?: string
          industry_tags?: string[] | null
          is_active?: boolean | null
          n8n_workflow_json?: Json | null
          name: string
          pricing_impact?: number | null
          success_rate?: number | null
          technical_requirements?: Json | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          estimated_setup_hours?: number | null
          github_template_path?: string | null
          id?: string
          industry_tags?: string[] | null
          is_active?: boolean | null
          n8n_workflow_json?: Json | null
          name?: string
          pricing_impact?: number | null
          success_rate?: number | null
          technical_requirements?: Json | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: []
      }
      deals: {
        Row: {
          assigned_to: string | null
          closed_at: string | null
          contact_id: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          custom_fields: Json | null
          deal_type: string | null
          description: string | null
          expected_close_date: string | null
          id: string
          is_recurring: boolean | null
          mrr: number | null
          notes: string | null
          organization_id: string
          probability: number | null
          recurring_frequency: string | null
          stage: string | null
          title: string
          updated_at: string | null
          value: number | null
        }
        Insert: {
          assigned_to?: string | null
          closed_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          custom_fields?: Json | null
          deal_type?: string | null
          description?: string | null
          expected_close_date?: string | null
          id?: string
          is_recurring?: boolean | null
          mrr?: number | null
          notes?: string | null
          organization_id: string
          probability?: number | null
          recurring_frequency?: string | null
          stage?: string | null
          title: string
          updated_at?: string | null
          value?: number | null
        }
        Update: {
          assigned_to?: string | null
          closed_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          custom_fields?: Json | null
          deal_type?: string | null
          description?: string | null
          expected_close_date?: string | null
          id?: string
          is_recurring?: boolean | null
          mrr?: number | null
          notes?: string | null
          organization_id?: string
          probability?: number | null
          recurring_frequency?: string | null
          stage?: string | null
          title?: string
          updated_at?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          client_id: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          metadata: Json | null
          service_type: string
          status: string | null
          task_id: string | null
          uploaded_at: string | null
        }
        Insert: {
          client_id?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          metadata?: Json | null
          service_type: string
          status?: string | null
          task_id?: string | null
          uploaded_at?: string | null
        }
        Update: {
          client_id?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          metadata?: Json | null
          service_type?: string
          status?: string | null
          task_id?: string | null
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      elijah_checklist_instance: {
        Row: {
          created_at: string
          id: string
          patrol_id: string | null
          status: string
          template_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          patrol_id?: string | null
          status?: string
          template_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          patrol_id?: string | null
          status?: string
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "elijah_checklist_instance_patrol_id_fkey"
            columns: ["patrol_id"]
            isOneToOne: false
            referencedRelation: "elijah_patrol"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elijah_checklist_instance_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "elijah_checklist_template"
            referencedColumns: ["id"]
          },
        ]
      }
      elijah_checklist_item_instance: {
        Row: {
          checklist_instance_id: string
          completed: boolean
          completed_at: string | null
          id: string
          item_label: string
          notes: string | null
        }
        Insert: {
          checklist_instance_id: string
          completed?: boolean
          completed_at?: string | null
          id?: string
          item_label: string
          notes?: string | null
        }
        Update: {
          checklist_instance_id?: string
          completed?: boolean
          completed_at?: string | null
          id?: string
          item_label?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "elijah_checklist_item_instance_checklist_instance_id_fkey"
            columns: ["checklist_instance_id"]
            isOneToOne: false
            referencedRelation: "elijah_checklist_instance"
            referencedColumns: ["id"]
          },
        ]
      }
      elijah_checklist_template: {
        Row: {
          created_at: string
          id: string
          items: Json
          organization_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          items?: Json
          organization_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          items?: Json
          organization_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "elijah_checklist_template_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      elijah_fire_equipment: {
        Row: {
          assigned_group_id: string | null
          created_at: string
          id: string
          last_serviced: string | null
          location_description: string | null
          name: string
          organization_id: string
          status: Database["public"]["Enums"]["elijah_fire_equipment_status"]
          type: Database["public"]["Enums"]["elijah_fire_equipment_type"]
          updated_at: string
        }
        Insert: {
          assigned_group_id?: string | null
          created_at?: string
          id?: string
          last_serviced?: string | null
          location_description?: string | null
          name: string
          organization_id: string
          status?: Database["public"]["Enums"]["elijah_fire_equipment_status"]
          type: Database["public"]["Enums"]["elijah_fire_equipment_type"]
          updated_at?: string
        }
        Update: {
          assigned_group_id?: string | null
          created_at?: string
          id?: string
          last_serviced?: string | null
          location_description?: string | null
          name?: string
          organization_id?: string
          status?: Database["public"]["Enums"]["elijah_fire_equipment_status"]
          type?: Database["public"]["Enums"]["elijah_fire_equipment_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "elijah_fire_equipment_assigned_group_id_fkey"
            columns: ["assigned_group_id"]
            isOneToOne: false
            referencedRelation: "elijah_fire_responder_group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elijah_fire_equipment_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      elijah_fire_farm: {
        Row: {
          access_code: string | null
          access_gate_location: unknown
          access_notes: string | null
          boundary: unknown
          created_at: string
          id: string
          location: unknown
          name: string
          organization_id: string
          owner_name: string
          owner_phone: string | null
          updated_at: string
        }
        Insert: {
          access_code?: string | null
          access_gate_location?: unknown
          access_notes?: string | null
          boundary?: unknown
          created_at?: string
          id?: string
          location: unknown
          name: string
          organization_id: string
          owner_name: string
          owner_phone?: string | null
          updated_at?: string
        }
        Update: {
          access_code?: string | null
          access_gate_location?: unknown
          access_notes?: string | null
          boundary?: unknown
          created_at?: string
          id?: string
          location?: unknown
          name?: string
          organization_id?: string
          owner_name?: string
          owner_phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "elijah_fire_farm_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      elijah_fire_incident: {
        Row: {
          area_affected_ha: number | null
          created_at: string
          farm_id: string | null
          fire_type: Database["public"]["Enums"]["elijah_fire_type"]
          id: string
          incident_id: string
          nearest_water_point_id: string | null
          status: Database["public"]["Enums"]["elijah_fire_status"]
          updated_at: string
          wind_direction: string | null
          wind_speed_kmh: number | null
        }
        Insert: {
          area_affected_ha?: number | null
          created_at?: string
          farm_id?: string | null
          fire_type?: Database["public"]["Enums"]["elijah_fire_type"]
          id?: string
          incident_id: string
          nearest_water_point_id?: string | null
          status?: Database["public"]["Enums"]["elijah_fire_status"]
          updated_at?: string
          wind_direction?: string | null
          wind_speed_kmh?: number | null
        }
        Update: {
          area_affected_ha?: number | null
          created_at?: string
          farm_id?: string | null
          fire_type?: Database["public"]["Enums"]["elijah_fire_type"]
          id?: string
          incident_id?: string
          nearest_water_point_id?: string | null
          status?: Database["public"]["Enums"]["elijah_fire_status"]
          updated_at?: string
          wind_direction?: string | null
          wind_speed_kmh?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "elijah_fire_incident_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "elijah_fire_farm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elijah_fire_incident_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: true
            referencedRelation: "elijah_incident"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elijah_fire_incident_nearest_water_point_id_fkey"
            columns: ["nearest_water_point_id"]
            isOneToOne: false
            referencedRelation: "elijah_fire_water_point"
            referencedColumns: ["id"]
          },
        ]
      }
      elijah_fire_incident_equipment: {
        Row: {
          deployed_at: string
          equipment_id: string
          fire_incident_id: string
          id: string
          notes: string | null
          returned_at: string | null
        }
        Insert: {
          deployed_at?: string
          equipment_id: string
          fire_incident_id: string
          id?: string
          notes?: string | null
          returned_at?: string | null
        }
        Update: {
          deployed_at?: string
          equipment_id?: string
          fire_incident_id?: string
          id?: string
          notes?: string | null
          returned_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "elijah_fire_incident_equipment_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "elijah_fire_equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elijah_fire_incident_equipment_fire_incident_id_fkey"
            columns: ["fire_incident_id"]
            isOneToOne: false
            referencedRelation: "elijah_fire_incident"
            referencedColumns: ["id"]
          },
        ]
      }
      elijah_fire_incident_group_dispatch: {
        Row: {
          arrived_at: string | null
          dispatched_at: string
          dispatched_by: string
          fire_incident_id: string
          group_id: string
          id: string
          notes: string | null
          stood_down_at: string | null
        }
        Insert: {
          arrived_at?: string | null
          dispatched_at?: string
          dispatched_by: string
          fire_incident_id: string
          group_id: string
          id?: string
          notes?: string | null
          stood_down_at?: string | null
        }
        Update: {
          arrived_at?: string | null
          dispatched_at?: string
          dispatched_by?: string
          fire_incident_id?: string
          group_id?: string
          id?: string
          notes?: string | null
          stood_down_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "elijah_fire_incident_group_dispatch_dispatched_by_fkey"
            columns: ["dispatched_by"]
            isOneToOne: false
            referencedRelation: "elijah_member"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elijah_fire_incident_group_dispatch_fire_incident_id_fkey"
            columns: ["fire_incident_id"]
            isOneToOne: false
            referencedRelation: "elijah_fire_incident"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elijah_fire_incident_group_dispatch_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "elijah_fire_responder_group"
            referencedColumns: ["id"]
          },
        ]
      }
      elijah_fire_incident_water_usage: {
        Row: {
          fire_incident_id: string
          id: string
          litres_used: number
          logged_at: string
          logged_by: string
          notes: string | null
          reload_time_min: number | null
          water_point_id: string
        }
        Insert: {
          fire_incident_id: string
          id?: string
          litres_used: number
          logged_at?: string
          logged_by: string
          notes?: string | null
          reload_time_min?: number | null
          water_point_id: string
        }
        Update: {
          fire_incident_id?: string
          id?: string
          litres_used?: number
          logged_at?: string
          logged_by?: string
          notes?: string | null
          reload_time_min?: number | null
          water_point_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "elijah_fire_incident_water_usage_fire_incident_id_fkey"
            columns: ["fire_incident_id"]
            isOneToOne: false
            referencedRelation: "elijah_fire_incident"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elijah_fire_incident_water_usage_logged_by_fkey"
            columns: ["logged_by"]
            isOneToOne: false
            referencedRelation: "elijah_member"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elijah_fire_incident_water_usage_water_point_id_fkey"
            columns: ["water_point_id"]
            isOneToOne: false
            referencedRelation: "elijah_fire_water_point"
            referencedColumns: ["id"]
          },
        ]
      }
      elijah_fire_responder_group: {
        Row: {
          contact_phone: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          organization_id: string
          type: Database["public"]["Enums"]["elijah_fire_group_type"]
          updated_at: string
        }
        Insert: {
          contact_phone?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          type: Database["public"]["Enums"]["elijah_fire_group_type"]
          updated_at?: string
        }
        Update: {
          contact_phone?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          type?: Database["public"]["Enums"]["elijah_fire_group_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "elijah_fire_responder_group_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      elijah_fire_responder_group_member: {
        Row: {
          created_at: string
          group_id: string
          id: string
          member_id: string
          role: Database["public"]["Enums"]["elijah_fire_group_role"]
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          member_id: string
          role?: Database["public"]["Enums"]["elijah_fire_group_role"]
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          member_id?: string
          role?: Database["public"]["Enums"]["elijah_fire_group_role"]
        }
        Relationships: [
          {
            foreignKeyName: "elijah_fire_responder_group_member_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "elijah_fire_responder_group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elijah_fire_responder_group_member_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "elijah_member"
            referencedColumns: ["id"]
          },
        ]
      }
      elijah_fire_water_point: {
        Row: {
          access_notes: string | null
          capacity_litres: number | null
          created_at: string
          id: string
          last_inspected: string | null
          location: unknown
          name: string
          organization_id: string
          status: Database["public"]["Enums"]["elijah_water_point_status"]
          type: Database["public"]["Enums"]["elijah_water_point_type"]
          updated_at: string
        }
        Insert: {
          access_notes?: string | null
          capacity_litres?: number | null
          created_at?: string
          id?: string
          last_inspected?: string | null
          location: unknown
          name: string
          organization_id: string
          status?: Database["public"]["Enums"]["elijah_water_point_status"]
          type: Database["public"]["Enums"]["elijah_water_point_type"]
          updated_at?: string
        }
        Update: {
          access_notes?: string | null
          capacity_litres?: number | null
          created_at?: string
          id?: string
          last_inspected?: string | null
          location?: unknown
          name?: string
          organization_id?: string
          status?: Database["public"]["Enums"]["elijah_water_point_status"]
          type?: Database["public"]["Enums"]["elijah_water_point_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "elijah_fire_water_point_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      elijah_household: {
        Row: {
          address: string
          created_at: string
          id: string
          organization_id: string
          primary_contact_id: string | null
          section_id: string | null
          unit_number: string | null
          updated_at: string
        }
        Insert: {
          address: string
          created_at?: string
          id?: string
          organization_id: string
          primary_contact_id?: string | null
          section_id?: string | null
          unit_number?: string | null
          updated_at?: string
        }
        Update: {
          address?: string
          created_at?: string
          id?: string
          organization_id?: string
          primary_contact_id?: string | null
          section_id?: string | null
          unit_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "elijah_household_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elijah_household_primary_contact_fk"
            columns: ["primary_contact_id"]
            isOneToOne: false
            referencedRelation: "elijah_member"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elijah_household_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "elijah_section"
            referencedColumns: ["id"]
          },
        ]
      }
      elijah_household_buddy: {
        Row: {
          buddy_household_id: string
          created_at: string
          household_id: string
          id: string
        }
        Insert: {
          buddy_household_id: string
          created_at?: string
          household_id: string
          id?: string
        }
        Update: {
          buddy_household_id?: string
          created_at?: string
          household_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "elijah_household_buddy_buddy_household_id_fkey"
            columns: ["buddy_household_id"]
            isOneToOne: false
            referencedRelation: "elijah_household"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elijah_household_buddy_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "elijah_household"
            referencedColumns: ["id"]
          },
        ]
      }
      elijah_incident: {
        Row: {
          created_at: string
          description: string
          id: string
          location: unknown
          organization_id: string
          reported_by: string
          severity: Database["public"]["Enums"]["elijah_severity"]
          status: Database["public"]["Enums"]["elijah_incident_status"]
          type: Database["public"]["Enums"]["elijah_incident_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          location?: unknown
          organization_id: string
          reported_by: string
          severity?: Database["public"]["Enums"]["elijah_severity"]
          status?: Database["public"]["Enums"]["elijah_incident_status"]
          type: Database["public"]["Enums"]["elijah_incident_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          location?: unknown
          organization_id?: string
          reported_by?: string
          severity?: Database["public"]["Enums"]["elijah_severity"]
          status?: Database["public"]["Enums"]["elijah_incident_status"]
          type?: Database["public"]["Enums"]["elijah_incident_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "elijah_incident_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elijah_incident_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "elijah_member"
            referencedColumns: ["id"]
          },
        ]
      }
      elijah_incident_assignment: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          incident_id: string
          member_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          incident_id: string
          member_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          incident_id?: string
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "elijah_incident_assignment_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "elijah_member"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elijah_incident_assignment_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "elijah_incident"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elijah_incident_assignment_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "elijah_member"
            referencedColumns: ["id"]
          },
        ]
      }
      elijah_incident_attachment: {
        Row: {
          created_at: string
          file_path: string
          file_type: string | null
          id: string
          incident_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_path: string
          file_type?: string | null
          id?: string
          incident_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_path?: string
          file_type?: string | null
          id?: string
          incident_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "elijah_incident_attachment_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "elijah_incident"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elijah_incident_attachment_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "elijah_member"
            referencedColumns: ["id"]
          },
        ]
      }
      elijah_incident_timeline_event: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: string
          id: string
          incident_id: string
          notes: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          incident_id: string
          notes?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          incident_id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "elijah_incident_timeline_event_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "elijah_member"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elijah_incident_timeline_event_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "elijah_incident"
            referencedColumns: ["id"]
          },
        ]
      }
      elijah_member: {
        Row: {
          created_at: string
          display_name: string
          household_id: string | null
          id: string
          organization_id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name: string
          household_id?: string | null
          id?: string
          organization_id: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          household_id?: string | null
          id?: string
          organization_id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "elijah_member_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "elijah_household"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elijah_member_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      elijah_member_role: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          member_id: string
          role: Database["public"]["Enums"]["elijah_role_type"]
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          member_id: string
          role: Database["public"]["Enums"]["elijah_role_type"]
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          member_id?: string
          role?: Database["public"]["Enums"]["elijah_role_type"]
        }
        Relationships: [
          {
            foreignKeyName: "elijah_member_role_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "elijah_member"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elijah_member_role_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "elijah_member"
            referencedColumns: ["id"]
          },
        ]
      }
      elijah_member_sensitive_profile: {
        Row: {
          created_at: string
          emergency_contacts: string | null
          id: string
          medical_info: string | null
          member_id: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          emergency_contacts?: string | null
          id?: string
          medical_info?: string | null
          member_id: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          emergency_contacts?: string | null
          id?: string
          medical_info?: string | null
          member_id?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "elijah_member_sensitive_profile_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "elijah_member"
            referencedColumns: ["id"]
          },
        ]
      }
      elijah_notification_preference: {
        Row: {
          created_at: string
          fire_alerts: boolean
          id: string
          incident_types:
            | Database["public"]["Enums"]["elijah_incident_type"][]
            | null
          member_id: string
          min_severity: Database["public"]["Enums"]["elijah_severity"] | null
          patrol_updates: boolean
          rollcall_reminders: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          fire_alerts?: boolean
          id?: string
          incident_types?:
            | Database["public"]["Enums"]["elijah_incident_type"][]
            | null
          member_id: string
          min_severity?: Database["public"]["Enums"]["elijah_severity"] | null
          patrol_updates?: boolean
          rollcall_reminders?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          fire_alerts?: boolean
          id?: string
          incident_types?:
            | Database["public"]["Enums"]["elijah_incident_type"][]
            | null
          member_id?: string
          min_severity?: Database["public"]["Enums"]["elijah_severity"] | null
          patrol_updates?: boolean
          rollcall_reminders?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "elijah_notification_preference_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "elijah_member"
            referencedColumns: ["id"]
          },
        ]
      }
      elijah_patrol: {
        Row: {
          created_at: string
          end_time: string | null
          id: string
          organization_id: string
          recurrence: string | null
          scheduled_date: string
          section_id: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["elijah_patrol_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_time?: string | null
          id?: string
          organization_id: string
          recurrence?: string | null
          scheduled_date: string
          section_id?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["elijah_patrol_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_time?: string | null
          id?: string
          organization_id?: string
          recurrence?: string | null
          scheduled_date?: string
          section_id?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["elijah_patrol_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "elijah_patrol_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elijah_patrol_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "elijah_section"
            referencedColumns: ["id"]
          },
        ]
      }
      elijah_patrol_assignment: {
        Row: {
          id: string
          member_id: string
          patrol_id: string
        }
        Insert: {
          id?: string
          member_id: string
          patrol_id: string
        }
        Update: {
          id?: string
          member_id?: string
          patrol_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "elijah_patrol_assignment_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "elijah_member"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elijah_patrol_assignment_patrol_id_fkey"
            columns: ["patrol_id"]
            isOneToOne: false
            referencedRelation: "elijah_patrol"
            referencedColumns: ["id"]
          },
        ]
      }
      elijah_patrol_checkin: {
        Row: {
          checkin_type: Database["public"]["Enums"]["elijah_checkin_type"]
          created_at: string
          id: string
          location: unknown
          member_id: string
          patrol_id: string
        }
        Insert: {
          checkin_type: Database["public"]["Enums"]["elijah_checkin_type"]
          created_at?: string
          id?: string
          location?: unknown
          member_id: string
          patrol_id: string
        }
        Update: {
          checkin_type?: Database["public"]["Enums"]["elijah_checkin_type"]
          created_at?: string
          id?: string
          location?: unknown
          member_id?: string
          patrol_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "elijah_patrol_checkin_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "elijah_member"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elijah_patrol_checkin_patrol_id_fkey"
            columns: ["patrol_id"]
            isOneToOne: false
            referencedRelation: "elijah_patrol"
            referencedColumns: ["id"]
          },
        ]
      }
      elijah_rollcall_checkin: {
        Row: {
          checked_in_by: string | null
          created_at: string
          household_id: string
          id: string
          schedule_id: string
          status: Database["public"]["Enums"]["elijah_checkin_status"]
        }
        Insert: {
          checked_in_by?: string | null
          created_at?: string
          household_id: string
          id?: string
          schedule_id: string
          status?: Database["public"]["Enums"]["elijah_checkin_status"]
        }
        Update: {
          checked_in_by?: string | null
          created_at?: string
          household_id?: string
          id?: string
          schedule_id?: string
          status?: Database["public"]["Enums"]["elijah_checkin_status"]
        }
        Relationships: [
          {
            foreignKeyName: "elijah_rollcall_checkin_checked_in_by_fkey"
            columns: ["checked_in_by"]
            isOneToOne: false
            referencedRelation: "elijah_member"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elijah_rollcall_checkin_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "elijah_household"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elijah_rollcall_checkin_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "elijah_rollcall_schedule"
            referencedColumns: ["id"]
          },
        ]
      }
      elijah_rollcall_schedule: {
        Row: {
          created_at: string
          escalation_tiers: Json
          grace_minutes: number
          id: string
          organization_id: string
          section_id: string | null
          time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          escalation_tiers?: Json
          grace_minutes?: number
          id?: string
          organization_id: string
          section_id?: string | null
          time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          escalation_tiers?: Json
          grace_minutes?: number
          id?: string
          organization_id?: string
          section_id?: string | null
          time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "elijah_rollcall_schedule_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elijah_rollcall_schedule_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "elijah_section"
            referencedColumns: ["id"]
          },
        ]
      }
      elijah_section: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "elijah_section_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      elijah_sensitive_access_audit: {
        Row: {
          access_type: string
          accessed_at: string
          accessed_by: string
          id: string
          ip_address: string | null
          member_id: string
        }
        Insert: {
          access_type: string
          accessed_at?: string
          accessed_by: string
          id?: string
          ip_address?: string | null
          member_id: string
        }
        Update: {
          access_type?: string
          accessed_at?: string
          accessed_by?: string
          id?: string
          ip_address?: string | null
          member_id?: string
        }
        Relationships: []
      }
      elijah_sop_template: {
        Row: {
          content: Json
          created_at: string
          created_by: string | null
          id: string
          organization_id: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "elijah_sop_template_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "elijah_member"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elijah_sop_template_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      elijah_whatsapp_inbound: {
        Row: {
          from_phone: string
          id: string
          message_body: string | null
          organization_id: string
          received_at: string
          wa_message_id: string
        }
        Insert: {
          from_phone: string
          id?: string
          message_body?: string | null
          organization_id: string
          received_at?: string
          wa_message_id: string
        }
        Update: {
          from_phone?: string
          id?: string
          message_body?: string | null
          organization_id?: string
          received_at?: string
          wa_message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "elijah_whatsapp_inbound_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      elijah_whatsapp_session: {
        Row: {
          command: string
          created_at: string
          data: Json
          expires_at: string
          id: string
          organization_id: string
          phone: string
          step: number
          updated_at: string
        }
        Insert: {
          command: string
          created_at?: string
          data?: Json
          expires_at: string
          id?: string
          organization_id: string
          phone: string
          step?: number
          updated_at?: string
        }
        Update: {
          command?: string
          created_at?: string
          data?: Json
          expires_at?: string
          id?: string
          organization_id?: string
          phone?: string
          step?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "elijah_whatsapp_session_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sequence_steps: {
        Row: {
          created_at: string | null
          delay_days: number | null
          delay_hours: number | null
          email_body: string
          email_subject: string
          email_template_id: string | null
          id: string
          is_active: boolean | null
          send_from_user: string | null
          sequence_id: string | null
          step_order: number
        }
        Insert: {
          created_at?: string | null
          delay_days?: number | null
          delay_hours?: number | null
          email_body: string
          email_subject: string
          email_template_id?: string | null
          id?: string
          is_active?: boolean | null
          send_from_user?: string | null
          sequence_id?: string | null
          step_order: number
        }
        Update: {
          created_at?: string | null
          delay_days?: number | null
          delay_hours?: number | null
          email_body?: string
          email_subject?: string
          email_template_id?: string | null
          id?: string
          is_active?: boolean | null
          send_from_user?: string | null
          sequence_id?: string | null
          step_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "email_sequence_steps_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "email_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sequences: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          organization_id: string | null
          sequence_name: string
          sequence_type: string
          trigger_event: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          sequence_name: string
          sequence_type: string
          trigger_event: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          sequence_name?: string
          sequence_type?: string
          trigger_event?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_sequences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      engagement_events: {
        Row: {
          contact_id: string | null
          created_at: string | null
          event_data: Json | null
          event_source: string | null
          event_type: string
          id: string
          lead_id: string | null
          organization_id: string | null
        }
        Insert: {
          contact_id?: string | null
          created_at?: string | null
          event_data?: Json | null
          event_source?: string | null
          event_type: string
          id?: string
          lead_id?: string | null
          organization_id?: string | null
        }
        Update: {
          contact_id?: string | null
          created_at?: string | null
          event_data?: Json | null
          event_source?: string | null
          event_type?: string
          id?: string
          lead_id?: string | null
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "engagement_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "v_leads_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_drafts: {
        Row: {
          created_at: string
          draft_data: Json
          entity_id: string | null
          entity_type: string
          expires_at: string
          id: string
          last_modified_at: string
          organization_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          draft_data?: Json
          entity_id?: string | null
          entity_type: string
          expires_at?: string
          id?: string
          last_modified_at?: string
          organization_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          draft_data?: Json
          entity_id?: string | null
          entity_type?: string
          expires_at?: string
          id?: string
          last_modified_at?: string
          organization_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_drafts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_checklist_items: {
        Row: {
          checklist_id: string
          completed_at: string | null
          completed_by: string | null
          id: string
          is_completed: boolean | null
          label: string
          organization_id: string
          sort_order: number | null
        }
        Insert: {
          checklist_id: string
          completed_at?: string | null
          completed_by?: string | null
          id?: string
          is_completed?: boolean | null
          label: string
          organization_id: string
          sort_order?: number | null
        }
        Update: {
          checklist_id?: string
          completed_at?: string | null
          completed_by?: string | null
          id?: string
          is_completed?: boolean | null
          label?: string
          organization_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "event_checklist_items_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "event_checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_checklist_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_checklists: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          name: string
          organization_id: string
          type: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          name: string
          organization_id: string
          type: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          name?: string
          organization_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_checklists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_checklists_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_guests: {
        Row: {
          contact_id: string | null
          dietary_notes: string | null
          event_id: string
          id: string
          invited_at: string | null
          organization_id: string
          responded_at: string | null
          rsvp_status: string | null
          table_assignment: string | null
          whatsapp_number: string | null
        }
        Insert: {
          contact_id?: string | null
          dietary_notes?: string | null
          event_id: string
          id?: string
          invited_at?: string | null
          organization_id: string
          responded_at?: string | null
          rsvp_status?: string | null
          table_assignment?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          contact_id?: string | null
          dietary_notes?: string | null
          event_id?: string
          id?: string
          invited_at?: string | null
          organization_id?: string
          responded_at?: string | null
          rsvp_status?: string | null
          table_assignment?: string | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_guests_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_guests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_guests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_staff_assignments: {
        Row: {
          confirmed: boolean | null
          end_time: string | null
          event_id: string
          id: string
          organization_id: string
          role: string | null
          staff_id: string
          start_time: string | null
        }
        Insert: {
          confirmed?: boolean | null
          end_time?: string | null
          event_id: string
          id?: string
          organization_id: string
          role?: string | null
          staff_id: string
          start_time?: string | null
        }
        Update: {
          confirmed?: boolean | null
          end_time?: string | null
          event_id?: string
          id?: string
          organization_id?: string
          role?: string | null
          staff_id?: string
          start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_staff_assignments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_staff_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_staff_assignments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "restaurant_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      event_timeline_items: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          event_id: string
          id: string
          organization_id: string
          sort_order: number | null
          status: string | null
          time: string
          title: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          event_id: string
          id?: string
          organization_id: string
          sort_order?: number | null
          status?: string | null
          time: string
          title: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          event_id?: string
          id?: string
          organization_id?: string
          sort_order?: number | null
          status?: string | null
          time?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_timeline_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_timeline_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_vendor_assignments: {
        Row: {
          agreed_cost: number | null
          created_at: string | null
          event_id: string
          id: string
          notes: string | null
          organization_id: string
          role: string | null
          status: string | null
          vendor_id: string
        }
        Insert: {
          agreed_cost?: number | null
          created_at?: string | null
          event_id: string
          id?: string
          notes?: string | null
          organization_id: string
          role?: string | null
          status?: string | null
          vendor_id: string
        }
        Update: {
          agreed_cost?: number | null
          created_at?: string | null
          event_id?: string
          id?: string
          notes?: string | null
          organization_id?: string
          role?: string | null
          status?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_vendor_assignments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_vendor_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_vendor_assignments_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "event_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      event_vendors: {
        Row: {
          category: string | null
          confirmed: boolean | null
          contact_name: string | null
          created_at: string | null
          email: string | null
          event_id: string | null
          id: string
          name: string
          notes: string | null
          organization_id: string
          phone: string | null
          quote_amount: number | null
        }
        Insert: {
          category?: string | null
          confirmed?: boolean | null
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          event_id?: string | null
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          quote_amount?: number | null
        }
        Update: {
          category?: string | null
          confirmed?: boolean | null
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          event_id?: string | null
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          quote_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "event_vendors_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_vendors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          accommodation_booking_id: string | null
          budget: number | null
          client_email: string | null
          client_name: string | null
          client_phone: string | null
          contact_id: string | null
          created_at: string | null
          deposit_amount: number | null
          deposit_payfast_link: string | null
          deposit_status: string | null
          end_time: string | null
          event_date: string | null
          event_end_date: string | null
          expected_guests: number | null
          id: string
          name: string
          notes: string | null
          organization_id: string
          restaurant_id: string | null
          stage: string | null
          start_time: string | null
          status: string | null
          type: string | null
          updated_at: string | null
          venue: string | null
        }
        Insert: {
          accommodation_booking_id?: string | null
          budget?: number | null
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          contact_id?: string | null
          created_at?: string | null
          deposit_amount?: number | null
          deposit_payfast_link?: string | null
          deposit_status?: string | null
          end_time?: string | null
          event_date?: string | null
          event_end_date?: string | null
          expected_guests?: number | null
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          restaurant_id?: string | null
          stage?: string | null
          start_time?: string | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
          venue?: string | null
        }
        Update: {
          accommodation_booking_id?: string | null
          budget?: number | null
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          contact_id?: string | null
          created_at?: string | null
          deposit_amount?: number | null
          deposit_payfast_link?: string | null
          deposit_status?: string | null
          end_time?: string | null
          event_date?: string | null
          event_end_date?: string | null
          expected_guests?: number | null
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          restaurant_id?: string | null
          stage?: string | null
          start_time?: string | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      figarie_booking_requests: {
        Row: {
          assigned_to: string | null
          booking_id: string | null
          channel_id: string | null
          client_email: string | null
          client_name: string | null
          client_phone: string | null
          contact_id: string | null
          conversation_history: Json | null
          created_at: string | null
          email_sent: boolean | null
          email_sent_at: string | null
          escalated: boolean | null
          escalation_reason: string | null
          guest_count: number | null
          id: string
          lead_id: string | null
          metadata: Json | null
          org_id: string
          parsed_fields: Json | null
          raw_data: Json | null
          requested_date: string | null
          service_type:
            | Database["public"]["Enums"]["figarie_service_category"]
            | null
          source: Database["public"]["Enums"]["figarie_request_source"]
          status: string | null
          summary: string | null
          updated_at: string | null
          urgency_flag: boolean | null
        }
        Insert: {
          assigned_to?: string | null
          booking_id?: string | null
          channel_id?: string | null
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          contact_id?: string | null
          conversation_history?: Json | null
          created_at?: string | null
          email_sent?: boolean | null
          email_sent_at?: string | null
          escalated?: boolean | null
          escalation_reason?: string | null
          guest_count?: number | null
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          org_id: string
          parsed_fields?: Json | null
          raw_data?: Json | null
          requested_date?: string | null
          service_type?:
            | Database["public"]["Enums"]["figarie_service_category"]
            | null
          source: Database["public"]["Enums"]["figarie_request_source"]
          status?: string | null
          summary?: string | null
          updated_at?: string | null
          urgency_flag?: boolean | null
        }
        Update: {
          assigned_to?: string | null
          booking_id?: string | null
          channel_id?: string | null
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          contact_id?: string | null
          conversation_history?: Json | null
          created_at?: string | null
          email_sent?: boolean | null
          email_sent_at?: string | null
          escalated?: boolean | null
          escalation_reason?: string | null
          guest_count?: number | null
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          org_id?: string
          parsed_fields?: Json | null
          raw_data?: Json | null
          requested_date?: string | null
          service_type?:
            | Database["public"]["Enums"]["figarie_service_category"]
            | null
          source?: Database["public"]["Enums"]["figarie_request_source"]
          status?: string | null
          summary?: string | null
          updated_at?: string | null
          urgency_flag?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "figarie_booking_requests_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "figarie_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "figarie_booking_requests_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "figarie_booking_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      figarie_bookings: {
        Row: {
          assigned_to: string | null
          booking_number: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          confirmed_amount: number | null
          confirmed_at: string | null
          contact_id: string | null
          created_at: string | null
          currency: string | null
          deposit_amount: number | null
          dropoff_location: string | null
          fleet_id: string | null
          guest_count: number | null
          guest_details: Json | null
          id: string
          internal_notes: string | null
          metadata: Json | null
          org_id: string
          pickup_location: string | null
          quoted_amount: number | null
          route_details: string | null
          service_date: string | null
          service_end_date: string | null
          service_id: string | null
          service_time: string | null
          special_requests: string | null
          status: Database["public"]["Enums"]["figarie_booking_status"] | null
          supplier_id: string | null
          updated_at: string | null
          urgency_flag: boolean | null
          urgency_reason: string | null
        }
        Insert: {
          assigned_to?: string | null
          booking_number?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          confirmed_amount?: number | null
          confirmed_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          currency?: string | null
          deposit_amount?: number | null
          dropoff_location?: string | null
          fleet_id?: string | null
          guest_count?: number | null
          guest_details?: Json | null
          id?: string
          internal_notes?: string | null
          metadata?: Json | null
          org_id: string
          pickup_location?: string | null
          quoted_amount?: number | null
          route_details?: string | null
          service_date?: string | null
          service_end_date?: string | null
          service_id?: string | null
          service_time?: string | null
          special_requests?: string | null
          status?: Database["public"]["Enums"]["figarie_booking_status"] | null
          supplier_id?: string | null
          updated_at?: string | null
          urgency_flag?: boolean | null
          urgency_reason?: string | null
        }
        Update: {
          assigned_to?: string | null
          booking_number?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          confirmed_amount?: number | null
          confirmed_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          currency?: string | null
          deposit_amount?: number | null
          dropoff_location?: string | null
          fleet_id?: string | null
          guest_count?: number | null
          guest_details?: Json | null
          id?: string
          internal_notes?: string | null
          metadata?: Json | null
          org_id?: string
          pickup_location?: string | null
          quoted_amount?: number | null
          route_details?: string | null
          service_date?: string | null
          service_end_date?: string | null
          service_id?: string | null
          service_time?: string | null
          special_requests?: string | null
          status?: Database["public"]["Enums"]["figarie_booking_status"] | null
          supplier_id?: string | null
          updated_at?: string | null
          urgency_flag?: boolean | null
          urgency_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "figarie_bookings_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "figarie_bookings_fleet_id_fkey"
            columns: ["fleet_id"]
            isOneToOne: false
            referencedRelation: "figarie_fleet"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "figarie_bookings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "figarie_bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "figarie_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "figarie_bookings_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "figarie_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      figarie_fleet: {
        Row: {
          availability_region: string | null
          base_rate_from: number | null
          capacity: number
          category: string
          comfort_level: number | null
          created_at: string | null
          features: Json | null
          id: string
          image_urls: string[] | null
          is_active: boolean | null
          luxury_level: string | null
          make: string | null
          model: string | null
          notes: string | null
          org_id: string
          rate_unit: string | null
          specifications: Json | null
          supplier_id: string | null
          updated_at: string | null
          vehicle_name: string
          vehicle_type: string
        }
        Insert: {
          availability_region?: string | null
          base_rate_from?: number | null
          capacity: number
          category: string
          comfort_level?: number | null
          created_at?: string | null
          features?: Json | null
          id?: string
          image_urls?: string[] | null
          is_active?: boolean | null
          luxury_level?: string | null
          make?: string | null
          model?: string | null
          notes?: string | null
          org_id: string
          rate_unit?: string | null
          specifications?: Json | null
          supplier_id?: string | null
          updated_at?: string | null
          vehicle_name: string
          vehicle_type: string
        }
        Update: {
          availability_region?: string | null
          base_rate_from?: number | null
          capacity?: number
          category?: string
          comfort_level?: number | null
          created_at?: string | null
          features?: Json | null
          id?: string
          image_urls?: string[] | null
          is_active?: boolean | null
          luxury_level?: string | null
          make?: string | null
          model?: string | null
          notes?: string | null
          org_id?: string
          rate_unit?: string | null
          specifications?: Json | null
          supplier_id?: string | null
          updated_at?: string | null
          vehicle_name?: string
          vehicle_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "figarie_fleet_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_fleet_supplier"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "figarie_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      figarie_services: {
        Row: {
          available_regions: string[] | null
          base_price_from: number | null
          capacity_max: number | null
          capacity_min: number | null
          category: string
          created_at: string | null
          description: string | null
          display_order: number | null
          duration_description: string | null
          escalate_to_human: boolean | null
          exclusions: string[] | null
          id: string
          image_urls: string[] | null
          inclusions: string[] | null
          is_active: boolean | null
          is_bespoke: boolean | null
          metadata: Json | null
          name: string
          org_id: string
          price_currency: string | null
          price_unit: string | null
          region: string | null
          requirements_schema: Json | null
          service_type: Database["public"]["Enums"]["figarie_service_category"]
          short_description: string | null
          sub_category: string | null
          terms_conditions: string | null
          updated_at: string | null
        }
        Insert: {
          available_regions?: string[] | null
          base_price_from?: number | null
          capacity_max?: number | null
          capacity_min?: number | null
          category: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          duration_description?: string | null
          escalate_to_human?: boolean | null
          exclusions?: string[] | null
          id?: string
          image_urls?: string[] | null
          inclusions?: string[] | null
          is_active?: boolean | null
          is_bespoke?: boolean | null
          metadata?: Json | null
          name: string
          org_id: string
          price_currency?: string | null
          price_unit?: string | null
          region?: string | null
          requirements_schema?: Json | null
          service_type: Database["public"]["Enums"]["figarie_service_category"]
          short_description?: string | null
          sub_category?: string | null
          terms_conditions?: string | null
          updated_at?: string | null
        }
        Update: {
          available_regions?: string[] | null
          base_price_from?: number | null
          capacity_max?: number | null
          capacity_min?: number | null
          category?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          duration_description?: string | null
          escalate_to_human?: boolean | null
          exclusions?: string[] | null
          id?: string
          image_urls?: string[] | null
          inclusions?: string[] | null
          is_active?: boolean | null
          is_bespoke?: boolean | null
          metadata?: Json | null
          name?: string
          org_id?: string
          price_currency?: string | null
          price_unit?: string | null
          region?: string | null
          requirements_schema?: Json | null
          service_type?: Database["public"]["Enums"]["figarie_service_category"]
          short_description?: string | null
          sub_category?: string | null
          terms_conditions?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "figarie_services_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      figarie_suppliers: {
        Row: {
          commission_percentage: number | null
          company_name: string | null
          contact_info: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          is_preferred: boolean | null
          metadata: Json | null
          name: string
          notes: string | null
          org_id: string
          payment_terms: string | null
          primary_contact_email: string | null
          primary_contact_name: string | null
          primary_contact_phone: string | null
          rating: number | null
          response_time_hours: number | null
          service_types: Database["public"]["Enums"]["figarie_service_category"][]
          updated_at: string | null
        }
        Insert: {
          commission_percentage?: number | null
          company_name?: string | null
          contact_info?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_preferred?: boolean | null
          metadata?: Json | null
          name: string
          notes?: string | null
          org_id: string
          payment_terms?: string | null
          primary_contact_email?: string | null
          primary_contact_name?: string | null
          primary_contact_phone?: string | null
          rating?: number | null
          response_time_hours?: number | null
          service_types: Database["public"]["Enums"]["figarie_service_category"][]
          updated_at?: string | null
        }
        Update: {
          commission_percentage?: number | null
          company_name?: string | null
          contact_info?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_preferred?: boolean | null
          metadata?: Json | null
          name?: string
          notes?: string | null
          org_id?: string
          payment_terms?: string | null
          primary_contact_email?: string | null
          primary_contact_name?: string | null
          primary_contact_phone?: string | null
          rating?: number | null
          response_time_hours?: number | null
          service_types?: Database["public"]["Enums"]["figarie_service_category"][]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "figarie_suppliers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      firearms: {
        Row: {
          caliber: string
          created_at: string | null
          id: string
          is_active: boolean | null
          license_expiry: string | null
          license_number: string | null
          license_type: string | null
          make: string
          model: string | null
          notes: string | null
          org_id: string
          owner_ref_id: string
          owner_type: string
          serial_number: string
          tip_expiry_date: string | null
          tip_issued_date: string | null
          tip_number: string | null
          tip_port_of_entry: string | null
          updated_at: string | null
        }
        Insert: {
          caliber: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          license_expiry?: string | null
          license_number?: string | null
          license_type?: string | null
          make: string
          model?: string | null
          notes?: string | null
          org_id: string
          owner_ref_id: string
          owner_type: string
          serial_number: string
          tip_expiry_date?: string | null
          tip_issued_date?: string | null
          tip_number?: string | null
          tip_port_of_entry?: string | null
          updated_at?: string | null
        }
        Update: {
          caliber?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          license_expiry?: string | null
          license_number?: string | null
          license_type?: string | null
          make?: string
          model?: string | null
          notes?: string | null
          org_id?: string
          owner_ref_id?: string
          owner_type?: string
          serial_number?: string
          tip_expiry_date?: string | null
          tip_issued_date?: string | null
          tip_number?: string | null
          tip_port_of_entry?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "firearms_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      form_submissions: {
        Row: {
          contact_id: string | null
          created_at: string | null
          deal_id: string | null
          error_message: string | null
          form_id: string
          form_name: string | null
          id: string
          organization_id: string
          processed_at: string | null
          status: string | null
          submission_data: Json
          submission_source: string | null
        }
        Insert: {
          contact_id?: string | null
          created_at?: string | null
          deal_id?: string | null
          error_message?: string | null
          form_id: string
          form_name?: string | null
          id?: string
          organization_id: string
          processed_at?: string | null
          status?: string | null
          submission_data: Json
          submission_source?: string | null
        }
        Update: {
          contact_id?: string | null
          created_at?: string | null
          deal_id?: string | null
          error_message?: string | null
          form_id?: string
          form_name?: string | null
          id?: string
          organization_id?: string
          processed_at?: string | null
          status?: string | null
          submission_data?: Json
          submission_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      game_individuals: {
        Row: {
          area_id: string | null
          breeding_status: string | null
          created_at: string | null
          dam_id: string | null
          date_of_birth: string | null
          ear_tag: string | null
          estimated_age: string | null
          estimated_value_zar: number | null
          id: string
          is_active: boolean | null
          measurements: Json | null
          microchip: string | null
          name: string | null
          notes: string | null
          org_id: string
          photos: Json | null
          purchase_date: string | null
          purchase_price_zar: number | null
          sex: string
          sire_id: string | null
          source: string | null
          species_id: string
          updated_at: string | null
        }
        Insert: {
          area_id?: string | null
          breeding_status?: string | null
          created_at?: string | null
          dam_id?: string | null
          date_of_birth?: string | null
          ear_tag?: string | null
          estimated_age?: string | null
          estimated_value_zar?: number | null
          id?: string
          is_active?: boolean | null
          measurements?: Json | null
          microchip?: string | null
          name?: string | null
          notes?: string | null
          org_id: string
          photos?: Json | null
          purchase_date?: string | null
          purchase_price_zar?: number | null
          sex: string
          sire_id?: string | null
          source?: string | null
          species_id: string
          updated_at?: string | null
        }
        Update: {
          area_id?: string | null
          breeding_status?: string | null
          created_at?: string | null
          dam_id?: string | null
          date_of_birth?: string | null
          ear_tag?: string | null
          estimated_age?: string | null
          estimated_value_zar?: number | null
          id?: string
          is_active?: boolean | null
          measurements?: Json | null
          microchip?: string | null
          name?: string | null
          notes?: string | null
          org_id?: string
          photos?: Json | null
          purchase_date?: string | null
          purchase_price_zar?: number | null
          sex?: string
          sire_id?: string | null
          source?: string | null
          species_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_individuals_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_individuals_dam_id_fkey"
            columns: ["dam_id"]
            isOneToOne: false
            referencedRelation: "game_individuals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_individuals_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_individuals_sire_id_fkey"
            columns: ["sire_id"]
            isOneToOne: false
            referencedRelation: "game_individuals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_individuals_species_id_fkey"
            columns: ["species_id"]
            isOneToOne: false
            referencedRelation: "species"
            referencedColumns: ["id"]
          },
        ]
      }
      game_records: {
        Row: {
          area_id: string | null
          count: number | null
          created_at: string | null
          gps_lat: number | null
          gps_lng: number | null
          id: string
          individual_id: string | null
          measurements: Json | null
          notes: string | null
          org_id: string
          performed_by: string | null
          photos: Json | null
          record_date: string
          record_type: string
          sex_breakdown: Json | null
          species_id: string
        }
        Insert: {
          area_id?: string | null
          count?: number | null
          created_at?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          individual_id?: string | null
          measurements?: Json | null
          notes?: string | null
          org_id: string
          performed_by?: string | null
          photos?: Json | null
          record_date: string
          record_type: string
          sex_breakdown?: Json | null
          species_id: string
        }
        Update: {
          area_id?: string | null
          count?: number | null
          created_at?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          individual_id?: string | null
          measurements?: Json | null
          notes?: string | null
          org_id?: string
          performed_by?: string | null
          photos?: Json | null
          record_date?: string
          record_type?: string
          sex_breakdown?: Json | null
          species_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_records_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_records_individual_id_fkey"
            columns: ["individual_id"]
            isOneToOne: false
            referencedRelation: "game_individuals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_records_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_records_species_id_fkey"
            columns: ["species_id"]
            isOneToOne: false
            referencedRelation: "species"
            referencedColumns: ["id"]
          },
        ]
      }
      hashtag_library: {
        Row: {
          avg_engagement_rate: number | null
          avg_reach: number | null
          category: string | null
          created_at: string | null
          hashtag: string
          id: string
          is_branded: boolean | null
          is_favorite: boolean | null
          last_used_at: string | null
          notes: string | null
          organization_id: string | null
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          avg_engagement_rate?: number | null
          avg_reach?: number | null
          category?: string | null
          created_at?: string | null
          hashtag: string
          id?: string
          is_branded?: boolean | null
          is_favorite?: boolean | null
          last_used_at?: string | null
          notes?: string | null
          organization_id?: string | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          avg_engagement_rate?: number | null
          avg_reach?: number | null
          category?: string | null
          created_at?: string | null
          hashtag?: string
          id?: string
          is_branded?: boolean | null
          is_favorite?: boolean | null
          last_used_at?: string | null
          notes?: string | null
          organization_id?: string | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hashtag_library_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      hashtag_sets: {
        Row: {
          created_at: string | null
          description: string | null
          hashtags: string[] | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          platform_id: string | null
          updated_at: string | null
          usage_count: number | null
          use_case: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          hashtags?: string[] | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          platform_id?: string | null
          updated_at?: string | null
          usage_count?: number | null
          use_case?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          hashtags?: string[] | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          platform_id?: string | null
          updated_at?: string | null
          usage_count?: number | null
          use_case?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hashtag_sets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hashtag_sets_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "social_platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_marketplace: {
        Row: {
          available_for_industries: string[] | null
          category: string | null
          configuration_schema: Json
          created_at: string | null
          description: string | null
          documentation_url: string | null
          id: string
          is_active: boolean | null
          minimum_tier: string | null
          name: string
          provider: string
        }
        Insert: {
          available_for_industries?: string[] | null
          category?: string | null
          configuration_schema: Json
          created_at?: string | null
          description?: string | null
          documentation_url?: string | null
          id?: string
          is_active?: boolean | null
          minimum_tier?: string | null
          name: string
          provider: string
        }
        Update: {
          available_for_industries?: string[] | null
          category?: string | null
          configuration_schema?: Json
          created_at?: string | null
          description?: string | null
          documentation_url?: string | null
          id?: string
          is_active?: boolean | null
          minimum_tier?: string | null
          name?: string
          provider?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount_paid: number | null
          bank_reference: string | null
          client_id: string
          created_at: string | null
          currency: string | null
          due_date: string | null
          exchange_rate: number | null
          id: string
          invoice_number: string
          issued_at: string | null
          line_items: Json | null
          notes: string | null
          org_id: string
          paid_at: string | null
          payment_method: string | null
          pdf_url: string | null
          safari_id: string | null
          status: string | null
          subtotal_zar: number | null
          total_zar: number | null
          updated_at: string | null
          usd_total: number | null
          vat_amount: number | null
          vat_rate: number | null
        }
        Insert: {
          amount_paid?: number | null
          bank_reference?: string | null
          client_id: string
          created_at?: string | null
          currency?: string | null
          due_date?: string | null
          exchange_rate?: number | null
          id?: string
          invoice_number: string
          issued_at?: string | null
          line_items?: Json | null
          notes?: string | null
          org_id: string
          paid_at?: string | null
          payment_method?: string | null
          pdf_url?: string | null
          safari_id?: string | null
          status?: string | null
          subtotal_zar?: number | null
          total_zar?: number | null
          updated_at?: string | null
          usd_total?: number | null
          vat_amount?: number | null
          vat_rate?: number | null
        }
        Update: {
          amount_paid?: number | null
          bank_reference?: string | null
          client_id?: string
          created_at?: string | null
          currency?: string | null
          due_date?: string | null
          exchange_rate?: number | null
          id?: string
          invoice_number?: string
          issued_at?: string | null
          line_items?: Json | null
          notes?: string | null
          org_id?: string
          paid_at?: string | null
          payment_method?: string | null
          pdf_url?: string | null
          safari_id?: string | null
          status?: string | null
          subtotal_zar?: number | null
          total_zar?: number | null
          updated_at?: string | null
          usd_total?: number | null
          vat_amount?: number | null
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "safari_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_safari_id_fkey"
            columns: ["safari_id"]
            isOneToOne: false
            referencedRelation: "safaris"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_activities: {
        Row: {
          activity_type: string
          completed_at: string | null
          created_at: string | null
          description: string | null
          id: string
          lead_id: string | null
          metadata: Json | null
          scheduled_at: string | null
          user_id: string | null
        }
        Insert: {
          activity_type: string
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          scheduled_at?: string | null
          user_id?: string | null
        }
        Update: {
          activity_type?: string
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          scheduled_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "v_leads_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_ai_insights: {
        Row: {
          confidence_score: number | null
          dismissed_at: string | null
          dismissed_by: string | null
          generated_at: string | null
          generated_by: string | null
          id: string
          insight_data: Json
          insight_type: string
          is_dismissed: boolean | null
          lead_id: string | null
          organization_id: string | null
        }
        Insert: {
          confidence_score?: number | null
          dismissed_at?: string | null
          dismissed_by?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          insight_data: Json
          insight_type: string
          is_dismissed?: boolean | null
          lead_id?: string | null
          organization_id?: string | null
        }
        Update: {
          confidence_score?: number | null
          dismissed_at?: string | null
          dismissed_by?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          insight_data?: Json
          insight_type?: string
          is_dismissed?: boolean | null
          lead_id?: string | null
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_ai_insights_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_ai_insights_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "v_leads_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_ai_insights_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_scoring_rules: {
        Row: {
          created_at: string | null
          field_name: string
          field_value: string | null
          id: string
          is_active: boolean | null
          operator: string
          organization_id: string | null
          rule_name: string
          rule_type: string
          score_points: number
        }
        Insert: {
          created_at?: string | null
          field_name: string
          field_value?: string | null
          id?: string
          is_active?: boolean | null
          operator: string
          organization_id?: string | null
          rule_name: string
          rule_type: string
          score_points: number
        }
        Update: {
          created_at?: string | null
          field_name?: string
          field_value?: string | null
          id?: string
          is_active?: boolean | null
          operator?: string
          organization_id?: string | null
          rule_name?: string
          rule_type?: string
          score_points?: number
        }
        Relationships: [
          {
            foreignKeyName: "lead_scoring_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_sources: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string | null
          type: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id?: string | null
          type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_sources_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_vendors: {
        Row: {
          created_at: string | null
          id: string
          lead_id: string | null
          notes: string | null
          quoted_amount: number | null
          request_details: string | null
          response_date: string | null
          status: string | null
          updated_at: string | null
          vendor_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          quoted_amount?: number | null
          request_details?: string | null
          response_date?: string | null
          status?: string | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          quoted_amount?: number | null
          request_details?: string | null
          response_date?: string | null
          status?: string | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_vendors_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_vendors_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "v_leads_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_vendors_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          company: string | null
          created_at: string | null
          created_by: string | null
          custom_fields: Json | null
          customer_id: string | null
          email: string | null
          expected_close_date: string | null
          id: string
          name: string
          notes: string | null
          organization_id: string | null
          phone: string | null
          probability: number | null
          source_id: string | null
          status: Database["public"]["Enums"]["lead_status"] | null
          updated_at: string | null
          value: number | null
        }
        Insert: {
          assigned_to?: string | null
          company?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_fields?: Json | null
          customer_id?: string | null
          email?: string | null
          expected_close_date?: string | null
          id?: string
          name: string
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          probability?: number | null
          source_id?: string | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          updated_at?: string | null
          value?: number | null
        }
        Update: {
          assigned_to?: string | null
          company?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_fields?: Json | null
          customer_id?: string | null
          email?: string | null
          expected_close_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          probability?: number | null
          source_id?: string | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          updated_at?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_activity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "lead_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_campaigns: {
        Row: {
          budget: number | null
          campaign_type: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string | null
          goal_metrics: Json | null
          goal_type: string | null
          id: string
          name: string
          organization_id: string
          roi: number | null
          start_date: string | null
          status: string | null
          target_contact_types: string[] | null
          target_tags: string[] | null
          total_conversions: number | null
          total_engagement: number | null
          total_posts: number | null
          total_reach: number | null
          updated_at: string | null
        }
        Insert: {
          budget?: number | null
          campaign_type?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          goal_metrics?: Json | null
          goal_type?: string | null
          id?: string
          name: string
          organization_id: string
          roi?: number | null
          start_date?: string | null
          status?: string | null
          target_contact_types?: string[] | null
          target_tags?: string[] | null
          total_conversions?: number | null
          total_engagement?: number | null
          total_posts?: number | null
          total_reach?: number | null
          updated_at?: string | null
        }
        Update: {
          budget?: number | null
          campaign_type?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          goal_metrics?: Json | null
          goal_type?: string | null
          id?: string
          name?: string
          organization_id?: string
          roi?: number | null
          start_date?: string | null
          status?: string | null
          target_contact_types?: string[] | null
          target_tags?: string[] | null
          total_conversions?: number | null
          total_engagement?: number | null
          total_posts?: number | null
          total_reach?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_channels: {
        Row: {
          created_at: string | null
          credentials: Json | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          credentials?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          credentials?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_channels_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      media_library: {
        Row: {
          created_at: string | null
          description: string | null
          duration: number | null
          file_name: string
          file_size: number | null
          file_type: string
          file_url: string
          folder: string | null
          height: number | null
          id: string
          last_used_at: string | null
          mime_type: string | null
          organization_id: string | null
          source_platform: string | null
          source_post_id: string | null
          source_type: string | null
          source_url: string | null
          tags: string[] | null
          updated_at: string | null
          uploaded_by: string | null
          usage_count: number | null
          width: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration?: number | null
          file_name: string
          file_size?: number | null
          file_type: string
          file_url: string
          folder?: string | null
          height?: number | null
          id?: string
          last_used_at?: string | null
          mime_type?: string | null
          organization_id?: string | null
          source_platform?: string | null
          source_post_id?: string | null
          source_type?: string | null
          source_url?: string | null
          tags?: string[] | null
          updated_at?: string | null
          uploaded_by?: string | null
          usage_count?: number | null
          width?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration?: number | null
          file_name?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          folder?: string | null
          height?: number | null
          id?: string
          last_used_at?: string | null
          mime_type?: string | null
          organization_id?: string | null
          source_platform?: string | null
          source_post_id?: string | null
          source_type?: string | null
          source_url?: string | null
          tags?: string[] | null
          updated_at?: string | null
          uploaded_by?: string | null
          usage_count?: number | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_library_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_notes: {
        Row: {
          action_items: Json | null
          ai_summary: string | null
          attendees: string[] | null
          created_at: string | null
          created_by: string | null
          deal_id: string | null
          external_attendees: string[] | null
          id: string
          meeting_date: string
          meeting_title: string
          meeting_type: string | null
          next_meeting_scheduled: string | null
          notes: string | null
          organization_id: string | null
        }
        Insert: {
          action_items?: Json | null
          ai_summary?: string | null
          attendees?: string[] | null
          created_at?: string | null
          created_by?: string | null
          deal_id?: string | null
          external_attendees?: string[] | null
          id?: string
          meeting_date: string
          meeting_title: string
          meeting_type?: string | null
          next_meeting_scheduled?: string | null
          notes?: string | null
          organization_id?: string | null
        }
        Update: {
          action_items?: Json | null
          ai_summary?: string | null
          attendees?: string[] | null
          created_at?: string | null
          created_by?: string | null
          deal_id?: string | null
          external_attendees?: string[] | null
          id?: string
          meeting_date?: string
          meeting_title?: string
          meeting_type?: string | null
          next_meeting_scheduled?: string | null
          notes?: string | null
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_notes_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_notes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_categories: {
        Row: {
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          restaurant_id: string
          sort_order: number | null
        }
        Insert: {
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          restaurant_id: string
          sort_order?: number | null
        }
        Update: {
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          restaurant_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_categories_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          allergens: Json | null
          category_id: string | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean | null
          is_vegan: boolean | null
          is_vegetarian: boolean | null
          name: string
          organization_id: string
          price: number
          restaurant_id: string
          sort_order: number | null
        }
        Insert: {
          allergens?: Json | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          is_vegan?: boolean | null
          is_vegetarian?: boolean | null
          name: string
          organization_id: string
          price: number
          restaurant_id: string
          sort_order?: number | null
        }
        Update: {
          allergens?: Json | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          is_vegan?: boolean | null
          is_vegetarian?: boolean | null
          name?: string
          organization_id?: string
          price?: number
          restaurant_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      module_registry: {
        Row: {
          created_at: string | null
          description: string | null
          display_name: string
          id: string
          is_active: boolean | null
          min_tier: string
          routes: string[]
          tables: string[]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_name: string
          id: string
          is_active?: boolean | null
          min_tier?: string
          routes?: string[]
          tables?: string[]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          min_tier?: string
          routes?: string[]
          tables?: string[]
          updated_at?: string | null
        }
        Relationships: []
      }
      n8n_webhooks: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
          organization_id: string | null
          total_calls: number | null
          webhook_secret: string | null
          webhook_type: string
          webhook_url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          organization_id?: string | null
          total_calls?: number | null
          webhook_secret?: string | null
          webhook_type: string
          webhook_url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          organization_id?: string | null
          total_calls?: number | null
          webhook_secret?: string | null
          webhook_type?: string
          webhook_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "n8n_webhooks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_checklist: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          id: string
          is_completed: boolean | null
          notes: string | null
          organization_id: string | null
          step_name: string
          step_order: number
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          notes?: string | null
          organization_id?: string | null
          step_name: string
          step_order: number
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          notes?: string | null
          organization_id?: string | null
          step_name?: string
          step_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_checklist_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_progress: {
        Row: {
          brand_voice_completed_at: string | null
          created_at: string
          day0_completed_at: string | null
          day1_email_sent_at: string | null
          day2_email_sent_at: string | null
          day3_email_sent_at: string | null
          drift_flags: string[]
          id: string
          kickoff_call_scheduled_at: string | null
          kickoff_call_url: string | null
          organization_id: string
          steps_completed: string[]
          timer_start_day: string | null
          timer_started_at: string | null
          updated_at: string
        }
        Insert: {
          brand_voice_completed_at?: string | null
          created_at?: string
          day0_completed_at?: string | null
          day1_email_sent_at?: string | null
          day2_email_sent_at?: string | null
          day3_email_sent_at?: string | null
          drift_flags?: string[]
          id?: string
          kickoff_call_scheduled_at?: string | null
          kickoff_call_url?: string | null
          organization_id: string
          steps_completed?: string[]
          timer_start_day?: string | null
          timer_started_at?: string | null
          updated_at?: string
        }
        Update: {
          brand_voice_completed_at?: string | null
          created_at?: string
          day0_completed_at?: string | null
          day1_email_sent_at?: string | null
          day2_email_sent_at?: string | null
          day3_email_sent_at?: string | null
          drift_flags?: string[]
          id?: string
          kickoff_call_scheduled_at?: string | null
          kickoff_call_url?: string | null
          organization_id?: string
          steps_completed?: string[]
          timer_start_day?: string | null
          timer_started_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_progress_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_activity_log: {
        Row: {
          created_at: string | null
          details: Json | null
          event_type: string
          id: string
          ops_lead_id: string | null
          provisioning_job_id: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          event_type: string
          id?: string
          ops_lead_id?: string | null
          provisioning_job_id?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          event_type?: string
          id?: string
          ops_lead_id?: string | null
          provisioning_job_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ops_activity_log_ops_lead_id_fkey"
            columns: ["ops_lead_id"]
            isOneToOne: false
            referencedRelation: "ops_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ops_activity_log_provisioning_job_id_fkey"
            columns: ["provisioning_job_id"]
            isOneToOne: false
            referencedRelation: "provisioning_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_leads: {
        Row: {
          business_issues: string[] | null
          business_name: string | null
          conversation_state: string
          created_at: string | null
          email: string | null
          id: string
          industry: string | null
          phone_number: string
          qualification_result: Json | null
          qualification_status: string
          telegram_message_id: string | null
          updated_at: string | null
          wa_message_id: string | null
          website: string | null
        }
        Insert: {
          business_issues?: string[] | null
          business_name?: string | null
          conversation_state?: string
          created_at?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          phone_number: string
          qualification_result?: Json | null
          qualification_status?: string
          telegram_message_id?: string | null
          updated_at?: string | null
          wa_message_id?: string | null
          website?: string | null
        }
        Update: {
          business_issues?: string[] | null
          business_name?: string | null
          conversation_state?: string
          created_at?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          phone_number?: string
          qualification_result?: Json | null
          qualification_status?: string
          telegram_message_id?: string | null
          updated_at?: string | null
          wa_message_id?: string | null
          website?: string | null
        }
        Relationships: []
      }
      org_members: {
        Row: {
          created_at: string | null
          dg_license: boolean | null
          display_name: string
          id: string
          invited_at: string | null
          is_active: boolean | null
          joined_at: string | null
          org_id: string
          ph_license_expiry: string | null
          ph_license_number: string | null
          ph_license_province: string | null
          phone: string | null
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          dg_license?: boolean | null
          display_name: string
          id?: string
          invited_at?: string | null
          is_active?: boolean | null
          joined_at?: string | null
          org_id: string
          ph_license_expiry?: string | null
          ph_license_number?: string | null
          ph_license_province?: string | null
          phone?: string | null
          role: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          dg_license?: boolean | null
          display_name?: string
          id?: string
          invited_at?: string | null
          is_active?: boolean | null
          joined_at?: string | null
          org_id?: string
          ph_license_expiry?: string | null
          ph_license_number?: string | null
          ph_license_province?: string | null
          phone?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_integrations: {
        Row: {
          configuration: Json
          created_at: string | null
          id: string
          integration_id: string | null
          is_enabled: boolean | null
          last_sync_at: string | null
          organization_id: string
          sync_status: string | null
          updated_at: string | null
        }
        Insert: {
          configuration: Json
          created_at?: string | null
          id?: string
          integration_id?: string | null
          is_enabled?: boolean | null
          last_sync_at?: string | null
          organization_id: string
          sync_status?: string | null
          updated_at?: string | null
        }
        Update: {
          configuration?: Json
          created_at?: string | null
          id?: string
          integration_id?: string | null
          is_enabled?: boolean | null
          last_sync_at?: string | null
          organization_id?: string
          sync_status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_integrations_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integration_marketplace"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_integrations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_users: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          organization_id: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          account_manager_id: string | null
          archived_at: string | null
          billing_plan_snapshot: Json | null
          branding: Json | null
          business_type: string | null
          created_at: string | null
          custom_domain: string | null
          external_db_config: Json | null
          id: string
          industry: string | null
          is_active: boolean | null
          limits: Json | null
          linked_trophy_org_id: string | null
          monthly_cost: number | null
          name: string
          notes: string | null
          onboarding_completed_at: string | null
          onboarding_status: string | null
          organization_type: string | null
          package_id: string | null
          parent_organization_id: string | null
          payfast_subscription_token: string | null
          plan_id: string | null
          settings: Json | null
          slug: string | null
          subdomain: string | null
          subscription_status: string | null
          subscription_tier: string | null
          trial_ends_at: string | null
          updated_at: string | null
        }
        Insert: {
          account_manager_id?: string | null
          archived_at?: string | null
          billing_plan_snapshot?: Json | null
          branding?: Json | null
          business_type?: string | null
          created_at?: string | null
          custom_domain?: string | null
          external_db_config?: Json | null
          id?: string
          industry?: string | null
          is_active?: boolean | null
          limits?: Json | null
          linked_trophy_org_id?: string | null
          monthly_cost?: number | null
          name: string
          notes?: string | null
          onboarding_completed_at?: string | null
          onboarding_status?: string | null
          organization_type?: string | null
          package_id?: string | null
          parent_organization_id?: string | null
          payfast_subscription_token?: string | null
          plan_id?: string | null
          settings?: Json | null
          slug?: string | null
          subdomain?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Update: {
          account_manager_id?: string | null
          archived_at?: string | null
          billing_plan_snapshot?: Json | null
          branding?: Json | null
          business_type?: string | null
          created_at?: string | null
          custom_domain?: string | null
          external_db_config?: Json | null
          id?: string
          industry?: string | null
          is_active?: boolean | null
          limits?: Json | null
          linked_trophy_org_id?: string | null
          monthly_cost?: number | null
          name?: string
          notes?: string | null
          onboarding_completed_at?: string | null
          onboarding_status?: string | null
          organization_type?: string | null
          package_id?: string | null
          parent_organization_id?: string | null
          payfast_subscription_token?: string | null
          plan_id?: string | null
          settings?: Json | null
          slug?: string | null
          subdomain?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_organizations_linked_trophy_org"
            columns: ["linked_trophy_org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_parent_organization_id_fkey"
            columns: ["parent_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "billing_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      orgs: {
        Row: {
          created_at: string | null
          dea_registration: string | null
          email: string | null
          id: string
          logo_url: string | null
          name: string
          owner_id: string | null
          payfast_subscription_id: string | null
          phasa_number: string | null
          physical_address: Json | null
          primary_phone: string | null
          province: string | null
          settings: Json | null
          slug: string
          subscription_status: string | null
          subscription_tier: string | null
          trial_ends_at: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          dea_registration?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          owner_id?: string | null
          payfast_subscription_id?: string | null
          phasa_number?: string | null
          physical_address?: Json | null
          primary_phone?: string | null
          province?: string | null
          settings?: Json | null
          slug: string
          subscription_status?: string | null
          subscription_tier?: string | null
          trial_ends_at?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          dea_registration?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string | null
          payfast_subscription_id?: string | null
          phasa_number?: string | null
          physical_address?: Json | null
          primary_phone?: string | null
          province?: string | null
          settings?: Json | null
          slug?: string
          subscription_status?: string | null
          subscription_tier?: string | null
          trial_ends_at?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      os_assistant_conversations: {
        Row: {
          created_at: string
          id: string
          messages: Json
          metadata: Json | null
          model_used: string | null
          session_id: string
          summary: string | null
          token_count: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          messages?: Json
          metadata?: Json | null
          model_used?: string | null
          session_id: string
          summary?: string | null
          token_count?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          messages?: Json
          metadata?: Json | null
          model_used?: string | null
          session_id?: string
          summary?: string | null
          token_count?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      os_assistant_memory: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          key: string
          metadata: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          id?: string
          key: string
          metadata?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          key?: string
          metadata?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      os_assistant_tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          metadata: Json | null
          priority: string
          reminder_at: string | null
          source: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          metadata?: Json | null
          priority?: string
          reminder_at?: string | null
          source?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          metadata?: Json | null
          priority?: string
          reminder_at?: string | null
          source?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      packages: {
        Row: {
          created_at: string | null
          features: Json | null
          id: string
          max_customers: number | null
          max_leads: number | null
          max_users: number | null
          name: string
          price_monthly: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          features?: Json | null
          id?: string
          max_customers?: number | null
          max_leads?: number | null
          max_users?: number | null
          name: string
          price_monthly?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          features?: Json | null
          id?: string
          max_customers?: number | null
          max_leads?: number | null
          max_users?: number | null
          name?: string
          price_monthly?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      permits: {
        Row: {
          client_id: string | null
          created_at: string | null
          document_url: string | null
          expiry_date: string | null
          id: string
          issued_date: string | null
          issuing_authority: string | null
          notes: string | null
          org_id: string
          permit_number: string
          permit_type: string
          safari_id: string | null
          species_id: string | null
          status: string | null
          trophy_id: string | null
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          document_url?: string | null
          expiry_date?: string | null
          id?: string
          issued_date?: string | null
          issuing_authority?: string | null
          notes?: string | null
          org_id: string
          permit_number: string
          permit_type: string
          safari_id?: string | null
          species_id?: string | null
          status?: string | null
          trophy_id?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          document_url?: string | null
          expiry_date?: string | null
          id?: string
          issued_date?: string | null
          issuing_authority?: string | null
          notes?: string | null
          org_id?: string
          permit_number?: string
          permit_type?: string
          safari_id?: string | null
          species_id?: string | null
          status?: string | null
          trophy_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "permits_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "safari_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permits_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permits_safari_id_fkey"
            columns: ["safari_id"]
            isOneToOne: false
            referencedRelation: "safaris"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permits_species_id_fkey"
            columns: ["species_id"]
            isOneToOne: false
            referencedRelation: "species"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permits_trophy_id_fkey"
            columns: ["trophy_id"]
            isOneToOne: false
            referencedRelation: "trophies"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          automation_triggers: Json | null
          created_at: string | null
          id: string
          is_lost: boolean | null
          is_won: boolean | null
          organization_id: string | null
          probability: number | null
          required_fields: string[] | null
          stage_name: string
          stage_order: number
        }
        Insert: {
          automation_triggers?: Json | null
          created_at?: string | null
          id?: string
          is_lost?: boolean | null
          is_won?: boolean | null
          organization_id?: string | null
          probability?: number | null
          required_fields?: string[] | null
          stage_name: string
          stage_order: number
        }
        Update: {
          automation_triggers?: Json | null
          created_at?: string | null
          id?: string
          is_lost?: boolean | null
          is_won?: boolean | null
          organization_id?: string | null
          probability?: number | null
          required_fields?: string[] | null
          stage_name?: string
          stage_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_activity_log: {
        Row: {
          action: string
          actor: string | null
          created_at: string | null
          details: Json | null
          id: string
        }
        Insert: {
          action: string
          actor?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
        }
        Update: {
          action?: string
          actor?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
        }
        Relationships: []
      }
      platform_metrics: {
        Row: {
          comments: number | null
          created_at: string | null
          engagement_rate: number | null
          fetched_at: string | null
          id: string
          impressions: number | null
          likes: number | null
          organization_id: string
          platform: string
          reach: number | null
          shares: number | null
          social_post_id: string | null
          total_engagements: number | null
        }
        Insert: {
          comments?: number | null
          created_at?: string | null
          engagement_rate?: number | null
          fetched_at?: string | null
          id?: string
          impressions?: number | null
          likes?: number | null
          organization_id: string
          platform: string
          reach?: number | null
          shares?: number | null
          social_post_id?: string | null
          total_engagements?: number | null
        }
        Update: {
          comments?: number | null
          created_at?: string | null
          engagement_rate?: number | null
          fetched_at?: string | null
          id?: string
          impressions?: number | null
          likes?: number | null
          organization_id?: string
          platform?: string
          reach?: number | null
          shares?: number | null
          social_post_id?: string | null
          total_engagements?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_metrics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_metrics_social_post_id_fkey"
            columns: ["social_post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_posting_templates: {
        Row: {
          content_structure: Json
          created_at: string | null
          id: string
          is_default: boolean | null
          optimal_posting_times: Json | null
          organization_id: string | null
          platform_id: string | null
          template_name: string
        }
        Insert: {
          content_structure: Json
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          optimal_posting_times?: Json | null
          organization_id?: string | null
          platform_id?: string | null
          template_name: string
        }
        Update: {
          content_structure?: Json
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          optimal_posting_times?: Json | null
          organization_id?: string | null
          platform_id?: string | null
          template_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_posting_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_posting_templates_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "social_platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      post_analytics: {
        Row: {
          click_through_rate: number | null
          clicks_count: number | null
          comments_count: number | null
          created_at: string | null
          engagement_rate: number | null
          id: string
          impressions: number | null
          likes_count: number | null
          metric_date: string
          platform_metrics: Json | null
          post_id: string
          reach: number | null
          saves_count: number | null
          shares_count: number | null
          social_account_id: string
          video_completion_rate: number | null
          video_views: number | null
        }
        Insert: {
          click_through_rate?: number | null
          clicks_count?: number | null
          comments_count?: number | null
          created_at?: string | null
          engagement_rate?: number | null
          id?: string
          impressions?: number | null
          likes_count?: number | null
          metric_date: string
          platform_metrics?: Json | null
          post_id: string
          reach?: number | null
          saves_count?: number | null
          shares_count?: number | null
          social_account_id: string
          video_completion_rate?: number | null
          video_views?: number | null
        }
        Update: {
          click_through_rate?: number | null
          clicks_count?: number | null
          comments_count?: number | null
          created_at?: string | null
          engagement_rate?: number | null
          id?: string
          impressions?: number | null
          likes_count?: number | null
          metric_date?: string
          platform_metrics?: Json | null
          post_id?: string
          reach?: number | null
          saves_count?: number | null
          shares_count?: number | null
          social_account_id?: string
          video_completion_rate?: number | null
          video_views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "post_analytics_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_analytics_social_account_id_fkey"
            columns: ["social_account_id"]
            isOneToOne: false
            referencedRelation: "social_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_metrics: {
        Row: {
          clicks: number | null
          comments: number | null
          engagement_rate: number | null
          id: string
          impressions: number | null
          likes: number | null
          post_id: string | null
          recorded_at: string | null
          shares: number | null
        }
        Insert: {
          clicks?: number | null
          comments?: number | null
          engagement_rate?: number | null
          id?: string
          impressions?: number | null
          likes?: number | null
          post_id?: string | null
          recorded_at?: string | null
          shares?: number | null
        }
        Update: {
          clicks?: number | null
          comments?: number | null
          engagement_rate?: number | null
          id?: string
          impressions?: number | null
          likes?: number | null
          post_id?: string | null
          recorded_at?: string | null
          shares?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "post_metrics_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "campaign_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posting_schedules: {
        Row: {
          auto_schedule_enabled: boolean | null
          avg_engagement_rate: number | null
          created_at: string | null
          day_of_week: number | null
          id: string
          is_active: boolean | null
          last_performance_update: string | null
          name: string
          organization_id: string
          social_account_id: string | null
          time_of_day: string | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          auto_schedule_enabled?: boolean | null
          avg_engagement_rate?: number | null
          created_at?: string | null
          day_of_week?: number | null
          id?: string
          is_active?: boolean | null
          last_performance_update?: string | null
          name: string
          organization_id: string
          social_account_id?: string | null
          time_of_day?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          auto_schedule_enabled?: boolean | null
          avg_engagement_rate?: number | null
          created_at?: string | null
          day_of_week?: number | null
          id?: string
          is_active?: boolean | null
          last_performance_update?: string | null
          name?: string
          organization_id?: string
          social_account_id?: string | null
          time_of_day?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posting_schedules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posting_schedules_social_account_id_fkey"
            columns: ["social_account_id"]
            isOneToOne: false
            referencedRelation: "social_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          comments: number | null
          contact_id: string | null
          content: string
          created_at: string | null
          created_by: string | null
          engagement_rate: number | null
          hashtags: string[] | null
          id: string
          impressions: number | null
          likes: number | null
          media_urls: string[] | null
          organization_id: string
          platform_post_ids: Json | null
          platforms: string[]
          published_at: string | null
          rejection_reason: string | null
          requires_approval: boolean | null
          scheduled_for: string | null
          shares: number | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          comments?: number | null
          contact_id?: string | null
          content: string
          created_at?: string | null
          created_by?: string | null
          engagement_rate?: number | null
          hashtags?: string[] | null
          id?: string
          impressions?: number | null
          likes?: number | null
          media_urls?: string[] | null
          organization_id: string
          platform_post_ids?: Json | null
          platforms: string[]
          published_at?: string | null
          rejection_reason?: string | null
          requires_approval?: boolean | null
          scheduled_for?: string | null
          shares?: number | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          comments?: number | null
          contact_id?: string | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          engagement_rate?: number | null
          hashtags?: string[] | null
          id?: string
          impressions?: number | null
          likes?: number | null
          media_urls?: string[] | null
          organization_id?: string
          platform_post_ids?: Json | null
          platforms?: string[]
          published_at?: string | null
          rejection_reason?: string | null
          requires_approval?: boolean | null
          scheduled_for?: string | null
          shares?: number | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_changelog: {
        Row: {
          changed_at: string
          changed_by: string | null
          entity_id: string
          entity_type: string
          id: string
          new_value: Json
          old_value: Json
          reason: string | null
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          entity_id: string
          entity_type: string
          id?: string
          new_value: Json
          old_value: Json
          reason?: string | null
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          new_value?: Json
          old_value?: Json
          reason?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          base_price: number | null
          billing_frequency: string | null
          created_at: string | null
          description: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          organization_id: string | null
          product_name: string
          product_type: string | null
          recurring_price: number | null
        }
        Insert: {
          base_price?: number | null
          billing_frequency?: string | null
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          product_name: string
          product_type?: string | null
          recurring_price?: number | null
        }
        Update: {
          base_price?: number | null
          billing_frequency?: string | null
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          product_name?: string
          product_type?: string | null
          recurring_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      provisioning_jobs: {
        Row: {
          created_at: string | null
          created_resources: Json | null
          current_step: string | null
          error_message: string | null
          id: string
          ops_lead_id: string | null
          status: string
          steps_completed: string[] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_resources?: Json | null
          current_step?: string | null
          error_message?: string | null
          id?: string
          ops_lead_id?: string | null
          status?: string
          steps_completed?: string[] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_resources?: Json | null
          current_step?: string | null
          error_message?: string | null
          id?: string
          ops_lead_id?: string | null
          status?: string
          steps_completed?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provisioning_jobs_ops_lead_id_fkey"
            columns: ["ops_lead_id"]
            isOneToOne: false
            referencedRelation: "ops_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      quotas: {
        Row: {
          allocated: number
          area_id: string | null
          created_at: string | null
          dea_permit_expiry: string | null
          dea_permit_number: string | null
          id: string
          notes: string | null
          org_id: string
          quota_type: string
          species_id: string
          taken: number
          updated_at: string | null
          warning_threshold: number | null
          year: number
        }
        Insert: {
          allocated?: number
          area_id?: string | null
          created_at?: string | null
          dea_permit_expiry?: string | null
          dea_permit_number?: string | null
          id?: string
          notes?: string | null
          org_id: string
          quota_type: string
          species_id: string
          taken?: number
          updated_at?: string | null
          warning_threshold?: number | null
          year: number
        }
        Update: {
          allocated?: number
          area_id?: string | null
          created_at?: string | null
          dea_permit_expiry?: string | null
          dea_permit_number?: string | null
          id?: string
          notes?: string | null
          org_id?: string
          quota_type?: string
          species_id?: string
          taken?: number
          updated_at?: string | null
          warning_threshold?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotas_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotas_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotas_species_id_fkey"
            columns: ["species_id"]
            isOneToOne: false
            referencedRelation: "species"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          accepted_at: string | null
          contact_id: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          deal_id: string | null
          discount_amount: number | null
          id: string
          line_items: Json | null
          notes: string | null
          organization_id: string | null
          quote_name: string
          quote_number: string
          quote_status: string | null
          sent_at: string | null
          subtotal: number | null
          tax_amount: number | null
          terms_conditions: string | null
          total_amount: number | null
          updated_at: string | null
          valid_until: string | null
          viewed_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          deal_id?: string | null
          discount_amount?: number | null
          id?: string
          line_items?: Json | null
          notes?: string | null
          organization_id?: string | null
          quote_name: string
          quote_number: string
          quote_status?: string | null
          sent_at?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          terms_conditions?: string | null
          total_amount?: number | null
          updated_at?: string | null
          valid_until?: string | null
          viewed_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          deal_id?: string | null
          discount_amount?: number | null
          id?: string
          line_items?: Json | null
          notes?: string | null
          organization_id?: string | null
          quote_name?: string
          quote_number?: string
          quote_status?: string | null
          sent_at?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          terms_conditions?: string | null
          total_amount?: number | null
          updated_at?: string | null
          valid_until?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          completed_at: string | null
          created_at: string | null
          description: string | null
          due_date: string
          id: string
          is_completed: boolean | null
          organization_id: string | null
          related_to_id: string | null
          related_to_type: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date: string
          id?: string
          is_completed?: boolean | null
          organization_id?: string | null
          related_to_id?: string | null
          related_to_type?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string
          id?: string
          is_completed?: boolean | null
          organization_id?: string | null
          related_to_id?: string | null
          related_to_type?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reminders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          confirmation_sent: boolean | null
          contact_id: string | null
          created_at: string | null
          dietary_notes: string | null
          id: string
          organization_id: string
          party_size: number
          reminder_sent: boolean | null
          reservation_date: string
          reservation_time: string
          restaurant_id: string
          source: string | null
          special_requests: string | null
          status: string | null
          table_id: string | null
          whatsapp_number: string | null
        }
        Insert: {
          confirmation_sent?: boolean | null
          contact_id?: string | null
          created_at?: string | null
          dietary_notes?: string | null
          id?: string
          organization_id: string
          party_size: number
          reminder_sent?: boolean | null
          reservation_date: string
          reservation_time: string
          restaurant_id: string
          source?: string | null
          special_requests?: string | null
          status?: string | null
          table_id?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          confirmation_sent?: boolean | null
          contact_id?: string | null
          created_at?: string | null
          dietary_notes?: string | null
          id?: string
          organization_id?: string
          party_size?: number
          reminder_sent?: boolean | null
          reservation_date?: string
          reservation_time?: string
          restaurant_id?: string
          source?: string | null
          special_requests?: string | null
          status?: string | null
          table_id?: string | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_checklist_instances: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          due_at: string | null
          id: string
          organization_id: string
          shift_date: string
          status: string | null
          template_id: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          due_at?: string | null
          id?: string
          organization_id: string
          shift_date: string
          status?: string | null
          template_id: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          due_at?: string | null
          id?: string
          organization_id?: string
          shift_date?: string
          status?: string | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_checklist_instances_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "restaurant_staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_checklist_instances_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "restaurant_staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_checklist_instances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_checklist_instances_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "restaurant_checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_checklist_items: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          id: string
          instance_id: string
          is_completed: boolean | null
          item_label: string
          notes: string | null
          organization_id: string
          photo_url: string | null
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          id?: string
          instance_id: string
          is_completed?: boolean | null
          item_label: string
          notes?: string | null
          organization_id: string
          photo_url?: string | null
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          id?: string
          instance_id?: string
          is_completed?: boolean | null
          item_label?: string
          notes?: string | null
          organization_id?: string
          photo_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_checklist_items_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "restaurant_staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_checklist_items_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "restaurant_checklist_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_checklist_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_checklist_templates: {
        Row: {
          assigned_role: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          items: Json
          name: string
          organization_id: string
          restaurant_id: string
          type: string
        }
        Insert: {
          assigned_role?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          items?: Json
          name: string
          organization_id: string
          restaurant_id: string
          type: string
        }
        Update: {
          assigned_role?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          items?: Json
          name?: string
          organization_id?: string
          restaurant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_checklist_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_checklist_templates_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_equipment: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          location: string | null
          max_temp: number | null
          min_temp: number | null
          name: string
          organization_id: string
          restaurant_id: string
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          max_temp?: number | null
          min_temp?: number | null
          name: string
          organization_id: string
          restaurant_id: string
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          max_temp?: number | null
          min_temp?: number | null
          name?: string
          organization_id?: string
          restaurant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_equipment_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_equipment_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_floor_plans: {
        Row: {
          background_image_url: string | null
          canvas_height: number
          canvas_width: number
          created_at: string
          id: string
          is_default: boolean
          name: string
          organization_id: string
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          background_image_url?: string | null
          canvas_height?: number
          canvas_width?: number
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          organization_id: string
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          background_image_url?: string | null
          canvas_height?: number
          canvas_width?: number
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          organization_id?: string
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_floor_plans_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_floor_plans_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_menu_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          restaurant_id: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          restaurant_id: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          restaurant_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_menu_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_menu_categories_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_menu_items: {
        Row: {
          category_id: string
          created_at: string | null
          description: string | null
          dietary_tags: string[] | null
          id: string
          image_url: string | null
          is_available: boolean | null
          name: string
          organization_id: string
          price: number
          sort_order: number | null
        }
        Insert: {
          category_id: string
          created_at?: string | null
          description?: string | null
          dietary_tags?: string[] | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          name: string
          organization_id: string
          price: number
          sort_order?: number | null
        }
        Update: {
          category_id?: string
          created_at?: string | null
          description?: string | null
          dietary_tags?: string[] | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          name?: string
          organization_id?: string
          price?: number
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "restaurant_menu_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_menu_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_reservations: {
        Row: {
          contact_id: string | null
          created_at: string | null
          guest_email: string | null
          guest_name: string
          guest_phone: string | null
          id: string
          organization_id: string
          party_size: number
          reminder_sent: boolean | null
          reservation_date: string
          reservation_time: string
          restaurant_id: string
          special_requests: string | null
          status: string | null
        }
        Insert: {
          contact_id?: string | null
          created_at?: string | null
          guest_email?: string | null
          guest_name: string
          guest_phone?: string | null
          id?: string
          organization_id: string
          party_size?: number
          reminder_sent?: boolean | null
          reservation_date: string
          reservation_time: string
          restaurant_id: string
          special_requests?: string | null
          status?: string | null
        }
        Update: {
          contact_id?: string | null
          created_at?: string | null
          guest_email?: string | null
          guest_name?: string
          guest_phone?: string | null
          id?: string
          organization_id?: string
          party_size?: number
          reminder_sent?: boolean | null
          reservation_date?: string
          reservation_time?: string
          restaurant_id?: string
          special_requests?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_reservations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_reservations_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_shifts: {
        Row: {
          break_minutes: number | null
          created_at: string | null
          end_time: string
          id: string
          notes: string | null
          organization_id: string
          restaurant_id: string
          shift_date: string
          staff_id: string
          start_time: string
          status: string | null
        }
        Insert: {
          break_minutes?: number | null
          created_at?: string | null
          end_time: string
          id?: string
          notes?: string | null
          organization_id: string
          restaurant_id: string
          shift_date: string
          staff_id: string
          start_time: string
          status?: string | null
        }
        Update: {
          break_minutes?: number | null
          created_at?: string | null
          end_time?: string
          id?: string
          notes?: string | null
          organization_id?: string
          restaurant_id?: string
          shift_date?: string
          staff_id?: string
          start_time?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_shifts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_shifts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_shifts_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "restaurant_staff_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_sop_acknowledgments: {
        Row: {
          acknowledged_at: string | null
          id: string
          organization_id: string
          sop_id: string
          staff_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          id?: string
          organization_id: string
          sop_id: string
          staff_id: string
        }
        Update: {
          acknowledged_at?: string | null
          id?: string
          organization_id?: string
          sop_id?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_sop_acknowledgments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_sop_acknowledgments_sop_id_fkey"
            columns: ["sop_id"]
            isOneToOne: false
            referencedRelation: "restaurant_sops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_sop_acknowledgments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "restaurant_staff_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_sop_block_responses: {
        Row: {
          block_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          instance_id: string
          organization_id: string
          response_data: Json
          status: string
        }
        Insert: {
          block_id: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          instance_id: string
          organization_id: string
          response_data?: Json
          status?: string
        }
        Update: {
          block_id?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          instance_id?: string
          organization_id?: string
          response_data?: Json
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_sop_block_responses_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "restaurant_sop_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_sop_block_responses_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "restaurant_sop_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_sop_blocks: {
        Row: {
          block_type: string
          config: Json
          created_at: string
          description: string | null
          id: string
          is_required: boolean
          label: string
          organization_id: string
          sop_id: string
          sort_order: number
        }
        Insert: {
          block_type: string
          config?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_required?: boolean
          label: string
          organization_id: string
          sop_id: string
          sort_order?: number
        }
        Update: {
          block_type?: string
          config?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_required?: boolean
          label?: string
          organization_id?: string
          sop_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_sop_blocks_sop_id_fkey"
            columns: ["sop_id"]
            isOneToOne: false
            referencedRelation: "restaurant_sops"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_sop_instances: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          organization_id: string
          restaurant_id: string
          shift_date: string
          sop_id: string
          started_at: string | null
          status: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          organization_id: string
          restaurant_id: string
          shift_date?: string
          sop_id: string
          started_at?: string | null
          status?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          restaurant_id?: string
          shift_date?: string
          sop_id?: string
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_sop_instances_sop_id_fkey"
            columns: ["sop_id"]
            isOneToOne: false
            referencedRelation: "restaurant_sops"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_sops: {
        Row: {
          category: string | null
          content: string
          created_at: string | null
          id: string
          is_published: boolean | null
          organization_id: string
          restaurant_id: string
          sop_format: string
          title: string
          updated_at: string | null
          visible_to_roles: string[] | null
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          organization_id: string
          restaurant_id: string
          sop_format?: string
          title: string
          updated_at?: string | null
          visible_to_roles?: string[] | null
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          organization_id?: string
          restaurant_id?: string
          sop_format?: string
          title?: string
          updated_at?: string | null
          visible_to_roles?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_sops_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_sops_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_staff: {
        Row: {
          created_at: string | null
          display_name: string
          employment_type: string | null
          hourly_rate: number | null
          id: string
          is_active: boolean | null
          organization_id: string
          phone: string | null
          pin_hash: string | null
          restaurant_id: string | null
          role: string
          telegram_chat_id: string | null
          user_id: string | null
          whatsapp_number: string | null
        }
        Insert: {
          created_at?: string | null
          display_name: string
          employment_type?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          organization_id: string
          phone?: string | null
          pin_hash?: string | null
          restaurant_id?: string | null
          role: string
          telegram_chat_id?: string | null
          user_id?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: string
          employment_type?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          organization_id?: string
          phone?: string | null
          pin_hash?: string | null
          restaurant_id?: string | null
          role?: string
          telegram_chat_id?: string | null
          user_id?: string | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_staff_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_staff_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_staff_profiles: {
        Row: {
          created_at: string | null
          employment_type: string | null
          hourly_rate: number | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          phone: string | null
          restaurant_id: string
          role: string
          telegram_chat_id: string | null
          user_id: string | null
          whatsapp_number: string | null
        }
        Insert: {
          created_at?: string | null
          employment_type?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          phone?: string | null
          restaurant_id: string
          role: string
          telegram_chat_id?: string | null
          user_id?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          created_at?: string | null
          employment_type?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          phone?: string | null
          restaurant_id?: string
          role?: string
          telegram_chat_id?: string | null
          user_id?: string | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_staff_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_staff_profiles_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_table_groups: {
        Row: {
          combined_capacity: number
          created_at: string
          id: string
          is_active: boolean
          name: string
          organization_id: string
          restaurant_id: string
        }
        Insert: {
          combined_capacity?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          restaurant_id: string
        }
        Update: {
          combined_capacity?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_table_groups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_table_groups_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_tables: {
        Row: {
          capacity: number | null
          created_at: string | null
          floor_plan_id: string | null
          height: number | null
          id: string
          is_active: boolean | null
          label: string
          linked_group_id: string | null
          organization_id: string
          qr_code_url: string | null
          qr_token: string
          restaurant_id: string
          rotation: number | null
          section: string | null
          shape: string | null
          width: number | null
          x_pos: number | null
          y_pos: number | null
        }
        Insert: {
          capacity?: number | null
          created_at?: string | null
          floor_plan_id?: string | null
          height?: number | null
          id?: string
          is_active?: boolean | null
          label: string
          linked_group_id?: string | null
          organization_id: string
          qr_code_url?: string | null
          qr_token?: string
          restaurant_id: string
          rotation?: number | null
          section?: string | null
          shape?: string | null
          width?: number | null
          x_pos?: number | null
          y_pos?: number | null
        }
        Update: {
          capacity?: number | null
          created_at?: string | null
          floor_plan_id?: string | null
          height?: number | null
          id?: string
          is_active?: boolean | null
          label?: string
          linked_group_id?: string | null
          organization_id?: string
          qr_code_url?: string | null
          qr_token?: string
          restaurant_id?: string
          rotation?: number | null
          section?: string | null
          shape?: string | null
          width?: number | null
          x_pos?: number | null
          y_pos?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_table_linked_group"
            columns: ["linked_group_id"]
            isOneToOne: false
            referencedRelation: "restaurant_table_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_tables_floor_plan_id_fkey"
            columns: ["floor_plan_id"]
            isOneToOne: false
            referencedRelation: "restaurant_floor_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_tables_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_tables_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_temperature_logs: {
        Row: {
          corrective_action: string | null
          equipment_id: string
          id: string
          is_in_range: boolean
          organization_id: string
          recorded_at: string | null
          recorded_by: string | null
          temperature: number
        }
        Insert: {
          corrective_action?: string | null
          equipment_id: string
          id?: string
          is_in_range: boolean
          organization_id: string
          recorded_at?: string | null
          recorded_by?: string | null
          temperature: number
        }
        Update: {
          corrective_action?: string | null
          equipment_id?: string
          id?: string
          is_in_range?: boolean
          organization_id?: string
          recorded_at?: string | null
          recorded_by?: string | null
          temperature?: number
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_temperature_logs_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "restaurant_equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_temperature_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_temperature_logs_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "restaurant_staff_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          address: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          payfast_merchant_id: string | null
          payfast_merchant_key: string | null
          payfast_passphrase: string | null
          phone: string | null
          service_charge_pct: number | null
          settings: Json | null
          slug: string | null
          telegram_bot_token: string | null
          telegram_channel_id: string | null
          telegram_manager_id: string | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          payfast_merchant_id?: string | null
          payfast_merchant_key?: string | null
          payfast_passphrase?: string | null
          phone?: string | null
          service_charge_pct?: number | null
          settings?: Json | null
          slug?: string | null
          telegram_bot_token?: string | null
          telegram_channel_id?: string | null
          telegram_manager_id?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          payfast_merchant_id?: string | null
          payfast_merchant_key?: string | null
          payfast_passphrase?: string | null
          phone?: string | null
          service_charge_pct?: number | null
          settings?: Json | null
          slug?: string | null
          telegram_bot_token?: string | null
          telegram_channel_id?: string | null
          telegram_manager_id?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurants_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      safari_clients: {
        Row: {
          created_at: string | null
          email: string | null
          first_name: string
          hunt_count: number | null
          hunting_experience: string | null
          id: string
          last_hunt_date: string | null
          last_name: string
          lead_status: string | null
          lifetime_spend_zar: number | null
          nationality: string | null
          notes: string | null
          org_id: string
          passport_expiry: string | null
          passport_number: string | null
          phone: string | null
          updated_at: string | null
          user_id: string | null
          waiver_signed: boolean | null
          whatsapp_phone: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          first_name: string
          hunt_count?: number | null
          hunting_experience?: string | null
          id?: string
          last_hunt_date?: string | null
          last_name: string
          lead_status?: string | null
          lifetime_spend_zar?: number | null
          nationality?: string | null
          notes?: string | null
          org_id: string
          passport_expiry?: string | null
          passport_number?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string | null
          waiver_signed?: boolean | null
          whatsapp_phone?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          first_name?: string
          hunt_count?: number | null
          hunting_experience?: string | null
          id?: string
          last_hunt_date?: string | null
          last_name?: string
          lead_status?: string | null
          lifetime_spend_zar?: number | null
          nationality?: string | null
          notes?: string | null
          org_id?: string
          passport_expiry?: string | null
          passport_number?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string | null
          waiver_signed?: boolean | null
          whatsapp_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "safari_clients_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      safaris: {
        Row: {
          area_id: string | null
          arrival_date: string | null
          assigned_ph_id: string | null
          client_id: string
          created_at: string | null
          daily_rate_usd: number | null
          daily_rate_zar: number | null
          departure_date: string | null
          deposit_amount_zar: number | null
          deposit_paid: boolean | null
          estimated_total_zar: number | null
          id: string
          num_hunters: number | null
          num_observers: number | null
          org_id: string
          reference: string
          safari_type: string
          species_wishlist: Json | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          area_id?: string | null
          arrival_date?: string | null
          assigned_ph_id?: string | null
          client_id: string
          created_at?: string | null
          daily_rate_usd?: number | null
          daily_rate_zar?: number | null
          departure_date?: string | null
          deposit_amount_zar?: number | null
          deposit_paid?: boolean | null
          estimated_total_zar?: number | null
          id?: string
          num_hunters?: number | null
          num_observers?: number | null
          org_id: string
          reference: string
          safari_type: string
          species_wishlist?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          area_id?: string | null
          arrival_date?: string | null
          assigned_ph_id?: string | null
          client_id?: string
          created_at?: string | null
          daily_rate_usd?: number | null
          daily_rate_zar?: number | null
          departure_date?: string | null
          deposit_amount_zar?: number | null
          deposit_paid?: boolean | null
          estimated_total_zar?: number | null
          id?: string
          num_hunters?: number | null
          num_observers?: number | null
          org_id?: string
          reference?: string
          safari_type?: string
          species_wishlist?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "safaris_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safaris_assigned_ph_id_fkey"
            columns: ["assigned_ph_id"]
            isOneToOne: false
            referencedRelation: "org_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safaris_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "safari_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safaris_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      service_packages: {
        Row: {
          base_price: number
          billing_frequency: string | null
          created_at: string | null
          description: string | null
          features: Json | null
          id: string
          included_limits: Json | null
          industry: string | null
          is_active: boolean | null
          name: string
        }
        Insert: {
          base_price: number
          billing_frequency?: string | null
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          included_limits?: Json | null
          industry?: string | null
          is_active?: boolean | null
          name: string
        }
        Update: {
          base_price?: number
          billing_frequency?: string | null
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          included_limits?: Json | null
          industry?: string | null
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      service_plans: {
        Row: {
          actual_completion_date: string | null
          actual_cost: number | null
          actual_hours: number | null
          assigned_team: string[] | null
          contact_id: string | null
          created_at: string | null
          created_by: string | null
          deal_id: string | null
          deliverables: Json | null
          estimated_cost: number | null
          estimated_hours: number | null
          id: string
          milestones: Json | null
          organization_id: string | null
          plan_name: string
          plan_status: string | null
          service_type: string
          start_date: string | null
          target_completion_date: string | null
          updated_at: string | null
        }
        Insert: {
          actual_completion_date?: string | null
          actual_cost?: number | null
          actual_hours?: number | null
          assigned_team?: string[] | null
          contact_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deal_id?: string | null
          deliverables?: Json | null
          estimated_cost?: number | null
          estimated_hours?: number | null
          id?: string
          milestones?: Json | null
          organization_id?: string | null
          plan_name: string
          plan_status?: string | null
          service_type: string
          start_date?: string | null
          target_completion_date?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_completion_date?: string | null
          actual_cost?: number | null
          actual_hours?: number | null
          assigned_team?: string[] | null
          contact_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deal_id?: string | null
          deliverables?: Json | null
          estimated_cost?: number | null
          estimated_hours?: number | null
          id?: string
          milestones?: Json | null
          organization_id?: string | null
          plan_name?: string
          plan_status?: string | null
          service_type?: string
          start_date?: string | null
          target_completion_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_plans_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_plans_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_plans_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      service_tasks: {
        Row: {
          actual_hours: number | null
          assigned_to: string | null
          checklist: Json | null
          completed_at: string | null
          created_at: string | null
          dependencies: string[] | null
          due_date: string | null
          estimated_hours: number | null
          id: string
          notes: string | null
          priority: string | null
          service_plan_id: string | null
          status: string | null
          task_description: string | null
          task_name: string
          task_order: number | null
          task_type: string | null
        }
        Insert: {
          actual_hours?: number | null
          assigned_to?: string | null
          checklist?: Json | null
          completed_at?: string | null
          created_at?: string | null
          dependencies?: string[] | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          notes?: string | null
          priority?: string | null
          service_plan_id?: string | null
          status?: string | null
          task_description?: string | null
          task_name: string
          task_order?: number | null
          task_type?: string | null
        }
        Update: {
          actual_hours?: number | null
          assigned_to?: string | null
          checklist?: Json | null
          completed_at?: string | null
          created_at?: string | null
          dependencies?: string[] | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          notes?: string | null
          priority?: string | null
          service_plan_id?: string | null
          status?: string | null
          task_description?: string | null
          task_name?: string
          task_order?: number | null
          task_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_tasks_service_plan_id_fkey"
            columns: ["service_plan_id"]
            isOneToOne: false
            referencedRelation: "service_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          break_minutes: number | null
          clock_in_at: string | null
          clock_out_at: string | null
          created_at: string | null
          end_time: string
          id: string
          notes: string | null
          organization_id: string
          restaurant_id: string
          role: string | null
          shift_date: string
          staff_id: string
          start_time: string
          status: string | null
        }
        Insert: {
          break_minutes?: number | null
          clock_in_at?: string | null
          clock_out_at?: string | null
          created_at?: string | null
          end_time: string
          id?: string
          notes?: string | null
          organization_id: string
          restaurant_id: string
          role?: string | null
          shift_date: string
          staff_id: string
          start_time: string
          status?: string | null
        }
        Update: {
          break_minutes?: number | null
          clock_in_at?: string | null
          clock_out_at?: string | null
          created_at?: string | null
          end_time?: string
          id?: string
          notes?: string | null
          organization_id?: string
          restaurant_id?: string
          role?: string | null
          shift_date?: string
          staff_id?: string
          start_time?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shifts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "restaurant_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      social_accounts: {
        Row: {
          access_token: string | null
          account_handle: string | null
          account_id: string | null
          account_name: string
          auto_post_enabled: boolean | null
          created_at: string | null
          followers_count: number | null
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          organization_id: string
          platform_data: Json | null
          platform_id: string
          profile_image_url: string | null
          refresh_token: string | null
          requires_approval: boolean | null
          token_expires_at: string | null
          updated_at: string | null
        }
        Insert: {
          access_token?: string | null
          account_handle?: string | null
          account_id?: string | null
          account_name: string
          auto_post_enabled?: boolean | null
          created_at?: string | null
          followers_count?: number | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          organization_id: string
          platform_data?: Json | null
          platform_id: string
          profile_image_url?: string | null
          refresh_token?: string | null
          requires_approval?: boolean | null
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string | null
          account_handle?: string | null
          account_id?: string | null
          account_name?: string
          auto_post_enabled?: boolean | null
          created_at?: string | null
          followers_count?: number | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          organization_id?: string
          platform_data?: Json | null
          platform_id?: string
          profile_image_url?: string | null
          refresh_token?: string | null
          requires_approval?: boolean | null
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_accounts_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "social_platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      social_media_imports: {
        Row: {
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          error_message: string | null
          id: string
          import_type: string
          items_failed: number | null
          items_imported: number | null
          items_skipped: number | null
          last_sync_cursor: string | null
          organization_id: string | null
          platform: string
          social_account_id: string | null
          started_at: string | null
          status: string | null
          sync_from_date: string | null
          total_items_found: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          id?: string
          import_type: string
          items_failed?: number | null
          items_imported?: number | null
          items_skipped?: number | null
          last_sync_cursor?: string | null
          organization_id?: string | null
          platform: string
          social_account_id?: string | null
          started_at?: string | null
          status?: string | null
          sync_from_date?: string | null
          total_items_found?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          id?: string
          import_type?: string
          items_failed?: number | null
          items_imported?: number | null
          items_skipped?: number | null
          last_sync_cursor?: string | null
          organization_id?: string | null
          platform?: string
          social_account_id?: string | null
          started_at?: string | null
          status?: string | null
          sync_from_date?: string | null
          total_items_found?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "social_media_imports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_media_imports_social_account_id_fkey"
            columns: ["social_account_id"]
            isOneToOne: false
            referencedRelation: "social_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_platforms: {
        Row: {
          api_base_url: string | null
          created_at: string | null
          display_name: string
          icon_name: string | null
          id: string
          is_active: boolean | null
          name: string
          oauth_config: Json | null
          post_character_limits: Json | null
          supported_media_types: string[] | null
        }
        Insert: {
          api_base_url?: string | null
          created_at?: string | null
          display_name: string
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          oauth_config?: Json | null
          post_character_limits?: Json | null
          supported_media_types?: string[] | null
        }
        Update: {
          api_base_url?: string | null
          created_at?: string | null
          display_name?: string
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          oauth_config?: Json | null
          post_character_limits?: Json | null
          supported_media_types?: string[] | null
        }
        Relationships: []
      }
      social_post_versions: {
        Row: {
          change_notes: string | null
          changed_by: string | null
          content: string
          created_at: string | null
          id: string
          media_urls: string[] | null
          post_id: string
          version_number: number
        }
        Insert: {
          change_notes?: string | null
          changed_by?: string | null
          content: string
          created_at?: string | null
          id?: string
          media_urls?: string[] | null
          post_id: string
          version_number: number
        }
        Update: {
          change_notes?: string | null
          changed_by?: string | null
          content?: string
          created_at?: string | null
          id?: string
          media_urls?: string[] | null
          post_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "social_post_versions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_posts: {
        Row: {
          ai_model: string | null
          ai_prompt: string | null
          approved_at: string | null
          approved_by: string | null
          campaign_id: string | null
          content: string
          content_category: string | null
          created_at: string | null
          created_by: string | null
          generated_by_ai: boolean | null
          generation_metadata: Json | null
          hashtags: string[] | null
          id: string
          last_metrics_update: string | null
          link_url: string | null
          media_type: string | null
          media_urls: string[] | null
          mentions: string[] | null
          organization_id: string
          performance_metrics: Json | null
          platform_post_ids: Json | null
          publish_to_accounts: string[] | null
          published_at: string | null
          rejection_reason: string | null
          scheduled_for: string | null
          status: string
          target_audience: string | null
          updated_at: string | null
        }
        Insert: {
          ai_model?: string | null
          ai_prompt?: string | null
          approved_at?: string | null
          approved_by?: string | null
          campaign_id?: string | null
          content: string
          content_category?: string | null
          created_at?: string | null
          created_by?: string | null
          generated_by_ai?: boolean | null
          generation_metadata?: Json | null
          hashtags?: string[] | null
          id?: string
          last_metrics_update?: string | null
          link_url?: string | null
          media_type?: string | null
          media_urls?: string[] | null
          mentions?: string[] | null
          organization_id: string
          performance_metrics?: Json | null
          platform_post_ids?: Json | null
          publish_to_accounts?: string[] | null
          published_at?: string | null
          rejection_reason?: string | null
          scheduled_for?: string | null
          status?: string
          target_audience?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_model?: string | null
          ai_prompt?: string | null
          approved_at?: string | null
          approved_by?: string | null
          campaign_id?: string | null
          content?: string
          content_category?: string | null
          created_at?: string | null
          created_by?: string | null
          generated_by_ai?: boolean | null
          generation_metadata?: Json | null
          hashtags?: string[] | null
          id?: string
          last_metrics_update?: string | null
          link_url?: string | null
          media_type?: string | null
          media_urls?: string[] | null
          mentions?: string[] | null
          organization_id?: string
          performance_metrics?: Json | null
          platform_post_ids?: Json | null
          publish_to_accounts?: string[] | null
          published_at?: string | null
          rejection_reason?: string | null
          scheduled_for?: string | null
          status?: string
          target_audience?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_posts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      species: {
        Row: {
          afrikaans_name: string | null
          category: string
          cites_appendix: string | null
          cites_permit_required: boolean | null
          common_name: string
          created_at: string | null
          dea_listed: boolean | null
          default_trophy_fee_zar: number | null
          export_permit_required: boolean | null
          id: string
          is_active: boolean | null
          measurement_fields: Json | null
          photo_url: string | null
          rowland_ward_min: Json | null
          sci_min: Json | null
          scientific_name: string
          tops_category: string | null
        }
        Insert: {
          afrikaans_name?: string | null
          category: string
          cites_appendix?: string | null
          cites_permit_required?: boolean | null
          common_name: string
          created_at?: string | null
          dea_listed?: boolean | null
          default_trophy_fee_zar?: number | null
          export_permit_required?: boolean | null
          id?: string
          is_active?: boolean | null
          measurement_fields?: Json | null
          photo_url?: string | null
          rowland_ward_min?: Json | null
          sci_min?: Json | null
          scientific_name: string
          tops_category?: string | null
        }
        Update: {
          afrikaans_name?: string | null
          category?: string
          cites_appendix?: string | null
          cites_permit_required?: boolean | null
          common_name?: string
          created_at?: string | null
          dea_listed?: boolean | null
          default_trophy_fee_zar?: number | null
          export_permit_required?: boolean | null
          id?: string
          is_active?: boolean | null
          measurement_fields?: Json | null
          photo_url?: string | null
          rowland_ward_min?: Json | null
          sci_min?: Json | null
          scientific_name?: string
          tops_category?: string | null
        }
        Relationships: []
      }
      sso_bridge_tokens: {
        Row: {
          consumed_at: string | null
          expires_at: string
          issued_at: string
          jti: string
          origin_org: string
          product: string
          target_org: string
          user_id: string
        }
        Insert: {
          consumed_at?: string | null
          expires_at: string
          issued_at?: string
          jti: string
          origin_org: string
          product: string
          target_org: string
          user_id: string
        }
        Update: {
          consumed_at?: string | null
          expires_at?: string
          issued_at?: string
          jti?: string
          origin_org?: string
          product?: string
          target_org?: string
          user_id?: string
        }
        Relationships: []
      }
      staff: {
        Row: {
          active: boolean | null
          assigned_services: string[] | null
          created_at: string | null
          email: string
          id: string
          name: string
          role: string | null
        }
        Insert: {
          active?: boolean | null
          assigned_services?: string[] | null
          created_at?: string | null
          email: string
          id?: string
          name: string
          role?: string | null
        }
        Update: {
          active?: boolean | null
          assigned_services?: string[] | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          role?: string | null
        }
        Relationships: []
      }
      subscription_composition: {
        Row: {
          addon_ids: string[]
          base_plan_id: string | null
          created_at: string
          effective_from: string
          effective_to: string | null
          id: string
          monthly_total_zar_cents: number
          organization_id: string
          reason: string | null
          setup_fee_zar_cents: number
        }
        Insert: {
          addon_ids?: string[]
          base_plan_id?: string | null
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          monthly_total_zar_cents: number
          organization_id: string
          reason?: string | null
          setup_fee_zar_cents?: number
        }
        Update: {
          addon_ids?: string[]
          base_plan_id?: string | null
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          monthly_total_zar_cents?: number
          organization_id?: string
          reason?: string | null
          setup_fee_zar_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "subscription_composition_base_plan_id_fkey"
            columns: ["base_plan_id"]
            isOneToOne: false
            referencedRelation: "billing_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_composition_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_history: {
        Row: {
          amount: number | null
          amount_fee: number | null
          amount_net: number | null
          amount_zar_cents: number | null
          created_at: string
          event_type: string | null
          id: string
          metadata: Json
          organization_id: string
          payfast_payment_id: string | null
          payfast_subscription_token: string | null
          payment_method: string | null
          status: string
          transaction_id: string | null
        }
        Insert: {
          amount?: number | null
          amount_fee?: number | null
          amount_net?: number | null
          amount_zar_cents?: number | null
          created_at?: string
          event_type?: string | null
          id?: string
          metadata?: Json
          organization_id: string
          payfast_payment_id?: string | null
          payfast_subscription_token?: string | null
          payment_method?: string | null
          status: string
          transaction_id?: string | null
        }
        Update: {
          amount?: number | null
          amount_fee?: number | null
          amount_net?: number | null
          amount_zar_cents?: number | null
          created_at?: string
          event_type?: string | null
          id?: string
          metadata?: Json
          organization_id?: string
          payfast_payment_id?: string | null
          payfast_subscription_token?: string | null
          payment_method?: string | null
          status?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_jobs: {
        Row: {
          actual_completion: string | null
          client_notified: boolean | null
          created_at: string | null
          delivery_date: string | null
          deposit_paid: boolean | null
          description: string | null
          dispatch_date: string | null
          estimated_completion: string | null
          final_amount_zar: number | null
          id: string
          job_type: string
          mount_type: string | null
          notes: string | null
          org_id: string
          progress_photos: Json | null
          quoted_amount_zar: number | null
          reference: string
          status: string | null
          supplier_org_id: string | null
          tracking_ref: string | null
          trophy_id: string | null
          updated_at: string | null
        }
        Insert: {
          actual_completion?: string | null
          client_notified?: boolean | null
          created_at?: string | null
          delivery_date?: string | null
          deposit_paid?: boolean | null
          description?: string | null
          dispatch_date?: string | null
          estimated_completion?: string | null
          final_amount_zar?: number | null
          id?: string
          job_type: string
          mount_type?: string | null
          notes?: string | null
          org_id: string
          progress_photos?: Json | null
          quoted_amount_zar?: number | null
          reference: string
          status?: string | null
          supplier_org_id?: string | null
          tracking_ref?: string | null
          trophy_id?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_completion?: string | null
          client_notified?: boolean | null
          created_at?: string | null
          delivery_date?: string | null
          deposit_paid?: boolean | null
          description?: string | null
          dispatch_date?: string | null
          estimated_completion?: string | null
          final_amount_zar?: number | null
          id?: string
          job_type?: string
          mount_type?: string | null
          notes?: string | null
          org_id?: string
          progress_photos?: Json | null
          quoted_amount_zar?: number | null
          reference?: string
          status?: string | null
          supplier_org_id?: string | null
          tracking_ref?: string | null
          trophy_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_jobs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_jobs_trophy_id_fkey"
            columns: ["trophy_id"]
            isOneToOne: false
            referencedRelation: "trophies"
            referencedColumns: ["id"]
          },
        ]
      }
      system_health_checks: {
        Row: {
          checked_at: string | null
          details: Json | null
          id: string
          response_ms: number | null
          service: string
          status: string
        }
        Insert: {
          checked_at?: string | null
          details?: Json | null
          id?: string
          response_ms?: number | null
          service: string
          status?: string
        }
        Update: {
          checked_at?: string | null
          details?: Json | null
          id?: string
          response_ms?: number | null
          service?: string
          status?: string
        }
        Relationships: []
      }
      table_sessions: {
        Row: {
          closed_at: string | null
          created_at: string | null
          guest_whatsapp: string | null
          id: string
          notes: string | null
          opened_at: string | null
          organization_id: string
          party_size: number | null
          restaurant_id: string
          split_mode: string | null
          status: string
          table_id: string
          waiter_id: string | null
        }
        Insert: {
          closed_at?: string | null
          created_at?: string | null
          guest_whatsapp?: string | null
          id?: string
          notes?: string | null
          opened_at?: string | null
          organization_id: string
          party_size?: number | null
          restaurant_id: string
          split_mode?: string | null
          status?: string
          table_id: string
          waiter_id?: string | null
        }
        Update: {
          closed_at?: string | null
          created_at?: string | null
          guest_whatsapp?: string | null
          id?: string
          notes?: string | null
          opened_at?: string | null
          organization_id?: string
          party_size?: number | null
          restaurant_id?: string
          split_mode?: string | null
          status?: string
          table_id?: string
          waiter_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "table_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_sessions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_sessions_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_sessions_waiter_id_fkey"
            columns: ["waiter_id"]
            isOneToOne: false
            referencedRelation: "restaurant_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          client_id: string | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: string | null
          service_type: string
          staff_id: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          service_type: string
          staff_id?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          service_type?: string
          staff_id?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_update_log: {
        Row: {
          bot_org_id: string | null
          processed_at: string
          update_id: number
        }
        Insert: {
          bot_org_id?: string | null
          processed_at?: string
          update_id: number
        }
        Update: {
          bot_org_id?: string | null
          processed_at?: string
          update_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "telegram_update_log_bot_org_id_fkey"
            columns: ["bot_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      temp_logs: {
        Row: {
          corrective_action: string | null
          equipment_name: string
          equipment_type: string
          id: string
          logged_at: string | null
          logged_by: string | null
          organization_id: string
          photo_url: string | null
          restaurant_id: string
          status: string | null
          temperature: number
          unit: string | null
        }
        Insert: {
          corrective_action?: string | null
          equipment_name: string
          equipment_type: string
          id?: string
          logged_at?: string | null
          logged_by?: string | null
          organization_id: string
          photo_url?: string | null
          restaurant_id: string
          status?: string | null
          temperature: number
          unit?: string | null
        }
        Update: {
          corrective_action?: string | null
          equipment_name?: string
          equipment_type?: string
          id?: string
          logged_at?: string | null
          logged_by?: string | null
          organization_id?: string
          photo_url?: string | null
          restaurant_id?: string
          status?: string | null
          temperature?: number
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "temp_logs_logged_by_fkey"
            columns: ["logged_by"]
            isOneToOne: false
            referencedRelation: "restaurant_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temp_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temp_logs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_modules: {
        Row: {
          config: Json | null
          disabled_at: string | null
          enabled_at: string | null
          id: string
          is_enabled: boolean | null
          module_id: string
          organization_id: string
        }
        Insert: {
          config?: Json | null
          disabled_at?: string | null
          enabled_at?: string | null
          id?: string
          is_enabled?: boolean | null
          module_id: string
          organization_id: string
        }
        Update: {
          config?: Json | null
          disabled_at?: string | null
          enabled_at?: string | null
          id?: string
          is_enabled?: boolean | null
          module_id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_modules_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "module_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_modules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tos_audit_log: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: string | null
          new_value: Json | null
          old_value: Json | null
          org_id: string
          resource_id: string | null
          resource_type: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          org_id: string
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          org_id?: string
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tos_audit_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      trending_topics: {
        Row: {
          created_at: string | null
          expires_at: string | null
          hashtag: string | null
          id: string
          industry_relevance: string[] | null
          is_active: boolean | null
          organization_id: string | null
          platform_id: string | null
          post_count: number | null
          suggested_use_cases: string[] | null
          topic: string
          trend_score: number | null
          trending_since: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          hashtag?: string | null
          id?: string
          industry_relevance?: string[] | null
          is_active?: boolean | null
          organization_id?: string | null
          platform_id?: string | null
          post_count?: number | null
          suggested_use_cases?: string[] | null
          topic: string
          trend_score?: number | null
          trending_since?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          hashtag?: string | null
          id?: string
          industry_relevance?: string[] | null
          is_active?: boolean | null
          organization_id?: string | null
          platform_id?: string | null
          post_count?: number | null
          suggested_use_cases?: string[] | null
          topic?: string
          trend_score?: number | null
          trending_since?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trending_topics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trending_topics_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "social_platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      trophies: {
        Row: {
          area_id: string | null
          caliber: string | null
          client_id: string
          created_at: string | null
          distance_meters: number | null
          field_notes: string | null
          gps_lat: number | null
          gps_lng: number | null
          harvest_date: string
          harvest_time: string | null
          id: string
          measurements: Json | null
          method: string | null
          org_id: string
          ph_id: string | null
          photos: Json | null
          quota_id: string | null
          reference: string
          rowland_ward_score: number | null
          safari_id: string
          sci_score: number | null
          sex: string | null
          species_id: string
          status: string | null
          trophy_fee_zar: number | null
          updated_at: string | null
        }
        Insert: {
          area_id?: string | null
          caliber?: string | null
          client_id: string
          created_at?: string | null
          distance_meters?: number | null
          field_notes?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          harvest_date: string
          harvest_time?: string | null
          id?: string
          measurements?: Json | null
          method?: string | null
          org_id: string
          ph_id?: string | null
          photos?: Json | null
          quota_id?: string | null
          reference: string
          rowland_ward_score?: number | null
          safari_id: string
          sci_score?: number | null
          sex?: string | null
          species_id: string
          status?: string | null
          trophy_fee_zar?: number | null
          updated_at?: string | null
        }
        Update: {
          area_id?: string | null
          caliber?: string | null
          client_id?: string
          created_at?: string | null
          distance_meters?: number | null
          field_notes?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          harvest_date?: string
          harvest_time?: string | null
          id?: string
          measurements?: Json | null
          method?: string | null
          org_id?: string
          ph_id?: string | null
          photos?: Json | null
          quota_id?: string | null
          reference?: string
          rowland_ward_score?: number | null
          safari_id?: string
          sci_score?: number | null
          sex?: string | null
          species_id?: string
          status?: string | null
          trophy_fee_zar?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trophies_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trophies_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "safari_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trophies_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trophies_ph_id_fkey"
            columns: ["ph_id"]
            isOneToOne: false
            referencedRelation: "org_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trophies_quota_id_fkey"
            columns: ["quota_id"]
            isOneToOne: false
            referencedRelation: "quota_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trophies_quota_id_fkey"
            columns: ["quota_id"]
            isOneToOne: false
            referencedRelation: "quotas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trophies_safari_id_fkey"
            columns: ["safari_id"]
            isOneToOne: false
            referencedRelation: "safaris"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trophies_species_id_fkey"
            columns: ["species_id"]
            isOneToOne: false
            referencedRelation: "species"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_events: {
        Row: {
          id: string
          metadata: Json | null
          metric: string
          organization_id: string
          quantity: number
          recorded_at: string | null
        }
        Insert: {
          id?: string
          metadata?: Json | null
          metric: string
          organization_id: string
          quantity?: number
          recorded_at?: string | null
        }
        Update: {
          id?: string
          metadata?: Json | null
          metric?: string
          organization_id?: string
          quantity?: number
          recorded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_summaries: {
        Row: {
          id: string
          limit_value: number
          metric: string
          organization_id: string
          overage: number
          period_end: string
          period_start: string
          total_used: number
        }
        Insert: {
          id?: string
          limit_value?: number
          metric: string
          organization_id: string
          overage?: number
          period_end: string
          period_start: string
          total_used?: number
        }
        Update: {
          id?: string
          limit_value?: number
          metric?: string
          organization_id?: string
          overage?: number
          period_end?: string
          period_start?: string
          total_used?: number
        }
        Relationships: [
          {
            foreignKeyName: "usage_summaries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          metadata: Json | null
          phone: string | null
          telegram_user_id: number | null
          ui_mode: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          metadata?: Json | null
          phone?: string | null
          telegram_user_id?: number | null
          ui_mode?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          metadata?: Json | null
          phone?: string | null
          telegram_user_id?: number | null
          ui_mode?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      vendors: {
        Row: {
          contact_name: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          organization_id: string | null
          phone: string | null
          rating: number | null
          service_type: string | null
          updated_at: string | null
        }
        Insert: {
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          rating?: number | null
          service_type?: string | null
          updated_at?: string | null
        }
        Update: {
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          rating?: number | null
          service_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          created_at: string | null
          events: string[]
          failed_calls: number | null
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
          name: string
          organization_id: string
          secret_key: string
          total_calls: number | null
          url: string
        }
        Insert: {
          created_at?: string | null
          events: string[]
          failed_calls?: number | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          name: string
          organization_id: string
          secret_key?: string
          total_calls?: number | null
          url: string
        }
        Update: {
          created_at?: string | null
          events?: string[]
          failed_calls?: number | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          name?: string
          organization_id?: string
          secret_key?: string
          total_calls?: number | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_notifications: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          notification_types: string[] | null
          organization_id: string | null
          phone_number: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notification_types?: string[] | null
          organization_id?: string | null
          phone_number: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notification_types?: string[] | null
          organization_id?: string | null
          phone_number?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      dbe_client_overview: {
        Row: {
          business_name: string | null
          health_status: string | null
          id: string | null
          monthly_amount: number | null
          next_payment_date: string | null
          onboarded_at: string | null
          org_id: string | null
          status: Database["public"]["Enums"]["dbe_client_status"] | null
          subscription_tier:
            | Database["public"]["Enums"]["dbe_subscription_tier"]
            | null
        }
        Relationships: []
      }
      dbe_dashboard_metrics: {
        Row: {
          active_clients: number | null
          conversations_24h: number | null
          leads_in_analysis: number | null
          new_leads_count: number | null
          open_escalations: number | null
          proposals_sent: number | null
          total_mrr: number | null
          trial_clients: number | null
        }
        Relationships: []
      }
      dbe_lead_pipeline: {
        Row: {
          business_name: string | null
          contact_person: string | null
          created_at: string | null
          demo_scheduled_at: string | null
          email: string | null
          follow_up_priority: string | null
          id: string | null
          proposal_sent_at: string | null
          source: string | null
          status: Database["public"]["Enums"]["dbe_lead_status"] | null
        }
        Insert: {
          business_name?: string | null
          contact_person?: string | null
          created_at?: string | null
          demo_scheduled_at?: string | null
          email?: string | null
          follow_up_priority?: never
          id?: string | null
          proposal_sent_at?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["dbe_lead_status"] | null
        }
        Update: {
          business_name?: string | null
          contact_person?: string | null
          created_at?: string | null
          demo_scheduled_at?: string | null
          email?: string | null
          follow_up_priority?: never
          id?: string | null
          proposal_sent_at?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["dbe_lead_status"] | null
        }
        Relationships: []
      }
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
      quota_status: {
        Row: {
          alert_level: string | null
          allocated: number | null
          area_id: string | null
          area_name: string | null
          cites_appendix: string | null
          cites_permit_required: boolean | null
          id: string | null
          org_id: string | null
          quota_type: string | null
          species_category: string | null
          species_id: string | null
          species_name: string | null
          taken: number | null
          usage_percent: number | null
          warning_threshold: number | null
          year: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quotas_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotas_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotas_species_id_fkey"
            columns: ["species_id"]
            isOneToOne: false
            referencedRelation: "species"
            referencedColumns: ["id"]
          },
        ]
      }
      v_customer_activity: {
        Row: {
          assigned_to_name: string | null
          company: string | null
          contact_count: number | null
          created_at: string | null
          email: string | null
          id: string | null
          lead_count: number | null
          name: string | null
          note_count: number | null
          organization_id: string | null
          phone: string | null
          status: Database["public"]["Enums"]["customer_status"] | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      v_leads_summary: {
        Row: {
          assigned_to_name: string | null
          company: string | null
          created_at: string | null
          customer_name: string | null
          email: string | null
          expected_close_date: string | null
          id: string | null
          name: string | null
          organization_id: string | null
          phone: string | null
          probability: number | null
          source_name: string | null
          status: Database["public"]["Enums"]["lead_status"] | null
          updated_at: string | null
          value: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      v_upcoming_reminders: {
        Row: {
          description: string | null
          due_date: string | null
          id: string | null
          organization_id: string | null
          related_to_id: string | null
          related_to_type: string | null
          title: string | null
          user_id: string | null
          user_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reminders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      aggregate_monthly_usage: {
        Args: { p_period_start?: string }
        Returns: number
      }
      aggregate_org_day_cost: {
        Args: { p_day_end: string; p_day_start: string; p_org_id: string }
        Returns: {
          call_count: number
          failed_call_count: number
          total_cache_read_tokens: number
          total_cache_write_tokens: number
          total_cost_zar_cents: number
          total_input_tokens: number
          total_output_tokens: number
        }[]
      }
      cancel_org_campaign_runs: { Args: { p_org_id: string }; Returns: number }
      capture_lead: {
        Args: {
          p_business_name: string
          p_contact_person: string
          p_email: string
          p_initial_message?: string
          p_phone?: string
          p_social_handles?: Json
          p_source?: string
          p_website?: string
        }
        Returns: Json
      }
      check_usage_limits: {
        Args: { p_client_id: string; p_metric_name: string }
        Returns: boolean
      }
      consume_credits: {
        Args: { p_metric: string; p_org_id: string; p_quantity?: number }
        Returns: Json
      }
      create_service_plan_from_template: {
        Args: { p_client_id: string; p_template_id: string }
        Returns: string
      }
      dbe_calculate_mrr: { Args: never; Returns: number }
      dbe_convert_lead_to_client: {
        Args: {
          p_lead_id: string
          p_org_id: string
          p_subscription_tier?: Database["public"]["Enums"]["dbe_subscription_tier"]
          p_trial_days?: number
        }
        Returns: string
      }
      dbe_get_client_health: { Args: { p_client_id: string }; Returns: string }
      dbe_get_conversion_metrics: {
        Args: never
        Returns: {
          conversion_rate: number
          converted_count: number
          total_leads: number
        }[]
      }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      elijah_create_welfare_incident: {
        Args: { p_household_id: string; p_org_id: string }
        Returns: string
      }
      elijah_find_farm_at_location: {
        Args: { lat: number; lng: number; org_id: string }
        Returns: {
          access_gate_location: unknown
          id: string
          name: string
          owner_name: string
          owner_phone: string
        }[]
      }
      elijah_get_active_schedules: {
        Args: never
        Returns: {
          grace_minutes: number
          organization_id: string
          schedule_id: string
          scheduled_time: string
          section_id: string
        }[]
      }
      elijah_get_buddy_contact: {
        Args: { p_household_id: string }
        Returns: {
          buddy_household_id: string
          display_name: string
          phone: string
        }[]
      }
      elijah_get_checkin_status: {
        Args: { p_household_id: string; p_schedule_id: string }
        Returns: {
          status: Database["public"]["Enums"]["elijah_checkin_status"]
        }[]
      }
      elijah_get_fire_alert_data: {
        Args: { p_fire_incident_id: string }
        Returns: {
          description: string
          farm_id: string
          fire_incident_id: string
          fire_type: Database["public"]["Enums"]["elijah_fire_type"]
          incident_id: string
          lat: number
          lng: number
          organization_id: string
          severity: Database["public"]["Enums"]["elijah_severity"]
          wind_direction: string
          wind_speed_kmh: number
        }[]
      }
      elijah_get_group_leaders: {
        Args: { p_org_id: string }
        Returns: {
          contact_phone: string
          group_id: string
          group_name: string
          group_type: Database["public"]["Enums"]["elijah_fire_group_type"]
          leader_name: string
          leader_phone: string
        }[]
      }
      elijah_get_member_roles: {
        Args: never
        Returns: Database["public"]["Enums"]["elijah_role_type"][]
      }
      elijah_get_org_dispatchers: {
        Args: { p_org_id: string }
        Returns: {
          display_name: string
          member_id: string
          phone: string
        }[]
      }
      elijah_get_pending_checkins: {
        Args: { p_schedule_id: string }
        Returns: {
          checkin_id: string
          household_id: string
          schedule_id: string
        }[]
      }
      elijah_get_section_households: {
        Args: { p_org_id: string; p_section_id?: string }
        Returns: {
          address: string
          household_id: string
          organization_id: string
          primary_contact_name: string
          primary_contact_phone: string
        }[]
      }
      elijah_nearest_farm: {
        Args: {
          lat: number
          lng: number
          max_distance_meters?: number
          org_id: string
        }
        Returns: {
          distance_meters: number
          id: string
          name: string
          owner_name: string
          owner_phone: string
        }[]
      }
      elijah_nearest_water_points: {
        Args: { lat: number; lng: number; max_results?: number; org_id: string }
        Returns: {
          access_notes: string
          capacity_litres: number
          distance_meters: number
          id: string
          last_inspected: string
          name: string
          status: Database["public"]["Enums"]["elijah_water_point_status"]
          type: Database["public"]["Enums"]["elijah_water_point_type"]
        }[]
      }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      generate_invoice_number: { Args: never; Returns: string }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_arrivals_in_days: {
        Args: { days_ahead: number; org_id: string }
        Returns: {
          balance_due: number
          booking_id: string
          booking_ref: string
          check_in_date: string
          check_out_date: string
          gate_code: string
          guest_email: string
          guest_first_name: string
          guest_last_name: string
          guest_phone: string
          property_name: string
          special_requests: string
          total_guests: number
        }[]
      }
      get_credit_balances: { Args: { p_org_id: string }; Returns: Json }
      get_deal_health: { Args: { p_deal_id: string }; Returns: string }
      get_departures_yesterday: {
        Args: { org_id: string }
        Returns: {
          booking_id: string
          booking_ref: string
          check_in_date: string
          check_out_date: string
          guest_email: string
          guest_first_name: string
          guest_last_name: string
          guest_phone: string
          property_name: string
          total_guests: number
          total_stays: number
        }[]
      }
      get_media_stats: { Args: { org_id: string }; Returns: Json }
      get_month_to_date_ai_cost: { Args: { p_org_id: string }; Returns: number }
      get_pipeline_summary: {
        Args: never
        Returns: {
          count: number
          stage: string
        }[]
      }
      get_usage_summary: { Args: { p_org_id: string }; Returns: Json }
      get_user_org_id: { Args: never; Returns: string }
      get_user_organizations: { Args: { user_uuid: string }; Returns: string[] }
      get_weekly_analytics: {
        Args: { p_start_date: string }
        Returns: {
          converted_clients: number
          new_leads: number
          total_mrr: number
          week_start: string
        }[]
      }
      gettransactionid: { Args: never; Returns: unknown }
      increment_media_usage: { Args: { media_id: string }; Returns: undefined }
      is_org_admin: {
        Args: { org_uuid: string; user_uuid: string }
        Returns: boolean
      }
      longtransactionsenabled: { Args: never; Returns: boolean }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      provision_client: {
        Args: {
          p_business_name: string
          p_email: string
          p_lead_id?: string
          p_subscription_tier?: string
        }
        Returns: Json
      }
      record_usage_event: {
        Args: {
          p_metadata?: Json
          p_metric: string
          p_org_id: string
          p_quantity?: number
        }
        Returns: Json
      }
      schedule_campaign_run_job: {
        Args: {
          p_cron_expr: string
          p_hmac: string
          p_job_name: string
          p_run_id: string
          p_url: string
        }
        Returns: undefined
      }
      set_tenant_module_config_path: {
        Args: {
          p_module_id: string
          p_organization_id: string
          p_path: string[]
          p_value: string
        }
        Returns: undefined
      }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      tos_user_org_ids: { Args: never; Returns: string[] }
      tos_user_role_in_org: { Args: { target_org_id: string }; Returns: string }
      unlockrows: { Args: { "": string }; Returns: number }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
    }
    Enums: {
      campaign_channel: "email" | "sms" | "facebook" | "instagram" | "linkedin"
      campaign_status:
        | "draft"
        | "pending_review"
        | "scheduled"
        | "running"
        | "completed"
        | "failed"
        | "killed"
      customer_status: "active" | "inactive" | "prospect" | "archived"
      dbe_client_status: "active" | "paused" | "cancelled" | "trial"
      dbe_escalation_priority: "low" | "medium" | "high" | "urgent"
      dbe_escalation_status: "pending" | "in_progress" | "resolved" | "closed"
      dbe_lead_status:
        | "new"
        | "contacted"
        | "analyzing"
        | "proposal_sent"
        | "demo_scheduled"
        | "converted"
        | "lost"
      dbe_subscription_tier: "starter" | "professional" | "enterprise"
      elijah_checkin_status: "pending" | "safe" | "help" | "away" | "missed"
      elijah_checkin_type: "in" | "out"
      elijah_fire_equipment_status:
        | "available"
        | "deployed"
        | "maintenance"
        | "decommissioned"
      elijah_fire_equipment_type:
        | "tanker"
        | "bakkie_skid"
        | "pump"
        | "trailer"
        | "beaters"
        | "hose_reel"
        | "extinguisher"
      elijah_fire_group_role: "leader" | "driver" | "member"
      elijah_fire_group_type:
        | "community_team"
        | "volunteer_brigade"
        | "municipal_fd"
        | "private_contractor"
      elijah_fire_status:
        | "reported"
        | "active"
        | "contained"
        | "extinguished"
        | "monitoring"
      elijah_fire_type:
        | "veld"
        | "structural"
        | "vehicle"
        | "electrical"
        | "other"
      elijah_incident_status: "open" | "in_progress" | "resolved" | "closed"
      elijah_incident_type:
        | "break_in"
        | "fire"
        | "medical"
        | "suspicious_activity"
        | "noise"
        | "infrastructure"
        | "other"
      elijah_patrol_status: "scheduled" | "active" | "completed" | "cancelled"
      elijah_role_type:
        | "admin"
        | "dispatcher"
        | "patroller"
        | "household_contact"
        | "member"
        | "fire_coordinator"
      elijah_severity: "critical" | "high" | "medium" | "low"
      elijah_water_point_status:
        | "operational"
        | "low"
        | "empty"
        | "maintenance"
        | "unknown"
      elijah_water_point_type:
        | "dam"
        | "hydrant"
        | "tank"
        | "borehole"
        | "pool"
        | "river"
      figarie_booking_status:
        | "inquiry"
        | "quote_requested"
        | "quote_sent"
        | "confirmed"
        | "deposit_paid"
        | "fully_paid"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "no_show"
      figarie_request_source:
        | "whatsapp"
        | "website"
        | "email"
        | "phone"
        | "walk_in"
        | "agent_referral"
      figarie_service_category:
        | "air_charter"
        | "helicopter"
        | "hot_air_balloon"
        | "flight_experience"
        | "vehicle_transfer"
        | "group_transfer"
        | "luxury_train"
        | "yacht_charter"
        | "catamaran_charter"
        | "sea_cruise"
        | "villa_rental"
        | "event_services"
        | "protection_services"
        | "photography_videography"
        | "music_entertainment"
        | "group_activities"
        | "representation_services"
        | "private_diamond_sales"
        | "package_deal"
      lead_status:
        | "new"
        | "contacted"
        | "qualified"
        | "proposal"
        | "negotiation"
        | "won"
        | "lost"
      post_status:
        | "draft"
        | "pending_approval"
        | "approved"
        | "scheduled"
        | "published"
        | "failed"
      run_item_status: "pending" | "sent" | "failed" | "skipped" | "verified"
      run_status: "pending" | "executing" | "completed" | "failed" | "killed"
      user_role: "admin" | "manager" | "user" | "client"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
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
      campaign_channel: ["email", "sms", "facebook", "instagram", "linkedin"],
      campaign_status: [
        "draft",
        "pending_review",
        "scheduled",
        "running",
        "completed",
        "failed",
        "killed",
      ],
      customer_status: ["active", "inactive", "prospect", "archived"],
      dbe_client_status: ["active", "paused", "cancelled", "trial"],
      dbe_escalation_priority: ["low", "medium", "high", "urgent"],
      dbe_escalation_status: ["pending", "in_progress", "resolved", "closed"],
      dbe_lead_status: [
        "new",
        "contacted",
        "analyzing",
        "proposal_sent",
        "demo_scheduled",
        "converted",
        "lost",
      ],
      dbe_subscription_tier: ["starter", "professional", "enterprise"],
      elijah_checkin_status: ["pending", "safe", "help", "away", "missed"],
      elijah_checkin_type: ["in", "out"],
      elijah_fire_equipment_status: [
        "available",
        "deployed",
        "maintenance",
        "decommissioned",
      ],
      elijah_fire_equipment_type: [
        "tanker",
        "bakkie_skid",
        "pump",
        "trailer",
        "beaters",
        "hose_reel",
        "extinguisher",
      ],
      elijah_fire_group_role: ["leader", "driver", "member"],
      elijah_fire_group_type: [
        "community_team",
        "volunteer_brigade",
        "municipal_fd",
        "private_contractor",
      ],
      elijah_fire_status: [
        "reported",
        "active",
        "contained",
        "extinguished",
        "monitoring",
      ],
      elijah_fire_type: [
        "veld",
        "structural",
        "vehicle",
        "electrical",
        "other",
      ],
      elijah_incident_status: ["open", "in_progress", "resolved", "closed"],
      elijah_incident_type: [
        "break_in",
        "fire",
        "medical",
        "suspicious_activity",
        "noise",
        "infrastructure",
        "other",
      ],
      elijah_patrol_status: ["scheduled", "active", "completed", "cancelled"],
      elijah_role_type: [
        "admin",
        "dispatcher",
        "patroller",
        "household_contact",
        "member",
        "fire_coordinator",
      ],
      elijah_severity: ["critical", "high", "medium", "low"],
      elijah_water_point_status: [
        "operational",
        "low",
        "empty",
        "maintenance",
        "unknown",
      ],
      elijah_water_point_type: [
        "dam",
        "hydrant",
        "tank",
        "borehole",
        "pool",
        "river",
      ],
      figarie_booking_status: [
        "inquiry",
        "quote_requested",
        "quote_sent",
        "confirmed",
        "deposit_paid",
        "fully_paid",
        "in_progress",
        "completed",
        "cancelled",
        "no_show",
      ],
      figarie_request_source: [
        "whatsapp",
        "website",
        "email",
        "phone",
        "walk_in",
        "agent_referral",
      ],
      figarie_service_category: [
        "air_charter",
        "helicopter",
        "hot_air_balloon",
        "flight_experience",
        "vehicle_transfer",
        "group_transfer",
        "luxury_train",
        "yacht_charter",
        "catamaran_charter",
        "sea_cruise",
        "villa_rental",
        "event_services",
        "protection_services",
        "photography_videography",
        "music_entertainment",
        "group_activities",
        "representation_services",
        "private_diamond_sales",
        "package_deal",
      ],
      lead_status: [
        "new",
        "contacted",
        "qualified",
        "proposal",
        "negotiation",
        "won",
        "lost",
      ],
      post_status: [
        "draft",
        "pending_approval",
        "approved",
        "scheduled",
        "published",
        "failed",
      ],
      run_item_status: ["pending", "sent", "failed", "skipped", "verified"],
      run_status: ["pending", "executing", "completed", "failed", "killed"],
      user_role: ["admin", "manager", "user", "client"],
    },
  },
} as const
