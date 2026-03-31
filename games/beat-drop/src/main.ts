// ============================================================
// Beat Drop (비트 드롭) - Web Rhythm Game
// ============================================================

import { PlaygroundSDK } from '@playground/sdk';

// --- SDK Init ---
let sdk: PlaygroundSDK | null = null;
try {
  sdk = PlaygroundSDK.init({ apiUrl: 'https://api.jiun.dev', game: 'beat-drop' });
} catch { /* SDK init failed, continue offline */ }

let sdkScoreSubmitted = false;

async function handleSdkLogin(): Promise<void> {
  if (!sdk) return;
  try {
    const user = await sdk.auth.loginIfAvailable();
    sdkLoggedIn = !!user;
  } catch { /* login failed */ }
}

let sdkLoggedIn = false;
try {
  if (sdk) sdkLoggedIn = !!sdk.auth.getUser();
} catch { /* ignore */ }

// --- Leaderboard ---

const LEADERBOARD_KEY = 'playground_beat-drop_leaderboard';
const LEADERBOARD_MAX = 50;

interface LeaderboardRecord {
  name: string;
  score: number;
  grade: string;
  song: string;
  timestamp: number;
}

function loadBeatDropLeaderboard(): LeaderboardRecord[] {
  try {
    const data = localStorage.getItem(LEADERBOARD_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

function saveToBeatDropLeaderboard(entry: LeaderboardRecord): void {
  const entries = loadBeatDropLeaderboard();
  entries.push(entry);
  entries.sort((a, b) => b.score - a.score);
  if (entries.length > LEADERBOARD_MAX) entries.length = LEADERBOARD_MAX;
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries));
}

let leaderboardOverlay: HTMLDivElement | null = null;

function showBeatDropLeaderboard(): void {
  if (leaderboardOverlay) return;

  const songNames = SONGS.map(s => s.name);
  let currentTab = 'all';

  function renderOverlay() {
    const all = loadBeatDropLeaderboard();
    const filtered = currentTab === 'all' ? all : all.filter(e => e.song === currentTab);
    const top10 = filtered.sort((a, b) => b.score - a.score).slice(0, 10);

    let myName = '나';
    try { if (sdk) { const u = sdk.auth.getUser(); if (u) myName = u.name; } } catch {}
    const myIdx = filtered.findIndex(e => e.name === myName);

    const tabsHtml = ['all', ...songNames].map(t => {
      const label = t === 'all' ? '전체' : t;
      const active = t === currentTab ? 'background:rgba(255,51,102,0.6);' : 'background:rgba(255,255,255,0.1);';
      return `<button class="lb-tab" data-tab="${t}" style="padding:6px 12px;border:none;border-radius:6px;color:#fff;font-size:12px;cursor:pointer;${active}">${label}</button>`;
    }).join('');

    const rowsHtml = top10.length > 0
      ? top10.map((e, i) => `
        <tr style="${e.name === myName ? 'background:rgba(255,204,0,0.15);' : ''}">
          <td style="padding:6px 8px;text-align:center;font-weight:bold;">${i + 1}</td>
          <td style="padding:6px 8px;">${e.name}</td>
          <td style="padding:6px 8px;text-align:center;">${e.score.toLocaleString()}</td>
          <td style="padding:6px 8px;text-align:center;">${e.grade}</td>
          <td style="padding:6px 8px;text-align:center;font-size:11px;">${e.song}</td>
          <td style="padding:6px 8px;text-align:center;font-size:11px;color:#888;">${new Date(e.timestamp).toLocaleDateString('ko-KR')}</td>
        </tr>`).join('')
      : '<tr><td colspan="6" style="padding:20px;text-align:center;color:#888;">아직 기록이 없습니다</td></tr>';

    const myRankHtml = myIdx >= 0
      ? `<div style="margin-top:12px;padding:8px;background:rgba(255,204,0,0.1);border-radius:8px;font-size:13px;"><strong>내 순위:</strong> ${myIdx + 1}위 | ${filtered[myIdx].score.toLocaleString()}점</div>`
      : '';

    leaderboardOverlay!.innerHTML = `
      <div style="position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;z-index:1000;">
        <div style="background:#1a1a2e;border:1px solid rgba(255,51,102,0.4);border-radius:16px;padding:24px;max-width:500px;width:90%;max-height:80vh;overflow-y:auto;color:#fff;font-family:'Segoe UI',sans-serif;">
          <h2 style="margin:0 0 12px;text-align:center;">🏆 리더보드</h2>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;">${tabsHtml}</div>
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead><tr style="border-bottom:2px solid rgba(255,255,255,0.2);">
              <th style="padding:6px 8px;">순위</th><th style="padding:6px 8px;text-align:left;">이름</th>
              <th style="padding:6px 8px;">점수</th><th style="padding:6px 8px;">등급</th>
              <th style="padding:6px 8px;">곡</th><th style="padding:6px 8px;">날짜</th>
            </tr></thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          ${myRankHtml}
          <button id="lb-close" style="display:block;margin:16px auto 0;padding:10px 32px;border:none;border-radius:8px;background:#ff3366;color:#fff;font-size:16px;cursor:pointer;">닫기</button>
        </div>
      </div>`;

    leaderboardOverlay!.querySelector('#lb-close')!.addEventListener('click', closeBeatDropLeaderboard);
    leaderboardOverlay!.querySelectorAll('.lb-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        currentTab = (btn as HTMLElement).dataset.tab || 'all';
        renderOverlay();
      });
    });
  }

  leaderboardOverlay = document.createElement('div');
  leaderboardOverlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:1000;';
  document.body.appendChild(leaderboardOverlay);
  renderOverlay();
}

function closeBeatDropLeaderboard(): void {
  if (leaderboardOverlay) {
    leaderboardOverlay.remove();
    leaderboardOverlay = null;
  }
}

// --- Types ---

type Difficulty = 'Easy' | 'Normal' | 'Hard';
type Grade = 'S' | 'A' | 'B' | 'C';
type Judgment = 'Perfect' | 'Great' | 'Good' | 'Miss';
type Scene = 'menu' | 'songSelect' | 'countdown' | 'playing' | 'results';

interface Note {
  lane: number;       // 0-3
  time: number;       // hit time in seconds
  hit: boolean;
  judgment: Judgment | null;
  y: number;          // current y position for rendering
}

interface Song {
  name: string;
  artist: string;
  bpm: number;
  color: string;       // theme color
  oscillatorType: OscillatorType;
  pattern: number[];   // melody pattern (semitone offsets)
  bassPattern: number[];
  duration: number;    // seconds
}

