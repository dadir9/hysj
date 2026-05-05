import 'dart:async';
import 'dart:math';

import '../models/ws_message.dart';
import 'api_client.dart';
import 'auth_service.dart';
import 'crypto_service.dart';
import 'local_storage.dart';
import 'notification_service.dart';
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

/// Manages contacts, WebSocket, encryption, local storage, and notifications.
class ChatService {
  final ApiClient api;
  final AuthService auth;
  final WsClient ws;
  final CryptoService crypto = CryptoService();

  List<Contact> contacts = [];
  final Map<String, List<ChatMessage>> conversations = {};
  final Map<String, String> lastMessages = {};
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

    // Init local storage
    await LocalStorage.init();

    // Load persisted messages
    lastMessages.addAll(await LocalStorage.loadLastMessages());

    // Load contacts
    await refreshContacts();

    // Load persisted conversations for each contact
    for (final c in contacts) {
      final msgs = await LocalStorage.loadMessages(c.userId);
      if (msgs.isNotEmpty) {
        conversations[c.userId] = msgs;
      }
    }

    // Request notification permission
    await NotificationService.requestPermission();

    // Connect WebSocket
    await ws.connect();
    ws.messages.listen(_onWsMessage);
  }

  Future<void> refreshContacts() async {
    try {
      contacts = await api.getContactsList();
      _contactsController.add(contacts);
      await _buildDeviceMap();
    } catch (_) {}
  }

  Future<void> _buildDeviceMap() async {
    for (final contact in contacts) {
      try {
        final devices = await api.getUserDevices(contact.userId);
        for (final d in devices) {
          final did = d['device_id'] as String?;
          if (did != null) _deviceToUser[did] = contact.userId;
        }
      } catch (_) {}
    }
  }

  void _onWsMessage(WsIncoming msg) async {
    if (msg.type == 'SendMessage') {
      final envelope = msg.envelope;
      if (envelope == null) return;

      // Decrypt with real AES-256-GCM
      final text = await crypto.decrypt(
        envelope.ciphertext,
        _myDeviceId ?? '',
        envelope.senderDeviceId,
      );

      final contactUserId = _deviceToUser[envelope.senderDeviceId] ?? envelope.senderDeviceId;

      final chatMsg = ChatMessage(
        id: envelope.messageId,
        text: text,
        isMe: false,
        timestamp: envelope.timestamp,
        senderDeviceId: envelope.senderDeviceId,
      );

      conversations.putIfAbsent(contactUserId, () => []);
      conversations[contactUserId]!.add(chatMsg);
      lastMessages[contactUserId] = text;

      // Persist locally
      await LocalStorage.saveMessage(contactUserId, chatMsg);

      // Show notification
      final sender = contacts.where((c) => c.userId == contactUserId).firstOrNull;
      NotificationService.showMessageNotification(
        sender?.username ?? 'someone',
        text.length > 50 ? '${text.substring(0, 50)}...' : text,
      );

      _messageController.add(chatMsg);
    }
  }

  Future<ChatMessage> sendMessage(String recipientUserId, String recipientDeviceId, String text) async {
    final msgId = _generateId();
    final now = DateTime.now().toUtc();

    // Encrypt with real AES-256-GCM
    final ciphertext = await crypto.encrypt(
      text,
      _myDeviceId ?? '',
      recipientDeviceId,
    );

    final envelope = EncryptedEnvelope(
      senderDeviceId: _myDeviceId ?? '',
      recipientDeviceId: recipientDeviceId,
      ciphertext: ciphertext,
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

    // Persist locally
    await LocalStorage.saveMessage(recipientUserId, chatMsg);

    return chatMsg;
  }

  List<ChatMessage> getMessages(String recipientUserId) {
    return conversations[recipientUserId] ?? [];
  }

  String _generateId() {
    final rng = Random.secure();
    return List.generate(16, (_) => rng.nextInt(256).toRadixString(16).padLeft(2, '0')).join();
  }

  Future<void> logout() async {
    await LocalStorage.clear();
    crypto.clearKeys();
    conversations.clear();
    lastMessages.clear();
    contacts.clear();
    _deviceToUser.clear();
    _initialized = false;
    await ws.disconnect();
  }

  void dispose() {
    ws.dispose();
    _contactsController.close();
    _messageController.close();
  }
}
