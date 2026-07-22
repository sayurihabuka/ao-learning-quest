/* ============================================================
   青のまなびクエスト — app.js
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
const db    = getDatabase(fbApp);
const FB_PATH = 'ao-learning-quest/progress';

async function loadProgressFromFirebase() {
  try {
    const snapshot = await get(dbRef(db, FB_PATH));
    return snapshot.exists() ? snapshot.val() : {};
  } catch (e) {
    console.warn('[ao] Firebase読み込み失敗:', e);
    return {};
  }
}

function saveProgressToFirebase() {
  set(dbRef(db, FB_PATH), progress).catch(e => {
    console.warn('[ao] Firebase保存失敗:', e);
  });
}

// ============================================================
// 定数
// ============================================================
const TOTAL_NORMAL = 40;
const REVIEW_DAYS  = [1, 3, 7, 14, 30, 60]; // level 0〜5 に対応する次回復習日数
const IMAGE_TYPES  = new Set(['image_word', 'counter_image']);
const KEY_SESSION  = 'ao_session_v1';
const KEY_PROGRESS = 'ao_progress_v1';

// ============================================================
// アプリ状態
// ============================================================
let allQuestions    = [];   // JSON全件
let eligibleQuestions = []; // 出題可能な問題
let questionMap     = {};   // id -> question（高速参照用）
let session         = null; // 当日セッション
let progress        = {};   // 正式進捗

// ============================================================
// 日時ユーティリティ（日本時間基準）
// ============================================================

/** 今日の学習日 YYYY-MM-DD（JST） */
function getStudyDate() {
  const now = new Date();
  const jst = new Date(now.getTime() + (9 * 60 + now.getTimezoneOffset()) * 60000);
  return jst.toISOString().slice(0, 10);
}

/** 指定日 + plusDays の JST 0:00 の UTC タイムスタンプ */
function jstMidnight(dateStr, plusDays) {
  const [y, m, d] = dateStr.split('-').map(Number);
  // JST 0:00 = UTC 前日 15:00 → Date.UTC から 9h 引く
  return Date.UTC(y, m - 1, d + (plusDays || 0)) - 9 * 3600 * 1000;
}

// ============================================================
// 問題分類
// ============================================================

/** 画像が必要な問題かどうか */
function requiresImage(q) {
  return IMAGE_TYPES.has(q.type) || Boolean(q.image);
}

/**
 * 画像なしで出題可能かどうかを判定する。
 * JSON本体を変更せず、アプリ側フィルタリングで使う。
 */
function isQuestionReady(q) {
  if (!q.id || !q.type || !q.word) return false;
  if (typeof q.question !== 'string' || !q.question.trim()) return false;
  if (!Array.isArray(q.choices) || q.choices.length !== 4) return false;
  if (typeof q.answerIndex !== 'number') return false;
  if (q.answerIndex < 0 || q.answerIndex >= q.choices.length) return false;
  if (typeof q.explanation !== 'string' || !q.explanation.trim()) return false;
  if (requiresImage(q)) return false;
  return true;
}

// ============================================================
// 配列シャッフル（Fisher-Yates）
// ============================================================
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 問題の選択肢をシャッフルし、新しい answerIndex とともに返す。
 * 元の choices 配列は破壊しない。
 */
function makeShuffledEntry(q) {
  const correctText = q.choices[q.answerIndex];
  const choices = shuffleArray(q.choices);
  return { choices, answerIndex: choices.indexOf(correctText) };
}