interface GameState {
  scene: Scene;
  selectedSong: number;
  difficulty: Difficulty;
  score: number;
  combo: number;
  maxCombo: number;
  judgments: Record<Judgment, number>;
  notes: Note[];
  currentTime: number;
  songStartTime: number;
  isPlaying: boolean;
  life: number;
  laneFlash: number[];       // flash intensity per lane
  bgPulse: number;           // background pulse intensity
  lastJudgment: Judgment | null;
  lastJudgmentTime: number;
  particles: Particle[];
  bgStars: BgStar[];
  hitRings: HitRing[];
  grade: Grade;
  countdownValue: number;
  countdownStartTime: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

interface BgStar {
  x: number;
  y: number;
  speed: number;
  size: number;
  alpha: number;
}

interface HitRing {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  color: string;
}

// Lane colors for per-lane note tinting
const LANE_COLORS = ['#ff3366', '#33ccff', '#66ff66', '#ffcc33'];

interface Button {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  action: () => void;
  color?: string;
}

// --- Constants ---

const LANE_COUNT = 4;
const LANE_KEYS = ['d', 'f', 'j', 'k'];
const NOTE_SPEED_BASE = 600; // pixels per second at Normal
const HIT_LINE_OFFSET = 0.85; // fraction from top where hit line is
const PERFECT_WINDOW = 0.045;  // seconds
const GREAT_WINDOW = 0.09;
const GOOD_WINDOW = 0.14;
const MISS_WINDOW = 0.2;
const NOTE_HEIGHT = 20;
const NOTE_RADIUS = 10;

const DIFFICULTY_MULTIPLIERS: Record<Difficulty, { speed: number; density: number; window: number }> = {
  Easy:   { speed: 0.7,  density: 0.5, window: 1.4 },
  Normal: { speed: 1.0,  density: 1.0, window: 1.0 },
  Hard:   { speed: 1.3,  density: 1.5, window: 0.7 },
};

const SCORE_VALUES: Record<Judgment, number> = {
  Perfect: 300,
  Great: 200,
  Good: 100,
  Miss: 0,
};

// --- Songs ---

const SONGS: Song[] = [
  {
    name: 'Neon Pulse',
    artist: 'Beat Drop',
    bpm: 128,
    color: '#ff3366',
    oscillatorType: 'square',
    pattern: [0, 0, 3, 5, 7, 5, 3, 0, -2, 0, 3, 7, 10, 7, 5, 3],
    bassPattern: [0, 0, -12, -12, -7, -7, -5, -5],
    duration: 45,
  },
  {
    name: 'Midnight Drive',
    artist: 'Beat Drop',
    bpm: 100,
    color: '#3366ff',
    oscillatorType: 'triangle',
    pattern: [0, 4, 7, 12, 11, 7, 4, 0, -1, 4, 7, 11, 12, 16, 12, 7],
    bassPattern: [0, 0, -5, -5, -7, -7, -3, -3],
    duration: 50,
  },
  {
    name: 'Solar Flare',
    artist: 'Beat Drop',
    bpm: 150,
    color: '#ff9900',
    oscillatorType: 'sawtooth',
    pattern: [0, 3, 7, 10, 12, 10, 7, 3, 0, 5, 8, 12, 15, 12, 8, 5],
    bassPattern: [0, -12, -7, -12, -5, -12, -3, -12],
    duration: 40,
  },
];

// --- Canvas Setup ---

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
let W = 0;
let H = 0;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

// --- Audio ---

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let activeSources: { stop: () => void }[] = [];

function initAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.3;
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function stopAllAudio() {
  for (const s of activeSources) {
    try { s.stop(); } catch (_) { /* ignore */ }
  }
  activeSources = [];
}

function playHitSound(judgment: Judgment) {
  if (!audioCtx || !masterGain) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(masterGain);

  if (judgment === 'Perfect') {
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.value = 0.15;
  } else if (judgment === 'Great') {
    osc.frequency.value = 660;
    osc.type = 'sine';
    gain.gain.value = 0.12;
  } else {
    osc.frequency.value = 440;
    osc.type = 'sine';
    gain.gain.value = 0.08;
  }

  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.1);
}

function playSong(song: Song): void {
  if (!audioCtx || !masterGain) return;
  stopAllAudio();

  const beatDuration = 60 / song.bpm;
  const baseFreq = 261.63; // C4

  // Melody
  for (let i = 0; i < song.duration / (beatDuration * 0.5); i++) {
    const noteIndex = i % song.pattern.length;
    const semitone = song.pattern[noteIndex];
    const freq = baseFreq * Math.pow(2, semitone / 12);
    const startTime = audioCtx.currentTime + i * beatDuration * 0.5;

    if (startTime > audioCtx.currentTime + song.duration) break;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = song.oscillatorType;
    osc.frequency.value = freq;
    gain.gain.value = 0.08;
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + beatDuration * 0.45);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(startTime);
    osc.stop(startTime + beatDuration * 0.5);
    activeSources.push(osc);
  }

  // Bass
  for (let i = 0; i < song.duration / beatDuration; i++) {
    const noteIndex = i % song.bassPattern.length;
    const semitone = song.bassPattern[noteIndex];
    const freq = (baseFreq / 2) * Math.pow(2, semitone / 12);
    const startTime = audioCtx.currentTime + i * beatDuration;

    if (startTime > audioCtx.currentTime + song.duration) break;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.value = 0.12;
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + beatDuration * 0.9);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(startTime);
    osc.stop(startTime + beatDuration);
    activeSources.push(osc);
  }

  // Kick drum (on beats)
  for (let i = 0; i < song.duration / beatDuration; i++) {
    const startTime = audioCtx.currentTime + i * beatDuration;
    if (startTime > audioCtx.currentTime + song.duration) break;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, startTime);
    osc.frequency.exponentialRampToValueAtTime(30, startTime + 0.08);
    gain.gain.setValueAtTime(0.25, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(startTime);
    osc.stop(startTime + 0.15);
    activeSources.push(osc);
  }

  // Hi-hat (off-beats)
  for (let i = 0; i < song.duration / (beatDuration * 0.5); i++) {
    if (i % 2 === 0) continue; // only off-beats
    const startTime = audioCtx.currentTime + i * beatDuration * 0.5;
    if (startTime > audioCtx.currentTime + song.duration) break;

    // White noise burst via oscillator trick
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.value = 6000 + Math.random() * 2000;
    gain.gain.setValueAtTime(0.04, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.04);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(startTime);
    osc.stop(startTime + 0.05);
    activeSources.push(osc);
  }
}

