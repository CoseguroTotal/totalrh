// Reglas puras de la demo (testeadas desde src/test/demoRules.test.ts)

export function codigoVencido(expiraAt: string | Date, ahora: Date = new Date()) {
  return new Date(expiraAt).getTime() < ahora.getTime();
}

export function expiraCodigo(minutos: number, ahora: Date = new Date()) {
  return new Date(ahora.getTime() + minutos * 60_000);
}

/** true cuando la cantidad de fallos ya alcanzó el máximo permitido */
export function debeBloquear(fallos: number, maximo: number) {
  return fallos >= maximo;
}

export function expiraCuenta(dias: number, ahora: Date = new Date()) {
  return new Date(ahora.getTime() + dias * 24 * 60 * 60_000);
}

export function cuentaVencida(expiraAt: string | Date, ahora: Date = new Date()) {
  return codigoVencido(expiraAt, ahora);
}

export function minutosRestantes(hasta: string | Date, ahora: Date = new Date()) {
  return Math.max(1, Math.ceil((new Date(hasta).getTime() - ahora.getTime()) / 60_000));
}
