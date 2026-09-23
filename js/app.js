// 介面控制：導覽、編輯器、執行、批改、進度
import { TOPICS, EXERCISES, COMBOS, ALL_ITEMS, findItem } from './exercises.js';
import { TABLE_META } from './schema.js';
import { DIALECT_NOTES, splitStatements } from './oracle.js';
import { evaluate, runSql, solutionPreview } from './engine.js';
import { loadEngine, getSQL, freshDatabase, getSandboxDatabase, resetSandboxDatabase } from './db.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const KEY = {
  progress: 'osw:progress',
  draft: (id) => `osw:draft:${id}`,
  theme: 'osw:theme',
  last: 'osw:last',
  sandbox: 'osw:sandbox',
};

// localStorage 在無痕模式可能整個拋錯，一律包起來
const store = {
  get(k, fallback = null) {
    try {
      const v = localStorage.getItem(k);
      return v === null ? fallback : JSON.parse(v);
    } catch { return fallback; }
  },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 忽略 */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* 忽略 */ } },
};

const state = {
  mode: 'single',
  item: null,
  progress: store.get(KEY.progress, {}) || {},
};

const SANDBOX_SAMPLES = [
  ['看看全部員工', 'SELECT * FROM employees ORDER BY emp_id;'],
  ['NULL 與外連接', `SELECT d.dept_name, e.emp_name
FROM   departments d
FULL   OUTER JOIN employees e ON e.dept_id = d.dept_id
ORDER  BY d.dept_id, e.emp_id;`],
  ['Oracle 專有函數', `SELECT SYSDATE,
       TO_CHAR(SYSDATE, 'YYYY/MM/DD') AS today,
       ADD_MONTHS(SYSDATE, -3)        AS three_months_ago,
       NVL(NULL, '空值補這個')          AS nvl_demo,
       DECODE(1, 1, '一', 2, '二', '其他') AS decode_demo
FROM   dual;`],
  ['MERGE 做 UPSERT', `MERGE INTO emp_bonus b
USING (SELECT emp_id, salary * 0.1 AS amt FROM employees) s
ON    (b.emp_id = s.emp_id)
WHEN MATCHED THEN
  UPDATE SET b.bonus_amt = s.amt
WHEN NOT MATCHED THEN
  INSERT (emp_id, bonus_amt) VALUES (s.emp_id, s.amt);

SELECT * FROM emp_bonus ORDER BY emp_id;`],
  ['NOT IN 的 NULL 陷阱', `-- 這段會回傳 0 筆，因為 projects.dept_id 裡有 NULL
SELECT dept_id FROM departments
WHERE  dept_id NOT IN (SELECT dept_id FROM projects);`],
];

// ── 主題 ────────────────────────────────────────────────────────

function applyTheme(theme) {
  if (theme) document.documentElement.setAttribute('data-theme', theme);
  else document.documentElement.removeAttribute('data-theme');
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const next = current ? (current === 'dark' ? 'light' : 'dark')
    : (prefersDark ? 'light' : 'dark');
  applyTheme(next);
  store.set(KEY.theme, next);
}

// ── 進度 ────────────────────────────────────────────────────────

const isSolved = (id) => !!state.progress[id];

function markSolved(id) {
  if (state.progress[id]) return;
  state.progress[id] = Date.now();
  store.set(KEY.progress, state.progress);
  renderProgress();
  renderNav();
}

function renderProgress() {
  const total = ALL_ITEMS.length;
  const done = ALL_ITEMS.filter((i) => isSolved(i.id)).length;
  $('progressText').textContent = `${done} / ${total}`;
  $('progressFill').style.width = total ? `${(done / total) * 100}%` : '0';
}

// ── 左側導覽 ────────────────────────────────────────────────────

