/**
 * 한글 자모 분리/조합 엔진
 * Unicode-based Hangul initial/medial/final consonant decomposition and composition
 */

const HANGUL_BASE = 0xAC00;
const HANGUL_END = 0xD7A3;
const JUNGSEONG_COUNT = 21;
const JONGSEONG_COUNT = 28;

/** 초성 (Initial consonants) - 19 */
export const CHOSEONG: readonly string[] = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ',
  'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
] as const;

/** 중성 (Medial vowels) - 21 */
export const JUNGSEONG: readonly string[] = [
  'ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ',
  'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ',
] as const;

/** 종성 (Final consonants) - 28 (first is empty = no final consonant) */
export const JONGSEONG: readonly string[] = [
  '', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ',
  'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ',
  'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
] as const;

export interface JamoResult {
  cho: string;   // 초성
  jung: string;  // 중성
  jong: string | null; // 종성 (may be null)
}

/** Check if a character is a composed Hangul syllable */
export function isHangul(char: string): boolean {
  if (char.length === 0) return false;
  const code = char.charCodeAt(0);
  return code >= HANGUL_BASE && code <= HANGUL_END;
}

/** Check if a character is a jamo (consonant or vowel) */
export function isJamo(char: string): boolean {
  return CHOSEONG.includes(char) || JUNGSEONG.includes(char) || JONGSEONG.includes(char);
}

/** Check if a character is a vowel jamo */
export function isVowel(char: string): boolean {
  return JUNGSEONG.includes(char);
}

/** Check if a character is a consonant jamo */
export function isConsonant(char: string): boolean {
  return CHOSEONG.includes(char) || (JONGSEONG.includes(char) && char !== '');
}

/** Decompose a Hangul syllable into initial/medial/final */
export function decompose(char: string): JamoResult {
  if (!isHangul(char)) {
    throw new Error(`Not a Hangul character: ${char}`);
  }
  const code = char.charCodeAt(0) - HANGUL_BASE;
  const cho = Math.floor(code / (JUNGSEONG_COUNT * JONGSEONG_COUNT));
  const jung = Math.floor((code % (JUNGSEONG_COUNT * JONGSEONG_COUNT)) / JONGSEONG_COUNT);
  const jong = code % JONGSEONG_COUNT;
  return {
    cho: CHOSEONG[cho],
    jung: JUNGSEONG[jung],
    jong: jong === 0 ? null : JONGSEONG[jong],
  };
}

/** Compose initial/medial/final jamo into a Hangul syllable */
export function compose(cho: string, jung: string, jong?: string | null): string {
  const choIdx = CHOSEONG.indexOf(cho);
  const jungIdx = JUNGSEONG.indexOf(jung);
  const jongIdx = (!jong || jong === '') ? 0 : JONGSEONG.indexOf(jong);

  if (choIdx === -1 || jungIdx === -1 || jongIdx === -1) {
    throw new Error(`Invalid jamo: cho=${cho}, jung=${jung}, jong=${jong}`);
  }

  const code = HANGUL_BASE +
    (choIdx * JUNGSEONG_COUNT * JONGSEONG_COUNT) +
    (jungIdx * JONGSEONG_COUNT) +
    jongIdx;
  return String.fromCharCode(code);
}

/** Decompose a word into an array of JamoResults */
export function decomposeWord(word: string): JamoResult[] {
  return [...word].map(c => decompose(c));
}

/** Get all jamo from a word as a flat array */
export function flatJamo(word: string): string[] {
  const result: string[] = [];
  for (const c of word) {
    const jamo = decompose(c);
    result.push(jamo.cho, jamo.jung);
    if (jamo.jong) result.push(jamo.jong);
  }
  return result;
}

