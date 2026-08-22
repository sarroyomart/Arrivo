# Play Console — Arrivo (sin AdMob)

Copia de trabajo para rellenar la ficha **después** de subir el AAB de `eas.json` → perfil `production`. No incluye anuncios ni Advertising ID.

URL de privacidad (pública cuando `Docs/privacy-policy.md` esté en `main`):

<https://github.com/sarroyomart/Arrivo/blob/main/Docs/privacy-policy.md>

Pégala en **Política de privacidad** de la ficha y en Data Safety.

---

## Ficha de la tienda

| Campo | Valor recomendado |
|---|---|
| Nombre | Arrivo |
| Package | `com.arrivo.app` |
| Categoría | Maps & Navigation (alternativa: Tools) |
| Etiquetas | location alarm, geofence, travel |
| Contenido | No dirigido a menores; no hay anuncios |

Descripción corta: alarmas de lugar. Te avisa al entrar o salir de un destino guardado.

---

## Data Safety (borrador)

Marca **sí se recolecta / se comparte** solo lo que sale del teléfono. El GPS del trayecto y las alarmas se quedan en el dispositivo.

| Dato | ¿Recolecta? | ¿Comparte? | Propósito | Opcional | Cifrado en tránsito |
|---|---|---|---|---|---|
| Ubicación precisa | Sí (búsqueda / reverse Nominatim: texto + área o punto) | Sí — OpenStreetMap Foundation (Nominatim, Reino Unido) | Funcionalidad de la app | Sí (solo si el usuario busca o toca el mapa) | Sí (HTTPS) |
| Ubicación aproximada | Sí (viewport del mapa) | Sí — OpenFreeMap / Cloudflare | Funcionalidad de la app | Sí (al mostrar el mapa) | Sí (HTTPS) |
| Archivos de audio | No (copia local del tono; no se sube) | No | — | — | — |
| Contenido de usuario (títulos) | No (solo en el teléfono) | No | — | — | — |
| ID de publicidad | **No** | **No** | — | — | — |
| Analítica / crash | No | No | — | — | — |

Preguntas frecuentes del formulario:

- ¿Se venden datos? **No**
- ¿Se usan para publicidad? **No**
- ¿Los usuarios pueden pedir el borrado en la nube? No hay cuenta. Borrar alarmas o desinstalar elimina lo local.
- ¿Cifrado en reposo por la app? **No** (AsyncStorage en claro). En tránsito, sí (HTTPS).

No marques el permiso `AD_ID`. En el manifiesto de producción está bloqueado.

---

## Declaración de ubicación

- Acceso: **aproximada y precisa**
- Cuándo: **en uso** (primer plano). En Android **no** se pide `ACCESS_BACKGROUND_LOCATION`. Con alarmas activas hay un **foreground service** tipo `location` y la notificación persistente «Arrivo activo».
- Uso: geocercas / alarmas de destino. No es un tracker continuo ni se publica un historial.
- Prominent disclosure: pestaña Permisos del onboarding (el recuadro de privacidad va **antes** de Permitir).

---

## Foreground service (FGS)

Declarar **dos** tipos si el manifiesto fusionado los incluye:

1. **location** — vigilar destinos con la notificación «Arrivo activo / Vigilando tus alarmas de destino». Si el usuario cierra la app o apaga todas las alarmas, el servicio se detiene.
2. **mediaPlayback** — `expo-audio` con reproducción en segundo plano para el bucle de la alarma (`/ringing`). No es un reproductor de música.

Vídeo que pide Play (grabar en un dispositivo real, ~30–60 s):

1. Abrir Arrivo y conceder ubicación + notificaciones + pantalla completa.
2. Crear una alarma y activarla.
3. Salir a segundo plano: se ve la notificación persistente **Arrivo activo**.
4. Simular o cruzar el radio → notificación de alarma / pantalla completa.
5. Abrir `/ringing` y pulsar Apagar.

---

## USE_FULL_SCREEN_INTENT

Uso: **alarma en tiempo real** al cruzar una geocerca (despertar pantalla bloqueada). No es un overlay publicitario ni un chat.

---

## Otros permisos que pueden aparecer

| Permiso | Qué decir |
|---|---|
| `RECEIVE_BOOT_COMPLETED` | Reprogramar avisos de posponer (snooze) y tareas tras reinicio. |
| `POST_NOTIFICATIONS` | Alarma y notificación de seguimiento. |
| `WAKE_LOCK` | Mantener el aviso de alarma audible un momento. |
| `READ/WRITE_EXTERNAL_STORAGE` (maxSdk 32) | Elegir un tono personalizado en Android 12 e inferior (SAF). |
| `RECORD_AUDIO` / `SYSTEM_ALERT_WINDOW` / `ACCESS_NOTIFICATION_POLICY` / `AD_ID` | Deben **no** estar en el AAB (`blockedPermissions`). |

Genera el AAB con:

```bash
eas build --profile production --platform android
```

No subas un artefacto `development` (`developmentClient: true`).
