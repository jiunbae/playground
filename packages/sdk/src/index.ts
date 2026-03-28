import { AuthModule } from './auth.js';
import { ScoresModule } from './scores.js';
import { SavesModule } from './saves.js';
import { LeaderboardModule } from './leaderboard.js';
import { MultiplayerModule } from './multiplayer.js';

export { AuthModule } from './auth.js';
export { ScoresModule } from './scores.js';
export { SavesModule } from './saves.js';
export { LeaderboardModule } from './leaderboard.js';
export { MultiplayerModule } from './multiplayer.js';

export interface PlaygroundConfig {
  apiUrl: string;
  game: string;
}

export class PlaygroundSDK {
  readonly auth: AuthModule;
  readonly scores: ScoresModule;
  readonly saves: SavesModule;
  readonly leaderboard: LeaderboardModule;
  readonly multiplayer: MultiplayerModule;

  private config: PlaygroundConfig;

  private constructor(config: PlaygroundConfig) {
    this.config = config;
    this.auth = new AuthModule(config.game);
    this.scores = new ScoresModule(config.game);
    this.saves = new SavesModule(config.game);
    this.leaderboard = new LeaderboardModule(config.game);
    this.multiplayer = new MultiplayerModule();
  }

  static init(config: PlaygroundConfig): PlaygroundSDK {
    return new PlaygroundSDK(config);
  }

  getConfig(): PlaygroundConfig {
    return { ...this.config };
  }
}

export default PlaygroundSDK;
