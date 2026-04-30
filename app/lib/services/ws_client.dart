import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:web_socket_channel/web_socket_channel.dart';

import '../models/ws_message.dart';
import 'auth_service.dart';

class WsClient {
  final String host;
  final int port;
  final AuthService _authService;

  WebSocketChannel? _channel;
  StreamSubscription<dynamic>? _subscription;
  final _controller = StreamController<WsMessage>.broadcast();
  bool _disposed = false;
  bool _shouldReconnect = false;
  int _reconnectAttempts = 0;
  static const _maxReconnectAttempts = 10;
  static const _baseDelay = Duration(seconds: 1);

  WsClient({
    this.host = '10.0.2.2',
    this.port = 8080,
    required AuthService authService,
  }) : _authService = authService;

  /// Stream of incoming WebSocket messages.
  Stream<WsMessage> get messages => _controller.stream;

  /// Whether the WebSocket is currently connected.
  bool get isConnected => _channel != null;

  /// Connect to the WebSocket server.
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

    final uri = Uri.parse('ws://$host:$port/ws?token=$token');

    try {
      _channel = WebSocketChannel.connect(uri);
      await _channel!.ready;

      _reconnectAttempts = 0;

      _subscription = _channel!.stream.listen(
        _onData,
        onError: _onError,
        onDone: _onDone,
      );
    } catch (e) {
      _channel = null;
      _scheduleReconnect();
    }
  }

  void _onData(dynamic data) {
    if (data is! String) return;
    try {
      final json = jsonDecode(data) as Map<String, dynamic>;
      final message = WsMessage.fromJson(json);
      _controller.add(message);
    } catch (e) {
      _controller.addError(e);
    }
  }

  void _onError(Object error) {
    _controller.addError(error);
    _cleanup();
    _scheduleReconnect();
  }

  void _onDone() {
    _cleanup();
    _scheduleReconnect();
  }

  void _cleanup() {
    _subscription?.cancel();
    _subscription = null;
    _channel = null;
  }

  void _scheduleReconnect() {
    if (_disposed || !_shouldReconnect) return;
    if (_reconnectAttempts >= _maxReconnectAttempts) return;

    _reconnectAttempts++;
    final delay = _baseDelay * pow(2, _reconnectAttempts - 1);

    Future.delayed(delay, () {
      if (!_disposed && _shouldReconnect) {
        _doConnect();
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Send helpers
  // ---------------------------------------------------------------------------

  void _send(WsMessage message) {
    _channel?.sink.add(message.toJsonString());
  }

  /// Send an encrypted envelope to the server.
  void sendMessage(EncryptedEnvelope envelope) {
    _send(WsMessage(type: WsMessageType.envelope, payload: envelope));
  }

  /// Send a typing indicator.
  void sendTyping(String recipientId) {
    _send(WsMessage(
      type: WsMessageType.typing,
      payload: TypingIndicator(
        senderId: '', // Server fills in the authenticated sender
        recipientId: recipientId,
        isTyping: true,
      ),
    ));
  }

  /// Send a read receipt.
  void sendReadReceipt(String senderId, String messageId) {
    _send(WsMessage(
      type: WsMessageType.readReceipt,
      payload: ReadReceipt(
        senderId: senderId,
        recipientId: '', // Server fills in
        messageId: messageId,
        readAt: DateTime.now().toUtc(),
      ),
    ));
  }

  /// Disconnect from the server. Does not auto-reconnect.
  Future<void> disconnect() async {
    _shouldReconnect = false;
    _subscription?.cancel();
    _subscription = null;
    await _channel?.sink.close();
    _channel = null;
  }

  /// Permanently dispose of this client. Cannot be reused after this.
  void dispose() {
    _disposed = true;
    _shouldReconnect = false;
    _subscription?.cancel();
    _channel?.sink.close();
    _controller.close();
  }
}
