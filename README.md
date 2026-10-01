# BasuSICE 1.1.0 — GitHub Pages / Offline Fix

**Proyecto Verde Esperanza · Semillero SICE · IED San Gabriel · Barranquilla, Colombia**  
**Autor: Mg. Erquinio Alberto Taborda Martinez**

BasuSICE es una plataforma de ciencia ciudadana para organizar recogidas colaborativas, caracterizar residuos, registrar GPS/fotografías/recorridos y generar información ambiental para educación e investigación.

## Incluye
- PWA móvil instalable.
- Trabajo offline y sincronización local.
- Navegación interna independiente de Internet.
- Mapa local offline; OpenStreetMap solo cuando hay conexión.
- Encuesta local con exportación CSV.
- Registro científico de residuos.
- GPS, fotografías y recorridos.
- Mapa local y panel científico.
- Puntos, niveles y ranking.
- Backend REST.
- Registro e inicio de sesión.
- Panel administrativo.
- Exportación de datos.
- Logos SICE y VERALU.
- Política de privacidad y términos de uso como plantillas institucionales.
- Documentación de despliegue y publicación.

## Publicación en GitHub Pages
Esta versión está preparada para un sitio de proyecto publicado en `https://<usuario>.github.io/BasuSICE/`. GitHub Pages sirve archivos estáticos; por tanto, la caracterización, mapa local, encuesta, GPS y almacenamiento local funcionan en el dispositivo, mientras que la sincronización multiusuario requiere desplegar el backend en un servidor HTTPS.

## Ejecución local
Requiere Node.js 18+.

```bash
cd BasuSICE_app
npm start
```
Abrir `http://localhost:8080`.

## Importante para producción
El almacenamiento JSON es únicamente para MVP/validación. Antes de publicar públicamente se debe utilizar una base de datos gestionada, HTTPS, secretos de entorno, backups, almacenamiento seguro de imágenes y revisión institucional/legal de privacidad y términos.

## Panel administrativo
`/admin.html` usando `X-Admin-Key`. La clave debe definirse mediante `BASUSICE_ADMIN_KEY` y nunca debe quedar escrita en el código.

## Licencia y marcas
Los logotipos incluidos deben utilizarse únicamente con autorización de sus titulares. La institución debe definir la licencia del software y de los datos antes de publicar.
