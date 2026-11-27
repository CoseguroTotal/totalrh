import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { destinatariosPermitidos } from "../_shared/soporte.ts";
import { errorPublico } from "../_shared/errores.ts";
import { MENSAJE_SIN_ORG, orgDeUsuario, rolesEnOrg } from "../_shared/organizacion.ts";

// Multiempresa: los permisos y el remitente son los de la organización de quien envía.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY no está configurada");
    }

    // Verify JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // El remitente no se toma del navegador: siempre es el configurado en la empresa
    const { to, subject, html } = await req.json();

    // Sin este control cualquier cuenta (incluidas las creadas desde el portal) podía mandar
    // emails a cualquier dirección en nombre de la empresa.
    const adminClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const org = await orgDeUsuario(adminClient, user.id);
    if (!org) {
      return new Response(JSON.stringify({ error: MENSAJE_SIN_ORG }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const permiso = destinatariosPermitidos(
      await rolesEnOrg(adminClient, user.id, org),
      (Array.isArray(to) ? to : [to]).map((x: unknown) => String(x ?? "").trim()).filter(Boolean),
    );
    if (!permiso.ok) {
      return new Response(JSON.stringify({ error: permiso.error }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: "Faltan campos requeridos: to, subject, html" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Remitente configurado en la organización (o el de TotalRH)
    let senderEmail = "";
    {
      const { data: config } = await adminClient
        .from("configuracion_grupo")
        .select("email_remitente, nombre_grupo")
        .eq("organizacion_id", org)
        .maybeSingle();
      senderEmail = config?.email_remitente || "no-reply@totalrh.com.ar";
      if (!senderEmail.includes("<")) {
        senderEmail = `TotalRH <${senderEmail}>`;
      }
    }

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: senderEmail,
        to: Array.isArray(to) ? to : [to],
        reply_to: "info@skystudio.ar",
        subject,
        html,
        text: String(html).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
      }),
    });

    const resendBody = await resendRes.json();

    if (!resendRes.ok) {
      console.error("Resend error:", resendBody);
      return new Response(
        JSON.stringify({ error: "El servicio de email no aceptó el envío. Revisá la dirección o probá más tarde." }),
        { status: resendRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Resend aceptado para ${Array.isArray(to) ? to.join(", ") : to} — id: ${resendBody.id}`);

    return new Response(JSON.stringify({ success: true, id: resendBody.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in send-email:", error);
    return new Response(
      JSON.stringify({ error: errorPublico(error, "No se pudo enviar el email") }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
