# Play Console — Arrivo (sin AdMob)

Textos listos para pegar **después** de subir el AAB del perfil `production` (`eas.json`). Esta versión **no** incluye anuncios ni Advertising ID.

**URL de privacidad** (pública en `main`; pégala en la ficha y en Data Safety):

<https://github.com/sarroyomart/Arrivo/blob/main/Docs/privacy-policy.md>

Contacto de privacidad: Sergio Arroyo Martín · <sarroyomart@gmail.com>  
Issues: <https://github.com/sarroyomart/Arrivo/issues>

Genera el AAB solo con:

```bash
eas build --profile production --platform android
```

No subas un artefacto `development` (`developmentClient: true`).

---

## Ficha de la tienda

| Campo | Valor |
|---|---|
| Nombre | Arrivo |
| Package | `com.arrivo.app` |
| Categoría | Maps & Navigation (alternativa: Tools) |
| Etiquetas | location alarm, geofence, travel |
| Público | No dirigido a menores |
| Anuncios | **No** |
| Política de privacidad | URL de arriba |

**Descripción corta (80 caracteres máx., ajustar):**

```
Alarmas de lugar: te avisa al entrar o salir de un destino. GPS del viaje en el teléfono.
```

**Descripción completa:**

```
Arrivo te avisa cuando entras o sales de un destino que hayas guardado.

Creas una alarma con un punto en el mapa y un radio. El teléfono vigila esa zona. Al cruzarla suena una alarma local (notificación de alta prioridad y, en Android, pantalla completa si lo permites).

El GPS del trayecto se procesa en el dispositivo. No hay cuenta ni servidor propio. Si buscas una dirección o tocas el mapa, esa consulta va a Nominatim (OpenStreetMap). El mapa usa teselas de OpenFreeMap.

En Android, con una alarma activa verás la notificación persistente «Arrivo activo». Si cierras la app o apagas todas las alarmas, el seguimiento se detiene. No pedimos «Permitir todo el tiempo».

No hay anuncios en esta versión.
```

No uses «100 % offline» en la ficha: el mapa y la búsqueda usan red.

---

## Data Safety

Marca **recolecta / comparte** solo lo que **sale del teléfono**. El GPS del trayecto y las alarmas se quedan en el dispositivo.

Pegar en el formulario:

| Tipo de dato | ¿Se recolecta? | ¿Se comparte? | Propósito | Opcional | Cifrado en tránsito | Cifrado en reposo |
|---|---|---|---|---|---|---|
| Ubicación precisa | **Sí** — búsqueda Nominatim (texto + área) y reverse al tocar el mapa (coordenadas del punto) | **Sí** — OpenStreetMap Foundation (Nominatim, Reino Unido) | Funcionalidad de la app | **Sí** (solo si el usuario busca o toca el mapa) | **Sí** (HTTPS) | **No** (la app no cifra AsyncStorage) |
| Ubicación aproximada | **Sí** — viewport de teselas del mapa | **Sí** — OpenFreeMap / Cloudflare | Funcionalidad de la app | **Sí** (al mostrar el mapa) | **Sí** (HTTPS) | **No** |
| Archivos de audio | **No** (copia local del tono; no se sube) | **No** | — | — | — | — |
| Contenido de usuario (títulos) | **No** (solo en el teléfono) | **No** | — | — | — | — |
| ID de publicidad | **No** | **No** | — | — | — | — |
| Analítica / crash / FCM | **No** | **No** | — | — | — | — |

Preguntas frecuentes:

- ¿Se venden datos? **No**
- ¿Se usan para publicidad? **No**
- ¿Los usuarios pueden pedir el borrado en la nube? No hay cuenta. Borrar alarmas o desinstalar elimina lo local.
- ¿Cifrado en reposo por la app? **No**
- ¿Cifrado en tránsito? **Sí** (HTTPS hacia Nominatim y teselas)

No declares el permiso `AD_ID`. Está en `blockedPermissions`.

No marques Firebase Cloud Messaging / analítica como producto: no hay `google-services.json` ni push. La política ya explica que `expo-notifications` puede incluir código no inicializado de Firebase Messaging. Si el informe de SDKs del AAB lista Firebase, no contradigas la política; no declares IDs ni mensajería como datos que la app usa.

---

## Declaración de ubicación

Copiar:

