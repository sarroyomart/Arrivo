package expo.modules.locationforeground

import org.json.JSONArray
import org.json.JSONObject

data class TrackedAlarm(
  val id: String,
  val title: String,
  val latitude: Double,
  val longitude: Double,
  val radius: Float,
  val trigger: String,
  val channelId: String,
  val silent: Boolean,
  val launchUrl: String,
  val alarmTitle: String,
  val alarmBody: String,
) {
  val isExit: Boolean
    get() = trigger == "exit"

  companion object {
    fun parseList(json: String?): List<TrackedAlarm> {
      if (json.isNullOrBlank()) {
        return emptyList()
      }
      val array = JSONArray(json)
      val alarms = ArrayList<TrackedAlarm>(array.length())
      for (index in 0 until array.length()) {
        val item = array.optJSONObject(index) ?: continue
        val parsed = fromJson(item) ?: continue
        alarms.add(parsed)
      }
      return alarms
    }

    private fun fromJson(item: JSONObject): TrackedAlarm? {
      val id = item.optString("id")
      if (id.isNullOrBlank()) {
        return null
      }
      return TrackedAlarm(
        id = id,
        title = item.optString("title"),
        latitude = item.optDouble("latitude", Double.NaN),
        longitude = item.optDouble("longitude", Double.NaN),
        radius = item.optDouble("radius", 0.0).toFloat(),
        trigger = item.optString("trigger", "enter"),
        channelId = item.optString("channelId"),
        silent = item.optBoolean("silent", false),
        launchUrl = item.optString("launchUrl"),
        alarmTitle = item.optString("alarmTitle"),
        alarmBody = item.optString("alarmBody"),
      ).takeIf {
        it.latitude.isFinite() && it.longitude.isFinite() && it.radius > 0f
      }
    }
  }
}
