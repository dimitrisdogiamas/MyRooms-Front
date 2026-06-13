import 'package:flutter/material.dart';
import 'package:meldim/models/room.dart';
import 'package:meldim/services/api.dart';

class RoomListScreen extends StatefulWidget {
  const RoomListScreen({super.key});

  @override
  State<RoomListScreen> createState() => _RoomListScreenState();
}

class _RoomListScreenState extends State<RoomListScreen> {
  final ApiService _api = ApiService();
  List<Room>? _rooms;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchRooms();
  }

  Future<void> _fetchRooms() async {
    try {
      final rooms = await _api.fetchRooms();
      setState(() {
        _rooms = rooms;
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
      appBar: AppBar(title: const Text('Rooms')),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_error != null) {
      return Center(child: Text(_error!));
    }

    if (_rooms == null) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_rooms!.isEmpty) {
      return const Center(child: Text('No rooms found'));
    }

    return ListView.builder(
      itemCount: _rooms!.length,
      itemBuilder: (context, index) {
        final room = _rooms![index];
        return ListTile(
          title: Text(room.title),
          subtitle: Text('€${room.price_per_night}/night · ${room.max_guests} guests'),
        );
      },
    );
  }
}
