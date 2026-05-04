import 'dart:async';
import 'dart:math';

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:web_socket_channel/web_socket_channel.dart';

import '../models/ws_message.dart';
import 'auth_service.dart';

class WsClient {
  final AuthService _authService;

  WebSocketChannel? _channel;
  StreamSubscription<dynamic>? _subscription;
  final _controller = StreamController<WsIncoming>.broadcast();
  bool _disposed = false;
  bool _shouldReconnect = false;
  int _reconnectAttempts = 0;

  static String get _defaultHost => kIsWeb ? 'localhost' : '10.0.2.2';

  WsClient({required AuthService authService}) : _authService = authService;

  Stream<WsIncoming> get messages => _controller.stream;
  bool get isConnected => _channel != null;

  Future<void> connect() async {
    if (_disposed) return;
    _shouldReconnect = true;
    _reconnectAttempts = 0;
    await _doConnect();
  }

  Future<void> _doConnect() async {
    if (_disposed) return;
    final token = await _authService.accessToken;
    if (token == null) return;

    final uri = Uri.parse('ws://$_defaultHost:8080/ws?token=$token');

    try {
      _channel = WebSocketChannel.connect(uri);
      await _channel!.ready;
      _reconnectAttempts = 0;

      _subscription = _channel!.stream.listen(
        (data) {
          if (data is! String) return;
          try {
            final msg = WsIncoming.fromJsonString(data);
            _controller.add(msg);
          } catch (e) {
            _controller.addError(e);
          }
        },
        onError: (_) { _cleanup(); _scheduleReconnect(); },
        onDone: () { _cleanup(); _scheduleReconnect(); },
      );
    } catch (_) {
      _channel = null;
      _scheduleReconnect();
    }
  }

  void _cleanup() {
    _subscription?.cancel();
    _subscription = null;
    _channel = null;
  }

  void _scheduleReconnect() {
    if (_disposed || !_shouldReconnect || _reconnectAttempts >= 10) return;
    _reconnectAttempts++;
    final delay = Duration(seconds: pow(2, _reconnectAttempts - 1).toInt().clamp(1, 30));
    Future.delayed(delay, () {
      if (!_disposed && _shouldReconnect) _doConnect();
    });
  }

  void sendRaw(String json) {
    _channel?.sink.add(json);
  }

  void sendMessage(EncryptedEnvelope envelope) {
    sendRaw(WsOutgoing.sendMessage(envelope));
  }

  void sendTyping(String senderId, String recipientId) {
    sendRaw(WsOutgoing.typing(senderId, recipientId));
  }

  Future<void> disconnect() async {
    _shouldReconnect = false;
    _subscription?.cancel();
    _subscription = null;
    await _channel?.sink.close();
    _channel = null;
  }

  void dispose() {
    _disposed = true;
    _shouldReconnect = false;
    _subscription?.cancel();
    _channel?.sink.close();
    _controller.close();
  }
}