// ============================================================
// 正式進捗（Formal Progress）— localStorage 保存
// ============================================================
function loadProgress() {
  try {
    const raw = localStorage.getItem(KEY_PROGRESS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    console.warn('[ao] 進捗データが壊れています。リセットします。');
    return {};
  }
}

function saveProgress() {
  localStorage.setItem(KEY_PROGRESS, JSON.stringify(progress));
  saveProgressToFirebase();
}

function getOrCreateProgressItem(id) {
  if (!progress[id]) {
    progress[id] = {
      level: 0,
      mark: null,
      correctCount: 0,
      wrongCount: 0,
      unsureCount: 0,
      streak: 0,
      firstAnsweredAt: null,
      lastAnsweredAt: null,
      nextReviewAt: null,
      stableCorrectCount: 0,  // 異なる日に正解した回数
      lastCorrectDate: null,   // 最後に正解した学習日 YYYY-MM-DD
      isMastered: false
    };
  }
  return progress[id];
}

/**
 * 通常40問の判定結果を正式進捗に反映する。
 * 同日やり直しからは呼び出さない。
 */
function applyNormalResult(id, mark, applicationKey) {
  const p     = getOrCreateProgressItem(id);
  const now   = Date.now();
  const today = getStudyDate();

  // 冪等性チェック: 同じ applicationKey がすでに適用済みならスキップ
  if (applicationKey) {
    if (!p.appliedKeys) p.appliedKeys = {};
    if (p.appliedKeys[applicationKey]) return;
  }

  if (!p.firstAnsweredAt) p.firstAnsweredAt = now;
  p.lastAnsweredAt = now;
  p.mark = mark;

  if (mark === 'circle') {
    p.level = Math.min(p.level + 1, 5);
    p.correctCount++;
    p.streak++;
    if (p.lastCorrectDate !== today) {
      p.stableCorrectCount++;
      p.lastCorrectDate = today;
    }
    p.nextReviewAt = jstMidnight(today, REVIEW_DAYS[Math.min(p.level, REVIEW_DAYS.length - 1)]);
    p.isMastered = p.level >= 2 && p.stableCorrectCount >= 2;

  } else if (mark === 'triangle') {
    p.unsureCount++;
    p.nextReviewAt = jstMidnight(today, 1);
    p.isMastered = false;

  } else if (mark === 'cross') {
    p.level = Math.max(p.level - 1, 0);
    p.wrongCount++;
    p.streak = 0;
    p.nextReviewAt = jstMidnight(today, 1);
    p.isMastered = false;
  }

  // 適用済みとして記録してから保存
  if (applicationKey) {
    p.appliedKeys[applicationKey] = true;
  }
  saveProgress();
}

// ============================================================
// セッション管理
// ============================================================
function loadSessionFromStorage() {
  try {
    const raw = localStorage.getItem(KEY_SESSION);
    return raw ? JSON.parse(raw) : null;
  } catch {
    console.warn('[ao] セッションデータが壊れています。リセットします。');
    return null;
  }
}

function saveSession() {
  localStorage.setItem(KEY_SESSION, JSON.stringify(session));
}

/** 当日の新規セッションを生成する */
function createNewSession() {
  const today    = getStudyDate();
  const selected = shuffleArray(eligibleQuestions).slice(0, TOTAL_NORMAL);
  const ids      = selected.map(q => q.id);

  // 選択肢シャッフルを一度だけ行い保存（リロードで変わらない）
  const shuffledData = {};
  for (const q of selected) {
    shuffledData[q.id] = makeShuffledEntry(q);
  }

  return {
    studyDate: today,
    phase: 'normal',        // 'normal'|'complete'|'retry1'|'retry2'|'review'

    // 通常40問
    questionIds:    ids,
    shuffledData:   shuffledData,
    normalIndex:    0,
    normalResults:  {},     // id -> 'circle'|'triangle'|'cross'
    pendingNormal:  null,   // { id, selectedIndex, isCorrect, mark }

    // 同日やり直し 1周目
    retry1Queue:    [],
    retry1Index:    0,
    retry1Results:  {},     // id -> 'cleared'|'failed'
    pendingRetry1:  null,   // { id, selectedIndex, isCorrect }

    // 同日やり直し 2周目
    retry2Queue:    [],
    retry2Index:    0,
    retry2Results:  {},     // id -> 'cleared'|'failed'
    pendingRetry2:  null,

    // UI表示用（正式進捗とは分離）
    sameDayFinalStatus: {}, // id -> 'cleared_round1'|'cleared_round2'|'retry_tomorrow'

    // 今日の新規定着数（表示用）
    newlyMasteredIds: []
  };
}

// ============================================================
// フェーズ遷移
// ============================================================

/** 通常問題の回答を確定し、次の問題へ進む */
function finishNormalQuestion() {
  if (!session.pendingNormal) return;
  const { id, mark, applicationKey } = session.pendingNormal;

  // 正式進捗に反映（applicationKey による冪等チェックで二重適用を防ぐ）
  applyNormalResult(id, mark, applicationKey);
  if (progress[id] && progress[id].isMastered && !session.newlyMasteredIds.includes(id)) {
    session.newlyMasteredIds.push(id);
  }

  session.normalResults[id] = mark;
  session.pendingNormal = null;
  session.normalIndex++;

  if (session.normalIndex >= TOTAL_NORMAL) {
    // 通常40問完了
    const retryIds = session.questionIds.filter(
      qid => ['triangle', 'cross'].includes(session.normalResults[qid])
    );
    if (retryIds.length === 0) {
      session.phase = 'complete';
    } else {
      session.retry1Queue = retryIds;
      session.retry1Index = 0;
      session.phase = 'retry1';
    }
  }
  saveSession();
}

/** 同日やり直し1周目の回答を確定 */
function finishRetry1Question() {
  if (!session.pendingRetry1) return;
  const { id, isCorrect } = session.pendingRetry1;

  session.retry1Results[id] = isCorrect ? 'cleared' : 'failed';
  if (isCorrect) session.sameDayFinalStatus[id] = 'cleared_round1';

  session.pendingRetry1 = null;
  session.retry1Index++;

  if (session.retry1Index >= session.retry1Queue.length) {
    const failed = session.retry1Queue.filter(qid => session.retry1Results[qid] === 'failed');
    if (failed.length === 0) {
      session.phase = 'review';
    } else {
      session.retry2Queue = failed;
      session.retry2Index = 0;
      session.phase = 'retry2';
    }
  }
  saveSession();
}

/** 同日やり直し2周目の回答を確定 */
function finishRetry2Question() {
  if (!session.pendingRetry2) return;
  const { id, isCorrect } = session.pendingRetry2;

  session.retry2Results[id] = isCorrect ? 'cleared' : 'failed';
  session.sameDayFinalStatus[id] = isCorrect ? 'cleared_round2' : 'retry_tomorrow';

  session.pendingRetry2 = null;
  session.retry2Index++;

  if (session.retry2Index >= session.retry2Queue.length) {
    // 2周目でも未処理のものを念のため補完
    session.retry1Queue.forEach(qid => {
      if (!session.sameDayFinalStatus[qid]) {
        session.sameDayFinalStatus[qid] = 'retry_tomorrow';
      }
    });
    session.phase = 'review';
  }
  saveSession();
}

// ============================================================
// HTML ヘルパー
// ============================================================
function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 問題の文脈テキスト（例文またはヒント）を返す */
function getContextText(q) {
  if (q.sentence && q.sentence.trim()) return { label: '例文', text: q.sentence };
  if (q.hint    && q.hint.trim())     return { label: 'ヒント', text: q.hint };
  return null;
}

/** 選択肢ボタンの HTML を生成 */
function choiceButtonsHtml(sd, onclickFn, answered, selectedIndex) {
  const labels = ['ア', 'イ', 'ウ', 'エ'];
  return sd.choices.map((c, i) => {
    let cls = 'btn btn-choice';
    if (answered) {
      cls += ' disabled';
      if (i === sd.answerIndex)                    cls += ' correct-answer';
      else if (i === selectedIndex && i !== sd.answerIndex) cls += ' wrong-answer';
    }
    const disabledAttr = answered ? 'disabled' : '';
    return `
      <button class="${cls}" ${disabledAttr} ${answered ? '' : `onclick="${onclickFn}(${i})"`}>
        <span class="choice-label">${labels[i]}</span>
        <span class="choice-text">${esc(c)}</span>
      </button>`;
  }).join('');
}

/** 問題ヘッダー（問題番号・フェーズ名） */
function questionHeaderHtml(current, total, phaseLabel) {
  return `
    <div class="question-header">
      <span class="question-progress">${current} / ${total}</span>
      <span class="question-phase">${esc(phaseLabel)}</span>
    </div>`;
}

/** 語句＋読みブロック */
function wordBlockHtml(q) {
  const reading = q.reading && q.reading.trim()
    ? `<span class="reading">（${esc(q.reading)}）</span>` : '';
  return `
    <div class="question-word">
      <span class="word">${esc(q.word)}</span>
      ${reading}
    </div>`;
}

/** 文脈テキストブロック */
function contextHtml(q) {
  const ctx = getContextText(q);
  if (!ctx) return '';
  return `
    <div class="question-context">
      <span class="context-label">${ctx.label}</span>
      ${esc(ctx.text)}
    </div>`;
}

/** 結果ブロック */
function resultBlockHtml(isCorrect, correctText, explanation) {
  const cls   = isCorrect ? 'result-correct' : 'result-wrong';
  const label = isCorrect ? '○ せいかい！' : '× ざんねん…';
  return `
    <div class="result-block ${cls}">
      <div class="result-label">${label}</div>
      <div class="result-answer">正しい答え：<strong>${esc(correctText)}</strong></div>
      <div class="result-explanation">${esc(explanation)}</div>
    </div>`;
}

// ============================================================
// 画面描画
// ============================================================

/** 現在の session.phase に応じて適切な画面を描画 */
function render() {
  const app = document.getElementById('app');
  if (!session) { renderHome(app); return; }
  switch (session.phase) {
    case 'normal':   renderNormal(app);   break;
    case 'complete': renderComplete(app); break;
    case 'retry1':   renderRetry(app, 1); break;
    case 'retry2':   renderRetry(app, 2); break;
    case 'review':   renderReview(app);   break;
    default:         renderHome(app);
  }
}

// ---- ホーム画面 ----
function renderHome(app) {
  const today    = getStudyDate();
  const hasToday = session && session.studyDate === today;
  const isDone   = hasToday && (session.phase === 'complete' || session.phase === 'review');
  const isInProgress = hasToday && !isDone &&
    (session.normalIndex > 0 || session.pendingNormal || Object.keys(session.normalResults).length > 0);

  let actionHtml;
  if (isDone) {
    actionHtml = `
      <div class="home-completed-msg">今日の学習は完了しました！</div>
      <button class="btn btn-start" onclick="viewResult()">結果をもう一度みる</button>`;
  } else if (isInProgress) {
    actionHtml = `
      <div class="home-progress-note">学習の途中です</div>
      <button class="btn btn-start" onclick="startSession()">続きから再開する</button>`;
  } else {
    actionHtml = `
      <button class="btn btn-start" onclick="startSession()">今日のクエストをはじめる</button>`;
  }

  app.innerHTML = `
    <div class="screen screen-home">
      <div class="home-header">
        <div class="home-title">青のまなびクエスト</div>
        <div class="home-subtitle">語彙力UP1300</div>
      </div>
      <div class="home-body">
        <div class="home-info">今日の問題数：<strong>${TOTAL_NORMAL}問</strong></div>
        ${actionHtml}
      </div>
    </div>`;
}

// ---- 通常問題画面 ----
function renderNormal(app) {
  const { normalIndex, questionIds, shuffledData, pendingNormal } = session;
  const id = questionIds[normalIndex];
  const q  = questionMap[id];
  const sd = shuffledData[id];

  if (pendingNormal) {
    // 回答済み状態を表示
    const { selectedIndex, isCorrect, mark } = pendingNormal;
    const isUnsure = mark === 'triangle';
    const buttons  = choiceButtonsHtml(sd, '', true, selectedIndex);
    const unsureBtn = isCorrect ? `
      <button class="btn btn-unsure ${isUnsure ? 'btn-unsure-active' : ''}" onclick="toggleUnsure()">
        ${isUnsure ? '△ ちょっとあやしい（選択中）' : '△ ちょっとあやしい'}
      </button>
      <div class="unsure-hint">迷った・たまたま正解・消去法・意味が少し不安　→ 押してね</div>` : '';

    app.innerHTML = `
      <div class="screen screen-question">
        ${questionHeaderHtml(normalIndex + 1, TOTAL_NORMAL, '通常問題')}
        ${wordBlockHtml(q)}
        ${contextHtml(q)}
        <div class="question-text"><span class="context-label">問題</span>${esc(q.question)}</div>
        <div class="choices">${buttons}</div>
        ${resultBlockHtml(isCorrect, sd.choices[sd.answerIndex], q.explanation)}
        <div class="answer-actions">
          ${unsureBtn}
          <button class="btn btn-next" onclick="nextNormal()">次へ →</button>
        </div>
      </div>`;
    return;
  }

  // 未回答状態
  const buttons = choiceButtonsHtml(sd, 'answerNormal', false, -1);
  app.innerHTML = `
    <div class="screen screen-question">
      ${questionHeaderHtml(normalIndex + 1, TOTAL_NORMAL, '通常問題')}
      ${wordBlockHtml(q)}
      ${contextHtml(q)}
      <div class="question-text">${esc(q.question)}</div>
      <div class="choices">${buttons}</div>
    </div>`;
}

// ---- 通常完了画面（△×=0） ----
function renderComplete(app) {
  const results  = session.normalResults;
  const circles  = Object.values(results).filter(r => r === 'circle').length;
  const mastered = session.newlyMasteredIds.length;
  const praisePool =
    mastered >= 10 ? ['パーフェクト！', 'さいこう！'] :
    mastered >=  5 ? ['かんぺき！', '天才！'] :
    mastered >=  1 ? ['すごい！', 'やったね！'] :
                     ['よくがんばったね！'];
  const praise = praisePool[Math.floor(Math.random() * praisePool.length)];

  app.innerHTML = `
    <div class="screen screen-complete">
      <div class="hanamaru-wrap">
        <img class="hanamaru" src="images/hanamaru.png" alt="花丸">
        <div class="praise-word">${praise}</div>
      </div>
      <div class="complete-header">40問、完了！</div>
      <div class="complete-summary">
        <div class="summary-item summary-circle">○ せいかい：<strong>${circles}問</strong></div>
        <div class="summary-item summary-triangle">△ あやしい：<strong>0問</strong></div>
        <div class="summary-item summary-cross">× まちがい：<strong>0問</strong></div>
      </div>
      <div class="complete-message">
        <p>△も×も<strong>0問</strong>だったよ！</p>
        <p>やり直しは必要なし。<br>今日もよくがんばりました！</p>
      </div>
      ${mastered > 0 ? `<div class="mastered-count">⭐ 今日、定着○になった語：<strong>${mastered}語</strong></div>` : ''}
      <button class="btn btn-start" onclick="goHome()">ホームへ戻る</button>
    </div>`;
}

// ---- 同日やり直し 1周目・2周目 ----
function renderRetry(app, round) {
  const isR1       = round === 1;
  const queue      = isR1 ? session.retry1Queue  : session.retry2Queue;
  const index      = isR1 ? session.retry1Index  : session.retry2Index;
  const pending    = isR1 ? session.pendingRetry1 : session.pendingRetry2;
  const phaseLabel = isR1 ? '同日やり直し 1周目'    : '同日やり直し 2周目';
  const finishFn   = `nextRetry(${round})`;
  const answerFn   = `answerRetry`;

  const id = queue[index];
  const q  = questionMap[id];
  const sd = session.shuffledData[id]; // 通常問題と同じシャッフル済みデータ

  if (pending) {
    const { selectedIndex, isCorrect } = pending;
    const buttons = choiceButtonsHtml(sd, '', true, selectedIndex);
    app.innerHTML = `
      <div class="screen screen-question">
        ${questionHeaderHtml(index + 1, queue.length, phaseLabel)}
        ${wordBlockHtml(q)}
        ${contextHtml(q)}
        <div class="question-text"><span class="context-label">問題</span>${esc(q.question)}</div>
        <div class="choices">${buttons}</div>
        ${resultBlockHtml(isCorrect, sd.choices[sd.answerIndex], q.explanation)}
        <div class="answer-actions">
          <button class="btn btn-next" onclick="${finishFn}">次へ →</button>
        </div>
      </div>`;
    return;
  }

  const buttons = choiceButtonsHtml(sd, `answerRetry${round}`, false, -1);
  app.innerHTML = `
    <div class="screen screen-question">
      ${questionHeaderHtml(index + 1, queue.length, phaseLabel)}
      ${wordBlockHtml(q)}
      ${contextHtml(q)}
      <div class="question-text">${esc(q.question)}</div>
      <div class="choices">${buttons}</div>
    </div>`;
}

// ---- 最後の振り返り画面 ----
function renderReview(app) {
  const reviewIds = session.retry1Queue;
  const cleared1  = reviewIds.filter(id => session.sameDayFinalStatus[id] === 'cleared_round1').length;
  const cleared2  = reviewIds.filter(id => session.sameDayFinalStatus[id] === 'cleared_round2').length;
  const retryTmr  = reviewIds.filter(id => session.sameDayFinalStatus[id] === 'retry_tomorrow').length;
  const mastered  = session.newlyMasteredIds.length;

  const STATUS_LABEL = {
    cleared_round1: '今日のクリア',
    cleared_round2: '2周目でクリア',
    retry_tomorrow: '明日もう一度'
  };
  const STATUS_CLS = {
    cleared_round1: 'status-cleared1',
    cleared_round2: 'status-cleared2',
    retry_tomorrow: 'status-retry'
  };
  const ITEM_CLS = {
    cleared_round1: 'review-item-cleared1',
    cleared_round2: 'review-item-cleared2',
    retry_tomorrow: 'review-item-retry'
  };

  const itemsHtml = reviewIds.map(id => {
    const q       = questionMap[id];
    const sd      = session.shuffledData[id];
    const nm      = session.normalResults[id];
    const status  = session.sameDayFinalStatus[id] || 'retry_tomorrow';
    const markCls = nm === 'cross' ? 'cross' : '';
    const markTxt = nm === 'triangle' ? '△' : '×';

    return `
      <div class="review-item ${ITEM_CLS[status] || ''}">
        <div class="review-word">
          ${esc(q.word)}
          ${q.reading && q.reading.trim() ? `<span class="review-reading">（${esc(q.reading)}）</span>` : ''}
          <span class="review-normal-mark ${markCls}">${markTxt}</span>
        </div>
        <div class="review-answer">正しい答え：<strong>${esc(sd.choices[sd.answerIndex])}</strong></div>
        <div class="review-explanation">${esc(q.explanation)}</div>
        <span class="review-status ${STATUS_CLS[status] || 'status-retry'}">${STATUS_LABEL[status] || '明日もう一度'}</span>
      </div>`;
  }).join('');

  app.innerHTML = `
    <div class="screen screen-review">
      <div class="review-header">振り返り</div>
      <div class="review-subheader">今日の△・×だった問題（${reviewIds.length}問）</div>
      <div class="review-summary">
        <div class="review-summary-row">
          <span>今日のクリア</span><strong>${cleared1}問</strong>
        </div>
        <div class="review-summary-row">
          <span>2周目でクリア</span><strong>${cleared2}問</strong>
        </div>
        <div class="review-summary-row">
          <span>明日もう一度</span><strong>${retryTmr}問</strong>
        </div>
        ${mastered > 0 ? `<div class="review-summary-row" style="color:var(--color-primary)">
          <span>⭐ 定着○になった語</span><strong>${mastered}語</strong>
        </div>` : ''}
      </div>
      <div class="review-list">${itemsHtml}</div>
      <button class="btn btn-start" onclick="goHome()">ホームへ戻る</button>
    </div>`;
}

// ---- エラー画面 ----
function renderError(app, title, body, detail) {
  app.innerHTML = `
    <div class="screen screen-error">
      <div class="error-title">${esc(title)}</div>
      <div class="error-body">${body}</div>
      ${detail ? `<div class="error-detail">${esc(detail)}</div>` : ''}
      <button class="btn btn-start" onclick="location.reload()">再読み込み</button>
    </div>`;
}

// ============================================================
// ユーザー操作ハンドラ（HTML の onclick から呼ばれる）
// ============================================================

function startSession() {
  const today = getStudyDate();
  if (!session || session.studyDate !== today) {
    session = createNewSession();
    saveSession();
  }
  render();
}

function viewResult() {
  render();
}

function goHome() {
  renderHome(document.getElementById('app'));
}

/** 通常問題で選択肢を選んだとき */
function answerNormal(selectedIndex) {
  const id = session.questionIds[session.normalIndex];
  const sd = session.shuffledData[id];
  const isCorrect = selectedIndex === sd.answerIndex;
  if (isCorrect) spawnConfetti();
  session.pendingNormal = {
    id, selectedIndex, isCorrect,
    mark: isCorrect ? 'circle' : 'cross',
    applicationKey: `${session.studyDate}:${id}:normal`
  };
  saveSession();
  render();
}

/** 正解エフェクト */
function spawnConfetti() {
  const emojis = ['⭐', '✨', '🎉', '💫', '🌟', '🎊', '🌈', '💥', '🎵', '🏆'];
  for (let i = 0; i < 12; i++) {
    const el = document.createElement('div');
    el.className = 'confetti';
    el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    el.style.left = (5 + Math.random() * 90) + 'vw';
    el.style.top  = (5 + Math.random() * 50) + 'vh';
    el.style.animationDelay = (Math.random() * 0.5) + 's';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1800);
  }
}

