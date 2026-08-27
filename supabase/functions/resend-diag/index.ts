import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) {
    return new Response(JSON.stringify({ error: "sin key" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const emailId = url.searchParams.get("email_id");

  const domainsRes = await fetch("https://api.resend.com/domains", {
    headers: { Authorization: `Bearer ${key}` },
  });
  const domains = await domainsRes.json().catch(() => null);

  let email: unknown = null;
  if (emailId) {
    const r = await fetch(`https://api.resend.com/emails/${emailId}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    email = await r.json().catch(() => null);
  }

  return new Response(JSON.stringify({ domainsStatus: domainsRes.status, domains, email }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
