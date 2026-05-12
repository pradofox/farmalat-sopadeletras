/**
 * Catalogos SAT minimos para CFDI 4.0. Bake-in para no depender de SAT en vivo.
 * Actualizables descargando los CSV de https://www.sat.gob.mx/personas/resultado-busqueda?locale=1462228413195&tipobusqueda=predictiva&words=catalogos
 */

export const REGIMEN_FISCAL: Record<string, string> = {
  "601": "General de Ley Personas Morales",
  "603": "Personas Morales con fines no lucrativos",
  "605": "Sueldos y Salarios e Ingresos Asimilados a Salarios",
  "606": "Arrendamiento",
  "607": "Régimen de Enajenación o Adquisición de Bienes",
  "608": "Demás ingresos",
  "610": "Residentes en el Extranjero sin Establecimiento Permanente en México",
  "611": "Ingresos por Dividendos (socios y accionistas)",
  "612": "Personas Físicas con Actividades Empresariales y Profesionales",
  "614": "Ingresos por intereses",
  "615": "Régimen de los ingresos por obtención de premios",
  "616": "Sin obligaciones fiscales",
  "620": "Sociedades Cooperativas de Producción",
  "621": "Incorporación Fiscal",
  "622": "Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras",
  "623": "Opcional para Grupos de Sociedades",
  "624": "Coordinados",
  "625": "Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas",
  "626": "Régimen Simplificado de Confianza",
};

export const USO_CFDI: Record<string, string> = {
  "G01": "Adquisición de mercancías",
  "G02": "Devoluciones, descuentos o bonificaciones",
  "G03": "Gastos en general",
  "I01": "Construcciones",
  "I02": "Mobiliario y equipo de oficina por inversiones",
  "I03": "Equipo de transporte",
  "I04": "Equipo de cómputo y accesorios",
  "I05": "Dados, troqueles, moldes, matrices y herramental",
  "I06": "Comunicaciones telefónicas",
  "I07": "Comunicaciones satelitales",
  "I08": "Otra maquinaria y equipo",
  "D01": "Honorarios médicos, dentales y gastos hospitalarios",
  "D02": "Gastos médicos por incapacidad o discapacidad",
  "D03": "Gastos funerales",
  "D04": "Donativos",
  "D05": "Intereses reales efectivamente pagados por créditos hipotecarios (casa habitación)",
  "D06": "Aportaciones voluntarias al SAR",
  "D07": "Primas por seguros de gastos médicos",
  "D08": "Gastos de transportación escolar obligatoria",
  "D09": "Depósitos en cuentas para el ahorro, primas que tengan como base planes de pensiones",
  "D10": "Pagos por servicios educativos (colegiaturas)",
  "S01": "Sin efectos fiscales",
  "CP01": "Pagos",
  "CN01": "Nómina",
};

export const FORMA_PAGO: Record<string, string> = {
  "01": "Efectivo",
  "02": "Cheque nominativo",
  "03": "Transferencia electrónica de fondos",
  "04": "Tarjeta de crédito",
  "05": "Monedero electrónico",
  "06": "Dinero electrónico",
  "08": "Vales de despensa",
  "12": "Dación en pago",
  "13": "Pago por subrogación",
  "14": "Pago por consignación",
  "15": "Condonación",
  "17": "Compensación",
  "23": "Novación",
  "24": "Confusión",
  "25": "Remisión de deuda",
  "26": "Prescripción o caducidad",
  "27": "A satisfacción del acreedor",
  "28": "Tarjeta de débito",
  "29": "Tarjeta de servicios",
  "30": "Aplicación de anticipos",
  "31": "Intermediario pagos",
  "99": "Por definir",
};

// Mapea forma de pago interna a clave SAT
export const PAYMENT_TO_SAT: Record<string, string> = {
  cash: "01",
  card_debit: "28",
  card_credit: "04",
  transfer: "03",
  wallet: "05",
  credit: "99",
};

export function isValidRfc(rfc: string): boolean {
  return /^[A-ZÑ&]{3,4}\d{6}[A-Z\d]{3}$/.test(rfc.toUpperCase().trim());
}

export function isGenericRfc(rfc: string): boolean {
  const r = rfc.toUpperCase().trim();
  return r === "XAXX010101000" || r === "XEXX010101000";
}
