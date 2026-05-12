/**
 * Generador de CFDI 4.0 MOCK (sin timbrar) para Fase 1.
 * Cuando se integre Facturapi en Fase 2, sustituir este modulo por el adapter PAC.
 */
export interface CfdiReceptor {
  rfc: string;
  name: string;
  regimenFiscal: string;
  zipCode: string;
  usoCfdi: string;
}

export interface CfdiEmisor {
  rfc: string;
  name: string;
  regimenFiscal: string;
}

export interface CfdiConcepto {
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  ivaPct: number;
  ivaAmount: number;
  satProdServKey?: string;
  satUnitKey?: string;
}

export interface Cfdi {
  serie: string;
  folio: string;
  fecha: Date;
  formaPago: string;
  metodoPago: "PUE" | "PPD";
  subtotal: number;
  ivaTotal: number;
  total: number;
  emisor: CfdiEmisor;
  receptor: CfdiReceptor;
  conceptos: CfdiConcepto[];
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function fmtNum(n: number): string { return n.toFixed(2); }

/**
 * UUID mock con prefijo MOCK- para que sea evidente que no está timbrado.
 * Genera 36 chars formato UUID v4.
 */
export function makeMockUuid(): string {
  const hex = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `MOCK-${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export function buildCfdiXml(cfdi: Cfdi, uuid: string): string {
  const fecha = cfdi.fecha.toISOString().slice(0, 19);
  const conceptos = cfdi.conceptos.map((c) => `
    <cfdi:Concepto
      ClaveProdServ="${escapeXml(c.satProdServKey ?? "01010101")}"
      Cantidad="${c.quantity}"
      ClaveUnidad="${escapeXml(c.satUnitKey ?? "ACT")}"
      Descripcion="${escapeXml(c.productName)}"
      ValorUnitario="${fmtNum(c.unitPrice)}"
      Importe="${fmtNum(c.subtotal)}"
      ObjetoImp="${c.ivaPct > 0 ? "02" : "01"}">
      ${c.ivaPct > 0 ? `
      <cfdi:Impuestos>
        <cfdi:Traslados>
          <cfdi:Traslado Base="${fmtNum(c.subtotal)}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="${(c.ivaPct / 100).toFixed(6)}" Importe="${fmtNum(c.ivaAmount)}"/>
        </cfdi:Traslados>
      </cfdi:Impuestos>` : ""}
    </cfdi:Concepto>`).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- CFDI MOCK generado por FarmaLat. NO TIMBRADO. Solo para pruebas. -->
<cfdi:Comprobante
  xmlns:cfdi="http://www.sat.gob.mx/cfd/4"
  Version="4.0"
  Serie="${escapeXml(cfdi.serie)}"
  Folio="${escapeXml(cfdi.folio)}"
  Fecha="${fecha}"
  Sello="MOCK"
  FormaPago="${cfdi.formaPago}"
  NoCertificado="MOCK"
  Certificado="MOCK"
  SubTotal="${fmtNum(cfdi.subtotal)}"
  Moneda="MXN"
  Total="${fmtNum(cfdi.total)}"
  TipoDeComprobante="I"
  Exportacion="01"
  MetodoPago="${cfdi.metodoPago}"
  LugarExpedicion="${escapeXml(cfdi.receptor.zipCode || "00000")}">
  <cfdi:Emisor
    Rfc="${escapeXml(cfdi.emisor.rfc)}"
    Nombre="${escapeXml(cfdi.emisor.name)}"
    RegimenFiscal="${escapeXml(cfdi.emisor.regimenFiscal)}"/>
  <cfdi:Receptor
    Rfc="${escapeXml(cfdi.receptor.rfc)}"
    Nombre="${escapeXml(cfdi.receptor.name)}"
    DomicilioFiscalReceptor="${escapeXml(cfdi.receptor.zipCode)}"
    RegimenFiscalReceptor="${escapeXml(cfdi.receptor.regimenFiscal)}"
    UsoCFDI="${escapeXml(cfdi.receptor.usoCfdi)}"/>
  <cfdi:Conceptos>${conceptos}
  </cfdi:Conceptos>
  ${cfdi.ivaTotal > 0 ? `<cfdi:Impuestos TotalImpuestosTrasladados="${fmtNum(cfdi.ivaTotal)}">
    <cfdi:Traslados>
      <cfdi:Traslado Base="${fmtNum(cfdi.subtotal)}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="${fmtNum(cfdi.ivaTotal)}"/>
    </cfdi:Traslados>
  </cfdi:Impuestos>` : ""}
  <cfdi:Complemento>
    <tfd:TimbreFiscalDigital
      xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital"
      Version="1.1"
      UUID="${uuid}"
      FechaTimbrado="${fecha}"
      RfcProvCertif="MOCK"
      SelloCFD="MOCK"
      NoCertificadoSAT="MOCK"
      SelloSAT="MOCK"/>
  </cfdi:Complemento>
</cfdi:Comprobante>
`;
}
