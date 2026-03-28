/**
 * Game statistics stored in localStorage
 */

import { PlaygroundSDK } from '@playground/sdk';

export interface GameStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  guessDistribution: number[]; // index 0 = won in 1, index 5 = won in 6
  lastPlayedDate: string | null; // YYYY-MM-DD
  lastCompletedPuzzle: number | null; // puzzle number
}

const STORAGE_KEY = 'hangul-puzzle-stats';
const GAME_STATE_KEY = 'hangul-puzzle-state';

// --- Cloud save helpers ---
let _sdk: PlaygroundSDK | null = null;

export function initCloudSave(sdk: PlaygroundSDK | null): void {
  _sdk = sdk;
}

function showCloudToast(message: string): void {
  const existing = document.getElementById('cloud-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.id = 'cloud-toast';
  toast.textContent = message;
  toast.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.8);color:#fff;padding:8px 16px;border-radius:20px;font-size:13px;z-index:9999;transition:opacity 0.3s;';
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 2000);
}

export async function cloudSaveStats(): Promise<void> {
  if (!_sdk) return;
  try {
    const stats = loadStats();
    const gameState = loadGameState();
    await _sdk.saves.save({ stats, gameState, updatedAt: Date.now() });
    showCloudToast('\u2601\uFE0F \uC800\uC7A5\uB428');
  } catch { /* cloud save failed, continue offline */ }
}

export async function cloudSyncOnLogin(): Promise<void> {
  if (!_sdk) return;
  try {
    const cloudData = await _sdk.saves.load<{ stats: GameStats; gameState: SavedGameState | null; updatedAt: number }>();
    if (!cloudData) {
      // No cloud save, push local to cloud
      await cloudSaveStats();
      return;
    }

    const localStats = loadStats();
    // Conflict resolution: use the one with more gamesPlayed
    if (cloudData.stats && cloudData.stats.gamesPlayed > localStats.gamesPlayed) {
      saveStats(cloudData.stats);
      if (cloudData.gameState) {
        saveGameState(cloudData.gameState);
      }
      showCloudToast('\u2601\uFE0F \uD074\uB77C\uC6B0\uB4DC\uC5D0\uC11C \uBCF5\uC6D0\uB428');
    } else if (localStats.gamesPlayed > (cloudData.stats?.gamesPlayed || 0)) {
      await cloudSaveStats();
    }
  } catch { /* cloud sync failed, continue offline */ }
}

export interface SavedGameState {
  puzzleNumber: number;
  guesses: string[];
  completed: boolean;
  won: boolean;
}

function getDefaultStats(): GameStats {
  return {
    gamesPlayed: 0,
    gamesWon: 0,
    currentStreak: 0,
    maxStreak: 0,
    guessDistribution: [0, 0, 0, 0, 0, 0],
    lastPlayedDate: null,
    lastCompletedPuzzle: null,
  };
}

export function loadStats(): GameStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultStats();
    return JSON.parse(raw) as GameStats;
  } catch {
    return getDefaultStats();
  }
}

export function saveStats(stats: GameStats): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

export function recordWin(guessCount: number): GameStats {
  const stats = loadStats();
  stats.gamesPlayed++;
  stats.gamesWon++;
  stats.guessDistribution[guessCount - 1]++;
  stats.currentStreak++;
  if (stats.currentStreak > stats.maxStreak) {
    stats.maxStreak = stats.currentStreak;
  }
  stats.lastPlayedDate = todayString();
  saveStats(stats);
  return stats;
}

export function recordLoss(): GameStats {
  const stats = loadStats();
  stats.gamesPlayed++;
  stats.currentStreak = 0;
  stats.lastPlayedDate = todayString();
  saveStats(stats);
  return stats;
}

export function loadGameState(): SavedGameState | null {
  try {
    const raw = localStorage.getItem(GAME_STATE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedGameState;
  } catch {
    return null;
  }
}

export function saveGameState(state: SavedGameState): void {
  localStorage.setItem(GAME_STATE_KEY, JSON.stringify(state));
}

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getWinPercentage(stats: GameStats): number {
  if (stats.gamesPlayed === 0) return 0;
  return Math.round((stats.gamesWon / stats.gamesPlayed) * 100);
}

export function getAverageGuesses(stats: GameStats): string {
  if (stats.gamesWon === 0) return '-';
  let total = 0;
  for (let i = 0; i < 6; i++) {
    total += stats.guessDistribution[i] * (i + 1);
  }
  return (total / stats.gamesWon).toFixed(1);
}
