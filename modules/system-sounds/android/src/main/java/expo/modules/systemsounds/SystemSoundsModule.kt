package expo.modules.systemsounds

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.ContentResolver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class SystemSoundsModule : Module() {
  private var player: MediaPlayer? = null
  private var wakeLock: PowerManager.WakeLock? = null

  override fun definition() = ModuleDefinition {
    Name("SystemSounds")

    AsyncFunction("listSounds") { kind: String ->
      listSounds(kindToType(kind), limit = null)
    }

    AsyncFunction("listPicks") { limit: Int ->
      listPicks(limit.coerceIn(1, 20))
    }

    AsyncFunction("play") { uri: String, loop: Boolean ->
      playInternal(uri, loop)
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("playResource") { name: String, loop: Boolean ->
      playInternal(resourceUri(name).toString(), loop)
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("stop") {
      stopInternal()
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("presentAlarmNotification") { identifier: String, title: String, body: String, alarmId: String, channelId: String, launchUrl: String, silent: Boolean ->
      presentAlarm(
        identifier = identifier,
        title = title,
        body = body,
        alarmId = alarmId,
        channelId = channelId,
        launchUrl = launchUrl,
        silent = silent,
      )
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("dismissAlarmNotification") { identifier: String ->
      dismissAlarm(identifier)
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("acquireWakeLock") {
      acquireAlarmWakeLock()
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("releaseWakeLock") {
      releaseAlarmWakeLock()
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("canUseFullScreenIntent") {
      canUseFullScreenIntent()
    }

    AsyncFunction("openFullScreenIntentSettings") {
      openFullScreenIntentSettings()
    }.runOnQueue(Queues.MAIN)

    OnDestroy {
      stopInternal()
      releaseAlarmWakeLock()
    }
  }

  private fun requireContext(): Context {
    return appContext.reactContext
      ?: appContext.currentActivity
      ?: throw Exceptions.ReactContextLost()
  }

  private fun appContextOrThrow(): Context = requireContext().applicationContext

  private fun kindToType(kind: String): Int {
    return when (kind) {
      "notification" -> RingtoneManager.TYPE_NOTIFICATION
      "ringtone" -> RingtoneManager.TYPE_RINGTONE
      else -> RingtoneManager.TYPE_ALARM
    }
  }

  private fun listPicks(limit: Int): List<Map<String, Any?>> {
    val sounds = mutableListOf<Map<String, Any?>>()
    val seen = mutableSetOf<String>()
    appendSounds(RingtoneManager.TYPE_ALARM, sounds, seen, limit, preferDefault = true)
    if (sounds.size < limit) {
      appendSounds(RingtoneManager.TYPE_NOTIFICATION, sounds, seen, limit, preferDefault = false)
    }
    if (sounds.size < limit) {
      appendSounds(RingtoneManager.TYPE_RINGTONE, sounds, seen, limit, preferDefault = false)
    }
    return sounds
  }

  private fun listSounds(type: Int, limit: Int?): List<Map<String, Any?>> {
    val sounds = mutableListOf<Map<String, Any?>>()
    val seen = mutableSetOf<String>()
    appendSounds(type, sounds, seen, limit, preferDefault = true)
    return sounds
  }

  private fun appendSounds(
    type: Int,
    sounds: MutableList<Map<String, Any?>>,
    seen: MutableSet<String>,
    limit: Int?,
    preferDefault: Boolean,
  ) {
    val context = requireContext()
    if (preferDefault) {
      val defaultUri = RingtoneManager.getDefaultUri(type)
      if (defaultUri != null) {
        addSound(
          sounds,
          seen,
          defaultUri.toString(),
          RingtoneManager.getRingtone(context, defaultUri)?.getTitle(context) ?: "Default",
          isDefault = true,
          limit,
        )
      }
    }

    val manager = RingtoneManager(context)
    manager.setType(type)
    val cursor = manager.cursor ?: return

    while (cursor.moveToNext()) {
      if (limit != null && sounds.size >= limit) {
        break
      }
      val uri = manager.getRingtoneUri(cursor.position)?.toString() ?: continue
      val title = cursor.getString(RingtoneManager.TITLE_COLUMN_INDEX) ?: continue
      addSound(sounds, seen, uri, title, isDefault = false, limit)
    }
  }

  private fun addSound(
    sounds: MutableList<Map<String, Any?>>,
    seen: MutableSet<String>,
    uri: String,
    title: String,
    isDefault: Boolean,
    limit: Int?,
  ) {
    if (limit != null && sounds.size >= limit) {
      return
    }
    if (!seen.add(uri)) {
      return
    }
    sounds.add(
      mapOf(
        "title" to title,
        "uri" to uri,
        "isDefault" to isDefault,
      ),
    )
  }

  private fun playInternal(uri: String, loop: Boolean) {
    stopInternal()
    val context = requireContext()
    val next = MediaPlayer()
    next.setAudioAttributes(
      AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_ALARM)
        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
        .build(),
    )
    next.setDataSource(context, Uri.parse(uri))
    next.isLooping = loop
    if (!loop) {
      next.setOnCompletionListener { stopInternal() }
    }
    next.prepare()
    next.start()
    player = next
    acquireAlarmWakeLock()
  }

  private fun stopInternal() {
    try {
      player?.stop()
    } catch (_: Exception) {
    }
    try {
      player?.release()
    } catch (_: Exception) {
    }
    player = null
  }

  private fun resourceUri(name: String): Uri {
    val context = appContextOrThrow()
    val resourceName = name.substringBeforeLast('.')
    val resourceId = context.resources.getIdentifier(resourceName, "raw", context.packageName)
    if (resourceId == 0) {
      throw IllegalArgumentException("Raw resource not found: $name")
    }
    return Uri.Builder()
      .scheme(ContentResolver.SCHEME_ANDROID_RESOURCE)
      .authority(context.packageName)
      .appendPath("raw")
      .appendPath(resourceName)
      .build()
  }

  private fun notificationId(identifier: String): Int {
    return identifier.hashCode() and 0x7fffffff
  }

  private fun presentAlarm(
    identifier: String,
    title: String,
    body: String,
    alarmId: String,
    channelId: String,
    launchUrl: String,
    silent: Boolean,
  ) {
    val context = appContextOrThrow()

    val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
      ?: return
    launchIntent.addFlags(
      Intent.FLAG_ACTIVITY_NEW_TASK or
        Intent.FLAG_ACTIVITY_CLEAR_TOP or
        Intent.FLAG_ACTIVITY_SINGLE_TOP or
        Intent.FLAG_ACTIVITY_REORDER_TO_FRONT,
    )
    if (launchUrl.isNotEmpty()) {
      launchIntent.data = Uri.parse(launchUrl)
    }
    launchIntent.putExtra("alarmId", alarmId)
    launchIntent.putExtra("action", "RINGING")

    val pendingFlags =
      PendingIntent.FLAG_UPDATE_CURRENT or
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
    val fullScreenIntent = PendingIntent.getActivity(
      context,
      notificationId(identifier),
      launchIntent,
      pendingFlags,
    )

    val extras = Bundle()
    extras.putString("alarmId", alarmId)
    extras.putString("action", "RINGING")

    val builder = NotificationCompat.Builder(context, channelId)
      .setSmallIcon(notificationIcon(context))
      .setContentTitle(title)
      .setContentText(body)
      .setStyle(NotificationCompat.BigTextStyle().bigText(body))
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

    if (silent) {
      builder.setSilent(true)
    }

    NotificationManagerCompat.from(context).notify(notificationId(identifier), builder.build())
    acquireAlarmWakeLock()
  }

  private fun dismissAlarm(identifier: String) {
    val context = appContextOrThrow()
    NotificationManagerCompat.from(context).cancel(notificationId(identifier))
  }

  private fun notificationIcon(context: Context): Int {
    try {
      val ai = context.packageManager.getApplicationInfo(
        context.packageName,
        PackageManager.GET_META_DATA,
      )
      val fromMeta = ai.metaData?.getInt("expo.modules.notifications.default_notification_icon") ?: 0
      if (fromMeta != 0) {
        return fromMeta
      }
    } catch (_: Exception) {
    }
    return context.applicationInfo.icon
  }

  private fun acquireAlarmWakeLock() {
    releaseAlarmWakeLock()
    val context = appContextOrThrow()
    val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
    val next = powerManager.newWakeLock(
      PowerManager.PARTIAL_WAKE_LOCK,
      "arrivo:alarm",
    )
    next.setReferenceCounted(false)
    next.acquire(15 * 60 * 1000L)
    wakeLock = next
  }

  private fun releaseAlarmWakeLock() {
    try {
      if (wakeLock?.isHeld == true) {
        wakeLock?.release()
      }
    } catch (_: Exception) {
    }
    wakeLock = null
  }

  private fun canUseFullScreenIntent(): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      return true
    }
    val manager = appContextOrThrow().getSystemService(NotificationManager::class.java)
    return manager.canUseFullScreenIntent()
  }

  private fun openFullScreenIntentSettings() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      return
    }
    val context = appContextOrThrow()
    val intent = Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT).apply {
      data = Uri.parse("package:${context.packageName}")
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    context.startActivity(intent)
  }
}