// --- Chart Generation ---

function generateChart(song: Song, difficulty: Difficulty): Note[] {
  const notes: Note[] = [];
  const beatDuration = 60 / song.bpm;
  const mult = DIFFICULTY_MULTIPLIERS[difficulty];
  const totalBeats = Math.floor(song.duration / beatDuration);

  // Seed-based pseudo-random for consistency
  let seed = song.bpm * 1000 + song.pattern[0] * 100 + (difficulty === 'Easy' ? 1 : difficulty === 'Normal' ? 2 : 3);
  function seededRandom() {
    seed = (seed * 16807 + 0) % 2147483647;
    return (seed & 0x7fffffff) / 0x7fffffff;
  }

  // Determine note positions
  // Easy: notes on every beat, ~50%
  // Normal: notes on every beat
  // Hard: notes on beats and half-beats
  const subdivision = difficulty === 'Hard' ? 0.5 : 1;
  const steps = Math.floor(song.duration / (beatDuration * subdivision));
  const skipChance = difficulty === 'Easy' ? 0.5 : difficulty === 'Normal' ? 0.2 : 0.1;

  // "Drop" section: middle 30% of song has higher density
  const dropStart = song.duration * 0.4;
  const dropEnd = song.duration * 0.7;

  for (let i = 0; i < steps; i++) {
    const time = 2 + i * beatDuration * subdivision; // 2 second lead-in
    if (time > song.duration - 1) break;

    const inDrop = time >= dropStart && time <= dropEnd;
    const skip = inDrop ? skipChance * 0.3 : skipChance;

    if (seededRandom() < skip) continue;

    // Choose lane based on melody pattern
    const patternIdx = i % song.pattern.length;
    const semitone = song.pattern[patternIdx];
    let lane = Math.abs(semitone) % LANE_COUNT;

    // Add some variation
    if (seededRandom() > 0.7) {
      lane = Math.floor(seededRandom() * LANE_COUNT);
    }

    notes.push({
      lane,
      time,
      hit: false,
      judgment: null,
      y: 0,
    });

    // In drop sections on Hard, add simultaneous notes
    if (inDrop && difficulty === 'Hard' && seededRandom() > 0.6) {
      let lane2 = (lane + 1 + Math.floor(seededRandom() * 3)) % LANE_COUNT;
      notes.push({
        lane: lane2,
        time,
        hit: false,
        judgment: null,
        y: 0,
      });
    }
  }

  notes.sort((a, b) => a.time - b.time);
  return notes;
}

// --- Game State ---

const state: GameState = {
  scene: 'menu',
  selectedSong: 0,
  difficulty: 'Normal',
  score: 0,
  combo: 0,
  maxCombo: 0,
  judgments: { Perfect: 0, Great: 0, Good: 0, Miss: 0 },
  notes: [],
  currentTime: 0,
  songStartTime: 0,
  isPlaying: false,
  life: 100,
  laneFlash: [0, 0, 0, 0],
  bgPulse: 0,
  lastJudgment: null,
  lastJudgmentTime: 0,
  particles: [],
  bgStars: [],
  hitRings: [],
  grade: 'C',
  countdownValue: 3,
  countdownStartTime: 0,
};

// --- UI Buttons ---

let currentButtons: Button[] = [];

function makeButton(x: number, y: number, w: number, h: number, label: string, action: () => void, color?: string): Button {
  return { x, y, w, h, label, action, color };
}

function drawButton(btn: Button) {
  const color = btn.color || '#333355';
  ctx.fillStyle = color;
  ctx.beginPath();
  const r = 12;
  ctx.roundRect(btn.x, btn.y, btn.w, btn.h, r);
  ctx.fill();

  // Border
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(btn.x, btn.y, btn.w, btn.h, r);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.min(btn.h * 0.4, 20)}px 'Segoe UI', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);
}

function checkButtonClick(x: number, y: number) {
  for (const btn of currentButtons) {
    if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
      btn.action();
      return true;
    }
  }
  return false;
}

// --- Scene: Menu ---