/** 「ちょっとあやしい」トグル */
function toggleUnsure() {
  if (!session.pendingNormal) return;
  const cur = session.pendingNormal.mark;
  session.pendingNormal.mark = cur === 'triangle' ? 'circle' : 'triangle';
  saveSession();
  render();
}

/** 通常問題の「次へ」 */
function nextNormal() {
  finishNormalQuestion();
  render();
}

/** 同日やり直し1周目で選択肢を選んだとき */
function answerRetry1(selectedIndex) {
  const id = session.retry1Queue[session.retry1Index];
  const sd = session.shuffledData[id];
  session.pendingRetry1 = { id, selectedIndex, isCorrect: selectedIndex === sd.answerIndex };
  saveSession();
  render();
}

/** 同日やり直し2周目で選択肢を選んだとき */
function answerRetry2(selectedIndex) {
  const id = session.retry2Queue[session.retry2Index];
  const sd = session.shuffledData[id];
  session.pendingRetry2 = { id, selectedIndex, isCorrect: selectedIndex === sd.answerIndex };
  saveSession();
  render();
}

/** 同日やり直しの「次へ」（round=1 or 2） */
function nextRetry(round) {
  if (round === 1) finishRetry1Question();
  else             finishRetry2Question();
  render();
}

// ============================================================
// アプリ初期化
// ============================================================
async function init() {
  const app = document.getElementById('app');

  // JSON 読み込み
  try {
    const res = await fetch('data/vocab1300.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    allQuestions = await res.json();
  } catch (err) {
    renderError(app,
      'データの読み込みに失敗しました',
      '問題データを読み込めませんでした。<br>ページを再読み込みしてください。',
      err.message
    );
    return;
  }

  // 問題マップ構築
  allQuestions.forEach(q => { questionMap[q.id] = q; });

  // 問題分類
  const imageWaiting  = allQuestions.filter(q => requiresImage(q));
  const dataInvalid   = allQuestions.filter(q => !requiresImage(q) && !isQuestionReady(q));
  eligibleQuestions   = allQuestions.filter(q => isQuestionReady(q));

  // 開発者コンソールに件数を出力（青ちゃんの画面には表示しない）
  console.log(`[ao] 総件数: ${allQuestions.length}`);
  console.log(`[ao] 出題可能（画像なし）: ${eligibleQuestions.length}`);
  console.log(`[ao] 画像準備待ちで除外: ${imageWaiting.length} (image_word: ${allQuestions.filter(q=>q.type==='image_word').length}, counter_image: ${allQuestions.filter(q=>q.type==='counter_image').length})`);
  console.log(`[ao] データ不備で除外: ${dataInvalid.length}`);

  if (eligibleQuestions.length < TOTAL_NORMAL) {
    renderError(app,
      '出題可能な問題が不足しています',
      `出題可能問題：${eligibleQuestions.length}問<br>（${TOTAL_NORMAL}問必要）`,
      null
    );
    return;
  }

  // 進捗読み込み（localStorage を即時ロード → Firebase でマージ）
  progress = loadProgress();
  loadProgressFromFirebase().then(fbData => {
    let updated = false;
    for (const [id, fbItem] of Object.entries(fbData)) {
      const local = progress[id];
      if (!local || (fbItem.lastAnsweredAt || 0) > (local.lastAnsweredAt || 0)) {
        progress[id] = fbItem;
        updated = true;
      }
    }
    if (updated) {
      localStorage.setItem(KEY_PROGRESS, JSON.stringify(progress));
      console.log('[ao] Firebase から進捗をマージしました');
    }
  });

  // セッション復元または新規作成
  const today  = getStudyDate();
  const stored = loadSessionFromStorage();

  if (stored && stored.studyDate === today) {
    session = stored;
    // 完了済みまたは途中の場合はそのまま描画
    const isFresh = session.normalIndex === 0
      && !session.pendingNormal
      && Object.keys(session.normalResults).length === 0;

    if (isFresh) {
      renderHome(app); // 新規セッション作成済みだがまだ開始していない
    } else {
      render(); // 途中 or 完了 → そのまま復元
    }
  } else {
    // 昨日以前のセッション or セッションなし → ホーム
    session = null;
    renderHome(app);
  }
}

// type="module" ではモジュールスコープになるため、
// onclick="..." から呼べるよう window に登録する
window.startSession  = startSession;
window.viewResult    = viewResult;
window.goHome        = goHome;
window.answerNormal  = answerNormal;
window.toggleUnsure  = toggleUnsure;
window.nextNormal    = nextNormal;
window.answerRetry1  = answerRetry1;
window.answerRetry2  = answerRetry2;
window.nextRetry     = nextRetry;

init();
