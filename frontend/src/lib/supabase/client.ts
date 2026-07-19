import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Definición de tipos para la base de datos de Supabase para mayor seguridad en el tipado
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          role: "user" | "admin";
          created_at: string;
          raw_user_meta_data: Record<string, any> | null;
        };
        Insert: Omit<Database["public"]["Tables"]["users"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
      };
      wallets: {
        Row: {
          id: string;
          user_id: string;
          currency: string;
          balance: number;
          last_updated: string;
        };
        Insert: Omit<Database["public"]["Tables"]["wallets"]["Row"], "id" | "last_updated">;
        Update: Partial<Database["public"]["Tables"]["wallets"]["Insert"]>;
      };
    };
  };
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dummy-url.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy-anon-key";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Advertencia: Las variables de entorno de Supabase no están definidas. Por favor, configura .env.local"
  );
}

// Instancia única (Singleton) para uso en componentes de cliente
export const supabase = createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey);

// Fábrica para crear nuevas instancias limpias cuando sea necesario (ej: SSR o llamadas API)
export function createClient() {
  return createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey);
}
