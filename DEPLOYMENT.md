# BasuSICE 1.2.0 — guía de despliegue

## 1. GitHub Pages (frontend)
Para publicar esta versión en un repositorio de proyecto, configura GitHub Pages en `main` y `/ (root)`. La URL tendrá la forma `https://<usuario>.github.io/BasuSICE/`. Los sitios de proyecto de GitHub Pages se publican bajo la ruta del repositorio. 

La PWA 1.2.0 conserva el funcionamiento offline y el service worker preparado para esa subruta y navegación interna sin red.

## 2. Requisitos
- Node.js 18+.
- Dominio con HTTPS para la PWA.
- Servidor para API.
- Para producción, sustituir `data/db.json` por una base de datos gestionada.

## 3. Variables obligatorias
`BASUSICE_ADMIN_KEY`: clave administrativa larga y aleatoria.
`BASUSICE_CORS_ORIGIN`: dominio exacto de la PWA, por ejemplo `https://app.tudominio.org`.
`PORT`: puerto del servidor.
`NODE_ENV=production`.

Nunca publicar la clave administrativa en el frontend, GitHub, capturas o documentación pública.

## 4. Servidor
```bash
cd BasuSICE_app
export NODE_ENV=production
export BASUSICE_ADMIN_KEY='GENERAR_UNA_CLAVE_LARGA_Y_UNICA'
export BASUSICE_CORS_ORIGIN='https://app.tudominio.org'
npm start
```

## 5. HTTPS
Colocar Nginx, Caddy, Cloudflare Tunnel u otro proxy TLS delante de Node. La PWA necesita HTTPS para geolocalización, cámara y capacidades modernas del navegador.

## 6. Base de datos
El JSON incluido es para demostración y pruebas. Antes de producción se recomienda PostgreSQL o SQLite gestionado, con migraciones y copias de seguridad.

## 7. Fotografías
Para producción, almacenar imágenes en un servicio de objetos (S3 compatible, Cloud Storage, etc.) y guardar en la base de datos solamente URL segura, metadatos y hash.

## 8. Dominio sugerido
- `app.<dominio>` para la PWA.
- `api.<dominio>` para la API.
- `admin.<dominio>` para el panel.

## 9. Publicación móvil
La PWA puede instalarse desde navegador. Para Google Play y App Store se recomienda empaquetarla posteriormente con Capacitor o una aplicación nativa, manteniendo esta API como backend.

## Backend central 1.2.0 (PostgreSQL + Render)

Esta versión incluye `server.js`, `render.yaml` y `db/schema.sql` para desplegar una API central con PostgreSQL. Render permite definir un Web Service y una base Postgres en un Blueprint y pasar la cadena de conexión mediante `fromDatabase`.

1. Sube estos archivos al repositorio `basusice/BasuSICE` y confirma el cambio.
2. En Render crea **New → Blueprint** y selecciona el repositorio.
3. Render leerá `render.yaml` y propondrá `basusice-api` + `basusice-db`.
4. Al terminar, prueba `https://TU-SERVICIO.onrender.com/api/health`.
5. En BasuSICE → Perfil → Cuenta y servidor SICE, introduce esa URL y crea la cuenta del participante.
6. Pulsa **Conectar**. Los registros pendientes se enviarán con **Sincronizar** y también al recuperar conexión.

No publiques claves secretas en GitHub. `BASUSICE_ADMIN_KEY` se genera en Render mediante `generateValue`.
