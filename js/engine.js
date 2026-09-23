// 執行與批改的引擎。刻意不碰 DOM，Node 測試腳本與瀏覽器共用同一份。

import { SCHEMA_SQL } from './schema.js';
import { translateOracleSql, registerOracleFunctions } from './oracle.js';
import { grade, checkSyntaxRequirements } from './checker.js';

/** 建立一個乾淨的練習資料庫 */
export function createDatabase(SQL) {
  const db = new SQL.Database();
  registerOracleFunctions(db);
  db.run(SCHEMA_SQL);
  return db;
}

const isDml = (stmt) => /^\s*(INSERT|UPDATE|DELETE|MERGE|REPLACE)\b/i.test(stmt);

/**
 * 執行一段 Oracle SQL。
 * 回傳 { statements, results, lastResult, rowsModified }
 * results 裡每個元素是 { columns, values } 或 null（DML 沒有結果集）
 */
export function runSql(db, oracleSql) {
  const statements = translateOracleSql(oracleSql);
  if (!statements.length) throw new Error('沒有可執行的 SQL。');
  const results = [];
  let rowsModified = 0;
  for (const stmt of statements) {
    const out = db.exec(stmt);
    results.push(out.length ? out[out.length - 1] : null);
    // getRowsModified() 在 SELECT 之後會沿用上一句的數字，只能對 DML 累加
    if (isDml(stmt)) rowsModified += db.getRowsModified();
  }
  const withData = results.filter(Boolean);
  return {
    statements,
    results,
    lastResult: withData.length ? withData[withData.length - 1] : null,
    rowsModified,
  };
}

/** 讀出指定資料表的完整內容，供 DML 題比對 */
export function snapshot(db, tables) {
  const out = {};
  for (const t of tables) {
    const res = db.exec(`SELECT * FROM ${t}`);
    out[t] = res.length ? res[0].values : [];
  }
  return out;
}

export function tableColumns(db, table) {
  const res = db.exec(`SELECT * FROM ${table} LIMIT 0`);
  return res.length ? res[0].columns : [];
}

/**
 * 批改一題。每次都用全新的資料庫跑參考答案與使用者答案，
 * 兩邊起點完全相同，比對才有意義。
 */
export function evaluate({ SQL, exercise, userSql }) {
  const syntaxProblems = checkSyntaxRequirements(userSql, exercise);
  if (syntaxProblems.length) {
    return { ok: false, kind: 'syntax', reason: syntaxProblems.join('\n') };
  }

  const isDml = exercise.kind === 'dml';
  const tables = exercise.affects || [];

  let expected;
  const refDb = createDatabase(SQL);
  try {
    const refRun = runSql(refDb, exercise.solution);
    expected = isDml ? snapshot(refDb, tables) : refRun.lastResult;
  } finally {
    refDb.close();
  }

  let actual;
  let userRun;
  const userDb = createDatabase(SQL);
  try {
    try {
      userRun = runSql(userDb, userSql);
    } catch (err) {
      return { ok: false, kind: 'error', reason: `SQL 執行失敗：${err.message}` };
    }
    actual = isDml ? snapshot(userDb, tables) : userRun.lastResult;
    const result = grade({ exercise, expected, actual, syntaxProblems: [] });
    return { ...result, rowsModified: userRun.rowsModified, translated: userRun.statements };
  } finally {
    userDb.close();
  }
}

/** 預覽參考答案跑出來的結果，給「看解答」用 */
export function solutionPreview({ SQL, exercise }) {
  const db = createDatabase(SQL);
  try {
    const run = runSql(db, exercise.solution);
    if (exercise.kind === 'dml') {
      const tables = exercise.affects || [];
      return tables.map((t) => {
        const res = db.exec(`SELECT * FROM ${t}`);
        return { table: t, result: res.length ? res[0] : { columns: [], values: [] } };
      });
    }
    return [{ table: null, result: run.lastResult }];
  } finally {
    db.close();
  }
}
