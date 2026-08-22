package expo.modules.locationforeground

import android.app.Activity
import android.app.Application
import android.content.Context
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Starts the location FGS at Activity.onPause, while Android still allows
 * startForegroundService. Waiting for the JS AppState "background" event is
 * too late on API 31+ and is why the tracking notification sometimes never appears.
 */
internal object LocationForegroundLifecycle : Application.ActivityLifecycleCallbacks {
  private val registered = AtomicBoolean(false)
  private val handler = Handler(Looper.getMainLooper())
  private var resumedCount = 0
  private var appContext: Context? = null

  private val startWhenBackgrounded = Runnable {
    if (resumedCount > 0) {
      return@Runnable
    }
    val context = appContext ?: return@Runnable
    startArmed(context)
  }

  fun ensureRegistered(context: Context) {
    val app = context.applicationContext as? Application ?: return
    appContext = app
    if (!registered.compareAndSet(false, true)) {
      return
    }
    app.registerActivityLifecycleCallbacks(this)
  }

  fun startArmed(context: Context) {
    val app = context.applicationContext
    val armed = LocationForegroundStore.load(app) ?: return
    if (!armed.hasAlarms) {
      return
    }
    LocationForegroundService.startFromArmed(app, armed)
  }

  fun pauseIfRunning(context: Context) {
    if (!LocationForegroundService.isRunning.get()) {
      return
    }
    try {
      context.applicationContext.startService(
        LocationForegroundService.pauseIntent(context.applicationContext),
      )
    } catch (error: Exception) {
      Log.w(LocationForegroundBridge.TAG, "Unable to pause location service", error)
    }
  }

  override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) = Unit

  override fun onActivityStarted(activity: Activity) = Unit

  override fun onActivityResumed(activity: Activity) {
    resumedCount += 1
    handler.removeCallbacks(startWhenBackgrounded)
    if (resumedCount == 1) {
      pauseIfRunning(activity)
    }
  }

  override fun onActivityPaused(activity: Activity) {
    resumedCount = (resumedCount - 1).coerceAtLeast(0)
    handler.removeCallbacks(startWhenBackgrounded)
    // Next looper pass: if nothing resumed, the app is leaving the foreground.
    // Still inside the FGS-start-allowed window, unlike AppState "background".
    handler.post(startWhenBackgrounded)
  }

  override fun onActivityStopped(activity: Activity) = Unit

  override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) = Unit

  override fun onActivityDestroyed(activity: Activity) = Unit
}