function renderNav() {
  const host = $('navList');

  if (state.mode === 'sandbox') {
    host.innerHTML = `<div class="nav-group">
      <div class="nav-group-title">範例，點了就填進去</div>
      ${SANDBOX_SAMPLES.map((s, i) =>
        `<button class="nav-item" data-sample="${i}"><span class="tick"></span>${esc(s[0])}</button>`).join('')}
    </div>`;
    host.querySelectorAll('[data-sample]').forEach((btn) => {
      btn.onclick = () => {
        $('sandboxInput').value = SANDBOX_SAMPLES[+btn.dataset.sample][1];
        syncGutter('sandboxInput', 'sandboxGutter');
        $('sandboxInput').focus();
      };
    });
    return;
  }

  if (state.mode === 'combo') {
    host.innerHTML = `<div class="nav-group">
      <div class="nav-group-title">組合練習 · 一題用上多種語法</div>
      ${COMBOS.map((c) => navItem(c)).join('')}
    </div>`;
    wireNavItems(host);
    return;
  }

  const groups = [];
  for (const t of TOPICS) {
    let g = groups.find((x) => x.name === t.group);
    if (!g) groups.push((g = { name: t.group, topics: [] }));
    g.topics.push(t);
  }

  host.innerHTML = groups.map((g) => `
    <div class="nav-group">
      <div class="nav-group-title">${esc(g.name)}</div>
      ${g.topics.map((t) => {
        const items = EXERCISES.filter((e) => e.topicId === t.id);
        const done = items.filter((e) => isSolved(e.id)).length;
        const open = state.item && items.some((e) => e.id === state.item.id);
        return `<details class="nav-topic"${open ? ' open' : ''}>
          <summary>${esc(t.name)}
            <span class="nav-count${done === items.length ? ' done' : ''}">${done}/${items.length}</span>
          </summary>
          ${items.map((e) => navItem(e)).join('')}
        </details>`;
      }).join('')}
    </div>`).join('');
  wireNavItems(host);
}

function navItem(item) {
  const active = state.item && state.item.id === item.id;
  return `<button class="nav-item${active ? ' active' : ''}" data-id="${item.id}">
    <span class="tick">${isSolved(item.id) ? '✓' : ''}</span>${esc(item.title)}</button>`;
}

function wireNavItems(host) {
  host.querySelectorAll('[data-id]').forEach((btn) => {
    btn.onclick = () => selectItem(btn.dataset.id);
  });
}

// ── 題目 ────────────────────────────────────────────────────────

function selectItem(id) {
  const item = findItem(id);
  if (!item) return;
  state.item = item;
  store.set(KEY.last, id);
  renderExercise();
  renderNav();
  renderSyntaxPanel();
}

function renderChips() {
  const item = state.item;
  if (!item) return;
  const topicNames = item.mode === 'combo'
    ? (item.topicIds || []).map((tid) => (TOPICS.find((t) => t.id === tid) || {}).name).filter(Boolean)
    : [(TOPICS.find((t) => t.id === item.topicId) || {}).name];

  const diffText = ['', '入門', '進階', '挑戰'][item.difficulty] || '';
  $('exChips').innerHTML = [
    ...topicNames.map((n) => `<span class="chip topic">${esc(n)}</span>`),
    `<span class="chip">${esc(diffText)}</span>`,
    item.kind === 'dml' ? '<span class="chip">DML</span>' : '',
    isSolved(item.id) ? '<span class="chip solved">✓ 已完成</span>' : '',
  ].filter(Boolean).join('');
}

function renderExercise() {
  const item = state.item;
  if (!item) return;
  renderChips();
  $('exTitle').textContent = item.title;
  $('exPrompt').textContent = item.prompt;
  $('exHint').textContent = item.hint || '';
  $('hintBox').open = false;
  $('hintBox').hidden = !item.hint;

  $('sqlInput').value = store.get(KEY.draft(item.id), '') || '';
  syncGutter('sqlInput', 'gutter');
  $('feedback').hidden = true;
  $('resultArea').innerHTML = '';
}

// ── 編輯器 ──────────────────────────────────────────────────────

function syncGutter(inputId, gutterId) {
  const ta = $(inputId);
  const lines = ta.value.split('\n').length;
  $(gutterId).innerHTML = Array.from({ length: Math.max(lines, 1) }, (_, i) => i + 1).join('<br>');
  $(gutterId).scrollTop = ta.scrollTop;
}

function wireEditor(inputId, gutterId, onRun) {
  const ta = $(inputId);
  ta.addEventListener('input', () => {
    syncGutter(inputId, gutterId);
    if (inputId === 'sqlInput' && state.item) store.set(KEY.draft(state.item.id), ta.value);
    if (inputId === 'sandboxInput') store.set(KEY.sandbox, ta.value);
  });
  ta.addEventListener('scroll', () => { $(gutterId).scrollTop = ta.scrollTop; });
  ta.addEventListener('keydown', (ev) => {
    if (ev.key === 'Tab') {
      ev.preventDefault();
      const { selectionStart: s, selectionEnd: e } = ta;
      ta.value = ta.value.slice(0, s) + '  ' + ta.value.slice(e);
      ta.selectionStart = ta.selectionEnd = s + 2;
      ta.dispatchEvent(new Event('input'));
    } else if ((ev.metaKey || ev.ctrlKey) && ev.key === 'Enter') {
      ev.preventDefault();
      onRun();
    }
  });
}

