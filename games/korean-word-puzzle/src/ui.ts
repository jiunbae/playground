/**
 * UI rendering and interaction
 */

import './styles.css';
import { Game } from './game';
import type { DuelOptions } from './game';
import { JamoStatus, type GuessFeedback, type SyllableFeedback } from './engine';
import { decompose, isHangul, CHOSEONG, JUNGSEONG } from './jamo';
import { WORD_LENGTH } from './words';
import { loadStats, initCloudSave, cloudSaveStats, cloudSyncOnLogin } from './stats';
import type { GameStats } from './stats';
import { PlaygroundSDK } from '@playground/sdk';

// --- SDK Init ---
let sdk: PlaygroundSDK | null = null;
try {
  sdk = PlaygroundSDK.init({ apiUrl: 'https://api.jiun.dev', game: 'korean-word-puzzle' });
} catch { /* SDK init failed, continue offline */ }

// Init cloud save module
initCloudSave(sdk);

// Sync on load if already logged in
try {
  if (sdk?.auth.getUser()) {
    cloudSyncOnLogin();
  }
} catch { /* ignore */ }

const MAX_GUESSES = 6;
const LEADERBOARD_KEY = 'playground_korean-word-puzzle_leaderboard';
const LEADERBOARD_MAX = 50;

// --- Duel mode ---
interface DuelData {
  seed: number;
  guesses: number;
  won: boolean;
  timeMs: number;
}

function encodeDuel(seed: number, guesses: number, won: boolean, timeMs: number): string {
  const data = `${seed},${guesses},${won ? 1 : 0},${timeMs}`;
  return btoa(data);
}

function decodeDuel(encoded: string): DuelData | null {
  try {
    const [seed, guesses, won, timeMs] = atob(encoded).split(',').map(Number);
    if (isNaN(seed) || isNaN(guesses) || isNaN(timeMs)) return null;
    return { seed, guesses, won: !!won, timeMs };
  } catch {
    return null;
  }
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}초`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}분 ${seconds}초`;
}

interface LeaderboardRecord {
  name: string;
  avgGuesses: number;
  streak: number;
  timestamp: number;
}

