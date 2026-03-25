import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useConfigGrupo() {
  return useQuery({
    queryKey: ["configuracion_grupo"],
    queryFn: async () => {
      const { data, error } = await supabase.from("configuracion_grupo").select("*").limit(1).single();
      if (error) throw error;
      return data as any;
    },
  });
}
