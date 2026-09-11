/* ============================================================
   算数クエスト — app.js
   語彙クエストと同じ Firebase プロジェクトを使い、
   進捗は ao-learning-quest/math/progress に教科と別枠で保存する。
   複数の「項目」（検定テスト単位）を持ち、項目ごとに
   出題内容・ベスト記録・1日1回制限を独立して管理する。
   ============================================================ */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import { getDatabase, ref as dbRef, get, set } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js';

const firebaseConfig = {
  apiKey: "AIzaSyADUL3Zu7ZkguKuz7LUSarfAj7JFkteTMw",
  authDomain: "hahuka-tools.firebaseapp.com",
  databaseURL: "https://hahuka-tools-default-rtdb.firebaseio.com",
  projectId: "hahuka-tools",
  storageBucket: "hahuka-tools.firebasestorage.app",
  messagingSenderId: "1097903942252",
  appId: "1:1097903942252:web:f5713546094f3b4f55c649"
};

const fbApp = initializeApp(firebaseConfig);
const db = getDatabase(fbApp);
const FB_PATH = 'ao-learning-quest/math/progress';

async function loadProgressFromFirebase() {
  try {
    const snap = await get(dbRef(db, FB_PATH));
    return snap.exists() ? snap.val() : {};
  } catch (e) {
    console.warn('[ao-math] Firebase読み込み失敗:', e);
    return {};
  }
}

function saveProgressToFirebase() {
  try {
    set(dbRef(db, FB_PATH), progress).catch(e => console.warn('[ao-math] Firebase保存失敗:', e));
  } catch (e) {
    console.warn('[ao-math] Firebase保存で例外:', e);
  }
}

// 日本時間基準の学習日（語彙クエストと同じ考え方）
function toStudyDateStr(ms) {
  return new Date(ms + 9 * 3600 * 1000).toISOString().slice(0, 10);
}
function getStudyDate() {
  return toStudyDateStr(Date.now());
}

// ============================================================
// 項目定義（検定テスト単位）
// ============================================================
function sq(n) {
  return { prompt: 'この数の2乗は？', stem: `${n} &times; ${n} = ?`, answer: String(n * n) };
}
function cube(n) {
  return { prompt: 'この数の3乗は？', stem: `${n} &times; ${n} &times; ${n} = ?`, answer: String(n * n * n), long: true };
}
function pi314(n) {
  const value = Math.round(3.14 * n * 100) / 100; // 浮動小数点の誤差を丸めで防ぐ
  return { prompt: '3.14の計算', stem: `3.14 &times; ${n} = ?`, answer: String(value) };
}
function triangle(n) {
  return { label: `${n}番目`, answer: String((n * (n + 1)) / 2) };
}
function pow2(n) {
  const sup = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
  const supStr = String(n).split('').map(d => sup[Number(d)]).join('');
  return { prompt: '2の累乗は？', stem: `2${supStr} = ?`, answer: String(2 ** n) };
}
function staticFrac(n, d) {
  return `<span class="frac static"><span class="fnum">${n}</span><span class="fbar"></span><span class="fden">${d}</span></span>`;
}
const FRAC_PAIRS = [
  [1, 4, '0.25'], [1, 2, '0.5'], [3, 4, '0.75'],
  [1, 8, '0.125'], [3, 8, '0.375'], [5, 8, '0.625'], [7, 8, '0.875'],
  [1, 5, '0.2'], [2, 5, '0.4'], [3, 5, '0.6'], [4, 5, '0.8'],
];
function decToFracItem([n, d, dec]) {
  return { type: 'fraction', prompt: '分数になおすと？', stem: `${dec} &rarr; ?`, answer: `${n}/${d}` };
}
function fracToDecItem([n, d, dec]) {
  return { type: 'number', prompt: '小数になおすと？', stem: `${staticFrac(n, d)} &rarr; ?`, answer: dec };
}

const QUEST_ITEMS = {
  squares_round: {
    label: '平方数＆100/1000を作る組',
    sub: '11&sup2;〜25&sup2; ＋ 100・1000を作る組',
    items: [
      ...[11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25].map(sq),
      { prompt: '計算すると？', stem: '250 &times; 4 = ?', answer: '1000' },
      { prompt: '計算すると？', stem: '125 &times; 4 = ?', answer: '500' },
      { prompt: '計算すると？', stem: '125 &times; 16 = ?', answer: '2000' },
      { prompt: '計算すると？', stem: '625 &times; 16 = ?', answer: '10000' },
    ],
  },
  cubes: {
    label: '立方数',
    sub: '2&sup3;〜10&sup3;',
    items: [2, 3, 4, 5, 6, 7, 8, 9, 10].map(cube),
  },
  pi314: {
    label: '3.14の計算',
    sub: '3.14&times;1〜3.14&times;9',
    items: [1, 2, 3, 4, 5, 6, 7, 8, 9].map(pi314),
  },
  dec_to_frac: {
    label: '小数→分数',
    sub: '0.25 &rarr; 1/4 のように分数で答える',
    items: FRAC_PAIRS.map(decToFracItem),
  },
  frac_to_dec: {
    label: '分数→小数',
    sub: '1/4 &rarr; 0.25 のように小数で答える',
    items: FRAC_PAIRS.map(fracToDecItem),
  },
  pow2: {
    label: '2の累乗',
    sub: '2¹〜2⁹…（順番通り）',
    sequential: true, // シャッフルせず順番に出題する
    items: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(pow2),
  },
  triangle: {
    label: '三角数',
    sub: '1番目〜10番目をまとめて入力',
    worksheet: true, // 1画面にまとめて回答するタイプ
    items: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(triangle),
  },
  prime100: {
    label: '100までの素数',
    sub: '1〜100から素数を選ぶ',
    primeGrid: true, // 1〜100のボタンから選んでまとめて判定するタイプ
    items: [],
  },
};

