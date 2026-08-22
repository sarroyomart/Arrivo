package expo.modules.locationforeground

import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class LocationServiceModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("LocationService")

    Events("onGeofenceTriggered")

    OnCreate {
      LocationForegroundBridge.module = this@LocationServiceModule
    }

    OnDestroy {
      if (LocationForegroundBridge.module === this@LocationServiceModule) {
        LocationForegroundBridge.module = null
      }
    }

    AsyncFunction("startBackgroundTracking") { alarmsJson: String, ongoingTitle: String, ongoingBody: String, copyJson: String ->
      startTracking(alarmsJson, ongoingTitle, ongoingBody, copyJson)
    }

    AsyncFunction("stopBackgroundTracking") {
      stopTracking()
    }

    AsyncFunction("updateActiveAlarms") { alarmsJson: String ->
      updateAlarms(alarmsJson)
    }

    AsyncFunction("drainPendingRingingAlarmId") {
      drainPendingRingingAlarmId()
    }

    AsyncFunction("isTracking") {
      LocationForegroundService.isRunning.get()
    }
  }

  fun emitGeofenceTriggered(payload: Map<String, Any?>) {
    sendEvent("onGeofenceTriggered", payload)
  }

  private fun requireContext(): Context {
    return appContext.reactContext
      ?: appContext.currentActivity
      ?: throw Exceptions.ReactContextLost()
  }

  private fun appContextOrThrow(): Context = requireContext().applicationContext

  private fun startTracking(
    alarmsJson: String,
    ongoingTitle: String,
    ongoingBody: String,
    copyJson: String,
  ) {
    val context = appContextOrThrow()
    val intent = LocationForegroundService.startIntent(
      context,
      alarmsJson,
      ongoingTitle,
      ongoingBody,
      copyJson,
    )
    startService(context, intent, foreground = true)
  }

  private fun updateAlarms(alarmsJson: String) {
    val context = appContextOrThrow()
    if (alarmsJson.isBlank() || alarmsJson == "[]") {
      stopTracking()
      return
    }
    if (!LocationForegroundService.isRunning.get()) {
      return
    }
    startService(context, LocationForegroundService.updateIntent(context, alarmsJson), foreground = false)
  }

  private fun stopTracking() {
    val context = appContextOrThrow()
    if (!LocationForegroundService.isRunning.get()) {
      try {
        context.stopService(LocationForegroundService.stopIntent(context))
      } catch (_: Exception) {
      }
      return
    }
    startService(context, LocationForegroundService.stopIntent(context), foreground = false)
  }

  private fun startService(context: Context, intent: Intent, foreground: Boolean) {
    try {
      if (foreground && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(intent)
      } else {
        context.startService(intent)
      }
    } catch (error: Exception) {
      Log.w(LocationForegroundBridge.TAG, "Unable to start location service", error)
      throw error
    }
  }

  private fun drainPendingRingingAlarmId(): String? {
    val prefs = appContextOrThrow().getSharedPreferences(
      LocationForegroundBridge.PREFS,
      Context.MODE_PRIVATE,
    )
    val value = prefs.getString(LocationForegroundBridge.KEY_PENDING_RINGING, null)
    if (!value.isNullOrBlank()) {
      prefs.edit().remove(LocationForegroundBridge.KEY_PENDING_RINGING).apply()
    }
    return value
  }
}
