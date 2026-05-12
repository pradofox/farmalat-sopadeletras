# FarmaLat

Sistema de punto de venta y gestión para farmacias mexicanas. SaaS multi-tenant construido por [sopadeletras®](https://sopadeletras.art) para [Laboratory & Technology](https://laatec.com).

**Producción:** https://farmalat.sopadeletras.art

## Demo

Tenant pre-seedeado para piloto Farmacia Alfa:

- Email: `lilian@farmacia-alfa.mx`
- Contraseña: `lili2026`

20 productos cargados (medicamentos, antibióticos Grupo IV, un psicotrópico Grupo III, higiene, consumo), stock inicial por producto, cliente Público en General, médico demo con comisión.

## Stack

- Astro 6 SSR sobre Cloudflare Workers
- React islands para POS y formularios complejos
- Tailwind CSS v4 con design tokens basados en brandbook LAATEC
- Drizzle ORM sobre Cloudflare D1 (SQLite distribuido, 16 tablas)
- Sesiones en Cloudflare KV con cookie httpOnly
- Hash de password con PBKDF2 (WebCrypto nativo)
- Importación de catálogo con SheetJS (xlsx/xls/csv)

## Lo que ya funciona

| Módulo | Ruta | Estado |
|---|---|---|
| Landing pública con pricing | `/` | OK |
| Signup y login | `/signup` `/login` | OK |
| Dashboard con KPIs | `/app` | OK |
| Punto de venta (escáner, atajos F12/Esc, mobile) | `/app/venta` | OK |
| Ticket imprimible 80mm | `/app/venta/ticket/[id]` | OK |
| Historial de ventas con filtros | `/app/historial` | OK |
| Inventario por sucursal | `/app/inventario` | OK |
| Movimientos con balance materializado | `/app/movimientos` | OK |
| Cotización imprimible | `/app/cotizacion` | OK |
| Productos: lista, alta, edición, importar XLSX | `/app/productos` | OK |
| Clientes y médicos | `/app/clientes` `/app/medicos` | OK |
| Reporte ventas | `/app/reportes/ventas` | OK |
| Libro de control COFEPRIS imprimible | `/app/reportes/cofepris` | OK |
| Mínimos y máximos | `/app/reportes/min-max` | OK |
| Proveedores y órdenes a proveedor | `/app/proveedores` `/app/ordenes` | Placeholder Fase 2 |

## Comandos

```bash
npm install
npm run dev               # http://localhost:4321
npm run build
npx wrangler deploy       # producción

# Schema
npx drizzle-kit generate --name nombre_migracion
npx wrangler d1 execute farmalat-db --remote --file=drizzle/migrations/XXXX.sql

# Seed (idempotente)
curl -X POST https://farmalat.sopadeletras.art/api/seed \
  -H "Origin: https://farmalat.sopadeletras.art"
```

## Identidad visual

Brand assets en `public/brand/` (isotipo, wordmark, lockup en variantes blue/white/black). Tokens en `src/styles/global.css` con paleta LAATEC oficial (Pantone Blue 072 C / 2018 C / 2268 C / 2717 C / 2017 C) extendida con escalas semánticas y neutrales para UI de POS.

## Roadmap

- **Fase 0** ✅ scaffold, deploy, landing, schema D1, brand assets
- **Fase 1** ✅ auth multi-tenant, importación catálogo, POS funcional, historial, inventario, reportes, COFEPRIS, mobile responsive
- **Fase 2** Facturapi (CFDI 4.0), factura global diaria por Worker Cron, portal de autofactura, multi-almacén con transferencias, terminal de cobro Clip, agente nativo de impresión
- **Fase 3** Cuentas-paciente hospitalario, promociones, app móvil, integración con LIS de LAATEC

## Hecho por

[sopadeletras®](https://sopadeletras.art) para [Laboratory & Technology](https://laatec.com).
