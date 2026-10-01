# Android e iOS — ruta de publicación

La PWA incluida puede instalarse directamente desde un navegador compatible. Para publicar como aplicación en tiendas se recomienda empaquetarla con Capacitor.

## Preparación
1. Servir la PWA desde HTTPS.
2. Confirmar `manifest.json`, iconos, política de privacidad y URL de soporte.
3. Crear proyecto Capacitor y apuntar `webDir` a la carpeta de la PWA o a un build estático.
4. Añadir plataformas Android e iOS.
5. Configurar permisos de cámara y ubicación con textos de propósito claros.
6. Probar offline, GPS, cámara, sincronización y recuperación de sesión.
7. Firmar Android (AAB) y iOS (Archive/IPA) con las cuentas institucionales.
8. Subir a Google Play Console y App Store Connect.

## Texto sugerido para permisos
**Ubicación:** "BasuSICE usa tu ubicación para georreferenciar observaciones y recorridos ambientales que tú decides registrar." 

**Cámara:** "BasuSICE usa la cámara para documentar residuos y evidencias de las actividades de ciencia ciudadana." 

No solicitar permisos que no sean necesarios para la función elegida.
