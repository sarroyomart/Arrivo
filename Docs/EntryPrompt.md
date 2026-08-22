Quiero hacer una aplicación móvil que se pueda desplegar tanto en Android como en iOS que que consista en una alarma que se pone en una ubicación y cuando el usuario se adentre en dicho área de ubicación, suene dicha alarma notificando que se ha llegado.

Para ello me gustaría saber qué herramientas pueden ser utilizadas para el desarrollo de la aplicación, considerando que no quiero gastar dinero en el mantenimiento ni desarrollo de esta. Para estas herramientas considerar el diseño visual, las funcionalidades, codificación, etc.

Con respecto a las funcionalidades principales de la primera versión cabría destacar:

-Selección de la ubicación principal tanto por caja de búsqueda como por selección en mapa.
-Completa customización de colores y tamaño de radio de notificación.
-Almacenamiento local de diferentes posibles alarmas de lugar, no sólo de una.
-(Si tienes alguna sugerencia de qué mas funcionalidades podrían ser interesantes y me destaquen más sobre mi competencia).




Actúa como un Desarrollador Mobile Senior experto en React Native y Expo.

Quiero crear una aplicación móvil para iOS y Android llamada "Arrivo": una app de alarmas y recordatorios basados en geolocalización (Geofencing) que funciona 100% offline y con coste de infraestructura $0.

### 🛠️ Stack Tecnológico
- **Framework:** React Native con Expo (TypeScript, Expo Router).
- **Estilos:** NativeWind (Tailwind CSS) o StyleSheet nativo limpio.
- **Mapas:** `@maplibre/maplibre-react-native` (OpenStreetMap / OpenFreeMap, sin API key).
- **Geofencing / Background Location:** `expo-location` y `expo-task-manager`.
- **Notificaciones & Audio:** `expo-notifications` y `expo-audio` (para reproducir sonido de alarma en bucle hasta que el usuario lo detenga).
- **Persistencia de datos:** `@react-native-async-storage/async-storage` para guardar múltiples alarmas localmente.

---

### 📱 Requerimientos Funcionales (MVP)

1. **Gestión de Alarmas (CRUD):**
   - Lista principal con alarmas activas/inactivas (toggle switch).
   - Crear, editar y eliminar alarmas.
   - Cada alarma debe almacenar: Título, latitud, longitud, radio (en metros, configurable de 100m a 5000m mediante slider), color identificativo del radio en el mapa, y estado (activa/inactiva).

2. **Selector de Ubicación:**
   - Pantalla o modal de mapa interactivo donde el usuario pueda tocar para colocar un marcador.
   - Campo de búsqueda de dirección por texto (Nominatim / OpenStreetMap).
   - Vista previa dinámica del círculo de radio con el color personalizado elegido por el usuario.

3. **Monitoreo en Segundo Plano (Geofencing):**
   - Configurar la tarea de geofencing en segundo plano con `Location.startGeofencingAsync`.
   - Cuando el usuario cruza el perímetro de una alarma activa:
     - Lanzar notificación local de alta prioridad.
     - Disparar sonido de alarma persistente.
     - Mostrar modal/pantalla en primer plano con botón "Apagar Alarma".

4. **Diseño & UX:**
   - Interfaz moderna, limpia, con soporte para Dark Mode.
   - Manejo claro y pedagógico de la solicitud de permisos (`LOCATION_FOREGROUND`, `LOCATION_BACKGROUND`, `NOTIFICATIONS`).

---

### 🚀 Instrucciones de Entrega
1. Comienza estructurando la arquitectura de carpetas recomendada.
2. Proporciona el archivo de configuración necesario (`app.json` con los plugins de background permissions).
3. Genera el código modular y completamente tipado con TypeScript, incluyendo el servicio de geofencing y el almacenamiento local.