function loadLeaderboard(): LeaderboardRecord[] {
  try {
    const data = localStorage.getItem(LEADERBOARD_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

function saveToLeaderboard(entry: LeaderboardRecord): void {
  const entries = loadLeaderboard();
  entries.push(entry);
  entries.sort((a, b) => a.avgGuesses - b.avgGuesses);
  if (entries.length > LEADERBOARD_MAX) entries.length = LEADERBOARD_MAX;
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries));
}

// Korean keyboard layout
const KEYBOARD_ROWS = [
  ['ㅂ', 'ㅈ', 'ㄷ', 'ㄱ', 'ㅅ', 'ㅛ', 'ㅕ', 'ㅑ', 'ㅐ', 'ㅔ'],
  ['ㅁ', 'ㄴ', 'ㅇ', 'ㄹ', 'ㅎ', 'ㅗ', 'ㅓ', 'ㅏ', 'ㅣ'],
  ['ENTER', 'ㅋ', 'ㅌ', 'ㅊ', 'ㅍ', 'ㅠ', 'ㅜ', 'ㅡ', 'BACK'],
];

// Shift (double consonant) mappings
const SHIFT_MAP: Record<string, string> = {
  'ㅂ': 'ㅃ', 'ㅈ': 'ㅉ', 'ㄷ': 'ㄸ', 'ㄱ': 'ㄲ', 'ㅅ': 'ㅆ',
  'ㅐ': 'ㅒ', 'ㅔ': 'ㅖ',
};

export class UI {
  private game: Game;
  private boardEl!: HTMLElement;
  private keyboardEl!: HTMLElement;
  private messageEl!: HTMLElement;
  private modalOverlay!: HTMLElement;
  private shiftActive: boolean = false;
  private scoreSubmitted: boolean = false;
  private pendingDuel: DuelData | null = null;

  constructor() {
    // Check URL for duel parameters
    const urlParams = new URLSearchParams(window.location.search);
    const duelParam = urlParams.get('duel');
    let duelOptions: DuelOptions | undefined;

    if (duelParam) {
      const duelData = decodeDuel(duelParam);
      if (duelData) {
        this.pendingDuel = duelData;
        duelOptions = { seed: duelData.seed };
        // Clean up URL without reload
        const url = new URL(window.location.href);
        url.searchParams.delete('duel');
        window.history.replaceState({}, '', url.pathname + url.search);
      }
    }

    this.game = new Game(() => this.onGameUpdate(), duelOptions);
    this.init();
    this.render();
    // Update login button state on load
    this.updateLoginButton();
  }

  private onGameUpdate(): void {
    // Check if game just ended and we haven't submitted yet
    if (this.game.state.gameOver && !this.scoreSubmitted) {
      this.scoreSubmitted = true;
      if (!this.game.state.isDuel) {
        this.submitScore();
        // Cloud save stats on game end
        cloudSaveStats();
      }
      // If this is a duel game and we have pending duel data, show comparison after delay
      if (this.game.state.isDuel && this.pendingDuel) {
        setTimeout(() => this.showDuelComparison(), 2000);
      }
    }
    this.render();
  }

  private updateLoginButton(): void {
    if (!sdk) return;
    try {
      const user = sdk.auth.getUser();
      const loginBtn = document.getElementById('btn-login');
      if (loginBtn) {
        loginBtn.textContent = user ? '\u{1F464}' : '\u{1F512}';
        loginBtn.style.opacity = user ? '1' : '0.6';
      }
    } catch { /* ignore */ }
  }

  private init(): void {
    const app = document.getElementById('app')!;
    app.innerHTML = '';

    // Header
    const header = document.createElement('header');
    header.className = 'header';
    header.innerHTML = `
      <button class="header-btn" id="btn-help" aria-label="도움말">?</button>
      <h1 class="title">한끝차이</h1>
      <div class="header-right">
        <button class="header-btn" id="btn-leaderboard" aria-label="리더보드" style="font-size:16px;">🏆</button>
        <button class="header-btn" id="btn-login" aria-label="로그인" style="font-size:16px;opacity:0.6;">🔒</button>
        <button class="header-btn" id="btn-stats" aria-label="통계">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="4" y="14" width="4" height="6"/><rect x="10" y="8" width="4" height="12"/><rect x="16" y="4" width="4" height="16"/>
          </svg>
        </button>
      </div>
    `;
    app.appendChild(header);

    // Duel mode badge
    if (this.game.state.isDuel) {
      const duelBadge = document.createElement('div');
      duelBadge.className = 'duel-badge';
      duelBadge.textContent = '\uD83C\uDD9A 대결 모드';
      app.appendChild(duelBadge);
    }

    // Message toast
    this.messageEl = document.createElement('div');
    this.messageEl.className = 'message-container';
    app.appendChild(this.messageEl);

    // Board
    this.boardEl = document.createElement('div');
    this.boardEl.className = 'board-container';
    this.createBoard();
    app.appendChild(this.boardEl);

    // Keyboard
    this.keyboardEl = document.createElement('div');
    this.keyboardEl.className = 'keyboard';
    this.createKeyboard();
    app.appendChild(this.keyboardEl);

    // Modal overlay
    this.modalOverlay = document.createElement('div');
    this.modalOverlay.className = 'modal-overlay hidden';
    this.modalOverlay.addEventListener('click', (e) => {
      if (e.target === this.modalOverlay) this.closeModal();
    });
    app.appendChild(this.modalOverlay);

    // Event listeners
    document.getElementById('btn-help')!.addEventListener('click', () => this.showHelp());
    document.getElementById('btn-leaderboard')!.addEventListener('click', () => this.showLeaderboard());
    document.getElementById('btn-stats')!.addEventListener('click', () => this.showStats());
    document.getElementById('btn-login')!.addEventListener('click', () => this.handleLogin());

    // Physical keyboard
    document.addEventListener('keydown', (e) => this.handleKeydown(e));

    // First-time user: auto-show help if no stats exist
    const stats = loadStats();
    if (stats.gamesPlayed === 0) {
      setTimeout(() => this.showHelp(), 300);
    }
  }

  private createBoard(): void {
    const board = document.createElement('div');
    board.className = 'board';

    for (let row = 0; row < MAX_GUESSES; row++) {
      const rowEl = document.createElement('div');
      rowEl.className = 'board-row';
      rowEl.dataset.row = String(row);

      for (let col = 0; col < WORD_LENGTH; col++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.row = String(row);
        cell.dataset.col = String(col);

        // Each cell has 3 jamo slots (cho, jung, jong)
        const jamoContainer = document.createElement('div');
        jamoContainer.className = 'jamo-slots';

        const choSlot = document.createElement('span');
        choSlot.className = 'jamo-slot cho';
        const jungSlot = document.createElement('span');
        jungSlot.className = 'jamo-slot jung';
        const jongSlot = document.createElement('span');
        jongSlot.className = 'jamo-slot jong';

        jamoContainer.appendChild(choSlot);
        jamoContainer.appendChild(jungSlot);
        jamoContainer.appendChild(jongSlot);

        // The main character display
        const charDisplay = document.createElement('div');
        charDisplay.className = 'cell-char';

        cell.appendChild(charDisplay);
        cell.appendChild(jamoContainer);
        rowEl.appendChild(cell);
      }

      board.appendChild(rowEl);
    }

    this.boardEl.innerHTML = '';
    this.boardEl.appendChild(board);
  }

  private createKeyboard(): void {
    this.keyboardEl.innerHTML = '';

    for (const row of KEYBOARD_ROWS) {
      const rowEl = document.createElement('div');
      rowEl.className = 'keyboard-row';

      for (const key of row) {
        const btn = document.createElement('button');
        btn.className = 'key';
        btn.dataset.key = key;

        if (key === 'ENTER') {
          btn.textContent = '확인';
          btn.classList.add('key-wide', 'key-enter');
        } else if (key === 'BACK') {
          btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg>`;
          btn.classList.add('key-wide', 'key-back');
        } else {
          btn.textContent = key;
          if (SHIFT_MAP[key]) {
            btn.classList.add('has-shift');
          }
        }

        btn.addEventListener('click', (e) => {
          e.preventDefault();
          this.handleKey(key);
        });

        // Long press for shift (double consonant)
        if (SHIFT_MAP[key]) {
          let pressTimer: number | null = null;
          btn.addEventListener('pointerdown', () => {
            pressTimer = window.setTimeout(() => {
              this.handleKey(SHIFT_MAP[key]);
              pressTimer = null;
            }, 400);
          });
          btn.addEventListener('pointerup', () => {
            if (pressTimer !== null) {
              clearTimeout(pressTimer);
              pressTimer = null;
            }
          });
          btn.addEventListener('pointerleave', () => {
            if (pressTimer !== null) {
              clearTimeout(pressTimer);
              pressTimer = null;
            }
          });
        }

        rowEl.appendChild(btn);
      }

      this.keyboardEl.appendChild(rowEl);
    }

    // Shift row for double consonants
    const shiftRow = document.createElement('div');
    shiftRow.className = 'keyboard-row shift-row';
    const shiftKeys = ['ㅃ', 'ㅉ', 'ㄸ', 'ㄲ', 'ㅆ', 'ㅒ', 'ㅖ'];
    for (const key of shiftKeys) {
      const btn = document.createElement('button');
      btn.className = 'key key-shift';
      btn.dataset.key = key;
      btn.textContent = key;
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleKey(key);
      });
      shiftRow.appendChild(btn);
    }
    this.keyboardEl.appendChild(shiftRow);
  }

  private handleKey(key: string): void {
    if (key === 'ENTER') {
      this.game.submit();
    } else if (key === 'BACK') {
      this.game.backspace();
    } else {
      this.game.inputJamo(key);
    }
  }

  private handleKeydown(e: KeyboardEvent): void {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (this.modalOverlay.classList.contains('hidden') === false) {
      if (e.key === 'Escape') this.closeModal();
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      this.game.submit();
      return;
    }
    if (e.key === 'Backspace') {
      e.preventDefault();
      this.game.backspace();
      return;
    }

    // Map physical Korean keyboard input
    // When the OS Korean IME is off, the browser sends the raw Korean jamo
    // We handle both raw jamo and romanized input
    const jamoFromKey = physicalKeyToJamo(e.key, e.shiftKey);
    if (jamoFromKey) {
      e.preventDefault();
      this.game.inputJamo(jamoFromKey);
    }
  }

  private async handleLogin(): Promise<void> {
    if (!sdk) return;
    try {
      const user = await sdk.auth.loginIfAvailable();
      const loginBtn = document.getElementById('btn-login');
      if (loginBtn) {
        loginBtn.textContent = user ? '\u{1F464}' : '\u{1F512}';
        loginBtn.style.opacity = user ? '1' : '0.6';
      }
      if (user) {
        await cloudSyncOnLogin();
      }
    } catch { /* login failed, continue offline */ }
  }

  private async submitScore(): Promise<void> {
    const { puzzleNumber, guesses, won } = this.game.state;
    const stats = this.game.getStats();

    // Save to local leaderboard
    if (won && stats.gamesWon > 0) {
      const avgGuesses = Math.round((stats.guessDistribution.reduce((sum, count, i) => sum + count * (i + 1), 0) / stats.gamesWon) * 100) / 100;
      let userName = '나';
      try { if (sdk) { const u = sdk.auth.getUser(); if (u) userName = u.name; } } catch {}
      saveToLeaderboard({
        name: userName,
        avgGuesses,
        streak: stats.currentStreak,
        timestamp: Date.now(),
      });
    }

    if (!sdk) return;
    try {
      await sdk.scores.submit({
        score: guesses.length,
        meta: {
          puzzleNumber,
          guesses: guesses.map(g => g.guess),
          streak: stats.currentStreak,
          won,
        },
      });
    } catch { /* score submission failed, continue offline */ }
  }

  render(): void {
    this.renderBoard();
    this.renderKeyboard();
    this.renderMessage();
  }

  private renderBoard(): void {
    const { guesses, currentInput, gameOver } = this.game.state;

    for (let row = 0; row < MAX_GUESSES; row++) {
      const rowEl = this.boardEl.querySelector(`.board-row[data-row="${row}"]`)!;

      if (row < guesses.length) {
        // Completed guess row
        this.renderCompletedRow(rowEl, guesses[row], row);
      } else if (row === guesses.length && !gameOver) {
        // Current input row
        this.renderInputRow(rowEl, currentInput);
      } else {
        // Empty row
        this.renderEmptyRow(rowEl);
      }
    }
  }

  private renderCompletedRow(rowEl: Element, feedback: GuessFeedback, rowIndex: number): void {
    for (let col = 0; col < WORD_LENGTH; col++) {
      const cell = rowEl.querySelector(`.cell[data-col="${col}"]`) as HTMLElement;
      const syl = feedback.syllables[col];
      const charDisplay = cell.querySelector('.cell-char') as HTMLElement;
      const jamoSlots = cell.querySelector('.jamo-slots') as HTMLElement;

      cell.className = 'cell revealed';

      charDisplay.textContent = syl.char;
      charDisplay.style.display = 'none'; // Hide full char, show jamo

      jamoSlots.style.display = 'flex';
      const choSlot = jamoSlots.querySelector('.cho') as HTMLElement;
      const jungSlot = jamoSlots.querySelector('.jung') as HTMLElement;
      const jongSlot = jamoSlots.querySelector('.jong') as HTMLElement;

      choSlot.textContent = syl.jamoResult.cho;
      choSlot.className = `jamo-slot cho ${statusClass(syl.cho)}`;

      jungSlot.textContent = syl.jamoResult.jung;
      jungSlot.className = `jamo-slot jung ${statusClass(syl.jung)}`;

      if (syl.jamoResult.jong && syl.jong !== null) {
        jongSlot.textContent = syl.jamoResult.jong;
        jongSlot.className = `jamo-slot jong ${statusClass(syl.jong)}`;
        jongSlot.style.display = 'flex';
      } else {
        jongSlot.textContent = '';
        jongSlot.className = 'jamo-slot jong';
        jongSlot.style.display = 'none';
      }

      // Flip animation delay
      cell.style.animationDelay = `${col * 300}ms`;
      cell.classList.add('flip');
    }
  }

  private renderInputRow(rowEl: Element, input: string): void {
    const chars = [...input];
    for (let col = 0; col < WORD_LENGTH; col++) {
      const cell = rowEl.querySelector(`.cell[data-col="${col}"]`) as HTMLElement;
      const charDisplay = cell.querySelector('.cell-char') as HTMLElement;
      const jamoSlots = cell.querySelector('.jamo-slots') as HTMLElement;

      cell.className = 'cell';
      jamoSlots.style.display = 'none';
      cell.style.animationDelay = '';

      if (col < chars.length) {
        charDisplay.style.display = 'flex';
        charDisplay.textContent = chars[col];
        cell.classList.add('filled');
        // Pop animation
        cell.classList.add('pop');
      } else {
        charDisplay.style.display = 'flex';
        charDisplay.textContent = '';
        cell.classList.remove('filled', 'pop');
      }
    }
  }

  private renderEmptyRow(rowEl: Element): void {
    for (let col = 0; col < WORD_LENGTH; col++) {
      const cell = rowEl.querySelector(`.cell[data-col="${col}"]`) as HTMLElement;
      const charDisplay = cell.querySelector('.cell-char') as HTMLElement;
      const jamoSlots = cell.querySelector('.jamo-slots') as HTMLElement;

      cell.className = 'cell';
      cell.style.animationDelay = '';
      charDisplay.style.display = 'flex';
      charDisplay.textContent = '';
      jamoSlots.style.display = 'none';
    }
  }

  private renderKeyboard(): void {
    const { jamoStatuses } = this.game.state;
    const keys = this.keyboardEl.querySelectorAll('.key');
    for (const btn of keys) {
      const key = (btn as HTMLElement).dataset.key;
      if (!key || key === 'ENTER' || key === 'BACK') continue;
      const status = jamoStatuses.get(key);
      (btn as HTMLElement).classList.remove('key-correct', 'key-present', 'key-absent', 'key-misplaced');
      if (status) {
        (btn as HTMLElement).classList.add(`key-${status}`);
      }
    }
  }

  private renderMessage(): void {
    const { message } = this.game.state;
    if (message) {
      this.messageEl.textContent = message;
      this.messageEl.classList.add('show');
    } else {
      this.messageEl.classList.remove('show');
    }
  }

  private showLeaderboard(): void {
    const entries = loadLeaderboard().sort((a, b) => a.avgGuesses - b.avgGuesses).slice(0, 10);
    let myName = '나';
    try { if (sdk) { const u = sdk.auth.getUser(); if (u) myName = u.name; } } catch {}

    const rowsHtml = entries.length > 0
      ? entries.map((e, i) => `
        <tr${e.name === myName ? ' style="background:rgba(255,204,0,0.15);"' : ''}>
          <td style="padding:6px 8px;text-align:center;font-weight:bold;">${i + 1}</td>
          <td style="padding:6px 8px;">${e.name}</td>
          <td style="padding:6px 8px;text-align:center;">${e.avgGuesses.toFixed(2)}</td>
          <td style="padding:6px 8px;text-align:center;">${e.streak}</td>
          <td style="padding:6px 8px;text-align:center;font-size:12px;color:#888;">${new Date(e.timestamp).toLocaleDateString('ko-KR')}</td>
        </tr>
      `).join('')
      : '<tr><td colspan="5" style="padding:20px;text-align:center;color:#888;">아직 기록이 없습니다</td></tr>';

    // Find my rank
    const all = loadLeaderboard().sort((a, b) => a.avgGuesses - b.avgGuesses);
    const myIndex = all.findIndex(e => e.name === myName);
    const myRankHtml = myIndex >= 0
      ? `<div style="margin-top:16px;padding:10px;background:rgba(255,204,0,0.1);border-radius:8px;">
          <strong>내 순위:</strong> ${myIndex + 1}위 | 평균 ${all[myIndex].avgGuesses.toFixed(2)}회 | 연승 ${all[myIndex].streak}
        </div>`
      : '';

    this.showModal(`
      <div class="modal-content" style="max-height:80vh;overflow-y:auto;">
        <h2 style="margin-bottom:12px;">🏆 리더보드</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <thead>
            <tr style="border-bottom:2px solid rgba(255,255,255,0.2);">
              <th style="padding:6px 8px;text-align:center;">순위</th>
              <th style="padding:6px 8px;text-align:left;">이름</th>
              <th style="padding:6px 8px;text-align:center;">평균 추측</th>
              <th style="padding:6px 8px;text-align:center;">연승</th>
              <th style="padding:6px 8px;text-align:center;">날짜</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        ${myRankHtml}
        <button class="modal-close-btn" onclick="this.closest('.modal-overlay').classList.add('hidden')">닫기</button>
      </div>
    `);
  }

  private showHelp(): void {
    this.showModal(`
      <div class="modal-content help-modal">
        <h2>한끝차이 - 한글 단어 퍼즐</h2>
        <p>${WORD_LENGTH}글자 한국어 단어를 6번 안에 맞혀보세요!</p>
        <p>각 추측 후 자모(초성/중성/종성) 단위로 힌트가 주어집니다.</p>

        <div class="help-section">
          <h3>힌트 색상</h3>
          <div class="help-example">
            <span class="jamo-slot correct">ㅎ</span>
            <span class="help-label">정확한 위치의 자모</span>
          </div>
          <div class="help-example">
            <span class="jamo-slot present">ㅏ</span>
            <span class="help-label">포함되지만 다른 위치</span>
          </div>
          <div class="help-example">
            <span class="jamo-slot misplaced">ㄴ</span>
            <span class="help-label">같은 글자 내 다른 위치 (초성↔종성)</span>
          </div>
          <div class="help-example">
            <span class="jamo-slot absent">ㅋ</span>
            <span class="help-label">단어에 없는 자모</span>
          </div>
        </div>

        <div class="help-section">
          <h3>쌍자음 입력</h3>
          <p>ㅃ, ㅉ, ㄸ, ㄲ, ㅆ 등은 아래쪽 키보드 행을 사용하거나<br>해당 키를 길게 누르세요.</p>
        </div>

        <p class="help-footer">매일 새로운 퍼즐이 출제됩니다!</p>
        <button class="modal-close-btn" onclick="this.closest('.modal-overlay').classList.add('hidden')">닫기</button>
      </div>
    `);
  }

  showStats(): void {
    const stats = this.game.getStats();
    const winPct = this.game.getWinPercentage();
    const avgGuesses = this.game.getAverageGuesses();
    const maxDist = Math.max(...stats.guessDistribution, 1);

    const totalGuesses = stats.guessDistribution.reduce((a, b) => a + b, 0);
    const distHtml = stats.guessDistribution.map((count, i) => {
      const width = Math.max((count / maxDist) * 100, count > 0 ? 8 : 0);
      const highlight = this.game.state.won && this.game.state.guesses.length === i + 1;
      const pct = totalGuesses > 0 ? Math.round((count / totalGuesses) * 100) : 0;
      return `
        <div class="dist-row">
          <span class="dist-label">${i + 1}</span>
          <div class="dist-bar-container">
            <div class="dist-bar ${highlight ? 'dist-highlight' : ''}" style="width: ${width}%; animation-delay: ${i * 0.1}s;">
              <span class="dist-count">${count}</span>
              ${totalGuesses > 0 ? `<span class="dist-pct">${pct}%</span>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    const shareButton = this.game.state.gameOver ? `
      <button class="share-btn" id="share-btn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16,6 12,2 8,6"/><line x1="12" y1="2" x2="12" y2="15"/>
        </svg>
        결과 공유하기
      </button>
    ` : '';

    const duelButton = this.game.state.gameOver ? `
      <button class="share-btn duel-btn" id="duel-btn">
        \uD83C\uDD9A 친구 대결
      </button>
    ` : '';

    const streakCelebration = stats.currentStreak > 7 ? `
      <div class="streak-celebration">
        🔥 ${stats.currentStreak}연승 달성! 대단해요! 🔥
      </div>
    ` : '';

    this.showModal(`
      <div class="modal-content stats-modal">
        <h2>통계</h2>
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value">${stats.gamesPlayed}</div>
            <div class="stat-label">게임 수</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${winPct}</div>
            <div class="stat-label">승률 %</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${stats.currentStreak}</div>
            <div class="stat-label">현재 연승</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${stats.maxStreak}</div>
            <div class="stat-label">최대 연승</div>
          </div>
        </div>

        ${streakCelebration}

        <h3>추측 분포</h3>
        <div class="dist-chart">
          ${distHtml}
        </div>

        ${shareButton}
        ${duelButton}
        <button class="modal-close-btn" onclick="this.closest('.modal-overlay').classList.add('hidden')">닫기</button>
      </div>
    `);

    if (this.game.state.gameOver) {
      const shareBtn = document.getElementById('share-btn');
      if (shareBtn) {
        shareBtn.addEventListener('click', () => this.shareResult());
      }
      const duelBtn = document.getElementById('duel-btn');
      if (duelBtn) {
        duelBtn.addEventListener('click', () => this.generateDuelLink());
      }
    }
  }

  private shareResult(): void {
    const text = this.game.getShareText();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        this.showCopyToast();
      }).catch(() => {
        this.fallbackCopy(text);
      });
    } else {
      this.fallbackCopy(text);
    }
  }

  private fallbackCopy(text: string): void {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    this.showCopyToast();
  }

  private showCopyToast(): void {
    this.game.showMessage('클립보드에 복사되었습니다! 📋');
  }

  private showModal(html: string): void {
    this.modalOverlay.innerHTML = html;
    this.modalOverlay.classList.remove('hidden');
  }

  private closeModal(): void {
    this.modalOverlay.classList.add('hidden');
  }

  private generateDuelLink(): void {
    // Generate a random seed for the duel (not date-based)
    const seed = Math.floor(Math.random() * 2147483647);
    const guesses = this.game.state.guesses.length;
    const won = this.game.state.won;
    const timeMs = this.game.getElapsedMs();

    // If the game was a daily game, we use a new random seed so the friend gets a fresh word
    const encoded = encodeDuel(seed, guesses, won, timeMs);
    const url = `${window.location.origin}${window.location.pathname}?duel=${encoded}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        this.game.showMessage('대결 링크가 복사되었습니다!');
      }).catch(() => {
        this.fallbackCopyDuel(url);
      });
    } else {
      this.fallbackCopyDuel(url);
    }
  }

  private fallbackCopyDuel(url: string): void {
    const ta = document.createElement('textarea');
    ta.value = url;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    this.game.showMessage('대결 링크가 복사되었습니다!');
  }

  private showDuelComparison(): void {
    if (!this.pendingDuel) return;

    const opponent = this.pendingDuel;
    const myGuesses = this.game.state.guesses.length;
    const myWon = this.game.state.won;
    const myTimeMs = this.game.getElapsedMs();

    // Determine winner
    let resultText: string;
    let resultEmoji: string;
    if (myWon && !opponent.won) {
      resultEmoji = '\uD83C\uDF89';
      resultText = '승리!';
    } else if (!myWon && opponent.won) {
      resultEmoji = '\uD83D\uDE22';
      resultText = '패배...';
    } else if (!myWon && !opponent.won) {
      resultEmoji = '\uD83E\uDD1D';
      resultText = '무승부';
    } else {
      // Both won - compare guesses first, then time
      if (myGuesses < opponent.guesses) {
        resultEmoji = '\uD83C\uDF89';
        resultText = '승리!';
      } else if (myGuesses > opponent.guesses) {
        resultEmoji = '\uD83D\uDE22';
        resultText = '패배...';
      } else if (myTimeMs < opponent.timeMs) {
        resultEmoji = '\uD83C\uDF89';
        resultText = '승리! (더 빠름)';
      } else if (myTimeMs > opponent.timeMs) {
        resultEmoji = '\uD83D\uDE22';
        resultText = '패배... (더 느림)';
      } else {
        resultEmoji = '\uD83E\uDD1D';
        resultText = '무승부';
      }
    }

    const opponentStatus = opponent.won ? '\u2705 성공' : '\u274C 실패';
    const myStatus = myWon ? '\u2705 성공' : '\u274C 실패';

    this.showModal(`
      <div class="modal-content duel-result-modal">
        <h2>\uD83C\uDD9A 대결 결과</h2>

        <div class="duel-comparison">
          <div class="duel-column">
            <div class="duel-column-title">상대방</div>
            <div class="duel-stat">${opponent.guesses}회 시도</div>
            <div class="duel-stat">${opponentStatus}</div>
            <div class="duel-stat">${formatTime(opponent.timeMs)}</div>
          </div>
          <div class="duel-vs">vs</div>
          <div class="duel-column">
            <div class="duel-column-title">나</div>
            <div class="duel-stat">${myGuesses}회 시도</div>
            <div class="duel-stat">${myStatus}</div>
            <div class="duel-stat">${formatTime(myTimeMs)}</div>
          </div>
        </div>

        <div class="duel-result">
          <span class="duel-result-emoji">${resultEmoji}</span>
          <span class="duel-result-text">${resultText}</span>
        </div>

        <div class="duel-actions">
          <button class="share-btn duel-btn" id="duel-rematch-btn">\uD83D\uDD04 다시 대결</button>
          <button class="share-btn" id="duel-share-btn">\uD83D\uDCE4 공유하기</button>
        </div>

        <button class="modal-close-btn" onclick="this.closest('.modal-overlay').classList.add('hidden')">닫기</button>
      </div>
    `);

    const rematchBtn = document.getElementById('duel-rematch-btn');
    if (rematchBtn) {
      rematchBtn.addEventListener('click', () => this.generateDuelLink());
    }
    const shareBtn = document.getElementById('duel-share-btn');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => this.shareResult());
    }
  }
}

