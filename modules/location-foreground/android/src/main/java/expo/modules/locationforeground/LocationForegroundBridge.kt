package expo.modules.locationforeground

import android.util.Log

internal object LocationForegroundBridge {
  const val PREFS = "arrivo_location_foreground"
  const val KEY_PENDING_RINGING = "pending_ringing_alarm_id"
  const val TAG = "ArrivoLocation"

  @Volatile
  var module: LocationServiceModule? = null

  fun emitTriggered(payload: Map<String, Any?>) {
    try {
      module?.emitGeofenceTriggered(payload)
    } catch (error: Exception) {
      Log.w(TAG, "Failed to emit geofence event to JS", error)
    }
  }
}
