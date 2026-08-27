const KEY = "totalrh_demo_access";

export function grantDemoAccess(expiresAt: number) {
  localStorage.setItem(KEY, String(expiresAt));
}

export function hasDemoAccess() {
  const raw = localStorage.getItem(KEY);
  if (!raw) return false;
  const exp = Number(raw);
  if (!exp || Number.isNaN(exp) || exp < Date.now()) {
    localStorage.removeItem(KEY);
    return false;
  }
  return true;
}

const FN_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

async function callDemoFn(fn: string, body: unknown) {
  const res = await fetch(`${FN_BASE}/${fn}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify(body),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload.error || "No se pudo completar la operación");
  return payload;
}

export function requestDemoCode(data: { nombre: string; email: string; empresa?: string; telefono?: string }) {
  return callDemoFn("demo-request-code", data);
}

export async function verifyDemoCode(email: string, codigo: string) {
  const payload = await callDemoFn("demo-verify-code", { email, codigo });
  grantDemoAccess(payload.expiresAt ?? Date.now() + 24 * 60 * 60 * 1000);
  return payload;
}
