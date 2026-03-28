export interface ScoreEntry {
  score: number;
  timestamp: number;
  meta?: Record<string, unknown>;
}

export class ScoresModule {
  private storageKey: string;

  constructor(game: string) {
    this.storageKey = `playground:${game}:scores`;
  }

  async submit(data: { score: number; meta?: Record<string, unknown> }): Promise<void> {
    const history = this.getHistorySync();
    history.push({ score: data.score, timestamp: Date.now(), meta: data.meta });
    localStorage.setItem(this.storageKey, JSON.stringify(history));
  }

  async getMyBest(): Promise<ScoreEntry | null> {
    const history = this.getHistorySync();
    if (history.length === 0) return null;
    return history.reduce((best, entry) => entry.score > best.score ? entry : best);
  }

  async getHistory(): Promise<ScoreEntry[]> {
    return this.getHistorySync();
  }

  private getHistorySync(): ScoreEntry[] {
    const stored = localStorage.getItem(this.storageKey);
    return stored ? JSON.parse(stored) : [];
  }
}
