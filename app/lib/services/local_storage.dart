import 'package:hive_flutter/hive_flutter.dart';
import 'chat_service.dart';

/// Persists messages locally using Hive so they survive app reload.
class LocalStorage {
  static const _messagesBox = 'messages';
  static const _lastMsgBox = 'last_messages';

  static Future<void> init() async {
    await Hive.initFlutter();
  }

  static Future<Box> get _messages async =>
      Hive.isBoxOpen(_messagesBox) ? Hive.box(_messagesBox) : await Hive.openBox(_messagesBox);

  static Future<Box> get _lastMessages async =>
      Hive.isBoxOpen(_lastMsgBox) ? Hive.box(_lastMsgBox) : await Hive.openBox(_lastMsgBox);

  /// Save a message to local storage.
  static Future<void> saveMessage(String recipientUserId, ChatMessage msg) async {
    final box = await _messages;
    final key = recipientUserId;
    final existing = box.get(key, defaultValue: <dynamic>[]) as List;
    existing.add({
      'id': msg.id,
      'text': msg.text,
      'isMe': msg.isMe,
      'timestamp': msg.timestamp.toIso8601String(),
      'senderDeviceId': msg.senderDeviceId,
    });
    await box.put(key, existing);

    // Update last message
    final lastBox = await _lastMessages;
    await lastBox.put(key, msg.text);
  }

  /// Load all messages for a conversation.
  static Future<List<ChatMessage>> loadMessages(String recipientUserId) async {
    final box = await _messages;
    final raw = box.get(recipientUserId, defaultValue: <dynamic>[]) as List;
    return raw.map((e) {
      final m = e as Map;
      return ChatMessage(
        id: m['id'] as String,
        text: m['text'] as String,
        isMe: m['isMe'] as bool,
        timestamp: DateTime.parse(m['timestamp'] as String),
        senderDeviceId: m['senderDeviceId'] as String,
      );
    }).toList();
  }

  /// Load last message previews for all conversations.
  static Future<Map<String, String>> loadLastMessages() async {
    final box = await _lastMessages;
    final map = <String, String>{};
    for (final key in box.keys) {
      map[key as String] = box.get(key) as String;
    }
    return map;
  }

  /// Clear all local data (on logout).
  static Future<void> clear() async {
    final msgBox = await _messages;
    final lastBox = await _lastMessages;
    await msgBox.clear();
    await lastBox.clear();
  }
}
