import 'package:flutter/material.dart';

class TitleInfo {
  final String title;
  final Color color;

  const TitleInfo(this.title, this.color);
}

class TitleHelper {
  static TitleInfo getTitleForInfluence(int points) {
    // 1 km² = 1,000,000 influence points
    if (points < 1000000) {
      return const TitleInfo('Кочевник', Colors.grey);
    } else if (points < 5000000) {
      return const TitleInfo('Воин', Colors.white);
    } else if (points < 20000000) {
      return const TitleInfo('Батыр', Colors.blueAccent);
    } else if (points < 50000000) {
      return const TitleInfo('Хан', Colors.purpleAccent);
    } else if (points < 100000000) {
      return const TitleInfo('Каган', Colors.orangeAccent);
    } else {
      return const TitleInfo('Император Степи', Color(0xFFF5D142));
    }
  }
}
