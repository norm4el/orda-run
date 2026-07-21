import 'dart:convert';
void main() {
  const jsonStr = '[{"id":"d6f20fce-bf55-451a-a478-0d99ae4b7e33","owner_id":"d6f20fce-bf55-451a-a478-0d99ae4b7e33","owner_orda_id":null,"owner_display_name":"??","owner_influence_points":2252738,"polygon":{"type":"MultiPolygon","coordinates":[[[[69.61392,42.33423],[69.61316,42.33555]]],[[[71.43,51.14],[71.44,51.14]]]]}}]';
  final list = jsonDecode(jsonStr);
  print(list[0]['id']);
  print(list[0]['owner_orda_id']);
}
