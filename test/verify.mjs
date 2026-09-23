// 離線驗證：確認每一題的參考答案都能跑、結果不是空的、而且能通過自己的批改。
// 另外測 Oracle 方言改寫與「答錯要被抓到」。
//   執行：npm test

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const initSqlJs = require('sql.js');

import { ALL_ITEMS } from '../js/exercises.js';
import { createDatabase, runSql, evaluate } from '../js/engine.js';
import { translateOracleSql } from '../js/oracle.js';

const SQL = await initSqlJs();

let pass = 0;
const failures = [];
const check = (name, fn) => {
  try {
    const note = fn();
    pass++;
    if (process.env.VERBOSE) console.log(`  ✓ ${name}${note ? ' — ' + note : ''}`);
  } catch (err) {
    failures.push(`${name}\n    ${err.message.split('\n').join('\n    ')}`);
    console.log(`  ✗ ${name}\n      ${err.message.split('\n').join('\n      ')}`);
  }
};
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

// ── 1. 資料庫建得起來 ────────────────────────────────────────────
console.log('\n[1] 基礎資料庫');
check('schema 載入且資料筆數正確', () => {
  const db = createDatabase(SQL);
  const counts = {};
  for (const t of ['departments', 'employees', 'projects', 'emp_projects', 'salary_grades', 'emp_bonus', 'salary_adjust']) {
    counts[t] = db.exec(`SELECT COUNT(*) FROM ${t}`)[0].values[0][0];
  }
  assert(counts.employees === 12, `employees 應為 12 筆，實際 ${counts.employees}`);
  assert(counts.departments === 5, `departments 應為 5 筆`);
  assert(counts.emp_bonus === 3, 'emp_bonus 應為 3 筆');
  db.close();
  return JSON.stringify(counts);
});

// ── 2. Oracle 方言改寫 ──────────────────────────────────────────
console.log('\n[2] Oracle 方言改寫');
const runOne = (sql) => {
  const db = createDatabase(SQL);
  try { return runSql(db, sql); } finally { db.close(); }
};