function isPrimeNum(n) {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
  return true;
}

const RESTRICTED = ['3000', '4000', '40000', '60000']; // 1日1回だけ挑戦できる制限時間
const PASS_MESSAGES = {
  none: 'なかなかやるね！', '5000': 'あともう少しだ！', '4000': '合格！', '3000': 'きみは王者だ！誰よりも強い！！',
  '60000': '合格！', '40000': 'きみは王者だ！誰よりも強い！！',
};
const TIER_RANK = { '3000': 1, '4000': 2, '5000': 3, '40000': 1, '60000': 2, none: 4 }; // 小さいほど厳しい（項目ごとに独立して比較するため文字列の重複は問題ない）
const TIER_LABEL = { '3000': '3秒', '4000': '4秒', '5000': '5秒', '40000': '40秒', '60000': '60秒', none: 'なし' };
const RANK_INFO = {
  none: { icon: null, text: 'がんばれ！' },
  '5000': { icon: '🥈', text: '5秒クリア <br>あと少し！' },
  '4000': { icon: '🥇', text: '4秒クリア 合格！次は王者に挑戦だ' },
  '3000': { icon: '👑', text: '3秒クリア <br>きみは王者だ！' },
  '60000': { icon: '🥇', text: '60秒クリア <br>合格！' },
  '40000': { icon: '👑', text: '40秒クリア <br>きみは王者だ！' },
};

// ============================================================
// 状態
// ============================================================
let progress = {};       // { [itemKey]: { bestTier, dailyLock: {limitKey: 'YYYY-MM-DD'}, lastResult } }
let itemKey = null;      // 選択中の項目
let limitMs = 4000;
let queue = [];
let qIndex = 0;
let buffer = '';
let denomBuf = '';
let numerBuf = '';
let fracPhase = 'denom'; // 分数は書き順どおり「分母→分子」
let wsActiveIndex = 0; // ワークシートで今タップしている入力欄
let wsLimitMs = 60000;
let wsStartTime = 0;
let wsTimeoutHandle;
let startTime = 0;
let locked = false;
let results = [];
let warnTimeout, dangerTimeout, timeoutHandle;

const app = document.getElementById('app');

function limitKeyOf(ms) { return ms === null ? 'none' : String(ms); }

function curProgress() {
  progress[itemKey] = progress[itemKey] || { bestTier: null, dailyLock: {} };
  return progress[itemKey];
}

function isLockedToday(key) {
  const p = curProgress();
  return p.dailyLock && p.dailyLock[key] === getStudyDate();
}

function lockToday(key) {
  const p = curProgress();
  p.dailyLock = p.dailyLock || {};
  p.dailyLock[key] = getStudyDate();
}

function updateBestTier(key) {
  const p = curProgress();
  const rank = TIER_RANK[key];
  const currentRank = p.bestTier ? TIER_RANK[p.bestTier] : Infinity;
  if (rank < currentRank) p.bestTier = key;
}

