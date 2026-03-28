// ============================================================
// Bluff Party - 블러프 파티
// Local multiplayer party game: find the bluffer!
// ============================================================

// --- Types ---

interface Player {
  name: string;
  score: number;
  isBluffer: boolean;
  votedFor: number; // index of player voted for
}

type MiniGameType = 'drawing' | 'quiz' | 'describe';

interface MiniGameData {
  type: MiniGameType;
  normalPrompt: string;
  blufferPrompt: string;
  category: string;
}

type GamePhase =
  | 'title'
  | 'setup'
  | 'roundIntro'
  | 'roleReveal'
  | 'passPhone'
  | 'miniGame'
  | 'discussion'
  | 'voting'
  | 'votePassPhone'
  | 'results'
  | 'finalResults';

// --- Content Database ---

const DRAWING_PROMPTS: { normal: string; bluffer: string; category: string }[] = [
  { normal: '고양이', bluffer: '강아지', category: '동물' },
  { normal: '피자', bluffer: '햄버거', category: '음식' },
  { normal: '비행기', bluffer: '헬리콥터', category: '탈것' },
  { normal: '해', bluffer: '달', category: '자연' },
  { normal: '기타', bluffer: '바이올린', category: '악기' },
  { normal: '사과', bluffer: '딸기', category: '과일' },
  { normal: '축구공', bluffer: '농구공', category: '스포츠' },
  { normal: '우산', bluffer: '모자', category: '소품' },
  { normal: '로봇', bluffer: '외계인', category: '캐릭터' },
  { normal: '성', bluffer: '탑', category: '건물' },
  { normal: '나무', bluffer: '꽃', category: '자연' },
  { normal: '자전거', bluffer: '오토바이', category: '탈것' },
  { normal: '펭귄', bluffer: '오리', category: '동물' },
  { normal: '케이크', bluffer: '아이스크림', category: '디저트' },
  { normal: '집', bluffer: '텐트', category: '건물' },
];

const QUIZ_PROMPTS: { question: string; correctAnswer: string; blufferAnswer: string; category: string }[] = [
  { question: '지구에서 가장 높은 산은?', correctAnswer: '에베레스트', blufferAnswer: 'K2', category: '지리' },
  { question: '물의 화학식은?', correctAnswer: 'H2O', blufferAnswer: 'CO2', category: '과학' },
  { question: '한국의 수도는?', correctAnswer: '서울', blufferAnswer: '부산', category: '상식' },
  { question: '태양계에서 가장 큰 행성은?', correctAnswer: '목성', blufferAnswer: '토성', category: '과학' },
  { question: '"로미오와 줄리엣"의 작가는?', correctAnswer: '셰익스피어', blufferAnswer: '괴테', category: '문학' },
  { question: '올림픽은 몇 년마다 열리나?', correctAnswer: '4년', blufferAnswer: '2년', category: '스포츠' },
  { question: '빛의 속도에 가장 가까운 것은?', correctAnswer: '초속 30만 km', blufferAnswer: '초속 15만 km', category: '과학' },
  { question: '피카소의 국적은?', correctAnswer: '스페인', blufferAnswer: '프랑스', category: '예술' },
  { question: '인체에서 가장 큰 장기는?', correctAnswer: '피부', blufferAnswer: '간', category: '과학' },
  { question: 'BTS의 데뷔곡은?', correctAnswer: 'No More Dream', blufferAnswer: 'Danger', category: '음악' },
  { question: '일본의 수도는?', correctAnswer: '도쿄', blufferAnswer: '오사카', category: '지리' },
  { question: '1 + 1 = ?', correctAnswer: '2', blufferAnswer: '11 (이진법)', category: '수학' },
];

const DESCRIBE_PROMPTS: { normal: string; bluffer: string; category: string }[] = [
  { normal: '김치찌개', bluffer: '된장찌개', category: '한식' },
  { normal: '여름', bluffer: '겨울', category: '계절' },
  { normal: '학교', bluffer: '회사', category: '장소' },
  { normal: '결혼식', bluffer: '장례식', category: '행사' },
  { normal: '영화관', bluffer: '놀이공원', category: '장소' },
  { normal: '크리스마스', bluffer: '할로윈', category: '명절' },
  { normal: '아기', bluffer: '할아버지', category: '사람' },
  { normal: '바다', bluffer: '산', category: '자연' },
  { normal: '라면', bluffer: '떡볶이', category: '음식' },
  { normal: '지하철', bluffer: '버스', category: '교통' },
  { normal: '도서관', bluffer: '카페', category: '장소' },
  { normal: '생일', bluffer: '졸업식', category: '행사' },
  { normal: '강아지', bluffer: '고양이', category: '동물' },
  { normal: '운동회', bluffer: '소풍', category: '학교행사' },
  { normal: '비 오는 날', bluffer: '눈 오는 날', category: '날씨' },
];

// --- Color Palette ---
const COLORS = {
  bg: '#1a1a2e',
  bgLight: '#16213e',
  primary: '#e94560',
  secondary: '#0f3460',
  accent: '#533483',
  yellow: '#f5c542',
  green: '#27ae60',
  blue: '#3498db',
  orange: '#e67e22',
  white: '#ecf0f1',
  gray: '#7f8c8d',
  darkGray: '#2c3e50',
};

const PLAYER_COLORS = ['#e94560', '#3498db', '#27ae60', '#f5c542', '#e67e22', '#9b59b6', '#1abc9c', '#e74c3c'];

// --- Game State ---

let players: Player[] = [];
let currentRound = 0;
let totalRounds = 5;
let currentPhase: GamePhase = 'title';
let currentMiniGame: MiniGameData | null = null;
let currentPlayerIndex = 0;
let usedMiniGames: MiniGameType[] = [];
let usedDrawing: number[] = [];
let usedQuiz: number[] = [];
let usedDescribe: number[] = [];
let drawingCanvasData: { playerIndex: number; dataUrl: string }[] = [];
let quizAnswers: { playerIndex: number; answer: string }[] = [];
let describeAnswers: { playerIndex: number; answer: string }[] = [];
let voteResults: number[] = [];
let roundHistory: { round: number; type: MiniGameType; blufferIndex: number; caught: boolean }[] = [];

const app = document.getElementById('app')!;

