// Oracle 方言相容層
// ------------------------------------------------------------------
// 瀏覽器裡跑的實際引擎是 SQLite（sql.js / WASM）。這個檔案負責兩件事：
//   1. registerOracleFunctions()：把 Oracle 特有的純量函數註冊進去（NVL、TO_CHAR…）
//   2. translateOracleSql()：把 SQLite 不認得的 Oracle 語法改寫掉
//      （MINUS、DECODE、MERGE、UPDATE (SELECT…) SET… 等）
// 改寫一律避開字串常值、雙引號識別字與註解。

export const SYSDATE_FIXED = '2024-09-30'; // 固定「今天」，讓答案可重現

// ── 基礎工具：把字串／註解遮成空白，之後所有掃描都對著遮罩做 ──────────

export function maskLiterals(sql) {
  let out = '';
  let i = 0;
  const blank = (n, src) => src.replace(/[^\n]/g, ' ');
  while (i < sql.length) {
    const c = sql[i];
    if (c === "'" || c === '"') {
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === c) {
          if (sql[j + 1] === c) j += 2;
          else { j++; break; }
        } else j++;
      }
      out += blank(j - i, sql.slice(i, j));
      i = j;
    } else if (c === '-' && sql[i + 1] === '-') {
      let j = sql.indexOf('\n', i);
      if (j === -1) j = sql.length;
      out += blank(j - i, sql.slice(i, j));
      i = j;
    } else if (c === '/' && sql[i + 1] === '*') {
      let j = sql.indexOf('*/', i + 2);
      j = j === -1 ? sql.length : j + 2;
      out += blank(j - i, sql.slice(i, j));
      i = j;
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

/** 去掉註解與字串內容，供「必須出現某關鍵字」的檢查使用 */
export function stripForKeywordCheck(sql) {
  return maskLiterals(sql).toUpperCase();
}

function depthAt(mask, idx) {
  let d = 0;
  for (let i = 0; i < idx; i++) {
    if (mask[i] === '(') d++;
    else if (mask[i] === ')') d--;
  }
  return d;
}

/** 從 openIdx 的 '(' 找到對應的 ')' */
function matchParen(sql, openIdx, mask = maskLiterals(sql)) {
  let d = 0;
  for (let i = openIdx; i < sql.length; i++) {
    if (mask[i] === '(') d++;
    else if (mask[i] === ')') {
      d--;
      if (d === 0) return i;
    }
  }
  return -1;
}

/** 以頂層逗號切開 (a, b, c) 的內容 */
function splitTopLevel(text, sep = ',') {
  const mask = maskLiterals(text);
  const parts = [];
  let d = 0, start = 0;
  for (let i = 0; i < text.length; i++) {
    const c = mask[i];
    if (c === '(') d++;
    else if (c === ')') d--;
    else if (c === sep && d === 0) {
      parts.push(text.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(text.slice(start));
  return parts.map((p) => p.trim()).filter((p) => p.length);
}

/** 只在字串／註解之外做替換 */
function replaceOutside(sql, regex, replacer) {
  const mask = maskLiterals(sql);
  let out = '';
  let last = 0;
  let m;
  const re = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
  while ((m = re.exec(mask)) !== null) {
    out += sql.slice(last, m.index);
    out += replacer(sql.substr(m.index, m[0].length), m);
    last = m.index + m[0].length;
    if (m[0].length === 0) re.lastIndex++;
  }
  return out + sql.slice(last);
}

/** 找出頂層（括號深度 0）第一個符合的關鍵字位置 */
function findTopLevel(sql, pattern, from = 0) {
  const mask = maskLiterals(sql);
  const re = new RegExp(pattern.source, 'gi');
  re.lastIndex = from;
  let m;
  while ((m = re.exec(mask)) !== null) {
    if (depthAt(mask, m.index) === 0) return { index: m.index, length: m[0].length, text: m[0] };
  }
  return null;
}

// ── 語句切割 ──────────────────────────────────────────────────────

export function splitStatements(sql) {
  const mask = maskLiterals(sql);
  const stmts = [];
  let d = 0, start = 0;
  for (let i = 0; i < sql.length; i++) {
    const c = mask[i];
    if (c === '(') d++;
    else if (c === ')') d--;
    else if (c === ';' && d === 0) {
      stmts.push(sql.slice(start, i));
      start = i + 1;
    }
  }
  stmts.push(sql.slice(start));
  return stmts.map((s) => s.trim()).filter((s) => s.replace(/\s|\n/g, '').length > 0);
}

// ── 各種改寫 ──────────────────────────────────────────────────────

/** 找出所有對某函數的呼叫，回傳 {start, open, close} 由後往前排序 */
function findCalls(sql, fnName) {
  const mask = maskLiterals(sql);
  const re = new RegExp('\\b' + fnName + '\\s*\\(', 'gi');
  const hits = [];
  let m;
  while ((m = re.exec(mask)) !== null) {
    const open = m.index + m[0].length - 1;
    const close = matchParen(sql, open, mask);
    if (close === -1) continue;
    hits.push({ start: m.index, open, close });
  }
  return hits.reverse();
}

/** DECODE(e, s1, r1, s2, r2, default) → CASE WHEN e IS s1 THEN r1 … END */
function rewriteDecode(sql) {
  let out = sql;
  let guard = 0;
  while (guard++ < 50) {
    const hits = findCalls(out, 'DECODE');
    if (!hits.length) break;
    const h = hits[0];
    const args = splitTopLevel(out.slice(h.open + 1, h.close));
    if (args.length < 3) break;
    const expr = args[0];
    let body = '';
    let i = 1;
    for (; i + 1 < args.length; i += 2) body += ` WHEN (${expr}) IS (${args[i]}) THEN ${args[i + 1]}`;
    const fallback = i < args.length ? ` ELSE ${args[i]}` : '';
    out = out.slice(0, h.start) + `(CASE${body}${fallback} END)` + out.slice(h.close + 1);
    if (findCalls(out, 'DECODE').length === hits.length) break; // 防呆
  }
  return out;
}

/** 把函數呼叫補到固定參數個數，sql.js 無法註冊可變參數函數 */
function padArity(sql, fnName, targetArity, defaults) {
  let out = sql;
  for (const h of findCalls(out, fnName)) {
    const inner = out.slice(h.open + 1, h.close);
    const args = splitTopLevel(inner);
    if (args.length >= targetArity || args.length === 0) continue;
    const padded = args.concat(defaults.slice(args.length, targetArity));
    out = out.slice(0, h.open + 1) + padded.join(', ') + out.slice(h.close);
  }
  return out;
}

/** LISTAGG(col, ',') WITHIN GROUP (ORDER BY x) → group_concat(col, ',') */
function rewriteListagg(sql) {
  let out = replaceOutside(sql, /\bWITHIN\s+GROUP\s*\(/gi, () => 'WITHIN_GROUP_MARK(');
  for (const h of findCalls(out, 'WITHIN_GROUP_MARK')) {
    out = out.slice(0, h.start) + out.slice(h.close + 1);
  }
  return replaceOutside(out, /\bLISTAGG\b/gi, () => 'group_concat');
}

/** ROWNUM：謂詞轉 LIMIT，其餘轉 ROW_NUMBER() OVER () */
function rewriteRownum(sql) {
  let out = sql;
  let limit = null;
  const mask = maskLiterals(out);
  const re = /\bROWNUM\s*(<=|<)\s*(\d+)/gi;
  const m = re.exec(mask);
  if (m) {
    const n = m[1] === '<' ? Number(m[2]) - 1 : Number(m[2]);
    limit = n;
    let start = m.index;
    let end = m.index + m[0].length;
    // 一併吃掉前後多餘的 AND
    const before = out.slice(0, start);
    const andBefore = /\bAND\s*$/i.exec(before);
    const andAfter = /^\s*AND\b/i.exec(out.slice(end));
    if (andBefore) start = andBefore.index;
    else if (andAfter) end += andAfter[0].length;
    else {
      const whereBefore = /\bWHERE\s*$/i.exec(before);
      if (whereBefore) start = whereBefore.index;
    }
    out = out.slice(0, start) + ' ' + out.slice(end);
  }
  out = replaceOutside(out, /\bROWNUM\b/gi, () => 'ROW_NUMBER() OVER ()');
  if (limit !== null) out = out.trimEnd() + ` LIMIT ${limit}`;
  return out;
}

/** Oracle 12c 的 FETCH FIRST n ROWS ONLY → LIMIT n */
function rewriteFetchFirst(sql) {
  let out = replaceOutside(sql, /\bFETCH\s+(?:FIRST|NEXT)\s+(\d+)\s+ROWS?\s+ONLY\b/gi,
    (t) => 'LIMIT ' + /\d+/.exec(t)[0]);
  out = replaceOutside(out, /\bOFFSET\s+(\d+)\s+ROWS?\b/gi, (t) => 'OFFSET ' + /\d+/.exec(t)[0]);
  return out;
}

/**
 * Oracle 排序時預設 ASC → NULLS LAST、DESC → NULLS FIRST，SQLite 剛好相反。
 * 補上明確的 NULLS 子句，讓這裡跑出來的順序跟真的 Oracle 一致。
 */
function rewriteNullsOrdering(sql) {
  const mask = maskLiterals(sql);
  const re = /\bORDER\s+BY\b/gi;
  let last = null, m;
  while ((m = re.exec(mask)) !== null) {
    if (depthAt(mask, m.index) === 0) last = m;
  }
  if (!last) return sql;

  const bodyStart = last.index + last[0].length;
  let bodyEnd = sql.length;
  const tailRe = /\b(LIMIT|OFFSET)\b/gi;
  tailRe.lastIndex = bodyStart;
  let t;
  while ((t = tailRe.exec(mask)) !== null) {
    if (depthAt(mask, t.index) === 0) { bodyEnd = t.index; break; }
  }

  const body = sql.slice(bodyStart, bodyEnd);
  const patched = splitTopLevel(body).map((term) => {
    if (/\bNULLS\s+(FIRST|LAST)\b/i.test(term)) return term;
    return /\bDESC\b/i.test(term) ? `${term} NULLS FIRST` : `${term} NULLS LAST`;
  }).join(', ');

  return sql.slice(0, bodyStart) + ' ' + patched + ' ' + sql.slice(bodyEnd);
}

/** 一般 SELECT / DML 的通用改寫 */
function rewriteCommon(sql) {
  let out = sql;
  if (/\(\s*\+\s*\)/.test(maskLiterals(out))) {
    throw new Error(
      'Oracle 舊式外連接 (+) 在本練習站不支援，請改用 ANSI 寫法：LEFT JOIN / RIGHT JOIN / FULL JOIN。'
    );
  }
  out = rewriteListagg(out);
  out = rewriteDecode(out);
  out = replaceOutside(out, /\bMINUS\b/gi, () => 'EXCEPT');
  out = replaceOutside(out, /\b(?:DATE|TIMESTAMP)\s+(?=')/gi, () => '');
  out = replaceOutside(out, /\bGREATEST\s*\(/gi, () => 'max(');
  out = replaceOutside(out, /\bLEAST\s*\(/gi, () => 'min(');
  out = replaceOutside(out, /\bSYSDATE\b(?!\s*\()/gi, () => 'SYSDATE()');
  out = replaceOutside(out, /\bNOT\s+NULLS?\b/gi, (t) => t); // no-op，保留可讀性
  out = padArity(out, 'TO_CHAR', 2, [null, 'NULL']);
  out = padArity(out, 'TO_DATE', 2, [null, 'NULL']);
  out = padArity(out, 'TRUNC', 2, [null, 'NULL']);
  out = padArity(out, 'LPAD', 3, [null, null, "' '"]);
  out = padArity(out, 'RPAD', 3, [null, null, "' '"]);
  out = rewriteFetchFirst(out);
  out = rewriteNullsOrdering(out);
  out = rewriteRownum(out);
  return out;
}

// ── UPDATE 相關 ────────────────────────────────────────────────────

/** UPDATE employees e SET e.salary = … → UPDATE employees AS e SET salary = … */
function rewriteSimpleUpdate(sql) {
  let out = sql;
  // 1) 補上 AS
  out = out.replace(/^(\s*UPDATE\s+)([A-Za-z_][\w$]*)(\s+)(?!AS\b|SET\b)([A-Za-z_][\w$]*)(\s+SET\b)/i,
    (_, a, tbl, sp, alias, tail) => `${a}${tbl} AS ${alias}${tail}`);
  // 2) SET 左側去掉 alias. 前綴（SQLite 不接受限定欄名）
  const setPos = findTopLevel(out, /\bSET\b/);
  if (setPos) {
    const wherePos = findTopLevel(out, /\bWHERE\b/, setPos.index);
    const head = out.slice(0, setPos.index + setPos.length);
    const body = out.slice(setPos.index + setPos.length, wherePos ? wherePos.index : out.length);
    const tail = wherePos ? out.slice(wherePos.index) : '';
    const fixed = splitTopLevel(body)
      .map((a) => a.replace(/^\s*[A-Za-z_][\w$]*\s*\.\s*([A-Za-z_][\w$]*)\s*=/, '$1 ='))
      .join(', ');
    out = `${head} ${fixed} ${tail}`;
  }
  return out;
}

/**
 * Oracle 的可更新連接檢視：
 *   UPDATE (SELECT e.salary sal, a.new_salary ns FROM employees e JOIN salary_adjust a ON …)
 *   SET sal = ns
 * → SQLite 的 UPDATE … FROM
 */
function translateUpdateJoinView(sql) {
  const open = sql.indexOf('(');
  const close = matchParen(sql, open);
  if (close === -1) throw new Error('UPDATE (SELECT …) 的括號不完整。');
  const inner = sql.slice(open + 1, close).trim();
  let rest = sql.slice(close + 1).trim();
  rest = rest.replace(/^[A-Za-z_][\w$]*\s+(?=SET\b)/i, ''); // 檢視別名，用不到

  const setPos = findTopLevel(rest, /\bSET\b/);
  if (!setPos) throw new Error('UPDATE (SELECT …) 之後找不到 SET。');
  const outerWherePos = findTopLevel(rest, /\bWHERE\b/, setPos.index);
  const setBody = rest.slice(setPos.index + setPos.length, outerWherePos ? outerWherePos.index : rest.length);
  const outerWhere = outerWherePos ? rest.slice(outerWherePos.index + outerWherePos.length).trim() : '';

  // 解析內層 SELECT
  const selPos = findTopLevel(inner, /\bSELECT\b/);
  const fromPos = findTopLevel(inner, /\bFROM\b/);
  if (!selPos || !fromPos) throw new Error('內層必須是一段 SELECT … FROM …。');
  const selectList = inner.slice(selPos.index + selPos.length, fromPos.index);
  const innerWherePos = findTopLevel(inner, /\bWHERE\b/, fromPos.index);
  const fromClause = inner.slice(fromPos.index + fromPos.length, innerWherePos ? innerWherePos.index : inner.length);
  const innerWhere = innerWherePos ? inner.slice(innerWherePos.index + innerWherePos.length).trim() : '';

  // 欄位別名 → 實際運算式
  const aliasMap = new Map();
  for (const item of splitTopLevel(selectList)) {
    let expr = item, alias = null;
    const asMatch = /\s+AS\s+([A-Za-z_"][\w$"]*)\s*$/i.exec(item);
    if (asMatch) { alias = asMatch[1]; expr = item.slice(0, asMatch.index); }
    else {
      const bare = /^(.*\S)\s+([A-Za-z_][\w$]*)\s*$/.exec(item);
      if (bare && !/\b(FROM|JOIN|ON)\b/i.test(bare[2])) { expr = bare[1]; alias = bare[2]; }
    }
    if (!alias) {
      const col = /([A-Za-z_][\w$]*)\s*$/.exec(item);
      alias = col ? col[1] : item;
    }
    aliasMap.set(alias.replace(/"/g, '').toUpperCase(), expr.trim());
  }
  const resolve = (name) => aliasMap.get(name.replace(/"/g, '').toUpperCase()) || name;

  // 解析 FROM：第一張表當更新目標，其餘進 FROM 清單，ON 條件併進 WHERE
  const joinRe = /\b(?:INNER\s+|CROSS\s+)?JOIN\b/gi;
  const fmask = maskLiterals(fromClause);
  const pieces = [];
  let lastIdx = 0, jm;
  while ((jm = joinRe.exec(fmask)) !== null) {
    if (depthAt(fmask, jm.index) !== 0) continue;
    pieces.push(fromClause.slice(lastIdx, jm.index));
    lastIdx = jm.index + jm[0].length;
  }
  pieces.push(fromClause.slice(lastIdx));

  const conditions = [];
  const extraFrom = [];
  const parsePiece = (piece) => {
    const onPos = findTopLevel(piece, /\bON\b/);
    if (onPos) {
      conditions.push(piece.slice(onPos.index + onPos.length).trim());
      return piece.slice(0, onPos.index).trim();
    }
    return piece.trim();
  };
  const baseRef = parsePiece(pieces[0]);
  for (let i = 1; i < pieces.length; i++) extraFrom.push(parsePiece(pieces[i]));

  const baseParts = baseRef.replace(/\bAS\b/i, ' ').trim().split(/\s+/);
  const baseTable = baseParts[0];
  const baseAlias = baseParts[1] || baseTable;

  const assignments = splitTopLevel(setBody).map((a) => {
    const eq = a.indexOf('=');
    if (eq === -1) throw new Error('SET 的寫法應為「欄位 = 值」。');
    const lhsExpr = resolve(a.slice(0, eq).trim());
    const rhsExpr = resolve(a.slice(eq + 1).trim());
    const col = lhsExpr.replace(/^[A-Za-z_][\w$]*\s*\.\s*/, '').trim();
    return `${col} = ${rhsExpr}`;
  });

  if (innerWhere) conditions.push(innerWhere);
  if (outerWhere) {
    conditions.push(
      outerWhere.replace(/\b([A-Za-z_][\w$]*)\b/g, (tok) =>
        aliasMap.has(tok.toUpperCase()) ? aliasMap.get(tok.toUpperCase()) : tok)
    );
  }

  const fromSql = extraFrom.length ? ` FROM ${extraFrom.join(', ')}` : '';
  const whereSql = conditions.length ? ` WHERE ${conditions.map((c) => `(${c})`).join(' AND ')}` : '';
  return `UPDATE ${baseTable} AS ${baseAlias} SET ${assignments.join(', ')}${fromSql}${whereSql}`;
}

// ── MERGE ─────────────────────────────────────────────────────────

function translateMerge(sql) {
  const usingPos = findTopLevel(sql, /\bUSING\b/);
  if (!usingPos) throw new Error('MERGE 缺少 USING 子句。');
  const onPos = findTopLevel(sql, /\bON\b/, usingPos.index + usingPos.length);
  if (!onPos) throw new Error('MERGE 缺少 ON 子句。');
  const matchedPos = findTopLevel(sql, /\bWHEN\s+MATCHED\b/, onPos.index);
  const notMatchedPos = findTopLevel(sql, /\bWHEN\s+NOT\s+MATCHED\b/, onPos.index);
  const firstWhen = [matchedPos, notMatchedPos].filter(Boolean).sort((a, b) => a.index - b.index)[0];
  if (!firstWhen) throw new Error('MERGE 至少要有一個 WHEN MATCHED 或 WHEN NOT MATCHED 分支。');

  const targetRef = sql.slice(0, usingPos.index).replace(/^\s*MERGE\s+INTO\s+/i, '').trim();
  const tParts = targetRef.replace(/\bAS\b/i, ' ').trim().split(/\s+/);
  const targetTable = tParts[0];
  const targetAlias = tParts[1] || targetTable;

  const sourceRef = sql.slice(usingPos.index + usingPos.length, onPos.index).trim();
  let onCond = sql.slice(onPos.index + onPos.length, firstWhen.index).trim();
  if (onCond.startsWith('(')) {
    const close = matchParen(onCond, 0);
    if (close === onCond.length - 1) onCond = onCond.slice(1, close).trim();
  }

  const sliceBranch = (pos) => {
    if (!pos) return null;
    const others = [matchedPos, notMatchedPos]
      .filter((p) => p && p.index > pos.index)
      .sort((a, b) => a.index - b.index);
    return sql.slice(pos.index, others.length ? others[0].index : sql.length);
  };

  const out = [];

  const matchedText = sliceBranch(matchedPos);
  if (matchedText) {
    if (/\bDELETE\b/i.test(maskLiterals(matchedText))) {
      throw new Error('本練習站的 MERGE 尚未支援 DELETE 分支，請只用 UPDATE / INSERT。');
    }
    const setPos = findTopLevel(matchedText, /\bSET\b/);
    if (!setPos) throw new Error('WHEN MATCHED 後面要接 UPDATE SET。');
    const wherePos = findTopLevel(matchedText, /\bWHERE\b/, setPos.index);
    const setBody = matchedText.slice(setPos.index + setPos.length, wherePos ? wherePos.index : matchedText.length);
    const extraWhere = wherePos ? matchedText.slice(wherePos.index + wherePos.length).trim() : '';
    const assigns = splitTopLevel(setBody)
      .map((a) => a.replace(/^\s*[A-Za-z_][\w$]*\s*\.\s*([A-Za-z_][\w$]*)\s*=/, '$1 ='))
      .join(', ');
    const conds = [`(${onCond})`];
    if (extraWhere) conds.push(`(${extraWhere})`);
    out.push(
      `UPDATE ${targetTable} AS ${targetAlias} SET ${assigns} FROM ${sourceRef} WHERE ${conds.join(' AND ')}`
    );
  }

  const notMatchedText = sliceBranch(notMatchedPos);
  if (notMatchedText) {
    const insPos = findTopLevel(notMatchedText, /\bINSERT\b/);
    if (!insPos) throw new Error('WHEN NOT MATCHED 後面要接 INSERT。');
    const after = notMatchedText.slice(insPos.index + insPos.length);
    const colOpen = after.indexOf('(');
    const valPos = findTopLevel(after, /\bVALUES\b/);
    if (colOpen === -1 || !valPos) throw new Error('INSERT 要寫成 INSERT (欄位…) VALUES (值…)。');
    const colClose = matchParen(after, colOpen);
    const cols = splitTopLevel(after.slice(colOpen + 1, colClose))
      .map((c) => c.replace(/^[A-Za-z_][\w$]*\s*\.\s*/, ''));
    const valOpen = after.indexOf('(', valPos.index + valPos.length);
    const valClose = matchParen(after, valOpen);
    const vals = splitTopLevel(after.slice(valOpen + 1, valClose));
    const tailWherePos = findTopLevel(after, /\bWHERE\b/, valClose);
    const extraWhere = tailWherePos ? after.slice(tailWherePos.index + tailWherePos.length).trim() : '';

    const conds = [`NOT EXISTS (SELECT 1 FROM ${targetTable} ${targetAlias} WHERE ${onCond})`];
    if (extraWhere) conds.push(`(${extraWhere})`);
    out.push(
      `INSERT INTO ${targetTable} (${cols.join(', ')}) SELECT ${vals.join(', ')} ` +
      `FROM ${sourceRef} WHERE ${conds.join(' AND ')}`
    );
  }

  return out;
}

// ── 對外入口 ──────────────────────────────────────────────────────

export function translateStatement(stmt) {
  const s = stmt.trim().replace(/;+\s*$/, '').trim();
  if (!s) return [];
  const head = maskLiterals(s).trimStart().slice(0, 12).toUpperCase();
  let produced;
  if (head.startsWith('MERGE')) produced = translateMerge(s);
  else if (/^UPDATE\s*\(/i.test(maskLiterals(s).trim())) produced = [translateUpdateJoinView(s)];
  else if (head.startsWith('UPDATE')) produced = [rewriteSimpleUpdate(s)];
  else produced = [s];
  return produced.map(rewriteCommon);
}

export function translateOracleSql(sql) {
  return splitStatements(sql).flatMap(translateStatement);
}

// ── Oracle 純量函數 ────────────────────────────────────────────────

const MONTHS_EN = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function parseDate(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  const m = /^(\d{4})[-/]?(\d{2})[-/]?(\d{2})/.exec(s);
  if (!m) return null;
  return { y: +m[1], m: +m[2], d: +m[3] };
}
const pad2 = (n) => String(n).padStart(2, '0');
const fmtDate = (o) => `${o.y}-${pad2(o.m)}-${pad2(o.d)}`;
const daysInMonth = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();

function addMonths(o, n) {
  const total = o.y * 12 + (o.m - 1) + n;
  const y = Math.floor(total / 12);
  const m = (total % 12 + 12) % 12 + 1;
  return { y, m, d: Math.min(o.d, daysInMonth(y, m)) };
}

function toCharImpl(value, fmt) {
  if (value === null || value === undefined) return null;
  const f = fmt === null || fmt === undefined ? '' : String(fmt);
  const d = parseDate(value);
  if (d && (f === '' || /[YMDQH]/.test(f.toUpperCase()))) {
    const U = f.toUpperCase();
    if (!U) return fmtDate(d);
    return U
      .replace(/YYYY/g, String(d.y))
      .replace(/MM/g, pad2(d.m))
      .replace(/DD/g, pad2(d.d))
      .replace(/MON/g, MONTHS_EN[d.m - 1])
      .replace(/Q/g, String(Math.ceil(d.m / 3)))
      .replace(/HH24|HH/g, '00')
      .replace(/MI/g, '00')
      .replace(/SS/g, '00');
  }
  if (typeof value === 'number' && /[90,.]/.test(f)) {
    const decimals = (f.split('.')[1] || '').replace(/[^09]/g, '').length;
    const fixed = value.toFixed(decimals);
    if (f.includes(',')) {
      const [int, dec] = fixed.split('.');
      const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      return dec ? `${grouped}.${dec}` : grouped;
    }
    return fixed;
  }
  return String(value);
}

/** 把 Oracle 的純量函數註冊給 sql.js 的 Database */
export function registerOracleFunctions(db) {
  db.create_function('NVL', (a, b) => (a === null || a === undefined ? b : a));
  db.create_function('NVL2', (a, b, c) => (a === null || a === undefined ? c : b));
  db.create_function('SYSDATE', () => SYSDATE_FIXED);
  db.create_function('MOD', (a, b) => (b === 0 || b === null ? null : a % b));
  db.create_function('TO_NUMBER', (a) => (a === null ? null : Number(String(a).replace(/,/g, ''))));
  db.create_function('TO_CHAR', (v, f) => toCharImpl(v, f));
  db.create_function('TO_DATE', (v, f) => {
    const d = parseDate(v);
    return d ? fmtDate(d) : null;
  });
  db.create_function('INITCAP', (s) =>
    s === null ? null : String(s).toLowerCase().replace(/(^|\s)(\S)/g, (_, a, b) => a + b.toUpperCase()));
  db.create_function('LPAD', (s, n, p) =>
    s === null ? null : String(s).length >= n ? String(s).slice(0, n)
      : (String(p || ' ').repeat(n) + String(s)).slice(-n));
  db.create_function('RPAD', (s, n, p) =>
    s === null ? null : String(s).length >= n ? String(s).slice(0, n)
      : (String(s) + String(p || ' ').repeat(n)).slice(0, n));
  db.create_function('MONTHS_BETWEEN', (a, b) => {
    const d1 = parseDate(a), d2 = parseDate(b);
    if (!d1 || !d2) return null;
    return (d1.y - d2.y) * 12 + (d1.m - d2.m) + (d1.d - d2.d) / 31;
  });
  db.create_function('ADD_MONTHS', (a, n) => {
    const d = parseDate(a);
    return d ? fmtDate(addMonths(d, Math.trunc(n))) : null;
  });
  db.create_function('LAST_DAY', (a) => {
    const d = parseDate(a);
    return d ? fmtDate({ y: d.y, m: d.m, d: daysInMonth(d.y, d.m) }) : null;
  });
  db.create_function('TRUNC', (v, f) => {
    if (v === null || v === undefined) return null;
    const d = parseDate(v);
    if (d) {
      const U = f ? String(f).toUpperCase() : 'DD';
      if (U.startsWith('Y')) return fmtDate({ y: d.y, m: 1, d: 1 });
      if (U.startsWith('M')) return fmtDate({ y: d.y, m: d.m, d: 1 });
      if (U.startsWith('Q')) return fmtDate({ y: d.y, m: Math.floor((d.m - 1) / 3) * 3 + 1, d: 1 });
      return fmtDate(d);
    }
    const n = Number(v);
    if (Number.isNaN(n)) return null;
    const p = f === null || f === undefined || f === 'NULL' ? 0 : Number(f);
    const k = Math.pow(10, Number.isNaN(p) ? 0 : p);
    return Math.trunc(n * k) / k;
  });
}

/** 畫面上「方言對照」面板用的說明 */
export const DIALECT_NOTES = [
  ['MINUS', '自動轉成 SQLite 的 EXCEPT，語意相同'],
  ['NVL / NVL2 / DECODE', 'NVL、NVL2 以自訂函數實作；DECODE 會改寫成 CASE WHEN'],
  ['MERGE', '拆成 UPDATE … FROM 加上 INSERT … WHERE NOT EXISTS 兩道語句執行'],
  ['UPDATE (SELECT …) SET …', 'Oracle 可更新連接檢視，改寫為 SQLite 的 UPDATE … FROM'],
  ['SYSDATE', `固定為 ${SYSDATE_FIXED}，讓練習答案可以重現`],
  ['ROWNUM', 'ROWNUM <= n 轉成 LIMIT n；出現在選取清單則轉成 ROW_NUMBER() OVER ()'],
  ['DUAL', '真的建了一張 dual 表，SELECT … FROM DUAL 可直接用'],
  ['(+) 外連接', '不支援，請改用 LEFT / RIGHT / FULL JOIN'],
  ['ORDER BY 的 NULL', 'Oracle 預設 ASC→NULLS LAST、DESC→NULLS FIRST，本站會自動補上讓順序一致'],
  ['FETCH FIRST n ROWS ONLY', '轉成 LIMIT n，OFFSET n ROWS 轉成 OFFSET n'],
  ['日期型別', '以 YYYY-MM-DD 的文字儲存，TO_CHAR / TRUNC / ADD_MONTHS 均可用'],
];
