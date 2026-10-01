# Arquitectura BasuSICE 1.2.0

```text
Android / iOS / Web PWA
          |
          | HTTPS
          v
GitHub Pages (PWA offline-first)
          |
          | HTTPS / REST
          v
     basusice-api (Node.js)
          |
          v
   PostgreSQL central
          |
          +--> registros científicos
          +--> usuarios / sesiones
          +--> actividades
          +--> ranking
          +--> estadísticas
```

La PWA conserva el trabajo local cuando no hay Internet. Al recuperar conectividad, los registros pendientes pueden sincronizarse con el backend cuando el usuario tenga una cuenta y una URL de servidor configurada.

El backend usa PostgreSQL cuando `DATABASE_URL` existe y un almacenamiento JSON local únicamente para pruebas/desarrollo.