function answersMatch(given, expected) {
  if (given === '') return false;
  const g = Number(given);
  const e = Number(expected);
  if (Number.isNaN(g) || Number.isNaN(e)) return false;
  return g === e; // "15.70" と "15.7" のような表記ゆれも正解として扱う
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ============================================================
// 描画
// ============================================================
function render() {
  app.innerHTML = `
    <div class="stage">
      <div class="page-header">
        <div class="page-title">
          <img src="../vocab1300/images/slime.png" class="title-slime" alt="">
          算数クエスト
          <img src="../vocab1300/images/slime-orange.png" class="title-slime" alt="">
        </div>
        <div class="page-subtitle" id="pageSubtitle"></div>
      </div>

      <div id="itemScreen">
        <button class="key func" id="goToStudyHubBtn" style="width:100%; height:auto; padding:12px; margin-bottom:14px; font-size:15px;">📖 おぼえるページ</button>
        <div class="note" style="margin-bottom:12px;">練習したい項目を選んでね</div>
        <div class="limit-chips" id="itemList" style="flex-direction:column; gap:10px;"></div>
      </div>

      <div id="studyHubScreen" hidden>
        <button class="key func" id="backFromStudyHubBtn" style="width:auto; padding:6px 14px; height:auto; margin-bottom:10px;">&larr; 項目選択にもどる</button>
        <div class="note" style="margin-bottom:12px;">見たい項目を選んでね</div>
        <div class="limit-chips" id="studyItemList" style="flex-direction:column; gap:10px;"></div>
      </div>

      <div id="studyScreen" hidden>
        <button class="key func" id="backFromStudyBtn" style="width:auto; padding:6px 14px; height:auto; margin-bottom:10px;">&larr; おぼえるページ一覧にもどる</button>
        <div class="worksheet-card">
          <div class="q-category" id="studyTitle"></div>
          <div id="studyContent"></div>
        </div>
      </div>

      <div id="setupScreen" hidden>
        <button class="key func" id="backToItemsBtn" style="width:auto; padding:6px 14px; height:auto; margin-bottom:10px;">&larr; 項目選択にもどる</button>
        <div class="best-badge" id="bestBadge"></div>
        <div class="limit-row" id="limitRow">
          <span class="lbl">制限時間</span>
          <div class="limit-chips" id="limitChips">
            <div class="chip" data-limit="3000" data-label="3秒">3秒</div>
            <div class="chip active" data-limit="4000" data-label="4秒">4秒</div>
            <div class="chip" data-limit="5000" data-label="5秒">5秒</div>
            <div class="chip" data-limit="none" data-label="なし">なし</div>
          </div>
        </div>
        <div class="note" style="margin:16px 0 20px;">「なし」「5秒」は何度でも練習できます。「3秒」「4秒」は1日1回だけ挑戦できます（挑戦したら合否に関わらずその日は終了、翌日また挑戦できます）。</div>
        <button class="submit-btn" id="startBtn" style="width:100%;">けんてい を はじめる</button>
      </div>

      <div id="quizScreen" hidden>
        <div class="quiz-progress"><span class="progress-pill" id="progressPill"></span></div>
        <div class="quiz-card">
          <div class="timer-track"><div class="timer-fill" id="timerFill"></div></div>
          <div class="q-category" id="qCategory"></div>
          <div class="q-stem" id="qStem"></div>
          <div class="answer-readout placeholder" id="answerReadout">こたえ<span class="cursor"></span></div>
          <div class="frac frac-input" id="fracInput" hidden>
            <div class="fnum placeholder" id="fracNum">?</div>
            <div class="fbar"></div>
            <div class="fden placeholder" id="fracDen">?</div>
          </div>
          <div class="feedback-overlay" id="feedback">
            <div class="fb-big" id="fbBig"></div>
            <div class="fb-sub" id="fbSub"></div>
          </div>
        </div>
        <div class="keypad" id="keypad">
          <button class="key" data-key="1">1</button>
          <button class="key" data-key="2">2</button>
          <button class="key" data-key="3">3</button>
          <button class="key" data-key="4">4</button>
          <button class="key" data-key="5">5</button>
          <button class="key" data-key="6">6</button>
          <button class="key" data-key="7">7</button>
          <button class="key" data-key="8">8</button>
          <button class="key" data-key="9">9</button>
          <button class="key func" data-key="dotbar" id="dotBarKey">.</button>
          <button class="key" data-key="0">0</button>
          <button class="key func" data-key="back">⌫</button>
          <button class="submit-btn" id="submitBtn">けってい</button>
        </div>
      </div>

      <div class="result-screen" id="resultScreen" hidden>
        <div class="result-banner" id="resultBanner"></div>
        <div class="result-sub" id="resultSub"></div>
        <div class="result-grid" id="resultGrid"></div>
        <button class="retry-btn" id="retryBtn">もういちど挑戦する</button>
      </div>

      <div id="worksheetSetupScreen" hidden>
        <button class="key func" id="backFromWsSetupBtn" style="width:auto; padding:6px 14px; height:auto; margin-bottom:10px;">&larr; 項目選択にもどる</button>
        <div class="best-badge" id="wsBestBadge"></div>
        <div class="limit-row" id="wsLimitRow">
          <span class="lbl">制限時間</span>
          <div class="limit-chips" id="wsLimitChips">
            <div class="chip" data-limit="40000" data-label="40秒">40秒</div>
            <div class="chip active" data-limit="60000" data-label="60秒">60秒</div>
            <div class="chip" data-limit="none" data-label="なし">なし</div>
          </div>
        </div>
        <div class="note" style="margin:16px 0 20px;">「なし」は何度でも練習できます。「40秒」「60秒」は1日1回だけ挑戦できます（挑戦したら合否に関わらずその日は終了、翌日また挑戦できます）。</div>
        <button class="submit-btn" id="wsStartBtn" style="width:100%;">けんてい を はじめる</button>
      </div>

      <div id="worksheetScreen" hidden>
        <button class="key func" id="backFromWorksheetBtn" style="width:auto; padding:6px 14px; height:auto; margin-bottom:10px;">&larr; 項目選択にもどる</button>
        <div class="worksheet-card">
          <div class="timer-track"><div class="timer-fill" id="wsTimerFill"></div></div>
          <div class="q-category" id="worksheetTitle"></div>
          <div class="worksheet-grid" id="worksheetGrid"></div>
          <div class="keypad" id="worksheetKeypad" style="margin-top:16px;">
            <button class="key" data-key="1">1</button>
            <button class="key" data-key="2">2</button>
            <button class="key" data-key="3">3</button>
            <button class="key" data-key="4">4</button>
            <button class="key" data-key="5">5</button>
            <button class="key" data-key="6">6</button>
            <button class="key" data-key="7">7</button>
            <button class="key" data-key="8">8</button>
            <button class="key" data-key="9">9</button>
            <button class="key" data-key="0" style="grid-column: span 2;">0</button>
            <button class="key func" data-key="back">⌫</button>
          </div>
          <button class="submit-btn" id="worksheetCheckBtn" style="width:100%; margin-top:16px;">こたえあわせ</button>
          <div class="worksheet-summary" id="worksheetSummary"></div>
        </div>
      </div>

      <div id="primeScreen" hidden>
        <button class="key func" id="backFromPrimeBtn" style="width:auto; padding:6px 14px; height:auto; margin-bottom:10px;">&larr; 項目選択にもどる</button>
        <div class="worksheet-card">
          <div class="timer-track"><div class="timer-fill" id="primeTimerFill"></div></div>
          <div class="q-category">1〜100から素数をぜんぶタップして選ぼう</div>
          <div class="prime-grid" id="primeGrid"></div>
          <button class="submit-btn" id="primeCheckBtn" style="width:100%; margin-top:16px;">こたえあわせ</button>
          <div class="worksheet-summary" id="primeSummary"></div>
          <div class="prime-legend" id="primeLegend" hidden>
            <span class="pl-item"><span class="pl-swatch pl-correct"></span>あってる</span>
            <span class="pl-item"><span class="pl-swatch pl-wrong"></span>まちがい</span>
            <span class="pl-item"><span class="pl-swatch pl-missed"></span>見落とし</span>
          </div>
        </div>
      </div>
    </div>
  `;
  bindEvents();
  showItemScreen();
}

function renderItemList() {
  const list = document.getElementById('itemList');
  list.innerHTML = Object.entries(QUEST_ITEMS).map(([key, def]) => {
    const best = progress[key] && progress[key].bestTier;
    const info = best ? RANK_INFO[best] : { icon: null, text: '挑戦だ！' };
    const rankHtml = (info.icon ? `<div class="rank-icon">${info.icon}</div>` : '')
      + `<div class="rank-text${best ? '' : ' rank-text-new'}">${info.text}</div>`;
    const subText = def.primeGrid ? def.sub : `全${def.items.length}問（${def.sub}）`;
    return `
      <div class="item-row" data-item="${key}">
        <div class="item-card">
          <div class="ic-title">${def.label}</div>
          <div class="ic-sub">${subText}</div>
        </div>
        <div class="rank-badge">${rankHtml}</div>
      </div>
    `;
  }).join('');
  list.querySelectorAll('.item-row').forEach(row => {
    row.querySelector('.item-card').addEventListener('click', () => {
      itemKey = row.dataset.item;
      if (QUEST_ITEMS[itemKey].worksheet || QUEST_ITEMS[itemKey].primeGrid) {
        showWorksheetSetupScreen();
      } else {
        showSetupScreen();
      }
    });
  });
}

function refreshChipLocksIn(containerId, limitVar) {
  const chips = document.getElementById(containerId);
  let activeIsLocked = false;
  [...chips.children].forEach(chip => {
    const v = chip.dataset.limit;
    const isLocked = RESTRICTED.includes(v) && isLockedToday(v);
    chip.classList.toggle('locked', isLocked);
    chip.innerHTML = isLocked ? `${chip.dataset.label}<br>（本日終了）` : chip.dataset.label;
    if (isLocked && chip.classList.contains('active')) activeIsLocked = true;
  });
  let newLimitMs = limitVar;
  if (activeIsLocked) {
    [...chips.children].forEach(c => c.classList.remove('active'));
    const fallback = [...chips.children].find(c => !c.classList.contains('locked'));
    if (fallback) {
      fallback.classList.add('active');
      newLimitMs = fallback.dataset.limit === 'none' ? null : parseInt(fallback.dataset.limit, 10);
    }
  }
  return newLimitMs;
}

function refreshChipLocks() {
  limitMs = refreshChipLocksIn('limitChips', limitMs);
}

function refreshWsChipLocks() {
  wsLimitMs = refreshChipLocksIn('wsLimitChips', wsLimitMs);
}

function renderBestBadge() {
  const badge = document.getElementById('bestBadge');
  const best = curProgress().bestTier;
  badge.textContent = best ? `これまでの最高記録: ${TIER_LABEL[best]}` : '';
}

function renderWsBestBadge() {
  const badge = document.getElementById('wsBestBadge');
  const best = curProgress().bestTier;
  badge.textContent = best ? `これまでの最高記録: ${TIER_LABEL[best]}` : '';
}

function hideAllScreens() {
  document.getElementById('itemScreen').hidden = true;
  document.getElementById('setupScreen').hidden = true;
  document.getElementById('quizScreen').hidden = true;
  document.getElementById('resultScreen').hidden = true;
  document.getElementById('worksheetSetupScreen').hidden = true;
  document.getElementById('worksheetScreen').hidden = true;
  document.getElementById('primeScreen').hidden = true;
  document.getElementById('studyHubScreen').hidden = true;
  document.getElementById('studyScreen').hidden = true;
}

function showItemScreen() {
  renderItemList(); // bestTierが更新されている場合があるのでバッジを再描画する
  hideAllScreens();
  document.getElementById('itemScreen').hidden = false;
  document.getElementById('pageSubtitle').textContent = '';
}

function studyLineFor(it) {
  if (it.stem) {
    if (it.stem.includes(' = ?')) return it.stem.replace(' = ?', ` = ${it.answer}`);
    if (it.stem.includes('&rarr; ?')) return it.stem.replace('&rarr; ?', `&rarr; ${it.answer}`);
    return `${it.stem} ${it.answer}`;
  }
  if (it.label) return `${it.label} = ${it.answer}`;
  return '';
}

function showStudyHubScreen() {
  hideAllScreens();
  document.getElementById('studyHubScreen').hidden = false;
  document.getElementById('pageSubtitle').textContent = '';
  renderStudyHubList();
}

const STUDY_HIDDEN_KEYS = ['dec_to_frac']; // 覚えるページには出さない（分数⇔小数はfrac_to_decに統合して表示）
const STUDY_LABEL_OVERRIDE = { frac_to_dec: '分数⇔小数' };

function renderStudyHubList() {
  const list = document.getElementById('studyItemList');
  list.innerHTML = Object.entries(QUEST_ITEMS)
    .filter(([key]) => !STUDY_HIDDEN_KEYS.includes(key))
    .map(([key, def]) => `
      <div class="item-row" data-item="${key}">
        <div class="item-card study">
          <div class="ic-title">${STUDY_LABEL_OVERRIDE[key] || def.label}</div>
          <div class="ic-sub">${def.sub}</div>
        </div>
      </div>
    `).join('');
  list.querySelectorAll('.item-row').forEach(row => {
    row.querySelector('.item-card').addEventListener('click', () => {
      showStudyScreen(row.dataset.item);
    });
  });
}

function renderStudyList(items) {
  return `<div class="study-list">${items.map((it, i, arr) => {
    const wide = (arr.length % 2 === 1 && i === arr.length - 1) ? ' wide' : '';
    return `<div class="study-line${wide}">${studyLineFor(it)}</div>`;
  }).join('')}</div>`;
}

function showStudyScreen(key) {
  hideAllScreens();
  document.getElementById('studyScreen').hidden = false;
  const def = QUEST_ITEMS[key];
  const label = STUDY_LABEL_OVERRIDE[key] || def.label;
  document.getElementById('pageSubtitle').textContent = label;
  document.getElementById('studyTitle').textContent = label;
  const content = document.getElementById('studyContent');

  if (key === 'prime100') {
    const primes = Array.from({ length: 100 }, (_, i) => i + 1).filter(isPrimeNum);
    content.innerHTML = `<div class="study-primes">${primes.join('、')}</div>`;
  } else if (key === 'triangle') {
    content.innerHTML = `<div class="study-primes">${def.items.map(it => it.answer).join('、')}</div>`;
  } else if (key === 'squares_round') {
    const squares = def.items.slice(0, 15);
    const rounds = def.items.slice(15);
    content.innerHTML = `
      <div class="study-section-title">■平方数</div>
      ${renderStudyList(squares)}
      <div class="study-section-title">■100・1000を作る組</div>
      ${renderStudyList(rounds)}
    `;
  } else if (key === 'frac_to_dec') {
    const pairs = FRAC_PAIRS.map(([n, d, dec]) => ({ stem: '', answer: '', line: `${dec} = ${staticFrac(n, d)}` }));
    content.innerHTML = `<div class="study-list">${pairs.map((it, i, arr) => {
      const wide = (arr.length % 2 === 1 && i === arr.length - 1) ? ' wide' : '';
      return `<div class="study-line${wide}">${it.line}</div>`;
    }).join('')}</div>`;
  } else {
    content.innerHTML = renderStudyList(def.items);
  }
}

function showSetupScreen() {
  hideAllScreens();
  document.getElementById('setupScreen').hidden = false;
  document.getElementById('pageSubtitle').textContent = QUEST_ITEMS[itemKey].label;
  refreshChipLocks();
  renderBestBadge();
}

function showQuizScreen() {
  hideAllScreens();
  document.getElementById('quizScreen').hidden = false;
  document.getElementById('pageSubtitle').textContent = QUEST_ITEMS[itemKey].label;
}

function showWorksheetSetupScreen() {
  hideAllScreens();
  document.getElementById('worksheetSetupScreen').hidden = false;
  document.getElementById('pageSubtitle').textContent = QUEST_ITEMS[itemKey].label;
  refreshWsChipLocks();
  renderWsBestBadge();
}

function showWorksheetScreen() {
  hideAllScreens();
  document.getElementById('worksheetScreen').hidden = false;
  document.getElementById('pageSubtitle').textContent = QUEST_ITEMS[itemKey].label;
  renderWorksheet();
  startSpecialTimer('wsTimerFill', () => checkWorksheet(true));
}

function showPrimeScreen() {
  hideAllScreens();
  document.getElementById('primeScreen').hidden = false;
  document.getElementById('pageSubtitle').textContent = QUEST_ITEMS[itemKey].label;
  renderPrimeGrid();
  startSpecialTimer('primeTimerFill', () => checkPrimeGrid(true));
}

function renderPrimeGrid() {
  const grid = document.getElementById('primeGrid');
  grid.innerHTML = Array.from({ length: 100 }, (_, i) => i + 1)
    .map(n => `<button class="pb" data-n="${n}">${n}</button>`)
    .join('');
  document.getElementById('primeSummary').textContent = '';
  document.getElementById('primeSummary').className = 'worksheet-summary';
  document.getElementById('primeLegend').hidden = true;
  grid.querySelectorAll('.pb').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('selected');
      btn.classList.remove('correct', 'wrong', 'missed');
    });
  });
}

