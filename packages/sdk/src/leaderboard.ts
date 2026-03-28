export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  score: number;
  timestamp: number;
}

export class LeaderboardModule {
  private storageKey: string;

  constructor(game: string) {
    this.storageKey = `playground:${game}:leaderboard`;
  }

  async top(limit: number = 10): Promise<LeaderboardEntry[]> {
    const entries = this.getEntriesSync();
    return entries
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  }

  async aroundMe(): Promise<LeaderboardEntry[]> {
    // Stub: returns all local entries since we don't have user context without API
    return this.getEntriesSync();
  }

  private getEntriesSync(): LeaderboardEntry[] {
    const stored = localStorage.getItem(this.storageKey);
    return stored ? JSON.parse(stored) : [];
  }
}
