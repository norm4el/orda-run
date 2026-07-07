export function getRankFromPoints(points: number): { title: string, nextMilestone: number | null, progress: number } {
  // Influence points are in square meters.
  // 1 km² = 1,000,000 m²
  if (points < 1000) return { title: 'Странник', nextMilestone: 1000, progress: points / 1000 };
  if (points < 5000) return { title: 'Следопыт', nextMilestone: 5000, progress: (points - 1000) / 4000 };
  if (points < 15000) return { title: 'Воин', nextMilestone: 15000, progress: (points - 5000) / 10000 };
  if (points < 50000) return { title: 'Батыр', nextMilestone: 50000, progress: (points - 15000) / 35000 };
  if (points < 200000) return { title: 'Султан', nextMilestone: 200000, progress: (points - 50000) / 150000 };
  if (points < 1000000) return { title: 'Хан', nextMilestone: 1000000, progress: (points - 200000) / 800000 };
  
  return { title: 'Император', nextMilestone: null, progress: 1 };
}