function checkPrimeGrid(isTimeout) {
  clearTimeout(wsTimeoutHandle);
  const elapsed = performance.now() - wsStartTime;
  const buttons = [...document.querySelectorAll('.pb')];
  let allCorrect = true;
  buttons.forEach(btn => {
    const n = Number(btn.dataset.n);
    const shouldBePrime = isPrimeNum(n);
    const selected = btn.classList.contains('selected');
    btn.classList.remove('correct', 'wrong', 'missed');
    if (shouldBePrime && selected) {
      btn.classList.add('correct');
    } else if (!shouldBePrime && selected) {
      btn.classList.add('wrong');
      allCorrect = false;
    } else if (shouldBePrime && !selected) {
      btn.classList.add('missed');
      allCorrect = false;
    }
  });

  const limitKey = limitKeyOf(wsLimitMs);
  const isRestricted = RESTRICTED.includes(limitKey);
  const withinTime = wsLimitMs == null ? true : elapsed <= wsLimitMs;
  const pass = allCorrect && withinTime && !isTimeout;

  if (isRestricted) lockToday(limitKey);
  if (pass) updateBestTier(limitKey);
  curProgress().lastResult = { limitKey, pass, timestamp: Date.now() };
  saveProgressToFirebase();

  const summary = document.getElementById('primeSummary');
  const legend = document.getElementById('primeLegend');
  if (pass) {
    summary.textContent = PASS_MESSAGES[limitKey] || '🎉 ぜんぶ正解！';
    summary.className = 'worksheet-summary pass';
    legend.hidden = true;
  } else if (isTimeout) {
    summary.textContent = '時間切れ！もういちど挑戦しよう';
    summary.className = 'worksheet-summary fail';
    legend.hidden = allCorrect;
  } else if (allCorrect) {
    summary.textContent = `ぜんぶ正解！でも時間切れ（${(elapsed / 1000).toFixed(0)}秒）`;
    summary.className = 'worksheet-summary fail';
    legend.hidden = true;
  } else {
    summary.textContent = 'もう一度考えてみよう';
    summary.className = 'worksheet-summary fail';
    legend.hidden = false;
  }
}

