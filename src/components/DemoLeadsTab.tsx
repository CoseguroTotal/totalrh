import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Search } from "lucide-react";
import DemoSecurityPanel from "@/components/DemoSecurityPanel";

export function useIsSuperadmin() {
  return useQuery({
    queryKey: ["is-superadmin"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("is_superadmin" as any);
      if (error) return false;
      return Boolean(data);
    },
  });
}

export default function DemoLeadsTab() {
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["demo-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("demo_leads" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const rows = (data ?? []).filter((r) => {
    if (!q.trim()) return true;
    const t = `${r.nombre} ${r.email} ${r.empresa ?? ""}`.toLowerCase();
    return t.includes(q.toLowerCase());
  });

  const exportCsv = () => {
    const headers = ["Nombre", "Email", "Empresa", "Teléfono", "Estado email", "Verificado", "Accesos", "Último acceso", "Fecha solicitud"];
    const lines = rows.map((r) =>
      [r.nombre, r.email, r.empresa ?? "", r.telefono ?? "", r.ultimo_email_estado ?? "", r.verificado ? "Sí" : "No", r.accesos,
       r.ultimo_acceso ? new Date(r.ultimo_acceso).toLocaleString("es-AR") : "",
       new Date(r.created_at).toLocaleString("es-AR")]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(";")
    );
    const csv = "\uFEFF" + [headers.join(";"), ...lines].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `solicitudes-demo-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4 pt-4">
      <DemoSecurityPanel />
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Buscar por nombre, email o empresa" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={!rows.length}>
          <Download className="h-4 w-4 mr-1.5" /> Exportar CSV
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">{rows.length} solicitud(es) de acceso a la demo.</p>

      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/60">
            <tr className="text-left">
              <th className="px-3 py-2 font-medium">Nombre</th>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Empresa</th>
              <th className="px-3 py-2 font-medium">Teléfono</th>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Verificó</th>
              <th className="px-3 py-2 font-medium">Accesos</th>
              <th className="px-3 py-2 font-medium">Último acceso</th>
              <th className="px-3 py-2 font-medium">Solicitud</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">{r.nombre}</td>
                <td className="px-3 py-2">{r.email}</td>
                <td className="px-3 py-2">{r.empresa ?? "—"}</td>
                <td className="px-3 py-2">{r.telefono ?? "—"}</td>
                <td className="px-3 py-2">
                  {r.ultimo_email_estado
                    ? `${r.ultimo_email_estado}${r.ultimo_email_at ? ` · ${new Date(r.ultimo_email_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}` : ""}`
                    : "—"}
                </td>
                <td className="px-3 py-2">{r.verificado ? "Sí" : "No"}</td>
                <td className="px-3 py-2">{r.accesos}</td>
                <td className="px-3 py-2">{r.ultimo_acceso ? new Date(r.ultimo_acceso).toLocaleString("es-AR") : "—"}</td>
                <td className="px-3 py-2">{new Date(r.created_at).toLocaleDateString("es-AR")}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">Todavía no hay solicitudes.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
