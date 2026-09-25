// 編輯器的輸入提示：關鍵字、資料表、欄位、函數。
// 打 e. 這種帶別名的前綴時，會先從 SQL 裡找出別名對應哪張表，只提示那張表的欄位。
import { TABLE_META } from './schema.js';

const KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'ORDER BY', 'GROUP BY', 'HAVING', 'DISTINCT',
  'JOIN', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL OUTER JOIN', 'CROSS JOIN',
  'LEFT OUTER JOIN', 'RIGHT OUTER JOIN', 'ON', 'AND', 'OR', 'NOT', 'IN', 'NOT IN',
  'EXISTS', 'NOT EXISTS', 'BETWEEN', 'LIKE', 'IS NULL', 'IS NOT NULL',
  'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'AS', 'ASC', 'DESC',
  'NULLS FIRST', 'NULLS LAST', 'UNION', 'UNION ALL', 'MINUS', 'INTERSECT',
  'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM', 'MERGE INTO', 'USING',
  'WHEN MATCHED THEN', 'WHEN NOT MATCHED THEN', 'DUAL', 'WITH', 'FETCH FIRST',
  'OVER', 'PARTITION BY', 'ORDER SIBLINGS BY', 'WITHIN GROUP',
  'ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW',
  'ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING',
  'FETCH NEXT', 'ROWS ONLY', 'OFFSET', 'ROWNUM', 'LEVEL',
  'START WITH', 'CONNECT BY', 'CONNECT BY PRIOR', 'PRIOR', 'NOCYCLE',
  'ANY', 'ALL', 'SOME', 'EXTRACT',
];

const FUNCTIONS = [
  ['COUNT(', '計算筆數，COUNT(*) 連 NULL 也算'],
  ['SUM(', '加總'],
  ['AVG(', '平均，會跳過 NULL'],
  ['MAX(', '最大值'],
  ['MIN(', '最小值'],
  ['NVL(', 'NVL(值, 替代值)：是 NULL 就換掉'],
  ['NVL2(', 'NVL2(值, 非空時, 空時)'],
  ['DECODE(', 'DECODE(值, 比對1, 結果1, …, 預設)'],
  ['COALESCE(', '回傳第一個非 NULL'],
  ['NULLIF(', '兩者相等就回 NULL'],
  ['TO_CHAR(', "TO_CHAR(值, 'YYYY-MM-DD')"],
  ['TO_DATE(', "TO_DATE('2024-01-01', 'YYYY-MM-DD')"],
  ['TO_NUMBER(', '轉成數字'],
  ['SYSDATE', '目前日期，本站固定為 2024-09-30'],
  ['TRUNC(', '截斷日期或數字'],
  ['ROUND(', '四捨五入'],
  ['MOD(', 'MOD(被除數, 除數)'],
  ['ABS(', '絕對值'],
  ['UPPER(', '轉大寫'],
  ['LOWER(', '轉小寫'],
  ['INITCAP(', '字首大寫'],
  ['SUBSTR(', 'SUBSTR(字串, 起始, 長度)'],
  ['INSTR(', '找出子字串位置'],
  ['LENGTH(', '字串長度'],
  ['TRIM(', '去頭尾空白'],
  ['LPAD(', 'LPAD(字串, 總長, 補字)'],
  ['RPAD(', 'RPAD(字串, 總長, 補字)'],
  ['REPLACE(', 'REPLACE(字串, 舊, 新)'],
  ['GREATEST(', '取最大'],
  ['LEAST(', '取最小'],
  ['ADD_MONTHS(', 'ADD_MONTHS(日期, 月數)'],
  ['MONTHS_BETWEEN(', '兩個日期相差幾個月'],
  ['LAST_DAY(', '當月最後一天'],
  ['LISTAGG(', 'LISTAGG(欄位, 分隔符) WITHIN GROUP (ORDER BY …)'],
  ['CEIL(', '無條件進位'],
  ['FLOOR(', '無條件捨去'],
  ['POWER(', 'POWER(底數, 次方)'],
  ['SQRT(', '平方根'],
  ['SIGN(', '正負號：1 / 0 / -1'],
  ['ROW_NUMBER() OVER (', '流水號，同值也不會重複'],
  ['RANK() OVER (', '排名，並列後會跳號'],
  ['DENSE_RANK() OVER (', '排名，並列後不跳號'],
  ['NTILE(', 'NTILE(n) OVER (…)：平均切成 n 組'],
  ['LAG(', 'LAG(欄位 [, 幾列, 預設值]) OVER (…)：讀上一列'],
  ['LEAD(', 'LEAD(欄位 [, 幾列, 預設值]) OVER (…)：讀下一列'],
  ['FIRST_VALUE(', '視窗中的第一列'],
  ['LAST_VALUE(', '視窗中的最後一列，記得自己開 ROWS 範圍'],
  ['SYS_CONNECT_BY_PATH(', "SYS_CONNECT_BY_PATH(欄位, '/')：階層路徑"],
  ['EXTRACT(', 'EXTRACT(YEAR FROM 日期)'],
];