function drawMenu() {
  currentButtons = [];

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#0a0a1a');
  grad.addColorStop(1, '#1a0a2a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Animated background circles
  const time = Date.now() / 1000;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    const cx = W * (0.2 + 0.15 * i);
    const cy = H * 0.5 + Math.sin(time + i) * 50;
    const radius = 50 + Math.sin(time * 0.7 + i * 1.5) * 20;
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(100, 50, 200, ${0.05 + 0.02 * Math.sin(time + i)})`;
    ctx.fill();
  }

  // Title
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.min(W * 0.12, 64)}px 'Segoe UI', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Glow effect
  ctx.shadowColor = '#ff3366';
  ctx.shadowBlur = 30;
  ctx.fillText('BEAT DROP', W / 2, H * 0.25);
  ctx.shadowBlur = 0;

  // Subtitle
  ctx.fillStyle = '#aaaacc';
  ctx.font = `${Math.min(W * 0.04, 20)}px 'Segoe UI', sans-serif`;
  ctx.fillText('비트 드롭 - 리듬 액션 게임', W / 2, H * 0.33);

  // Play button
  const btnW = Math.min(W * 0.6, 280);
  const btnH = 56;
  const btnX = W / 2 - btnW / 2;

  const playBtn = makeButton(btnX, H * 0.50, btnW, btnH, '시작', () => {
    state.scene = 'songSelect';
  }, '#ff3366');
  currentButtons.push(playBtn);
  drawButton(playBtn);

  // Controls info / onboarding
  ctx.fillStyle = '#8888aa';
  ctx.font = `${Math.min(W * 0.032, 14)}px 'Segoe UI', sans-serif`;
  ctx.textAlign = 'center';
  const helpY = H * 0.65;
  ctx.fillText('키보드: D  F  J  K  |  터치: 화면 4분할 탭', W / 2, helpY);
  ctx.fillStyle = '#666688';
  ctx.font = `${Math.min(W * 0.028, 13)}px 'Segoe UI', sans-serif`;
  ctx.fillText('떨어지는 노트가 판정선에 닿을 때 해당 레인을 누르세요', W / 2, helpY + 22);

  // Version
  ctx.fillStyle = '#333355';
  ctx.font = `12px 'Segoe UI', sans-serif`;
  ctx.fillText('v1.0 - 웹 오디오 리듬 게임', W / 2, H * 0.95);

  // Leaderboard button
  const lbBtn = makeButton(W / 2 - btnW / 2, H * 0.57, btnW, btnH, '\u{1F3C6} 리더보드', () => {
    showBeatDropLeaderboard();
  }, '#222244');
  currentButtons.push(lbBtn);
  drawButton(lbBtn);

  // Login button (top-right)
  const loginBtn = makeButton(W - 52, 8, 44, 36, sdkLoggedIn ? '\u{1F464}' : '\u{1F512}', () => {
    handleSdkLogin();
  });
  loginBtn.color = 'rgba(255,255,255,0.1)';
  currentButtons.push(loginBtn);
  drawButton(loginBtn);
}

// --- Scene: Song Select ---

function drawSongSelect() {
  currentButtons = [];

  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#0a0a1a');
  grad.addColorStop(1, '#0a1a2a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Title
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.min(W * 0.07, 32)}px 'Segoe UI', sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('곡 선택', W / 2, H * 0.08);

  // Song cards
  const cardW = Math.min(W * 0.85, 400);
  const cardH = 80;
  const startY = H * 0.14;

  const time = Date.now() / 1000;
  SONGS.forEach((song, i) => {
    const y = startY + i * (cardH + 16);
    const isSelected = state.selectedSong === i;
    const color = isSelected ? song.color : '#222244';
    const cx = W / 2 - cardW / 2;

    ctx.fillStyle = color;
    ctx.globalAlpha = isSelected ? 1 : 0.6;
    ctx.beginPath();
    ctx.roundRect(cx, y, cardW, cardH, 12);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Equalizer bars behind card (animated)
    if (isSelected) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(cx, y, cardW, cardH, 12);
      ctx.clip();
      const barCount = 24;
      const barW = cardW / barCount;
      for (let b = 0; b < barCount; b++) {
        const freq = Math.sin(time * (2 + b * 0.3) + b * 0.5) * 0.5 + 0.5;
        const barH = freq * cardH * 0.7;
        ctx.fillStyle = `rgba(255,255,255,${0.06 + freq * 0.08})`;
        ctx.fillRect(cx + b * barW, y + cardH - barH, barW - 1, barH);
      }
      ctx.restore();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(cx, y, cardW, cardH, 12);
      ctx.stroke();
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.min(W * 0.05, 22)}px 'Segoe UI', sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(song.name, cx + 20, y + 30);

    ctx.fillStyle = '#ccccdd';
    ctx.font = `${Math.min(W * 0.035, 15)}px 'Segoe UI', sans-serif`;
    ctx.fillText(`${song.artist}  |  ${song.bpm} BPM  |  ${song.duration}s`, cx + 20, y + 55);

    // Clickable area
    const btn = makeButton(cx, y, cardW, cardH, '', () => {
      state.selectedSong = i;
    });
    currentButtons.push(btn);
  });

  // Difficulty selector
  const diffY = startY + SONGS.length * (cardH + 16) + 20;
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.min(W * 0.045, 18)}px 'Segoe UI', sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('난이도', W / 2, diffY);

  const difficulties: Difficulty[] = ['Easy', 'Normal', 'Hard'];
  const diffBtnW = Math.min(W * 0.25, 110);
  const diffBtnH = 44;
  const diffStartX = W / 2 - (diffBtnW * 3 + 20) / 2;

  const diffDescriptions: Record<Difficulty, string> = {
    Easy: '느린 노트',
    Normal: '보통 속도',
    Hard: '빠른 노트 + 더 많은 노트',
  };

  difficulties.forEach((diff, i) => {
    const x = diffStartX + i * (diffBtnW + 10);
    const isSelected = state.difficulty === diff;
    const colors: Record<Difficulty, string> = {
      Easy: '#33aa55',
      Normal: '#ddaa33',
      Hard: '#dd3344',
    };
    const color = isSelected ? colors[diff] : '#333355';

    const btn = makeButton(x, diffY + 16, diffBtnW, diffBtnH, diff, () => {
      state.difficulty = diff;
    }, color);
    currentButtons.push(btn);
    drawButton(btn);
  });

  // Difficulty description
  ctx.fillStyle = '#aaaacc';
  ctx.font = `${Math.min(W * 0.032, 14)}px 'Segoe UI', sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(diffDescriptions[state.difficulty], W / 2, diffY + 16 + diffBtnH + 16);

  // Start button
  const startBtnW = Math.min(W * 0.6, 280);
  const startBtnH = 56;
  const startBtn = makeButton(
    W / 2 - startBtnW / 2,
    diffY + 100,
    startBtnW,
    startBtnH,
    '시작!',
    () => startGame(),
    SONGS[state.selectedSong].color
  );
  currentButtons.push(startBtn);
  drawButton(startBtn);

  // Back button
  const backBtn = makeButton(20, H - 60, 80, 40, '뒤로', () => {
    state.scene = 'menu';
  }, '#444466');
  currentButtons.push(backBtn);
  drawButton(backBtn);
}

// --- Game Logic ---

function startGame() {
  initAudio();
  sdkScoreSubmitted = false;

  const song = SONGS[state.selectedSong];
  state.notes = generateChart(song, state.difficulty);
  state.score = 0;
  state.combo = 0;
  state.maxCombo = 0;
  state.judgments = { Perfect: 0, Great: 0, Good: 0, Miss: 0 };
  state.life = 100;
  state.laneFlash = [0, 0, 0, 0];
  state.bgPulse = 0;
  state.lastJudgment = null;
  state.particles = [];
  state.bgStars = [];
  state.hitRings = [];
  // Pre-populate background stars
  for (let i = 0; i < 60; i++) {
    state.bgStars.push({
      x: Math.random() * 1200,
      y: Math.random() * 1200,
      speed: 15 + Math.random() * 40,
      size: 1 + Math.random() * 2.5,
      alpha: 0.15 + Math.random() * 0.35,
    });
  }
  state.isPlaying = false;
  state.scene = 'countdown';
  state.countdownValue = 3;
  state.countdownStartTime = performance.now() / 1000;
}

function startPlayingAfterCountdown() {
  const song = SONGS[state.selectedSong];
  state.isPlaying = true;
  state.scene = 'playing';
  state.songStartTime = performance.now() / 1000;
  state.currentTime = 0;
  playSong(song);
}

function getNoteSpeed(): number {
  return NOTE_SPEED_BASE * DIFFICULTY_MULTIPLIERS[state.difficulty].speed;
}

function getWindowMultiplier(): number {
  return DIFFICULTY_MULTIPLIERS[state.difficulty].window;
}

function judgeHit(lane: number) {
  if (!state.isPlaying) return;

  const wMult = getWindowMultiplier();
  let bestNote: Note | null = null;
  let bestDiff = Infinity;

  for (const note of state.notes) {
    if (note.hit || note.lane !== lane) continue;
    const diff = Math.abs(note.time - state.currentTime);
    if (diff < MISS_WINDOW * wMult && diff < bestDiff) {
      bestDiff = diff;
      bestNote = note;
    }
  }

  if (!bestNote) return;

  let judgment: Judgment;
  if (bestDiff <= PERFECT_WINDOW * wMult) {
    judgment = 'Perfect';
  } else if (bestDiff <= GREAT_WINDOW * wMult) {
    judgment = 'Great';
  } else if (bestDiff <= GOOD_WINDOW * wMult) {
    judgment = 'Good';
  } else {
    judgment = 'Miss';
  }

  bestNote.hit = true;
  bestNote.judgment = judgment;

  if (judgment === 'Miss') {
    state.combo = 0;
    state.life = Math.max(0, state.life - 5);
  } else {
    state.combo++;
    if (state.combo > state.maxCombo) state.maxCombo = state.combo;

    const comboBonus = Math.floor(state.combo / 10) * 10;
    state.score += SCORE_VALUES[judgment] + comboBonus;
    state.laneFlash[lane] = 1;
    state.bgPulse = Math.min(1, state.bgPulse + 0.3);

    // Spawn particles in the lane's color
    const laneX = getLaneX(lane);
    const hitY = H * HIT_LINE_OFFSET;
    const noteColor = LANE_COLORS[lane];
    const burstColors = [noteColor, '#ffffff', shiftColor(noteColor, 30)];
    const count = judgment === 'Perfect' ? 18 : judgment === 'Great' ? 12 : 6;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const speed = 120 + Math.random() * 280;
      state.particles.push({
        x: laneX,
        y: hitY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 80,
        life: 0.4 + Math.random() * 0.5,
        color: burstColors[Math.floor(Math.random() * burstColors.length)],
        size: 2 + Math.random() * 5,
      });
    }
    if (state.particles.length > 200) state.particles.splice(0, state.particles.length - 200);

    // Spawn expanding hit ring
    state.hitRings.push({
      x: laneX,
      y: hitY,
      radius: 5,
      maxRadius: judgment === 'Perfect' ? 80 : judgment === 'Great' ? 60 : 40,
      life: 1.0,
      color: noteColor,
    });

    playHitSound(judgment);
  }

  state.lastJudgment = judgment;
  state.lastJudgmentTime = state.currentTime;
}

