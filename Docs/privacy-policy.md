# Privacy policy — Arrivo

**Last updated: 22 August 2026**

This policy applies to the Arrivo mobile app (`com.arrivo.app`). Arrivo has no user accounts and no first-party backend.

Public copy for Google Play: this file in the project repository  
<https://github.com/sarroyomart/Arrivo/blob/main/Docs/privacy-policy.md>

The same information is also available in the app under **Information → Privacy policy**.

---

## English

### What stays on the device

Alarm titles, destination coordinates, radii, custom alarm sounds, and language preference are stored only on the phone (local storage and app files). There is no sign-in and no first-party analytics. While an alarm is active, Arrivo reads GPS on the device (Android foreground service with a visible “Arrivo active” notification, or iOS geofences) to detect whether you enter or leave a saved zone. That trip GPS is not uploaded to a server we operate. Android backup of app data is disabled (`allowBackup=false`).

### What is sent over the internet

- **Address search:** if you type a place and tap Search, the query and an approximate map area (when GPS is available) are sent to **Nominatim**, the public geocoder run by the OpenStreetMap Foundation (United Kingdom).
- **Map tap (reverse geocode):** tapping the map sends **that point’s coordinates** to Nominatim so the app can show a place name. This is precise location, only for the point you chose, and only when you tap.
- **Map display:** vector tiles are loaded from **OpenFreeMap** (Hyperknot Software Kft., Hungary). Delivery may use **Cloudflare**. Tile requests reveal the map area you are viewing, not a stored trip history.

### Audio

You may pick an audio file on the device as an alarm tone. It is copied into the app’s private folder and is not uploaded.

### Third parties

OpenStreetMap Foundation (Nominatim), Hyperknot Software Kft. / OpenFreeMap, Cloudflare, and on Android Google Play Services for fused location on-device. This version does not use AdMob, the advertising ID, the microphone, or draw-over-other-apps.

Arrivo does not use Firebase Cloud Messaging, Analytics, or Crashlytics. The Android notifications library may include unused Firebase Messaging code; it is not initialized (no Firebase project) and does not send push or analytics.

### Your choices

Delete alarms in the app or uninstall Arrivo to remove local data. There is no cloud profile to request.

Map data © OpenStreetMap contributors, licensed under the Open Database License (ODbL). See <https://www.openstreetmap.org/copyright>.

### Contact

Data controller: Sergio Arroyo Martín, developer of Arrivo on Google Play.

Email: <sarroyomart@gmail.com>  
Project repository: <https://github.com/sarroyomart/Arrivo>  
GitHub issues: <https://github.com/sarroyomart/Arrivo/issues>

---

## Español

### Qué se queda en el dispositivo

Títulos de alarmas, coordenadas, radios, sonidos personalizados e idioma se guardan solo en el teléfono. No hay cuenta ni analítica propia. Con una alarma activa, Arrivo lee el GPS en el dispositivo (servicio en primer plano en Android con la notificación “Arrivo activo”, o geocercas en iOS) para detectar si entras o sales de una zona. Ese GPS del trayecto no se sube a un servidor nuestro. En Android la copia de seguridad de los datos de la app está desactivada (`allowBackup=false`).

### Qué se envía por Internet

- **Búsqueda de direcciones:** si escribes un lugar y pulsas Buscar, la consulta y un área aproximada (si hay GPS) se envían a **Nominatim** (OpenStreetMap Foundation, Reino Unido).
- **Toque en el mapa (geocodificación inversa):** se envían **las coordenadas de ese punto** a Nominatim para mostrar un nombre. Es ubicación precisa, solo del punto que eliges y solo al tocar.
- **Mapa:** las teselas vectoriales las sirve **OpenFreeMap** (Hyperknot Software Kft., Hungría). La entrega puede usar **Cloudflare**. Eso revela la zona que estás viendo, no un historial de trayectos.

### Audio

Puedes elegir un archivo de audio del dispositivo como tono. Se copia a la carpeta de la app y no se envía a ningún servidor.

### Terceros

OpenStreetMap Foundation (Nominatim), Hyperknot Software Kft. / OpenFreeMap, Cloudflare y, en Android, Google Play Services para la ubicación fusionada en el dispositivo. Esta versión no usa AdMob, identificador de publicidad, micrófono ni superposición sobre otras apps.

Arrivo no usa Firebase Cloud Messaging, Analytics ni Crashlytics. La librería de notificaciones de Android puede incluir código no usado de Firebase Messaging; no está inicializado (no hay proyecto Firebase) y no envía push ni analítica.

### Tus opciones

Borra alarmas en la app o desinstala Arrivo para eliminar los datos locales. No hay perfil en la nube.

Datos del mapa © OpenStreetMap contributors, bajo Open Database License (ODbL). Ver <https://www.openstreetmap.org/copyright>.

### Contacto

Responsable: Sergio Arroyo Martín, desarrollador de Arrivo en Google Play.

Email: <sarroyomart@gmail.com>  
Repositorio: <https://github.com/sarroyomart/Arrivo>  
Issues de GitHub: <https://github.com/sarroyomart/Arrivo/issues>