// --- Inject Enhanced CSS ---
const styleEl = document.createElement('style');
styleEl.textContent = `
  /* Animated background gradient for title */
  @keyframes bgShift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  .title-bg {
    background: linear-gradient(135deg, ${COLORS.bg}, ${COLORS.accent}, ${COLORS.secondary}, ${COLORS.bg}, #2a1a4e);
    background-size: 400% 400%;
    animation: bgShift 12s ease infinite;
  }

  /* Mask emoji rotation */
  @keyframes maskFloat {
    0%, 100% { transform: rotate(-5deg) scale(1); }
    25% { transform: rotate(5deg) scale(1.05); }
    50% { transform: rotate(-3deg) scale(1.02); }
    75% { transform: rotate(4deg) scale(1.04); }
  }
  .mask-emoji {
    display: inline-block;
    font-size: 96px;
    animation: maskFloat 4s ease-in-out infinite;
    filter: drop-shadow(0 4px 20px rgba(233, 69, 96, 0.3));
  }

  /* Player input focus */
  .player-input:focus {
    border-color: var(--player-color) !important;
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--player-color) 30%, transparent);
    outline: none;
  }
  .player-input {
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  /* Role card flip */
  @keyframes cardFlipIn {
    0% { transform: perspective(600px) rotateY(90deg); opacity: 0; }
    100% { transform: perspective(600px) rotateY(0deg); opacity: 1; }
  }
  .role-card {
    animation: cardFlipIn 0.6s cubic-bezier(0.34, 1.2, 0.64, 1) both;
  }

  /* Bluffer pulse */
  @keyframes pulseRed {
    0%, 100% { box-shadow: 0 0 0 0 rgba(233, 69, 96, 0.5); }
    50% { box-shadow: 0 0 30px 8px rgba(233, 69, 96, 0.3); }
  }
  .pulse-bluffer {
    animation: pulseRed 2s ease-in-out infinite;
  }

  /* Citizen pulse */
  @keyframes pulseGreen {
    0%, 100% { box-shadow: 0 0 0 0 rgba(39, 174, 96, 0.5); }
    50% { box-shadow: 0 0 30px 8px rgba(39, 174, 96, 0.3); }
  }
  .pulse-citizen {
    animation: pulseGreen 2s ease-in-out infinite;
  }

  /* Timer pulse red */
  @keyframes timerPulse {
    0%, 100% { transform: scale(1); color: ${COLORS.primary}; }
    50% { transform: scale(1.15); color: #ff3333; }
  }
  .timer-urgent {
    animation: timerPulse 0.6s ease-in-out infinite;
  }

  /* Progress bar */
  .round-progress {
    width: 100%;
    max-width: 300px;
    height: 6px;
    background: rgba(255,255,255,0.1);
    border-radius: 3px;
    overflow: hidden;
    margin: 8px 0;
  }
  .round-progress-fill {
    height: 100%;
    background: linear-gradient(90deg, ${COLORS.primary}, ${COLORS.yellow});
    border-radius: 3px;
    transition: width 0.5s ease;
  }

  /* Vote button styles */
  .vote-btn-enhanced {
    transition: all 0.2s ease;
    position: relative;
    overflow: hidden;
  }
  .vote-btn-enhanced:active {
    transform: scale(0.95);
  }

  /* Vote bounce */
  @keyframes voteBounce {
    0% { transform: scale(1); }
    30% { transform: scale(1.08); }
    50% { transform: scale(0.95); }
    70% { transform: scale(1.03); }
    100% { transform: scale(1); }
  }
  .vote-selected {
    animation: voteBounce 0.5s ease-out;
  }

  /* Confetti dots */
  @keyframes confettiDot {
    0% { transform: translateY(0) rotate(0deg); opacity: 1; }
    100% { transform: translateY(-120px) rotate(720deg); opacity: 0; }
  }
  .confetti-container {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    pointer-events: none;
    overflow: hidden;
  }
  .confetti-dot {
    position: absolute;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    animation: confettiDot var(--dur) ease-out var(--delay) infinite;
  }

  /* Phase dot glow */
  @keyframes dotGlow {
    0%, 100% { text-shadow: 0 0 4px currentColor; }
    50% { text-shadow: 0 0 12px currentColor, 0 0 20px currentColor; }
  }
  .phase-active {
    animation: dotGlow 1.5s ease-in-out infinite;
  }

  /* Winner announcement */
  @keyframes winnerPop {
    0% { transform: scale(0.5); opacity: 0; }
    60% { transform: scale(1.1); opacity: 1; }
    100% { transform: scale(1); opacity: 1; }
  }
  .winner-announce {
    animation: winnerPop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  }

  /* Slide in from bottom */
  @keyframes slideUp {
    from { transform: translateY(30px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  .slide-up {
    animation: slideUp 0.4s ease-out both;
  }

  /* Button hover glow */
  .btn-glow:active {
    filter: brightness(1.1);
    transform: scale(0.97);
  }
`;
document.head.appendChild(styleEl);


// --- Utility Functions ---

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandom<T>(arr: T[], exclude: number[] = []): { item: T; index: number } {
  const available = arr.map((item, i) => ({ item, i })).filter(x => !exclude.includes(x.i));
  if (available.length === 0) {
    // reset exclusion if all used
    const idx = Math.floor(Math.random() * arr.length);
    return { item: arr[idx], index: idx };
  }
  const pick = available[Math.floor(Math.random() * available.length)];
  return { item: pick.item, index: pick.i };
}

function getMiniGameTypeName(type: MiniGameType): string {
  switch (type) {
    case 'drawing': return '그림 그리기';
    case 'quiz': return '퀴즈 대결';
    case 'describe': return '설명하기';
  }
}

function getMiniGameEmoji(type: MiniGameType): string {
  switch (type) {
    case 'drawing': return '\uD83C\uDFA8';
    case 'quiz': return '\uD83E\uDDE0';
    case 'describe': return '\uD83D\uDCAC';
  }
}

function assignBluffer(): void {
  // Reset all
  players.forEach(p => { p.isBluffer = false; p.votedFor = -1; });

  // Avoid recent bluffers if possible
  const recentBluffers = roundHistory.slice(-2).map(r => r.blufferIndex);
  const candidates = players.map((_, i) => i).filter(i => !recentBluffers.includes(i));
  const pool = candidates.length > 0 ? candidates : players.map((_, i) => i);
  const blufferIdx = pool[Math.floor(Math.random() * pool.length)];
  players[blufferIdx].isBluffer = true;
}

function pickMiniGame(): MiniGameData {
  const allTypes: MiniGameType[] = ['drawing', 'quiz', 'describe'];
  const available = allTypes.filter(t => !usedMiniGames.includes(t));
  const type = available.length > 0
    ? available[Math.floor(Math.random() * available.length)]
    : allTypes[Math.floor(Math.random() * allTypes.length)];

  usedMiniGames.push(type);

  switch (type) {
    case 'drawing': {
      const { item, index } = pickRandom(DRAWING_PROMPTS, usedDrawing);
      usedDrawing.push(index);
      return { type: 'drawing', normalPrompt: item.normal, blufferPrompt: item.bluffer, category: item.category };
    }
    case 'quiz': {
      const { item, index } = pickRandom(QUIZ_PROMPTS, usedQuiz);
      usedQuiz.push(index);
      return { type: 'quiz', normalPrompt: item.correctAnswer, blufferPrompt: item.blufferAnswer, category: `${item.category}: ${item.question}` };
    }
    case 'describe': {
      const { item, index } = pickRandom(DESCRIBE_PROMPTS, usedDescribe);
      usedDescribe.push(index);
      return { type: 'describe', normalPrompt: item.normal, blufferPrompt: item.bluffer, category: item.category };
    }
  }
}

// --- Phase Indicator ---

function getPhaseIndicatorHtml(): string {
  const phases = [
    { key: 'role', label: '역할 확인' },
    { key: 'game', label: '미니게임' },
    { key: 'vote', label: '투표' },
    { key: 'result', label: '결과' },
  ];

  let activeKey = '';
  if (currentPhase === 'roundIntro' || currentPhase === 'roleReveal' || currentPhase === 'passPhone') activeKey = 'role';
  else if (currentPhase === 'miniGame') activeKey = 'game';
  else if (currentPhase === 'discussion' || currentPhase === 'voting' || currentPhase === 'votePassPhone') activeKey = 'vote';
  else if (currentPhase === 'results') activeKey = 'result';
  else return '';

  const items = phases.map((p, i) => {
    const isActive = p.key === activeKey;
    const isPast = phases.findIndex(pp => pp.key === activeKey) > i;
    const color = isActive ? COLORS.yellow : isPast ? COLORS.green : COLORS.gray;
    const weight = isActive ? '700' : '400';
    const glowClass = isActive ? 'phase-active' : '';
    const dot = isActive ? `<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${COLORS.yellow};margin-right:4px;vertical-align:middle;box-shadow:0 0 8px ${COLORS.yellow};" class="${glowClass}"></span>` : '';
    const arrow = i < phases.length - 1 ? `<span style="color:${COLORS.gray};margin:0 4px;font-size:10px;">▸</span>` : '';
    return `<span style="color:${color};font-weight:${weight};font-size:11px;" class="${glowClass}">${dot}${p.label}</span>${arrow}`;
  }).join('');

  return `<div style="display:flex;align-items:center;justify-content:center;padding:8px 0;width:100%;flex-wrap:wrap;">${items}</div>`;
}

