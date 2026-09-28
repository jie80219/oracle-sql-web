// 每個語法主題的動畫腳本。
//
// 資料一律從 schema.js 的真實資料挑幾列出來（縮減成 3～4 列才塞得進側邊欄），
// 學生在動畫看到的名字、薪水，跟自己查出來的會是同一批，比較不會錯亂。
//
// 一步 = { note, tables, op, out }
//   note   這一步在講什麼（顯示在動畫下方）
//   tables 上排要並列的表，用 T() 建，通常 1～2 張
//   op     兩張表中間的運算子標記，例如 'JOIN'、'MINUS'
//   out    下排的結果表；沒有就不畫

import { T, R } from './anim.js';

// 常用的縮減版資料
const EMP_COLS = ['emp_id', 'emp_name', 'dept_id'];
const emp = (state = {}) => T('employees', EMP_COLS, [
  R([1002, '李小華', 10], state[1002] || ''),
  R([1004, '林美玲', 20], state[1004] || ''),
  R([1009, '蔡明軒', null], state[1009] || ''),
]);

const DEPT_COLS = ['dept_id', 'dept_name'];
const dept = (state = {}) => T('departments', DEPT_COLS, [
  R([10, '業務部'], state[10] || ''),
  R([20, '研發部'], state[20] || ''),
  R([50, '客服部'], state[50] || ''),
]);