const TABLES = [...TABLE_META.map((t) => [t.name, t.label]), ['dual', 'Oracle 的虛擬單列表']];

const COLUMNS = TABLE_META.flatMap((t) =>
  t.columns.map(([name, type, note]) => ({ name, table: t.name, meta: `${t.name}.${name} · ${type}`, note })));

// 同名欄位（例如 dept_id）合併成一筆，說明列出它出現在哪些表
const COLUMN_ITEMS = (() => {
  const byName = new Map();
  for (const c of COLUMNS) {
    if (!byName.has(c.name)) byName.set(c.name, { tables: [], note: c.note });
    byName.get(c.name).tables.push(c.table);
  }
  return [...byName].map(([name, v]) => ({
    text: name, kind: '欄位',
    meta: v.tables.length > 1 ? `${v.tables.join('、')}` : `${v.tables[0]} · ${v.note}`,
  }));
})();

const BASE_ITEMS = [
  ...TABLES.map(([name, label]) => ({ text: name, kind: '資料表', meta: label })),
  ...COLUMN_ITEMS,
  ...FUNCTIONS.map(([text, meta]) => ({ text, kind: '函數', meta })),
  ...KEYWORDS.map((text) => ({ text, kind: '關鍵字', meta: '' })),
];

/** 從 SQL 文字裡找出「表名 別名」的對應，支援 FROM/JOIN/UPDATE/INTO/USING 後面的宣告 */
function aliasMap(sql) {
  const map = new Map();
  const names = TABLES.map(([n]) => n).join('|');
  const re = new RegExp(`\\b(?:FROM|JOIN|UPDATE|INTO|USING)\\s+(${names})\\b(?:\\s+(?:AS\\s+)?([A-Za-z_][A-Za-z0-9_]*))?`, 'gi');
  let m;
  while ((m = re.exec(sql))) {
    const table = m[1].toLowerCase();
    const alias = m[2] && !/^(ON|WHERE|SET|GROUP|ORDER|HAVING|JOIN|INNER|LEFT|RIGHT|FULL|CROSS|UNION|MINUS|INTERSECT|VALUES|WHEN|USING|AS)$/i.test(m[2])
      ? m[2].toLowerCase() : null;
    map.set(table, table);
    if (alias) map.set(alias, table);
  }
  return map;
}

/** 取出游標前正在輸入的字：回傳 { prefix, qualifier, start } */
function tokenAt(text, pos) {
  let i = pos;
  while (i > 0 && /[A-Za-z0-9_$.]/.test(text[i - 1])) i--;
  const raw = text.slice(i, pos);
  const dot = raw.lastIndexOf('.');
  return dot === -1
    ? { prefix: raw, qualifier: null, start: i }
    : { prefix: raw.slice(dot + 1), qualifier: raw.slice(0, dot).toLowerCase(), start: i + dot + 1 };
}

function candidates(sql, token) {
  const p = token.prefix.toLowerCase();

  if (token.qualifier) {
    const table = aliasMap(sql).get(token.qualifier);
    if (table) {
      const meta = TABLE_META.find((t) => t.name === table);
      const cols = meta
        ? meta.columns.map(([name, type, note]) => ({ text: name, kind: '欄位', meta: `${type} · ${note}` }))
        : [];
      return cols.filter((c) => c.text.toLowerCase().startsWith(p)).slice(0, 12);
    }
    // 還沒寫 FROM 的時候別名查不到，那就先提示所有同名欄位
    return COLUMN_ITEMS.filter((c) => c.text.toLowerCase().startsWith(p)).slice(0, 12);
  }

  if (!p) return [];

  // 這段 SQL 已經提到的表，它們的欄位往前排
  const used = new Set([...aliasMap(sql).values()]);
  const scored = [];
  for (const it of BASE_ITEMS) {
    const t = it.text.toLowerCase();
    if (!t.startsWith(p)) continue;
    let rank = { 資料表: 0, 欄位: 1, 函數: 2, 關鍵字: 3 }[it.kind];
    if (it.kind === '欄位' && [...used].some((u) => it.meta.includes(u))) rank = -1;
    if (it.kind === '資料表' && used.has(t)) rank = -2;
    scored.push({ ...it, rank, len: it.text.length });
  }
  scored.sort((a, b) => a.rank - b.rank || a.len - b.len || a.text.localeCompare(b.text));
  return scored.slice(0, 12);
}

/** 量測游標在 textarea 裡的像素位置。字型是等寬，用 canvas 量該行前綴就夠準。 */
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');

