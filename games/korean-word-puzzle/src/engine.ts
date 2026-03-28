/**
 * Puzzle feedback engine
 * Compares guess against answer and produces per-jamo feedback
 */

import { decomposeWord, type JamoResult } from './jamo';

/** Jamo feedback status */
export enum JamoStatus {
  Correct = 'correct',     // 🟩 exact position
  Present = 'present',     // 🟨 in word but wrong position
  Absent = 'absent',       // ⬜ not in word
  Misplaced = 'misplaced', // 🟪 same syllable, wrong jamo slot
}

/** Feedback for a single syllable */
export interface SyllableFeedback {
  char: string;
  cho: JamoStatus;
  jung: JamoStatus;
  jong: JamoStatus | null; // null if no jongseong in guess
  jamoResult: JamoResult;
}

/** Feedback for a full guess */
export interface GuessFeedback {
  guess: string;
  syllables: SyllableFeedback[];
  isCorrect: boolean;
}

/** Evaluate a guess against the answer */
export function evaluate(guess: string, answer: string): GuessFeedback {
  if (guess.length !== answer.length) {
    throw new Error(`Length mismatch: guess=${guess.length}, answer=${answer.length}`);
  }

  const guessJamo = decomposeWord(guess);
  const answerJamo = decomposeWord(answer);

  // Collect all answer jamo counts for "present" checking
  const allAnswerJamo = new Map<string, number>();
  for (const jamo of answerJamo) {
    for (const j of jamoToList(jamo)) {
      allAnswerJamo.set(j, (allAnswerJamo.get(j) ?? 0) + 1);
    }
  }

  const len = guess.length;
  const choStatuses: (JamoStatus | null)[] = new Array(len).fill(null);
  const jungStatuses: (JamoStatus | null)[] = new Array(len).fill(null);
  const jongStatuses: (JamoStatus | null)[] = new Array(len).fill(null);
  const remaining = new Map(allAnswerJamo);

  // Pass 1: Mark correct positions
  for (let i = 0; i < len; i++) {
    const g = guessJamo[i];
    const a = answerJamo[i];

    if (g.cho === a.cho) {
      choStatuses[i] = JamoStatus.Correct;
      remaining.set(g.cho, (remaining.get(g.cho) ?? 1) - 1);
    }
    if (g.jung === a.jung) {
      jungStatuses[i] = JamoStatus.Correct;
      remaining.set(g.jung, (remaining.get(g.jung) ?? 1) - 1);
    }
    if (g.jong === a.jong) {
      jongStatuses[i] = JamoStatus.Correct;
      if (g.jong !== null) {
        remaining.set(g.jong, (remaining.get(g.jong) ?? 1) - 1);
      }
    }
  }

  // Pass 2: Check misplaced (same syllable, jamo in different slot)
  for (let i = 0; i < len; i++) {
    const g = guessJamo[i];
    const a = answerJamo[i];

    if (choStatuses[i] === null && a.jong !== null && g.cho === a.jong) {
      choStatuses[i] = JamoStatus.Misplaced;
      remaining.set(g.cho, (remaining.get(g.cho) ?? 1) - 1);
    }
    if (jongStatuses[i] === null && g.jong !== null && g.jong === a.cho) {
      jongStatuses[i] = JamoStatus.Misplaced;
      remaining.set(g.jong, (remaining.get(g.jong) ?? 1) - 1);
    }
  }

  // Pass 3: present / absent
  for (let i = 0; i < len; i++) {
    const g = guessJamo[i];

    if (choStatuses[i] === null) {
      if ((remaining.get(g.cho) ?? 0) > 0) {
        choStatuses[i] = JamoStatus.Present;
        remaining.set(g.cho, (remaining.get(g.cho) ?? 1) - 1);
      } else {
        choStatuses[i] = JamoStatus.Absent;
      }
    }

    if (jungStatuses[i] === null) {
      if ((remaining.get(g.jung) ?? 0) > 0) {
        jungStatuses[i] = JamoStatus.Present;
        remaining.set(g.jung, (remaining.get(g.jung) ?? 1) - 1);
      } else {
        jungStatuses[i] = JamoStatus.Absent;
      }
    }

    if (jongStatuses[i] === null && g.jong !== null) {
      if ((remaining.get(g.jong) ?? 0) > 0) {
        jongStatuses[i] = JamoStatus.Present;
        remaining.set(g.jong, (remaining.get(g.jong) ?? 1) - 1);
      } else {
        jongStatuses[i] = JamoStatus.Absent;
      }
    }
  }

  const syllables: SyllableFeedback[] = [];
  for (let i = 0; i < len; i++) {
    syllables.push({
      char: guess[i],
      cho: choStatuses[i]!,
      jung: jungStatuses[i]!,
      jong: guessJamo[i].jong !== null ? jongStatuses[i]! : null,
      jamoResult: guessJamo[i],
    });
  }

  return {
    guess,
    syllables,
    isCorrect: guess === answer,
  };
}

function jamoToList(jamo: JamoResult): string[] {
  const list = [jamo.cho, jamo.jung];
  if (jamo.jong) list.push(jamo.jong);
  return list;
}

/** Convert feedbacks to emoji grid string */
export function toEmojiGrid(feedbacks: GuessFeedback[]): string {
  return feedbacks.map(fb => {
    return fb.syllables.map(s => {
      const cho = statusToEmoji(s.cho);
      const jung = statusToEmoji(s.jung);
      const jong = s.jong !== null ? statusToEmoji(s.jong) : '';
      return `${cho}${jung}${jong}`;
    }).join(' ');
  }).join('\n');
}

function statusToEmoji(status: JamoStatus): string {
  switch (status) {
    case JamoStatus.Correct: return '🟩';
    case JamoStatus.Present: return '🟨';
    case JamoStatus.Absent: return '⬜';
    case JamoStatus.Misplaced: return '🟪';
  }
}

/** Get the best (highest priority) status for a jamo across all feedbacks */
export function getBestStatus(statuses: JamoStatus[]): JamoStatus {
  if (statuses.includes(JamoStatus.Correct)) return JamoStatus.Correct;
  if (statuses.includes(JamoStatus.Misplaced)) return JamoStatus.Misplaced;
  if (statuses.includes(JamoStatus.Present)) return JamoStatus.Present;
  return JamoStatus.Absent;
}