function getBackButtonHtml(label: string = '뒤로'): string {
  return `<button id="btn-back" style="position:absolute;top:12px;left:12px;background:rgba(255,255,255,0.1);color:${COLORS.gray};border:1px solid rgba(255,255,255,0.15);padding:6px 14px;border-radius:20px;font-size:13px;cursor:pointer;z-index:10;">${label}</button>`;
}

// --- Confetti Generator ---
function generateConfettiHtml(): string {
  const confettiColors = ['#e94560', '#f5c542', '#27ae60', '#3498db', '#9b59b6', '#e67e22', '#1abc9c', '#ff6b9d'];
  let dots = '';
  for (let i = 0; i < 30; i++) {
    const color = confettiColors[i % confettiColors.length];
    const left = Math.random() * 100;
    const top = 60 + Math.random() * 40;
    const dur = 1.5 + Math.random() * 2;
    const delay = Math.random() * 2;
    const size = 6 + Math.random() * 6;
    dots += `<div class="confetti-dot" style="left:${left}%;top:${top}%;width:${size}px;height:${size}px;background:${color};--dur:${dur}s;--delay:${delay}s;"></div>`;
  }
  return `<div class="confetti-container">${dots}</div>`;
}

// --- Progress Bar Helper ---
function getProgressBarHtml(): string {
  if (currentRound <= 0 || totalRounds <= 0) return '';
  return `<div class="round-progress" style="max-width:300px;margin:4px auto 8px;"><div class="round-progress-fill" style="width:${(currentRound / totalRounds) * 100}%"></div></div>`;
}

// --- Render Functions ---

function render(): void {
  switch (currentPhase) {
    case 'title': renderTitle(); break;
    case 'setup': renderSetup(); break;
    case 'roundIntro': renderRoundIntro(); break;
    case 'roleReveal': renderRoleReveal(); break;
    case 'passPhone': renderPassPhone(); break;
    case 'miniGame': renderMiniGame(); break;
    case 'discussion': renderDiscussion(); break;
    case 'voting': renderVoting(); break;
    case 'votePassPhone': renderVotePassPhone(); break;
    case 'results': renderResults(); break;
    case 'finalResults': renderFinalResults(); break;
  }
}

function renderTitle(): void {
  app.innerHTML = `
    <div class="title-bg" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:20px;text-align:center;width:100%;">
      <div class="mask-emoji" style="margin-bottom:10px;">\uD83C\uDFAD</div>
      <h1 style="font-size:42px;font-weight:900;background:linear-gradient(to right,${COLORS.primary},${COLORS.yellow});-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:8px;">BLUFF PARTY</h1>
      <p style="font-size:18px;color:${COLORS.yellow};margin-bottom:30px;font-weight:700;">블러프 파티</p>
      <p style="font-size:14px;color:${COLORS.gray};margin-bottom:30px;max-width:300px;line-height:1.6;">
        폰 하나, 친구 여럿<br>거짓말쟁이를 찾아라!
      </p>
      <button id="btn-start" style="background:linear-gradient(135deg,${COLORS.primary},#c0392b);color:white;border:none;padding:18px 60px;border-radius:50px;font-size:20px;font-weight:700;cursor:pointer;box-shadow:0 4px 15px rgba(233,69,96,0.4);transition:transform 0.2s;margin-bottom:14px;">
        게임 시작
      </button>
      <button id="btn-rules" style="background:rgba(255,255,255,0.1);color:${COLORS.white};border:2px solid rgba(255,255,255,0.2);padding:12px 40px;border-radius:50px;font-size:16px;font-weight:700;cursor:pointer;">
        게임 방법
      </button>
      <p style="font-size:12px;color:${COLORS.gray};margin-top:20px;">2~8명 / 폰 하나로 플레이</p>
    </div>

    <div id="rules-modal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:100;display:none;align-items:center;justify-content:center;padding:20px;">
      <div style="background:${COLORS.bgLight};border-radius:20px;padding:28px 24px;max-width:360px;width:100%;text-align:center;">
        <h3 style="font-size:22px;font-weight:900;color:${COLORS.yellow};margin-bottom:20px;">게임 방법</h3>
        <div style="text-align:left;font-size:14px;line-height:2;color:${COLORS.white};">
          <p>1. 한 명이 블러퍼(거짓말쟁이)로 선정됩니다</p>
          <p>2. 블러퍼는 다른 미션을 받습니다</p>
          <p>3. 미니게임 후 투표로 블러퍼를 찾으세요</p>
          <p>4. 블러퍼를 찾으면 시민 승리, 못 찾으면 블러퍼 승리!</p>
        </div>
        <button id="btn-close-rules" style="background:${COLORS.primary};color:white;border:none;padding:12px 40px;border-radius:50px;font-size:16px;font-weight:700;cursor:pointer;margin-top:20px;">
          닫기
        </button>
      </div>
    </div>
  `;
  document.getElementById('btn-start')!.addEventListener('click', () => {
    currentPhase = 'setup';
    render();
  });
  document.getElementById('btn-rules')!.addEventListener('click', () => {
    const modal = document.getElementById('rules-modal')!;
    modal.style.display = 'flex';
  });
  document.getElementById('btn-close-rules')!.addEventListener('click', () => {
    const modal = document.getElementById('rules-modal')!;
    modal.style.display = 'none';
  });
}

