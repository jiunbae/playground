/**
 * Main game state management
 */

import { HangulComposer } from './jamo';
import { evaluate, toEmojiGrid, JamoStatus, getBestStatus, type GuessFeedback, type SyllableFeedback } from './engine';
import { getDailyWord, getPuzzleNumber, isValidWord, WORD_LENGTH } from './words';
import { loadStats, recordWin, recordLoss, loadGameState, saveGameState, getWinPercentage, getAverageGuesses, type GameStats, type SavedGameState } from './stats';

const MAX_GUESSES = 6;

export interface GameState {
  answer: string;
  puzzleNumber: number;
  guesses: GuessFeedback[];
  currentInput: string;
  composingDisplay: string;
  gameOver: boolean;
  won: boolean;
  message: string | null;
  messageTimeout: number | null;
  jamoStatuses: Map<string, JamoStatus>;
}

export class Game {
  state: GameState;
  private composer: HangulComposer;
  private onUpdate: () => void;

  constructor(onUpdate: () => void) {
    this.onUpdate = onUpdate;
    this.composer = new HangulComposer();

    const today = new Date();
    const puzzleNumber = getPuzzleNumber(today);
    const answer = getDailyWord(today);

    this.state = {
      answer,
      puzzleNumber,
      guesses: [],
      currentInput: '',
      composingDisplay: '',
      gameOver: false,
      won: false,
      message: null,
      messageTimeout: null,
      jamoStatuses: new Map(),
    };

    // Try to restore saved state
    const saved = loadGameState();
    if (saved && saved.puzzleNumber === puzzleNumber) {
      // Replay saved guesses
      for (const guessWord of saved.guesses) {
        const feedback = evaluate(guessWord, answer);
        this.state.guesses.push(feedback);
        this.updateJamoStatuses(feedback);
      }
      if (saved.completed) {
        this.state.gameOver = true;
        this.state.won = saved.won;
      }
    }
  }

  private updateJamoStatuses(feedback: GuessFeedback): void {
    for (const syl of feedback.syllables) {
      const jamo = syl.jamoResult;
      // For each jamo, keep the best status seen
      this.updateJamoStatus(jamo.cho, syl.cho);
      this.updateJamoStatus(jamo.jung, syl.jung);
      if (jamo.jong && syl.jong !== null) {
        this.updateJamoStatus(jamo.jong, syl.jong);
      }
    }
  }

  private updateJamoStatus(jamo: string, status: JamoStatus): void {
    const existing = this.state.jamoStatuses.get(jamo);
    if (existing === undefined) {
      this.state.jamoStatuses.set(jamo, status);
    } else {
      this.state.jamoStatuses.set(jamo, getBestStatus([existing, status]));
    }
  }

  inputJamo(jamo: string): void {
    if (this.state.gameOver) return;

    const currentText = this.composer.getText();
    if (currentText.length >= WORD_LENGTH) {
      // Check if composing would extend beyond limit
      const testComposer = new HangulComposer();
      // Replay current state
      this.composer.input(jamo);
      const newText = this.composer.getText();
      if (newText.length > WORD_LENGTH) {
        // Undo
        this.composer.backspace();
        // Re-input to restore
        return;
      }
    } else {
      this.composer.input(jamo);
    }

    this.syncInput();
    this.onUpdate();
  }

  backspace(): void {
    if (this.state.gameOver) return;
    this.composer.backspace();
    this.syncInput();
    this.onUpdate();
  }

  submit(): void {
    if (this.state.gameOver) return;

    const composerState = this.composer.getState();
    const word = composerState.committed + composerState.composing;

    if (word.length !== WORD_LENGTH) {
      this.showMessage('글자를 모두 입력하세요');
      return;
    }

    // Force-commit any composing state
    if (composerState.composing) {
      // The word is already complete
    }

    if (!isValidWord(word)) {
      this.showMessage('단어 목록에 없는 단어입니다');
      this.shakeCurrentRow();
      return;
    }

    const feedback = evaluate(word, this.state.answer);
    this.state.guesses.push(feedback);
    this.updateJamoStatuses(feedback);

    // Reset composer
    this.composer.reset();
    this.syncInput();

    if (feedback.isCorrect) {
      this.state.gameOver = true;
      this.state.won = true;
      recordWin(this.state.guesses.length);
      saveGameState({
        puzzleNumber: this.state.puzzleNumber,
        guesses: this.state.guesses.map(g => g.guess),
        completed: true,
        won: true,
      });
      setTimeout(() => {
        this.showMessage(this.getWinMessage());
        this.onUpdate();
      }, 1500);
    } else if (this.state.guesses.length >= MAX_GUESSES) {
      this.state.gameOver = true;
      this.state.won = false;
      recordLoss();
      saveGameState({
        puzzleNumber: this.state.puzzleNumber,
        guesses: this.state.guesses.map(g => g.guess),
        completed: true,
        won: false,
      });
      setTimeout(() => {
        this.showMessage(`정답: ${this.state.answer}`);
        this.onUpdate();
      }, 1500);
    } else {
      saveGameState({
        puzzleNumber: this.state.puzzleNumber,
        guesses: this.state.guesses.map(g => g.guess),
        completed: false,
        won: false,
      });
    }

    this.onUpdate();
  }

  private syncInput(): void {
    const composerState = this.composer.getState();
    this.state.currentInput = composerState.committed + composerState.composing;
    this.state.composingDisplay = composerState.composing;
  }

  private getWinMessage(): string {
    const count = this.state.guesses.length;
    const messages = ['천재!', '대단해요!', '훌륭해요!', '잘했어요!', '아슬아슬!', '겨우 성공!'];
    return messages[Math.min(count - 1, 5)];
  }

  showMessage(msg: string, duration: number = 2000): void {
    if (this.state.messageTimeout !== null) {
      clearTimeout(this.state.messageTimeout);
    }
    this.state.message = msg;
    this.state.messageTimeout = window.setTimeout(() => {
      this.state.message = null;
      this.state.messageTimeout = null;
      this.onUpdate();
    }, duration);
    this.onUpdate();
  }

  private shakeCurrentRow(): void {
    const rowIndex = this.state.guesses.length;
    const row = document.querySelector(`.board-row[data-row="${rowIndex}"]`);
    if (row) {
      row.classList.add('shake');
      setTimeout(() => row.classList.remove('shake'), 600);
    }
  }

  getShareText(): string {
    const header = `한끝차이 #${this.state.puzzleNumber} ${this.state.won ? this.state.guesses.length : 'X'}/${MAX_GUESSES}`;
    const grid = toEmojiGrid(this.state.guesses);
    return `${header}\n\n${grid}`;
  }

  getStats(): GameStats {
    return loadStats();
  }

  getWinPercentage(): number {
    return getWinPercentage(this.getStats());
  }

  getAverageGuesses(): string {
    return getAverageGuesses(this.getStats());
  }

  get maxGuesses(): number {
    return MAX_GUESSES;
  }
}
