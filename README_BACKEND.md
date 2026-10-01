# BasuSICE 1.2.0 · Backend central

Esta versión conecta BasuSICE con PostgreSQL cuando `DATABASE_URL` está configurada. Sin esa variable, el backend conserva un modo JSON local para pruebas.

## Despliegue recomendado

El archivo `render.yaml` crea un Web Service Node y una base PostgreSQL. En Render: New → Blueprint y selecciona el repositorio que contiene este archivo. Render puede crear el PostgreSQL y pasar su `connectionString` al servicio mediante `fromDatabase`. 

Después de desplegar, la API responde en:
`https://NOMBRE_DEL_SERVICIO.onrender.com/api/health`

La aplicación PWA debe usar esa URL en Perfil → Cuenta y servidor SICE.

## Endpoints principales
- GET /api/health
- POST /api/register
- POST /api/login
- POST /api/sync
- GET /api/me
- GET /api/stats
- GET /api/ranking
- GET /api/admin/summary (X-Admin-Key)
- GET /api/admin/export (X-Admin-Key)

No se deben subir secretos al repositorio.


## URL predeterminada de la PWA
La PWA intenta comprobar automáticamente `https://basusice-api.onrender.com/api/health`. Si ese servicio aún no está desplegado, la aplicación continúa funcionando en modo local.
