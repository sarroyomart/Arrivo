import ExpoModulesCore

public class SystemSoundsModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SystemSounds")

    AsyncFunction("listSounds") { (_kind: String) -> [[String: Any]] in
      // iOS does not expose the system ringtone catalog to third-party apps.
      return []
    }

    AsyncFunction("listPicks") { (_limit: Int) -> [[String: Any]] in
      return []
    }

    AsyncFunction("play") { (_uri: String, _loop: Bool) in
    }

    AsyncFunction("playResource") { (_name: String, _loop: Bool) in
    }

    AsyncFunction("stop") {
    }

    AsyncFunction("presentAlarmNotification") { (
      _identifier: String,
      _title: String,
      _body: String,
      _alarmId: String,
      _channelId: String,
      _launchUrl: String,
      _silent: Bool
    ) in
    }

    AsyncFunction("dismissAlarmNotification") { (_identifier: String) in
    }

    AsyncFunction("acquireWakeLock") {
    }

    AsyncFunction("releaseWakeLock") {
    }

    AsyncFunction("canUseFullScreenIntent") { () -> Bool in
      return false
    }

    AsyncFunction("openFullScreenIntentSettings") {
    }
  }
}
