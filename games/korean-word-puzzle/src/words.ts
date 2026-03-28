/**
 * Korean word database
 * 2-syllable common Korean words for the puzzle game
 */

/** Easy words - common daily vocabulary */
export const EASY_WORDS: readonly string[] = [
  '사랑', '행복', '가족', '친구', '학교', '선생', '공부', '운동', '바다', '하늘',
  '노래', '음악', '영화', '사진', '여행', '공원', '도서', '시장', '병원', '약국',
  '커피', '우유', '빵집', '과일', '야채', '김치', '라면', '국밥', '치킨', '피자',
  '엄마', '아빠', '언니', '오빠', '동생', '아기', '이모', '삼촌', '조카', '사촌',
  '봄날', '여름', '가을', '겨울', '태양', '달빛', '별빛', '구름', '바람', '눈물',
  '사과', '포도', '딸기', '수박', '참외', '귤껍', '감자', '고구', '양파', '마늘',
  '소나', '참나', '벚꽃', '장미', '백합', '튤립', '국화', '연꽃', '해바', '민들',
  '강아', '고양', '토끼', '거북', '코끼', '호랑', '사자', '판다', '펭귄', '돌고',
  '의자', '책상', '침대', '거울', '시계', '전화', '안경', '가방', '지갑', '열쇠',
  '주방', '거실', '욕실', '현관', '지붕', '마당', '정원', '베란', '창문', '문짝',
  '아침', '점심', '저녁', '새벽', '오후', '정오', '오전', '자정', '낮잠', '밤새',
  '오늘', '내일', '어제', '모레', '올해', '작년', '내년', '이번', '다음', '지난',
  '서울', '부산', '대구', '인천', '광주', '대전', '울산', '제주', '세종', '수원',
] as const;

/** Normal words - general vocabulary */
export const NORMAL_WORDS: readonly string[] = [
  '경제', '정치', '사회', '문화', '과학', '기술', '교육', '환경', '건강', '안전',
  '도시', '농촌', '교통', '통신', '금융', '무역', '산업', '자원', '법률', '외교',
  '역사', '철학', '예술', '문학', '체육', '종교', '언어', '수학', '물리', '화학',
  '의사', '기자', '작가', '배우', '감독', '화가', '가수', '요리', '경찰', '판사',
  '시간', '공간', '자유', '평화', '정의', '진실', '희망', '용기', '지혜', '이상',
  '미래', '현재', '과거', '전통', '현대', '세계', '국가', '민족', '인간', '생명',
  '성공', '실패', '노력', '결과', '원인', '방법', '목표', '계획', '실행', '평가',
  '감사', '존경', '신뢰', '소통', '협력', '도전', '열정', '성장', '변화', '혁신',
  '약속', '비밀', '추억', '이별', '만남', '운명', '기적', '기억', '감정', '표현',
  '고민', '갈등', '위기', '기회', '선택', '책임', '의무', '권리', '질서', '규칙',
  '상상', '꿈길', '현실', '이론', '실험', '연구', '발견', '발명', '개발', '설계',
  '디자', '제품', '서비', '고객', '마케', '전략', '분석', '보고', '발표', '토론',
  '식당', '카페', '호텔', '극장', '미술', '박물', '도서', '체육', '놀이', '동물',
  '산책', '등산', '캠핑', '낚시', '독서', '요가', '명상', '달리', '수영', '스키',
  '결혼', '취업', '졸업', '입학', '퇴직', '승진', '이사', '여행', '축제', '생일',
] as const;

/** Hard words - less common vocabulary */
export const HARD_WORDS: readonly string[] = [
  '형이', '인식', '존재', '현상', '해석', '구조', '실존', '합리', '경험', '실용',
  '양자', '상대', '열역', '전자', '유체', '미분', '적분', '확률', '선형', '위상',
  '분자', '유전', '면역', '신경', '생태', '고고', '인류', '심리', '언론', '복지',
  '헌법', '행정', '민사', '형사', '국제', '거시', '미시', '통화', '재정', '관세',
  '초전', '반도', '나노', '광학', '섬유', '패러', '역설', '모순', '함축', '은유',
] as const;

