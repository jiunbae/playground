import { TOOLS } from '../game/Tools.js';
import { CHAPTERS, LEVELS, getChapterLevels, SANDBOX_STRUCTURES } from '../game/Levels.js';

// --- Leaderboard ---
const DS_LEADERBOARD_KEY = 'playground_destruction-sandbox_leaderboard';
const DS_LEADERBOARD_MAX = 50;

function loadDSLeaderboard() {
  try {
    const data = localStorage.getItem(DS_LEADERBOARD_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

function saveToDSLeaderboard(entry) {
  const entries = loadDSLeaderboard();
  entries.push(entry);
  entries.sort((a, b) => b.totalScore - a.totalScore);
  if (entries.length > DS_LEADERBOARD_MAX) entries.length = DS_LEADERBOARD_MAX;
  localStorage.setItem(DS_LEADERBOARD_KEY, JSON.stringify(entries));
}

function showDSLeaderboard() {
  if (document.getElementById('ds-leaderboard-overlay')) return;

  const all = loadDSLeaderboard();
  const top10 = all.sort((a, b) => b.totalScore - a.totalScore).slice(0, 10);

  let myName = '나';
  try {
    const sdk = window.__sdk;
    if (sdk) { const u = sdk.auth.getUser(); if (u) myName = u.name; }
  } catch {}
  const myIdx = all.findIndex(e => e.name === myName);

  const rowsHtml = top10.length > 0
    ? top10.map((e, i) => `
      <tr style="${e.name === myName ? 'background:rgba(255,204,0,0.15);' : ''}">
        <td style="padding:6px 8px;text-align:center;font-weight:bold;">${i + 1}</td>
        <td style="padding:6px 8px;">${e.name}</td>
        <td style="padding:6px 8px;text-align:center;">${e.totalScore.toLocaleString()}</td>
        <td style="padding:6px 8px;text-align:center;">${'⭐'.repeat(Math.min(e.stars || 0, 5))}</td>
        <td style="padding:6px 8px;text-align:center;">${e.stagesCleared || 0}</td>
        <td style="padding:6px 8px;text-align:center;font-size:11px;color:rgba(255,255,255,0.5);">${new Date(e.timestamp).toLocaleDateString('ko-KR')}</td>
      </tr>`).join('')
    : '<tr><td colspan="6" style="padding:20px;text-align:center;color:rgba(255,255,255,0.5);">아직 기록이 없습니다</td></tr>';

  const myRankHtml = myIdx >= 0
    ? `<div style="margin-top:12px;padding:8px;background:rgba(255,204,0,0.1);border-radius:8px;font-size:13px;"><strong>내 순위:</strong> ${myIdx + 1}위 | ${all[myIdx].totalScore.toLocaleString()}점</div>`
    : '';

  const overlay = document.createElement('div');
  overlay.id = 'ds-leaderboard-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:2000;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;';
  overlay.innerHTML = `
    <div style="background:linear-gradient(180deg,#0a0e27,#1a2380);border:1px solid rgba(255,64,129,0.4);border-radius:16px;padding:24px;max-width:500px;width:90%;max-height:80vh;overflow-y:auto;color:#fff;font-family:'Black Han Sans',sans-serif;">
      <h2 style="margin:0 0 12px;text-align:center;font-size:24px;">🏆 리더보드</h2>
      <table style="width:100%;border-collapse:collapse;font-size:13px;font-family:sans-serif;">
        <thead><tr style="border-bottom:2px solid rgba(255,255,255,0.2);">
          <th style="padding:6px 8px;">순위</th><th style="padding:6px 8px;text-align:left;">이름</th>
          <th style="padding:6px 8px;">총점</th><th style="padding:6px 8px;">별</th>
          <th style="padding:6px 8px;">클리어</th><th style="padding:6px 8px;">날짜</th>
        </tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      ${myRankHtml}
      <button id="ds-lb-close" style="display:block;margin:16px auto 0;padding:10px 32px;border:none;border-radius:8px;background:linear-gradient(135deg,#FF4081,#FF1744);color:#fff;font-size:16px;cursor:pointer;font-family:'Black Han Sans',sans-serif;">닫기</button>
    </div>`;

  document.body.appendChild(overlay);
  document.getElementById('ds-lb-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

export { saveToDSLeaderboard };

export class UI {
  constructor(container) {
    this.container = container;
    this.currentScreen = null;
    this.callbacks = {};
    this.elements = {};
  }

  on(event, cb) {
    this.callbacks[event] = cb;
  }

  _emit(event, ...args) {
    if (this.callbacks[event]) this.callbacks[event](...args);
  }

  clear() {
    this.container.innerHTML = '';
    this.container.style.pointerEvents = 'none';
  }

  // === MAIN MENU ===
  showMainMenu() {
    this.currentScreen = 'menu';
    this.clear();
    this.container.innerHTML = `
      <div style="
        position:absolute; top:0; left:0; width:100%; height:100%;
        display:flex; flex-direction:column; align-items:center; justify-content:center;
        background: linear-gradient(180deg, rgba(10,14,39,0.95) 0%, rgba(26,35,126,0.95) 100%);
        pointer-events:auto;
      ">
        <h1 style="
          font-family:'Black Han Sans',sans-serif; font-size:52px; color:#fff;
          text-shadow: 0 0 40px rgba(255,64,129,0.6), 0 4px 8px rgba(0,0,0,0.5);
          margin-bottom:4px;
        ">부숴볼래?</h1>
        <p style="color:rgba(255,255,255,0.5); font-size:13px; margin-bottom:48px; letter-spacing:2px;">
          DESTRUCTION SANDBOX
        </p>

        <button id="btn-campaign" class="menu-btn" style="
          width:280px; padding:16px 16px 12px; margin:6px; border:none; border-radius:14px;
          font-family:'Black Han Sans',sans-serif; font-size:20px;
          background: linear-gradient(135deg, #FF4081, #FF1744); color:#fff;
          box-shadow: 0 4px 20px rgba(255,64,129,0.4);
          cursor:pointer; transition: transform 0.15s;
          display:flex; flex-direction:column; align-items:center;
        ">
          <span>🔥 체인 마스터</span>
          <span style="font-size:12px; opacity:0.8; margin-top:4px; font-family:sans-serif; font-weight:normal;">60개 스테이지를 클리어하세요</span>
        </button>

        <button id="btn-sandbox" class="menu-btn" style="
          width:280px; padding:16px 16px 12px; margin:6px; border:none; border-radius:14px;
          font-family:'Black Han Sans',sans-serif; font-size:20px;
          background: linear-gradient(135deg, #7C4DFF, #536DFE); color:#fff;
          box-shadow: 0 4px 20px rgba(124,77,255,0.4);
          cursor:pointer; transition: transform 0.15s;
          display:flex; flex-direction:column; align-items:center;
        ">
          <span>💥 자유 파괴</span>
          <span style="font-size:12px; opacity:0.8; margin-top:4px; font-family:sans-serif; font-weight:normal;">자유롭게 파괴하세요</span>
        </button>

        <button id="btn-sandbox-build" class="menu-btn" style="
          width:280px; padding:16px 16px 12px; margin:6px; border:none; border-radius:14px;
          font-family:'Black Han Sans',sans-serif; font-size:20px;
          background: linear-gradient(135deg, #00BCD4, #0097A7); color:#fff;
          box-shadow: 0 4px 20px rgba(0,188,212,0.4);
          cursor:pointer; transition: transform 0.15s;
          display:flex; flex-direction:column; align-items:center;
        ">
          <span>🔨 만들고 부수기</span>
          <span style="font-size:12px; opacity:0.8; margin-top:4px; font-family:sans-serif; font-weight:normal;">건물을 직접 만들고 부수세요</span>
        </button>

        <button id="btn-leaderboard" class="menu-btn" style="
          width:280px; padding:16px 16px 12px; margin:6px; border:none; border-radius:14px;
          font-family:'Black Han Sans',sans-serif; font-size:20px;
          background: linear-gradient(135deg, #FFD600, #FF9100); color:#fff;
          box-shadow: 0 4px 20px rgba(255,214,0,0.4);
          cursor:pointer; transition: transform 0.15s;
          display:flex; flex-direction:column; align-items:center;
        ">
          <span>🏆 리더보드</span>
        </button>

        <button id="btn-login" class="menu-btn" style="
          width:280px; padding:12px 16px; margin:20px 6px 6px; border:none; border-radius:14px;
          font-family:'Black Han Sans',sans-serif; font-size:16px;
          background: rgba(255,255,255,0.1); color:rgba(255,255,255,0.6);
          cursor:pointer; transition: transform 0.15s;
        ">🔑 로그인</button>

        <div style="margin-top:40px; color:rgba(255,255,255,0.3); font-size:11px;">
          터치하여 파괴의 쾌감을 느껴보세요
        </div>
      </div>
    `;

    this.container.querySelectorAll('.menu-btn').forEach(btn => {
      btn.addEventListener('touchstart', () => btn.style.transform = 'scale(0.95)');
      btn.addEventListener('touchend', () => btn.style.transform = 'scale(1)');
      btn.addEventListener('mousedown', () => btn.style.transform = 'scale(0.95)');
      btn.addEventListener('mouseup', () => btn.style.transform = 'scale(1)');
    });

    document.getElementById('btn-campaign').addEventListener('click', () => this._emit('campaign'));
    document.getElementById('btn-sandbox').addEventListener('click', () => this._emit('sandbox'));
    document.getElementById('btn-sandbox-build').addEventListener('click', () => this._emit('sandboxBuild'));
    document.getElementById('btn-leaderboard').addEventListener('click', () => showDSLeaderboard());

    // SDK login button
    try {
      const sdk = window.__sdk;
      if (sdk) {
        const user = sdk.auth.getUser();
        const loginBtn = document.getElementById('btn-login');
        if (user && loginBtn) loginBtn.textContent = `👤 ${user.name}`;
        if (loginBtn) {
          loginBtn.addEventListener('click', async () => {
            try {
              const loggedIn = await sdk.auth.loginIfAvailable();
              if (loggedIn) {
                loginBtn.textContent = `👤 ${loggedIn.name}`;
                // Trigger cloud sync if save system is available
                if (window.__saveSystem?.cloudSync) {
                  window.__saveSystem.cloudSync();
                }
              }
            } catch (_) {}
          });
        }
      }
    } catch (_) {}
  }

  // === SANDBOX STRUCTURE SELECT ===
  showSandboxSelect() {
    this.currentScreen = 'sandboxSelect';
    this.clear();

    let html = `
      <div style="
        position:absolute; top:0; left:0; width:100%; height:100%;
        background: linear-gradient(180deg, rgba(10,14,39,0.97) 0%, rgba(26,35,126,0.97) 100%);
        pointer-events:auto; overflow-y:auto; -webkit-overflow-scrolling:touch;
        padding: 20px; padding-top: env(safe-area-inset-top, 20px);
      ">
        <button id="btn-back-menu2" style="
          background:none; border:1px solid rgba(255,255,255,0.2); border-radius:8px;
          color:#fff; padding:8px 16px; font-size:14px; cursor:pointer;
          margin-bottom:20px;
        ">← 돌아가기</button>

        <h2 style="
          font-family:'Black Han Sans',sans-serif; color:#7C4DFF;
          font-size:22px; margin-bottom:8px;
        ">구조물 선택</h2>
        <p style="color:rgba(255,255,255,0.5); font-size:12px; margin-bottom:16px;">
          파괴할 구조물을 선택하세요
        </p>

        <div style="display:flex; flex-wrap:wrap; gap:12px; margin-bottom:20px;">
          <button class="struct-btn" data-struct="random" style="
            width:140px; height:100px; border:2px solid rgba(124,77,255,0.4);
            border-radius:12px; background:rgba(124,77,255,0.1);
            color:#fff; display:flex; flex-direction:column; align-items:center;
            justify-content:center; cursor:pointer; font-size:14px;
          ">
            <span style="font-size:28px; margin-bottom:4px;">🎲</span>
            <span>랜덤</span>
            <span style="font-size:10px; color:rgba(255,255,255,0.4);">무작위 구조물</span>
          </button>
    `;

    for (const struct of SANDBOX_STRUCTURES) {
      const icons = {
        tower: '🏗️',
        castle: '🏰',
        bridge: '🌉',
        skyscraper: '🏢',
        pyramid: '🔺',
      };
      html += `
        <button class="struct-btn" data-struct="${struct.id}" style="
          width:140px; height:100px; border:2px solid rgba(255,255,255,0.15);
          border-radius:12px; background:rgba(255,255,255,0.05);
          color:#fff; display:flex; flex-direction:column; align-items:center;
          justify-content:center; cursor:pointer; font-size:14px;
        ">
          <span style="font-size:28px; margin-bottom:4px;">${icons[struct.id] || '🏛️'}</span>
          <span>${struct.name}</span>
          <span style="font-size:10px; color:rgba(255,255,255,0.4);">${struct.description}</span>
        </button>
      `;
    }

    html += '</div></div>';
    this.container.innerHTML = html;

    document.getElementById('btn-back-menu2').addEventListener('click', () => this._emit('mainMenu'));

    this.container.querySelectorAll('.struct-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this._emit('startSandbox', btn.dataset.struct);
      });
    });
  }

  // === STAGE SELECT ===
  showStageSelect(saveSystem) {
    this.currentScreen = 'stageSelect';
    this.clear();

    let html = `
      <div style="
        position:absolute; top:0; left:0; width:100%; height:100%;
        background: linear-gradient(180deg, rgba(10,14,39,0.97) 0%, rgba(26,35,126,0.97) 100%);
        pointer-events:auto; overflow-y:auto; -webkit-overflow-scrolling:touch;
        padding: 20px; padding-top: env(safe-area-inset-top, 20px);
      ">
        <button id="btn-back-menu" style="
          background:none; border:1px solid rgba(255,255,255,0.2); border-radius:8px;
          color:#fff; padding:8px 16px; font-size:14px; cursor:pointer;
          margin-bottom:20px;
        ">← 돌아가기</button>
    `;

    for (const chapter of CHAPTERS) {
      const levels = getChapterLevels(chapter.id);
      html += `
        <div style="margin-bottom:24px;">
          <h2 style="
            font-family:'Black Han Sans',sans-serif; color:#FFD600;
            font-size:20px; margin-bottom:4px;
          ">챕터 ${chapter.id}: ${chapter.name}</h2>
          <p style="color:rgba(255,255,255,0.5); font-size:12px; margin-bottom:12px;">
            ${chapter.description}
          </p>
          <div style="display:flex; flex-wrap:wrap; gap:10px;">
      `;

      for (const level of levels) {
        const result = saveSystem.getStageResult(level.id);
        const unlocked = saveSystem.isStageUnlocked(level.id);
        const stars = result?.stars || 0;
        const starStr = '★'.repeat(stars) + '☆'.repeat(3 - stars);

        html += `
          <button class="stage-btn" data-level="${level.id}" style="
            width:72px; height:72px; border:2px solid ${unlocked ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.08)'};
            border-radius:12px; background:${unlocked ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.3)'};
            color:${unlocked ? '#fff' : 'rgba(255,255,255,0.2)'};
            display:flex; flex-direction:column; align-items:center; justify-content:center;
            cursor:${unlocked ? 'pointer' : 'default'}; font-size:12px;
            ${result?.completed ? 'border-color:#FFD600;' : ''}
          ">
            <span style="font-size:18px; font-weight:bold;">${level.id}</span>
            <span style="font-size:10px; color:${stars > 0 ? '#FFD600' : 'rgba(255,255,255,0.3)'};">
              ${unlocked ? starStr : '🔒'}
            </span>
          </button>
        `;
      }

      html += '</div></div>';
    }

    html += '</div>';
    this.container.innerHTML = html;

    document.getElementById('btn-back-menu').addEventListener('click', () => this._emit('mainMenu'));

    this.container.querySelectorAll('.stage-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const levelId = parseInt(btn.dataset.level);
        if (saveSystem.isStageUnlocked(levelId)) {
          this._emit('startLevel', levelId);
        }
      });
    });
  }

  // === GAMEPLAY HUD ===
  showGameHUD(level, toolManager) {
    this.currentScreen = 'gameplay';
    this._levelClearShown = false;
    this.clear();

    this.container.innerHTML = `
      <div id="hud-top" style="
        position:absolute; top:0; left:0; width:100%; padding:12px 16px;
        padding-top: max(12px, env(safe-area-inset-top, 12px));
        display:flex; justify-content:space-between; align-items:flex-start;
        pointer-events:none;
      ">
        <div style="display:flex; gap:8px; align-items:center;">
          <button id="btn-pause" style="
            background:rgba(0,0,0,0.5); border:none; border-radius:50%;
            width:40px; height:40px; color:#fff; font-size:18px;
            cursor:pointer; pointer-events:auto; backdrop-filter:blur(8px);
          ">⏸</button>
          <button id="btn-help" style="
            background:rgba(0,0,0,0.5); border:none; border-radius:50%;
            width:40px; height:40px; color:#fff; font-size:18px;
            cursor:pointer; pointer-events:auto; backdrop-filter:blur(8px);
          ">?</button>
        </div>
        <div style="text-align:center;">
          <div id="chain-counter" style="
            font-family:'Orbitron',monospace; font-size:28px; font-weight:900;
            color:#FFD600; text-shadow:0 0 20px rgba(255,214,0,0.5);
            opacity:0; transition:opacity 0.2s, transform 0.2s;
          ">CHAIN x0</div>
          <div id="stage-name" style="
            color:rgba(255,255,255,0.6); font-size:12px; margin-top:2px;
          ">${level.name}</div>
        </div>
        <div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px;">
          <div id="destruction-gauge" style="
            width:120px; position:relative;
          ">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
              <span style="font-size:10px; color:rgba(255,255,255,0.5);">파괴율</span>
              <span id="gauge-text" style="
                font-family:'Orbitron',monospace; font-size:14px; font-weight:700; color:#FF4081;
              ">0%</span>
            </div>
            <div style="
              width:120px; height:8px; background:rgba(255,255,255,0.1);
              border-radius:4px; overflow:hidden;
            ">
              <div id="gauge-bar" style="
                width:0%; height:100%; background:linear-gradient(90deg, #FF4081, #FFD600);
                border-radius:4px; transition:width 0.3s ease-out;
              "></div>
            </div>
            <svg width="0" height="0" style="position:absolute;">
              <circle id="gauge-circle" cx="0" cy="0" r="0" stroke-dasharray="125.6" stroke-dashoffset="125.6"/>
            </svg>
          </div>
        </div>
      </div>

      <div id="tool-bar" style="
        position:absolute; bottom:20px; left:50%; transform:translateX(-50%);
        padding-bottom: env(safe-area-inset-bottom, 8px);
        display:flex; gap:8px; pointer-events:auto;
        max-width: 95vw; overflow-x: auto;
      ">
        ${toolManager.availableTools.map(id => {
          const tool = TOOLS[id];
          const isActive = id === toolManager.currentTool;
          return `
            <button class="tool-btn" data-tool="${id}" style="
              min-width:56px; width:56px; height:56px; border-radius:14px;
              border:2px solid ${isActive ? '#FFD600' : 'rgba(255,255,255,0.2)'};
              background:${isActive ? 'rgba(255,214,0,0.15)' : 'rgba(0,0,0,0.5)'};
              color:#fff; font-size:24px; cursor:pointer;
              backdrop-filter:blur(8px); display:flex; flex-direction:column;
              align-items:center; justify-content:center;
              transition: border-color 0.2s, background 0.2s;
              flex-shrink:0;
              ${!toolManager.canUse(id) ? 'opacity:0.4;' : ''}
            ">
              <span>${tool.icon}</span>
              ${!toolManager.unlimited ? `<span style="font-size:9px; color:${isActive ? '#FFD600' : '#aaa'};">
                ${toolManager.usesLeft[id] !== undefined ? toolManager.usesLeft[id] : '∞'}
              </span>` : ''}
            </button>
          `;
        }).join('')}
      </div>

      <div id="tool-desc" style="
        position:absolute; bottom:86px; left:50%; transform:translateX(-50%);
        padding-bottom: env(safe-area-inset-bottom, 0px);
        background:rgba(0,0,0,0.6); border-radius:10px; padding:6px 14px;
        color:rgba(255,255,255,0.8); font-size:12px; text-align:center;
        pointer-events:none; backdrop-filter:blur(4px);
        transition: opacity 0.2s;
      ">${TOOLS[toolManager.currentTool]?.description || ''}</div>

      <div id="help-overlay" style="
        display:none; position:absolute; top:0; left:0; width:100%; height:100%;
        background:rgba(10,14,39,0.9); pointer-events:auto;
        flex-direction:column; align-items:center; justify-content:center;
        backdrop-filter:blur(8px); z-index:100;
      ">
        <div style="
          background:rgba(255,255,255,0.05); border-radius:16px; padding:32px;
          border:1px solid rgba(255,255,255,0.15); max-width:320px; text-align:center;
        ">
          <div style="font-family:'Black Han Sans',sans-serif; font-size:22px; color:#fff; margin-bottom:16px;">
            조작 방법
          </div>
          <div style="color:rgba(255,255,255,0.8); font-size:14px; line-height:2;">
            <div>👆 <b>탭</b> : 도구 사용</div>
            <div>👉 <b>드래그</b> : 레이저/중력</div>
            <div>👆⏳ <b>길게 누르기</b> : 강력 폭발</div>
            <div>🐌 <b>슬로모</b> : 느린 재생</div>
          </div>
          <button id="btn-help-close" style="
            margin-top:20px; padding:10px 32px; border:none; border-radius:10px;
            background:linear-gradient(135deg,#FF4081,#FF1744); color:#fff;
            font-size:15px; font-family:'Black Han Sans',sans-serif; cursor:pointer;
          ">확인</button>
        </div>
      </div>

      <div id="level-clear-overlay" style="
        display:none; position:absolute; top:0; left:0; width:100%; height:100%;
        pointer-events:none; z-index:90;
        flex-direction:column; align-items:center; justify-content:center;
      ">
        <div id="level-clear-text" style="
          font-family:'Black Han Sans',sans-serif; font-size:36px; color:#FFD600;
          text-shadow:0 0 30px rgba(255,214,0,0.8), 0 0 60px rgba(255,64,129,0.4);
          opacity:0; transform:scale(0.5);
          transition: opacity 0.4s, transform 0.4s;
        ">GREAT DESTRUCTION!</div>
      </div>

      <div id="floating-popups" style="
        position:absolute; top:0; left:0; width:100%; height:100%;
        pointer-events:none; overflow:hidden;
      "></div>
    `;

    document.getElementById('btn-pause').addEventListener('click', () => this._emit('pause'));

    document.getElementById('btn-help').addEventListener('click', () => {
      const helpOverlay = document.getElementById('help-overlay');
      if (helpOverlay) {
        helpOverlay.style.display = 'flex';
      }
    });

    document.getElementById('btn-help-close').addEventListener('click', () => {
      const helpOverlay = document.getElementById('help-overlay');
      if (helpOverlay) {
        helpOverlay.style.display = 'none';
      }
    });

    this.container.querySelectorAll('.tool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this._emit('selectTool', btn.dataset.tool);
        // Update tool description
        const tool = TOOLS[btn.dataset.tool];
        const desc = document.getElementById('tool-desc');
        if (desc && tool) {
          desc.textContent = `${tool.name}: ${tool.description}`;
        }
      });
    });
  }

  // === SANDBOX BUILD HUD ===
  showBuildHUD() {
    this.currentScreen = 'building';
    this.clear();

    const materials = ['wood', 'ice', 'glass', 'metal', 'concrete', 'jelly', 'sand'];
    const matNames = {
      wood: '나무', ice: '얼음', glass: '유리', metal: '금속',
      concrete: '콘크리트', jelly: '젤리', sand: '모래',
    };
    const matColors = {
      wood: '#8D6E63', ice: '#4FC3F7', glass: '#80DEEA', metal: '#90A4AE',
      concrete: '#9E9E9E', jelly: '#E91E63', sand: '#FFD54F',
    };

    this.container.innerHTML = `
      <div id="build-top" style="
        position:absolute; top:0; left:0; width:100%; padding:12px 16px;
        padding-top: max(12px, env(safe-area-inset-top, 12px));
        display:flex; justify-content:space-between; align-items:center;
        pointer-events:none;
      ">
        <button id="btn-build-back" style="
          background:rgba(0,0,0,0.5); border:none; border-radius:8px;
          color:#fff; padding:8px 14px; font-size:13px; cursor:pointer;
          pointer-events:auto; backdrop-filter:blur(8px);
        ">← 메뉴</button>
        <div style="color:rgba(255,255,255,0.7); font-size:13px;">
          🔨 건설 모드
        </div>
        <button id="btn-start-destroy" style="
          background:linear-gradient(135deg,#FF4081,#FF1744); border:none; border-radius:8px;
          color:#fff; padding:8px 14px; font-size:13px; cursor:pointer;
          pointer-events:auto; font-family:'Black Han Sans',sans-serif;
        ">부숴볼래? 💥</button>
      </div>

      <div id="build-info" style="
        position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
        color:rgba(255,255,255,0.3); font-size:14px; text-align:center;
        pointer-events:none;
      " >
        화면을 탭하여 블록을 배치하세요<br>
        <span style="font-size:11px;">아래에서 소재를 선택하세요</span>
      </div>

      <div id="build-bar" style="
        position:absolute; bottom:20px; left:50%; transform:translateX(-50%);
        padding-bottom: env(safe-area-inset-bottom, 8px);
        display:flex; gap:6px; pointer-events:auto;
        flex-wrap:wrap; justify-content:center; max-width:95vw;
      ">
        ${materials.map((mat, i) => `
          <button class="mat-btn" data-material="${mat}" style="
            min-width:50px; height:50px; border-radius:12px;
            border:2px solid ${i === 0 ? '#FFD600' : 'rgba(255,255,255,0.2)'};
            background:${matColors[mat]}33; color:#fff; font-size:11px;
            cursor:pointer; display:flex; flex-direction:column;
            align-items:center; justify-content:center;
          ">
            <span style="width:18px; height:18px; border-radius:3px; background:${matColors[mat]};
              display:block; margin-bottom:2px;"></span>
            <span style="font-size:9px;">${matNames[mat]}</span>
          </button>
        `).join('')}
        <button id="btn-build-clear" style="
          min-width:50px; height:50px; border-radius:12px;
          border:2px solid rgba(255,100,100,0.3); background:rgba(255,0,0,0.1);
          color:#ff6666; font-size:11px; cursor:pointer;
          display:flex; flex-direction:column; align-items:center; justify-content:center;
        ">
          <span style="font-size:16px;">🗑️</span>
          <span style="font-size:9px;">초기화</span>
        </button>
      </div>
    `;

    document.getElementById('btn-build-back').addEventListener('click', () => this._emit('mainMenu'));
    document.getElementById('btn-start-destroy').addEventListener('click', () => this._emit('startDestroy'));
    document.getElementById('btn-build-clear').addEventListener('click', () => this._emit('clearBuild'));

    this.container.querySelectorAll('.mat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        // Update selection visual
        this.container.querySelectorAll('.mat-btn').forEach(b => {
          b.style.borderColor = 'rgba(255,255,255,0.2)';
        });
        btn.style.borderColor = '#FFD600';
        this._emit('selectMaterial', btn.dataset.material);
      });
    });
  }

  updateHUD(destructionRate, chainCount, toolManager) {
    const gaugeCircle = document.getElementById('gauge-circle');
    const gaugeText = document.getElementById('gauge-text');
    const gaugeBar = document.getElementById('gauge-bar');
    const chainCounter = document.getElementById('chain-counter');

    if (gaugeText) {
      const pct = Math.min(1, destructionRate);
      const pctInt = Math.round(pct * 100);
      gaugeText.textContent = pctInt + '%';

      // Update progress bar
      if (gaugeBar) {
        gaugeBar.style.width = pctInt + '%';
      }

      // Keep hidden SVG circle in sync for backwards compat
      if (gaugeCircle) {
        gaugeCircle.style.strokeDashoffset = 125.6 * (1 - pct);
      }

      // Level clear celebration when destruction >= 80%
      if (pctInt >= 80 && !this._levelClearShown) {
        this._levelClearShown = true;
        this._showLevelClearFeedback();
      }
    }

    if (chainCounter) {
      if (chainCount > 0) {
        chainCounter.style.opacity = '1';
        chainCounter.style.transform = 'scale(1.1)';
        chainCounter.textContent = `CHAIN x${chainCount}`;
        setTimeout(() => {
          if (chainCounter) chainCounter.style.transform = 'scale(1)';
        }, 150);
      }
    }

    // Update tool buttons
    this.container.querySelectorAll('.tool-btn').forEach(btn => {
      const id = btn.dataset.tool;
      const isActive = id === toolManager.currentTool;
      btn.style.borderColor = isActive ? '#FFD600' : 'rgba(255,255,255,0.2)';
      btn.style.background = isActive ? 'rgba(255,214,0,0.15)' : 'rgba(0,0,0,0.5)';
      btn.style.opacity = toolManager.canUse(id) ? '1' : '0.4';
    });
  }

  _showLevelClearFeedback() {
    const overlay = document.getElementById('level-clear-overlay');
    const text = document.getElementById('level-clear-text');
    if (overlay && text) {
      overlay.style.display = 'flex';
      // Trigger animation
      requestAnimationFrame(() => {
        text.style.opacity = '1';
        text.style.transform = 'scale(1)';
      });
      // Fade out after 2 seconds
      setTimeout(() => {
        text.style.opacity = '0';
        text.style.transform = 'scale(1.3)';
        setTimeout(() => {
          overlay.style.display = 'none';
        }, 500);
      }, 2000);
    }
  }

  showChainPopup(x, y, text) {
    const popup = document.createElement('div');
    popup.style.cssText = `
      position:absolute; left:${x}px; top:${y}px;
      font-family:'Orbitron',monospace; font-size:16px; font-weight:700;
      color:#FFD600; text-shadow:0 0 10px rgba(255,214,0,0.8);
      pointer-events:none; transform:translate(-50%,-50%);
      animation: popUp 0.8s ease-out forwards;
    `;
    popup.textContent = text;

    const popups = document.getElementById('floating-popups');
    if (popups) {
      popups.appendChild(popup);
      setTimeout(() => popup.remove(), 800);
    }

    if (!document.getElementById('popup-style')) {
      const style = document.createElement('style');
      style.id = 'popup-style';
      style.textContent = `
        @keyframes popUp {
          0% { opacity:1; transform:translate(-50%,-50%) scale(0.5); }
          50% { opacity:1; transform:translate(-50%,-80%) scale(1.2); }
          100% { opacity:0; transform:translate(-50%,-120%) scale(1); }
        }
        @keyframes slideIn {
          from { transform:translateY(100%); opacity:0; }
          to { transform:translateY(0); opacity:1; }
        }
        @keyframes starPop {
          0% { transform:scale(0); }
          60% { transform:scale(1.3); }
          100% { transform:scale(1); }
        }
        @keyframes perfectFlash {
          0% { opacity:0; }
          30% { opacity:1; }
          100% { opacity:0; }
        }
      `;
      document.head.appendChild(style);
    }
  }

  // === RESULTS SCREEN ===
  showResults(result, level) {
    this.currentScreen = 'results';
    this.clear();

    const { score, stars, destructionRate, chainCount, perfectChain, inputCount } = result;
    const starIcons = [];
    for (let i = 0; i < 3; i++) {
      starIcons.push(i < stars ? '★' : '☆');
    }

    this.container.innerHTML = `
      <div style="
        position:absolute; top:0; left:0; width:100%; height:100%;
        background:rgba(10,14,39,0.95); pointer-events:auto;
        display:flex; flex-direction:column; align-items:center; justify-content:center;
        animation: slideIn 0.4s ease-out;
      ">
        ${perfectChain ? `
          <div style="
            position:absolute; top:0; left:0; width:100%; height:100%;
            background: radial-gradient(circle, rgba(255,214,0,0.15) 0%, transparent 70%);
            animation: perfectFlash 1.5s ease-out;
            pointer-events:none;
          "></div>
        ` : ''}

        <div style="
          font-family:'Black Han Sans',sans-serif; font-size:24px;
          color:rgba(255,255,255,0.6); margin-bottom:8px;
        ">${level.name}</div>

        <div style="margin-bottom:24px; display:flex; gap:12px;">
          ${starIcons.map((s, i) => `
            <span style="
              font-size:48px; color:${s === '★' ? '#FFD600' : 'rgba(255,255,255,0.2)'};
              text-shadow:${s === '★' ? '0 0 20px rgba(255,214,0,0.5)' : 'none'};
              animation:${s === '★' ? `starPop 0.4s ease-out ${i * 0.2}s both` : 'none'};
              display:inline-block;
            ">${s}</span>
          `).join('')}
        </div>

        ${perfectChain ? `
          <div style="
            font-family:'Orbitron',monospace; font-size:18px; font-weight:900;
            color:#FFD600; text-shadow:0 0 20px rgba(255,214,0,0.8);
            margin-bottom:16px; letter-spacing:3px;
          ">PERFECT CHAIN!</div>
        ` : ''}

        <div style="
          font-family:'Orbitron',monospace; font-size:42px; font-weight:900;
          color:#fff; text-shadow:0 0 20px rgba(255,255,255,0.3);
          margin-bottom:24px;
        ">${score.toLocaleString()}</div>

        <div style="
          display:grid; grid-template-columns:1fr 1fr; gap:12px 32px;
          margin-bottom:36px; font-size:14px;
        ">
          <div style="color:rgba(255,255,255,0.5);">파괴율</div>
          <div style="color:#FF4081; font-weight:bold;">${Math.round(destructionRate * 100)}%</div>
          <div style="color:rgba(255,255,255,0.5);">체인 리액션</div>
          <div style="color:#FFD600; font-weight:bold;">${chainCount}회</div>
          <div style="color:rgba(255,255,255,0.5);">입력 횟수</div>
          <div style="color:#fff; font-weight:bold;">${inputCount}회</div>
        </div>

        <div style="display:flex; gap:12px;">
          <button id="btn-retry" style="
            padding:14px 28px; border:2px solid rgba(255,255,255,0.3); border-radius:12px;
            background:transparent; color:#fff; font-size:16px;
            font-family:'Black Han Sans',sans-serif; cursor:pointer;
          ">재도전</button>
          <button id="btn-next" style="
            padding:14px 28px; border:none; border-radius:12px;
            background:linear-gradient(135deg,#FF4081,#FF1744); color:#fff;
            font-size:16px; font-family:'Black Han Sans',sans-serif; cursor:pointer;
            box-shadow:0 4px 15px rgba(255,64,129,0.4);
          ">다음 스테이지</button>
        </div>

        <button id="btn-back-stages" style="
          margin-top:16px; background:none; border:none;
          color:rgba(255,255,255,0.4); font-size:13px; cursor:pointer;
        ">스테이지 선택으로</button>
      </div>
    `;

    document.getElementById('btn-retry').addEventListener('click', () => this._emit('retry'));
    document.getElementById('btn-next').addEventListener('click', () => this._emit('nextLevel'));
    document.getElementById('btn-back-stages').addEventListener('click', () => this._emit('stageSelect'));
  }

  // === SANDBOX RESULTS ===
  showSandboxResults(result) {
    this.currentScreen = 'results';
    this.clear();

    const { score, destructionRate, chainCount } = result;

    this.container.innerHTML = `
      <div style="
        position:absolute; top:0; left:0; width:100%; height:100%;
        background:rgba(10,14,39,0.95); pointer-events:auto;
        display:flex; flex-direction:column; align-items:center; justify-content:center;
        animation: slideIn 0.4s ease-out;
      ">
        <div style="
          font-family:'Black Han Sans',sans-serif; font-size:28px;
          color:#7C4DFF; margin-bottom:16px;
        ">파괴 완료!</div>

        <div style="
          font-family:'Orbitron',monospace; font-size:42px; font-weight:900;
          color:#fff; text-shadow:0 0 20px rgba(255,255,255,0.3);
          margin-bottom:24px;
        ">${score.toLocaleString()}</div>

        <div style="
          display:grid; grid-template-columns:1fr 1fr; gap:12px 32px;
          margin-bottom:36px; font-size:14px;
        ">
          <div style="color:rgba(255,255,255,0.5);">파괴율</div>
          <div style="color:#FF4081; font-weight:bold;">${Math.round(destructionRate * 100)}%</div>
          <div style="color:rgba(255,255,255,0.5);">체인 리액션</div>
          <div style="color:#FFD600; font-weight:bold;">${chainCount}회</div>
        </div>

        <div style="display:flex; gap:12px;">
          <button id="btn-sandbox-again" style="
            padding:14px 28px; border:2px solid rgba(124,77,255,0.5); border-radius:12px;
            background:transparent; color:#fff; font-size:16px;
            font-family:'Black Han Sans',sans-serif; cursor:pointer;
          ">다시 파괴</button>
          <button id="btn-sandbox-menu" style="
            padding:14px 28px; border:none; border-radius:12px;
            background:linear-gradient(135deg,#7C4DFF,#536DFE); color:#fff;
            font-size:16px; font-family:'Black Han Sans',sans-serif; cursor:pointer;
          ">메뉴로</button>
        </div>
      </div>
    `;

    document.getElementById('btn-sandbox-again').addEventListener('click', () => this._emit('sandbox'));
    document.getElementById('btn-sandbox-menu').addEventListener('click', () => this._emit('mainMenu'));
  }

  // === PAUSE MENU ===
  showPause() {
    const overlay = document.createElement('div');
    overlay.id = 'pause-overlay';
    overlay.style.cssText = `
      position:absolute; top:0; left:0; width:100%; height:100%;
      background:rgba(10,14,39,0.85); pointer-events:auto;
      display:flex; flex-direction:column; align-items:center; justify-content:center;
      backdrop-filter:blur(8px);
    `;
    overlay.innerHTML = `
      <div style="font-family:'Black Han Sans',sans-serif; font-size:32px; color:#fff; margin-bottom:32px;">
        일시정지
      </div>
      <button id="btn-resume" style="
        width:200px; padding:14px; margin:6px; border:none; border-radius:12px;
        background:linear-gradient(135deg,#FF4081,#FF1744); color:#fff;
        font-size:18px; font-family:'Black Han Sans',sans-serif; cursor:pointer;
      ">계속하기</button>
      <button id="btn-restart" style="
        width:200px; padding:14px; margin:6px; border:1px solid rgba(255,255,255,0.3);
        border-radius:12px; background:transparent; color:#fff;
        font-size:18px; font-family:'Black Han Sans',sans-serif; cursor:pointer;
      ">다시 시작</button>
      <button id="btn-quit" style="
        width:200px; padding:14px; margin:6px; border:1px solid rgba(255,255,255,0.15);
        border-radius:12px; background:transparent; color:rgba(255,255,255,0.6);
        font-size:16px; font-family:'Black Han Sans',sans-serif; cursor:pointer;
      ">나가기</button>
    `;
    this.container.appendChild(overlay);

    document.getElementById('btn-resume').addEventListener('click', () => {
      overlay.remove();
      this._emit('resume');
    });
    document.getElementById('btn-restart').addEventListener('click', () => {
      overlay.remove();
      this._emit('retry');
    });
    document.getElementById('btn-quit').addEventListener('click', () => {
      overlay.remove();
      this._emit('mainMenu');
    });
  }

  // === SLOW-MO REPLAY CONTROLS ===
  showReplayControls() {
    const overlay = document.createElement('div');
    overlay.id = 'replay-controls';
    overlay.style.cssText = `
      position:absolute; bottom:80px; left:50%; transform:translateX(-50%);
      background:rgba(0,0,0,0.7); border-radius:16px; padding:12px 20px;
      display:flex; gap:12px; align-items:center; pointer-events:auto;
      backdrop-filter:blur(8px); border:1px solid rgba(255,255,255,0.1);
    `;
    overlay.innerHTML = `
      <button id="replay-slow" style="
        background:none; border:1px solid rgba(255,255,255,0.3); border-radius:8px;
        color:#fff; padding:6px 12px; font-size:12px; cursor:pointer;
      ">0.25x</button>
      <button id="replay-half" style="
        background:none; border:1px solid rgba(255,255,255,0.3); border-radius:8px;
        color:#fff; padding:6px 12px; font-size:12px; cursor:pointer;
      ">0.5x</button>
      <button id="replay-normal" style="
        background:rgba(255,255,255,0.1); border:1px solid #FFD600; border-radius:8px;
        color:#FFD600; padding:6px 12px; font-size:12px; cursor:pointer;
      ">1x</button>
      <button id="replay-done" style="
        background:linear-gradient(135deg,#FF4081,#FF1744); border:none; border-radius:8px;
        color:#fff; padding:6px 14px; font-size:12px; cursor:pointer;
      ">완료</button>
    `;
    this.container.appendChild(overlay);

    document.getElementById('replay-slow').addEventListener('click', () => this._emit('replaySpeed', 0.25));
    document.getElementById('replay-half').addEventListener('click', () => this._emit('replaySpeed', 0.5));
    document.getElementById('replay-normal').addEventListener('click', () => this._emit('replaySpeed', 1.0));
    document.getElementById('replay-done').addEventListener('click', () => {
      overlay.remove();
      this._emit('replayDone');
    });
  }

  hideReplayControls() {
    const el = document.getElementById('replay-controls');
    if (el) el.remove();
  }

  // === TUTORIAL OVERLAY ===
  showTutorial(type, callback) {
    const messages = {
      tap: { text: '화면을 탭하여 파괴하세요!', icon: '👆' },
      domino: { text: '도미노 끝을 밀어 쓰러뜨리세요!', icon: '👉' },
      fire: { text: '화염구로 나무를 태우세요!', icon: '🔥' },
      chain: { text: '나무->얼음 체인 리액션을 일으키세요!', icon: '⛓️' },
      swipe: { text: '스와이프하여 레이저로 절단하세요!', icon: '⚡' },
    };
    const msg = messages[type] || messages.tap;

    const overlay = document.createElement('div');
    overlay.id = 'tutorial-overlay';
    overlay.style.cssText = `
      position:absolute; bottom:100px; left:50%; transform:translateX(-50%);
      background:rgba(0,0,0,0.75); border-radius:16px; padding:16px 24px;
      color:#fff; font-size:16px; text-align:center; pointer-events:none;
      backdrop-filter:blur(8px); border:1px solid rgba(255,255,255,0.1);
      animation: slideIn 0.3s ease-out;
      pointer-events:auto;
    `;
    overlay.innerHTML = `
      <div style="font-size:32px; margin-bottom:8px;">${msg.icon}</div>
      <div>${msg.text}</div>
    `;
    this.container.appendChild(overlay);

    setTimeout(() => {
      overlay.style.transition = 'opacity 0.5s';
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 500);
    }, 3000);

    if (callback) setTimeout(callback, 500);
  }

  // === ONBOARDING (First launch) ===
  showOnboarding(step, callback) {
    this.clear();
    this.container.style.pointerEvents = 'auto';

    const steps = [
      {
        title: '💥 부숴볼래?',
        subtitle: '터치 한 번으로 시원한 파괴!\n건물을 부수고, 폭발을 즐기세요!',
        action: '👆 터치하여 시작',
      },
    ];

    const s = steps[step] || steps[0];
    this.container.innerHTML = `
      <div style="
        position:absolute; top:0; left:0; width:100%; height:100%;
        display:flex; flex-direction:column; align-items:center; justify-content:center;
        pointer-events:auto;
      " id="onboarding-tap">
        <div style="
          font-family:'Black Han Sans',sans-serif; font-size:36px; color:#fff;
          text-shadow:0 0 30px rgba(255,64,129,0.5); margin-bottom:8px;
        ">${s.title}</div>
        <div style="color:rgba(255,255,255,0.6); font-size:15px; margin-bottom:40px;">
          ${s.subtitle}
        </div>
        <div style="
          color:rgba(255,255,255,0.4); font-size:13px;
          animation: pulse 1.5s infinite;
        ">${s.action}</div>
        <style>
          @keyframes pulse {
            0%,100% { opacity:0.4; }
            50% { opacity:1; }
          }
        </style>
      </div>
    `;

    document.getElementById('onboarding-tap').addEventListener('click', () => {
      this.clear();
      if (callback) callback();
    });
  }
}