function renderSetup(): void {
  const existingNames = players.map(p => p.name);
  const playerCount = Math.max(players.length, 2);

  app.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;height:100%;padding:20px;width:100%;max-width:400px;overflow-y:auto;position:relative;">
      ${getBackButtonHtml('처음으로')}
      <h2 style="font-size:24px;font-weight:900;margin:20px 0 5px;color:${COLORS.yellow};">\uD83D\uDC65 플레이어 설정</h2>
      <p style="font-size:13px;color:${COLORS.gray};margin-bottom:20px;">이름을 입력하고 게임을 시작하세요</p>
      <div id="name-error" style="color:${COLORS.primary};font-size:13px;font-weight:700;margin-bottom:8px;display:none;"></div>

      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
        <button id="btn-minus" style="background:${COLORS.secondary};color:white;border:none;width:40px;height:40px;border-radius:50%;font-size:20px;cursor:pointer;font-weight:700;">-</button>
        <span style="font-size:20px;font-weight:700;min-width:40px;text-align:center;" id="player-count">${playerCount}명</span>
        <button id="btn-plus" style="background:${COLORS.secondary};color:white;border:none;width:40px;height:40px;border-radius:50%;font-size:20px;cursor:pointer;font-weight:700;">+</button>
      </div>

      <div id="name-inputs" style="width:100%;display:flex;flex-direction:column;gap:10px;margin-bottom:20px;"></div>

      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
        <span style="font-size:14px;color:${COLORS.gray};">라운드 수:</span>
        <button id="btn-rounds-minus" style="background:${COLORS.secondary};color:white;border:none;width:36px;height:36px;border-radius:50%;font-size:18px;cursor:pointer;">-</button>
        <span id="rounds-count" style="font-size:18px;font-weight:700;min-width:30px;text-align:center;">${totalRounds}</span>
        <button id="btn-rounds-plus" style="background:${COLORS.secondary};color:white;border:none;width:36px;height:36px;border-radius:50%;font-size:18px;cursor:pointer;">+</button>
      </div>

      <button id="btn-go" style="background:linear-gradient(135deg,${COLORS.primary},#c0392b);color:white;border:none;padding:16px 50px;border-radius:50px;font-size:18px;font-weight:700;cursor:pointer;box-shadow:0 4px 15px rgba(233,69,96,0.4);margin-top:10px;">
        게임 시작!
      </button>
    </div>
  `;

  let count = playerCount;

  function buildInputs() {
    const container = document.getElementById('name-inputs')!;
    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const color = PLAYER_COLORS[i % PLAYER_COLORS.length];
      container.innerHTML += `
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:32px;height:32px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;flex-shrink:0;">${i + 1}</div>
          <input id="name-${i}" type="text" placeholder="플레이어 ${i + 1}" value="${existingNames[i] || ''}"
            class="player-input"
            style="flex:1;padding:12px 16px;border-radius:12px;border:2px solid ${COLORS.secondary};background:${COLORS.bgLight};color:white;font-size:16px;font-family:'Noto Sans KR',sans-serif;outline:none;--player-color:${color};"
            maxlength="10" />
        </div>
      `;
    }
    document.getElementById('player-count')!.textContent = `${count}명`;
  }

  buildInputs();

  document.getElementById('btn-minus')!.addEventListener('click', () => {
    if (count > 2) { count--; buildInputs(); }
  });
  document.getElementById('btn-plus')!.addEventListener('click', () => {
    if (count < 8) { count++; buildInputs(); }
  });

  document.getElementById('btn-rounds-minus')!.addEventListener('click', () => {
    if (totalRounds > 3) {
      totalRounds--;
      document.getElementById('rounds-count')!.textContent = `${totalRounds}`;
    }
  });
  document.getElementById('btn-rounds-plus')!.addEventListener('click', () => {
    if (totalRounds < 7) {
      totalRounds++;
      document.getElementById('rounds-count')!.textContent = `${totalRounds}`;
    }
  });

  document.getElementById('btn-back')!.addEventListener('click', () => {
    currentPhase = 'title';
    render();
  });

  document.getElementById('btn-go')!.addEventListener('click', () => {
    // Validate names - no empty names allowed
    let hasEmpty = false;
    for (let i = 0; i < count; i++) {
      const input = document.getElementById(`name-${i}`) as HTMLInputElement;
      if (!input.value.trim()) {
        hasEmpty = true;
        input.style.borderColor = COLORS.primary;
      } else {
        input.style.borderColor = COLORS.secondary;
      }
    }
    if (hasEmpty) {
      const errorEl = document.getElementById('name-error')!;
      errorEl.textContent = '모든 플레이어의 이름을 입력해주세요!';
      errorEl.style.display = 'block';
      return;
    }

    players = [];
    for (let i = 0; i < count; i++) {
      const input = document.getElementById(`name-${i}`) as HTMLInputElement;
      const name = input.value.trim();
      players.push({ name, score: 0, isBluffer: false, votedFor: -1 });
    }
    currentRound = 0;
    usedMiniGames = [];
    usedDrawing = [];
    usedQuiz = [];
    usedDescribe = [];
    roundHistory = [];
    startNewRound();
  });
}

function startNewRound(): void {
  currentRound++;
  if (currentRound > totalRounds) {
    currentPhase = 'finalResults';
    render();
    return;
  }
  currentMiniGame = pickMiniGame();
  assignBluffer();
  drawingCanvasData = [];
  quizAnswers = [];
  describeAnswers = [];
  voteResults = new Array(players.length).fill(0);
  currentPlayerIndex = 0;
  currentPhase = 'roundIntro';
  render();
}

function renderRoundIntro(): void {
  const mg = currentMiniGame!;
  app.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:20px;text-align:center;width:100%;background:linear-gradient(135deg,${COLORS.bg},${COLORS.secondary});position:relative;">
      ${getPhaseIndicatorHtml()}
      <div style="font-size:16px;color:${COLORS.yellow};font-weight:700;margin-bottom:8px;">라운드 ${currentRound} / ${totalRounds}</div>
      <div style="font-size:64px;margin:20px 0;">${getMiniGameEmoji(mg.type)}</div>
      <h2 style="font-size:28px;font-weight:900;margin-bottom:10px;">${getMiniGameTypeName(mg.type)}</h2>
      <p style="font-size:14px;color:${COLORS.gray};margin-bottom:8px;">카테고리: ${mg.category}</p>
      <div style="background:${COLORS.darkGray};padding:16px 24px;border-radius:16px;margin:20px 0;max-width:320px;">
        <p style="font-size:14px;color:${COLORS.gray};line-height:1.6;">
          ${mg.type === 'drawing' ? '각자 제시어를 보고 그림을 그립니다.<br>한 명은 다른 제시어를 받습니다!<br>누가 다른 그림을 그렸는지 찾아보세요.' : ''}
          ${mg.type === 'quiz' ? '모두에게 같은 질문이 주어집니다.<br>한 명은 다른 답을 받고 그걸 방어해야 합니다!<br>누가 틀린 답을 받았는지 찾아보세요.' : ''}
          ${mg.type === 'describe' ? '각자 단어를 보고 설명합니다.<br>한 명은 다른 단어를 받습니다!<br>누가 다른 단어를 설명했는지 찾아보세요.' : ''}
        </p>
      </div>
      <button id="btn-next" style="background:linear-gradient(135deg,${COLORS.primary},#c0392b);color:white;border:none;padding:16px 50px;border-radius:50px;font-size:18px;font-weight:700;cursor:pointer;margin-top:10px;box-shadow:0 4px 15px rgba(233,69,96,0.4);">
        역할 확인 시작
      </button>
    </div>
  `;
  document.getElementById('btn-next')!.addEventListener('click', () => {
    currentPlayerIndex = 0;
    currentPhase = 'passPhone';
    render();
  });
}

