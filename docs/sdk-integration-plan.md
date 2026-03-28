# SDK Integration Plan — 10 Games

## Phase Overview

```
Phase 1: 로그인 + 점수 저장 (모든 게임)
Phase 2: 리더보드 (8개 게임)
Phase 3: 클라우드 세이브 (7개 게임)
Phase 4: 멀티플레이어 (4개 게임)
```

---

## Phase 1: 로그인 + 점수 저장

모든 게임에 SDK 초기화 + 점수 제출을 추가합니다. 기존 localStorage는 유지하고, 로그인 시 클라우드에도 저장합니다.

### 공통 작업
- 각 게임에 `@playground/sdk` 의존성 추가
- 게임 메뉴에 로그인 버튼 (우측 상단, 작게)
- 게임 종료/클리어 시 `sdk.scores.submit()` 호출
- 로그인 안 해도 게임 100% 동작 (오프라인 우선)

### 게임별 점수 스키마

| Game | score | grade | metadata |
|------|-------|-------|----------|
| **korean-word-puzzle** | 시도 횟수 (1-6, 낮을수록 좋음) | — | `{ puzzleNumber, guesses, streak, timeMs }` |
| **beat-drop** | 게임 점수 (높을수록 좋음) | S/A/B/C | `{ song, difficulty, maxCombo, accuracy, perfect, great, good, miss }` |
| **bluff-party** | 총 획득 점수 | — | `{ rounds, players, wins, blufferWins }` |
| **infinite-mosaic** | 미적 점수 × 100 | — | `{ difficulty, mode, symmetry, harmony, coherence, timeSeconds }` |
| **draw-alive** | 스테이지 × 별 합산 | — | `{ stageId, stars, inkUsed, timeMs }` |
| **one-hand-fortress** | 클리어 스테이지 번호 | — | `{ stage, wavesCleared, healthRemaining, goldEarned }` |
| **destruction-sandbox** | 파괴 점수 | ★~★★★ | `{ stageId, destructionRate, chainCount, perfectChain, stars }` |
| **roguelike-deckbuilder** | 런 점수 | — | `{ character, floorsCleared, victory, totalDamage, turnsPlayed }` |
| **whisper-garden** | 미적 점수 | — | `{ plantsGrown, level, uniqueSpecies, gardenAge }` |
| **pocket-biome** | 발견 수 | — | `{ discoveries, speciesCount, longestSpeciesSurvival, simulationDays }` |

---

## Phase 2: 리더보드

점수 저장 후 리더보드 UI를 추가합니다. 8개 게임 (whisper-garden, pocket-biome 제외 — 솔로 힐링 게임).

### 리더보드 기준

| Game | 정렬 기준 | 표시 형식 |
|------|---------|---------|
| **korean-word-puzzle** | 평균 시도 횟수 (낮을수록 ↑) | "평균 2.3회 · 42연승" |
| **beat-drop** | 곡별 최고점 (높을수록 ↑) | "9,500점 · S등급 · 142콤보" |
| **bluff-party** | 총 승리 수 (높을수록 ↑) | "15승 · 승률 72%" |
| **infinite-mosaic** | 미적 점수 (높을수록 ↑) | "9,850점 · Hard · 3분 12초" |
| **draw-alive** | 총 별 수 (높을수록 ↑) | "★45/60 · 20스테이지 클리어" |
| **one-hand-fortress** | 최고 스테이지 (높을수록 ↑) | "Stage 23 · HP 18/20" |
| **destruction-sandbox** | 스테이지 총점 (높을수록 ↑) | "156,000점 · 완파 12개" |
| **roguelike-deckbuilder** | 최고 런 점수 (높을수록 ↑) | "12,500점 · 3막 클리어" |

### UI 위치
- 메인 메뉴에 🏆 리더보드 버튼 추가
- 리더보드 화면: 탭(전체 / 친구) + TOP 20 + 내 순위

---

## Phase 3: 클라우드 세이브

로그인 유저의 게임 진행을 클라우드에 저장합니다. 7개 게임 (bluff-party 제외 — 세션 게임, beat-drop 일부, infinite-mosaic 갤러리만).

### 세이브 대상

| Game | 세이브 데이터 | 기존 localStorage 키 | 슬롯 |
|------|-------------|---------------------|------|
| **korean-word-puzzle** | 통계 + 현재 퍼즐 상태 | `hangul-puzzle-stats`, `hangul-puzzle-state` | 1 |
| **beat-drop** | 곡별 최고 기록 | (없음 → 새로 추가) | 1 |
| **infinite-mosaic** | 갤러리 데이터 | `infinite-mosaic-gallery` | 1 |
| **draw-alive** | 스테이지 진행도 | `drawAlive_progress` | 1 |
| **one-hand-fortress** | 스테이지 진행도 | `ohf_progress` | 1 |
| **destruction-sandbox** | 캠페인 진행도 + 통계 | `destruction_sandbox_save` | 1 |
| **roguelike-deckbuilder** | 진행 중 런 + 커리어 통계 | `card_tower_save` | 3 |
| **whisper-garden** | 정원 전체 상태 | `whisper-garden-save` | 1 |
| **pocket-biome** | 시뮬레이션 전체 상태 | `pocket_biome_save` | 1 |

