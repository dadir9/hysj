import 'dart:convert';

/// Matches backend: #[serde(tag = "type")] enum WsMessage
/// Backend variants: SendMessage, Delivered, Typing, Read, Reaction, Error, etc.

class EncryptedEnvelope {
  final String senderDeviceId;
  final String recipientDeviceId;
  final String ciphertext;
  final int messageType;
  final String messageId;
  final DateTime timestamp;
  final int? ttlSeconds;

  EncryptedEnvelope({
    required this.senderDeviceId,
    required this.recipientDeviceId,
    required this.ciphertext,
    required this.messageType,
    required this.messageId,
    required this.timestamp,
    this.ttlSeconds,
  });

  factory EncryptedEnvelope.fromJson(Map<String, dynamic> json) {
    return EncryptedEnvelope(
      senderDeviceId: json['sender_device_id'] as String,
      recipientDeviceId: json['recipient_device_id'] as String,
      ciphertext: json['ciphertext'] as String,
      messageType: json['message_type'] as int,
      messageId: json['message_id'] as String,
      timestamp: DateTime.parse(json['timestamp'] as String),
      ttlSeconds: json['ttl_seconds'] as int?,
    );
  }

  Map<String, dynamic> toJson() => {
    'sender_device_id': senderDeviceId,
    'recipient_device_id': recipientDeviceId,
    'ciphertext': ciphertext,
    'message_type': messageType,
    'message_id': messageId,
    'timestamp': timestamp.toUtc().toIso8601String(),
    if (ttlSeconds != null) 'ttl_seconds': ttlSeconds,
  };
}

class TypingIndicator {
  final String senderId;
  final String recipientId;
  final bool isTyping;

  TypingIndicator({required this.senderId, required this.recipientId, required this.isTyping});

  factory TypingIndicator.fromJson(Map<String, dynamic> json) => TypingIndicator(
    senderId: json['sender_id'] as String,
    recipientId: json['recipient_id'] as String,
    isTyping: json['is_typing'] as bool,
  );

  Map<String, dynamic> toJson() => {
    'sender_id': senderId,
    'recipient_id': recipientId,
    'is_typing': isTyping,
  };
}

class ReadReceipt {
  final String senderId;
  final String recipientId;
  final String messageId;
  final DateTime readAt;

  ReadReceipt({required this.senderId, required this.recipientId, required this.messageId, required this.readAt});

  factory ReadReceipt.fromJson(Map<String, dynamic> json) => ReadReceipt(
    senderId: json['sender_id'] as String,
    recipientId: json['recipient_id'] as String,
    messageId: json['message_id'] as String,
    readAt: DateTime.parse(json['read_at'] as String),
  );

  Map<String, dynamic> toJson() => {
    'sender_id': senderId,
    'recipient_id': recipientId,
    'message_id': messageId,
    'read_at': readAt.toUtc().toIso8601String(),
  };
}

class DeliveryAck {
  final String messageId;
  final String deviceId;

  DeliveryAck({required this.messageId, required this.deviceId});

  factory DeliveryAck.fromJson(Map<String, dynamic> json) => DeliveryAck(
    messageId: json['message_id'] as String,
    deviceId: json['device_id'] as String,
  );

  Map<String, dynamic> toJson() => {
    'message_id': messageId,
    'device_id': deviceId,
  };
}

class Reaction {
  final String senderId;
  final String recipientId;
  final String messageId;
  final String emoji;

  Reaction({required this.senderId, required this.recipientId, required this.messageId, required this.emoji});

  factory Reaction.fromJson(Map<String, dynamic> json) => Reaction(
    senderId: json['sender_id'] as String,
    recipientId: json['recipient_id'] as String,
    messageId: json['message_id'] as String,
    emoji: json['emoji'] as String,
  );

  Map<String, dynamic> toJson() => {
    'sender_id': senderId,
    'recipient_id': recipientId,
    'message_id': messageId,
    'emoji': emoji,
  };
}

/// Parsed WebSocket message matching backend's tagged enum format.
/// Backend uses: #[serde(tag = "type")] so messages are like:
/// {"type": "SendMessage", "sender_device_id": "...", ...}
class WsIncoming {
  final String type;
  final Map<String, dynamic> raw;

  WsIncoming(this.type, this.raw);

  factory WsIncoming.fromJsonString(String s) {
    final json = jsonDecode(s) as Map<String, dynamic>;
    return WsIncoming(json['type'] as String, json);
  }

  EncryptedEnvelope? get envelope {
    if (type == 'SendMessage') return EncryptedEnvelope.fromJson(raw);
    return null;
  }

  TypingIndicator? get typing {
    if (type == 'Typing') return TypingIndicator.fromJson(raw);
    return null;
  }

  ReadReceipt? get readReceipt {
    if (type == 'Read') return ReadReceipt.fromJson(raw);
    return null;
  }

  String? get errorMessage {
    if (type == 'Error') return raw['message'] as String?;
    return null;
  }
}

/// Build outgoing messages in backend's tagged enum format.
class WsOutgoing {
  static String sendMessage(EncryptedEnvelope envelope) {
    final json = envelope.toJson();
    json['type'] = 'SendMessage';
    return jsonEncode(json);
  }

  static String typing(String senderId, String recipientId, {bool isTyping = true}) {
    return jsonEncode({
      'type': 'Typing',
      'sender_id': senderId,
      'recipient_id': recipientId,
      'is_typing': isTyping,
    });
  }

  static String readReceipt(String senderId, String recipientId, String messageId) {
    return jsonEncode({
      'type': 'Read',
      'sender_id': senderId,
      'recipient_id': recipientId,
      'message_id': messageId,
      'read_at': DateTime.now().toUtc().toIso8601String(),
    });
  }

  static String deliveryAck(String messageId, String deviceId) {
    return jsonEncode({
      'type': 'Delivered',
      'message_id': messageId,
      'device_id': deviceId,
    });
  }
}