function startSpecialTimer(timerFillId, onTimeout) {
  clearTimeout(wsTimeoutHandle);
  wsStartTime = performance.now();
  const timerFill = document.getElementById(timerFillId);
  timerFill.style.transition = 'none';
  timerFill.style.width = '100%';
  timerFill.classList.remove('warn', 'danger');
  void timerFill.offsetWidth;
  if (wsLimitMs == null) return;
  timerFill.style.transition = `width ${wsLimitMs}ms linear`;
  timerFill.style.width = '0%';
  wsTimeoutHandle = setTimeout(onTimeout, wsLimitMs);
}

function renderWorksheet() {
  const def = QUEST_ITEMS[itemKey];
  document.getElementById('worksheetTitle').textContent = `${def.items.length}番目までの${def.label}を入れよ`;
  const grid = document.getElementById('worksheetGrid');
  grid.innerHTML = def.items.map((it, i) => `
    <div class="ws-row">
      <div class="ws-label">${it.label}</div>
      <input class="ws-input" type="text" readonly autocomplete="off" data-idx="${i}">
    </div>
  `).join('');
  document.getElementById('worksheetSummary').textContent = '';
  document.getElementById('worksheetSummary').className = 'worksheet-summary';

  wsActiveIndex = 0;
  const inputs = [...grid.querySelectorAll('.ws-input')];
  inputs.forEach((inp, i) => {
    inp.addEventListener('click', () => { wsActiveIndex = i; inp.focus(); });
  });
  inputs[0].focus();
}