### 동기화 전략
1. 로그인 시 클라우드 세이브를 확인
2. 로컬 세이브와 비교 (updatedAt 기준)
3. 더 최신인 것을 사용, 충돌 시 사용자 선택 UI
4. 로그아웃 시 로컬 세이브는 유지

---

## Phase 4: 멀티플레이어

WebSocket 기반 실시간 또는 비동기 대전을 지원합니다. 4개 게임.

### 4-1. korean-word-puzzle — 비동기 대결

```
방식: 같은 단어를 동시에 풀고 결과 비교
흐름:
  1. 초대 코드 생성 (시드 인코딩)
  2. 상대방 입장
  3. 각자 퍼즐 풀기 (독립)
  4. 완료 시 결과 비교 화면
  5. SNS 공유 카드 생성

WebSocket 필요: 아니오 (시드 기반, 결과만 비교)
구현: 초대 링크에 시드 + 상대 userId 인코딩
```

### 4-2. beat-drop — 실시간 듀엣/대결

```
방식: 같은 곡을 동시에 플레이, 실시간 점수 비교
흐름:
  1. 방 생성 → 초대 코드 공유
  2. 상대방 입장 → 3-2-1 동시 시작
  3. 실시간으로 상대 점수/콤보 표시 (화면 상단 바)
  4. 곡 끝나면 결과 비교

WebSocket: 필수
메시지: { type: 'score_update', score, combo, judgment }
주기: 판정마다 (초당 ~4-8회)
```

### 4-3. bluff-party — 온라인 멀티플레이

```
방식: 같은 방에 접속하여 원격 파티 게임
흐름:
  1. 호스트가 방 생성
  2. 참가자들이 초대 코드로 입장
  3. 각자 기기에서 역할 확인 (폰 전달 불필요)
  4. 미니게임은 각자 기기에서 수행
  5. 투표도 각자 기기에서

WebSocket: 필수
메시지:
  - { type: 'game_state', phase, round, ... }  (호스트 → 전체)
  - { type: 'role_ack' }  (플레이어 → 호스트)
  - { type: 'mini_result', data }  (플레이어 → 호스트)
  - { type: 'vote', target }  (플레이어 → 호스트)
복잡도: 높음 (호스트-클라이언트 아키텍처)
```

### 4-4. one-hand-fortress — 비동기 챌린지

```
방식: 같은 스테이지, 같은 시드로 플레이 후 결과 비교
흐름:
  1. "챌린지" 버튼 → 주간 시드 기반 스테이지 생성
  2. 각자 플레이
  3. 결과 제출 (남은 HP, 골드, 클리어 웨이브)
  4. 주간 리더보드에서 비교

WebSocket 필요: 아니오 (비동기 점수 비교)
구현: 주간 시드 + 리더보드 API
```

---

## 우선순위 매트릭스

```
높음 ████████████████  Phase 1: 로그인 + 점수 (전체 10개)
높음 ████████████████  Phase 2: 리더보드 (8개)
중간 ████████████      Phase 3: 클라우드 세이브 (9개)
낮음 ████████          Phase 4-1: korean-word-puzzle 대결 (시드 기반)
낮음 ████████          Phase 4-4: one-hand-fortress 챌린지 (비동기)
중간 ████████████      Phase 4-2: beat-drop 듀엣 (WebSocket)
높음 ████████████████  Phase 4-3: bluff-party 온라인 (WebSocket)
```

### 구현 순서 제안

1. **SDK 기반 작업** (Phase 1-3): 모든 게임에 일괄 적용, 병렬 가능
2. **비동기 대전** (Phase 4-1, 4-4): API만으로 구현, WebSocket 불필요
3. **실시간 대전** (Phase 4-2, 4-3): WebSocket 필요, 개별 구현

---

## 각 게임 변경 사항 요약

| Game | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
|------|---------|---------|---------|---------|
| korean-word-puzzle | ✅ 점수 제출 | ✅ 평균 시도 | ✅ 통계 동기화 | ✅ 비동기 대결 |
| beat-drop | ✅ 점수 제출 | ✅ 곡별 최고점 | ✅ 기록 저장 신규 | ✅ 실시간 듀엣 |
| bluff-party | ✅ 점수 제출 | ✅ 승률 | — (세션 게임) | ✅ 온라인 멀티 |
| infinite-mosaic | ✅ 점수 제출 | ✅ 미적 점수 | ✅ 갤러리 동기화 | — |
| draw-alive | ✅ 점수 제출 | ✅ 총 별 수 | ✅ 진행도 동기화 | — |
| one-hand-fortress | ✅ 점수 제출 | ✅ 최고 스테이지 | ✅ 진행도 동기화 | ✅ 비동기 챌린지 |
| destruction-sandbox | ✅ 점수 제출 | ✅ 스테이지 총점 | ✅ 캠페인 동기화 | — |
| roguelike-deckbuilder | ✅ 점수 제출 | ✅ 최고 런 점수 | ✅ 런 세이브 (3슬롯) | — |
| whisper-garden | ✅ 점수 제출 | — (솔로) | ✅ 정원 동기화 | — |
| pocket-biome | ✅ 점수 제출 | — (솔로) | ✅ 시뮬 동기화 | — |
