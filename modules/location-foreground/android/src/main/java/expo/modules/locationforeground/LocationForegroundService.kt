package expo.modules.locationforeground

import android.annotation.SuppressLint
import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import android.os.Bundle
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.provider.Settings
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.google.android.gms.common.ConnectionResult
import com.google.android.gms.common.GoogleApiAvailability
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import org.json.JSONObject
import java.text.NumberFormat
import java.util.Locale
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.roundToInt

class LocationForegroundService : Service() {
  private val fusedClient by lazy { LocationServices.getFusedLocationProviderClient(this) }
  private var locationManager: LocationManager? = null
  private var wakeLock: PowerManager.WakeLock? = null
  private var usingFused = false

  private var alarms: List<TrackedAlarm> = emptyList()
  private val insideIds = mutableSetOf<String>()
  private val firedIds = mutableSetOf<String>()
  private var seeded = false
  private var lastKnownLocation: Location? = null
  private var ongoingTitle = DEFAULT_ONGOING_TITLE
  private var ongoingBody = DEFAULT_ONGOING_BODY
  private var nearTemplate = DEFAULT_NEAR_TEMPLATE
  private var insideTemplate = DEFAULT_INSIDE_TEMPLATE
  private var moreTemplate = DEFAULT_MORE_TEMPLATE
  private var localeTag = "en"
  private var lastPublishedTitle = ""
  private var lastPublishedBody = ""
  private var lastNotifiedDistance: Float? = null
  private var lastNotifiedInside: Boolean? = null
  private var lastNotifiedAlarmId: String? = null
  private var currentSampling: LocationSampling? = null

  private val fusedCallback = object : LocationCallback() {
    override fun onLocationResult(result: LocationResult) {
      val location = result.lastLocation ?: return
      onLocation(location)
    }
  }

  private val managerListener = object : LocationListener {
    override fun onLocationChanged(location: Location) {
      onLocation(location)
    }

    @Deprecated("Deprecated in Java")
    override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) = Unit

    override fun onProviderEnabled(provider: String) = Unit

    override fun onProviderDisabled(provider: String) = Unit
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    isRunning.set(true)
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val action = intent?.action
    if (action == ACTION_STOP) {
      LocationForegroundStore.clear(this)
      shutdown()
      return START_NOT_STICKY
    }
    if (action == ACTION_PAUSE) {
      shutdown()
      return START_NOT_STICKY
    }

    val stored = LocationForegroundStore.load(this)
    val title = intent?.getStringExtra(EXTRA_ONGOING_TITLE)?.takeIf { it.isNotBlank() }
      ?: stored?.ongoingTitle
    val body = intent?.getStringExtra(EXTRA_ONGOING_BODY)?.takeIf { it.isNotBlank() }
      ?: stored?.ongoingBody
    val copyJson = intent?.getStringExtra(EXTRA_ONGOING_COPY_JSON)?.takeIf { it.isNotBlank() }
      ?: stored?.copyJson
    val alarmsJson = intent?.getStringExtra(EXTRA_ALARMS_JSON)?.takeIf { it.isNotBlank() }
      ?: stored?.alarmsJson

    title?.let { ongoingTitle = it }
    body?.let { ongoingBody = it }
    applyCopyJson(copyJson)

    val parsed = TrackedAlarm.parseList(alarmsJson)
    alarms = parsed
    insideIds.retainAll(parsed.map { it.id }.toSet())
    firedIds.retainAll(parsed.map { it.id }.toSet())
    lastNotifiedDistance = null
    lastNotifiedInside = null
    lastNotifiedAlarmId = null
    lastPublishedTitle = ""
    lastPublishedBody = ""
    currentSampling = null

    try {
      startAsForeground()
    } catch (error: Exception) {
      Log.w(LocationForegroundBridge.TAG, "startForeground failed", error)
      shutdown()
      return START_NOT_STICKY
    }

    if (alarms.isEmpty()) {
      shutdown()
      return START_NOT_STICKY
    }

    if (!hasLocationPermission()) {
      Log.w(LocationForegroundBridge.TAG, "Missing fine/coarse location; stopping service")
      shutdown()
      return START_NOT_STICKY
    }

