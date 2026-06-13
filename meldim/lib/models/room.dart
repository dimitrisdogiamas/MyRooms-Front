class Room {
  // properties
  int id;
  String title;
  double price_per_night;
  int max_guests;


// constructor
Room({
  required this.id,
  required this.title,
  required this.price_per_night,
  required this.max_guests,


});

// fromJson method
  factory Room.fromJson(Map<String,dynamic> json) {
    return Room(
      id: json['id'] as int,
      title: json['title'] as String,
      price_per_night: double.parse(json['price_per_night'].toString()),
      max_guests: json['max_guests'] as int,
    );
  }
}