function renderPassPhone(): void {
  const player = players[currentPlayerIndex];
  const color = PLAYER_COLORS[currentPlayerIndex % PLAYER_COLORS.length];
  app.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:20px;text-align:center;width:100%;background:linear-gradient(135deg,${COLORS.bg},${COLORS.bgLight});">
      ${getPhaseIndicatorHtml()}
      <div style="font-size:64px;margin-bottom:20px;">\uD83D\uDCF1</div>
      <h2 style="font-size:22px;font-weight:700;margin-bottom:10px;">폰을 넘겨주세요!</h2>
      <div style="background:${color};width:80px;height:80px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:36px;font-weight:900;margin:20px 0;">${currentPlayerIndex + 1}</div>
      <p style="font-size:24px;font-weight:900;color:${color};margin-bottom:30px;">${player.name}</p>
      <p style="font-size:14px;color:${COLORS.gray};margin-bottom:30px;">준비되면 아래 버튼을 누르세요<br>다른 사람이 보지 못하게 하세요!</p>
      <button id="btn-reveal" style="background:linear-gradient(135deg,${COLORS.accent},${COLORS.secondary});color:white;border:none;padding:16px 50px;border-radius:50px;font-size:18px;font-weight:700;cursor:pointer;box-shadow:0 4px 15px rgba(83,52,131,0.4);">
        내 역할 보기 \uD83D\uDC40
      </button>
    </div>
  `;
  document.getElementById('btn-reveal')!.addEventListener('click', () => {
    currentPhase = 'roleReveal';
    render();
  });
}

function renderRoleReveal(): void {
  const player = players[currentPlayerIndex];
  const mg = currentMiniGame!;
  const isBluffer = player.isBluffer;
  const prompt = isBluffer ? mg.blufferPrompt : mg.normalPrompt;
  const color = PLAYER_COLORS[currentPlayerIndex % PLAYER_COLORS.length];

  let roleLabel = '';
  let roleInstruction = '';

  if (mg.type === 'drawing') {
    roleLabel = isBluffer ? '\uD83D\uDD75\uFE0F 블러퍼!' : '\uD83D\uDC64 시민';
    roleInstruction = isBluffer
      ? `당신은 블러퍼입니다!<br>다른 사람과 <b>다른 제시어</b>를 받았어요.<br>들키지 않게 비슷하게 그리세요!`
      : `당신은 시민입니다.<br>제시어를 보고 그림을 그려주세요.`;
  } else if (mg.type === 'quiz') {
    roleLabel = isBluffer ? '\uD83D\uDD75\uFE0F 블러퍼!' : '\uD83D\uDC64 시민';
    roleInstruction = isBluffer
      ? `당신은 블러퍼입니다!<br><b>틀린 답</b>을 받았어요.<br>자신있게 방어하세요!`
      : `당신은 시민입니다.<br>정답을 기억하세요.`;
  } else {
    roleLabel = isBluffer ? '\uD83D\uDD75\uFE0F 블러퍼!' : '\uD83D\uDC64 시민';
    roleInstruction = isBluffer
      ? `당신은 블러퍼입니다!<br><b>다른 단어</b>를 받았어요.<br>들키지 않게 설명하세요!`
      : `당신은 시민입니다.<br>단어를 기억하고 설명해주세요.`;
  }

  const bgGrad = isBluffer
    ? `linear-gradient(135deg, #c0392b, ${COLORS.primary})`
    : `linear-gradient(135deg, ${COLORS.secondary}, ${COLORS.accent})`;

  app.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:20px;text-align:center;width:100%;background:${bgGrad};">
      ${getPhaseIndicatorHtml()}
      <p style="font-size:14px;color:rgba(255,255,255,0.7);margin-bottom:5px;">${player.name}</p>
      <div style="font-size:24px;font-weight:900;margin-bottom:20px;">${roleLabel}</div>
      <div class="role-card ${isBluffer ? 'pulse-bluffer' : 'pulse-citizen'}" style="background:rgba(0,0,0,0.3);padding:20px 30px;border-radius:20px;margin-bottom:20px;max-width:300px;border:2px solid ${isBluffer ? 'rgba(233,69,96,0.4)' : 'rgba(39,174,96,0.4)'};">
        <p style="font-size:13px;color:rgba(255,255,255,0.7);margin-bottom:8px;">${mg.type === 'quiz' ? '당신의 답' : '당신의 제시어'}</p>
        <p style="font-size:36px;font-weight:900;color:${COLORS.yellow};">${prompt}</p>
      </div>
      <p style="font-size:14px;color:rgba(255,255,255,0.8);line-height:1.6;margin-bottom:30px;max-width:280px;">${roleInstruction}</p>
      <button id="btn-confirm" style="background:rgba(255,255,255,0.2);color:white;border:2px solid rgba(255,255,255,0.4);padding:16px 50px;border-radius:50px;font-size:18px;font-weight:700;cursor:pointer;backdrop-filter:blur(10px);">
        확인했어요
      </button>
    </div>
  `;

  document.getElementById('btn-confirm')!.addEventListener('click', () => {
    currentPlayerIndex++;
    if (currentPlayerIndex < players.length) {
      currentPhase = 'passPhone';
      render();
    } else {
      // All players have seen their role, start the mini game
      currentPlayerIndex = 0;
      currentPhase = 'miniGame';
      render();
    }
  });
}

function renderMiniGame(): void {
  const mg = currentMiniGame!;
  switch (mg.type) {
    case 'drawing': renderDrawingGame(); break;
    case 'quiz': renderQuizGame(); break;
    case 'describe': renderDescribeGame(); break;
  }
}

// --- Drawing Mini Game ---
function renderDrawingGame(): void {
  // If all players have drawn, go to discussion
  if (currentPlayerIndex >= players.length) {
    currentPhase = 'discussion';
    render();
    return;
  }

  // Pass phone screen for drawing
  const player = players[currentPlayerIndex];
  const color = PLAYER_COLORS[currentPlayerIndex % PLAYER_COLORS.length];

  app.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;height:100%;padding:15px;width:100%;background:${COLORS.bg};">
      ${getPhaseIndicatorHtml()}
      <div style="display:flex;justify-content:space-between;width:100%;align-items:center;margin-bottom:6px;">
        <span style="font-size:13px;color:${COLORS.gray};">라운드 ${currentRound}/${totalRounds}</span>
        <span style="font-size:13px;color:${color};font-weight:700;">${player.name}의 차례</span>
      </div>
      <div class="round-progress"><div class="round-progress-fill" style="width:${(currentRound / totalRounds) * 100}%"></div></div>
      <p style="font-size:13px;color:${COLORS.gray};margin-bottom:10px;">\uD83C\uDFA8 제시어를 기억하고 그려주세요! (30초)</p>
      <div id="timer" style="font-size:24px;font-weight:900;color:${COLORS.yellow};margin-bottom:10px;">30</div>
      <canvas id="draw-canvas" width="340" height="340" style="background:white;border-radius:12px;touch-action:none;cursor:crosshair;max-width:100%;"></canvas>
      <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;justify-content:center;">
        <button class="color-btn" data-color="#000000" style="width:32px;height:32px;border-radius:50%;background:#000;border:3px solid ${COLORS.yellow};cursor:pointer;"></button>
        <button class="color-btn" data-color="#e74c3c" style="width:32px;height:32px;border-radius:50%;background:#e74c3c;border:3px solid transparent;cursor:pointer;"></button>
        <button class="color-btn" data-color="#3498db" style="width:32px;height:32px;border-radius:50%;background:#3498db;border:3px solid transparent;cursor:pointer;"></button>
        <button class="color-btn" data-color="#27ae60" style="width:32px;height:32px;border-radius:50%;background:#27ae60;border:3px solid transparent;cursor:pointer;"></button>
        <button class="color-btn" data-color="#f39c12" style="width:32px;height:32px;border-radius:50%;background:#f39c12;border:3px solid transparent;cursor:pointer;"></button>
        <button class="color-btn" data-color="#9b59b6" style="width:32px;height:32px;border-radius:50%;background:#9b59b6;border:3px solid transparent;cursor:pointer;"></button>
        <button id="btn-clear" style="width:32px;height:32px;border-radius:50%;background:${COLORS.darkGray};border:2px solid ${COLORS.gray};cursor:pointer;font-size:14px;color:white;display:flex;align-items:center;justify-content:center;">\u2716</button>
      </div>
      <button id="btn-done" style="background:linear-gradient(135deg,${COLORS.green},#219a52);color:white;border:none;padding:14px 40px;border-radius:50px;font-size:16px;font-weight:700;cursor:pointer;margin-top:12px;box-shadow:0 4px 15px rgba(39,174,96,0.4);">
        완료
      </button>
    </div>
  `;

  const canvas = document.getElementById('draw-canvas') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d')!;
  let drawing = false;
  let currentColor = '#000000';
  let lastX = 0;
  let lastY = 0;

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 4;

  function getPos(e: TouchEvent | MouseEvent): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  canvas.addEventListener('mousedown', (e) => { drawing = true; const p = getPos(e); lastX = p.x; lastY = p.y; });
  canvas.addEventListener('mousemove', (e) => {
    if (!drawing) return;
    const p = getPos(e);
    ctx.strokeStyle = currentColor;
    ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(p.x, p.y); ctx.stroke();
    lastX = p.x; lastY = p.y;
  });
  canvas.addEventListener('mouseup', () => { drawing = false; });
  canvas.addEventListener('mouseleave', () => { drawing = false; });

  canvas.addEventListener('touchstart', (e) => { e.preventDefault(); drawing = true; const p = getPos(e); lastX = p.x; lastY = p.y; }, { passive: false });
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!drawing) return;
    const p = getPos(e);
    ctx.strokeStyle = currentColor;
    ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(p.x, p.y); ctx.stroke();
    lastX = p.x; lastY = p.y;
  }, { passive: false });
  canvas.addEventListener('touchend', () => { drawing = false; });

  document.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentColor = (btn as HTMLElement).dataset.color!;
      document.querySelectorAll('.color-btn').forEach(b => (b as HTMLElement).style.borderColor = 'transparent');
      (btn as HTMLElement).style.borderColor = COLORS.yellow;
    });
  });

  document.getElementById('btn-clear')!.addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  });

  // Timer
  let timeLeft = 30;
  const timerEl = document.getElementById('timer')!;
  const interval = setInterval(() => {
    timeLeft--;
    timerEl.textContent = `${timeLeft}`;
    if (timeLeft <= 10 && timeLeft > 5) {
      timerEl.style.color = COLORS.primary;
      timerEl.classList.add('timer-urgent');
    } else if (timeLeft <= 5) {
      timerEl.style.color = '#ff3333';
    }
    if (timeLeft <= 0) {
      clearInterval(interval);
      saveDrawingAndNext();
    }
  }, 1000);

  function saveDrawingAndNext() {
    clearInterval(interval);
    drawingCanvasData.push({ playerIndex: currentPlayerIndex, dataUrl: canvas.toDataURL() });
    currentPlayerIndex++;
    if (currentPlayerIndex < players.length) {
      // Show pass screen
      renderDrawingPassScreen();
    } else {
      currentPhase = 'discussion';
      render();
    }
  }

  document.getElementById('btn-done')!.addEventListener('click', saveDrawingAndNext);
}