check('MINUS → EXCEPT', () => {
  const r = runOne('SELECT dept_id FROM departments MINUS SELECT dept_id FROM employees WHERE dept_id IS NOT NULL');
  assert(r.lastResult.values.length === 1 && r.lastResult.values[0][0] === 50, '應只剩部門 50');
});
check('NVL / NVL2 / DECODE', () => {
  const r = runOne(`SELECT NVL(NULL, 7), NVL2(NULL,'a','b'), NVL2(1,'a','b'), DECODE(2, 1, 'one', 2, 'two', 'other') FROM DUAL`);
  const v = r.lastResult.values[0];
  assert(v[0] === 7 && v[1] === 'b' && v[2] === 'a' && v[3] === 'two', `得到 ${JSON.stringify(v)}`);
});
check('SYSDATE / TO_CHAR / ADD_MONTHS / LAST_DAY / TRUNC', () => {
  const r = runOne(`SELECT TO_CHAR(SYSDATE,'YYYY-MM-DD'), TO_CHAR(SYSDATE,'YYYY/MM'), ADD_MONTHS(SYSDATE,-1), LAST_DAY('2024-02-05'), TRUNC(SYSDATE,'MM'), TRUNC(12.987, 1) FROM DUAL`);
  const v = r.lastResult.values[0];
  assert(v[0] === '2024-09-30', `TO_CHAR 得到 ${v[0]}`);
  assert(v[1] === '2024/09', `格式化得到 ${v[1]}`);
  assert(v[2] === '2024-08-30', `ADD_MONTHS 得到 ${v[2]}`);
  assert(v[3] === '2024-02-29', `LAST_DAY 得到 ${v[3]}`);
  assert(v[4] === '2024-09-01', `TRUNC 得到 ${v[4]}`);
  assert(Math.abs(v[5] - 12.9) < 1e-9, `TRUNC 數值得到 ${v[5]}`);
});
check('ROWNUM 轉 LIMIT', () => {
  const r = runOne('SELECT emp_id FROM employees WHERE ROWNUM <= 3');
  assert(r.lastResult.values.length === 3, `得到 ${r.lastResult.values.length} 筆`);
});
check('FULL OUTER JOIN 可執行', () => {
  const r = runOne('SELECT d.dept_id, e.emp_id FROM departments d FULL OUTER JOIN employees e ON e.dept_id = d.dept_id');
  assert(r.lastResult.values.length === 13, `應為 13 筆，實際 ${r.lastResult.values.length}`);
});
check('(+) 外連接要給出清楚錯誤', () => {
  let msg = '';
  try { runOne('SELECT * FROM departments d, employees e WHERE d.dept_id(+) = e.dept_id'); }
  catch (e) { msg = e.message; }
  assert(msg.includes('(+)'), `錯誤訊息不夠清楚：${msg}`);
});
check('MERGE 兩個分支都會被翻譯', () => {
  const stmts = translateOracleSql(`MERGE INTO emp_bonus b USING (SELECT emp_id, salary AS bonus_amt FROM employees) s
    ON (b.emp_id = s.emp_id)
    WHEN MATCHED THEN UPDATE SET b.bonus_amt = s.bonus_amt
    WHEN NOT MATCHED THEN INSERT (emp_id, bonus_amt) VALUES (s.emp_id, s.bonus_amt)`);
  assert(stmts.length === 2, `應翻成 2 句，實際 ${stmts.length}`);
  assert(/^UPDATE/i.test(stmts[0]) && /^INSERT/i.test(stmts[1]), stmts.join(' | '));
});
check('MERGE 實際跑出正確筆數', () => {
  const db = createDatabase(SQL);
  runSql(db, `MERGE INTO emp_bonus b
    USING (SELECT emp_id, salary * 0.1 AS amt FROM employees) s
    ON (b.emp_id = s.emp_id)
    WHEN MATCHED THEN UPDATE SET b.bonus_amt = s.amt
    WHEN NOT MATCHED THEN INSERT (emp_id, bonus_amt) VALUES (s.emp_id, s.amt)`);
  const n = db.exec('SELECT COUNT(*) FROM emp_bonus')[0].values[0][0];
  const v1001 = db.exec('SELECT bonus_amt FROM emp_bonus WHERE emp_id = 1001')[0].values[0][0];
  db.close();
  assert(n === 12, `MERGE 後應有 12 筆，實際 ${n}`);
  assert(Math.abs(v1001 - 8200) < 1e-6, `1001 的獎金應為 8200，實際 ${v1001}`);
});
check('UPDATE (SELECT … JOIN …) SET 可更新連接檢視', () => {
  const db = createDatabase(SQL);
  runSql(db, `UPDATE (SELECT e.salary AS s, a.new_salary AS n
                      FROM employees e JOIN salary_adjust a ON a.emp_id = e.emp_id)
              SET s = n`);
  const rows = db.exec('SELECT emp_id, salary FROM employees WHERE emp_id IN (1002, 1005, 1011, 1001) ORDER BY emp_id')[0].values;
  db.close();
  const map = Object.fromEntries(rows);
  assert(map[1002] === 52000, `1002 應為 52000，實際 ${map[1002]}`);
  assert(map[1011] === 42000, `1011 應為 42000，實際 ${map[1011]}`);
  assert(map[1001] === 82000, `1001 不該被動到，實際 ${map[1001]}`);
});
check('UPDATE 別名寫法 SET alias.col 可用', () => {
  const db = createDatabase(SQL);
  runSql(db, `UPDATE employees e SET e.salary = e.salary + 1000 WHERE e.dept_id = 10`);
  const n = db.exec('SELECT salary FROM employees WHERE emp_id = 1001')[0].values[0][0];
  db.close();
  assert(n === 83000, `應為 83000，實際 ${n}`);
});
check('多語句以分號切割', () => {
  const stmts = translateOracleSql("SELECT 1 FROM dual; SELECT ';' FROM dual");
  assert(stmts.length === 2, `應為 2 句，實際 ${stmts.length}：${JSON.stringify(stmts)}`);
});

check('ORDER BY 的 NULL 依 Oracle 規則排（ASC 放最後）', () => {
  const r = runOne('SELECT emp_id, dept_id FROM employees ORDER BY dept_id, emp_id');
  const last = r.lastResult.values.slice(-2).map((row) => row[0]);
  assert(r.lastResult.values[0][1] === 10, `第一列部門應為 10，實際 ${r.lastResult.values[0][1]}`);
  assert(last[0] === 1009 && last[1] === 1012, `NULL 部門應排最後，實際 ${JSON.stringify(last)}`);
});
check('ORDER BY DESC 的 NULL 排最前面', () => {
  const r = runOne('SELECT emp_id, dept_id FROM employees ORDER BY dept_id DESC, emp_id');
  assert(r.lastResult.values[0][1] === null, `DESC 時 NULL 應排最前，實際 ${r.lastResult.values[0][1]}`);
});
check('FETCH FIRST n ROWS ONLY → LIMIT', () => {
  const r = runOne('SELECT emp_id FROM employees ORDER BY emp_id FETCH FIRST 4 ROWS ONLY');
  assert(r.lastResult.values.length === 4, `應為 4 筆，實際 ${r.lastResult.values.length}`);
});
check('子查詢與視窗函數裡的 ORDER BY 不受影響', () => {
  const r = runOne(`SELECT emp_id, ROW_NUMBER() OVER (ORDER BY salary DESC) AS rn
                    FROM (SELECT emp_id, salary FROM employees ORDER BY emp_id)
                    ORDER BY rn FETCH FIRST 1 ROWS ONLY`);
  assert(r.lastResult.values[0][0] === 1003, `薪資最高者應為 1003，實際 ${r.lastResult.values[0][0]}`);
});

