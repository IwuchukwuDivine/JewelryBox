
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "addresses": {
                  Row: {
                    "area": string | null,"city": string,"country": string,"created_at": string,"email": string,"full_name": string,"id": string,"is_default": boolean,"line1": string,"line2": string | null,"notes": string | null,"phone": string,"state": string,"user_id": string
                  }
                  Insert: {
                    "area"?: string | null,"city": string,"country"?: string,"created_at"?: string,"email": string,"full_name": string,"id"?: string,"is_default"?: boolean,"line1": string,"line2"?: string | null,"notes"?: string | null,"phone": string,"state": string,"user_id": string
                  }
                  Update: {
                    "area"?: string | null,"city"?: string,"country"?: string,"created_at"?: string,"email"?: string,"full_name"?: string,"id"?: string,"is_default"?: boolean,"line1"?: string,"line2"?: string | null,"notes"?: string | null,"phone"?: string,"state"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"announcements": {
                  Row: {
                    "created_at": string,"id": string,"is_active": boolean,"message": string
                  }
                  Insert: {
                    "created_at"?: string,"id"?: string,"is_active"?: boolean,"message": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"is_active"?: boolean,"message"?: string
                  }
                  Relationships: [
                    
                  ]
                },"delivery_rates": {
                  Row: {
                    "active": boolean,"fee_ngn": number,"id": string,"mode": string,"name": string,"position": number,"state": string
                  }
                  Insert: {
                    "active"?: boolean,"fee_ngn": number,"id"?: string,"mode": string,"name": string,"position"?: number,"state": string
                  }
                  Update: {
                    "active"?: boolean,"fee_ngn"?: number,"id"?: string,"mode"?: string,"name"?: string,"position"?: number,"state"?: string
                  }
                  Relationships: [
                    
                  ]
                },"order_emails": {
                  Row: {
                    "kind": string,"order_id": string,"sent_at": string
                  }
                  Insert: {
                    "kind": string,"order_id": string,"sent_at"?: string
                  }
                  Update: {
                    "kind"?: string,"order_id"?: string,"sent_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_emails_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"order_flow": {
                  Row: {
                    "payment_method": string,"position": number,"status": string
                  }
                  Insert: {
                    "payment_method": string,"position": number,"status": string
                  }
                  Update: {
                    "payment_method"?: string,"position"?: number,"status"?: string
                  }
                  Relationships: [
                    
                  ]
                },"orders": {
                  Row: {
                    "created_at": string,"delivery_destination": string,"delivery_fee_ngn": number | null,"delivery_method": string,"id": string,"is_paid": boolean,"items": NonNullable<Json>,"order_number": string,"paid_at": string | null,"payment_method": string,"shipping_address": NonNullable<Json>,"status": string,"status_history": NonNullable<Json>,"subtotal_ngn": number,"total_ngn": number,"user_id": string | null
                  }
                  Insert: {
                    "created_at"?: string,"delivery_destination": string,"delivery_fee_ngn"?: number | null,"delivery_method": string,"id"?: string,"is_paid"?: never,"items": NonNullable<Json>,"order_number": string,"paid_at"?: string | null,"payment_method": string,"shipping_address": NonNullable<Json>,"status"?: string,"status_history"?: NonNullable<Json>,"subtotal_ngn": number,"total_ngn"?: never,"user_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"delivery_destination"?: string,"delivery_fee_ngn"?: number | null,"delivery_method"?: string,"id"?: string,"is_paid"?: never,"items"?: NonNullable<Json>,"order_number"?: string,"paid_at"?: string | null,"payment_method"?: string,"shipping_address"?: NonNullable<Json>,"status"?: string,"status_history"?: NonNullable<Json>,"subtotal_ngn"?: number,"total_ngn"?: never,"user_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"product_variants": {
                  Row: {
                    "id": string,"in_stock": boolean,"label": string,"options": NonNullable<Json>,"position": number,"price_ngn": number,"product_id": string
                  }
                  Insert: {
                    "id"?: string,"in_stock"?: boolean,"label": string,"options"?: NonNullable<Json>,"position"?: number,"price_ngn": number,"product_id": string
                  }
                  Update: {
                    "id"?: string,"in_stock"?: boolean,"label"?: string,"options"?: NonNullable<Json>,"position"?: number,"price_ngn"?: number,"product_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "product_variants_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"products": {
                  Row: {
                    "archived_at": string | null,"brand": string,"category": string,"compare_at_ngn": number | null,"created_at": string,"description": string,"featured": boolean,"id": string,"images": (string)[],"in_stock": boolean,"made_to_order": boolean,"name": string,"price_ngn": number,"slug": string,"specs": NonNullable<Json>,"stock_count": number | null,"tags": (string)[],"updated_at": string
                  }
                  Insert: {
                    "archived_at"?: string | null,"brand"?: string,"category": string,"compare_at_ngn"?: number | null,"created_at"?: string,"description"?: string,"featured"?: boolean,"id"?: string,"images"?: (string)[],"in_stock"?: boolean,"made_to_order"?: boolean,"name": string,"price_ngn": number,"slug": string,"specs"?: NonNullable<Json>,"stock_count"?: number | null,"tags"?: (string)[],"updated_at"?: string
                  }
                  Update: {
                    "archived_at"?: string | null,"brand"?: string,"category"?: string,"compare_at_ngn"?: number | null,"created_at"?: string,"description"?: string,"featured"?: boolean,"id"?: string,"images"?: (string)[],"in_stock"?: boolean,"made_to_order"?: boolean,"name"?: string,"price_ngn"?: number,"slug"?: string,"specs"?: NonNullable<Json>,"stock_count"?: number | null,"tags"?: (string)[],"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"full_name": string | null,"id": string,"phone": string | null,"role": string
                  }
                  Insert: {
                    "created_at"?: string,"full_name"?: string | null,"id": string,"phone"?: string | null,"role"?: string
                  }
                  Update: {
                    "created_at"?: string,"full_name"?: string | null,"id"?: string,"phone"?: string | null,"role"?: string
                  }
                  Relationships: [
                    
                  ]
                },"rate_limits": {
                  Row: {
                    "count": number,"key": string,"window_start": string
                  }
                  Insert: {
                    "count"?: number,"key": string,"window_start"?: string
                  }
                  Update: {
                    "count"?: number,"key"?: string,"window_start"?: string
                  }
                  Relationships: [
                    
                  ]
                },"site_settings": {
                  Row: {
                    "is_public": boolean,"key": string,"updated_at": string,"value": NonNullable<Json>
                  }
                  Insert: {
                    "is_public"?: boolean,"key": string,"updated_at"?: string,"value": NonNullable<Json>
                  }
                  Update: {
                    "is_public"?: boolean,"key"?: string,"updated_at"?: string,"value"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"wishlists": {
                  Row: {
                    "created_at": string,"product_id": string,"user_id": string
                  }
                  Insert: {
                    "created_at"?: string,"product_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"product_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "wishlists_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "admin_analytics":
{ Args: { "p_days"?: number }; Returns: Json
                           },
"admin_stats":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"advance_order_status":
{ Args: { "p_note"?: string,"p_order_id": string,"p_to": string }; Returns: {
              "created_at": string,
"delivery_destination": string,
"delivery_fee_ngn": number | null,
"delivery_method": string,
"id": string,
"is_paid": boolean,
"items": NonNullable<Json>,
"order_number": string,
"paid_at": string | null,
"payment_method": string,
"shipping_address": NonNullable<Json>,
"status": string,
"status_history": NonNullable<Json>,
"subtotal_ngn": number,
"total_ngn": number,
"user_id": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "orders"
        isOneToOne: true
        isSetofReturn: false
      } },
"can_transition":
{ Args: { "p_from": string,"p_payment": string,"p_to": string }; Returns: boolean
                           },
"check_rate_limit":
{ Args: { "p_key": string,"p_limit"?: number,"p_window"?: string }; Returns: boolean
                           },
"clear_rate_limit":
{ Args: { "p_key": string }; Returns: undefined
                           },
"get_payment_instructions":
{ Args: { "p_email": string,"p_order_id": string }; Returns: Json
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"lookup_order":
{ Args: { "p_email": string,"p_order_ref": string }; Returns: {
              "created_at": string,
"delivery_destination": string,
"delivery_fee_ngn": number | null,
"delivery_method": string,
"id": string,
"is_paid": boolean,
"items": NonNullable<Json>,
"order_number": string,
"paid_at": string | null,
"payment_method": string,
"shipping_address": NonNullable<Json>,
"status": string,
"status_history": NonNullable<Json>,
"subtotal_ngn": number,
"total_ngn": number,
"user_id": string | null
            }[]
                          SetofOptions: {
        from: "*"
        to: "orders"
        isOneToOne: false
        isSetofReturn: true
      } },
"next_statuses":
{ Args: { "p_from": string,"p_payment": string }; Returns: (string)[]
                           },
"nigerian_states":
{ Args: Record<PropertyKey, never>; Returns: (string)[]
                           },
"normalize_order_ref":
{ Args: { "p_ref": string }; Returns: string
                           },
"order_ref_suffix":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"place_order":
{ Args: { "p_address": Json,"p_delivery"?: Json,"p_items": Json,"p_payment"?: string }; Returns: {
              "created_at": string,
"delivery_destination": string,
"delivery_fee_ngn": number | null,
"delivery_method": string,
"id": string,
"is_paid": boolean,
"items": NonNullable<Json>,
"order_number": string,
"paid_at": string | null,
"payment_method": string,
"shipping_address": NonNullable<Json>,
"status": string,
"status_history": NonNullable<Json>,
"subtotal_ngn": number,
"total_ngn": number,
"user_id": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "orders"
        isOneToOne: true
        isSetofReturn: false
      } },
"search_products":
{ Args: { "p_limit"?: number,"p_q": string }; Returns: {
              "archived_at": string | null,
"brand": string,
"category": string,
"compare_at_ngn": number | null,
"created_at": string,
"description": string,
"featured": boolean,
"id": string,
"images": (string)[],
"in_stock": boolean,
"made_to_order": boolean,
"name": string,
"price_ngn": number,
"slug": string,
"specs": NonNullable<Json>,
"stock_count": number | null,
"tags": (string)[],
"updated_at": string
            }[]
                          SetofOptions: {
        from: "*"
        to: "products"
        isOneToOne: false
        isSetofReturn: true
      } }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const