function renderDrawingPassScreen(): void {
  const next = players[currentPlayerIndex];
  const color = PLAYER_COLORS[currentPlayerIndex % PLAYER_COLORS.length];
  app.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:20px;text-align:center;width:100%;background:${COLORS.bg};">
      <div style="font-size:48px;margin-bottom:20px;">\uD83D\uDCF1</div>
      <p style="font-size:18px;color:${COLORS.gray};margin-bottom:10px;">다음 플레이어에게 넘겨주세요</p>
      <div style="background:${color};width:70px;height:70px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:900;margin:15px 0;">${currentPlayerIndex + 1}</div>
      <p style="font-size:22px;font-weight:900;color:${color};margin-bottom:25px;">${next.name}</p>
      <button id="btn-ready" style="background:linear-gradient(135deg,${COLORS.accent},${COLORS.secondary});color:white;border:none;padding:16px 50px;border-radius:50px;font-size:18px;font-weight:700;cursor:pointer;">
        준비 완료
      </button>
    </div>
  `;
  document.getElementById('btn-ready')!.addEventListener('click', () => {
    currentPhase = 'miniGame';
    render();
  });
}

// --- Quiz Mini Game ---
function renderQuizGame(): void {
  const mg = currentMiniGame!;
  const question = mg.category; // category holds the full question for quiz type

  app.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:20px;text-align:center;width:100%;background:linear-gradient(135deg,${COLORS.bg},${COLORS.secondary});">
      ${getPhaseIndicatorHtml()}
      <div style="font-size:14px;color:${COLORS.yellow};margin-bottom:5px;">라운드 ${currentRound}/${totalRounds}</div>
      ${getProgressBarHtml()}
      <div style="font-size:48px;margin-bottom:15px;">\uD83E\uDDE0</div>
      <h2 style="font-size:20px;font-weight:700;margin-bottom:20px;">퀴즈 대결</h2>
      <div style="background:${COLORS.darkGray};padding:20px 24px;border-radius:16px;margin-bottom:20px;max-width:340px;">
        <p style="font-size:13px;color:${COLORS.gray};margin-bottom:8px;">질문</p>
        <p style="font-size:18px;font-weight:700;line-height:1.5;">${question.split(': ').slice(1).join(': ')}</p>
      </div>
      <div style="background:rgba(0,0,0,0.2);padding:16px 24px;border-radius:12px;margin-bottom:20px;max-width:340px;">
        <p style="font-size:13px;color:${COLORS.gray};line-height:1.6;">
          모든 플레이어가 자신이 받은 답을 발표합니다.<br>
          한 명이 다른 답을 받았다는 것을 기억하세요!<br>
          돌아가며 자신의 답이 왜 맞는지 설명하세요.
        </p>
      </div>
      <p style="font-size:14px;color:${COLORS.gray};margin-bottom:20px;">충분히 토론한 후 다음으로 진행하세요</p>
      <button id="btn-vote" style="background:linear-gradient(135deg,${COLORS.primary},#c0392b);color:white;border:none;padding:16px 50px;border-radius:50px;font-size:18px;font-weight:700;cursor:pointer;box-shadow:0 4px 15px rgba(233,69,96,0.4);">
        투표하기
      </button>
    </div>
  `;

  document.getElementById('btn-vote')!.addEventListener('click', () => {
    currentPlayerIndex = 0;
    currentPhase = 'votePassPhone';
    render();
  });
}