function shiftColor(hex: string, amount: number): string {
  const r = Math.min(255, Math.max(0, parseInt(hex.slice(1, 3), 16) + amount));
  const g = Math.min(255, Math.max(0, parseInt(hex.slice(3, 5), 16) + amount));
  const b = Math.min(255, Math.max(0, parseInt(hex.slice(5, 7), 16) + amount));
  return `rgb(${r},${g},${b})`;
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

function getLaneX(lane: number): number {
  const totalWidth = Math.min(W * 0.8, 500);
  const startX = (W - totalWidth) / 2;
  const laneWidth = totalWidth / LANE_COUNT;
  return startX + laneWidth * lane + laneWidth / 2;
}

function getLaneWidth(): number {
  const totalWidth = Math.min(W * 0.8, 500);
  return totalWidth / LANE_COUNT;
}

// --- Scene: Countdown ---

function updateCountdown() {
  const elapsed = performance.now() / 1000 - state.countdownStartTime;
  if (elapsed < 1) {
    state.countdownValue = 3;
  } else if (elapsed < 2) {
    state.countdownValue = 2;
  } else if (elapsed < 3) {
    state.countdownValue = 1;
  } else if (elapsed < 3.7) {
    state.countdownValue = 0; // "GO!"
  } else {
    startPlayingAfterCountdown();
  }
}

function drawCountdown() {
  currentButtons = [];
  const song = SONGS[state.selectedSong];

  // Background
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#0a0a1a');
  grad.addColorStop(1, '#1a0a2a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Song info
  ctx.fillStyle = song.color;
  ctx.font = `bold ${Math.min(W * 0.06, 28)}px 'Segoe UI', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(song.name, W / 2, H * 0.3);

  ctx.fillStyle = '#aaaacc';
  ctx.font = `${Math.min(W * 0.035, 16)}px 'Segoe UI', sans-serif`;
  ctx.fillText(`${state.difficulty}  |  ${song.bpm} BPM`, W / 2, H * 0.36);

  // Countdown number
  const elapsed = performance.now() / 1000 - state.countdownStartTime;
  const phase = elapsed % 1;
  const scale = 1 + (1 - phase) * 0.5;
  const alpha = phase < 0.8 ? 1 : 1 - (phase - 0.8) / 0.2;

  ctx.save();
  ctx.translate(W / 2, H * 0.55);
  ctx.scale(scale, scale);
  ctx.globalAlpha = alpha;

  if (state.countdownValue > 0) {
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.min(W * 0.25, 120)}px 'Segoe UI', sans-serif`;
    ctx.fillText(`${state.countdownValue}`, 0, 0);
  } else {
    ctx.fillStyle = song.color;
    ctx.shadowColor = song.color;
    ctx.shadowBlur = 40;
    ctx.font = `bold ${Math.min(W * 0.2, 96)}px 'Segoe UI', sans-serif`;
    ctx.fillText('GO!', 0, 0);
    ctx.shadowBlur = 0;
  }

  ctx.restore();
  ctx.globalAlpha = 1;
}

// --- Scene: Playing ---

function updatePlaying(dt: number) {
  state.currentTime = performance.now() / 1000 - state.songStartTime;

  const song = SONGS[state.selectedSong];
  const hitY = H * HIT_LINE_OFFSET;
  const speed = getNoteSpeed();
  const wMult = getWindowMultiplier();

  // Update note positions
  for (const note of state.notes) {
    const timeDiff = note.time - state.currentTime;
    note.y = hitY - timeDiff * speed;

    // Auto-miss notes that passed
    if (!note.hit && state.currentTime - note.time > MISS_WINDOW * wMult) {
      note.hit = true;
      note.judgment = 'Miss';
      state.judgments.Miss++;
      state.combo = 0;
      state.life = Math.max(0, state.life - 3);
      state.lastJudgment = 'Miss';
      state.lastJudgmentTime = state.currentTime;
    }
  }

  // Update lane flashes
  for (let i = 0; i < LANE_COUNT; i++) {
    state.laneFlash[i] = Math.max(0, state.laneFlash[i] - dt * 5);
  }

  // Update bg pulse
  state.bgPulse = Math.max(0, state.bgPulse - dt * 2);

  // Beat pulse
  const beatDuration = 60 / song.bpm;
  const beatPhase = (state.currentTime % beatDuration) / beatDuration;
  if (beatPhase < 0.1) {
    state.bgPulse = Math.max(state.bgPulse, 0.3);
  }

  // Update particles
  for (const p of state.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 500 * dt; // gravity
    p.life -= dt;
  }
  state.particles = state.particles.filter(p => p.life > 0);

  // Update background stars (float upward)
  for (const star of state.bgStars) {
    star.y -= star.speed * dt;
    if (star.y < -10) {
      star.y = H + 10;
      star.x = Math.random() * W;
    }
  }

  // Update hit rings
  for (const ring of state.hitRings) {
    ring.life -= dt * 3;
    ring.radius += (ring.maxRadius - ring.radius) * dt * 8;
  }
  state.hitRings = state.hitRings.filter(r => r.life > 0);

  // Check song end
  if (state.currentTime >= song.duration + 1) {
    endGame();
  }
}

function drawPlaying() {
  currentButtons = [];

  const song = SONGS[state.selectedSong];
  const hitY = H * HIT_LINE_OFFSET;
  const laneWidth = getLaneWidth();
  const totalWidth = laneWidth * LANE_COUNT;
  const startX = (W - totalWidth) / 2;

  // Background
  const bgIntensity = state.bgPulse * 0.3;
  const bgR = Math.floor(10 + bgIntensity * 40);
  const bgG = Math.floor(10 + bgIntensity * 10);
  const bgB = Math.floor(20 + bgIntensity * 50);
  ctx.fillStyle = `rgb(${bgR},${bgG},${bgB})`;
  ctx.fillRect(0, 0, W, H);

  // Song color background pulse
  ctx.fillStyle = song.color;
  ctx.globalAlpha = state.bgPulse * 0.1;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;

  // Animated background stars/particles
  for (const star of state.bgStars) {
    ctx.globalAlpha = star.alpha * (0.5 + state.bgPulse * 0.5);
    ctx.fillStyle = '#aabbff';
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Vignette overlay (darken edges)
  const vigGrad = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.75);
  vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
  vigGrad.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = vigGrad;
  ctx.fillRect(0, 0, W, H);

  // Lane backgrounds
  for (let i = 0; i < LANE_COUNT; i++) {
    const x = startX + i * laneWidth;
    ctx.fillStyle = `rgba(255,255,255,${0.02 + state.laneFlash[i] * 0.15})`;
    ctx.fillRect(x, 0, laneWidth, H);

    // Lane separator with gradient
    const sepGrad = ctx.createLinearGradient(x, 0, x, H);
    sepGrad.addColorStop(0, 'rgba(255,255,255,0)');
    sepGrad.addColorStop(0.3, 'rgba(255,255,255,0.12)');
    sepGrad.addColorStop(0.85, 'rgba(255,255,255,0.2)');
    sepGrad.addColorStop(1, 'rgba(255,255,255,0.05)');
    ctx.fillStyle = sepGrad;
    ctx.fillRect(x, 0, 1, H);
  }
  // Right border
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(startX + totalWidth, 0, 1, H);

  // Hit line with pulsing glow
  const beatDuration = 60 / song.bpm;
  const beatPhase = (state.currentTime % beatDuration) / beatDuration;
  const hitGlow = 0.3 + (1 - beatPhase) * 0.7 * state.bgPulse;
  ctx.save();
  ctx.shadowColor = song.color;
  ctx.shadowBlur = 12 + hitGlow * 18;
  ctx.fillStyle = `rgba(255,255,255,${0.3 + hitGlow * 0.4})`;
  ctx.fillRect(startX, hitY - 2, totalWidth, 4);
  ctx.restore();

  // Lane key indicators (DJ-pad style circles at hit line)
  for (let i = 0; i < LANE_COUNT; i++) {
    const x = getLaneX(i);
    const padRadius = laneWidth * 0.32;
    const flash = state.laneFlash[i];

    // Outer ring gradient
    const ringGrad = ctx.createRadialGradient(x, hitY, padRadius * 0.5, x, hitY, padRadius);
    ringGrad.addColorStop(0, `rgba(255,255,255,${0.02 + flash * 0.25})`);
    ringGrad.addColorStop(1, `rgba(${hexToRgb(LANE_COLORS[i])},${0.12 + flash * 0.5})`);
    ctx.beginPath();
    ctx.arc(x, hitY, padRadius, 0, Math.PI * 2);
    ctx.fillStyle = ringGrad;
    ctx.fill();

    // Ring border
    ctx.beginPath();
    ctx.arc(x, hitY, padRadius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,255,255,${0.2 + flash * 0.6})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Flash fill burst
    if (flash > 0) {
      ctx.beginPath();
      ctx.arc(x, hitY, padRadius * (1 + flash * 0.15), 0, Math.PI * 2);
      ctx.fillStyle = LANE_COLORS[i];
      ctx.globalAlpha = flash * 0.35;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Key label inside circle
    ctx.fillStyle = `rgba(255,255,255,${0.45 + flash * 0.55})`;
    ctx.font = `bold ${Math.min(padRadius * 0.8, 22)}px 'Segoe UI', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(LANE_KEYS[i].toUpperCase(), x, hitY);
  }

  // Notes - per-lane colors, gradient fill, inner shine
  const noteWidth = laneWidth * 0.6;
  for (const note of state.notes) {
    if (note.hit) continue;
    if (note.y < -NOTE_HEIGHT || note.y > H + NOTE_HEIGHT) continue;

    const x = getLaneX(note.lane);
    const nColor = LANE_COLORS[note.lane];
    const nx = x - noteWidth / 2;
    const ny = note.y - NOTE_HEIGHT / 2;

    // Glow
    ctx.save();
    ctx.shadowColor = nColor;
    ctx.shadowBlur = 12;

    // Gradient fill for note body
    const noteGrad = ctx.createLinearGradient(nx, ny, nx, ny + NOTE_HEIGHT);
    noteGrad.addColorStop(0, shiftColor(nColor, 40));
    noteGrad.addColorStop(0.5, nColor);
    noteGrad.addColorStop(1, shiftColor(nColor, -30));
    ctx.fillStyle = noteGrad;
    ctx.globalAlpha = 0.92;
    ctx.beginPath();
    ctx.roundRect(nx, ny, noteWidth, NOTE_HEIGHT, NOTE_RADIUS);
    ctx.fill();

    // Inner shine (top highlight)
    const shineGrad = ctx.createLinearGradient(nx, ny, nx, ny + NOTE_HEIGHT * 0.5);
    shineGrad.addColorStop(0, 'rgba(255,255,255,0.45)');
    shineGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = shineGrad;
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.roundRect(nx + 2, ny + 1, noteWidth - 4, NOTE_HEIGHT * 0.45, [NOTE_RADIUS, NOTE_RADIUS, 2, 2]);
    ctx.fill();

    ctx.restore();
  }

  // Hit rings (expanding ring effect)
  for (const ring of state.hitRings) {
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
    ctx.strokeStyle = ring.color;
    ctx.lineWidth = 3 * ring.life;
    ctx.globalAlpha = ring.life * 0.7;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Particles
  for (const p of state.particles) {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.min(1, p.life * 2);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * Math.max(0.3, p.life), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Judgment display with scale-in animation + drop shadow
  if (state.lastJudgment && state.currentTime - state.lastJudgmentTime < 0.6) {
    const elapsed = state.currentTime - state.lastJudgmentTime;
    const alpha = elapsed < 0.4 ? 1 : 1 - (elapsed - 0.4) / 0.2;
    // Scale-in: start big, settle, then grow slightly as it fades
    const t = Math.min(1, elapsed * 6);
    const scaleIn = t < 1 ? 1.6 - 0.6 * t : 1 + (elapsed - 0.17) * 0.4;
    const colors: Record<Judgment, string> = {
      Perfect: '#ffdd33',
      Great: '#33ddff',
      Good: '#33ff88',
      Miss: '#ff3333',
    };
    ctx.save();
    ctx.translate(W / 2, hitY - 80);
    ctx.scale(scaleIn, scaleIn);
    ctx.globalAlpha = alpha;
    // Drop shadow
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = colors[state.lastJudgment];
    ctx.font = `bold ${Math.min(W * 0.07, 34)}px 'Segoe UI', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(state.lastJudgment, 0, 0);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // Combo display with text outline/shadow
  if (state.combo > 2) {
    const comboSize = Math.min(W * 0.1, 48);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Shadow
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 2;
    // Outline
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 4;
    ctx.font = `bold ${comboSize}px 'Segoe UI', sans-serif`;
    ctx.strokeText(`${state.combo}`, W / 2, H * 0.35);
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.9;
    ctx.fillText(`${state.combo}`, W / 2, H * 0.35);
    ctx.font = `bold ${Math.min(W * 0.035, 16)}px 'Segoe UI', sans-serif`;
    ctx.strokeText('COMBO', W / 2, H * 0.35 + comboSize * 0.55);
    ctx.fillText('COMBO', W / 2, H * 0.35 + comboSize * 0.55);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // Score with text outline/shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 6;
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 3;
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.min(W * 0.05, 24)}px 'Segoe UI', sans-serif`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.strokeText(state.score.toLocaleString(), W - 20, 35);
  ctx.fillText(state.score.toLocaleString(), W - 20, 35);
  ctx.restore();

  // Life bar
  const lifeBarW = Math.min(W * 0.4, 200);
  const lifeBarH = 8;
  const lifeBarX = 20;
  const lifeBarY = 20;
  ctx.fillStyle = '#333344';
  ctx.beginPath();
  ctx.roundRect(lifeBarX, lifeBarY, lifeBarW, lifeBarH, 4);
  ctx.fill();

  const lifeColor = state.life > 50 ? '#33dd66' : state.life > 25 ? '#ddaa33' : '#dd3333';
  ctx.fillStyle = lifeColor;
  ctx.beginPath();
  ctx.roundRect(lifeBarX, lifeBarY, lifeBarW * (state.life / 100), lifeBarH, 4);
  ctx.fill();

  // Song info
  ctx.fillStyle = '#aaaacc';
  ctx.font = `${Math.min(W * 0.03, 13)}px 'Segoe UI', sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText(`${song.name} - ${state.difficulty}`, 20, 50);

  // Progress bar
  const progress = Math.min(1, state.currentTime / song.duration);
  ctx.fillStyle = '#222233';
  ctx.fillRect(0, H - 4, W, 4);
  ctx.fillStyle = song.color;
  ctx.fillRect(0, H - 4, W * progress, 4);
}

// --- End Game ---

function endGame() {
  state.isPlaying = false;
  state.scene = 'results';
  stopAllAudio();

  // Tally judgments from notes
  state.judgments = { Perfect: 0, Great: 0, Good: 0, Miss: 0 };
  for (const note of state.notes) {
    if (note.judgment) {
      state.judgments[note.judgment]++;
    }
  }

  // Calculate grade
  const total = state.notes.length;
  if (total === 0) {
    state.grade = 'C';
    return;
  }
  const ratio = (state.judgments.Perfect * 3 + state.judgments.Great * 2 + state.judgments.Good) / (total * 3);
  if (ratio >= 0.95) state.grade = 'S';
  else if (ratio >= 0.85) state.grade = 'A';
  else if (ratio >= 0.70) state.grade = 'B';
  else state.grade = 'C';

  // Save to local leaderboard & submit to SDK (once)
  if (!sdkScoreSubmitted) {
    sdkScoreSubmitted = true;
    const song = SONGS[state.selectedSong];
    let userName = '나';
    try { if (sdk) { const u = sdk.auth.getUser(); if (u) userName = u.name; } } catch {}
    saveToBeatDropLeaderboard({
      name: userName,
      score: state.score,
      grade: state.grade,
      song: song.name,
      timestamp: Date.now(),
    });

    if (sdk) {
      try {
        sdk.scores.submit({
          score: state.score,
          meta: {
            song: song.name,
            difficulty: state.difficulty,
            grade: state.grade,
            maxCombo: state.maxCombo,
            accuracy: Math.round(ratio * 10000) / 100,
            perfect: state.judgments.Perfect,
            great: state.judgments.Great,
            good: state.judgments.Good,
            miss: state.judgments.Miss,
          },
        });
      } catch { /* score submission failed */ }
    }
  }
}

// --- Scene: Results ---

function drawResults() {
  currentButtons = [];

  const song = SONGS[state.selectedSong];

  // Background
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#0a0a1a');
  grad.addColorStop(0.5, '#1a0a2a');
  grad.addColorStop(1, '#0a0a1a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Title
  ctx.fillStyle = '#aaaacc';
  ctx.font = `bold ${Math.min(W * 0.05, 22)}px 'Segoe UI', sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('결과', W / 2, H * 0.06);

  // Song name
  ctx.fillStyle = song.color;
  ctx.font = `bold ${Math.min(W * 0.06, 26)}px 'Segoe UI', sans-serif`;
  ctx.fillText(song.name, W / 2, H * 0.12);

  ctx.fillStyle = '#888899';
  ctx.font = `${Math.min(W * 0.035, 15)}px 'Segoe UI', sans-serif`;
  ctx.fillText(`${state.difficulty}  |  ${song.bpm} BPM`, W / 2, H * 0.17);

  // Grade
  const gradeColors: Record<Grade, string> = { S: '#ffdd33', A: '#33ddff', B: '#33dd66', C: '#ff6633' };
  ctx.fillStyle = gradeColors[state.grade];
  ctx.shadowColor = gradeColors[state.grade];
  ctx.shadowBlur = 30;
  ctx.font = `bold ${Math.min(W * 0.25, 120)}px 'Segoe UI', sans-serif`;
  ctx.fillText(state.grade, W / 2, H * 0.32);
  ctx.shadowBlur = 0;

  // Score
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.min(W * 0.08, 36)}px 'Segoe UI', sans-serif`;
  ctx.fillText(state.score.toLocaleString(), W / 2, H * 0.43);

  ctx.fillStyle = '#888899';
  ctx.font = `${Math.min(W * 0.035, 15)}px 'Segoe UI', sans-serif`;
  ctx.fillText('점수', W / 2, H * 0.47);

  // Accuracy
  const totalNotes = state.notes.length;
  const accuracy = totalNotes > 0
    ? ((state.judgments.Perfect * 100 + state.judgments.Great * 75 + state.judgments.Good * 50) / (totalNotes * 100)) * 100
    : 0;
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.min(W * 0.055, 24)}px 'Segoe UI', sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(`${accuracy.toFixed(1)}%`, W / 2, H * 0.51);
  ctx.fillStyle = '#888899';
  ctx.font = `${Math.min(W * 0.03, 13)}px 'Segoe UI', sans-serif`;
  ctx.fillText('정확도', W / 2, H * 0.54);

  // Stats
  const statsY = H * 0.59;
  const lineH = Math.min(H * 0.04, 28);
  const stats = [
    { label: 'Max Combo', value: `${state.maxCombo}x`, color: '#ffdd33' },
    { label: 'Perfect', value: `${state.judgments.Perfect}`, color: '#ffdd33' },
    { label: 'Great', value: `${state.judgments.Great}`, color: '#33ddff' },
    { label: 'Good', value: `${state.judgments.Good}`, color: '#33dd66' },
    { label: 'Miss', value: `${state.judgments.Miss}`, color: '#ff3333' },
  ];

  stats.forEach((s, i) => {
    const y = statsY + i * lineH;
    ctx.fillStyle = '#888899';
    ctx.font = `${Math.min(W * 0.035, 15)}px 'Segoe UI', sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(s.label, W * 0.25, y);
    ctx.fillStyle = s.color;
    ctx.textAlign = 'right';
    ctx.fillText(s.value, W * 0.75, y);
  });

  // Buttons
  const btnW = Math.min(W * 0.4, 180);
  const btnH = 48;
  const btnY = H * 0.87;

  const retryBtn = makeButton(W / 2 - btnW - 10, btnY, btnW, btnH, 'RETRY', () => {
    startGame();
  }, song.color);
  currentButtons.push(retryBtn);
  drawButton(retryBtn);

  const menuBtn = makeButton(W / 2 + 10, btnY, btnW, btnH, 'SONGS', () => {
    state.scene = 'songSelect';
  }, '#444466');
  currentButtons.push(menuBtn);
  drawButton(menuBtn);
}

// --- Input ---

function handleLaneInput(lane: number) {
  if (state.scene === 'playing' && state.isPlaying) {
    judgeHit(lane);
  }
}

// Keyboard
window.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  const laneIndex = LANE_KEYS.indexOf(key);
  if (laneIndex >= 0) {
    e.preventDefault();
    handleLaneInput(laneIndex);
  }
  // Escape to go back
  if (key === 'escape') {
    if (state.scene === 'countdown') {
      state.scene = 'songSelect';
    } else if (state.scene === 'playing') {
      state.isPlaying = false;
      stopAllAudio();
      state.scene = 'songSelect';
    } else if (state.scene === 'songSelect') {
      state.scene = 'menu';
    } else if (state.scene === 'results') {
      state.scene = 'songSelect';
    }
  }
});

// Touch / Click
function handlePointer(clientX: number, clientY: number) {
  const rect = canvas.getBoundingClientRect();
  const canvasX = (clientX - rect.left) / rect.width * W;
  const canvasY = (clientY - rect.top) / rect.height * H;

  if (checkButtonClick(canvasX, canvasY)) return;

  if (state.scene === 'playing' && state.isPlaying) {
    // Full-screen 4-column touch: divide entire screen width into 4 lanes
    const lane = Math.floor(canvasX / W * LANE_COUNT);
    const clampedLane = Math.max(0, Math.min(LANE_COUNT - 1, lane));
    handleLaneInput(clampedLane);
  }
}

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  initAudio();
  handlePointer(e.clientX, e.clientY);
});

// Multi-touch
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  initAudio();
  for (let i = 0; i < e.changedTouches.length; i++) {
    const touch = e.changedTouches[i];
    handlePointer(touch.clientX, touch.clientY);
  }
}, { passive: false });

// --- Main Loop ---

let lastTime = performance.now() / 1000;

function gameLoop() {
  const now = performance.now() / 1000;
  const dt = Math.min(now - lastTime, 0.05); // cap delta
  lastTime = now;

  // Resize check
  if (canvas.clientWidth !== W || canvas.clientHeight !== H) {
    resize();
  }

  ctx.clearRect(0, 0, W, H);

  switch (state.scene) {
    case 'menu':
      drawMenu();
      break;
    case 'songSelect':
      drawSongSelect();
      break;
    case 'countdown':
      updateCountdown();
      drawCountdown();
      break;
    case 'playing':
      updatePlaying(dt);
      drawPlaying();
      break;
    case 'results':
      drawResults();
      break;
  }

  requestAnimationFrame(gameLoop);
}

// Ensure audio context unlocks on first touch (iOS)
document.addEventListener('touchstart', () => initAudio(), { once: true });

// Start
requestAnimationFrame(gameLoop);