function statusClass(status: JamoStatus): string {
  switch (status) {
    case JamoStatus.Correct: return 'correct';
    case JamoStatus.Present: return 'present';
    case JamoStatus.Absent: return 'absent';
    case JamoStatus.Misplaced: return 'misplaced';
  }
}

// Physical keyboard Korean key mapping (2벌식)
const ROMAN_TO_JAMO: Record<string, string> = {
  'q': 'ㅂ', 'w': 'ㅈ', 'e': 'ㄷ', 'r': 'ㄱ', 't': 'ㅅ',
  'y': 'ㅛ', 'u': 'ㅕ', 'i': 'ㅑ', 'o': 'ㅐ', 'p': 'ㅔ',
  'a': 'ㅁ', 's': 'ㄴ', 'd': 'ㅇ', 'f': 'ㄹ', 'g': 'ㅎ',
  'h': 'ㅗ', 'j': 'ㅓ', 'k': 'ㅏ', 'l': 'ㅣ',
  'z': 'ㅋ', 'x': 'ㅌ', 'c': 'ㅊ', 'v': 'ㅍ',
  'b': 'ㅠ', 'n': 'ㅜ', 'm': 'ㅡ',
  // Shift variants
  'Q': 'ㅃ', 'W': 'ㅉ', 'E': 'ㄸ', 'R': 'ㄲ', 'T': 'ㅆ',
  'O': 'ㅒ', 'P': 'ㅖ',
};

// Direct jamo input (when Korean IME sends jamo directly)
const DIRECT_JAMO = new Set([
  ...CHOSEONG, ...JUNGSEONG,
  'ㅃ', 'ㅉ', 'ㄸ', 'ㄲ', 'ㅆ', 'ㅒ', 'ㅖ',
]);

function physicalKeyToJamo(key: string, shiftKey: boolean): string | null {
  // Direct jamo input
  if (DIRECT_JAMO.has(key)) return key;

  // Roman key mapping
  if (shiftKey) {
    const upper = key.toUpperCase();
    if (ROMAN_TO_JAMO[upper]) return ROMAN_TO_JAMO[upper];
  }
  const lower = key.toLowerCase();
  if (ROMAN_TO_JAMO[lower]) return ROMAN_TO_JAMO[lower];

  return null;
}

// Bootstrap
new UI();