// ── 3. 每一題的參考答案 ─────────────────────────────────────────
console.log(`\n[3] 題庫（共 ${ALL_ITEMS.length} 題）`);
for (const item of ALL_ITEMS) {
  check(`${item.id}｜${item.title}`, () => {
    // 3a. 參考答案自己要能通過批改
    const res = evaluate({ SQL, exercise: item, userSql: item.solution });
    assert(res.ok, `參考答案沒通過批改：${res.reason}\n${res.detail || ''}`);

    // 3b. 參考答案要符合自己宣告的語法要求
    const db = createDatabase(SQL);
    let run;
    try { run = runSql(db, item.solution); } finally { db.close(); }

    if (item.kind === 'dml') {
      assert((item.affects || []).length > 0, 'DML 題必須宣告 affects');
      assert(run.rowsModified > 0, 'DML 題的參考答案沒有異動任何資料');
      return `異動 ${run.rowsModified} 列`;
    }
    assert(run.lastResult, '查詢沒有回傳結果集');
    assert(run.lastResult.values.length > 0, '查詢結果是空的，題目要換資料或換條件');
    if (item.ordered) {
      assert(/\bORDER\s+BY\b/i.test(item.solution), '宣告 ordered:true 但參考答案沒有 ORDER BY');
    }
    return `${run.lastResult.values.length} 列 × ${run.lastResult.columns.length} 欄`;
  });
}

// ── 4. 批改要抓得到錯 ───────────────────────────────────────────
console.log('\n[4] 批改機制');
const byId = Object.fromEntries(ALL_ITEMS.map((i) => [i.id, i]));

check('少了 WHERE 條件會被抓到', () => {
  const res = evaluate({ SQL, exercise: byId['or-2'], userSql: 'SELECT emp_id, emp_name, dept_id, job, salary FROM employees ORDER BY emp_id' });
  assert(!res.ok && res.kind === 'result', `應判錯，實際 ${JSON.stringify(res)}`);
});
check('欄位數不符會被抓到', () => {
  const res = evaluate({ SQL, exercise: byId['inner-join-1'], userSql: 'SELECT e.emp_id FROM employees e JOIN departments d ON e.dept_id = d.dept_id ORDER BY e.emp_id' });
  assert(!res.ok && /欄位數/.test(res.reason), res.reason);
});
check('排序錯誤在 ordered 題會被抓到', () => {
  const res = evaluate({ SQL, exercise: byId['inner-join-1'], userSql: 'SELECT e.emp_id, e.emp_name, d.dept_name FROM employees e JOIN departments d ON e.dept_id = d.dept_id ORDER BY e.emp_id DESC' });
  assert(!res.ok, '順序相反應該要判錯');
});
check('沒用指定語法會被擋下（EXISTS 題用 JOIN）', () => {
  const res = evaluate({ SQL, exercise: byId['exists-1'], userSql: 'SELECT DISTINCT e.emp_id, e.emp_name FROM employees e JOIN emp_projects ep ON ep.emp_id = e.emp_id ORDER BY e.emp_id' });
  assert(!res.ok && res.kind === 'syntax', `應被語法檢查擋下，實際 ${JSON.stringify(res)}`);
});
check('等價但不同寫法要能通過（RIGHT JOIN 題改用 LEFT JOIN 之外的合法寫法）', () => {
  const res = evaluate({ SQL, exercise: byId['full-join-1'], userSql: `SELECT d.dept_id, d.dept_name, e.emp_id, e.emp_name
    FROM employees e FULL JOIN departments d ON e.dept_id = d.dept_id ORDER BY d.dept_id, e.emp_id` });
  assert(res.ok, `等價寫法應該要過：${res.reason}\n${res.detail || ''}`);
});
check('欄位別名不同仍算對，只給提醒', () => {
  const res = evaluate({ SQL, exercise: byId['aggregate-1'], userSql: `SELECT COUNT(*) AS a, COUNT(commission_pct) AS b, SUM(salary) AS c,
    ROUND(AVG(salary),2) AS d, MAX(salary) AS e, MIN(salary) AS f FROM employees` });
  assert(res.ok, `應判對：${res.reason}`);
  assert(res.warning, '別名不同時應該要有提醒');
});
check('DML 題改動到不該動的資料會被抓到', () => {
  const res = evaluate({ SQL, exercise: byId['merge-2'], userSql: `MERGE INTO employees e USING salary_adjust a ON (e.emp_id = a.emp_id)
    WHEN MATCHED THEN UPDATE SET e.salary = a.new_salary` });
  assert(!res.ok, '少了「只漲不跌」的 WHERE 應該要判錯');
});
check('語法錯誤回傳可讀訊息', () => {
  const res = evaluate({ SQL, exercise: byId['inner-join-1'], userSql: 'SELECT e.emp_id, e.emp_name, d.dept_name FRM employees e JOIN departments d ON 1 = 1' });
  assert(!res.ok && res.kind === 'error', JSON.stringify(res));
});

// ── 結果 ────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(60)}`);
if (failures.length) {
  console.log(`✗ ${failures.length} 項失敗 / 共 ${pass + failures.length} 項\n`);
  process.exit(1);
}
console.log(`✓ 全部 ${pass} 項通過`);
