import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export type WalletData = {
  balance: number;
  currency: string;
};

export function useSession() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [wallet, setWallet] = useState<WalletData | null>(null);

  // Función para forzar la actualización manual de la sesión
  const refreshSession = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    } catch (error) {
      console.error("Error al refrescar la sesión:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // 1. Obtener la sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // 2. Suscribirse a cambios en el estado de autenticación (login, logout, token_refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 3. Cargar billetera en tiempo real una vez que el usuario inicia sesión
  useEffect(() => {
    if (!user) {
      setWallet(null);
      return;
    }

    // A. Obtener saldo inicial de la base de datos
    const fetchInitialWallet = async () => {
      const { data, error } = (await supabase
        .from("wallets")
        .select("balance, currency")
        .eq("user_id", user.id)
        .maybeSingle()) as any;

      if (!error && data) {
        setWallet({
          balance: Number(data.balance),
          currency: data.currency,
        });
      }
    };

    fetchInitialWallet();

    // B. Crear canal en tiempo real para escuchar actualizaciones sobre la billetera del usuario
    const walletChannel = supabase
      .channel(`wallet-updates-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "wallets",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new && "balance" in payload.new) {
            setWallet({
              balance: Number(payload.new.balance),
              currency: payload.new.currency as string,
            });
          }
        }
      )
      .subscribe();

    // C. Limpieza de canales al desmontar o desloguear
    return () => {
      supabase.removeChannel(walletChannel);
    };
  }, [user]);

  return {
    user,
    isLoading,
    refreshSession,
    wallet,
  };
}
