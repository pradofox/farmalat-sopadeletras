# FarmaLat

Sistema de punto de venta y gestión para farmacias mexicanas. Reconstrucción SaaS multi-tenant del sistema interno de LAATEC.

**Producción:** https://farmalat.sopadeletras.art

## Stack

- Astro 6 con SSR sobre Cloudflare Workers
- React islands para componentes interactivos (POS)
- Tailwind CSS v4
- Drizzle ORM sobre Cloudflare D1 (SQLite distribuido)
- Auth con sesiones en Cloudflare KV (próximamente)

## Comandos

```bash
npm install
npm run dev               # http://localhost:4321
npm run build
npx wrangler deploy       # producción
npx drizzle-kit generate  # nueva migración tras editar schema
```

## Schema y migraciones

```bash
# Tras editar src/db/schema.ts:
npx drizzle-kit generate --name nombre_migracion

# Aplicar a remoto:
npx wrangler d1 execute farmalat-db --remote --file=drizzle/migrations/XXXX.sql

# Aplicar a local:
npx wrangler d1 execute farmalat-db --local --file=drizzle/migrations/XXXX.sql
```

## Identidad visual

Brand assets en `public/brand/` (isotipo, wordmark, lockup en 3 variantes de color cada uno). Design tokens del sistema en `src/styles/global.css`.

Paleta basada en brandbook LAATEC 2021, extendida con neutrales y semánticos para UI de POS.

## Roadmap

- **Fase 0** (hoy): scaffold, deploy, landing pública, schema D1 inicial
- **Fase 1** (semana 1-2): auth multi-tenant, importación catálogo, POS funcional, historial de ventas, reporte básico
- **Fase 2** (semana 3-6): CFDI 4.0, multi-almacén con transferencias, reporte COFEPRIS, comisiones por médico
- **Fase 3** (mes 2): cuentas-paciente, promociones, app móvil consulta

## Hecho por

[sopadeletras®](https://sopadeletras.art) para [Laboratory & Technology](https://laatec.com).