export const ANIM_STEPS = {

  // ── JOIN ────────────────────────────────────────────────────

  'inner-join': [
    { note: '兩張表各自長這樣。employees.dept_id 要去對 departments.dept_id。',
      tables: [emp(), dept()], op: 'JOIN' },
    { note: '1002 的 dept_id = 10，在右表找到業務部 → 對上了，這一列留下。',
      tables: [emp({ 1002: 'hit' }), dept({ 10: 'hit' })], op: 'ON',
      out: T('結果', ['emp_name', 'dept_name'], [R(['李小華', '業務部'], 'hit')]) },
    { note: '1004 的 dept_id = 20，對到研發部 → 也留下。',
      tables: [emp({ 1004: 'hit' }), dept({ 20: 'hit' })], op: 'ON',
      out: T('結果', ['emp_name', 'dept_name'], [
        R(['李小華', '業務部']), R(['林美玲', '研發部'], 'hit')]) },
    { note: '1009 的 dept_id 是 NULL，右表找不到任何對應 → 整列消失。',
      tables: [emp({ 1009: 'miss' }), dept()], op: 'ON',
      out: T('結果', ['emp_name', 'dept_name'], [
        R(['李小華', '業務部']), R(['林美玲', '研發部'])]) },
    { note: '客服部沒有任何員工，同樣不會出現。INNER JOIN 只留下「兩邊都對得上」的。',
      tables: [emp({ 1009: 'miss' }), dept({ 50: 'miss' })], op: 'ON',
      out: T('結果', ['emp_name', 'dept_name'], [
        R(['李小華', '業務部']), R(['林美玲', '研發部'])]) },
  ],

  'left-join': [
    { note: 'LEFT JOIN 的重點：左表（departments）不管對不對得到，全部都要留。',
      tables: [dept(), emp()], op: 'LEFT JOIN' },
    { note: '業務部對到李小華、研發部對到林美玲 —— 這兩列跟 INNER JOIN 一樣。',
      tables: [dept({ 10: 'hit', 20: 'hit' }), emp({ 1002: 'hit', 1004: 'hit' })], op: 'ON',
      out: T('結果', ['dept_name', 'emp_name'], [
        R(['業務部', '李小華'], 'hit'), R(['研發部', '林美玲'], 'hit')]) },
    { note: '客服部一個員工都沒有，但左表要全留 → 右邊的欄位補 NULL。',
      tables: [dept({ 50: 'hit' }), emp()], op: 'ON',
      out: T('結果', ['dept_name', 'emp_name'], [
        R(['業務部', '李小華']), R(['研發部', '林美玲']), R(['客服部', null], 'null')]) },
    { note: '想找「沒有員工的部門」就加 where e.emp_id is null，把補 NULL 的那幾列挑出來。',
      tables: [dept({ 50: 'hit' }), emp()], op: 'ON',
      out: T('where e.emp_id is null', ['dept_name', 'emp_name'], [
        R(['客服部', null], 'hit')]) },
  ],

  'right-join': [
    { note: 'RIGHT JOIN 反過來：右表（employees）全留。',
      tables: [dept(), emp()], op: 'RIGHT JOIN' },
    { note: '李小華、林美玲都對得到部門，正常輸出。',
      tables: [dept({ 10: 'hit', 20: 'hit' }), emp({ 1002: 'hit', 1004: 'hit' })], op: 'ON',
      out: T('結果', ['dept_name', 'emp_name'], [
        R(['業務部', '李小華'], 'hit'), R(['研發部', '林美玲'], 'hit')]) },
    { note: '蔡明軒沒有部門，但右表要全留 → 左邊補 NULL。',
      tables: [dept(), emp({ 1009: 'hit' })], op: 'ON',
      out: T('結果', ['dept_name', 'emp_name'], [
        R(['業務部', '李小華']), R(['研發部', '林美玲']), R([null, '蔡明軒'], 'null')]) },
    { note: '客服部沒人，而左表不保證留 → 它不會出現。把兩張表對調，就等同 LEFT JOIN。',
      tables: [dept({ 50: 'miss' }), emp()], op: 'ON',
      out: T('結果', ['dept_name', 'emp_name'], [
        R(['業務部', '李小華']), R(['研發部', '林美玲']), R([null, '蔡明軒'], 'null')]) },
  ],

  'full-join': [
    { note: 'FULL OUTER JOIN：兩邊都全留，誰對不到誰就補 NULL。',
      tables: [dept(), emp()], op: 'FULL JOIN' },
    { note: '先放對得上的：業務部↔李小華、研發部↔林美玲。',
      tables: [dept({ 10: 'hit', 20: 'hit' }), emp({ 1002: 'hit', 1004: 'hit' })], op: 'ON',
      out: T('結果', ['dept_name', 'emp_name'], [
        R(['業務部', '李小華'], 'hit'), R(['研發部', '林美玲'], 'hit')]) },
    { note: '再補上左邊落單的：客服部沒有員工 → 右欄 NULL。',
      tables: [dept({ 50: 'hit' }), emp()], op: 'ON',
      out: T('結果', ['dept_name', 'emp_name'], [
        R(['業務部', '李小華']), R(['研發部', '林美玲']), R(['客服部', null], 'null')]) },
    { note: '最後補上右邊落單的：蔡明軒沒有部門 → 左欄 NULL。兩邊的孤兒都看得到了。',
      tables: [dept(), emp({ 1009: 'hit' })], op: 'ON',
      out: T('結果', ['dept_name', 'emp_name'], [
        R(['業務部', '李小華']), R(['研發部', '林美玲']),
        R(['客服部', null], 'null'), R([null, '蔡明軒'], 'null')]) },
    { note: '加上 where d.dept_id is null or e.emp_id is null，就只剩「對不起來」的差異列。',
      tables: [dept({ 50: 'hit' }), emp({ 1009: 'hit' })], op: 'FULL JOIN',
      out: T('只看差異', ['dept_name', 'emp_name'], [
        R(['客服部', null], 'hit'), R([null, '蔡明軒'], 'hit')]) },
  ],

  'multi-join': [
    { note: '目標：員工 → 部門 → 專案，一路串三張表。先看員工。',
      tables: [T('employees', ['emp_id', 'emp_name', 'dept_id'], [
        R([1004, '林美玲', 20], 'hit')])] },
    { note: '第一個 JOIN：用 dept_id 接上 departments。',
      tables: [
        T('e ⋈ d', ['emp_name', 'dept_id'], [R(['林美玲', 20], 'hit')]),
        T('departments', ['dept_id', 'dept_name'], [R([20, '研發部'], 'hit')])], op: 'ON d.dept_id = e.dept_id',
      out: T('目前結果', ['emp_name', 'dept_name'], [R(['林美玲', '研發部'], 'hit')]) },
    { note: '第二個 JOIN：用 emp_id 接上中介表 emp_projects。每個 JOIN 都要有自己的 ON。',
      tables: [
        T('目前結果', ['emp_id', 'emp_name'], [R([1004, '林美玲'], 'hit')]),
        T('emp_projects', ['emp_id', 'proj_id'], [
          R([1004, 9001], 'hit'), R([1004, 9004], 'hit')])], op: 'ON ep.emp_id = e.emp_id',
      out: T('目前結果', ['emp_name', 'proj_id'], [
        R(['林美玲', 9001], 'hit'), R(['林美玲', 9004], 'hit')]) },
    { note: '第三個 JOIN 接上 projects。注意林美玲參與兩個專案，結果就變成兩列。',
      tables: [
        T('目前結果', ['emp_name', 'proj_id'], [
          R(['林美玲', 9001]), R(['林美玲', 9004])]),
        T('projects', ['proj_id', 'proj_name'], [
          R([9001, 'CRM 系統升級'], 'hit'), R([9004, '資料倉儲'], 'hit')])], op: 'ON p.proj_id = ep.proj_id',
      out: T('結果', ['emp_name', 'dept_name', 'proj_name'], [
        R(['林美玲', '研發部', 'CRM 系統升級'], 'hit'),
        R(['林美玲', '研發部', '資料倉儲'], 'hit')]) },
  ],

  // ── 查詢基礎 ────────────────────────────────────────────────

  distinct: [
    { note: 'employees 的 job 欄位有重複值。',
      tables: [T('employees', ['emp_name', 'job'], [
        R(['李小華', 'SALES']), R(['林美玲', 'DEV']),
        R(['張家豪', 'DEV']), R(['許文龍', 'SALES'])])] },
    { note: 'DISTINCT 掃過去，第一次出現的值保留。',
      tables: [T('employees', ['emp_name', 'job'], [
        R(['李小華', 'SALES'], 'hit'), R(['林美玲', 'DEV'], 'hit'),
        R(['張家豪', 'DEV']), R(['許文龍', 'SALES'])])],
      out: T('select distinct job', ['job'], [R(['SALES'], 'hit'), R(['DEV'], 'hit')]) },
    { note: '後面重複出現的就被丟掉，只剩兩個不同的 job。',
      tables: [T('employees', ['emp_name', 'job'], [
        R(['李小華', 'SALES']), R(['林美玲', 'DEV']),
        R(['張家豪', 'DEV'], 'miss'), R(['許文龍', 'SALES'], 'miss')])],
      out: T('select distinct job', ['job'], [R(['SALES']), R(['DEV'])]) },
    { note: '重點：DISTINCT 是對「整列」去重。兩欄一起選時，要兩欄都一樣才算重複。',
      tables: [T('distinct dept_id, job', ['dept_id', 'job'], [
        R([10, 'SALES'], 'hit'), R([20, 'DEV'], 'hit'), R([20, 'QA'], 'hit')])] },
  ],

  or: [
    { note: 'OR 只要有一邊成立就留下。條件：job = \'DEV\' or salary >= 80000。',
      tables: [T('employees', ['emp_name', 'job', 'salary'], [
        R(['王大明', 'SALES_MGR', 82000]),
        R(['李小華', 'SALES', 48000]),
        R(['林美玲', 'DEV', 72000])])] },
    { note: '王大明不是 DEV，但薪水 82000 ≥ 80000 → 第二個條件成立，留下。',
      tables: [T('employees', ['emp_name', 'job', 'salary'], [
        R(['王大明', 'SALES_MGR', 82000], 'hit'),
        R(['李小華', 'SALES', 48000]),
        R(['林美玲', 'DEV', 72000])])],
      out: T('結果', ['emp_name'], [R(['王大明'], 'hit')]) },
    { note: '林美玲是 DEV → 第一個條件成立，也留下。李小華兩個都不成立，出局。',
      tables: [T('employees', ['emp_name', 'job', 'salary'], [
        R(['王大明', 'SALES_MGR', 82000], 'hit'),
        R(['李小華', 'SALES', 48000], 'miss'),
        R(['林美玲', 'DEV', 72000], 'hit')])],
      out: T('結果', ['emp_name'], [R(['王大明']), R(['林美玲'], 'hit')]) },
    { note: '陷阱：AND 比 OR 先結合。dept_id=10 or dept_id=30 and salary>50000 會被讀成 dept_id=10 or (dept_id=30 and …)，一定要自己加括號。',
      tables: [T('務必加括號', ['寫法', '意思'], [
        R(['a or b and c', 'a or (b and c)'], 'miss'),
        R(['(a or b) and c', '你多半想要這個'], 'hit')])] },
  ],

  'like-between': [
    { note: 'LIKE 的 % 代表任意長度（含 0 個字），_ 代表剛好一個字。',
      tables: [T('employees', ['emp_name', 'job'], [
        R(['王大明', 'SALES_MGR']), R(['李小華', 'SALES']), R(['陳志強', 'DEV_MGR'])])] },
    { note: "job like '%MGR'：結尾是 MGR 的都算，前面多長都行。",
      tables: [T('employees', ['emp_name', 'job'], [
        R(['王大明', 'SALES_MGR'], 'hit'), R(['李小華', 'SALES'], 'miss'),
        R(['陳志強', 'DEV_MGR'], 'hit')])],
      out: T('結果', ['emp_name', 'job'], [
        R(['王大明', 'SALES_MGR'], 'hit'), R(['陳志強', 'DEV_MGR'], 'hit')]) },
    { note: 'BETWEEN 是「含頭含尾」：50000 和 80000 本身都算進去。',
      tables: [T('salary between 50000 and 80000', ['emp_name', 'salary'], [
        R(['李小華', 48000], 'miss'),
        R(['劉雅婷', 60000], 'hit'),
        R(['林美玲', 72000], 'hit'),
        R(['王大明', 82000], 'miss')])] },
    { note: 'NULL 最要小心：= NULL 永遠不成立（連 NULL = NULL 都不成立），只能用 IS NULL。',
      tables: [T('employees', ['emp_name', 'email'], [
        R(['張家豪', null], 'hit'), R(['李小華', 'hua@example.com'], 'miss')])],
      out: T('where email is null', ['emp_name'], [R(['張家豪'], 'hit')]) },
  ],

  'top-n': [
    { note: '要取薪水最高的 3 名。原始資料是沒有順序的。',
      tables: [T('employees', ['emp_name', 'salary'], [
        R(['李小華', 48000]), R(['陳志強', 95000]),
        R(['林美玲', 72000]), R(['王大明', 82000])])] },
    { note: '先 order by salary desc 排好序 —— 這一步不能省，不然取到的是隨便三筆。',
      tables: [T('order by salary desc', ['emp_name', 'salary'], [
        R(['陳志強', 95000], 'hit'), R(['王大明', 82000], 'hit'),
        R(['林美玲', 72000], 'hit'), R(['李小華', 48000])])] },
    { note: 'fetch first 3 rows only：從排好的結果取前 3 筆。',
      tables: [T('order by salary desc', ['emp_name', 'salary'], [
        R(['陳志強', 95000], 'hit'), R(['王大明', 82000], 'hit'),
        R(['林美玲', 72000], 'hit'), R(['李小華', 48000], 'miss')])],
      out: T('Top 3', ['emp_name', 'salary'], [
        R(['陳志強', 95000], 'hit'), R(['王大明', 82000], 'hit'), R(['林美玲', 72000], 'hit')]) },
    { note: '分頁：offset 3 rows fetch next 3 —— 先跳過 3 筆，再取 3 筆，就是第 2 頁。',
      tables: [T('order by salary desc', ['#', 'emp_name'], [
        R([1, '陳志強'], 'miss'), R([2, '王大明'], 'miss'), R([3, '林美玲'], 'miss'),
        R([4, '李小華'], 'hit')])],
      out: T('第 2 頁', ['emp_name'], [R(['李小華'], 'hit')]) },
    { note: '舊寫法 ROWNUM 是「取出來才編號」，直接寫 where rownum<=3 會先編號再排序，答案是錯的 —— 一定要包一層子查詢。',
      tables: [T('ROWNUM 的順序', ['寫法', '結果'], [
        R(['where rownum<=3 order by …', '先取 3 筆才排 → 錯'], 'miss'),
        R(['from (… order by …) where rownum<=3', '排完才取 → 對'], 'hit')])] },
  ],

  'order-null': [
    { note: 'commission_pct 有幾個 NULL，來看它們會排到哪。',
      tables: [T('employees', ['emp_name', 'commission_pct'], [
        R(['王大明', 0.15]), R(['林美玲', null]),
        R(['黃淑芬', 0.05]), R(['張家豪', null])])] },
    { note: 'ASC（預設）：Oracle 把 NULL 當成「最大」，所以排在最後面。',
      tables: [T('order by commission_pct', ['emp_name', 'commission_pct'], [
        R(['黃淑芬', 0.05]), R(['王大明', 0.15]),
        R(['林美玲', null], 'null'), R(['張家豪', null], 'null')])] },
    { note: 'DESC：順序整個反過來，NULL 就跑到最前面。',
      tables: [T('order by commission_pct desc', ['emp_name', 'commission_pct'], [
        R(['林美玲', null], 'null'), R(['張家豪', null], 'null'),
        R(['王大明', 0.15]), R(['黃淑芬', 0.05])])] },
    { note: '不想照預設就自己指定：nulls first / nulls last，跟 ASC、DESC 無關。',
      tables: [T('order by commission_pct nulls first', ['emp_name', 'commission_pct'], [
        R(['林美玲', null], 'hit'), R(['張家豪', null], 'hit'),
        R(['黃淑芬', 0.05]), R(['王大明', 0.15])])] },
  ],

  // ── 子查詢 ──────────────────────────────────────────────────

  exists: [
    { note: 'EXISTS 只問一件事：子查詢「有沒有撈到資料」，內容完全不看。',
      tables: [
        T('employees', ['emp_id', 'emp_name'], [
          R([1004, '林美玲']), R([1009, '蔡明軒'])]),
        T('emp_projects', ['emp_id', 'proj_id'], [
          R([1004, 9001]), R([1004, 9004])])] },
    { note: '外層拿 1004 進去問：emp_projects 裡有 emp_id=1004 的列嗎？有 → 成立。',
      tables: [
        T('employees', ['emp_id', 'emp_name'], [
          R([1004, '林美玲'], 'hit'), R([1009, '蔡明軒'])]),
        T('emp_projects', ['emp_id', 'proj_id'], [
          R([1004, 9001], 'hit'), R([1004, 9004], 'hit')])], op: 'EXISTS?',
      out: T('結果', ['emp_name'], [R(['林美玲'], 'hit')]) },
    { note: '換 1009 進去問：一列都沒有 → 不成立，這一列被排除。',
      tables: [
        T('employees', ['emp_id', 'emp_name'], [
          R([1004, '林美玲']), R([1009, '蔡明軒'], 'miss')]),
        T('emp_projects', ['emp_id', 'proj_id'], [
          R([1004, 9001]), R([1004, 9004])])], op: 'EXISTS?',
      out: T('結果', ['emp_name'], [R(['林美玲'])]) },
    { note: 'NOT EXISTS 就是反過來：專案 9006 沒有任何成員 → 被挑出來。這寫法不怕 NULL，跟 NOT IN 的差別就在這。',
      tables: [
        T('projects', ['proj_id', 'proj_name'], [
          R([9001, 'CRM 系統升級'], 'miss'), R([9006, '行動 App 2.0'], 'hit')]),
        T('emp_projects', ['emp_id', 'proj_id'], [R([1004, 9001])])], op: 'NOT EXISTS',
      out: T('結果', ['proj_name'], [R(['行動 App 2.0'], 'hit')]) },
  ],

  'in-notin': [
    { note: 'IN：子查詢先算出一組值，外層再一個一個去比對。',
      tables: [
        T('employees', ['emp_name', 'dept_id'], [
          R(['李小華', 10]), R(['林美玲', 20]), R(['黃淑芬', 30])]),
        T('子查詢：台北的部門', ['dept_id'], [R([10]), R([30])])], op: 'IN' },
    { note: 'dept_id 落在 (10, 30) 裡面的就留下，20 不在裡面 → 出局。',
      tables: [
        T('employees', ['emp_name', 'dept_id'], [
          R(['李小華', 10], 'hit'), R(['林美玲', 20], 'miss'), R(['黃淑芬', 30], 'hit')]),
        T('子查詢：台北的部門', ['dept_id'], [R([10], 'hit'), R([30], 'hit')])], op: 'IN',
      out: T('結果', ['emp_name'], [R(['李小華'], 'hit'), R(['黃淑芬'], 'hit')]) },
    { note: 'NOT IN 的大陷阱：子查詢冒出一個 NULL。projects.dept_id 就有 NULL。',
      tables: [
        T('employees', ['emp_name', 'dept_id'], [
          R(['李小華', 10]), R(['林美玲', 20])]),
        T('子查詢：projects.dept_id', ['dept_id'], [
          R([10]), R([20]), R([null], 'null')])], op: 'NOT IN' },
    { note: '10 <> NULL 的結果不是 true 也不是 false，是 UNKNOWN → 整個條件永遠不成立，回傳空集合。',
      tables: [
        T('employees', ['emp_name', 'dept_id'], [
          R(['李小華', 10], 'miss'), R(['林美玲', 20], 'miss')]),
        T('子查詢：projects.dept_id', ['dept_id'], [
          R([10]), R([20]), R([null], 'null')])], op: 'NOT IN',
      out: T('結果', ['emp_name'], []) },
    { note: '解法：子查詢裡先把 NULL 濾掉（… where dept_id is not null），或改用 NOT EXISTS。',
      tables: [
        T('employees', ['emp_name', 'dept_id'], [
          R(['李小華', 10], 'miss'), R(['林美玲', 20], 'miss'), R(['蔡明軒', 30], 'hit')]),
        T('加上 is not null', ['dept_id'], [R([10]), R([20])])], op: 'NOT IN',
      out: T('結果', ['emp_name'], [R(['蔡明軒'], 'hit')]) },
  ],

  // ── 運算式 ──────────────────────────────────────────────────

  'case-when': [
    { note: 'CASE WHEN 由上往下判斷，第一個成立的就勝出，後面的不再看。',
      tables: [T('employees', ['emp_name', 'salary'], [
        R(['陳志強', 95000]), R(['林美玲', 72000]), R(['李小華', 48000])])] },
    { note: '陳志強 95000：第一個 when（>= 80000）就成立 → 高。',
      tables: [T('employees', ['emp_name', 'salary'], [
        R(['陳志強', 95000], 'hit'), R(['林美玲', 72000]), R(['李小華', 48000])])],
      out: T('結果', ['emp_name', 'level'], [R(['陳志強', '高'], 'hit')]) },
    { note: '林美玲 72000：第一個不成立，第二個（>= 60000）成立 → 中。',
      tables: [T('employees', ['emp_name', 'salary'], [
        R(['陳志強', 95000]), R(['林美玲', 72000], 'hit'), R(['李小華', 48000])])],
      out: T('結果', ['emp_name', 'level'], [
        R(['陳志強', '高']), R(['林美玲', '中'], 'hit')]) },
    { note: '李小華 48000：都不成立 → 落到 else。沒寫 else 的話會是 NULL。',
      tables: [T('employees', ['emp_name', 'salary'], [
        R(['陳志強', 95000]), R(['林美玲', 72000]), R(['李小華', 48000], 'hit')])],
      out: T('結果', ['emp_name', 'level'], [
        R(['陳志強', '高']), R(['林美玲', '中']), R(['李小華', '低'], 'hit')]) },
    { note: '把 CASE 包進 SUM 就是行轉欄（PIVOT）：符合條件算 1、不符合算 0，再加總。',
      tables: [T('sum(case when job=… then 1 else 0 end)', ['dept_id', 'DEV 人數', 'QA 人數'], [
        R([20, 2, 1], 'hit')])] },
  ],

  nvl: [
    { note: 'commission_pct 有 NULL，直接拿去算會整個變成 NULL。',
      tables: [T('employees', ['emp_name', 'salary', 'commission_pct'], [
        R(['王大明', 82000, 0.15]), R(['林美玲', 72000, null], 'null')])] },
    { note: 'salary * (1 + commission_pct)：林美玲那列的答案是 NULL，不是 72000。',
      tables: [T('employees', ['emp_name', 'salary', 'commission_pct'], [
        R(['王大明', 82000, 0.15]), R(['林美玲', 72000, null], 'null')])],
      out: T('沒用 NVL', ['emp_name', 'total_pay'], [
        R(['王大明', 94300]), R(['林美玲', null], 'null')]) },
    { note: 'NVL(commission_pct, 0)：是 NULL 就換成 0，不是 NULL 就原封不動。',
      tables: [T('employees', ['emp_name', 'commission_pct', 'nvl(…, 0)'], [
        R(['王大明', 0.15, 0.15]), R(['林美玲', null, 0], 'hit')])],
      out: T('用了 NVL', ['emp_name', 'total_pay'], [
        R(['王大明', 94300]), R(['林美玲', 72000], 'hit')]) },
    { note: 'NVL2(a, b, c) 是三個參數：a 不是 NULL 給 b、是 NULL 給 c。常拿來做「有沒有填」的標記。',
      tables: [T("nvl2(email, '已填寫', '未填寫')", ['emp_name', 'email', '結果'], [
        R(['李小華', 'hua@…', '已填寫'], 'hit'),
        R(['張家豪', null, '未填寫'], 'null')])] },
  ],

  coalesce: [
    { note: 'COALESCE 從左往右找，回傳第一個「不是 NULL」的值。參數想放幾個都行。',
      tables: [T('資料', ['emp_name', 'email', 'phone'], [
        R(['李小華', 'hua@…', '0912…']),
        R(['張家豪', null, '0955…'], 'null'),
        R(['蔡明軒', null, null], 'null')])] },
    { note: '李小華的 email 不是 NULL → 第一個就中，後面的 phone 根本不看。',
      tables: [T('資料', ['emp_name', 'email', 'phone'], [
        R(['李小華', 'hua@…', '0912…'], 'hit'), R(['張家豪', null, '0955…']),
        R(['蔡明軒', null, null])])],
      out: T('coalesce(email, phone, …)', ['contact'], [R(['hua@…'], 'hit')]) },
    { note: '張家豪 email 是 NULL → 往右看 phone，有值就用它。蔡明軒兩個都 NULL → 用最後的預設字串。',
      tables: [T('資料', ['emp_name', 'email', 'phone'], [
        R(['李小華', 'hua@…', '0912…']), R(['張家豪', null, '0955…'], 'hit'),
        R(['蔡明軒', null, null], 'hit')])],
      out: T('coalesce(email, phone, …)', ['contact'], [
        R(['hua@…']), R(['0955…'], 'hit'), R(['（未提供）'], 'hit')]) },
    { note: 'NULLIF(a, b) 相反：兩個值相等時回 NULL。最常拿來擋除以零 —— 分母變 NULL，整個算式回 NULL 而不是報錯。',
      tables: [T('total / nullif(head_count, 0)', ['total', 'head_count', 'nullif', '結果'], [
        R([1000, 5, 5, 200], 'hit'),
        R([1000, 0, null, null], 'null')])] },
  ],

  // ── 彙總 ────────────────────────────────────────────────────

  aggregate: [
    { note: '關鍵差別在 NULL。這批資料的 commission_pct 有兩個 NULL。',
      tables: [T('employees', ['emp_name', 'salary', 'commission_pct'], [
        R(['王大明', 82000, 0.15]), R(['林美玲', 72000, null], 'null'),
        R(['張家豪', 68000, null], 'null'), R(['黃淑芬', 55000, 0.05])])] },
    { note: 'COUNT(*) 算的是「列數」，不管內容有沒有 NULL → 4。',
      tables: [T('employees', ['emp_name', 'commission_pct'], [
        R(['王大明', 0.15], 'hit'), R(['林美玲', null], 'hit'),
        R(['張家豪', null], 'hit'), R(['黃淑芬', 0.05], 'hit')])],
      out: T('結果', ['count(*)'], [R([4], 'hit')]) },
    { note: 'COUNT(commission_pct) 只算「這欄有值」的列，NULL 直接跳過 → 2。',
      tables: [T('employees', ['emp_name', 'commission_pct'], [
        R(['王大明', 0.15], 'hit'), R(['林美玲', null], 'miss'),
        R(['張家豪', null], 'miss'), R(['黃淑芬', 0.05], 'hit')])],
      out: T('結果', ['count(commission_pct)'], [R([2], 'hit')]) },
    { note: 'SUM / AVG 也一樣跳過 NULL。所以 AVG 的分母是「有值的列數」，不是總列數 —— 想把 NULL 當 0 算就要先 NVL。',
      tables: [T('avg(commission_pct)', ['算式', '值'], [
        R(['(0.15 + 0.05) / 2', 0.10], 'hit'),
        R(['不是 / 4', ''], 'miss')])] },
  ],

  'group-having': [
    { note: '目標：算每個部門有幾個人，而且只看薪水 > 30000 的人、只留人數 ≥ 2 的部門。',
      tables: [T('employees', ['emp_name', 'dept_id', 'salary'], [
        R(['李小華', 10, 48000]), R(['許文龍', 10, 45000]),
        R(['林美玲', 20, 72000]), R(['蔡明軒', 20, 28000])])] },
    { note: '第一步 WHERE：在分組「之前」先把列篩掉。蔡明軒 28000 不合格，先出局。',
      tables: [T('where salary > 30000', ['emp_name', 'dept_id', 'salary'], [
        R(['李小華', 10, 48000], 'hit'), R(['許文龍', 10, 45000], 'hit'),
        R(['林美玲', 20, 72000], 'hit'), R(['蔡明軒', 20, 28000], 'miss')])] },
    { note: '第二步 GROUP BY：剩下的列按 dept_id 併成群組，每組算一個 count。',
      tables: [T('group by dept_id', ['dept_id', '成員', 'count(*)'], [
        R([10, '李小華、許文龍', 2], 'hit'),
        R([20, '林美玲', 1], 'hit')])] },
    { note: '第三步 HAVING：在分組「之後」篩群組。部門 20 只剩 1 人 → 整組被拿掉。',
      tables: [T('having count(*) >= 2', ['dept_id', 'count(*)'], [
        R([10, 2], 'hit'), R([20, 1], 'miss')])],
      out: T('結果', ['dept_id', 'cnt'], [R([10, 2], 'hit')]) },
    { note: '一句話記住：WHERE 篩「列」、HAVING 篩「群組」。所以 HAVING 裡可以寫 count(*)，WHERE 裡不行。',
      tables: [T('執行順序', ['階段', '作用對象'], [
        R(['WHERE', '原始的每一列'], 'hit'),
        R(['GROUP BY', '把列併成組'], ''),
        R(['HAVING', '併好的每一組'], 'hit')])] },
  ],

  listagg: [
    { note: 'LISTAGG 把「同一組的多列」壓成一個字串。先看原始資料。',
      tables: [T('employees', ['emp_id', 'emp_name', 'dept_id'], [
        R([1004, '林美玲', 20]), R([1005, '張家豪', 20]),
        R([1010, '鄭怡君', 20]), R([1002, '李小華', 10])])] },
    { note: 'group by dept_id 先分組：部門 20 有三個人、部門 10 有一個。',
      tables: [T('group by dept_id', ['dept_id', '這組的列'], [
        R([10, '李小華'], 'hit'), R([20, '林美玲 / 張家豪 / 鄭怡君'], 'hit')])] },
    { note: "LISTAGG(emp_name, '、') 把每組的名字用頓號串起來，一組變一列。",
      tables: [T('group by dept_id', ['dept_id', 'members'], [
        R([10, '李小華'], 'hit'),
        R([20, '林美玲、張家豪、鄭怡君'], 'hit')])] },
    { note: 'WITHIN GROUP (ORDER BY emp_id) 決定串起來的先後順序，這段不能省略。',
      tables: [T('換成 order by emp_id desc', ['dept_id', 'members'], [
        R([20, '鄭怡君、張家豪、林美玲'], 'hit')])] },
  ],

  // ── 集合運算 ────────────────────────────────────────────────

  minus: [
    { note: 'MINUS 取「在 A、但不在 B」。A 是全部員工，B 是有參與專案的員工。',
      tables: [
        T('A：employees', ['emp_id'], [R([1002]), R([1004]), R([1009])]),
        T('B：emp_projects', ['emp_id'], [R([1002]), R([1004])])], op: 'MINUS' },
    { note: '1002 在 B 裡面出現過 → 從結果中拿掉。',
      tables: [
        T('A：employees', ['emp_id'], [R([1002], 'miss'), R([1004]), R([1009])]),
        T('B：emp_projects', ['emp_id'], [R([1002], 'hit'), R([1004])])], op: 'MINUS' },
    { note: '1004 也在 B 裡面 → 一樣拿掉。',
      tables: [
        T('A：employees', ['emp_id'], [R([1002], 'miss'), R([1004], 'miss'), R([1009])]),
        T('B：emp_projects', ['emp_id'], [R([1002], 'hit'), R([1004], 'hit')])], op: 'MINUS' },
    { note: '1009 在 B 裡找不到 → 留下。這就是「沒有參與任何專案的員工」。',
      tables: [
        T('A：employees', ['emp_id'], [R([1002], 'miss'), R([1004], 'miss'), R([1009], 'hit')]),
        T('B：emp_projects', ['emp_id'], [R([1002]), R([1004])])], op: 'MINUS',
      out: T('結果', ['emp_id'], [R([1009], 'hit')]) },
    { note: '兩個規則：欄位數與型別要對齊；結果會自動去重（重複的只留一筆）。',
      tables: [T('注意', ['規則', '說明'], [
        R(['欄位要對齊', '數量、型別、順序都要一樣'], 'hit'),
        R(['自動去重', '跟 UNION 一樣會排序去重'], 'hit')])] },
  ],

  intersect: [
    { note: 'INTERSECT 取交集：兩邊都有的才留。A 是專案 9001 的成員，B 是 9004 的成員。',
      tables: [
        T('A：proj 9001', ['emp_id'], [R([1003]), R([1004]), R([1010])]),
        T('B：proj 9004', ['emp_id'], [R([1004]), R([1010])])], op: 'INTERSECT' },
    { note: '1003 只出現在 A → 不是交集，拿掉。',
      tables: [
        T('A：proj 9001', ['emp_id'], [R([1003], 'miss'), R([1004]), R([1010])]),
        T('B：proj 9004', ['emp_id'], [R([1004]), R([1010])])], op: 'INTERSECT' },
    { note: '1004 和 1010 兩邊都有 → 留下。這就是「同時參與兩個專案的人」。',
      tables: [
        T('A：proj 9001', ['emp_id'], [R([1003], 'miss'), R([1004], 'hit'), R([1010], 'hit')]),
        T('B：proj 9004', ['emp_id'], [R([1004], 'hit'), R([1010], 'hit')])], op: 'INTERSECT',
      out: T('結果', ['emp_id'], [R([1004], 'hit'), R([1010], 'hit')]) },
  ],

  union: [
    { note: 'UNION 與 UNION ALL 都是「上下接起來」，差別在要不要去重。',
      tables: [
        T('A', ['dept_id'], [R([10]), R([20])]),
        T('B', ['dept_id'], [R([20]), R([30])])], op: 'UNION' },
    { note: 'UNION ALL：直接接起來，什麼都不做 → 4 列，20 出現兩次。',
      tables: [
        T('A', ['dept_id'], [R([10], 'hit'), R([20], 'hit')]),
        T('B', ['dept_id'], [R([20], 'hit'), R([30], 'hit')])], op: 'UNION ALL',
      out: T('結果（4 列）', ['dept_id'], [R([10]), R([20]), R([20], 'hit'), R([30])]) },
    { note: 'UNION：接起來之後還會「排序 + 去重」，重複的 20 只留一筆 → 3 列。',
      tables: [
        T('A', ['dept_id'], [R([10], 'hit'), R([20], 'hit')]),
        T('B', ['dept_id'], [R([20], 'miss'), R([30], 'hit')])], op: 'UNION',
      out: T('結果（3 列）', ['dept_id'], [R([10]), R([20]), R([30])]) },
    { note: '去重要花成本。確定兩邊不會重複時就用 UNION ALL，資料量大時差很多。',
      tables: [T('怎麼選', ['情況', '用哪個'], [
        R(['確定不重複', 'UNION ALL（快）'], 'hit'),
        R(['可能重複、且不想要重複', 'UNION'], 'hit')])] },
  ],

  // ── DML ─────────────────────────────────────────────────────

  'join-update': [
    { note: '情境：salary_adjust 有新薪資，要把它寫回 employees。Oracle 不能寫 UPDATE … FROM。',
      tables: [
        T('employees', ['emp_id', 'salary'], [
          R([1002, 48000]), R([1004, 72000]), R([1009, 28000])]),
        T('salary_adjust', ['emp_id', 'new_salary'], [
          R([1002, 52000]), R([1004, 78000])])] },
    { note: '子查詢對 1002：在 salary_adjust 找到 52000 → 寫回去。',
      tables: [
        T('employees', ['emp_id', 'salary'], [
          R([1002, 48000], 'hit'), R([1004, 72000]), R([1009, 28000])]),
        T('salary_adjust', ['emp_id', 'new_salary'], [
          R([1002, 52000], 'hit'), R([1004, 78000])])], op: '→',
      out: T('更新後', ['emp_id', 'salary'], [
        R([1002, 52000], 'hit'), R([1004, 72000]), R([1009, 28000])]) },
    { note: '1004 同理，更新成 78000。',
      tables: [
        T('employees', ['emp_id', 'salary'], [
          R([1002, 52000]), R([1004, 72000], 'hit'), R([1009, 28000])]),
        T('salary_adjust', ['emp_id', 'new_salary'], [
          R([1002, 52000]), R([1004, 78000], 'hit')])], op: '→',
      out: T('更新後', ['emp_id', 'salary'], [
        R([1002, 52000]), R([1004, 78000], 'hit'), R([1009, 28000])]) },
    { note: '危險的地方：1009 在 salary_adjust 沒有對應，子查詢回傳 NULL —— 沒加 WHERE 的話，它的薪水會被洗成 NULL！',
      tables: [
        T('employees', ['emp_id', 'salary'], [
          R([1002, 52000]), R([1004, 78000]), R([1009, 28000], 'miss')]),
        T('salary_adjust', ['emp_id', 'new_salary'], [R([1002, 52000]), R([1004, 78000])])], op: '→ NULL',
      out: T('忘了加 WHERE', ['emp_id', 'salary'], [
        R([1002, 52000]), R([1004, 78000]), R([1009, null], 'null')]) },
    { note: '所以一定要補上 where exists (…)：沒對到的列根本不進入更新範圍，1009 維持原值。',
      tables: [
        T('employees', ['emp_id', 'salary'], [
          R([1002, 52000], 'hit'), R([1004, 78000], 'hit'), R([1009, 28000])]),
        T('where exists', ['emp_id'], [R([1002], 'hit'), R([1004], 'hit')])], op: '→',
      out: T('正確結果', ['emp_id', 'salary'], [
        R([1002, 52000]), R([1004, 78000]), R([1009, 28000], 'hit')]) },
  ],

  merge: [
    { note: 'MERGE 一句話做完「有就更新、沒有就新增」。目標表 emp_bonus，來源是算好的獎金。',
      tables: [
        T('目標 emp_bonus', ['emp_id', 'bonus_amt'], [
          R([1002, 1000]), R([1004, 2000])]),
        T('來源 s', ['emp_id', 'bonus_amt'], [
          R([1002, 4800]), R([1004, 7200]), R([1010, 5800])])], op: 'MERGE' },
    { note: 'ON (b.emp_id = s.emp_id) 逐列比對。1002 兩邊都有 → MATCHED。',
      tables: [
        T('目標 emp_bonus', ['emp_id', 'bonus_amt'], [
          R([1002, 1000], 'hit'), R([1004, 2000])]),
        T('來源 s', ['emp_id', 'bonus_amt'], [
          R([1002, 4800], 'hit'), R([1004, 7200]), R([1010, 5800])])], op: 'ON 相等',
      out: T('WHEN MATCHED → UPDATE', ['emp_id', 'bonus_amt'], [
        R([1002, 4800], 'hit'), R([1004, 2000])]) },
    { note: '1004 也對得上 → 一樣走 UPDATE，金額換成 7200。',
      tables: [
        T('目標 emp_bonus', ['emp_id', 'bonus_amt'], [
          R([1002, 4800]), R([1004, 2000], 'hit')]),
        T('來源 s', ['emp_id', 'bonus_amt'], [
          R([1002, 4800]), R([1004, 7200], 'hit'), R([1010, 5800])])], op: 'ON 相等',
      out: T('WHEN MATCHED → UPDATE', ['emp_id', 'bonus_amt'], [
        R([1002, 4800]), R([1004, 7200], 'hit')]) },
    { note: '1010 在目標表裡找不到 → NOT MATCHED，走 INSERT 新增一列。',
      tables: [
        T('目標 emp_bonus', ['emp_id', 'bonus_amt'], [R([1002, 4800]), R([1004, 7200])]),
        T('來源 s', ['emp_id', 'bonus_amt'], [
          R([1002, 4800]), R([1004, 7200]), R([1010, 5800], 'hit')])], op: 'ON 找不到',
      out: T('WHEN NOT MATCHED → INSERT', ['emp_id', 'bonus_amt'], [
        R([1002, 4800]), R([1004, 7200]), R([1010, 5800], 'hit')]) },
    { note: '一趟掃完，兩列被更新、一列被新增。這就是 Oracle 標準的 UPSERT 寫法。',
      tables: [T('最終 emp_bonus', ['emp_id', 'bonus_amt', '動作'], [
        R([1002, 4800, 'UPDATE'], 'hit'),
        R([1004, 7200, 'UPDATE'], 'hit'),
        R([1010, 5800, 'INSERT'], 'hit')])] },
  ],

  'insert-delete': [
    { note: 'INSERT … VALUES：直接指定欄位與值，一次新增一列。',
      tables: [T('emp_bonus', ['emp_id', 'bonus_amt', 'grade'], [
        R([1002, 4800, 'B']), R([1004, 7200, 'A'])])] },
    { note: '新增 (1010, 3000, \'C\') → 表尾多一列。',
      tables: [T('emp_bonus', ['emp_id', 'bonus_amt', 'grade'], [
        R([1002, 4800, 'B']), R([1004, 7200, 'A']), R([1010, 3000, 'C'], 'hit')])] },
    { note: 'INSERT … SELECT：不給固定值，而是把一整段查詢的結果批次灌進去，有幾列就新增幾列。',
      tables: [
        T('select 的結果', ['emp_id', 'bonus_amt'], [
          R([1005, 6800], 'hit'), R([1011, 4500], 'hit')])], op: '↓ INSERT',
      out: T('emp_bonus', ['emp_id', 'bonus_amt'], [
        R([1002, 4800]), R([1004, 7200]), R([1010, 3000]),
        R([1005, 6800], 'hit'), R([1011, 4500], 'hit')]) },
    { note: 'DELETE 一定要先想好 WHERE。這裡刪掉「在 employees 對不到」的孤兒列。',
      tables: [
        T('salary_adjust', ['emp_id'], [R([1002]), R([1004]), R([9999], 'miss')]),
        T('employees', ['emp_id'], [R([1002], 'hit'), R([1004], 'hit')])], op: 'NOT EXISTS',
      out: T('刪除後', ['emp_id'], [R([1002]), R([1004])]) },
    { note: '沒寫 WHERE 的 DELETE 會清空整張表 —— 下手前先用同樣的條件跑一次 SELECT 確認。',
      tables: [T('好習慣', ['步驟', '做什麼'], [
        R(['1', 'select * from … where 條件'], 'hit'),
        R(['2', '確認筆數對了'], 'hit'),
        R(['3', '才換成 delete'], 'hit')])] },
  ],

  // ── 分析函數 ────────────────────────────────────────────────

  'row-number': [
    { note: '目標：每個部門薪水最高的那一位。原始資料先按部門、薪水看一下。',
      tables: [T('employees', ['emp_name', 'dept_id', 'salary'], [
        R(['李小華', 10, 48000]), R(['許文龍', 10, 45000]),
        R(['陳志強', 20, 95000]), R(['林美玲', 20, 72000])])] },
    { note: 'PARTITION BY dept_id 先把資料切成「一個部門一疊」，各疊互不影響。',
      tables: [T('切成兩疊', ['dept_id', '這疊的成員'], [
        R([10, '李小華 48000 / 許文龍 45000'], 'hit'),
        R([20, '陳志強 95000 / 林美玲 72000'], 'hit')])] },
    { note: 'ORDER BY salary desc 在每一疊裡各自排序，然後從 1 開始編號 —— 每疊都重新從 1 編。',
      tables: [T('row_number() over (…)', ['emp_name', 'dept_id', 'salary', 'rn'], [
        R(['李小華', 10, 48000, 1], 'hit'), R(['許文龍', 10, 45000, 2]),
        R(['陳志強', 20, 95000, 1], 'hit'), R(['林美玲', 20, 72000, 2])])] },
    { note: '最後包一層子查詢篩 rn = 1，就拿到每個部門的第一名。',
      tables: [T('編號後的結果', ['emp_name', 'dept_id', 'rn'], [
        R(['李小華', 10, 1], 'hit'), R(['許文龍', 10, 2], 'miss'),
        R(['陳志強', 20, 1], 'hit'), R(['林美玲', 20, 2], 'miss')])],
      out: T('where rn = 1', ['emp_name', 'dept_id'], [
        R(['李小華', 10], 'hit'), R(['陳志強', 20], 'hit')]) },
    { note: '為什麼一定要包一層？因為 WHERE 比視窗函數「先執行」，那時 rn 還不存在，直接寫 where rn = 1 會報錯。',
      tables: [T('執行順序', ['階段', '狀況'], [
        R(['WHERE 先跑', '這時還沒有 rn'], 'miss'),
        R(['視窗函數才算 rn', '算完才有'], ''),
        R(['外面再包一層 select', '這樣才篩得到'], 'hit')])] },
  ],

  rank: [
    { note: '三個函數都在排名，差別只在「並列之後怎麼接下去」。這裡故意讓兩個人薪水一樣。',
      tables: [T('employees', ['emp_name', 'salary'], [
        R(['陳志強', 95000]), R(['王大明', 82000]),
        R(['楊宗翰', 82000]), R(['林美玲', 72000])])] },
    { note: 'RANK：並列的拿同一個名次，但會「消耗名額」→ 82000 兩個都是 2，下一個直接跳到 4。',
      tables: [T('rank()', ['emp_name', 'salary', 'rk'], [
        R(['陳志強', 95000, 1]), R(['王大明', 82000, 2], 'hit'),
        R(['楊宗翰', 82000, 2], 'hit'), R(['林美玲', 72000, 4], 'hit')])] },
    { note: 'DENSE_RANK：一樣並列第 2，但不跳號 → 下一個是 3。名次是連續的。',
      tables: [T('dense_rank()', ['emp_name', 'salary', 'drk'], [
        R(['陳志強', 95000, 1]), R(['王大明', 82000, 2], 'hit'),
        R(['楊宗翰', 82000, 2], 'hit'), R(['林美玲', 72000, 3], 'hit')])] },
    { note: 'ROW_NUMBER：完全不管並列，硬給流水號 —— 一定不重複，但誰拿 2 誰拿 3 不保證。',
      tables: [T('row_number()', ['emp_name', 'salary', 'rn'], [
        R(['陳志強', 95000, 1]), R(['王大明', 82000, 2], 'hit'),
        R(['楊宗翰', 82000, 3], 'hit'), R(['林美玲', 72000, 4])])] },
    { note: '三者對照。要「真正的名次」用 RANK / DENSE_RANK，要「不重複的編號」用 ROW_NUMBER。',
      tables: [T('82000 兩人並列時', ['函數', '名次序列'], [
        R(['rank', '1, 2, 2, 4'], 'hit'),
        R(['dense_rank', '1, 2, 2, 3'], 'hit'),
        R(['row_number', '1, 2, 3, 4'], 'hit')])] },
  ],

  'window-agg': [
    { note: '一般的 GROUP BY 會把資料「併掉」：4 列進去、2 列出來，原本的姓名就看不到了。',
      tables: [T('employees', ['emp_name', 'dept_id', 'salary'], [
        R(['李小華', 10, 48000]), R(['許文龍', 10, 45000]),
        R(['陳志強', 20, 95000]), R(['林美玲', 20, 72000])])],
      out: T('group by dept_id（列數變少）', ['dept_id', 'avg'], [
        R([10, 46500], 'miss'), R([20, 83500], 'miss')]) },
    { note: 'AVG 後面接 OVER 就不一樣：列數完全不變，每一列自己帶著「那一組的平均」。',
      tables: [T('avg(salary) over (partition by dept_id)',
        ['emp_name', 'dept_id', 'salary', 'dept_avg'], [
        R(['李小華', 10, 48000, 46500], 'hit'), R(['許文龍', 10, 45000, 46500], 'hit'),
        R(['陳志強', 20, 95000, 83500], 'hit'), R(['林美玲', 20, 72000, 83500], 'hit')])] },
    { note: '好處是可以直接在同一列比較「我 vs 我部門平均」，不用再 JOIN 回去。',
      tables: [T('salary > dept_avg ?', ['emp_name', 'salary', 'dept_avg', '高於平均'], [
        R(['李小華', 48000, 46500, '是'], 'hit'),
        R(['許文龍', 45000, 46500, '否'], 'miss'),
        R(['陳志強', 95000, 83500, '是'], 'hit')])] },
    { note: '加上 ORDER BY 就變「累計」：算到目前這一列為止的總和。',
      tables: [T('sum(salary) over (order by emp_id …)', ['emp_id', 'salary', 'running'], [
        R([1002, 48000, 48000], 'hit'),
        R([1004, 72000, 120000], 'hit'),
        R([1011, 45000, 165000], 'hit')])] },
    { note: 'OVER () 整個留空 = 「全部資料當一組」，最常拿來算佔比。',
      tables: [T('salary * 100 / sum(salary) over ()', ['emp_name', 'salary', 'pct'], [
        R(['李小華', 48000, '29.1%'], 'hit'),
        R(['林美玲', 72000, '43.6%'], 'hit'),
        R(['許文龍', 45000, '27.3%'], 'hit')])] },
  ],

  'lag-lead': [
    { note: '想算「每個人跟前一個進公司的人差幾天」。先按 hire_date 排好。',
      tables: [T('order by hire_date', ['emp_name', 'hire_date'], [
        R(['陳志強', '2013-01-20']), R(['王大明', '2015-03-01']),
        R(['吳建宏', '2016-11-05'])])] },
    { note: 'LAG 往上看一列。第一列的上面沒東西 → NULL。',
      tables: [T('lag(hire_date) over (order by hire_date)',
        ['emp_name', 'hire_date', 'prev_hire'], [
        R(['陳志強', '2013-01-20', null], 'null'),
        R(['王大明', '2015-03-01', '2013-01-20'], 'hit'),
        R(['吳建宏', '2016-11-05', '2015-03-01'], 'hit')])] },
    { note: 'LEAD 相反，往下看一列。最後一列的下面沒東西 → NULL。',
      tables: [T('lead(hire_date) over (order by hire_date)',
        ['emp_name', 'hire_date', 'next_hire'], [
        R(['陳志強', '2013-01-20', '2015-03-01'], 'hit'),
        R(['王大明', '2015-03-01', '2016-11-05'], 'hit'),
        R(['吳建宏', '2016-11-05', null], 'null')])] },
    { note: '拿到前一列的值就能直接相減算差額 —— 不用自我連接，快得多。',
      tables: [T('hire_date 減掉 prev_hire', ['emp_name', '距上一位'], [
        R(['陳志強', null], 'null'), R(['王大明', '約 770 天'], 'hit'),
        R(['吳建宏', '約 615 天'], 'hit')])] },
    { note: '第二、三個參數：往前幾列、以及沒有值時拿什麼替代。lag(salary, 1, 0) 就不會出現 NULL。',
      tables: [T('lag(salary, 1, 0)', ['emp_name', 'salary', 'prev'], [
        R(['陳志強', 95000, 0], 'hit'), R(['王大明', 82000, 95000], 'hit')])] },
  ],

  'ntile-firstlast': [
    { note: 'NTILE(n) 把排好序的資料「平均切成 n 份」。這裡 4 個人切 4 組，剛好一人一組。',
      tables: [T('order by salary', ['emp_name', 'salary'], [
        R(['李小華', 48000]), R(['林美玲', 72000]),
        R(['王大明', 82000]), R(['陳志強', 95000])])] },
    { note: 'ntile(4)：1 是最低的那一組，數字越大越高。常拿來分四分位。',
      tables: [T('ntile(4) over (order by salary)', ['emp_name', 'salary', 'quartile'], [
        R(['李小華', 48000, 1], 'hit'), R(['林美玲', 72000, 2], 'hit'),
        R(['王大明', 82000, 3], 'hit'), R(['陳志強', 95000, 4], 'hit')])] },
    { note: 'FIRST_VALUE 抓「視窗裡第一列」的值。按薪水 desc 排，第一列就是該組最高薪的人。',
      tables: [T('first_value(emp_name) over (partition by dept_id order by salary desc)',
        ['emp_name', 'dept_id', 'top_earner'], [
        R(['陳志強', 20, '陳志強'], 'hit'),
        R(['林美玲', 20, '陳志強'], 'hit'),
        R(['李小華', 10, '李小華'], 'hit')])] },
    { note: 'LAST_VALUE 有個坑：預設視窗只看到「目前這一列為止」，所以它抓到的就是自己。',
      tables: [T('last_value 不加範圍', ['emp_name', 'salary', 'last_value'], [
        R(['陳志強', 95000, '陳志強'], 'miss'),
        R(['林美玲', 72000, '林美玲'], 'miss')])] },
    { note: '要自己把範圍開到底：rows between unbounded preceding and unbounded following。',
      tables: [T('last_value 開滿範圍', ['emp_name', 'salary', 'last_value'], [
        R(['陳志強', 95000, '林美玲'], 'hit'),
        R(['林美玲', 72000, '林美玲'], 'hit')])] },
  ],

  // ── 進階查詢 ────────────────────────────────────────────────

  'with-cte': [
    { note: '目標：找出「薪水高於自己部門平均」的人。先看原始資料。',
      tables: [T('employees', ['emp_name', 'dept_id', 'salary'], [
        R(['陳志強', 20, 95000]), R(['林美玲', 20, 72000]),
        R(['李小華', 10, 48000]), R(['許文龍', 10, 45000])])] },
    { note: 'WITH dept_avg as (…)：先把「每個部門的平均」算好，取個名字放在最前面。',
      tables: [T('dept_avg（CTE）', ['dept_id', 'avg_sal'], [
        R([10, 46500], 'hit'), R([20, 83500], 'hit')])] },
    { note: '後面就能把它當成一張普通的表來 JOIN，完全不用管它是怎麼算出來的。',
      tables: [
        T('employees', ['emp_name', 'dept_id', 'salary'], [
          R(['陳志強', 20, 95000]), R(['林美玲', 20, 72000]),
          R(['李小華', 10, 48000]), R(['許文龍', 10, 45000])]),
        T('dept_avg', ['dept_id', 'avg_sal'], [R([10, 46500]), R([20, 83500])])],
      op: 'JOIN' },
    { note: '最後比大小：陳志強 95000 > 83500、李小華 48000 > 46500 → 留下。',
      tables: [T('e.salary > d.avg_sal', ['emp_name', 'salary', 'avg_sal'], [
        R(['陳志強', 95000, 83500], 'hit'), R(['林美玲', 72000, 83500], 'miss'),
        R(['李小華', 48000, 46500], 'hit'), R(['許文龍', 45000, 46500], 'miss')])],
      out: T('結果', ['emp_name', 'salary'], [
        R(['陳志強', 95000], 'hit'), R(['李小華', 48000], 'hit')]) },
    { note: '可以一次定義好幾個 CTE（逗號隔開），而且後面的能引用前面的 —— 長查詢就能拆成一步一步讀。',
      tables: [T('多個 CTE', ['寫法', '說明'], [
        R(['with a as (…)', '第一段'], 'hit'),
        R([', b as (select * from a …)', 'b 可以用 a'], 'hit'),
        R(['select * from b', '主查詢'], 'hit')])] },
  ],

  hierarchy: [
    { note: 'employees 的 manager_id 指向自己的主管，這其實是一棵樹。要把它展開。',
      tables: [T('employees', ['emp_id', 'emp_name', 'manager_id'], [
        R([1003, '陳志強', null]), R([1004, '林美玲', 1003]),
        R([1005, '張家豪', 1003]), R([1009, '蔡明軒', 1003])])] },
    { note: 'START WITH manager_id is null：先找起點。陳志強沒有主管 → 他是第 1 層。',
      tables: [T('LEVEL 1', ['level', 'emp_name', 'manager_id'], [
        R([1, '陳志強', null], 'hit')])] },
    { note: 'CONNECT BY PRIOR emp_id = manager_id：「上一層的 emp_id」等於「這一層的 manager_id」的，就是它的下屬。',
      tables: [
        T('上一層（PRIOR）', ['emp_id', 'emp_name'], [R([1003, '陳志強'], 'hit')]),
        T('找 manager_id = 1003', ['emp_id', 'emp_name'], [
          R([1004, '林美玲'], 'hit'), R([1005, '張家豪'], 'hit'),
          R([1009, '蔡明軒'], 'hit')])], op: 'PRIOR =',
      out: T('LEVEL 2', ['level', 'emp_name'], [
        R([2, '林美玲'], 'hit'), R([2, '張家豪'], 'hit'), R([2, '蔡明軒'], 'hit')]) },
    { note: '再往下找有沒有人的主管是 1004 / 1005 / 1009 —— 沒有了，展開結束。LEVEL 就是層數。',
      tables: [T('展開完成', ['level', 'emp_name'], [
        R([1, '陳志強'], 'hit'), R([2, '林美玲']), R([2, '張家豪']), R([2, '蔡明軒'])])] },
    { note: 'SYS_CONNECT_BY_PATH 會把一路走下來的名字串成路徑，一眼看出階層。',
      tables: [T('sys_connect_by_path(emp_name, 斜線)', ['level', 'path'], [
        R([1, '/陳志強'], 'hit'),
        R([2, '/陳志強/林美玲'], 'hit'),
        R([2, '/陳志強/張家豪'], 'hit')])] },
  ],

  'inline-view': [
    { note: '子查詢放的位置不同，身分就不同。先看放在 FROM 裡的「內嵌視圖」。',
      tables: [T('employees', ['emp_name', 'dept_id'], [
        R(['陳志強', 20]), R(['林美玲', 20]), R(['張家豪', 20]), R(['李小華', 10])])] },
    { note: 'FROM ( select dept_id, count(*) … )：括號裡先算出一張「暫時的表」。',
      tables: [T('內嵌視圖的內容', ['dept_id', 'cnt'], [
        R([10, 1], 'hit'), R([20, 3], 'hit')])] },
    { note: '外層就能直接對這張暫時的表下條件。用來「對聚合結果再篩選」最常見。',
      tables: [T('where cnt >= 3', ['dept_id', 'cnt'], [
        R([10, 1], 'miss'), R([20, 3], 'hit')])],
      out: T('結果', ['dept_id', 'cnt'], [R([20, 3], 'hit')]) },
    { note: '換個位置：子查詢放在 SELECT 裡就是「純量子查詢」，它必須只回傳一列一欄。',
      tables: [
        T('employees', ['emp_name', 'dept_id'], [
          R(['林美玲', 20], 'hit'), R(['李小華', 10], 'hit')]),
        T('(select dept_name … where d.dept_id = e.dept_id)', ['dept_id', 'dept_name'], [
          R([10, '業務部'], 'hit'), R([20, '研發部'], 'hit')])], op: '一列一欄',
      out: T('結果', ['emp_name', 'dept_name'], [
        R(['林美玲', '研發部'], 'hit'), R(['李小華', '業務部'], 'hit')]) },
    { note: '純量子查詢回傳兩列以上會直接報錯（ORA-01427），這是最常見的踩雷點。',
      tables: [T('純量子查詢的規矩', ['回傳', '結果'], [
        R(['剛好一列一欄', '正常'], 'hit'),
        R(['兩列以上', '報錯'], 'miss'),
        R(['零列', '給 NULL'], 'null')])] },
  ],

  correlated: [
    { note: '關聯子查詢的特徵：子查詢裡面「引用到外層的欄位」。差這一點，行為完全不同。',
      tables: [T('employees', ['emp_name', 'dept_id', 'salary'], [
        R(['陳志強', 20, 95000]), R(['林美玲', 20, 72000]), R(['李小華', 10, 48000])])] },
    { note: '外層先拿第一列（陳志強，dept_id = 20）。子查詢用這個 20 去算「部門 20 的平均」= 83500。',
      tables: [
        T('外層目前這一列', ['emp_name', 'dept_id', 'salary'], [
          R(['陳志強', 20, 95000], 'hit')]),
        T('子查詢：avg where x.dept_id = 20', ['avg'], [R([83500], 'hit')])],
      op: '帶入 e.dept_id',
      out: T('95000 > 83500 → 留下', ['emp_name'], [R(['陳志強'], 'hit')]) },
    { note: '再換第二列（林美玲，同樣 dept_id = 20）。子查詢「重算一次」，還是 83500。',
      tables: [
        T('外層目前這一列', ['emp_name', 'dept_id', 'salary'], [
          R(['林美玲', 20, 72000], 'hit')]),
        T('子查詢：重算', ['avg'], [R([83500], 'hit')])], op: '帶入 e.dept_id',
      out: T('72000 > 83500 → 出局', ['emp_name'], [R(['林美玲'], 'miss')]) },
    { note: '第三列（李小華，dept_id = 10）。這次帶進去的是 10，子查詢算出不同的答案 46500。',
      tables: [
        T('外層目前這一列', ['emp_name', 'dept_id', 'salary'], [
          R(['李小華', 10, 48000], 'hit')]),
        T('子查詢：avg where x.dept_id = 10', ['avg'], [R([46500], 'hit')])],
      op: '帶入 e.dept_id',
      out: T('48000 > 46500 → 留下', ['emp_name'], [R(['李小華'], 'hit')]) },
    { note: '重點：外層每跑一列，裡面就重算一次。所以它比不關聯的子查詢慢，但能做到「跟自己那一組比」。',
      tables: [T('兩種子查詢', ['類型', '執行次數'], [
        R(['不關聯（獨立）', '只算一次'], 'hit'),
        R(['關聯（引用外層）', '每列各算一次'], 'hit')])] },
  ],

  'any-all': [
    { note: 'ANY / ALL 是拿「一個值」去跟子查詢回傳的「一整組值」比較。子查詢先算出這組值。',
      tables: [
        T('employees', ['emp_name', 'salary'], [
          R(['陳志強', 95000]), R(['王大明', 82000]), R(['林美玲', 72000])]),
        T('子查詢：部門 10 的薪水', ['salary'], [R([82000]), R([48000]), R([45000])])] },
    { note: '> ALL 要「比組裡每一個都大」。陳志強 95000 比 82000 / 48000 / 45000 都大 → 成立。',
      tables: [
        T('目前這一列', ['emp_name', 'salary'], [R(['陳志強', 95000], 'hit')]),
        T('全部都要比它小', ['salary'], [
          R([82000], 'hit'), R([48000], 'hit'), R([45000], 'hit')])], op: '> ALL',
      out: T('結果', ['emp_name'], [R(['陳志強'], 'hit')]) },
    { note: '林美玲 72000 比 82000 小 → 只要有一個不成立，ALL 就整個不成立。',
      tables: [
        T('目前這一列', ['emp_name', 'salary'], [R(['林美玲', 72000], 'miss')]),
        T('72000 > 82000？不成立', ['salary'], [
          R([82000], 'miss'), R([48000]), R([45000])])], op: '> ALL',
      out: T('結果', ['emp_name'], []) },
    { note: '> ANY 寬鬆得多：只要「有一個」比它小就算成立。林美玲 72000 > 48000 → 成立。',
      tables: [
        T('目前這一列', ['emp_name', 'salary'], [R(['林美玲', 72000], 'hit')]),
        T('有一個成立就夠', ['salary'], [
          R([82000], 'miss'), R([48000], 'hit'), R([45000], 'hit')])], op: '> ANY',
      out: T('結果', ['emp_name'], [R(['林美玲'], 'hit')]) },
    { note: '換算關係記一下：= ANY 就是 IN，<> ALL 就是 NOT IN。SOME 是 ANY 的同義字。',
      tables: [T('等價寫法', ['ANY / ALL', '等同於'], [
        R(['= ANY (…)', 'IN (…)'], 'hit'),
        R(['<> ALL (…)', 'NOT IN (…)'], 'hit')])] },
  ],

  'self-join': [
    { note: '員工的主管也在同一張 employees 裡。要把「員工 → 主管姓名」對出來。',
      tables: [T('employees', ['emp_id', 'emp_name', 'manager_id'], [
        R([1003, '陳志強', null]), R([1004, '林美玲', 1003]), R([1005, '張家豪', 1003])])] },
    { note: '同一張表取兩個別名，當成兩張表看：e 是「員工」、m 是「主管」。',
      tables: [
        T('e（當員工用）', ['emp_id', 'emp_name', 'manager_id'], [
          R([1004, '林美玲', 1003], 'hit'), R([1005, '張家豪', 1003])]),
        T('m（當主管用）', ['emp_id', 'emp_name'], [
          R([1003, '陳志強'], 'hit'), R([1004, '林美玲']), R([1005, '張家豪'])])],
      op: 'ON m.emp_id = e.manager_id' },
    { note: '林美玲的 manager_id = 1003 → 在 m 裡找到 emp_id = 1003 的陳志強。',
      tables: [
        T('e', ['emp_name', 'manager_id'], [R(['林美玲', 1003], 'hit')]),
        T('m', ['emp_id', 'emp_name'], [R([1003, '陳志強'], 'hit')])], op: '=',
      out: T('結果', ['員工', '主管'], [R(['林美玲', '陳志強'], 'hit')]) },
    { note: '陳志強自己的 manager_id 是 NULL → 用 LEFT JOIN 他才留得住，主管欄補 NULL。',
      tables: [
        T('e', ['emp_name', 'manager_id'], [R(['陳志強', null], 'hit')]),
        T('m（對不到）', ['emp_id', 'emp_name'], [])], op: 'LEFT JOIN',
      out: T('結果', ['員工', '主管'], [
        R(['林美玲', '陳志強']), R(['張家豪', '陳志強']), R(['陳志強', null], 'null')]) },
    { note: '另一招：找「同一個主管底下的同事配對」。加上 a.emp_id < b.emp_id 才不會配到自己、也不會正反各出現一次。',
      tables: [T('a.emp_id < b.emp_id', ['配對', '要不要'], [
        R(['林美玲 ↔ 張家豪', '要'], 'hit'),
        R(['林美玲 ↔ 林美玲', '自己配自己，排除'], 'miss'),
        R(['張家豪 ↔ 林美玲', '重複，排除'], 'miss')])] },
  ],

  'cross-nonequi': [
    { note: 'CROSS JOIN 不寫 ON，直接產生「所有組合」（笛卡兒積）。2 個部門 × 2 個級距 = 4 列。',
      tables: [
        T('departments', ['dept_name'], [R(['業務部']), R(['研發部'])]),
        T('salary_grades', ['grade'], [R(['A']), R(['B'])])], op: 'CROSS JOIN',
      out: T('4 種組合', ['dept_name', 'grade'], [
        R(['業務部', 'A'], 'hit'), R(['業務部', 'B'], 'hit'),
        R(['研發部', 'A'], 'hit'), R(['研發部', 'B'], 'hit')]) },
    { note: '列數是相乘的，兩張大表 CROSS JOIN 會爆掉 —— 通常是忘了寫 ON 才不小心產生它。',
      tables: [T('列數', ['左表 × 右表', '結果'], [
        R(['5 × 4', '20 列'], 'hit'),
        R(['1000 × 1000', '一百萬列'], 'miss')])] },
    { note: '非等值連接：ON 裡面不用 =。salary_grades 沒有外鍵，要用範圍去對。',
      tables: [
        T('employees', ['emp_name', 'salary'], [
          R(['林美玲', 72000]), R(['李小華', 48000])]),
        T('salary_grades', ['grade', 'min_sal', 'max_sal'], [
          R(['A', 70000, 999999]), R(['B', 40000, 69999])])] },
    { note: '林美玲 72000 落在 A 的 70000～999999 之間 → 對到 A。',
      tables: [
        T('employees', ['emp_name', 'salary'], [R(['林美玲', 72000], 'hit')]),
        T('salary_grades', ['grade', 'min_sal', 'max_sal'], [
          R(['A', 70000, 999999], 'hit'), R(['B', 40000, 69999], 'miss')])],
      op: 'BETWEEN',
      out: T('結果', ['emp_name', 'salary', 'grade'], [R(['林美玲', 72000, 'A'], 'hit')]) },
    { note: '李小華 48000 落在 B 的區間 → 對到 B。每個人剛好對到一個級距，所以列數不會膨脹。',
      tables: [
        T('employees', ['emp_name', 'salary'], [R(['李小華', 48000], 'hit')]),
        T('salary_grades', ['grade', 'min_sal', 'max_sal'], [
          R(['A', 70000, 999999], 'miss'), R(['B', 40000, 69999], 'hit')])],
      op: 'BETWEEN',
      out: T('結果', ['emp_name', 'salary', 'grade'], [
        R(['林美玲', 72000, 'A']), R(['李小華', 48000, 'B'], 'hit')]) },
  ],

  // ── 函數 ────────────────────────────────────────────────────

  'string-func': [
    { note: '兩個豎線是串接運算子。Oracle 用它接字串，不是用 + 號。',
      tables: [T('emp_name 接上 job', ['emp_name', 'job', 'label'], [
        R(['李小華', 'SALES', '李小華（SALES）'], 'hit'),
        R(['林美玲', 'DEV', '林美玲（DEV）'], 'hit')])] },
    { note: 'SUBSTR(字串, 從第幾個字, 取幾個字)。位置從 1 開始算，不是 0。',
      tables: [T('substr(emp_name, 1, 1)', ['emp_name', '結果'], [
        R(['李小華', '李'], 'hit'), R(['林美玲', '林'], 'hit')])] },
    { note: 'INSTR 找「某個字在第幾個位置」，找不到回 0。常配合 SUBSTR 切字串。',
      tables: [T('instr(email, 小老鼠)', ['email', 'at_pos'], [
        R(['hua@example.com', 4], 'hit'),
        R(['meiling@example.com', 8], 'hit')])] },
    { note: 'LPAD 往左補到指定長度，最常拿來把編號補 0。RPAD 是往右補。',
      tables: [T('lpad(emp_id, 8, 零)', ['emp_id', 'padded'], [
        R([1002, '00001002'], 'hit'), R([1004, '00001004'], 'hit')])] },
    { note: '其他常用的一次看完。大小寫三兄弟：UPPER 全大寫、LOWER 全小寫、INITCAP 每個字首大寫。',
      tables: [T('其他常用', ['函數', '例子 → 結果'], [
        R(['upper / lower', 'dev → DEV / DEV → dev'], 'hit'),
        R(['initcap', 'dev mgr → Dev Mgr'], 'hit'),
        R(['length', '李小華 → 3'], 'hit'),
        R(['replace', 'a@b.com 去掉 @b.com → a'], 'hit'),
        R(['trim', '前後空白都砍掉'], 'hit')])] },
  ],

  'date-func': [
    { note: '本站的 SYSDATE 固定在 2024-09-30，答案才不會隔天就變。以 hire_date 為例。',
      tables: [T('employees', ['emp_name', 'hire_date'], [
        R(['陳志強', '2013-01-20']), R(['林美玲', '2019-09-01'])])] },
    { note: 'TO_CHAR(日期, 格式) 轉成字串。格式字串裡 YYYY 是年、MM 是月、DD 是日。',
      tables: [T('to_char(hire_date, 年-月)', ['hire_date', 'ym'], [
        R(['2013-01-20', '2013-01'], 'hit'), R(['2019-09-01', '2019-09'], 'hit')])] },
    { note: 'EXTRACT 只抓出某一段，回傳的是數字而不是字串。',
      tables: [T('extract(year / month from hire_date)', ['hire_date', 'y', 'm'], [
        R(['2013-01-20', 2013, 1], 'hit'), R(['2019-09-01', 2019, 9], 'hit')])] },
    { note: 'MONTHS_BETWEEN 算兩個日期差幾個月（會有小數），拿來算年資最方便。',
      tables: [T('months_between(sysdate, hire_date)', ['hire_date', '月數'], [
        R(['2013-01-20', 140], 'hit'), R(['2019-09-01', 61], 'hit')])] },
    { note: 'ADD_MONTHS 加減月份、LAST_DAY 取當月月底、TRUNC 砍到當月 1 號。',
      tables: [T('以 2019-09-01 為例', ['函數', '結果'], [
        R(['add_months(d, 3)', '2019-12-01'], 'hit'),
        R(['last_day(d)', '2019-09-30'], 'hit'),
        R(['trunc(d, 月)', '2019-09-01'], 'hit')])] },
  ],

  'number-func': [
    { note: 'ROUND 與 TRUNC 最容易混。第二個參數是「保留幾位小數」。',
      tables: [T('拿 1234.567 來試', ['函數', '結果'], [
        R(['round(1234.567, 1)', 1234.6], 'hit'),
        R(['trunc(1234.567, 1)', 1234.5], 'hit')])] },
    { note: '差別就在小數第二位的 6：ROUND 會四捨五入、TRUNC 直接砍掉不管後面是多少。',
      tables: [T('看小數第二位的 6', ['函數', '怎麼處理'], [
        R(['round', '6 大於 5 → 進位成 .6'], 'hit'),
        R(['trunc', '不管它，直接砍 → .5'], 'hit')])] },
    { note: '第二個參數給負數，是砍「整數位」—— -3 就是砍到千位。',
      tables: [T('trunc(1234567, -3)', ['輸入', '結果'], [
        R([1234567, 1234000], 'hit')])] },
    { note: 'MOD 取餘數，最常拿來判斷奇偶或每 n 個一組。',
      tables: [T('mod', ['算式', '結果'], [
        R(['mod(10, 3)', 1], 'hit'), R(['mod(10, 2)', 0], 'hit')])] },
    { note: 'CEIL 一律往上進、FLOOR 一律往下捨，跟四捨五入無關。',
      tables: [T('其他常用', ['函數', '結果'], [
        R(['ceil(1.2)', 2], 'hit'), R(['floor(1.8)', 1], 'hit'),
        R(['abs(-5)', 5], 'hit'), R(['power(2, 10)', 1024], 'hit'),
        R(['sqrt(16)', 4], 'hit')])] },
  ],
};