function caretXY(ta, pos) {
  const cs = getComputedStyle(ta);
  ctx.font = `${cs.fontSize} ${cs.fontFamily}`;
  const before = ta.value.slice(0, pos);
  const line = before.split('\n').length - 1;
  const col = before.slice(before.lastIndexOf('\n') + 1);
  const lineHeight = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.6;
  const rect = ta.getBoundingClientRect();
  return {
    x: rect.left + parseFloat(cs.paddingLeft) + ctx.measureText(col).width - ta.scrollLeft,
    y: rect.top + parseFloat(cs.paddingTop) + (line + 1) * lineHeight - ta.scrollTop,
    lineHeight,
    rect,
  };
}

/**
 * 掛上輸入提示。回傳 { isOpen, close }，讓外層的 keydown 知道要不要讓行。
 */
export function attachAutocomplete(textarea) {
  // 挂在 body 上用 fixed 定位，不會被 editor-card 的 overflow:hidden 剪掉
  const box = document.createElement('div');
  box.className = 'ac-box';
  box.hidden = true;
  document.body.appendChild(box);

  let items = [];
  let active = 0;
  let token = null;
  let justAccepted = false;   // 自己補字觸發的 input 不要再把清單叫回來

  const isOpen = () => !box.hidden;

  function close() {
    box.hidden = true;
    items = [];
  }

  function render() {
    box.innerHTML = items.map((it, i) => `
      <div class="ac-item${i === active ? ' active' : ''}" data-i="${i}">
        <span class="ac-kind ac-${it.kind}">${it.kind}</span>
        <span class="ac-text">${it.text.replace(/</g, '&lt;')}</span>
        <span class="ac-meta">${(it.meta || '').replace(/</g, '&lt;')}</span>
      </div>`).join('');
    const { x, y, lineHeight, rect } = caretXY(textarea, textarea.selectionStart);
    // 先顯示才量得到實際寬高，再決定要放哪裡
    box.style.visibility = 'hidden';
    box.hidden = false;
    const { offsetWidth: w, offsetHeight: h } = box;
    const below = y + 4;
    const flip = below + h > window.innerHeight - 8 && y - lineHeight - h > 8;
    box.style.left = `${Math.max(8, Math.min(x, window.innerWidth - w - 8))}px`;
    box.style.top = `${flip ? y - lineHeight - h - 4 : below}px`;
    box.style.visibility = '';
    // 游標被捲出 textarea 可視範圍時就不要顯示
    if (y < rect.top || y > rect.bottom + lineHeight) close();
  }

  function open() {
    if (justAccepted) { justAccepted = false; return close(); }
    if (textarea.selectionStart !== textarea.selectionEnd) return close();
    token = tokenAt(textarea.value, textarea.selectionStart);
    if (!token.qualifier && token.prefix.length < 1) return close();
    items = candidates(textarea.value, token);
    if (!items.length) return close();
    active = 0;
    render();
  }

  function accept(i = active) {
    const it = items[i];
    if (!it) return;
    const v = textarea.value;
    // 使用者已經打的字若是小寫，關鍵字也跟著小寫，不要硬改人家的風格
    const typed = v.slice(token.start, textarea.selectionStart);
    let text = it.text;
    if (it.kind === '關鍵字' && typed && typed === typed.toLowerCase()) text = text.toLowerCase();
    const after = textarea.selectionStart;
    textarea.value = v.slice(0, token.start) + text + v.slice(after);
    const caret = token.start + text.length;
    textarea.selectionStart = textarea.selectionEnd = caret;
    close();
    textarea.focus();
    justAccepted = true;
    textarea.dispatchEvent(new Event('input'));
  }

  textarea.addEventListener('input', open);
  textarea.addEventListener('blur', () => setTimeout(close, 120));
  textarea.addEventListener('scroll', () => { if (isOpen()) render(); });
  window.addEventListener('scroll', () => { if (isOpen()) render(); }, true);
  window.addEventListener('resize', close);

  box.addEventListener('mousedown', (ev) => {
    const el = ev.target.closest('.ac-item');
    if (!el) return;
    ev.preventDefault();
    accept(+el.dataset.i);
  });

  textarea.addEventListener('keydown', (ev) => {
    if (!isOpen()) {
      // Ctrl/⌘ + Space 手動叫出來
      if (ev.key === ' ' && (ev.ctrlKey || ev.metaKey)) { ev.preventDefault(); open(); }
      return;
    }
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
      ev.preventDefault();
      active = (active + (ev.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length;
      render();
      box.querySelector('.ac-item.active')?.scrollIntoView({ block: 'nearest' });
    } else if (ev.key === 'Enter' || ev.key === 'Tab') {
      if (ev.ctrlKey || ev.metaKey) return; // ⌘+Enter 仍然是執行
      ev.preventDefault();
      ev.stopPropagation();
      accept();
    } else if (ev.key === 'Escape') {
      ev.preventDefault();
      ev.stopPropagation();
      close();
    }
  }, true); // 捕獲階段：搶在 app.js 的 Tab 縮排之前處理

  return { isOpen, close };
}