/** Jamo-to-index mapping for the choseong that also appear as jongseong */
const CHOSEONG_TO_JONGSEONG: Record<string, string> = {
  'ㄱ': 'ㄱ', 'ㄲ': 'ㄲ', 'ㄴ': 'ㄴ', 'ㄷ': 'ㄷ', 'ㄹ': 'ㄹ',
  'ㅁ': 'ㅁ', 'ㅂ': 'ㅂ', 'ㅅ': 'ㅅ', 'ㅆ': 'ㅆ', 'ㅇ': 'ㅇ',
  'ㅈ': 'ㅈ', 'ㅊ': 'ㅊ', 'ㅋ': 'ㅋ', 'ㅌ': 'ㅌ', 'ㅍ': 'ㅍ', 'ㅎ': 'ㅎ',
};

/** Convert a choseong to its jongseong equivalent, or null if not possible */
export function choseongToJongseong(cho: string): string | null {
  return CHOSEONG_TO_JONGSEONG[cho] ?? null;
}

/**
 * Hangul input composition engine.
 * Takes a sequence of jamo keypresses and composes them into Hangul syllables.
 */
export interface CompositionState {
  committed: string;   // Fully committed syllables
  composing: string;   // Currently composing syllable (displayed as combined)
  raw: string[];       // Raw jamo sequence for current composing char
}

// Compound vowel composition table
const COMPOUND_VOWELS: Record<string, Record<string, string>> = {
  'ㅗ': { 'ㅏ': 'ㅘ', 'ㅐ': 'ㅙ', 'ㅣ': 'ㅚ' },
  'ㅜ': { 'ㅓ': 'ㅝ', 'ㅔ': 'ㅞ', 'ㅣ': 'ㅟ' },
  'ㅡ': { 'ㅣ': 'ㅢ' },
};

// Compound jongseong composition table
const COMPOUND_JONGSEONG: Record<string, Record<string, string>> = {
  'ㄱ': { 'ㅅ': 'ㄳ' },
  'ㄴ': { 'ㅈ': 'ㄵ', 'ㅎ': 'ㄶ' },
  'ㄹ': { 'ㄱ': 'ㄺ', 'ㅁ': 'ㄻ', 'ㅂ': 'ㄼ', 'ㅅ': 'ㄽ', 'ㅌ': 'ㄾ', 'ㅍ': 'ㄿ', 'ㅎ': 'ㅀ' },
  'ㅂ': { 'ㅅ': 'ㅄ' },
};

// Decompose compound jongseong back into two consonants
const COMPOUND_JONGSEONG_DECOMPOSE: Record<string, [string, string]> = {
  'ㄳ': ['ㄱ', 'ㅅ'],
  'ㄵ': ['ㄴ', 'ㅈ'],
  'ㄶ': ['ㄴ', 'ㅎ'],
  'ㄺ': ['ㄹ', 'ㄱ'],
  'ㄻ': ['ㄹ', 'ㅁ'],
  'ㄼ': ['ㄹ', 'ㅂ'],
  'ㄽ': ['ㄹ', 'ㅅ'],
  'ㄾ': ['ㄹ', 'ㅌ'],
  'ㄿ': ['ㄹ', 'ㅍ'],
  'ㅀ': ['ㄹ', 'ㅎ'],
  'ㅄ': ['ㅂ', 'ㅅ'],
};

export class HangulComposer {
  private cho: string | null = null;
  private jung: string | null = null;
  private jong: string | null = null;
  private committed: string = '';

  /** Get the current composition state */
  getState(): CompositionState {
    let composing = '';
    const raw: string[] = [];

    if (this.cho !== null) {
      raw.push(this.cho);
      if (this.jung !== null) {
        raw.push(this.jung);
        if (this.jong !== null) {
          raw.push(this.jong);
          composing = compose(this.cho, this.jung, this.jong);
        } else {
          composing = compose(this.cho, this.jung);
        }
      } else {
        composing = this.cho;
      }
    }

    return { committed: this.committed, composing, raw };
  }

  /** Get the full display text */
  getText(): string {
    const state = this.getState();
    return state.committed + state.composing;
  }

  /** Reset composition state */
  reset(): void {
    this.cho = null;
    this.jung = null;
    this.jong = null;
    this.committed = '';
  }