// ── 結果呈現 ────────────────────────────────────────────────────

function resultTable(result, caption) {
  if (!result || !result.columns.length) {
    return `<div class="card result-card"><div class="result-head">
      <span>${esc(caption || '執行完成')}</span><span>沒有結果集</span></div></div>`;
  }
  const head = result.columns.map((c) => `<th>${esc(c)}</th>`).join('');
  const body = result.values.map((row) => '<tr>' + row.map((v) => {
    if (v === null || v === undefined) return '<td class="null">(null)</td>';
    if (typeof v === 'number') return `<td class="num">${esc(v)}</td>`;
    return `<td>${esc(v)}</td>`;
  }).join('') + '</tr>').join('');
  return `<div class="card result-card">
    <div class="result-head"><span>${esc(caption || '查詢結果')}</span>
      <span><strong>${result.values.length}</strong> 列 · <strong>${result.columns.length}</strong> 欄</span></div>
    <div class="table-scroll"><table class="result">
      <thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>
  </div>`;
}

function showFeedback(hostId, kind, title, body, pre) {
  const el = $(hostId);
  el.hidden = false;
  el.className = `feedback ${kind}`;
  el.innerHTML = `<h3>${esc(title)}</h3>${body ? `<p>${esc(body)}</p>` : ''}${pre ? `<pre>${esc(pre)}</pre>` : ''}`;
}

// ── 動作：執行 / 檢查 / 解答 ─────────────────────────────────────

function runCurrent() {
  const item = state.item;
  const sql = $('sqlInput').value.trim();
  if (!sql) return showFeedback('feedback', 'warn', '編輯器是空的', '先寫點 SQL 再執行。');

  const db = freshDatabase();
  try {
    const run = runSql(db, sql);
    const parts = [];
    if (item && item.kind === 'dml') {
      parts.push(`<div class="card result-card"><div class="result-head">
        <span>DML 執行完成</span><span>異動 <strong>${run.rowsModified}</strong> 列</span></div></div>`);
      for (const t of item.affects || []) {
        const res = db.exec(`SELECT * FROM ${t} ORDER BY 1`);
        parts.push(resultTable(res.length ? res[0] : null, `執行後的 ${t}`));
      }
    } else if (run.lastResult) {
      parts.push(resultTable(run.lastResult, '查詢結果'));
    } else {
      parts.push(`<div class="card result-card"><div class="result-head">
        <span>執行完成</span><span>異動 <strong>${run.rowsModified}</strong> 列</span></div></div>`);
    }
    $('resultArea').innerHTML = parts.join('');
    showFeedback('feedback', 'warn', '已執行，但還沒批改',
      '這只是讓你看結果。要判定對錯請按「檢查答案」。');
  } catch (err) {
    $('resultArea').innerHTML = '';
    showFeedback('feedback', 'bad', 'SQL 執行失敗', err.message);
  } finally {
    db.close();
  }
}

function checkCurrent() {
  const item = state.item;
  if (!item) return;
  const sql = $('sqlInput').value.trim();
  if (!sql) return showFeedback('feedback', 'warn', '編輯器是空的', '先寫點 SQL 再檢查。');

  let res;
  try {
    res = evaluate({ SQL: getSQL(), exercise: item, userSql: sql });
  } catch (err) {
    return showFeedback('feedback', 'bad', '批改時發生錯誤', err.message);
  }

  // 附上使用者這段 SQL 實際跑出來的東西，方便對照
  try {
    const db = freshDatabase();
    try {
      const run = runSql(db, sql);
      if (item.kind === 'dml') {
        $('resultArea').innerHTML = (item.affects || [])
          .map((t) => {
            const r = db.exec(`SELECT * FROM ${t} ORDER BY 1`);
            return resultTable(r.length ? r[0] : null, `你執行後的 ${t}`);
          }).join('');
      } else {
        $('resultArea').innerHTML = resultTable(run.lastResult, '你的查詢結果');
      }
    } finally { db.close(); }
  } catch { $('resultArea').innerHTML = ''; }

  if (res.ok) {
    markSolved(item.id);
    renderChips();
    showFeedback('feedback', 'ok', '✓ 答對了',
      res.warning || '結果與參考答案完全一致。');
  } else if (res.kind === 'syntax') {
    showFeedback('feedback', 'warn', '語法要求沒達到', res.reason);
  } else if (res.kind === 'error') {
    showFeedback('feedback', 'bad', 'SQL 執行失敗', res.reason);
  } else {
    showFeedback('feedback', 'bad', '結果不對', res.reason, res.detail || null);
  }
}