function checkWorksheet(isTimeout) {
  clearTimeout(wsTimeoutHandle);
  const elapsed = performance.now() - wsStartTime;
  const def = QUEST_ITEMS[itemKey];
  const inputs = [...document.querySelectorAll('.ws-input')];
  let allCorrect = true;
  inputs.forEach((inp, i) => {
    const ok = answersMatch(inp.value.trim(), def.items[i].answer);
    inp.classList.toggle('correct', ok);
    inp.classList.toggle('wrong', !ok);
    inp.readOnly = true;
    if (!ok) allCorrect = false;
  });

  const limitKey = limitKeyOf(wsLimitMs);
  const isRestricted = RESTRICTED.includes(limitKey);
  const withinTime = wsLimitMs == null ? true : elapsed <= wsLimitMs;
  const pass = allCorrect && withinTime && !isTimeout;

  if (isRestricted) lockToday(limitKey);
  if (pass) updateBestTier(limitKey);
  curProgress().lastResult = { limitKey, pass, timestamp: Date.now() };
  saveProgressToFirebase();

  const summary = document.getElementById('worksheetSummary');
  if (pass) {
    summary.textContent = PASS_MESSAGES[limitKey] || '🎉 ぜんぶ正解！';
    summary.className = 'worksheet-summary pass';
  } else if (isTimeout) {
    summary.textContent = '時間切れ！もういちど挑戦しよう';
    summary.className = 'worksheet-summary fail';
  } else if (allCorrect) {
    summary.textContent = `ぜんぶ正解！でも時間切れ（${(elapsed / 1000).toFixed(0)}秒）`;
    summary.className = 'worksheet-summary fail';
  } else {
    summary.textContent = '赤い枠のところをもう一度考えてみよう';
    summary.className = 'worksheet-summary fail';
  }
}

