import { supabase } from "@/integrations/supabase/client";

/**
 * Sends an automatic email notification if notificaciones_email_activas is true.
 * Non-blocking: errors are silently caught.
 */
export async function sendNotificationEmailIfEnabled(config: any, params: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!config?.notificaciones_email_activas) return;
  if (!params.to) return;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          to: params.to,
          subject: params.subject,
          html: params.html,
        }),
      }
    );
  } catch {
    // Non-critical: don't block on email failure
  }
}
