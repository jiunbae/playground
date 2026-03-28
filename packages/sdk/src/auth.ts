export interface User {
  id: string;
  name: string;
  avatar?: string;
}

export class AuthModule {
  private storageKey: string;

  constructor(game: string) {
    this.storageKey = `playground:${game}:auth`;
  }

  async loginIfAvailable(): Promise<User | null> {
    const stored = localStorage.getItem(this.storageKey);
    if (stored) {
      return JSON.parse(stored) as User;
    }
    return null;
  }

  getUser(): User | null {
    const stored = localStorage.getItem(this.storageKey);
    return stored ? (JSON.parse(stored) as User) : null;
  }

  logout(): void {
    localStorage.removeItem(this.storageKey);
  }
}
