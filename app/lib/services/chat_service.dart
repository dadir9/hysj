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
  // recipientUserId -> list of messages
  final Map<String, List<ChatMessage>> conversations = {};
  // recipientUserId -> last message preview
  final Map<String, String> lastMessages = {};

  final _contactsController = StreamController<List<Contact>>.broadcast();
  final _messageController = StreamController<ChatMessage>.broadcast();

  Stream<List<Contact>> get contactsStream => _contactsController.stream;
  Stream<ChatMessage> get incomingMessages => _messageController.stream;

  String? myUserId;
  String? _myDeviceId;

  ChatService({required this.api, required this.auth, required this.ws});

  Future<void> init() async {
    myUserId = await auth.currentUserId;
    _myDeviceId = await auth.currentDeviceId;

    // Load contacts
    await refreshContacts();

    // Connect WebSocket
    await ws.connect();

    // Listen for incoming messages
    ws.messages.listen(_onWsMessage);
  }

  Future<void> refreshContacts() async {
    try {
      final response = await api.getContactsList();
      contacts = response;
      _contactsController.add(contacts);
    } catch (_) {}
  }

  void _onWsMessage(WsIncoming msg) {
    if (msg.type == 'SendMessage') {
      final envelope = msg.envelope;
      if (envelope == null) return;

      // In dev mode, ciphertext is plaintext. In production, decrypt here.
      final text = _decryptMessage(envelope.ciphertext);
      final senderId = envelope.senderDeviceId;

      // Find which contact sent this
      final contactUserId = _findContactByDeviceId(senderId);

      final chatMsg = ChatMessage(
        id: envelope.messageId,
        text: text,
        isMe: false,
        timestamp: envelope.timestamp,
        senderDeviceId: senderId,
      );

      final key = contactUserId ?? senderId;
      conversations.putIfAbsent(key, () => []);
      conversations[key]!.add(chatMsg);
      lastMessages[key] = text;

      _messageController.add(chatMsg);
    }
  }

  /// Send a plaintext message to a recipient device.
  ChatMessage sendMessage(String recipientUserId, String recipientDeviceId, String text) {
    final msgId = _generateId();
    final now = DateTime.now().toUtc();

    // In dev mode, send plaintext as ciphertext. In production, encrypt here.
    final envelope = EncryptedEnvelope(
      senderDeviceId: _myDeviceId ?? '',
      recipientDeviceId: recipientDeviceId,
      ciphertext: _encryptMessage(text),
      messageType: 1, // normal message
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

  /// Dev mode: plaintext as base64. Production: use flutter_rust_bridge crypto.
  String _encryptMessage(String plaintext) {
    return base64Encode(utf8.encode(plaintext));
  }

  String _decryptMessage(String ciphertext) {
    try {
      return utf8.decode(base64Decode(ciphertext));
    } catch (_) {
      return ciphertext;
    }
  }

  String? _findContactByDeviceId(String deviceId) {
    // In a real app, we'd look up which user owns this device.
    // For now, return null (we'll match by context).
    return null;
  }

  String _generateId() {
    final rng = Random.secure();
    final bytes = List<int>.generate(16, (_) => rng.nextInt(256));
    return bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
  }

  void dispose() {
    ws.dispose();
    _contactsController.close();
    _messageController.close();
  }
}