function showSolution() {
  const item = state.item;
  if (!item) return;
  $('sqlInput').value = item.solution;
  syncGutter('sqlInput', 'gutter');
  store.set(KEY.draft(item.id), item.solution);
  try {
    const previews = solutionPreview({ SQL: getSQL(), exercise: item });
    $('resultArea').innerHTML = previews
      .map((p) => resultTable(p.result, p.table ? `參考答案執行後的 ${p.table}` : '參考答案的結果'))
      .join('');
  } catch (err) {
    $('resultArea').innerHTML = '';
  }
  showFeedback('feedback', 'warn', '這是參考答案',
    '已經填進編輯器了。看懂之後建議清空自己重寫一次 —— 看解答不會算完成。');
}

function runSandbox() {
  const sql = $('sandboxInput').value.trim();
  if (!sql) return showFeedback('sandboxFeedback', 'warn', '編輯器是空的', '先寫點 SQL 再執行。');
  const db = getSandboxDatabase();
  try {
    const run = runSql(db, sql);
    const withData = run.results.filter(Boolean);
    const tables = withData
      .map((r, i) => resultTable(r, withData.length > 1 ? `第 ${i + 1} 個結果集` : '查詢結果'));
    $('sandboxResult').innerHTML = tables.length ? tables.join('') :
      `<div class="card result-card"><div class="result-head">
        <span>執行完成</span><span>異動 <strong>${run.rowsModified}</strong> 列</span></div></div>`;
    const n = splitStatements(sql).length;
    showFeedback('sandboxFeedback', 'ok', '執行成功',
      `共 ${n} 段語句，異動 ${run.rowsModified} 列。`);
  } catch (err) {
    $('sandboxResult').innerHTML = '';
    showFeedback('sandboxFeedback', 'bad', 'SQL 執行失敗', err.message);
  }
}

// ── 右側面板 ────────────────────────────────────────────────────

function renderSchemaPanel() {
  $('panelSchema').innerHTML = TABLE_META.map((t) => `
    <div class="card panel-card">
      <h4>${esc(t.name)} <span class="tag">${esc(t.label)}</span></h4>
      <ul class="col-list">
        ${t.columns.map(([n, ty, note]) => `<li>
          <span class="col-name">${esc(n)}</span>
          <span class="col-type">${esc(ty)}</span>
          <span class="col-note">${esc(note)}</span></li>`).join('')}
      </ul>
    </div>`).join('');
}

function renderSyntaxPanel() {
  const item = state.item;
  let topicIds = [];
  if (state.mode === 'sandbox') topicIds = TOPICS.map((t) => t.id);
  else if (item) topicIds = item.mode === 'combo' ? (item.topicIds || []) : [item.topicId];

  const shown = topicIds.map((id) => TOPICS.find((t) => t.id === id)).filter(Boolean);
  $('panelSyntax').innerHTML = shown.length
    ? shown.map((t) => `
      <div class="card panel-card">
        <h4>${esc(t.name)}</h4>
        <p class="summary-text">${esc(t.summary)}</p>
        <pre class="syntax">${esc(t.syntax)}</pre>
      </div>`).join('')
    : '<div class="card panel-card"><p class="summary-text">選一題之後，這裡會顯示對應的語法重點。</p></div>';
}

function renderDialectPanel() {
  $('panelDialect').innerHTML = `
    <div class="card panel-card">
      <h4>這個練習站實際上跑什麼</h4>
      <p class="summary-text">底層引擎是 SQLite（WebAssembly），外面包了一層 Oracle 方言轉換。
        下面這些 Oracle 寫法都能直接用，但仍有少數差異，正式環境請以真正的 Oracle 為準。</p>
      <ul class="dialect-list">
        ${DIALECT_NOTES.map(([k, v]) => `<li><b>${esc(k)}</b><span>${esc(v)}</span></li>`).join('')}
      </ul>
    </div>`;
}

