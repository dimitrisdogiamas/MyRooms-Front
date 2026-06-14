import 'package:flutter/material.dart';
import 'package:meldim/models/room.dart';
import 'package:meldim/services/api.dart';

class RoomDetailScreen extends StatefulWidget {
  final int roomId;
  const RoomDetailScreen({super.key, required this.roomId});

  @override
  State<RoomDetailScreen> createState() => _RoomDetailScreenState();
}

class _RoomDetailScreenState extends State<RoomDetailScreen> {
  final ApiService _api = ApiService();
  Room? _room;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchRoomById(widget.roomId);
  }

  Future<void> _fetchRoomById(int id) async {
    try {
      final room = await _api.fetchRoomById(id);
      setState(() {
        _room = room;
        _error = null;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Room Details')),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_error != null) {
      return Center(child: Text(_error!));
    }

    if (_room == null) {
      return const Center(child: CircularProgressIndicator());
    }

    return Column(
      children: [
        Text(_room!.title),
        Text('€${_room!.price_per_night}/night'),
        Text('${_room!.max_guests} guests'),
      ],
    );
  }
}
