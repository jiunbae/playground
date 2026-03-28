import Phaser from 'phaser';
import { COLORS, GAME_WIDTH, GAME_HEIGHT } from '../utils/constants';
import { UIHelper } from '../ui/UIHelper';
import { gameState } from '../systems/GameState';
import { DungeonMap } from '../systems/MapGenerator';
import { ALL_CARDS, createCardInstance } from '../data/cards';

interface EventChoice {
  text: string;
  action: () => void;
}

interface GameEvent {
  title: string;
  description: string;
  icon: string;
  choices: EventChoice[];
}

export class EventScene extends Phaser.Scene {
  private map!: DungeonMap;

  constructor() {
    super({ key: 'Event' });
  }

  init(data: { map: DungeonMap }): void {
    this.map = data.map;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.BG_PRIMARY);
    const run = gameState.run!;

    const event = this.pickEvent();

    // Title
    this.add.text(GAME_WIDTH / 2, 100, event.icon, {
      fontSize: '64px',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 180, event.title, {
      fontSize: '28px', fontFamily: 'sans-serif', color: COLORS.ACCENT_HEX, fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 240, event.description, {
      fontSize: '16px', fontFamily: 'sans-serif', color: COLORS.TEXT_HEX,
      wordWrap: { width: 500 }, align: 'center',
    }).setOrigin(0.5);

    // Current stats
    this.add.text(GAME_WIDTH / 2, 320, `❤️ HP: ${run.hp}/${run.maxHp}  🪙 골드: ${run.gold}`, {
      fontSize: '14px', fontFamily: 'sans-serif', color: '#888888',
    }).setOrigin(0.5);

    // Choices
    let yPos = 400;
    for (const choice of event.choices) {
      UIHelper.createButton(this, GAME_WIDTH / 2, yPos, 420, 55,
        choice.text, () => {
          choice.action();
          gameState.saveToLocalStorage();
          this.scene.start('DungeonMap', { map: this.map });
        }, COLORS.BUTTON, 16);
      yPos += 70;
    }

    UIHelper.fadeIn(this);
  }

  private pickEvent(): GameEvent {
    const run = gameState.run!;
    const rng = run.rng;

    const events: GameEvent[] = [
      {
        title: '수상한 상인',
        description: '후드를 쓴 상인이 어둠 속에서 다가옵니다.\n"특별한 거래를 해볼까?"',
        icon: '🧙',
        choices: [
          {
            text: '💰 HP의 10%를 지불하고 무작위 카드 획득',
            action: () => {
              const hpCost = Math.max(1, Math.floor(run.maxHp * 0.1));
              gameState.damagePlayer(hpCost);
              const pool = ALL_CARDS.filter(c => c.rarity !== 'common' && c.id !== 'strike' && c.id !== 'defend');
              const card = rng.pick(pool);
              gameState.addCardToDeck(createCardInstance(card));
            },
          },
          {
            text: '🪙 30 골드를 지불하고 HP 20% 회복',
            action: () => {
              if (run.gold >= 30) {
                run.gold -= 30;
                gameState.healPlayer(Math.floor(run.maxHp * 0.2));
              }
            },
          },
          {
            text: '무시하고 지나간다',
            action: () => { /* nothing */ },
          },
        ],
      },
      {
        title: '신비로운 제단',
        description: '고대의 제단이 은은한 빛을 내뿜고 있습니다.\n무언가를 바칠 것을 요구하는 것 같습니다.',
        icon: '🏛️',
        choices: [
          {
            text: '🩸 HP 15를 바치고 최대 HP +5 영구 증가',
            action: () => {
              if (run.hp > 15) {
                gameState.damagePlayer(15);
                run.maxHp += 5;
              }
            },
          },
          {
            text: '🪙 50 골드를 바치고 덱에서 카드 1장 제거',
            action: () => {
              if (run.gold >= 50 && run.deck.length > 5) {
                run.gold -= 50;
                // Remove a random basic card
                const basics = run.deck.filter(c => c.data.id === 'strike' || c.data.id === 'defend');
                if (basics.length > 0) {
                  const toRemove = rng.pick(basics);
                  gameState.removeCardFromDeck(toRemove.instanceId);
                }
              }
            },
          },
          {
            text: '기도를 올린다 (HP 10 회복)',
            action: () => {
              gameState.healPlayer(10);
            },
          },
        ],
      },
      {
        title: '갈림길의 정령',
        description: '"여행자여, 나는 이 탑의 정령이다.\n하나의 선물을 줄 수 있다."',
        icon: '🧚',
        choices: [
          {
            text: '⚡ 힘의 축복 (무작위 공격 카드 획득)',
            action: () => {
              const attackCards = ALL_CARDS.filter(c => c.role === 'attack' && c.id !== 'strike');
              if (attackCards.length > 0) {
                const card = rng.pick(attackCards);
                gameState.addCardToDeck(createCardInstance(card));
              }
            },
          },
          {
            text: '🛡️ 수호의 축복 (무작위 스킬 카드 획득)',
            action: () => {
              const skillCards = ALL_CARDS.filter(c => c.role === 'skill' && c.id !== 'defend');
              if (skillCards.length > 0) {
                const card = rng.pick(skillCards);
                gameState.addCardToDeck(createCardInstance(card));
              }
            },
          },
          {
            text: '💰 금화의 축복 (골드 40~80 획득)',
            action: () => {
              gameState.addGold(rng.nextInt(40, 80));
            },
          },
        ],
      },
      {
        title: '버려진 도서관',
        description: '먼지 쌓인 책장 사이에서 오래된 마법서를 발견했습니다.\n한 권을 가져갈 수 있을 것 같습니다.',
        icon: '📚',
        choices: [
          {
            text: '📖 마법서를 읽는다 (무작위 카드 업그레이드)',
            action: () => {
              const upgradeable = run.deck.filter(c => !c.upgraded);
              if (upgradeable.length > 0) {
                const card = rng.pick(upgradeable);
                card.upgraded = true;
              }
            },
          },
          {
            text: '🔍 더 깊이 탐색한다 (레어 카드 획득, HP -8)',
            action: () => {
              const rareCards = ALL_CARDS.filter(c => c.rarity === 'rare');
              if (rareCards.length > 0 && run.hp > 8) {
                gameState.damagePlayer(8);
                const card = rng.pick(rareCards);
                gameState.addCardToDeck(createCardInstance(card));
              }
            },
          },
          {
            text: '조용히 떠난다',
            action: () => { /* nothing */ },
          },
        ],
      },
      {
        title: '함정의 방',
        description: '바닥이 갑자기 무너지며 함정이 작동합니다!\n빠르게 대처해야 합니다.',
        icon: '⚠️',
        choices: [
          {
            text: '🏃 민첩하게 회피한다 (50% 확률, 성공 시 보물)',
            action: () => {
              if (rng.next() < 0.5) {
                gameState.addGold(rng.nextInt(30, 60));
              } else {
                gameState.damagePlayer(rng.nextInt(8, 15));
              }
            },
          },
          {
            text: '🛡️ 방어 자세로 버틴다 (HP -5, 확정)',
            action: () => {
              gameState.damagePlayer(5);
            },
          },
          {
            text: '🔙 뒤로 물러난다 (안전하게 탈출)',
            action: () => { /* nothing */ },
          },
        ],
      },
      {
        title: '떠돌이 전사',
        description: '"나와 한판 겨루지 않겠나?\n이기면 내 검술의 비밀을 알려주지."',
        icon: '⚔️',
        choices: [
          {
            text: '⚔️ 도전한다 (HP -10, 무작위 카드 2장 획득)',
            action: () => {
              if (run.hp > 10) {
                gameState.damagePlayer(10);
                for (let i = 0; i < 2; i++) {
                  const pool = ALL_CARDS.filter(c => c.id !== 'strike' && c.id !== 'defend');
                  const card = rng.pick(pool);
                  gameState.addCardToDeck(createCardInstance(card));
                }
              }
            },
          },
          {
            text: '🍺 함께 술을 마신다 (HP 8 회복, 골드 -15)',
            action: () => {
              gameState.healPlayer(8);
              if (run.gold >= 15) run.gold -= 15;
            },
          },
          {
            text: '정중히 거절한다',
            action: () => { /* nothing */ },
          },
        ],
      },
    ];

    return rng.pick(events);
  }
}
