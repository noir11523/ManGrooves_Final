import 'package:flutter/material.dart';

import '../core/api_client.dart';

class ServerConnectionScreen extends StatefulWidget {
  const ServerConnectionScreen({super.key, required this.api});

  final ApiClient api;

  @override
  State<ServerConnectionScreen> createState() => _ServerConnectionScreenState();
}

class _ServerConnectionScreenState extends State<ServerConnectionScreen> {
  late final TextEditingController _address;
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final uri = Uri.parse(widget.api.baseUrl);
    _address = TextEditingController(
      text: uri.port == 80 ? uri.host : '${uri.host}:${uri.port}',
    );
  }

  @override
  void dispose() {
    _address.dispose();
    super.dispose();
  }

  Future<void> _connect() async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await widget.api.connectToLocalServer(_address.text);
      if (mounted) Navigator.of(context).pop(true);
    } catch (error) {
      if (mounted) {
        setState(() => _error = error is ApiException
            ? error.message
            : 'Could not check this server. Please try again.');
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('Server connection'),
      leading: const CloseButton(),
    ),
    body: SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Icon(Icons.wifi, size: 48),
            const SizedBox(height: 20),
            Text('Connect to your laptop',
                style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 12),
            const Text(
              'The laptop address can change when you reconnect to Wi-Fi. '
              'On the laptop, open Command Prompt, run ipconfig, and find '
              'the IPv4 Address under Wireless LAN adapter Wi-Fi.',
            ),
            const SizedBox(height: 24),
            TextField(
              controller: _address,
              enabled: !_busy,
              keyboardType: TextInputType.url,
              autocorrect: false,
              enableSuggestions: false,
              textInputAction: TextInputAction.done,
              decoration: const InputDecoration(
                labelText: 'Laptop Wi-Fi IP address',
                hintText: '192.168.1.20',
                prefixIcon: Icon(Icons.computer),
              ),
              onSubmitted: (_) => _connect(),
            ),
            if (_error != null) ...[
              const SizedBox(height: 16),
              Semantics(
                liveRegion: true,
                child: Text(_error!,
                    style: TextStyle(color: Theme.of(context).colorScheme.error)),
              ),
            ],
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _busy ? null : _connect,
              child: _busy
                  ? const SizedBox.square(
                      dimension: 22,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Check and connect'),
            ),
            const SizedBox(height: 16),
            const Text(
              'Keep Apache and MySQL running. If this address also fails in '
              'the phone browser, the laptop firewall or Wi-Fi network may '
              'be blocking the connection.',
            ),
          ],
        ),
      ),
    ),
  );
}
