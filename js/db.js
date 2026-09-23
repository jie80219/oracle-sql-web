// 瀏覽器端的 sql.js 啟動與資料庫管理
import { createDatabase } from './engine.js';

let SQL = null;
let sandboxDb = null;

/** 載入 WASM 引擎（只做一次） */
export async function loadEngine() {
  if (SQL) return SQL;
  if (typeof window.initSqlJs !== 'function') {
    throw new Error('找不到 sql.js，請確認 vendor/sql-wasm.js 有載入成功。');
  }
  SQL = await window.initSqlJs({ locateFile: (file) => `vendor/${file}` });
  return SQL;
}

export function getSQL() {
  if (!SQL) throw new Error('資料庫引擎尚未載入完成。');
  return SQL;
}

/** 每次作答都用全新的資料庫，結果才可重現 */
export function freshDatabase() {
  return createDatabase(getSQL());
}

/** 自由查詢區用的資料庫，會保留 DML 的結果直到手動重設 */
export function getSandboxDatabase() {
  if (!sandboxDb) sandboxDb = freshDatabase();
  return sandboxDb;
}

export function resetSandboxDatabase() {
  if (sandboxDb) sandboxDb.close();
  sandboxDb = freshDatabase();
  return sandboxDb;
}