  /** Commit current composing character and reset */
  private commitCurrent(): void {
    const state = this.getState();
    if (state.composing) {
      this.committed += state.composing;
    }
    this.cho = null;
    this.jung = null;
    this.jong = null;
  }

  /** Handle backspace */
  backspace(): void {
    if (this.jong !== null) {
      // If compound jongseong, decompose and keep the first part
      if (COMPOUND_JONGSEONG_DECOMPOSE[this.jong]) {
        this.jong = COMPOUND_JONGSEONG_DECOMPOSE[this.jong][0];
      } else {
        this.jong = null;
      }
    } else if (this.jung !== null) {
      // Check if it's a compound vowel - try to decompose
      let found = false;
      for (const base of Object.keys(COMPOUND_VOWELS)) {
        for (const added of Object.keys(COMPOUND_VOWELS[base])) {
          if (COMPOUND_VOWELS[base][added] === this.jung) {
            this.jung = base;
            found = true;
            break;
          }
        }
        if (found) break;
      }
      if (!found) {
        this.jung = null;
      }
    } else if (this.cho !== null) {
      this.cho = null;
    } else if (this.committed.length > 0) {
      // Remove last committed character and decompose it back
      const lastChar = this.committed[this.committed.length - 1];
      this.committed = this.committed.slice(0, -1);
      if (isHangul(lastChar)) {
        const jamo = decompose(lastChar);
        this.cho = jamo.cho;
        this.jung = jamo.jung;
        this.jong = jamo.jong;
      }
    }
  }

  /** Input a jamo key */
  input(jamo: string): void {
    const vowel = isVowel(jamo);

    if (this.cho === null) {
      // Nothing composed yet
      if (vowel) {
        // Vowel without initial consonant: just treat ㅇ as implicit? No, display raw vowel
        // Actually in Korean, standalone vowels are possible but rare. Commit as-is.
        this.committed += jamo;
      } else {
        this.cho = jamo;
      }
      return;
    }

    if (this.jung === null) {
      // Have initial consonant only
      if (vowel) {
        this.jung = jamo;
      } else {
        // Another consonant: commit current cho, start new
        this.commitCurrent();
        this.cho = jamo;
      }
      return;
    }

    if (this.jong === null) {
      // Have cho + jung
      if (vowel) {
        // Try compound vowel
        if (COMPOUND_VOWELS[this.jung] && COMPOUND_VOWELS[this.jung][jamo]) {
          this.jung = COMPOUND_VOWELS[this.jung][jamo];
        } else {
          // Commit current, start fresh with this vowel
          this.commitCurrent();
          this.committed += jamo;
        }
      } else {
        // Consonant after cho+jung: becomes jongseong if valid
        const asJong = choseongToJongseong(jamo);
        if (asJong && JONGSEONG.includes(asJong)) {
          this.jong = asJong;
        } else {
          this.commitCurrent();
          this.cho = jamo;
        }
      }
      return;
    }

    // Have cho + jung + jong
    if (vowel) {
      // Vowel after full syllable: jongseong becomes next choseong
      if (COMPOUND_JONGSEONG_DECOMPOSE[this.jong]) {
        // Compound jongseong: split, keep first as jong, second becomes next cho
        const [first, second] = COMPOUND_JONGSEONG_DECOMPOSE[this.jong];
        this.jong = first;
        this.commitCurrent();
        this.cho = second;
        this.jung = jamo;
      } else {
        const prevJong = this.jong;
        this.jong = null;
        this.commitCurrent();
        this.cho = prevJong;
        this.jung = jamo;
      }
    } else {
      // Another consonant after full syllable
      const asJong = choseongToJongseong(jamo);
      if (asJong && COMPOUND_JONGSEONG[this.jong] && COMPOUND_JONGSEONG[this.jong][asJong]) {
        // Can form compound jongseong
        this.jong = COMPOUND_JONGSEONG[this.jong][asJong];
      } else {
        // Commit and start new syllable
        this.commitCurrent();
        this.cho = jamo;
      }
    }
  }
}
