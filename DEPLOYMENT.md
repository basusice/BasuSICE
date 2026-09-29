# BasuSICE 1.0.0 — guía de despliegue

## 1. Requisitos
- Node.js 18+.
- Dominio con HTTPS para la PWA.
- Servidor para API.
- Para producción, sustituir `data/db.json` por una base de datos gestionada.

## 2. Variables obligatorias
`BASUSICE_ADMIN_KEY`: clave administrativa larga y aleatoria.
`BASUSICE_CORS_ORIGIN`: dominio exacto de la PWA, por ejemplo `https://app.tudominio.org`.
`PORT`: puerto del servidor.
`NODE_ENV=production`.

Nunca publicar la clave administrativa en el frontend, GitHub, capturas o documentación pública.

## 3. Servidor
```bash
cd BasuSICE_app
export NODE_ENV=production
export BASUSICE_ADMIN_KEY='GENERAR_UNA_CLAVE_LARGA_Y_UNICA'
export BASUSICE_CORS_ORIGIN='https://app.tudominio.org'
npm start
```

## 4. HTTPS
Colocar Nginx, Caddy, Cloudflare Tunnel u otro proxy TLS delante de Node. La PWA necesita HTTPS para geolocalización, cámara y capacidades modernas del navegador.

## 5. Base de datos
El JSON incluido es para demostración y pruebas. Antes de producción se recomienda PostgreSQL o SQLite gestionado, con migraciones y copias de seguridad.

## 6. Fotografías
Para producción, almacenar imágenes en un servicio de objetos (S3 compatible, Cloud Storage, etc.) y guardar en la base de datos solamente URL segura, metadatos y hash.

## 7. Dominio sugerido
- `app.<dominio>` para la PWA.
- `api.<dominio>` para la API.
- `admin.<dominio>` para el panel.

## 8. Publicación móvil
La PWA puede instalarse desde navegador. Para Google Play y App Store se recomienda empaquetarla posteriormente con Capacitor o una aplicación nativa, manteniendo esta API como backend.
