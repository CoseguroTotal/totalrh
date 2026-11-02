// Web Push sin dependencias (sólo WebCrypto): sirve en las edge functions y en los tests.
// Cifrado del mensaje según RFC 8291 (aes128gcm) y firma VAPID según RFC 8292.

const te = new TextEncoder();

export function aBase64Url(bytes: Uint8Array) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function deBase64Url(texto: string) {
  const b64 = texto.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(texto.length / 4) * 4, "=");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

const unir = (...partes: Uint8Array[]) => {
  const out = new Uint8Array(partes.reduce((n, p) => n + p.length, 0));
  let i = 0;
  for (const p of partes) { out.set(p, i); i += p.length; }
  return out;
};

async function hmac(clave: Uint8Array, datos: Uint8Array) {
  const k = await crypto.subtle.importKey("raw", clave as BufferSource, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, datos as BufferSource));
}

/** HKDF de un solo bloque (alcanza para claves de hasta 32 bytes). */
async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, largo: number) {
  const prk = await hmac(salt, ikm);
  return (await hmac(prk, unir(info, new Uint8Array([1])))).slice(0, largo);
}

/** Clave pública P-256 sin comprimir (65 bytes) → JWK. */
function jwkPublica(raw: Uint8Array): JsonWebKey {
  return { kty: "EC", crv: "P-256", x: aBase64Url(raw.slice(1, 33)), y: aBase64Url(raw.slice(33, 65)), ext: true };
}

export interface ClavesVapid {
  /** Clave pública sin comprimir en base64url: es la applicationServerKey del navegador. */
  publica: string;
  /** Clave privada como JWK (con d, x, y). */
  privada: JsonWebKey;
}

export async function generarClavesVapid(): Promise<ClavesVapid> {
  const par = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const publica = new Uint8Array(await crypto.subtle.exportKey("raw", par.publicKey));
  const privada = await crypto.subtle.exportKey("jwk", par.privateKey);
  return { publica: aBase64Url(publica), privada };
}

/** Encabezado Authorization con el JWT firmado para el servicio de push del endpoint. */
export async function encabezadoVapid(endpoint: string, claves: ClavesVapid, contacto: string, ahora = Date.now()) {
  const aud = new URL(endpoint).origin;
  const cab = aBase64Url(te.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const cuerpo = aBase64Url(te.encode(JSON.stringify({ aud, exp: Math.floor(ahora / 1000) + 12 * 3600, sub: contacto })));
  const k = await crypto.subtle.importKey("jwk", { ...claves.privada, key_ops: ["sign"] }, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  // WebCrypto devuelve la firma como r||s, que es el formato que pide JWS
  const firma = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, k, te.encode(`${cab}.${cuerpo}`)));
  return `vapid t=${cab}.${cuerpo}.${aBase64Url(firma)}, k=${claves.publica}`;
}

export interface Suscripcion {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/**
 * Cifra el mensaje para una suscripción (RFC 8291). La clave efímera y la sal se pueden
 * pasar para reproducir el ejemplo del RFC en los tests; normalmente se generan al azar.
 */
export async function cifrarMensaje(
  sub: Pick<Suscripcion, "p256dh" | "auth">,
  texto: string,
  fijo?: { efimera: { publica: Uint8Array; privada: JsonWebKey }; sal: Uint8Array },
) {
  const uaPublica = deBase64Url(sub.p256dh);
  const secretoAuth = deBase64Url(sub.auth);

  let asPublica: Uint8Array;
  let asPrivada: CryptoKey;
  if (fijo) {
    asPublica = fijo.efimera.publica;
    asPrivada = await crypto.subtle.importKey("jwk", { ...fijo.efimera.privada, key_ops: ["deriveBits"] }, { name: "ECDH", namedCurve: "P-256" }, false, ["deriveBits"]);
  } else {
    const par = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
    asPublica = new Uint8Array(await crypto.subtle.exportKey("raw", par.publicKey));
    asPrivada = par.privateKey;
  }
  const sal = fijo?.sal ?? crypto.getRandomValues(new Uint8Array(16));

  const uaClave = await crypto.subtle.importKey("jwk", jwkPublica(uaPublica), { name: "ECDH", namedCurve: "P-256" }, false, []);
  const compartido = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaClave }, asPrivada, 256));

  const ikm = await hkdf(secretoAuth, compartido, unir(te.encode("WebPush: info\0"), uaPublica, asPublica), 32);
  const cek = await hkdf(sal, ikm, te.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(sal, ikm, te.encode("Content-Encoding: nonce\0"), 12);

  const k = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  // Un único registro: el texto y el delimitador 0x02 de "último registro"
  const cifrado = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, k, unir(te.encode(texto), new Uint8Array([2]))));

  const rs = new Uint8Array([0, 0, 0x10, 0]); // 4096
  return unir(sal, rs, new Uint8Array([asPublica.length]), asPublica, cifrado);
}

export interface ResultadoEnvio {
  ok: boolean;
  status: number;
  /** El navegador dio de baja la suscripción: hay que borrarla. */
  vencida: boolean;
}

export async function enviarPush(sub: Suscripcion, datos: unknown, claves: ClavesVapid, contacto: string, ttl = 24 * 3600): Promise<ResultadoEnvio> {
  const cuerpo = await cifrarMensaje(sub, JSON.stringify(datos));
  const r = await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      Authorization: await encabezadoVapid(sub.endpoint, claves, contacto),
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: String(ttl),
      Urgency: "high",
    },
    body: cuerpo,
  });
  await r.body?.cancel();
  return { ok: r.ok, status: r.status, vencida: r.status === 404 || r.status === 410 };
}