```
Arrivo usa ubicación precisa y aproximada solo mientras se usa la app
(permiso «Permitir solo mientras la app está en uso»).

En Android no pedimos ACCESS_BACKGROUND_LOCATION ni «Permitir todo
el tiempo». Con alarmas activas hay un foreground service tipo location
y la notificación persistente «Arrivo activo / Vigilando tus alarmas de
destino». Si el usuario cierra la app o apaga todas las alarmas, el
servicio se detiene.

Uso: detectar si el usuario entra o sale de un destino guardado
(geocerca / alarma de lugar). No es un tracker continuo y no se publica
un historial.

La búsqueda de direcciones y el toque en el mapa envían consulta o
coordenadas a Nominatim (OpenStreetMap). El mapa descarga teselas de
OpenFreeMap.

Prominent disclosure: pestaña Permisos del onboarding. El recuadro de
privacidad aparece antes del diálogo nativo «Permitir».
```

En el formulario de Play:

- Acceso: **aproximada y precisa**
- Cuándo: **en uso** (primer plano). **No** marcar ubicación en segundo plano.
- Uso: funcionalidad de la app (alarmas de destino)

La cadencia GPS adaptativa (intervalos 12 s → 1 s, `PRIORITY_HIGH_ACCURACY`, ajuste por velocidad) es detalle de implementación en el dispositivo. **No** cambia este formulario, Data Safety, ni la política: no hay permiso nuevo, no hay `ACCESS_BACKGROUND_LOCATION`, el GPS del trayecto no se sube. Especificación: [`location-tracking.md`](location-tracking.md).

---

## Foreground service (FGS)

Declarar **dos** tipos (el manifiesto de producción los incluye):

### 1. `location`

```
Tipo: location
Por qué: vigilar destinos guardados mientras hay alarmas activas, con
la notificación persistente «Arrivo activo / Vigilando tus alarmas de
destino» (distancia en línea recta al destino más cercano).
Cuándo para: el usuario cierra la app o apaga todas las alarmas.
No es seguimiento permanente ni se sube el GPS del trayecto.
```

### 2. `mediaPlayback`

```
Tipo: mediaPlayback
Por qué: bucle de audio de la alarma de llegada/salida en /ringing
(expo-audio, reproducción en segundo plano). No es un reproductor de
música ni un podcast.
Cuándo para: el usuario pulsa Apagar alarma o Posponer.
```

**Vídeo** (dispositivo real, ~30–60 s, sin recortes que oculten la notificación):

1. Abrir Arrivo. Completar onboarding: ubicación *en uso*, notificaciones, pantalla completa.
2. Crear una alarma, activarla.
3. Salir a segundo plano: se ve **Arrivo activo**.
4. Cruzar o simular el radio → notificación de alarma / pantalla completa.
5. Abrir `/ringing` (audio en bucle) y pulsar **Apagar**.
6. Comprobar que desaparece la notificación de seguimiento.

---

## USE_FULL_SCREEN_INTENT

Declarar **alarma** como funcionalidad principal (core):

```
Arrivo es una app de alarmas de lugar. Al entrar o salir del radio de un
destino guardado debe despertar la pantalla bloqueada y abrir la
pantalla de alarma (/ringing), igual que una alarma de despertador
cuando llega la hora.

No es un overlay publicitario, un chat ni un recordatorio genérico.
El usuario concede el permiso de notificaciones a pantalla completa
en el onboarding (Android 14+). Si lo niega, la alarma sigue como
notificación de alta prioridad sin abrir encima de la pantalla de bloqueo.
```

---

## Otros permisos que pueden aparecer

| Permiso | Qué decir |
|---|---|
| `RECEIVE_BOOT_COMPLETED` | Reprogramar avisos de posponer (snooze) y tareas tras reinicio. |
| `POST_NOTIFICATIONS` | Alarma y notificación de seguimiento. |
| `WAKE_LOCK` | Mantener audible el aviso y el FGS de ubicación (tope 12 h). |
| `FOREGROUND_SERVICE_MEDIA_PLAYBACK` | Bucle de la alarma en `/ringing`. |
| `READ/WRITE_EXTERNAL_STORAGE` (maxSdk 32) | Elegir un tono personalizado en Android 12 e inferior (SAF). |
| `RECORD_AUDIO` / `SYSTEM_ALERT_WINDOW` / `ACCESS_NOTIFICATION_POLICY` / `AD_ID` / `ACCESS_BACKGROUND_LOCATION` | **No** deben estar en el AAB (`blockedPermissions` + `tools:node=remove`). |

Tras el build, abre el AAB en Android Studio / `bundletool` y confirma el manifiesto fusionado.

---

## AdMob (fuera de esta versión)

No implementar hasta un envío posterior. Entonces: UMP en EEE/UK, quitar `AD_ID` de `blockedPermissions`, actualizar esta ficha y Data Safety, geocoder propio o de pago, y **cero anuncios** en `/ringing` ni sobre la pantalla de bloqueo.