function bindEvents() {
  document.getElementById('backToItemsBtn').addEventListener('click', showItemScreen);
  document.getElementById('goToStudyHubBtn').addEventListener('click', showStudyHubScreen);
  document.getElementById('backFromStudyHubBtn').addEventListener('click', showItemScreen);
  document.getElementById('backFromStudyBtn').addEventListener('click', showStudyHubScreen);
  document.getElementById('backFromWsSetupBtn').addEventListener('click', showItemScreen);
  document.getElementById('backFromWorksheetBtn').addEventListener('click', showItemScreen);
  document.getElementById('backFromPrimeBtn').addEventListener('click', showItemScreen);
  document.getElementById('primeCheckBtn').addEventListener('click', () => checkPrimeGrid(false));
  document.getElementById('worksheetCheckBtn').addEventListener('click', () => checkWorksheet(false));

  document.getElementById('wsLimitChips').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip || chip.classList.contains('locked')) return;
    [...chip.parentElement.children].forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    const v = chip.dataset.limit;
    wsLimitMs = v === 'none' ? null : parseInt(v, 10);
  });

  document.getElementById('wsStartBtn').addEventListener('click', () => {
    if (QUEST_ITEMS[itemKey].primeGrid) {
      showPrimeScreen();
    } else {
      showWorksheetScreen();
    }
  });

  document.getElementById('worksheetKeypad').addEventListener('click', (e) => {
    const btn = e.target.closest('.key');
    if (!btn) return;
    const inputs = [...document.querySelectorAll('.ws-input')];
    const inp = inputs[wsActiveIndex];
    if (!inp) return;
    const k = btn.dataset.key;
    if (k === 'back') inp.value = inp.value.slice(0, -1);
    else if (inp.value.length < 4) inp.value += k;
    inp.classList.remove('correct', 'wrong');
  });

  document.getElementById('limitChips').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip || chip.classList.contains('locked')) return;
    [...chip.parentElement.children].forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    const v = chip.dataset.limit;
    limitMs = v === 'none' ? null : parseInt(v, 10);
  });

  document.getElementById('startBtn').addEventListener('click', () => {
    const def = QUEST_ITEMS[itemKey];
    queue = def.sequential ? def.items.slice() : shuffle(def.items);
    qIndex = 0;
    results = [];
    showQuizScreen();
    loadQuestion();
  });

  document.getElementById('keypad').addEventListener('click', (e) => {
    const btn = e.target.closest('.key');
    if (!btn || locked) return;
    const k = btn.dataset.key;
    const isFrac = queue[qIndex].type === 'fraction';

    if (isFrac) {
      if (k === 'back') {
        if (fracPhase === 'numer') {
          if (numerBuf.length > 0) numerBuf = numerBuf.slice(0, -1);
          else fracPhase = 'denom'; // 分子が空なら分母入力に戻る（横棒を取り消す）
        } else {
          denomBuf = denomBuf.slice(0, -1);
        }
      } else if (k === 'dotbar') {
        if (fracPhase === 'denom' && denomBuf.length > 0) fracPhase = 'numer';
      } else if (fracPhase === 'denom' && denomBuf.length < 3) {
        denomBuf += k;
      } else if (fracPhase === 'numer' && numerBuf.length < 3) {
        numerBuf += k;
      }
    } else {
      if (k === 'back') buffer = buffer.slice(0, -1);
      else if (k === 'dotbar') { if (buffer.length < 6) buffer += '.'; }
      else if (buffer.length < 6) buffer += k;
    }
    renderAnswer();
  });

  document.getElementById('submitBtn').addEventListener('click', () => onSubmit(false));

  document.getElementById('retryBtn').addEventListener('click', () => {
    // 合否・制限時間を問わず、必ず制限時間の設定画面に戻ってから選び直す
    showSetupScreen();
  });
}

function clearTimers() {
  clearTimeout(warnTimeout); clearTimeout(dangerTimeout); clearTimeout(timeoutHandle);
}

function renderAnswer() {
  const isFrac = queue[qIndex].type === 'fraction';
  const answerReadout = document.getElementById('answerReadout');
  const fracInput = document.getElementById('fracInput');
  answerReadout.hidden = isFrac;
  fracInput.hidden = !isFrac;

  if (isFrac) {
    const fracNum = document.getElementById('fracNum');
    const fracDen = document.getElementById('fracDen');
    fracNum.textContent = numerBuf || '?';
    fracNum.classList.toggle('placeholder', numerBuf.length === 0);
    fracNum.classList.toggle('active', fracPhase === 'numer');
    fracDen.textContent = denomBuf || '?';
    fracDen.classList.toggle('placeholder', denomBuf.length === 0);
    fracDen.classList.toggle('active', fracPhase === 'denom');
    return;
  }

  if (buffer.length === 0) {
    answerReadout.classList.add('placeholder');
    answerReadout.innerHTML = 'こたえ<span class="cursor"></span>';
  } else {
    answerReadout.classList.remove('placeholder');
    answerReadout.innerHTML = buffer + '<span class="cursor"></span>';
  }
}

