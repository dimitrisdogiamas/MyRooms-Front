import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:meldim/models/room.dart';


class ApiService {
  final String baseUrl = "http://192.168.1.58:8000";


  Future<List<Room>> fetchRooms() async {
    final response = await http.get(Uri.parse("$baseUrl/rooms"));
    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      return data.map((json) => Room.fromJson(json)).toList(); // this is the list of rooms
    } else {
      throw Exception("Failed to fetch rooms: ${response.statusCode}");
    }
  }


  Future<Room> fetchRoomById(int id) async {
    final response = await http.get(Uri.parse("$baseUrl/rooms/$id"));
    if (response.statusCode == 200){
      final dynamic data = jsonDecode(response.body);
      return Room.fromJson(data);
    } else {
      throw Exception("Failed to fetch room: ${response.statusCode}");
    }
  }
}