/** All valid guess words (answers + additional accepted words) */
const EXTRA_VALID_WORDS: readonly string[] = [
  '가나', '다라', '마바', '사아', '자차', '카타', '파하',
  '나라', '도시', '마을', '우리', '그것', '이것', '저것',
  '아침', '점심', '저녁', '새벽', '오후', '정오', '밤에',
  '오늘', '내일', '어제', '모레', '올해', '작년', '내년',
  '월요', '화요', '수요', '목요', '금요', '토요', '일요',
  '하나', '둘째', '셋째', '넷째', '다섯', '여섯', '일곱',
  '빨강', '주황', '노랑', '초록', '파랑', '보라', '분홍',
  '하양', '검정', '회색', '갈색', '남색', '금색', '은색',
  '사과', '포도', '바나', '딸기', '수박', '참외', '복숭',
  '고기', '생선', '채소', '곡식', '소금', '설탕', '간장',
  '서울', '부산', '대구', '인천', '광주', '대전', '울산',
  '제주', '강원', '경기', '충청', '전라', '경상', '세종',
  '컴퓨', '스마', '인터', '모니', '키보', '마우', '프린',
  '자동', '비행', '기차', '버스', '택시', '지하', '선박',
  '축구', '야구', '농구', '배구', '테니', '탁구', '수영',
  '독서', '영어', '일본', '중국', '미국', '영국', '독일',
] as const;

const ALL_WORDS_SET = new Set<string>([
  ...EASY_WORDS,
  ...NORMAL_WORDS,
  ...HARD_WORDS,
  ...EXTRA_VALID_WORDS,
]);

/** Default word length (2 syllables) */
export const WORD_LENGTH = 2;

/** Check if a word is valid for guessing - any 2-syllable Hangul is accepted */
export function isValidWord(word: string): boolean {
  if (word.length !== WORD_LENGTH) return false;
  for (const ch of word) {
    const code = ch.charCodeAt(0);
    if (code < 0xAC00 || code > 0xD7A3) return false;
  }
  return true; // Accept any valid Hangul combination as a guess
}

/** Get the word pool for a difficulty level */
function getPool(difficulty: number): readonly string[] {
  switch (difficulty) {
    case 1: return EASY_WORDS;
    case 3: return HARD_WORDS;
    default: return NORMAL_WORDS;
  }
}

/** Get day-of-week difficulty (1=easy, 2=normal, 3=hard) */
function getDayDifficulty(date: Date): number {
  const day = date.getDay(); // 0=Sunday
  switch (day) {
    case 1: return 1; // Monday: easy
    case 2:
    case 3:
    case 4: return 2; // Tue-Thu: normal
    case 5: return 3; // Friday: hard
    case 6: return 2; // Saturday: theme (normal)
    case 0: return 1; // Sunday: easy
    default: return 2;
  }
}

/** Seeded PRNG (xorshift32) */
class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed | 0;
    if (this.state === 0) this.state = 1;
  }

  nextInt(max: number): number {
    this.state ^= this.state << 13;
    this.state ^= this.state >> 17;
    this.state ^= this.state << 5;
    return Math.abs(this.state) % max;
  }
}

/** Create a date-based seed */
function dateSeed(date: Date): number {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
}

/** Get today's puzzle word */
export function getDailyWord(date: Date = new Date()): string {
  const seed = dateSeed(date);
  const difficulty = getDayDifficulty(date);
  const rng = new SeededRandom(seed);
  const pool = getPool(difficulty);
  const index = rng.nextInt(pool.length);
  return pool[index];
}

/** Get a random word for practice mode */
export function getRandomWord(seed: number, difficulty: number = 2): string {
  const rng = new SeededRandom(seed);
  const pool = getPool(difficulty);
  return pool[rng.nextInt(pool.length)];
}

/** Get puzzle number (days since epoch) */
export function getPuzzleNumber(date: Date = new Date()): number {
  const epoch = new Date(2026, 0, 1); // Jan 1, 2026
  const diff = date.getTime() - epoch.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}
