import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useUserRole() {
  return useQuery({
    queryKey: ["user-role"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data?.role as string | null;
    },
  });
}

export function useIsAdmin() {
  const { data: role, isLoading } = useUserRole();
  return { isAdmin: role === "admin", isLoading };
}

export function useHasRole(targetRole: string) {
  const { data: role, isLoading } = useUserRole();
  return { hasRole: role === targetRole, isLoading };
}

export function useHasAnyRole(...roles: string[]) {
  const { data: role, isLoading } = useUserRole();
  return { hasRole: role ? roles.includes(role) : false, isLoading };
}
