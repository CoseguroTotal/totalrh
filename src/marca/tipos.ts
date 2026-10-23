/** Marca de la empresa cliente que se muestra junto a TotalRH. */
export interface MarcaCliente {
  nombre: string;
  /** Logo completo, para fondos claros (login, muro). */
  logo: string;
  /** Símbolo cuadrado para fondos claros (encabezado del celular, terminal). */
  simbolo: string;
  /** Símbolo cuadrado para fondos oscuros (barra lateral). */
  simboloClaro: string;
}