// --- Describe Mini Game ---
function renderDescribeGame(): void {
  const mg = currentMiniGame!;

  app.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:20px;text-align:center;width:100%;background:linear-gradient(135deg,${COLORS.bg},${COLORS.accent});">
      ${getPhaseIndicatorHtml()}
      <div style="font-size:14px;color:${COLORS.yellow};margin-bottom:5px;">라운드 ${currentRound}/${totalRounds}</div>
      ${getProgressBarHtml()}
      <div style="font-size:48px;margin-bottom:15px;">\uD83D\uDCAC</div>
      <h2 style="font-size:20px;font-weight:700;margin-bottom:20px;">설명하기</h2>
      <div style="background:rgba(0,0,0,0.3);padding:20px 24px;border-radius:16px;margin-bottom:20px;max-width:340px;">
        <p style="font-size:13px;color:rgba(255,255,255,0.7);margin-bottom:8px;">카테고리: ${mg.category}</p>
        <p style="font-size:14px;color:rgba(255,255,255,0.8);line-height:1.6;">
          각자 받은 단어를 <b>단어를 직접 말하지 않고</b> 설명합니다.<br><br>
          한 명씩 돌아가며 자신의 단어에 대해<br>한 문장씩 설명해주세요.
        </p>
      </div>
      <div style="background:rgba(255,255,255,0.1);padding:14px 20px;border-radius:12px;margin-bottom:20px;">
        <p style="font-size:13px;color:${COLORS.yellow};">진행 순서</p>
        <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;justify-content:center;">
          ${players.map((p, i) => `<span style="background:${PLAYER_COLORS[i]};padding:4px 12px;border-radius:20px;font-size:13px;font-weight:700;">${p.name}</span>`).join('')}
        </div>
      </div>
      <p style="font-size:14px;color:${COLORS.gray};margin-bottom:20px;">2~3바퀴 돌린 후 투표하세요!</p>
      <button id="btn-vote" style="background:linear-gradient(135deg,${COLORS.primary},#c0392b);color:white;border:none;padding:16px 50px;border-radius:50px;font-size:18px;font-weight:700;cursor:pointer;box-shadow:0 4px 15px rgba(233,69,96,0.4);">
        투표하기
      </button>
    </div>
  `;

  document.getElementById('btn-vote')!.addEventListener('click', () => {
    currentPlayerIndex = 0;
    currentPhase = 'votePassPhone';
    render();
  });
}

// --- Discussion (for drawing game) ---
function renderDiscussion(): void {
  const mg = currentMiniGame!;

  let galleryHtml = '';
  if (mg.type === 'drawing' && drawingCanvasData.length > 0) {
    galleryHtml = `
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;width:100%;max-width:360px;margin-bottom:20px;">
        ${drawingCanvasData.map(d => {
          const p = players[d.playerIndex];
          const c = PLAYER_COLORS[d.playerIndex % PLAYER_COLORS.length];
          return `
            <div style="text-align:center;">
              <img src="${d.dataUrl}" style="width:100%;border-radius:10px;border:3px solid ${c};" />
              <p style="font-size:13px;font-weight:700;color:${c};margin-top:4px;">${p.name}</p>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  app.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;height:100%;padding:20px;width:100%;overflow-y:auto;background:${COLORS.bg};">
      ${getPhaseIndicatorHtml()}
      <div style="font-size:14px;color:${COLORS.yellow};margin-bottom:5px;">라운드 ${currentRound}/${totalRounds}</div>
      <h2 style="font-size:22px;font-weight:900;margin-bottom:5px;">\uD83D\uDD0D 토론 시간!</h2>
      <p style="font-size:13px;color:${COLORS.gray};margin-bottom:15px;">누가 블러퍼인지 이야기해보세요</p>
      ${galleryHtml}
      <button id="btn-vote" style="background:linear-gradient(135deg,${COLORS.primary},#c0392b);color:white;border:none;padding:16px 50px;border-radius:50px;font-size:18px;font-weight:700;cursor:pointer;box-shadow:0 4px 15px rgba(233,69,96,0.4);">
        투표하기
      </button>
    </div>
  `;

  document.getElementById('btn-vote')!.addEventListener('click', () => {
    currentPlayerIndex = 0;
    currentPhase = 'votePassPhone';
    render();
  });
}

// --- Voting ---
function renderVotePassPhone(): void {
  if (currentPlayerIndex >= players.length) {
    currentPhase = 'results';
    render();
    return;
  }

  const player = players[currentPlayerIndex];
  const color = PLAYER_COLORS[currentPlayerIndex % PLAYER_COLORS.length];

  app.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:20px;text-align:center;width:100%;background:${COLORS.bg};">
      ${getPhaseIndicatorHtml()}
      <div style="font-size:48px;margin-bottom:20px;">\uD83D\uDDF3\uFE0F</div>
      <p style="font-size:16px;color:${COLORS.gray};margin-bottom:10px;">투표할 차례입니다</p>
      <div style="background:${color};width:70px;height:70px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:900;margin:15px 0;">${currentPlayerIndex + 1}</div>
      <p style="font-size:22px;font-weight:900;color:${color};margin-bottom:25px;">${player.name}</p>
      <p style="font-size:13px;color:${COLORS.gray};margin-bottom:20px;">다른 사람이 보지 못하게 하세요!</p>
      <button id="btn-vote-ready" style="background:linear-gradient(135deg,${COLORS.accent},${COLORS.secondary});color:white;border:none;padding:16px 50px;border-radius:50px;font-size:18px;font-weight:700;cursor:pointer;">
        투표하기
      </button>
    </div>
  `;

  document.getElementById('btn-vote-ready')!.addEventListener('click', () => {
    currentPhase = 'voting';
    render();
  });
}

function renderVoting(): void {
  const player = players[currentPlayerIndex];
  const color = PLAYER_COLORS[currentPlayerIndex % PLAYER_COLORS.length];

  const others = players.map((p, i) => ({ name: p.name, index: i })).filter(x => x.index !== currentPlayerIndex);

  app.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:20px;text-align:center;width:100%;background:linear-gradient(135deg,${COLORS.bg},${COLORS.secondary});">
      ${getPhaseIndicatorHtml()}
      <p style="font-size:14px;color:${color};font-weight:700;margin-bottom:5px;">${player.name}의 투표</p>
      <h2 style="font-size:22px;font-weight:900;margin-bottom:20px;">누가 블러퍼일까요?</h2>
      <div style="display:flex;flex-direction:column;gap:12px;width:100%;max-width:300px;">
        ${others.map(o => {
          const oc = PLAYER_COLORS[o.index % PLAYER_COLORS.length];
          const initials = o.name.slice(0, 1);
          return `
            <button class="vote-btn vote-btn-enhanced" data-idx="${o.index}" style="background:${COLORS.darkGray};color:white;border:3px solid ${oc};padding:14px 20px;border-radius:16px;font-size:16px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:12px;">
              <div style="width:40px;height:40px;border-radius:50%;background:${oc};display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:900;flex-shrink:0;box-shadow:0 2px 8px ${oc}44;">${initials}</div>
              ${o.name}
            </button>
          `;
        }).join('')}
      </div>
    </div>
  `;

  document.querySelectorAll('.vote-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt((btn as HTMLElement).dataset.idx!);
      (btn as HTMLElement).classList.add('vote-selected');
      (btn as HTMLElement).style.background = PLAYER_COLORS[idx % PLAYER_COLORS.length] + '33';
      players[currentPlayerIndex].votedFor = idx;
      voteResults[idx]++;
      setTimeout(() => {
        currentPlayerIndex++;
        currentPhase = 'votePassPhone';
        render();
      }, 400);
    });
  });
}

