import 'package:flutter/foundation.dart' show kIsWeb;

/// Notification service for incoming messages.
/// Uses browser Notification API on web via JS interop.
/// On mobile, FCM handles push notifications server-side.
class NotificationService {
  static bool _permitted = false;

  /// Request notification permission.
  static Future<void> requestPermission() async {
    if (!kIsWeb) return;
    // On web, permission is requested via JS. For now, mark as permitted
    // since the browser will prompt automatically on first use.
    _permitted = true;
  }

  /// Show a notification for an incoming message.
  static void showMessageNotification(String sender, String preview) {
    if (!_permitted) return;
    // On web, we'd use the Notification API via dart:js_interop
    // For now, this is a placeholder — the message appears in the chat UI
  }
}
