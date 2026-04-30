import 'dart:convert';

class EncryptedEnvelope {
  final String senderDeviceId;
  final String recipientDeviceId;
  final String ciphertext;
  final int messageType; // 0 = preKey, 1 = normal
  final String messageId;
  final DateTime timestamp;

  EncryptedEnvelope({
    required this.senderDeviceId,
    required this.recipientDeviceId,
    required this.ciphertext,
    required this.messageType,
    required this.messageId,
    required this.timestamp,
  });

  factory EncryptedEnvelope.fromJson(Map<String, dynamic> json) {
    return EncryptedEnvelope(
      senderDeviceId: json['sender_device_id'] as String,
      recipientDeviceId: json['recipient_device_id'] as String,
      ciphertext: json['ciphertext'] as String,
      messageType: json['message_type'] as int,
      messageId: json['message_id'] as String,
      timestamp: DateTime.parse(json['timestamp'] as String),
    );
  }

  Map<String, dynamic> toJson() => {
        'sender_device_id': senderDeviceId,
        'recipient_device_id': recipientDeviceId,
        'ciphertext': ciphertext,
        'message_type': messageType,
        'message_id': messageId,
        'timestamp': timestamp.toUtc().toIso8601String(),
      };
}

class DeliveryAck {
  final String messageId;
  final DateTime deliveredAt;

  DeliveryAck({required this.messageId, required this.deliveredAt});

  factory DeliveryAck.fromJson(Map<String, dynamic> json) {
    return DeliveryAck(
      messageId: json['message_id'] as String,
      deliveredAt: DateTime.parse(json['delivered_at'] as String),
    );
  }

  Map<String, dynamic> toJson() => {
        'message_id': messageId,
        'delivered_at': deliveredAt.toUtc().toIso8601String(),
      };
}

class TypingIndicator {
  final String senderId;
  final String recipientId;
  final bool isTyping;

  TypingIndicator({
    required this.senderId,
    required this.recipientId,
    required this.isTyping,
  });

  factory TypingIndicator.fromJson(Map<String, dynamic> json) {
    return TypingIndicator(
      senderId: json['sender_id'] as String,
      recipientId: json['recipient_id'] as String,
      isTyping: json['is_typing'] as bool,
    );
  }

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

  ReadReceipt({
    required this.senderId,
    required this.recipientId,
    required this.messageId,
    required this.readAt,
  });

  factory ReadReceipt.fromJson(Map<String, dynamic> json) {
    return ReadReceipt(
      senderId: json['sender_id'] as String,
      recipientId: json['recipient_id'] as String,
      messageId: json['message_id'] as String,
      readAt: DateTime.parse(json['read_at'] as String),
    );
  }

  Map<String, dynamic> toJson() => {
        'sender_id': senderId,
        'recipient_id': recipientId,
        'message_id': messageId,
        'read_at': readAt.toUtc().toIso8601String(),
      };
}

class Reaction {
  final String senderId;
  final String messageId;
  final String emoji;

  Reaction({
    required this.senderId,
    required this.messageId,
    required this.emoji,
  });

  factory Reaction.fromJson(Map<String, dynamic> json) {
    return Reaction(
      senderId: json['sender_id'] as String,
      messageId: json['message_id'] as String,
      emoji: json['emoji'] as String,
    );
  }

  Map<String, dynamic> toJson() => {
        'sender_id': senderId,
        'message_id': messageId,
        'emoji': emoji,
      };
}

enum WsMessageType {
  envelope,
  deliveryAck,
  typing,
  readReceipt,
  reaction,
}

class WsMessage {
  final WsMessageType type;
  final dynamic payload;

  WsMessage({required this.type, required this.payload});

  factory WsMessage.fromJson(Map<String, dynamic> json) {
    final typeStr = json['type'] as String;
    switch (typeStr) {
      case 'envelope':
        return WsMessage(
          type: WsMessageType.envelope,
          payload:
              EncryptedEnvelope.fromJson(json['payload'] as Map<String, dynamic>),
        );
      case 'delivery_ack':
        return WsMessage(
          type: WsMessageType.deliveryAck,
          payload:
              DeliveryAck.fromJson(json['payload'] as Map<String, dynamic>),
        );
      case 'typing':
        return WsMessage(
          type: WsMessageType.typing,
          payload:
              TypingIndicator.fromJson(json['payload'] as Map<String, dynamic>),
        );
      case 'read_receipt':
        return WsMessage(
          type: WsMessageType.readReceipt,
          payload:
              ReadReceipt.fromJson(json['payload'] as Map<String, dynamic>),
        );
      case 'reaction':
        return WsMessage(
          type: WsMessageType.reaction,
          payload: Reaction.fromJson(json['payload'] as Map<String, dynamic>),
        );
      default:
        throw FormatException('Unknown WsMessage type: $typeStr');
    }
  }

  Map<String, dynamic> toJson() {
    String typeStr;
    switch (type) {
      case WsMessageType.envelope:
        typeStr = 'envelope';
      case WsMessageType.deliveryAck:
        typeStr = 'delivery_ack';
      case WsMessageType.typing:
        typeStr = 'typing';
      case WsMessageType.readReceipt:
        typeStr = 'read_receipt';
      case WsMessageType.reaction:
        typeStr = 'reaction';
    }
    return {
      'type': typeStr,
      'payload': (payload as dynamic).toJson(),
    };
  }

  String toJsonString() => jsonEncode(toJson());

  static WsMessage fromJsonString(String source) =>
      WsMessage.fromJson(jsonDecode(source) as Map<String, dynamic>);
}
