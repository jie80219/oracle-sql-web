// 批改邏輯：比對結果集 / 比對 DML 之後的資料狀態 / 檢查必要語法
// 這個檔案不碰 DOM，也不碰 sql.js，所以瀏覽器與 Node 測試共用同一份。

import { stripForKeywordCheck } from './oracle.js';

const EPS = 1e-6;

function normCell(v) {
  if (v === null || v === undefined) return '\u0000NULL';
  if (typeof v === 'number') {
    if (Number.isInteger(v)) return `N:${v}`;
    return `N:${v.toFixed(6)}`;
  }
  if (v instanceof Uint8Array) return `B:${Array.from(v).join(',')}`;
  const s = String(v).trim();
  // 數值字串與數值視為相同，避免 CAST 差異造成誤判
  if (s !== '' && !Number.isNaN(Number(s))) {
    const n = Number(s);
    return Number.isInteger(n) ? `N:${n}` : `N:${n.toFixed(6)}`;
  }
  return `S:${s}`;
}

const rowKey = (row) => row.map(normCell).join('\u0001');

export function cellsEqual(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) < EPS;
  return normCell(a) === normCell(b);
}

/** result 形狀為 { columns: string[], values: any[][] } */
export function compareResults(expected, actual, { ordered = false } = {}) {
  if (!actual) {
    return { ok: false, reason: '你的語法沒有回傳任何結果集，請確認寫的是 SELECT。' };
  }
  if (expected.columns.length !== actual.columns.length) {
    return {
      ok: false,
      reason: `欄位數不符：預期 ${expected.columns.length} 欄，你的查詢回傳 ${actual.columns.length} 欄。`,
      detail: `預期欄位：${expected.columns.join(', ')}\n你的欄位：${actual.columns.join(', ')}`,
    };
  }
  if (expected.values.length !== actual.values.length) {
    return {
      ok: false,
      reason: `資料筆數不符：預期 ${expected.values.length} 筆，你的查詢回傳 ${actual.values.length} 筆。`,
      ...diffRows(expected.values, actual.values),
    };
  }

  if (ordered) {
    for (let i = 0; i < expected.values.length; i++) {
      if (rowKey(expected.values[i]) !== rowKey(actual.values[i])) {
        return {
          ok: false,
          reason: `第 ${i + 1} 筆資料不符（這題有指定排序，順序也要一致）。`,
          detail: `預期：${fmtRow(expected.values[i])}\n實際：${fmtRow(actual.values[i])}`,
        };
      }
    }
  } else {
    const e = expected.values.map(rowKey).sort();
    const a = actual.values.map(rowKey).sort();
    for (let i = 0; i < e.length; i++) {
      if (e[i] !== a[i]) {
        return { ok: false, reason: '筆數相同但內容不一致。', ...diffRows(expected.values, actual.values) };
      }
    }
  }

  const colWarn = compareColumnNames(expected.columns, actual.columns);
  return { ok: true, warning: colWarn };
}

function compareColumnNames(expected, actual) {
  const norm = (c) => String(c).replace(/^"|"$/g, '').toUpperCase();
  const diff = expected.filter((c, i) => norm(c) !== norm(actual[i]));
  if (!diff.length) return null;
  return `結果正確。附帶一提，欄位別名與參考答案不同（預期 ${expected.join(', ')}；你的是 ${actual.join(', ')}），不影響判定。`;
}

function fmtRow(row) {
  return '(' + row.map((v) => (v === null ? 'NULL' : String(v))).join(', ') + ')';
}

function diffRows(expectedRows, actualRows) {
  const eKeys = expectedRows.map(rowKey);
  const aKeys = actualRows.map(rowKey);
  const aPool = new Map();
  aKeys.forEach((k, i) => aPool.set(k, (aPool.get(k) || 0) + 1));
  const ePool = new Map();
  eKeys.forEach((k) => ePool.set(k, (ePool.get(k) || 0) + 1));

  const missing = [];
  expectedRows.forEach((row, i) => {
    const k = eKeys[i];
    if ((aPool.get(k) || 0) > 0) aPool.set(k, aPool.get(k) - 1);
    else missing.push(row);
  });
  const extra = [];
  actualRows.forEach((row, i) => {
    const k = aKeys[i];
    if ((ePool.get(k) || 0) > 0) ePool.set(k, ePool.get(k) - 1);
    else extra.push(row);
  });

  const lines = [];
  if (missing.length) {
    lines.push(`少了這些列（最多列出 5 筆）：\n  ${missing.slice(0, 5).map(fmtRow).join('\n  ')}`);
  }
  if (extra.length) {
    lines.push(`多了這些列（最多列出 5 筆）：\n  ${extra.slice(0, 5).map(fmtRow).join('\n  ')}`);
  }
  return { detail: lines.join('\n\n'), missing, extra };
}

/** 比較 DML 執行後的資料狀態 */
export function compareSnapshots(expected, actual) {
  for (const table of Object.keys(expected)) {
    const e = expected[table];
    const a = actual[table];
    if (!a) return { ok: false, reason: `找不到資料表 ${table} 的內容。` };
    if (e.length !== a.length) {
      return {
        ok: false,
        reason: `${table} 的筆數不符：預期 ${e.length} 筆，實際 ${a.length} 筆。`,
        ...diffRows(e, a),
      };
    }
    const eSorted = e.map(rowKey).sort();
    const aSorted = a.map(rowKey).sort();
    for (let i = 0; i < eSorted.length; i++) {
      if (eSorted[i] !== aSorted[i]) {
        return { ok: false, reason: `${table} 的資料內容與預期不符。`, ...diffRows(e, a) };
      }
    }
  }
  return { ok: true };
}

/** 語法要求檢查（必須用 EXISTS、不准用 IN 之類） */
export function checkSyntaxRequirements(sql, exercise) {
  const text = stripForKeywordCheck(sql).replace(/\s+/g, ' ');
  const has = (kw) => text.includes(kw.toUpperCase().replace(/\s+/g, ' '));
  const problems = [];

  for (const kw of exercise.requires || []) {
    if (!has(kw)) problems.push(`這一題要求使用 ${kw}，但你的語法裡沒有看到。`);
  }
  for (const group of exercise.requiresAny || []) {
    if (!group.some(has)) problems.push(`這一題至少要用到其中一種寫法：${group.join(' 或 ')}。`);
  }
  for (const kw of exercise.forbids || []) {
    if (has(kw)) problems.push(`這一題請不要使用 ${kw}，換個寫法試試。`);
  }
  return problems;
}

/** 依題型組出最終批改結果 */
export function grade({ exercise, expected, actual, syntaxProblems }) {
  if (syntaxProblems && syntaxProblems.length) {
    return { ok: false, kind: 'syntax', reason: syntaxProblems.join('\n'), detail: null };
  }
  const res = exercise.kind === 'dml'
    ? compareSnapshots(expected, actual)
    : compareResults(expected, actual, { ordered: !!exercise.ordered });
  return { ...res, kind: res.ok ? 'pass' : 'result' };
}