function startTimerBar() {
  const timerFill = document.getElementById('timerFill');
  timerFill.style.transition = 'none';
  timerFill.style.width = '100%';
  timerFill.classList.remove('warn', 'danger');
  void timerFill.offsetWidth;
  if (limitMs == null) return;
  timerFill.style.transition = `width ${limitMs}ms linear`;
  timerFill.style.width = '0%';
  warnTimeout = setTimeout(() => timerFill.classList.add('warn'), limitMs * 0.5);
  dangerTimeout = setTimeout(() => timerFill.classList.add('danger'), limitMs * 0.8);
  timeoutHandle = setTimeout(() => onSubmit(true), limitMs);
}

function loadQuestion() {
  if (qIndex >= queue.length) { showResults(); return; }
  locked = false;
  buffer = '';
  denomBuf = '';
  numerBuf = '';
  fracPhase = 'denom';
  renderAnswer();
  document.getElementById('progressPill').textContent = `${qIndex + 1} / ${queue.length}`;
  document.getElementById('qCategory').textContent = queue[qIndex].prompt;
  const qStem = document.getElementById('qStem');
  qStem.innerHTML = queue[qIndex].stem;
  qStem.classList.toggle('q-stem-long', !!queue[qIndex].long);
  document.getElementById('dotBarKey').textContent = queue[qIndex].type === 'fraction' ? '―' : '.';
  const feedback = document.getElementById('feedback');
  feedback.classList.remove('show', 'correct', 'wrong', 'slow');
  startTime = performance.now();
  startTimerBar();
}

function onSubmit(isTimeout) {
  if (locked) return;
  locked = true;
  clearTimers();
  const elapsed = performance.now() - startTime;
  const isFrac = queue[qIndex].type === 'fraction';
  const given = isFrac ? `${numerBuf}/${denomBuf}` : buffer;
  const correct = !isTimeout && (isFrac ? given === queue[qIndex].answer : answersMatch(given, queue[qIndex].answer));
  const withinTime = limitMs == null ? true : elapsed <= limitMs;
  const pass = correct && withinTime;

  results.push({
    stem: queue[qIndex].stem,
    given: isTimeout ? (given || '(未回答)') : given,
    answer: queue[qIndex].answer,
    elapsed,
    pass,
  });

  const feedback = document.getElementById('feedback');
  const fbBig = document.getElementById('fbBig');
  const fbSub = document.getElementById('fbSub');
  feedback.classList.remove('correct', 'wrong', 'slow');
  if (pass) {
    feedback.classList.add('correct');
    fbBig.textContent = '○ せいかい';
    fbSub.textContent = `${(elapsed / 1000).toFixed(1)}秒`;
  } else if (correct && !withinTime) {
    feedback.classList.add('slow');
    fbBig.textContent = 'おしい（おそい）';
    fbSub.textContent = `${(elapsed / 1000).toFixed(1)}秒 かかった`;
  } else {
    feedback.classList.add('wrong');
    fbBig.textContent = '× ちがう';
    fbSub.textContent = `こたえ: ${queue[qIndex].answer}`;
  }
  feedback.classList.add('show');

  setTimeout(() => {
    qIndex++;
    loadQuestion();
  }, 900);
}

function showResults() {
  document.getElementById('quizScreen').hidden = true;
  document.getElementById('resultScreen').hidden = false;

  const limitKey = limitKeyOf(limitMs);
  const isRestricted = RESTRICTED.includes(limitKey);
  const allPass = results.every(r => r.pass);

  if (isRestricted) lockToday(limitKey); // 合否に関わらず、その日の挑戦権を使い切る
  if (allPass) updateBestTier(limitKey);
  curProgress().lastResult = { limitKey, allPass, timestamp: Date.now() };
  saveProgressToFirebase();

  const resultBanner = document.getElementById('resultBanner');
  const resultSub = document.getElementById('resultSub');
  const resultGrid = document.getElementById('resultGrid');
  const retryBtn = document.getElementById('retryBtn');

  resultBanner.textContent = allPass ? PASS_MESSAGES[limitKey] : 'もういちど';
  resultBanner.className = 'result-banner ' + (allPass ? 'pass' : 'fail');
  if (allPass) {
    retryBtn.textContent = 'つぎの制限時間に挑戦する';
  } else if (isRestricted) {
    retryBtn.textContent = 'せっていにもどる（今日はここまで）';
  } else {
    retryBtn.textContent = 'もういちど挑戦する';
  }
  const passCount = results.filter(r => r.pass).length;
  resultSub.textContent = `${queue.length}問中${passCount}問、制限時間内に正解`;
  resultGrid.innerHTML = '';
  results.forEach(r => {
    const div = document.createElement('div');
    div.className = 'result-item ' + (r.pass ? 'ok' : 'ng');
    const extra = r.pass ? '' : `<div class="ri-a">${r.given} &rarr; ${r.answer}</div>`;
    const cleanStem = r.stem.replace(' = ?', '').replace(' &rarr; ?', '');
    div.innerHTML = `<div class="ri-q">${cleanStem}</div><div class="ri-t">${(r.elapsed / 1000).toFixed(1)}秒</div>${extra}`;
    resultGrid.appendChild(div);
  });
}

// ============================================================
// 起動
// ============================================================
async function boot() {
  progress = await loadProgressFromFirebase();
  render();
}
boot();
