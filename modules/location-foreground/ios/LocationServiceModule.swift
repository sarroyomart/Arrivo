import ExpoModulesCore

public class LocationServiceModule: Module {
  public func definition() -> ModuleDefinition {
    Name("LocationService")

    Events("onGeofenceTriggered")

    AsyncFunction("startBackgroundTracking") { (_alarmsJson: String, _ongoingTitle: String, _ongoingBody: String) in
    }

    AsyncFunction("stopBackgroundTracking") {
    }

    AsyncFunction("updateActiveAlarms") { (_alarmsJson: String) in
    }

    AsyncFunction("drainPendingRingingAlarmId") { () -> String? in
      return nil
    }

    AsyncFunction("isTracking") { () -> Bool in
      return false
    }
  }
}