// ── 模式切換 ────────────────────────────────────────────────────

function setMode(mode) {
  state.mode = mode;
  document.querySelectorAll('.mode-tabs button').forEach((b) =>
    b.classList.toggle('active', b.dataset.mode === mode));
  $('exercisePane').hidden = mode === 'sandbox';
  $('sandboxPane').hidden = mode !== 'sandbox';

  if (mode !== 'sandbox') {
    const pool = mode === 'combo' ? COMBOS : EXERCISES;
    if (!state.item || !pool.some((x) => x.id === state.item.id)) {
      state.item = findItem(pool[0].id);
      store.set(KEY.last, state.item.id);
      renderExercise();
    }
  }
  renderNav();
  renderSyntaxPanel();
}

function setPanel(name) {
  document.querySelectorAll('.panel-tabs button').forEach((b) =>
    b.classList.toggle('active', b.dataset.panel === name));
  $('panelSchema').hidden = name !== 'schema';
  $('panelSyntax').hidden = name !== 'syntax';
  $('panelDialect').hidden = name !== 'dialect';
}

// ── 啟動 ────────────────────────────────────────────────────────

async function init() {
  applyTheme(store.get(KEY.theme, null));

  try {
    await loadEngine();
    freshDatabase().close(); // 先驗證 schema 建得起來
  } catch (err) {
    $('loading').innerHTML = `<p style="color:var(--err)">載入失敗：${esc(err.message)}</p>
      <p>如果是用 file:// 直接開啟，請改用本機伺服器，例如在專案資料夾執行
      <code>python3 -m http.server 8000</code> 後開啟 http://localhost:8000</p>`;
    return;
  }

  $('loading').hidden = true;
  $('layout').hidden = false;

  renderSchemaPanel();
  renderDialectPanel();

  const lastId = store.get(KEY.last, null);
  const last = lastId ? findItem(lastId) : null;
  state.item = last || EXERCISES[0];
  state.mode = last && last.mode === 'combo' ? 'combo' : 'single';
  renderExercise();
  setMode(state.mode);
  renderProgress();

  $('sandboxInput').value = store.get(KEY.sandbox, '') || SANDBOX_SAMPLES[0][1];
  syncGutter('sandboxInput', 'sandboxGutter');

  wireEditor('sqlInput', 'gutter', runCurrent);
  wireEditor('sandboxInput', 'sandboxGutter', runSandbox);

  $('btnRun').onclick = runCurrent;
  $('btnCheck').onclick = checkCurrent;
  $('btnSolution').onclick = showSolution;
  $('btnClear').onclick = () => {
    $('sqlInput').value = '';
    syncGutter('sqlInput', 'gutter');
    if (state.item) store.del(KEY.draft(state.item.id));
    $('feedback').hidden = true;
    $('resultArea').innerHTML = '';
  };

  $('btnSandboxRun').onclick = runSandbox;
  $('btnSandboxClear').onclick = () => {
    $('sandboxInput').value = '';
    syncGutter('sandboxInput', 'sandboxGutter');
    $('sandboxFeedback').hidden = true;
    $('sandboxResult').innerHTML = '';
  };
  $('btnSandboxReset').onclick = () => {
    resetSandboxDatabase();
    $('sandboxResult').innerHTML = '';
    showFeedback('sandboxFeedback', 'ok', '資料庫已重設', '所有資料回到初始狀態。');
  };

  $('btnTheme').onclick = toggleTheme;
  $('btnResetProgress').onclick = () => {
    if (!confirm('確定要清除所有作答紀錄嗎？這個動作無法復原。')) return;
    state.progress = {};
    store.del(KEY.progress);
    ALL_ITEMS.forEach((i) => store.del(KEY.draft(i.id)));
    renderProgress();
    renderNav();
    renderExercise();
  };

  document.querySelectorAll('.mode-tabs button').forEach((b) => {
    b.onclick = () => setMode(b.dataset.mode);
  });
  document.querySelectorAll('.panel-tabs button').forEach((b) => {
    b.onclick = () => setPanel(b.dataset.panel);
  });
}

init();
