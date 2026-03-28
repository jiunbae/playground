export class SavesModule {
  private storageKey: string;

  constructor(game: string) {
    this.storageKey = `playground:${game}:saves`;
  }

  async save(data: unknown): Promise<void> {
    localStorage.setItem(this.storageKey, JSON.stringify({
      data,
      savedAt: Date.now(),
    }));
  }

  async load<T = unknown>(): Promise<T | null> {
    const stored = localStorage.getItem(this.storageKey);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed.data as T;
  }

  async sync(): Promise<void> {
    // Stub: when API is available, sync local saves to server
    // For now, no-op since we only have localStorage
  }
}