// --- Results ---
function renderResults(): void {
  const blufferIdx = players.findIndex(p => p.isBluffer);
  const bluffer = players[blufferIdx];
  const blufferColor = PLAYER_COLORS[blufferIdx % PLAYER_COLORS.length];
  const mg = currentMiniGame!;

  // Find who got most votes
  const maxVotes = Math.max(...voteResults);
  const mostVotedIdx = voteResults.indexOf(maxVotes);
  const caught = mostVotedIdx === blufferIdx && maxVotes > 0;

  // Score
  if (caught) {
    // Citizens win: everyone except bluffer gets 10 points
    players.forEach((p, i) => {
      if (i !== blufferIdx) p.score += 10;
    });
  } else {
    // Bluffer wins: bluffer gets 15 points
    bluffer.score += 15;
  }

  // Bonus for correct voters
  players.forEach(p => {
    if (p.votedFor === blufferIdx && !p.isBluffer) {
      p.score += 5;
    }
  });

  roundHistory.push({
    round: currentRound,
    type: mg.type,
    blufferIndex: blufferIdx,
    caught,
  });

  // Vote breakdown
  const voteBreakdown = players.map((p, i) => {
    if (p.votedFor === -1) return '';
    const votedName = players[p.votedFor].name;
    const correct = p.votedFor === blufferIdx;
    return `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.1);">
      <span style="color:${PLAYER_COLORS[i]};font-weight:700;">${p.name}</span>
      <span>${votedName} ${correct ? '<span style="color:#27ae60;">\u2713</span>' : '<span style="color:#e74c3c;">\u2717</span>'}</span>
    </div>`;
  }).join('');

  app.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;height:100%;padding:20px;width:100%;overflow-y:auto;background:linear-gradient(135deg,${COLORS.bg},${caught ? '#1a4a2e' : '#4a1a1a'});position:relative;">
      ${caught ? generateConfettiHtml() : ''}
      ${getPhaseIndicatorHtml()}
      <div style="font-size:14px;color:${COLORS.yellow};margin-bottom:8px;">라운드 ${currentRound} 결과</div>
      <div class="winner-announce" style="font-size:56px;margin-bottom:10px;">${caught ? '\uD83C\uDF89' : '\uD83D\uDE08'}</div>
      <h2 class="slide-up" style="font-size:24px;font-weight:900;margin-bottom:5px;color:${caught ? COLORS.green : COLORS.primary};">
        ${caught ? '블러퍼 적발!' : '블러퍼 승리!'}
      </h2>
      <p style="font-size:16px;margin-bottom:15px;">
        블러퍼는 <span style="color:${blufferColor};font-weight:900;">${bluffer.name}</span> 이었습니다!
      </p>
      <div style="background:rgba(0,0,0,0.3);padding:14px 20px;border-radius:12px;margin-bottom:15px;max-width:300px;width:100%;">
        <p style="font-size:13px;color:${COLORS.gray};margin-bottom:4px;">정답: <span style="color:${COLORS.yellow};font-weight:700;">${mg.normalPrompt}</span></p>
        <p style="font-size:13px;color:${COLORS.gray};">블러퍼: <span style="color:${COLORS.primary};font-weight:700;">${mg.blufferPrompt}</span></p>
      </div>
      <div style="background:rgba(0,0,0,0.2);padding:14px 20px;border-radius:12px;margin-bottom:15px;max-width:300px;width:100%;">
        <p style="font-size:14px;font-weight:700;margin-bottom:8px;">투표 결과</p>
        ${voteBreakdown}
      </div>
      <div style="background:rgba(0,0,0,0.2);padding:14px 20px;border-radius:12px;margin-bottom:20px;max-width:300px;width:100%;">
        <p style="font-size:14px;font-weight:700;margin-bottom:8px;">현재 점수</p>
        ${players.map((p, i) => `
          <div style="display:flex;justify-content:space-between;padding:4px 0;">
            <span style="color:${PLAYER_COLORS[i]};font-weight:700;">${p.name}</span>
            <span style="font-weight:700;">${p.score}점</span>
          </div>
        `).join('')}
      </div>
      <button id="btn-next-round" style="background:linear-gradient(135deg,${COLORS.primary},#c0392b);color:white;border:none;padding:16px 50px;border-radius:50px;font-size:18px;font-weight:700;cursor:pointer;box-shadow:0 4px 15px rgba(233,69,96,0.4);">
        ${currentRound < totalRounds ? '다음 라운드' : '최종 결과 보기'}
      </button>
    </div>
  `;

  document.getElementById('btn-next-round')!.addEventListener('click', () => {
    startNewRound();
  });
}

// --- Final Results ---
function renderFinalResults(): void {
  const sorted = players.map((p, i) => ({ ...p, originalIndex: i })).sort((a, b) => b.score - a.score);
  const winner = sorted[0];

  const medals = ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49'];
  const titles = ['파티 킹', '명탐정', '뛰어난 추리꾼', '예리한 관찰자', '참여상', '참여상', '참여상', '참여상'];

  // Stats
  const totalCaught = roundHistory.filter(r => r.caught).length;
  const totalBlufferWin = roundHistory.filter(r => !r.caught).length;

  app.innerHTML = `
    <div class="title-bg" style="display:flex;flex-direction:column;align-items:center;height:100%;padding:20px;width:100%;overflow-y:auto;position:relative;">
      ${generateConfettiHtml()}
      <div class="winner-announce" style="font-size:56px;margin:15px 0;">\uD83C\uDFC6</div>
      <h1 class="slide-up" style="font-size:28px;font-weight:900;margin-bottom:5px;background:linear-gradient(to right,${COLORS.yellow},${COLORS.orange});-webkit-background-clip:text;-webkit-text-fill-color:transparent;">최종 결과</h1>
      <p style="font-size:14px;color:${COLORS.gray};margin-bottom:20px;">${totalRounds}라운드 완료!</p>

      <div style="background:rgba(0,0,0,0.3);padding:20px;border-radius:20px;margin-bottom:15px;max-width:340px;width:100%;text-align:center;">
        <p style="font-size:48px;margin-bottom:5px;">\uD83D\uDC51</p>
        <p style="font-size:22px;font-weight:900;color:${PLAYER_COLORS[winner.originalIndex]};">${winner.name}</p>
        <p style="font-size:14px;color:${COLORS.yellow};font-weight:700;">${titles[0]} - ${winner.score}점</p>
      </div>

      <div style="width:100%;max-width:340px;display:flex;flex-direction:column;gap:8px;margin-bottom:15px;">
        ${sorted.map((p, rank) => {
          const color = PLAYER_COLORS[p.originalIndex % PLAYER_COLORS.length];
          return `
            <div style="display:flex;align-items:center;gap:12px;background:rgba(0,0,0,0.2);padding:12px 16px;border-radius:12px;border-left:4px solid ${color};">
              <span style="font-size:20px;min-width:28px;">${rank < 3 ? medals[rank] : `${rank + 1}.`}</span>
              <span style="flex:1;font-weight:700;color:${color};">${p.name}</span>
              <span style="font-size:12px;color:${COLORS.gray};">${titles[Math.min(rank, titles.length - 1)]}</span>
              <span style="font-weight:900;font-size:16px;">${p.score}</span>
            </div>
          `;
        }).join('')}
      </div>

      <div style="background:rgba(0,0,0,0.2);padding:14px 20px;border-radius:12px;margin-bottom:20px;max-width:340px;width:100%;">
        <p style="font-size:14px;font-weight:700;margin-bottom:8px;">\uD83D\uDCCA 게임 통계</p>
        <p style="font-size:13px;color:${COLORS.gray};padding:3px 0;">총 라운드: ${totalRounds}</p>
        <p style="font-size:13px;color:${COLORS.green};padding:3px 0;">블러퍼 적발: ${totalCaught}회</p>
        <p style="font-size:13px;color:${COLORS.primary};padding:3px 0;">블러퍼 승리: ${totalBlufferWin}회</p>
      </div>

      <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;">
        <button id="btn-again" style="background:linear-gradient(135deg,${COLORS.primary},#c0392b);color:white;border:none;padding:16px 40px;border-radius:50px;font-size:16px;font-weight:700;cursor:pointer;box-shadow:0 4px 15px rgba(233,69,96,0.4);">
          다시 하기
        </button>
        <button id="btn-home" style="background:rgba(255,255,255,0.1);color:white;border:2px solid rgba(255,255,255,0.3);padding:16px 40px;border-radius:50px;font-size:16px;font-weight:700;cursor:pointer;">
          처음으로
        </button>
      </div>
    </div>
  `;

  document.getElementById('btn-again')!.addEventListener('click', () => {
    // Reset scores, keep players
    players.forEach(p => { p.score = 0; p.isBluffer = false; p.votedFor = -1; });
    currentRound = 0;
    usedMiniGames = [];
    usedDrawing = [];
    usedQuiz = [];
    usedDescribe = [];
    roundHistory = [];
    startNewRound();
  });

  document.getElementById('btn-home')!.addEventListener('click', () => {
    players = [];
    currentRound = 0;
    currentPhase = 'title';
    render();
  });
}

// --- Init ---
render();
