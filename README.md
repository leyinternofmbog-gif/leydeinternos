# UNAL RIM — Netlify, sin sincronización PISIS

Proyecto Next.js 15 con Netlify Functions **JavaScript**, autenticación OTP y consulta a dos proyectos REDCap. **No incluye** scripts PISIS, Excel de internos, tokens, contraseñas ni archivos `.env` reales.

## Despliegue
1. Descomprime y sube el repositorio a GitHub; conecta ese repositorio en Netlify. **No uses drag-and-drop del ZIP fuente como si fuera una carpeta HTML compilada.**
2. Configura las variables indicadas en `.env.example` en Netlify > Site configuration > Environment variables. Usa tokens REDCap nuevos, ya que se compartieron en archivos de conversación. No publiques secretos.
3. Build: `npm run build`; Next.js se integra mediante `@netlify/plugin-nextjs`.
4. Comprueba el correo OTP, el acceso autorizado y la carga del tablero.

## Consideraciones importantes
- Los diccionarios REDCap permiten mapear Base Maestra `numero_identificacion` a Encuesta `documento`, y construir el nombre completo desde cuatro campos.
- El campo `pdf_planilla` es un archivo REDCap; la exportación normal de registros no devuelve el nombre original. **No se valida su convención de nombres** en esta versión.
- Los meses faltantes son preliminares porque el diccionario no contiene un campo de meses exentos. Validar reglas con el área funcional antes de usar para decisiones.
- El OTP firmado es válido 10 minutos; sin almacenamiento de usos, no garantiza un único uso real. Para producción se requiere almacenamiento de desafíos con consumo atómico, limitación de intentos/rate limiting y controles adicionales de acceso.
- No se exportan datos bancarios en el endpoint. Los datos personales de auditoría requieren políticas de acceso, retención y registro de accesos.
- No se ha verificado el despliegue en una cuenta Netlify real ni el acceso a REDCap.