    LocationForegroundStore.save(
      this,
      alarmsJson ?: "[]",
      ongoingTitle,
      ongoingBody,
      copyJson.orEmpty(),
    )
    startLocationUpdates()
    return START_STICKY
  }

  override fun onTaskRemoved(rootIntent: Intent?) {
    LocationForegroundStore.clear(this)
    shutdown()
    super.onTaskRemoved(rootIntent)
  }

  override fun onDestroy() {
    stopLocationUpdates()
    releaseWakeLock()
    isRunning.set(false)
    super.onDestroy()
  }

  private fun startAsForeground() {
    ensureTrackingChannel()
    val notification = currentOngoingNotification()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(
        NOTIFICATION_ID,
        notification,
        ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION,
      )
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
    acquireWakeLock()
  }

  @SuppressLint("MissingPermission")
  private fun startLocationUpdates() {
    stopLocationUpdates()
    currentSampling = null
    if (!hasLocationPermission()) {
      shutdown()
      return
    }

    val initial = samplingFor(initialRemainingMeters(), current = null)
    val playServices = GoogleApiAvailability.getInstance().isGooglePlayServicesAvailable(this)
    if (playServices == ConnectionResult.SUCCESS) {
      try {
        requestFusedUpdates(initial)
        usingFused = true
        fusedClient.lastLocation.addOnSuccessListener { location ->
          if (location != null) {
            onLocation(location)
          }
        }
        return
      } catch (error: SecurityException) {
        Log.w(LocationForegroundBridge.TAG, "Fused location permission denied", error)
        shutdown()
        return
      } catch (error: Exception) {
        Log.w(LocationForegroundBridge.TAG, "Fused location failed; falling back", error)
      }
    }

    startLegacyLocationUpdates(initial)
  }

  @SuppressLint("MissingPermission")
  private fun requestFusedUpdates(sampling: LocationSampling) {
    val request = LocationRequest.Builder(sampling.priority, sampling.intervalMs)
      .setMinUpdateIntervalMillis(sampling.minIntervalMs)
      .setMinUpdateDistanceMeters(sampling.minDistanceMeters)
      .setMaxUpdateDelayMillis(sampling.intervalMs)
      .setWaitForAccurateLocation(false)
      .build()
    fusedClient.requestLocationUpdates(request, fusedCallback, Looper.getMainLooper())
    currentSampling = sampling
  }

  @SuppressLint("MissingPermission")
  private fun startLegacyLocationUpdates(sampling: LocationSampling) {
    val manager = getSystemService(LOCATION_SERVICE) as? LocationManager ?: run {
      shutdown()
      return
    }
    locationManager = manager
    usingFused = false
    val providers = listOf(
      LocationManager.GPS_PROVIDER,
      LocationManager.NETWORK_PROVIDER,
    ).filter { manager.isProviderEnabled(it) }
    if (providers.isEmpty()) {
      Log.w(LocationForegroundBridge.TAG, "No location providers enabled")
      return
    }
    try {
      for (provider in providers) {
        manager.requestLocationUpdates(
          provider,
          sampling.intervalMs,
          sampling.minDistanceMeters,
          managerListener,
          Looper.getMainLooper(),
        )
        manager.getLastKnownLocation(provider)?.let(::onLocation)
      }
      currentSampling = sampling
    } catch (error: SecurityException) {
      Log.w(LocationForegroundBridge.TAG, "LocationManager permission denied", error)
      shutdown()
    }
  }

  @SuppressLint("MissingPermission")
  private fun adaptLocationSampling(remainingMeters: Float, speedMps: Float) {
    if (!hasLocationPermission()) {
      return
    }
    val next = samplingFor(remainingMeters, currentSampling, speedMps)
    if (next == currentSampling) {
      return
    }
    try {
      if (usingFused) {
        requestFusedUpdates(next)
        return
      }
      locationManager?.let { manager ->
        try {
          manager.removeUpdates(managerListener)
        } catch (_: Exception) {
        }
        val providers = listOf(
          LocationManager.GPS_PROVIDER,
          LocationManager.NETWORK_PROVIDER,
        ).filter { manager.isProviderEnabled(it) }
        for (provider in providers) {
          manager.requestLocationUpdates(
            provider,
            next.intervalMs,
            next.minDistanceMeters,
            managerListener,
            Looper.getMainLooper(),
          )
        }
        currentSampling = next
      }
    } catch (error: SecurityException) {
      Log.w(LocationForegroundBridge.TAG, "Unable to adapt location sampling", error)
    } catch (error: Exception) {
      Log.w(LocationForegroundBridge.TAG, "Unable to adapt location sampling", error)
    }
  }

  private fun initialRemainingMeters(): Float {
    val location = lastKnownLocation ?: return SAMPLING_NEAR_METERS
    return findNearestAlarm(location)?.remainingMeters ?: SAMPLING_NEAR_METERS
  }

  private fun stopLocationUpdates() {
    try {
      if (usingFused) {
        fusedClient.removeLocationUpdates(fusedCallback)
      }
    } catch (_: Exception) {
    }
    try {
      locationManager?.removeUpdates(managerListener)
    } catch (_: Exception) {
    }
    locationManager = null
    usingFused = false
    currentSampling = null
  }

  private fun onLocation(location: Location) {
    val speedMps = speedMetersPerSecond(location, lastKnownLocation)
    lastKnownLocation = location
    if (alarms.isEmpty()) {
      shutdown()
      return
    }

    val nextInside = mutableSetOf<String>()
    val results = FloatArray(1)

    for (alarm in alarms) {
      Location.distanceBetween(
        location.latitude,
        location.longitude,
        alarm.latitude,
        alarm.longitude,
        results,
      )
      val inside = results[0] <= alarm.radius
      if (inside) {
        nextInside.add(alarm.id)
      }

      if (!seeded || alarm.id in firedIds) {
        continue
      }

      val wasInside = alarm.id in insideIds
      val shouldFire = if (alarm.isExit) {
        wasInside && !inside
      } else {
        !wasInside && inside
      }
      if (shouldFire) {
        firedIds.add(alarm.id)
        fireAlarm(alarm)
      }
    }

    insideIds.clear()
    insideIds.addAll(nextInside)
    seeded = true

    val nearest = findNearestAlarm(location) ?: return
    adaptLocationSampling(nearest.remainingMeters, speedMps)
    if (shouldRefreshNotification(nearest)) {
      publishOngoingDistance(nearest)
    }
  }

  private fun speedMetersPerSecond(location: Location, previous: Location?): Float {
    if (location.hasSpeed() && location.speed > 0f) {
      return location.speed
    }
    if (previous == null) {
      return 0f
    }
    val dtSec = (location.elapsedRealtimeNanos - previous.elapsedRealtimeNanos) / 1_000_000_000f
    if (dtSec < 0.8f) {
      return 0f
    }
    return previous.distanceTo(location) / dtSec
  }

  private fun notificationRefreshThreshold(remainingMeters: Float): Float {
    val remaining = if (remainingMeters.isFinite() && remainingMeters > 0f) {
      remainingMeters
    } else {
      0f
    }
    return max(NOTIFICATION_MIN_REFRESH_METERS, remaining * NOTIFICATION_REFRESH_FRACTION)
  }

  private fun shouldRefreshNotification(nearest: NearestOngoing): Boolean {
    val lastDistance = lastNotifiedDistance ?: return true
    if (lastNotifiedAlarmId != nearest.alarmId) {
      return true
    }
    if (lastNotifiedInside != nearest.inside) {
      return true
    }
    if (nearest.inside) {
      return false
    }
    return abs(nearest.remainingMeters - lastDistance) >=
      notificationRefreshThreshold(nearest.remainingMeters)
  }

  private fun fireAlarm(alarm: TrackedAlarm) {
    persistPendingRinging(alarm.id)
    presentAlarmNotification(alarm)
    LocationForegroundBridge.emitTriggered(
      mapOf(
        "id" to alarm.id,
        "title" to alarm.title,
        "trigger" to alarm.trigger,
      ),
    )
  }

  private fun persistPendingRinging(alarmId: String) {
    getSharedPreferences(LocationForegroundBridge.PREFS, MODE_PRIVATE)
      .edit()
      .putString(LocationForegroundBridge.KEY_PENDING_RINGING, alarmId)
      .apply()
  }

  private fun presentAlarmNotification(alarm: TrackedAlarm) {
    ensureAlarmChannel(alarm.channelId.ifBlank { DEFAULT_ALARM_CHANNEL }, alarm.silent)

    val launchIntent = packageManager.getLaunchIntentForPackage(packageName) ?: return
    launchIntent.addFlags(
      Intent.FLAG_ACTIVITY_NEW_TASK or
        Intent.FLAG_ACTIVITY_CLEAR_TOP or
        Intent.FLAG_ACTIVITY_SINGLE_TOP or
        Intent.FLAG_ACTIVITY_REORDER_TO_FRONT,
    )
    if (alarm.launchUrl.isNotBlank()) {
      launchIntent.data = android.net.Uri.parse(alarm.launchUrl)
    }
    launchIntent.putExtra("alarmId", alarm.id)
    launchIntent.putExtra("action", "RINGING")

    val identifier = "arrivo-ringing-${alarm.id}"
    val pendingFlags =
      PendingIntent.FLAG_UPDATE_CURRENT or
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
    val requestCode = identifier.hashCode() and 0x7fffffff
    val fullScreenIntent = PendingIntent.getActivity(this, requestCode, launchIntent, pendingFlags)

    val extras = Bundle()
    extras.putString("alarmId", alarm.id)
    extras.putString("action", "RINGING")

    val builder = NotificationCompat.Builder(
      this,
      alarm.channelId.ifBlank { DEFAULT_ALARM_CHANNEL },
    )
      .setSmallIcon(notificationIcon())
      .setContentTitle(alarm.alarmTitle.ifBlank { alarm.title })
      .setContentText(alarm.alarmBody.ifBlank { alarm.title })
      .setStyle(
        NotificationCompat.BigTextStyle().bigText(alarm.alarmBody.ifBlank { alarm.title }),
      )
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setOngoing(true)
      .setAutoCancel(false)
      .setContentIntent(fullScreenIntent)
      .setFullScreenIntent(fullScreenIntent, true)
      .setExtras(extras)
      .setVibrate(longArrayOf(0, 500, 200, 500))
      .setLights(0xFFEA580C.toInt(), 500, 500)

    if (alarm.silent) {
      builder.setSilent(true)
    } else {
      val alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
        ?: Settings.System.DEFAULT_ALARM_ALERT_URI
      builder.setSound(alarmUri)
    }

    NotificationManagerCompat.from(this).notify(requestCode, builder.build())
  }

  private fun currentOngoingNotification(): Notification {
    val location = lastKnownLocation
    val nearest = if (location != null && alarms.isNotEmpty()) {
      findNearestAlarm(location)
    } else {
      null
    }
    val (title, body) = if (nearest != null) {
      composeOngoingText(nearest)
    } else {
      ongoingTitle to ongoingBody
    }
    rememberPublishedNotification(title, body, nearest)
    return buildOngoingNotification(title, body)
  }

  private fun publishOngoingDistance(nearest: NearestOngoing) {
    val (title, body) = composeOngoingText(nearest)
    if (title == lastPublishedTitle && body == lastPublishedBody) {
      if (lastNotifiedDistance == null) {
        rememberPublishedNotification(title, body, nearest)
      }
      return
    }
    rememberPublishedNotification(title, body, nearest)
    try {
      NotificationManagerCompat.from(this).notify(
        NOTIFICATION_ID,
        buildOngoingNotification(title, body),
      )
    } catch (error: Exception) {
      Log.w(LocationForegroundBridge.TAG, "Failed to update ongoing notification", error)
    }
  }

  private fun rememberPublishedNotification(
    title: String,
    body: String,
    nearest: NearestOngoing?,
  ) {
    lastPublishedTitle = title
    lastPublishedBody = body
    if (nearest == null) {
      return
    }
    lastNotifiedDistance = nearest.remainingMeters
    lastNotifiedInside = nearest.inside
    lastNotifiedAlarmId = nearest.alarmId
  }

  private fun composeOngoingText(nearest: NearestOngoing): Pair<String, String> {
    val title = if (nearest.inside) {
      applyTemplate(insideTemplate, mapOf("title" to nearest.title))
    } else {
      applyTemplate(
        nearTemplate,
        mapOf(
          "distance" to formatDistanceLabel(nearest.displayMeters),
          "title" to nearest.title,
        ),
      )
    }
    val body = if (nearest.extraCount > 0) {
      applyTemplate(moreTemplate, mapOf("count" to nearest.extraCount.toString()))
    } else {
      ongoingBody
    }
    return title to body
  }

  private fun findNearestAlarm(location: Location): NearestOngoing? {
    if (alarms.isEmpty()) {
      return null
    }
    val results = FloatArray(1)
    var nearest: TrackedAlarm? = null
    var nearestDistance = Float.POSITIVE_INFINITY

    for (alarm in alarms) {
      if (alarm.id in firedIds) {
        continue
      }
      Location.distanceBetween(
        location.latitude,
        location.longitude,
        alarm.latitude,
        alarm.longitude,
        results,
      )
      if (results[0] < nearestDistance) {
        nearestDistance = results[0]
        nearest = alarm
      }
    }

    if (nearest == null) {
      for (alarm in alarms) {
        Location.distanceBetween(
          location.latitude,
          location.longitude,
          alarm.latitude,
          alarm.longitude,
          results,
        )
        if (results[0] < nearestDistance) {
          nearestDistance = results[0]
          nearest = alarm
        }
      }
    }

    val alarm = nearest ?: return null
    val label = alarm.title.ifBlank { ongoingTitle }
    val remaining = if (nearestDistance.isFinite()) nearestDistance else 0f
    return NearestOngoing(
      alarmId = alarm.id,
      title = label,
      remainingMeters = remaining,
      displayMeters = remaining.roundToInt().coerceAtLeast(0),
      inside = remaining <= alarm.radius,
      extraCount = (alarms.size - 1).coerceAtLeast(0),
    )
  }

  private fun formatDistanceLabel(meters: Int): String {
    if (meters < 1000) {
      return "$meters m"
    }
    val km = meters / 1000.0
    val locale = numberLocale()
    val formatter = NumberFormat.getNumberInstance(locale).apply {
      maximumFractionDigits = if (km >= 10) 0 else 1
      minimumFractionDigits = 0
    }
    return "${formatter.format(km)} km"
  }

  private fun numberLocale(): Locale {
    return if (localeTag.startsWith("es", ignoreCase = true)) {
      Locale("es", "ES")
    } else {
      Locale.US
    }
  }

  private fun applyTemplate(template: String, values: Map<String, String>): String {
    var output = template
    for ((key, value) in values) {
      output = output.replace("{{$key}}", value)
    }
    return output
  }

  private fun applyCopyJson(json: String?) {
    if (json.isNullOrBlank()) {
      return
    }
    try {
      val obj = JSONObject(json)
      obj.optString("near").takeIf { it.isNotBlank() }?.let { nearTemplate = it }
      obj.optString("inside").takeIf { it.isNotBlank() }?.let { insideTemplate = it }
      obj.optString("more").takeIf { it.isNotBlank() }?.let { moreTemplate = it }
      obj.optString("locale").takeIf { it.isNotBlank() }?.let { localeTag = it }
    } catch (error: Exception) {
      Log.w(LocationForegroundBridge.TAG, "Invalid ongoing copy JSON", error)
    }
  }

  private fun buildOngoingNotification(title: String, body: String): Notification {
    val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
    val pendingFlags =
      PendingIntent.FLAG_UPDATE_CURRENT or
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
    val contentIntent = launchIntent?.let {
      it.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
      PendingIntent.getActivity(this, 0, it, pendingFlags)
    }

    val expanded = if (body.isNotBlank() && body != title) "$title\n$body" else title
    return NotificationCompat.Builder(this, TRACKING_CHANNEL_ID)
      .setSmallIcon(notificationIcon())
      .setContentTitle(title)
      .setContentText(body)
      .setStyle(NotificationCompat.BigTextStyle().bigText(expanded))
      .setOngoing(true)
      .setSilent(true)
      .setOnlyAlertOnce(true)
      .setCategory(NotificationCompat.CATEGORY_SERVICE)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
      .setContentIntent(contentIntent)
      .setShowWhen(false)
      .build()
  }

  private fun ensureTrackingChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return
    }
    val manager = getSystemService(NotificationManager::class.java) ?: return
    if (manager.getNotificationChannel(TRACKING_CHANNEL_ID) != null) {
      return
    }
    val channel = NotificationChannel(
      TRACKING_CHANNEL_ID,
      TRACKING_CHANNEL_NAME,
      NotificationManager.IMPORTANCE_LOW,
    )
    channel.description = ongoingBody
    channel.setShowBadge(false)
    channel.enableVibration(false)
    channel.setSound(null, null)
    manager.createNotificationChannel(channel)
  }

  private fun ensureAlarmChannel(channelId: String, silent: Boolean) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return
    }
    val manager = getSystemService(NotificationManager::class.java) ?: return
    if (manager.getNotificationChannel(channelId) != null) {
      return
    }
    val channel = NotificationChannel(
      channelId,
      "Arrivo alarms",
      NotificationManager.IMPORTANCE_MAX,
    )
    channel.lockscreenVisibility = Notification.VISIBILITY_PUBLIC
    channel.enableVibration(true)
    channel.enableLights(true)
    if (silent) {
      channel.setSound(null, null)
    } else {
      val alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
        ?: Settings.System.DEFAULT_ALARM_ALERT_URI
      val attrs = AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_ALARM)
        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
        .build()
      channel.setSound(alarmUri, attrs)
    }
    manager.createNotificationChannel(channel)
  }

  private fun notificationIcon(): Int {
    try {
      val resourceId = resources.getIdentifier("notification_icon", "drawable", packageName)
      if (resourceId != 0) {
        return resourceId
      }
    } catch (_: Exception) {
    }
    try {
      val ai = packageManager.getApplicationInfo(packageName, PackageManager.GET_META_DATA)
      val fromMeta = ai.metaData?.getInt("expo.modules.notifications.default_notification_icon") ?: 0
      if (fromMeta != 0) {
        return fromMeta
      }
    } catch (_: Exception) {
    }
    return applicationInfo.icon
  }

  private fun hasLocationPermission(): Boolean {
    val fine = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
    val coarse = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION)
    return fine == PackageManager.PERMISSION_GRANTED || coarse == PackageManager.PERMISSION_GRANTED
  }

  private fun acquireWakeLock() {
    if (wakeLock?.isHeld == true) {
      return
    }
    val powerManager = getSystemService(POWER_SERVICE) as PowerManager
    val next = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "arrivo:location")
    next.setReferenceCounted(false)
    next.acquire(12 * 60 * 60 * 1000L)
    wakeLock = next
  }

  private fun releaseWakeLock() {
    try {
      if (wakeLock?.isHeld == true) {
        wakeLock?.release()
      }
    } catch (_: Exception) {
    }
    wakeLock = null
  }

  private fun shutdown() {
    stopLocationUpdates()
    releaseWakeLock()
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
        stopForeground(STOP_FOREGROUND_REMOVE)
      } else {
        @Suppress("DEPRECATION")
        stopForeground(true)
      }
    } catch (_: Exception) {
    }
    isRunning.set(false)
    lastNotifiedDistance = null
    lastNotifiedInside = null
    lastNotifiedAlarmId = null
    stopSelf()
  }

  private fun samplingFor(
    remainingMeters: Float,
    current: LocationSampling?,
    speedMps: Float = 0f,
  ): LocationSampling {
    val meters = if (remainingMeters.isFinite() && remainingMeters > 0f) remainingMeters else 0f
    // Highway speeds cover hundreds of meters between fixes; treat remaining as closer.
    val effective = when {
      speedMps >= HIGHWAY_SPEED_MPS -> meters / 4f
      speedMps >= DRIVING_SPEED_MPS -> meters / 2.5f
      else -> meters
    }
    val far = LocationSampling(
      intervalMs = 12_000L,
      minIntervalMs = 6_000L,
      minDistanceMeters = 50f,
      priority = Priority.PRIORITY_HIGH_ACCURACY,
    )
    val mid = LocationSampling(
      intervalMs = 6_000L,
      minIntervalMs = 3_000L,
      minDistanceMeters = 25f,
      priority = Priority.PRIORITY_HIGH_ACCURACY,
    )
    val near = LocationSampling(
      intervalMs = 3_000L,
      minIntervalMs = 1_000L,
      minDistanceMeters = 10f,
      priority = Priority.PRIORITY_HIGH_ACCURACY,
    )
    val close = LocationSampling(
      intervalMs = 1_000L,
      minIntervalMs = 500L,
      minDistanceMeters = 5f,
      priority = Priority.PRIORITY_HIGH_ACCURACY,
    )

    if (current == null) {
      return when {
        effective >= SAMPLING_FAR_METERS -> far
        effective >= SAMPLING_MID_METERS -> mid
        effective >= SAMPLING_NEAR_METERS -> near
        else -> close
      }
    }

    return when (current.intervalMs) {
      far.intervalMs -> if (effective < 4_000f) mid else far
      mid.intervalMs -> when {
        effective >= 6_000f -> far
        effective < 900f -> near
        else -> mid
      }
      near.intervalMs -> when {
        effective >= 1_500f -> mid
        effective < 220f -> close
        else -> near
      }
      else -> if (effective >= 350f) near else close
    }
  }

  private data class LocationSampling(
    val intervalMs: Long,
    val minIntervalMs: Long,
    val minDistanceMeters: Float,
    val priority: Int,
  )

  private data class NearestOngoing(
    val alarmId: String,
    val title: String,
    val remainingMeters: Float,
    val displayMeters: Int,
    val inside: Boolean,
    val extraCount: Int,
  )

  companion object {
    const val ACTION_START = "expo.modules.locationforeground.START"
    const val ACTION_STOP = "expo.modules.locationforeground.STOP"
    const val ACTION_PAUSE = "expo.modules.locationforeground.PAUSE"
    const val ACTION_UPDATE = "expo.modules.locationforeground.UPDATE"
    const val EXTRA_ALARMS_JSON = "alarmsJson"
    const val EXTRA_ONGOING_TITLE = "ongoingTitle"
    const val EXTRA_ONGOING_BODY = "ongoingBody"
    const val EXTRA_ONGOING_COPY_JSON = "ongoingCopyJson"

    const val NOTIFICATION_ID = 0x11E4E01
    const val TRACKING_CHANNEL_ID = "arrivo_location_tracking"
    const val TRACKING_CHANNEL_NAME = "Arrivo tracking"
    const val DEFAULT_ALARM_CHANNEL = "arrivo_alarm_channel_v2"
    const val DEFAULT_ONGOING_TITLE = "Arrivo activo"
    const val DEFAULT_ONGOING_BODY = "Vigilando tus alarmas de destino"
    const val DEFAULT_NEAR_TEMPLATE = "A {{distance}} de {{title}}"
    const val DEFAULT_INSIDE_TEMPLATE = "En {{title}}"
    const val DEFAULT_MORE_TEMPLATE = "y {{count}} más"

    private const val NOTIFICATION_MIN_REFRESH_METERS = 25f
    private const val NOTIFICATION_REFRESH_FRACTION = 0.10f
    private const val SAMPLING_FAR_METERS = 5_000f
    private const val SAMPLING_MID_METERS = 1_200f
    private const val SAMPLING_NEAR_METERS = 300f
    private const val DRIVING_SPEED_MPS = 8f
    private const val HIGHWAY_SPEED_MPS = 20f

    val isRunning = AtomicBoolean(false)

    fun startIntent(
      context: Context,
      alarmsJson: String,
      ongoingTitle: String,
      ongoingBody: String,
      copyJson: String,
    ): Intent {
      return Intent(context, LocationForegroundService::class.java).apply {
        action = ACTION_START
        putExtra(EXTRA_ALARMS_JSON, alarmsJson)
        putExtra(EXTRA_ONGOING_TITLE, ongoingTitle)
        putExtra(EXTRA_ONGOING_BODY, ongoingBody)
        putExtra(EXTRA_ONGOING_COPY_JSON, copyJson)
      }
    }

    fun stopIntent(context: Context): Intent {
      return Intent(context, LocationForegroundService::class.java).apply {
        action = ACTION_STOP
      }
    }

    fun pauseIntent(context: Context): Intent {
      return Intent(context, LocationForegroundService::class.java).apply {
        action = ACTION_PAUSE
      }
    }

    fun updateIntent(context: Context, alarmsJson: String): Intent {
      return Intent(context, LocationForegroundService::class.java).apply {
        action = ACTION_UPDATE
        putExtra(EXTRA_ALARMS_JSON, alarmsJson)
      }
    }

    internal fun startFromArmed(context: Context, armed: ArmedTracking) {
      if (!armed.hasAlarms) {
        return
      }
      val app = context.applicationContext
      val intent = startIntent(
        app,
        armed.alarmsJson,
        armed.ongoingTitle,
        armed.ongoingBody,
        armed.copyJson,
      )
      try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          app.startForegroundService(intent)
        } else {
          app.startService(intent)
        }
      } catch (error: Exception) {
        Log.w(LocationForegroundBridge.TAG, "Unable to start location service from lifecycle", error)
      }
    }
  }
}
