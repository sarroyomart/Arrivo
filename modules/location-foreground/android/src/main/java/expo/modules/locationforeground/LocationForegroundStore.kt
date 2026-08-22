package expo.modules.locationforeground

import android.content.Context

internal data class ArmedTracking(
  val alarmsJson: String,
  val ongoingTitle: String,
  val ongoingBody: String,
  val copyJson: String,
) {
  val hasAlarms: Boolean
    get() = TrackedAlarm.parseList(alarmsJson).isNotEmpty()
}

internal object LocationForegroundStore {
  private const val KEY_ALARMS_JSON = "armed_alarms_json"
  private const val KEY_ONGOING_TITLE = "armed_ongoing_title"
  private const val KEY_ONGOING_BODY = "armed_ongoing_body"
  private const val KEY_COPY_JSON = "armed_copy_json"

  fun save(
    context: Context,
    alarmsJson: String,
    ongoingTitle: String,
    ongoingBody: String,
    copyJson: String,
  ) {
    context.getSharedPreferences(LocationForegroundBridge.PREFS, Context.MODE_PRIVATE)
      .edit()
      .putString(KEY_ALARMS_JSON, alarmsJson)
      .putString(KEY_ONGOING_TITLE, ongoingTitle)
      .putString(KEY_ONGOING_BODY, ongoingBody)
      .putString(KEY_COPY_JSON, copyJson)
      .commit()
  }

  fun load(context: Context): ArmedTracking? {
    val prefs = context.getSharedPreferences(LocationForegroundBridge.PREFS, Context.MODE_PRIVATE)
    val alarmsJson = prefs.getString(KEY_ALARMS_JSON, null) ?: return null
    if (alarmsJson.isBlank() || alarmsJson == "[]") {
      return null
    }
    return ArmedTracking(
      alarmsJson = alarmsJson,
      ongoingTitle = prefs.getString(KEY_ONGOING_TITLE, null)
        ?: LocationForegroundService.DEFAULT_ONGOING_TITLE,
      ongoingBody = prefs.getString(KEY_ONGOING_BODY, null)
        ?: LocationForegroundService.DEFAULT_ONGOING_BODY,
      copyJson = prefs.getString(KEY_COPY_JSON, null).orEmpty(),
    )
  }

  fun clear(context: Context) {
    context.getSharedPreferences(LocationForegroundBridge.PREFS, Context.MODE_PRIVATE)
      .edit()
      .remove(KEY_ALARMS_JSON)
      .remove(KEY_ONGOING_TITLE)
      .remove(KEY_ONGOING_BODY)
      .remove(KEY_COPY_JSON)
      .commit()
  }
}
