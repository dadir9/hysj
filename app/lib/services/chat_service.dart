import 'dart:async';
import 'dart:convert';
import 'dart:math';

import '../models/ws_message.dart';
import 'api_client.dart';
import 'auth_service.dart';
import 'ws_client.dart';

/// A contact from the API.
class Contact {
  final String userId;
  final String username;
  final String? displayName;
  final String? nickname;

  Contact({required this.userId, required this.username, this.displayName, this.nickname});

  String get name => displayName ?? nickname ?? username;

  factory Contact.fromJson(Map<String, dynamic> json) => Contact(
    userId: json['user_id'] as String,
    username: json['username'] as String,
    displayName: json['display_name'] as String?,
    nickname: json['nickname'] as String?,
  );
}

/// A chat message (local representation).
class ChatMessage {
  final String id;
  final String text;
  final bool isMe;
  final DateTime timestamp;
  final String senderDeviceId;

  ChatMessage({
    required this.id,
    required this.text,
    required this.isMe,
    required this.timestamp,
    required this.senderDeviceId,
  });
}

/// Manages contacts, WebSocket connection, and message state.
class ChatService {
  final ApiClient api;
  final AuthService auth;
  final WsClient ws;

  List<Contact> contacts = [];
  final Map<String, List<ChatMessage>> conversations = {};
  final Map<String, String> lastMessages = {};

  // deviceId -> userId mapping (built when loading contacts)
  final Map<String, String> _deviceToUser = {};

  final _contactsController = StreamController<List<Contact>>.broadcast();
  final _messageController = StreamController<ChatMessage>.broadcast();

  Stream<List<Contact>> get contactsStream => _contactsController.stream;
  Stream<ChatMessage> get incomingMessages => _messageController.stream;

  String? myUserId;
  String? _myDeviceId;
  bool _initialized = false;

  ChatService({required this.api, required this.auth, required this.ws});

  Future<void> init() async {
    if (_initialized) return;
    _initialized = true;

    myUserId = await auth.currentUserId;
    _myDeviceId = await auth.currentDeviceId;

    await refreshContacts();
    await ws.connect();

    ws.messages.listen(_onWsMessage);
  }

  Future<void> refreshContacts() async {
    try {
      contacts = await api.getContactsList();
      _contactsController.add(contacts);
      // Build device-to-user mapping for each contact
      await _buildDeviceMap();
    } catch (_) {}
  }

  Future<void> _buildDeviceMap() async {
    for (final contact in contacts) {
      try {
        final devices = await api.getUserDevices(contact.userId);
        for (final d in devices) {
          final did = d['device_id'] as String?;
          if (did != null) {
            _deviceToUser[did] = contact.userId;
          }
        }
      } catch (_) {}
    }
  }

  void _onWsMessage(WsIncoming msg) {
    if (msg.type == 'SendMessage') {
      final envelope = msg.envelope;
      if (envelope == null) return;

      final text = _decryptMessage(envelope.ciphertext);
      final senderDeviceId = envelope.senderDeviceId;

      // Look up which contact owns this device
      final contactUserId = _deviceToUser[senderDeviceId] ?? senderDeviceId;

      final chatMsg = ChatMessage(
        id: envelope.messageId,
        text: text,
        isMe: false,
        timestamp: envelope.timestamp,
        senderDeviceId: senderDeviceId,
      );

      conversations.putIfAbsent(contactUserId, () => []);
      conversations[contactUserId]!.add(chatMsg);
      lastMessages[contactUserId] = text;

      _messageController.add(chatMsg);
    }
  }

  ChatMessage sendMessage(String recipientUserId, String recipientDeviceId, String text) {
    final msgId = _generateId();
    final now = DateTime.now().toUtc();

    final envelope = EncryptedEnvelope(
      senderDeviceId: _myDeviceId ?? '',
      recipientDeviceId: recipientDeviceId,
      ciphertext: _encryptMessage(text),
      messageType: 1,
      messageId: msgId,
      timestamp: now,
    );

    ws.sendMessage(envelope);

    final chatMsg = ChatMessage(
      id: msgId,
      text: text,
      isMe: true,
      timestamp: now,
      senderDeviceId: _myDeviceId ?? '',
    );

    conversations.putIfAbsent(recipientUserId, () => []);
    conversations[recipientUserId]!.add(chatMsg);
    lastMessages[recipientUserId] = text;

    return chatMsg;
  }

  List<ChatMessage> getMessages(String recipientUserId) {
    return conversations[recipientUserId] ?? [];
  }

  String _encryptMessage(String plaintext) => base64Encode(utf8.encode(plaintext));

  String _decryptMessage(String ciphertext) {
    try {
      return utf8.decode(base64Decode(ciphertext));
    } catch (_) {
      return ciphertext;
    }
  }

  String _generateId() {
    final rng = Random.secure();
    return List.generate(16, (_) => rng.nextInt(256).toRadixString(16).padLeft(2, '0')).join();
  }

  void dispose() {
    ws.dispose();
    _contactsController.close();
    _messageController.close();
  }
}
