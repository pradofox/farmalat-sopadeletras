# FarmaLat - Brand Assets

Extraídos del lockup oficial `LOGOTIPO FARMALAT.svg` (LAATEC, 2026).

## Archivos

### Lockup (isotipo + wordmark horizontal)
- `farmalat-lockup-blue.svg` - sobre fondos claros
- `farmalat-lockup-white.svg` - sobre fondos oscuros (azul LAATEC, negro)
- `farmalat-lockup-black.svg` - monocromo, impresión BN, faxes, sellos

### Isotipo (solo el sello circular con "F@")
- `farmalat-isotipo-blue.svg` - default, sobre fondos claros
- `farmalat-isotipo-white.svg` - sobre fondos oscuros
- `farmalat-isotipo-black.svg` - monocromo

### Wordmark (solo el texto "FarmaLat")
- `farmalat-wordmark-blue.svg`
- `farmalat-wordmark-white.svg`
- `farmalat-wordmark-black.svg`

## Color de marca

| Token | Hex | Uso |
|---|---|---|
| Brand Blue | `#10069F` | Primario, default sobre fondos claros |
| White | `#FFFFFF` | Sobre fondos oscuros |
| Black | `#000000` | Monocromo, print sin color |

## Reglas de uso

1. **Sello circular**: NO usar sin el fondo (el círculo es parte del isotipo, no decoración)
2. **Espacio de respeto**: mínimo igual al diámetro del "@" interno alrededor del lockup
3. **Tamaño mínimo isotipo**: 24x24px en pantalla, 8mm en print
4. **Tamaño mínimo lockup**: 120x28px en pantalla, 40mm de ancho en print
5. **Fondos prohibidos**: rojos, amarillos brillantes, gradientes saturados (ver brandbook LAATEC sección "Usos incorrectos")
6. **NO**: estirar, rotar, recolorear fuera de paleta oficial, agregar sombras o efectos

## Uso en código (Astro/HTML)

```html
<!-- Isotipo inline -->
<img src="/brand/farmalat-isotipo-blue.svg" alt="FarmaLat" width="32" height="32" />

<!-- Lockup en header -->
<img src="/brand/farmalat-lockup-blue.svg" alt="FarmaLat" height="40" />
```

Para favicon: convertir `farmalat-isotipo-blue.svg` a PNG 32x32 y 192x192, más versión ICO.
