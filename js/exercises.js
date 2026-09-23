// 題庫：每個主題兩題左右，另有跨主題的組合題。
// 判定方式一律「跑你的 SQL，跟參考答案的結果集（或 DML 後的資料狀態）比對」，
// 所以寫法不必跟參考答案一模一樣，只要結果對、而且用到指定語法就算過。

export const TOPICS = [
  {
    id: 'inner-join', name: 'INNER JOIN', group: 'JOIN',
    summary: '只留下兩邊都對得上的資料，對不上的整列消失。',
    syntax: `SELECT e.emp_name, d.dept_name
FROM   employees e
INNER JOIN departments d
       ON e.dept_id = d.dept_id;

-- INNER 可以省略，JOIN 預設就是 INNER JOIN`,
  },
  {
    id: 'left-join', name: 'LEFT JOIN', group: 'JOIN',
    summary: '左表全留，右表對不到就補 NULL。配合 IS NULL 可做「反向查詢」。',
    syntax: `SELECT d.dept_name, e.emp_name
FROM   departments d
LEFT   JOIN employees e ON e.dept_id = d.dept_id;

-- 找出「右邊沒有對應資料」的經典寫法
SELECT d.dept_name
FROM   departments d
LEFT   JOIN employees e ON e.dept_id = d.dept_id
WHERE  e.emp_id IS NULL;`,
  },
  {
    id: 'right-join', name: 'RIGHT JOIN', group: 'JOIN',
    summary: '右表全留，左表對不到補 NULL。把兩張表位置對調就等同 LEFT JOIN。',
    syntax: `SELECT e.emp_name, d.dept_name
FROM   departments d
RIGHT  JOIN employees e ON e.dept_id = d.dept_id;

-- 等價於：
-- FROM employees e LEFT JOIN departments d ON e.dept_id = d.dept_id`,
  },
  {
    id: 'full-join', name: 'FULL OUTER JOIN', group: 'JOIN',
    summary: '兩邊都全留，任一邊對不到就補 NULL，用來做「差異比對」。',
    syntax: `SELECT d.dept_name, e.emp_name
FROM   departments d
FULL   OUTER JOIN employees e ON e.dept_id = d.dept_id;

-- 只要兩邊對不起來的列
WHERE  d.dept_id IS NULL OR e.emp_id IS NULL`,
  },
  {
    id: 'multi-join', name: '多表 JOIN', group: 'JOIN',
    summary: '一路串下去，每個 JOIN 都要有自己的 ON；也可以用不等式做範圍比對。',
    syntax: `SELECT e.emp_name, d.dept_name, p.proj_name
FROM   employees e
JOIN   departments  d  ON d.dept_id  = e.dept_id
JOIN   emp_projects ep ON ep.emp_id  = e.emp_id
JOIN   projects     p  ON p.proj_id  = ep.proj_id;

-- 非等值連接（範圍比對）
JOIN   salary_grades g ON e.salary BETWEEN g.min_sal AND g.max_sal`,
  },
  {
    id: 'distinct', name: 'DISTINCT', group: '查詢基礎',
    summary: '針對「整列」去重，不是只針對第一個欄位。也能寫在聚合函數裡。',
    syntax: `SELECT DISTINCT job FROM employees;

SELECT DISTINCT d.dept_id, d.dept_name  -- 兩欄一起去重
FROM   departments d JOIN employees e ON e.dept_id = d.dept_id;

SELECT COUNT(DISTINCT dept_id) FROM employees;`,
  },
  {
    id: 'exists', name: 'EXISTS / NOT EXISTS', group: '子查詢',
    summary: '只問「子查詢有沒有資料」，不看內容，所以裡面寫 SELECT 1 就好。NULL 不會害你。',
    syntax: `SELECT e.emp_name
FROM   employees e
WHERE  EXISTS (SELECT 1 FROM emp_projects ep
               WHERE ep.emp_id = e.emp_id);

SELECT p.proj_name
FROM   projects p
WHERE  NOT EXISTS (SELECT 1 FROM emp_projects ep
                   WHERE ep.proj_id = p.proj_id);`,
  },
  {
    id: 'case-when', name: 'CASE WHEN', group: '運算式',
    summary: '由上往下第一個成立的 WHEN 勝出。搭配聚合函數就是行轉欄（PIVOT）。',
    syntax: `SELECT emp_name,
       CASE WHEN salary >= 80000 THEN '高'
            WHEN salary >= 60000 THEN '中'
            ELSE '低' END AS level
FROM   employees;

-- 行轉欄
SELECT SUM(CASE WHEN job = 'DEV' THEN 1 ELSE 0 END) AS dev_cnt
FROM   employees;`,
  },
  {
    id: 'nvl', name: 'NVL / NVL2', group: '運算式',
    summary: 'NVL(a,b)：a 是 NULL 就換成 b。NVL2(a,b,c)：a 不是 NULL 給 b，是 NULL 給 c。',
    syntax: `SELECT NVL(commission_pct, 0)                    AS comm,
       NVL2(email, '已填寫', '未填寫')            AS email_status,
       salary * (1 + NVL(commission_pct, 0))     AS total_pay
FROM   employees;

-- 相關寫法：COALESCE 可接多個參數、NULLIF 相等時給 NULL`,
  },
  {
    id: 'aggregate', name: '聚合函數', group: '彙總',
    summary: 'COUNT(*) 算列數、COUNT(欄位) 會略過 NULL；SUM / AVG 也都跳過 NULL。',
    syntax: `SELECT COUNT(*)              AS 總列數,
       COUNT(commission_pct) AS 有填獎金的列數,
       SUM(salary), AVG(salary), MAX(salary), MIN(salary)
FROM   employees;`,
  },
  {
    id: 'group-having', name: 'GROUP BY / HAVING', group: '彙總',
    summary: 'WHERE 在分組前過濾原始列，HAVING 在分組後過濾群組。',
    syntax: `SELECT d.dept_id, d.dept_name, COUNT(*) AS cnt
FROM   departments d
JOIN   employees e ON e.dept_id = d.dept_id
WHERE  e.salary > 30000          -- 先篩列
GROUP  BY d.dept_id, d.dept_name
HAVING COUNT(*) >= 2             -- 再篩群組
ORDER  BY d.dept_id;`,
  },
  {
    id: 'minus', name: 'MINUS', group: '集合運算',
    summary: 'Oracle 專有，取「在 A 不在 B」。會自動去重，欄位數與型別要對齊。',
    syntax: `SELECT emp_id FROM employees
MINUS
SELECT emp_id FROM emp_projects;

-- 注意：子集合裡有 NULL 時語意容易出錯，建議先 WHERE ... IS NOT NULL`,
  },
  {
    id: 'intersect', name: 'INTERSECT', group: '集合運算',
    summary: '取兩邊的交集，同樣會去重。',
    syntax: `SELECT emp_id FROM emp_projects WHERE proj_id = 9001
INTERSECT
SELECT emp_id FROM emp_projects WHERE proj_id = 9004;`,
  },
  {
    id: 'in-notin', name: 'IN / NOT IN', group: '子查詢',
    summary: 'NOT IN 只要子查詢冒出一個 NULL，整個條件就永遠不成立，回傳空集合。',
    syntax: `SELECT emp_name FROM employees
WHERE  dept_id IN (SELECT dept_id FROM departments WHERE location = '台北');

-- 這個陷阱一定要記住：先把 NULL 濾掉
WHERE  dept_id NOT IN (SELECT dept_id FROM projects WHERE dept_id IS NOT NULL);`,
  },
  {
    id: 'or', name: 'OR', group: '查詢基礎',
    summary: 'AND 的優先順序高於 OR，混用時務必加括號。',
    syntax: `SELECT * FROM employees
WHERE  job = 'DEV' OR salary >= 80000;

-- 沒括號的話 AND 會先結合，意思完全不同
WHERE  (dept_id = 10 OR dept_id = 30) AND salary > 50000;`,
  },
  {
    id: 'union', name: 'UNION / UNION ALL', group: '集合運算',
    summary: 'UNION 會排序去重、成本較高；UNION ALL 直接接起來，確定不重複時用它。',
    syntax: `SELECT dept_id FROM employees WHERE dept_id IS NOT NULL
UNION
SELECT dept_id FROM projects  WHERE dept_id IS NOT NULL;

SELECT '員工' AS src, emp_id, emp_name FROM employees
UNION ALL
SELECT '專案',      proj_id, proj_name FROM projects;`,
  },
  {
    id: 'join-update', name: 'JOIN UPDATE', group: 'DML',
    summary: 'Oracle 不能直接寫 UPDATE ... FROM，要嘛用可更新連接檢視，要嘛用相關子查詢。',
    syntax: `-- 寫法一：可更新連接檢視（連接欄位必須有唯一鍵）
UPDATE ( SELECT e.salary AS old_sal, a.new_salary AS new_sal
         FROM   employees e
         JOIN   salary_adjust a ON a.emp_id = e.emp_id )
SET    old_sal = new_sal;

-- 寫法二：相關子查詢 + EXISTS（最通用，一定要加 WHERE EXISTS，
--         否則沒對到的列會被更新成 NULL）
UPDATE employees e
SET    e.salary = (SELECT a.new_salary FROM salary_adjust a
                   WHERE a.emp_id = e.emp_id)
WHERE  EXISTS     (SELECT 1 FROM salary_adjust a
                   WHERE a.emp_id = e.emp_id);`,
  },
  {
    id: 'merge', name: 'MERGE / UPSERT', group: 'DML',
    summary: '一句話同時處理「有就更新、沒有就新增」，是 Oracle 做 UPSERT 的標準作法。',
    syntax: `MERGE INTO emp_bonus b
USING ( SELECT e.emp_id, e.salary * g.bonus_rate AS bonus_amt, g.grade
        FROM   employees e
        JOIN   salary_grades g
               ON e.salary BETWEEN g.min_sal AND g.max_sal ) s
ON    (b.emp_id = s.emp_id)
WHEN MATCHED THEN
  UPDATE SET b.bonus_amt = s.bonus_amt, b.grade = s.grade
  WHERE  s.bonus_amt > 0            -- 可選：再加條件
WHEN NOT MATCHED THEN
  INSERT (emp_id, bonus_amt, grade)
  VALUES (s.emp_id, s.bonus_amt, s.grade);`,
  },
];

export const EXERCISES = [
  // ── INNER JOIN ──────────────────────────────────────────────
  {
    id: 'inner-join-1', topicId: 'inner-join', difficulty: 1,
    title: '員工對上部門名稱',
    prompt: '列出每位員工的 emp_id、emp_name 以及所屬部門名稱 dept_name。沒有部門的員工不要出現。依 emp_id 由小到大排序。',
    hint: '用 INNER JOIN 把 employees 與 departments 以 dept_id 串起來。INNER JOIN 天生就會把對不上的列丟掉，所以不用額外加條件。',
    requires: ['JOIN'], ordered: true,
    solution: `SELECT e.emp_id, e.emp_name, d.dept_name
FROM   employees e
INNER JOIN departments d ON e.dept_id = d.dept_id
ORDER  BY e.emp_id`,
  },
  {
    id: 'inner-join-2', topicId: 'inner-join', difficulty: 2,
    title: '進行中的專案與負責部門',
    prompt: "列出所有 status 為 'ACTIVE' 的專案，顯示 proj_name、負責部門的 dept_name 與 budget。依 proj_id 排序。",
    hint: 'JOIN 的 ON 只寫連接條件，篩選 status 的條件放在 WHERE 比較好讀。',
    requires: ['JOIN'], ordered: true,
    solution: `SELECT p.proj_name, d.dept_name, p.budget
FROM   projects p
JOIN   departments d ON p.dept_id = d.dept_id
WHERE  p.status = 'ACTIVE'
ORDER  BY p.proj_id`,
  },

  // ── LEFT JOIN ───────────────────────────────────────────────
  {
    id: 'left-join-1', topicId: 'left-join', difficulty: 1,
    title: '部門名冊（含空部門）',
    prompt: '列出所有部門的 dept_id、dept_name 及底下每位員工的 emp_name。沒有任何員工的部門也要出現一列，emp_name 留 NULL。依 dept_id、emp_name 排序。',
    hint: '以 departments 當左表做 LEFT JOIN。如果用 INNER JOIN，沒有員工的部門就會整個不見。',
    requires: ['LEFT JOIN'], ordered: true,
    solution: `SELECT d.dept_id, d.dept_name, e.emp_name
FROM   departments d
LEFT   JOIN employees e ON e.dept_id = d.dept_id
ORDER  BY d.dept_id, e.emp_name`,
  },
  {
    id: 'left-join-2', topicId: 'left-join', difficulty: 2,
    title: '找出沒有員工的部門',
    prompt: '找出目前沒有任何員工的部門，顯示 dept_id 與 dept_name，依 dept_id 排序。請用 LEFT JOIN 搭配 IS NULL 的反連接寫法完成。',
    hint: 'LEFT JOIN 之後，右表對不到的列所有欄位都會是 NULL，因此 WHERE e.emp_id IS NULL 就等於「這個部門沒有員工」。',
    requires: ['LEFT JOIN', 'IS NULL'], ordered: true,
    solution: `SELECT d.dept_id, d.dept_name
FROM   departments d
LEFT   JOIN employees e ON e.dept_id = d.dept_id
WHERE  e.emp_id IS NULL
ORDER  BY d.dept_id`,
  },

  // ── RIGHT JOIN ──────────────────────────────────────────────
  {
    id: 'right-join-1', topicId: 'right-join', difficulty: 1,
    title: '全體員工與部門（右表全留）',
    prompt: '以 departments 為左表、employees 為右表做 RIGHT JOIN，列出 emp_id、emp_name、dept_name。沒有部門的員工也要出現，dept_name 為 NULL。依 emp_id 排序。',
    hint: 'RIGHT JOIN 保留右表全部的列。這題刻意讓你體會：它跟「employees LEFT JOIN departments」結果是一樣的。',
    requires: ['RIGHT JOIN'], ordered: true,
    solution: `SELECT e.emp_id, e.emp_name, d.dept_name
FROM   departments d
RIGHT  JOIN employees e ON e.dept_id = d.dept_id
ORDER  BY e.emp_id`,
  },
  {
    id: 'right-join-2', topicId: 'right-join', difficulty: 2,
    title: '找出沒有掛部門的專案',
    prompt: '用 RIGHT JOIN 找出 dept_id 是空的專案，顯示 proj_id 與 proj_name，依 proj_id 排序。',
    hint: '把 projects 放在 RIGHT 那一側全部留下，再用 WHERE d.dept_id IS NULL 篩出對不到部門的專案。',
    requires: ['RIGHT JOIN', 'IS NULL'], ordered: true,
    solution: `SELECT p.proj_id, p.proj_name
FROM   departments d
RIGHT  JOIN projects p ON d.dept_id = p.dept_id
WHERE  d.dept_id IS NULL
ORDER  BY p.proj_id`,
  },

  // ── FULL OUTER JOIN ─────────────────────────────────────────
  {
    id: 'full-join-1', topicId: 'full-join', difficulty: 2,
    title: '部門與員工的完整對照表',
    prompt: '用 FULL OUTER JOIN 列出 dept_id、dept_name、emp_id、emp_name。沒有員工的部門、沒有部門的員工，兩種都要出現。依 dept_id、emp_id 排序。',
    hint: 'FULL OUTER JOIN 等於 LEFT JOIN 的結果再聯集 RIGHT JOIN 的結果。Oracle 的排序預設把 NULL 放最後。',
    requires: ['FULL'], ordered: true,
    solution: `SELECT d.dept_id, d.dept_name, e.emp_id, e.emp_name
FROM   departments d
FULL   OUTER JOIN employees e ON e.dept_id = d.dept_id
ORDER  BY d.dept_id, e.emp_id`,
  },
  {
    id: 'full-join-2', topicId: 'full-join', difficulty: 3,
    title: '只列出兩邊對不起來的資料',
    prompt: '用 FULL OUTER JOIN 找出「沒有員工的部門」與「沒有部門的員工」，顯示 dept_name 與 emp_name 兩欄，依 dept_name、emp_name 排序。',
    hint: '先 FULL OUTER JOIN，再用 WHERE d.dept_id IS NULL OR e.emp_id IS NULL 把配對成功的列濾掉。這是資料對帳最常用的手法。',
    requires: ['FULL', 'OR'], ordered: true,
    solution: `SELECT d.dept_name, e.emp_name
FROM   departments d
FULL   OUTER JOIN employees e ON e.dept_id = d.dept_id
WHERE  d.dept_id IS NULL OR e.emp_id IS NULL
ORDER  BY d.dept_name, e.emp_name`,
  },

  // ── 多表 JOIN ────────────────────────────────────────────────
  {
    id: 'multi-join-1', topicId: 'multi-join', difficulty: 2,
    title: '四張表串起來',
    prompt: '列出每一筆專案參與紀錄：員工姓名 emp_name、部門名稱 dept_name、專案名稱 proj_name、投入工時 hours。依 emp_id、proj_id 排序。',
    hint: 'employees → departments → emp_projects → projects，四張表三個 JOIN，每個 JOIN 都要有自己的 ON。',
    requires: ['JOIN'], ordered: true,
    solution: `SELECT e.emp_name, d.dept_name, p.proj_name, ep.hours
FROM   employees e
JOIN   departments  d  ON d.dept_id = e.dept_id
JOIN   emp_projects ep ON ep.emp_id = e.emp_id
JOIN   projects     p  ON p.proj_id = ep.proj_id
ORDER  BY e.emp_id, p.proj_id`,
  },
  {
    id: 'multi-join-2', topicId: 'multi-join', difficulty: 3,
    title: '非等值連接：查出薪資級距',
    prompt: '列出有部門的員工其 emp_name、dept_name 與所屬薪資級距 grade。級距判定方式是 salary 落在 salary_grades 的 min_sal 與 max_sal 之間。依 emp_id 排序。',
    hint: 'JOIN 的 ON 不一定要用等號，可以寫 ON e.salary BETWEEN g.min_sal AND g.max_sal，這叫非等值連接。',
    requires: ['JOIN', 'BETWEEN'], ordered: true,
    solution: `SELECT e.emp_name, d.dept_name, g.grade
FROM   employees e
JOIN   departments   d ON d.dept_id = e.dept_id
JOIN   salary_grades g ON e.salary BETWEEN g.min_sal AND g.max_sal
ORDER  BY e.emp_id`,
  },

  // ── DISTINCT ────────────────────────────────────────────────
  {
    id: 'distinct-1', topicId: 'distinct', difficulty: 1,
    title: '不重複的職稱清單',
    prompt: '列出 employees 裡出現過的所有 job，不可重複，依 job 排序。',
    hint: 'SELECT DISTINCT job FROM employees。注意 DEV 與 SALES 各有兩個人。',
    requires: ['DISTINCT'], ordered: true,
    solution: `SELECT DISTINCT job
FROM   employees
ORDER  BY job`,
  },
  {
    id: 'distinct-2', topicId: 'distinct', difficulty: 2,
    title: '有人參與專案的部門',
    prompt: '列出「底下至少有一位員工參與過專案」的部門，顯示 dept_id 與 dept_name，不可重複，依 dept_id 排序。',
    hint: 'JOIN 之後同一個部門會出現很多次，用 DISTINCT 對兩個欄位一起去重。',
    requires: ['DISTINCT', 'JOIN'], ordered: true,
    solution: `SELECT DISTINCT d.dept_id, d.dept_name
FROM   departments d
JOIN   employees    e  ON e.dept_id = d.dept_id
JOIN   emp_projects ep ON ep.emp_id = e.emp_id
ORDER  BY d.dept_id`,
  },

  // ── EXISTS / NOT EXISTS ─────────────────────────────────────
  {
    id: 'exists-1', topicId: 'exists', difficulty: 2,
    title: '有參與專案的員工',
    prompt: '找出有參與任何專案的員工，顯示 emp_id 與 emp_name，依 emp_id 排序。請用 EXISTS 完成，不要用 JOIN。',
    hint: 'WHERE EXISTS (SELECT 1 FROM emp_projects ep WHERE ep.emp_id = e.emp_id)。子查詢裡選什麼都無所謂，EXISTS 只問「有沒有列」。',
    requires: ['EXISTS'], forbids: ['JOIN'], ordered: true,
    solution: `SELECT e.emp_id, e.emp_name
FROM   employees e
WHERE  EXISTS (SELECT 1 FROM emp_projects ep WHERE ep.emp_id = e.emp_id)
ORDER  BY e.emp_id`,
  },
  {
    id: 'exists-2', topicId: 'exists', difficulty: 2,
    title: '沒有任何成員的專案',
    prompt: '找出目前沒有任何成員的專案，顯示 proj_id 與 proj_name，依 proj_id 排序。請用 NOT EXISTS 完成。',
    hint: 'NOT EXISTS 與 NOT IN 不同：即使子查詢裡有 NULL，NOT EXISTS 仍然會正確運作。',
    requires: ['NOT EXISTS'], ordered: true,
    solution: `SELECT p.proj_id, p.proj_name
FROM   projects p
WHERE  NOT EXISTS (SELECT 1 FROM emp_projects ep WHERE ep.proj_id = p.proj_id)
ORDER  BY p.proj_id`,
  },

  // ── CASE WHEN ───────────────────────────────────────────────
  {
    id: 'case-when-1', topicId: 'case-when', difficulty: 1,
    title: '薪資分級',
    prompt: "列出 emp_name、salary，以及一個名為 salary_level 的欄位：salary >= 80000 顯示 '高'，>= 60000 顯示 '中'，其餘顯示 '低'。依 emp_id 排序。",
    hint: 'CASE WHEN 由上往下比，第一個成立的就勝出，所以條件要由嚴到寬排列。',
    requires: ['CASE', 'WHEN'], ordered: true,
    solution: `SELECT emp_name,
       salary,
       CASE WHEN salary >= 80000 THEN '高'
            WHEN salary >= 60000 THEN '中'
            ELSE '低'
       END AS salary_level
FROM   employees
ORDER  BY emp_id`,
  },
  {
    id: 'case-when-2', topicId: 'case-when', difficulty: 3,
    title: '用 CASE 做行轉欄統計',
    prompt: "統計每個部門的 dept_id、dept_name、工程職人數 dev_cnt（job 以 'DEV' 開頭）與業務職人數 sales_cnt（job 以 'SALES' 開頭）。沒有員工的部門也要出現，數字為 0。依 dept_id 排序。",
    hint: "把 CASE WHEN 包在 SUM() 裡面：SUM(CASE WHEN job LIKE 'DEV%' THEN 1 ELSE 0 END)。部門要全留所以用 LEFT JOIN。",
    requires: ['CASE', 'SUM'], ordered: true,
    solution: `SELECT d.dept_id,
       d.dept_name,
       SUM(CASE WHEN e.job LIKE 'DEV%'   THEN 1 ELSE 0 END) AS dev_cnt,
       SUM(CASE WHEN e.job LIKE 'SALES%' THEN 1 ELSE 0 END) AS sales_cnt
FROM   departments d
LEFT   JOIN employees e ON e.dept_id = d.dept_id
GROUP  BY d.dept_id, d.dept_name
ORDER  BY d.dept_id`,
  },

  // ── NVL / NVL2 ──────────────────────────────────────────────
  {
    id: 'nvl-1', topicId: 'nvl', difficulty: 1,
    title: 'NVL：把 NULL 當成 0 來算',
    prompt: '列出 emp_name、salary、獎金比例 comm（commission_pct 為 NULL 時顯示 0），以及實際總薪 total_pay = salary × (1 + 獎金比例)。依 emp_id 排序。',
    hint: '直接用 salary * (1 + commission_pct) 的話，只要 commission_pct 是 NULL，整個算式就是 NULL。要先用 NVL 補 0。',
    requires: ['NVL'], ordered: true,
    solution: `SELECT emp_name,
       salary,
       NVL(commission_pct, 0) AS comm,
       salary * (1 + NVL(commission_pct, 0)) AS total_pay
FROM   employees
ORDER  BY emp_id`,
  },
  {
    id: 'nvl-2', topicId: 'nvl', difficulty: 2,
    title: 'NVL2：依「是不是 NULL」給不同結果',
    prompt: "列出 emp_name、email_status（email 有值顯示 '已填寫'，NULL 顯示 '未填寫'）與 bonus（commission_pct 有值時為 salary × commission_pct，NULL 時為 0）。依 emp_id 排序。",
    hint: 'NVL2(運算式, 不是NULL時的值, 是NULL時的值)，剛好三個參數，順序別記反了。',
    requires: ['NVL2'], ordered: true,
    solution: `SELECT emp_name,
       NVL2(email, '已填寫', '未填寫') AS email_status,
       NVL2(commission_pct, salary * commission_pct, 0) AS bonus
FROM   employees
ORDER  BY emp_id`,
  },

  // ── 聚合函數 ─────────────────────────────────────────────────
  {
    id: 'aggregate-1', topicId: 'aggregate', difficulty: 1,
    title: '五個聚合函數一次用',
    prompt: '對 employees 做整體統計，依序輸出：emp_cnt（總人數）、comm_cnt（commission_pct 有填的人數）、total_salary（薪資總和）、avg_salary（平均薪資，四捨五入到小數 2 位）、max_salary、min_salary。',
    hint: 'COUNT(*) 算的是列數；COUNT(commission_pct) 會自動略過 NULL，兩個數字不一樣正是重點。',
    requires: ['COUNT', 'SUM', 'AVG', 'MAX', 'MIN'], ordered: false,
    solution: `SELECT COUNT(*)              AS emp_cnt,
       COUNT(commission_pct) AS comm_cnt,
       SUM(salary)           AS total_salary,
       ROUND(AVG(salary), 2) AS avg_salary,
       MAX(salary)           AS max_salary,
       MIN(salary)           AS min_salary
FROM   employees`,
  },
  {
    id: 'aggregate-2', topicId: 'aggregate', difficulty: 2,
    title: '每個專案的人力統計',
    prompt: '列出每個專案的 proj_id、proj_name、成員數 member_cnt、總工時 total_hours、單人最高工時 max_hours。沒有成員的專案也要出現（成員數 0、工時為 NULL）。依 proj_id 排序。',
    hint: '用 LEFT JOIN 保留所有專案，並且要用 COUNT(ep.emp_id) 而不是 COUNT(*)，否則沒有成員的專案會被算成 1。',
    requires: ['COUNT', 'SUM', 'MAX', 'LEFT JOIN'], ordered: true,
    solution: `SELECT p.proj_id,
       p.proj_name,
       COUNT(ep.emp_id) AS member_cnt,
       SUM(ep.hours)    AS total_hours,
       MAX(ep.hours)    AS max_hours
FROM   projects p
LEFT   JOIN emp_projects ep ON ep.proj_id = p.proj_id
GROUP  BY p.proj_id, p.proj_name
ORDER  BY p.proj_id`,
  },

  // ── GROUP BY / HAVING ───────────────────────────────────────
  {
    id: 'group-having-1', topicId: 'group-having', difficulty: 2,
    title: '人數兩人以上的部門',
    prompt: '統計各部門的 dept_id、dept_name、人數 emp_cnt 與平均薪資 avg_salary（四捨五入到整數），只保留人數 2 人以上的部門，依 dept_id 排序。',
    hint: '過濾「群組」的條件要寫在 HAVING，不能寫在 WHERE；WHERE 是在分組之前作用的。',
    requires: ['GROUP BY', 'HAVING'], ordered: true,
    solution: `SELECT d.dept_id,
       d.dept_name,
       COUNT(*)              AS emp_cnt,
       ROUND(AVG(e.salary), 0) AS avg_salary
FROM   departments d
JOIN   employees e ON e.dept_id = d.dept_id
GROUP  BY d.dept_id, d.dept_name
HAVING COUNT(*) >= 2
ORDER  BY d.dept_id`,
  },
  {
    id: 'group-having-2', topicId: 'group-having', difficulty: 2,
    title: '薪資總額破九萬的職稱',
    prompt: '依 job 分組，列出 job、人數 cnt、薪資總額 total，只保留薪資總額大於 90000 的職稱，依 job 排序。',
    hint: 'HAVING 裡面可以直接寫聚合函數：HAVING SUM(salary) > 90000。',
    requires: ['GROUP BY', 'HAVING', 'SUM'], ordered: true,
    solution: `SELECT job,
       COUNT(*)    AS cnt,
       SUM(salary) AS total
FROM   employees
GROUP  BY job
HAVING SUM(salary) > 90000
ORDER  BY job`,
  },

  // ── MINUS ───────────────────────────────────────────────────
  {
    id: 'minus-1', topicId: 'minus', difficulty: 2,
    title: 'MINUS 找出沒有員工的部門',
    prompt: '用 MINUS 找出「沒有任何員工」的部門代碼，只輸出 dept_id 一欄，依 dept_id 排序。',
    hint: '所有部門的 dept_id 減掉「員工資料裡出現過的 dept_id」。記得在第二段加上 WHERE dept_id IS NOT NULL，避免 NULL 干擾。',
    requires: ['MINUS'], ordered: true,
    solution: `SELECT dept_id FROM departments
MINUS
SELECT dept_id FROM employees WHERE dept_id IS NOT NULL
ORDER  BY dept_id`,
  },
  {
    id: 'minus-2', topicId: 'minus', difficulty: 2,
    title: 'MINUS 找出沒參與專案的員工',
    prompt: '用 MINUS 找出沒有參與任何專案的員工編號，只輸出 emp_id 一欄，依 emp_id 排序。這題請不要使用 NOT EXISTS 或 NOT IN。',
    hint: '全體員工的 emp_id 減掉 emp_projects 裡的 emp_id。MINUS 會自動去重，不必再加 DISTINCT。',
    requires: ['MINUS'], forbids: ['NOT EXISTS', 'NOT IN'], ordered: true,
    solution: `SELECT emp_id FROM employees
MINUS
SELECT emp_id FROM emp_projects
ORDER  BY emp_id`,
  },

  // ── INTERSECT ───────────────────────────────────────────────
  {
    id: 'intersect-1', topicId: 'intersect', difficulty: 2,
    title: '同時參與兩個專案的人',
    prompt: '用 INTERSECT 找出同時參與 9001 與 9004 兩個專案的員工編號，只輸出 emp_id 一欄，依 emp_id 排序。',
    hint: '把「參與 9001 的人」與「參與 9004 的人」兩個集合取交集。',
    requires: ['INTERSECT'], ordered: true,
    solution: `SELECT emp_id FROM emp_projects WHERE proj_id = 9001
INTERSECT
SELECT emp_id FROM emp_projects WHERE proj_id = 9004
ORDER  BY emp_id`,
  },
  {
    id: 'intersect-2', topicId: 'intersect', difficulty: 3,
    title: '既是部門主管又有參與專案',
    prompt: '用 INTERSECT 找出「同時是某部門主管（出現在 departments.manager_id）」且「有參與專案」的員工編號，欄位名稱請用 emp_id，依 emp_id 排序。',
    hint: 'departments 那一段要寫 SELECT manager_id AS emp_id，並排除 manager_id 為 NULL 的部門。',
    requires: ['INTERSECT'], ordered: true,
    solution: `SELECT manager_id AS emp_id FROM departments WHERE manager_id IS NOT NULL
INTERSECT
SELECT emp_id FROM emp_projects
ORDER  BY emp_id`,
  },

  // ── IN / NOT IN ─────────────────────────────────────────────
  {
    id: 'in-notin-1', topicId: 'in-notin', difficulty: 1,
    title: 'IN 搭配子查詢',
    prompt: "找出在台北上班的員工（部門 location 為 '台北'），顯示 emp_id 與 emp_name，依 emp_id 排序。請用 IN 搭配子查詢完成，不要用 JOIN 或 EXISTS。",
    hint: 'WHERE dept_id IN (SELECT dept_id FROM departments WHERE location = ...)。',
    requires: ['IN'], forbids: ['JOIN', 'EXISTS'], ordered: true,
    solution: `SELECT e.emp_id, e.emp_name
FROM   employees e
WHERE  e.dept_id IN (SELECT d.dept_id FROM departments d WHERE d.location = '台北')
ORDER  BY e.emp_id`,
  },
  {
    id: 'in-notin-2', topicId: 'in-notin', difficulty: 3,
    title: 'NOT IN 的 NULL 陷阱',
    prompt: '找出「沒有負責任何專案」的部門，顯示 dept_id 與 dept_name，依 dept_id 排序。請用 NOT IN 完成。注意 projects.dept_id 裡面有 NULL。',
    hint: '只要 NOT IN 的子查詢冒出一個 NULL，整個條件的結果就是 UNKNOWN，查出來一列都沒有。解法是在子查詢加上 WHERE dept_id IS NOT NULL。',
    requires: ['NOT IN'], ordered: true,
    solution: `SELECT d.dept_id, d.dept_name
FROM   departments d
WHERE  d.dept_id NOT IN (SELECT p.dept_id FROM projects p WHERE p.dept_id IS NOT NULL)
ORDER  BY d.dept_id`,
  },

  // ── OR ──────────────────────────────────────────────────────
  {
    id: 'or-1', topicId: 'or', difficulty: 1,
    title: '兩個條件擇一成立',
    prompt: "找出 job 等於 'DEV' 或是 salary 大於等於 80000 的員工，顯示 emp_id、emp_name、job、salary，依 emp_id 排序。",
    hint: '兩個條件用 OR 串起來即可，只要任一成立就會被選中。',
    requires: ['OR'], ordered: true,
    solution: `SELECT emp_id, emp_name, job, salary
FROM   employees
WHERE  job = 'DEV' OR salary >= 80000
ORDER  BY emp_id`,
  },
  {
    id: 'or-2', topicId: 'or', difficulty: 2,
    title: 'OR 與 AND 的優先順序',
    prompt: '找出「部門是 10 或 30」而且「薪資大於 50000」的員工，顯示 emp_id、emp_name、dept_id、job、salary，依 emp_id 排序。',
    hint: 'AND 的優先順序高於 OR。如果寫成 dept_id = 10 OR dept_id = 30 AND salary > 50000，會被解讀成 dept_id = 10 OR (dept_id = 30 AND salary > 50000)，答案就錯了。記得加括號。',
    requires: ['OR'], ordered: true,
    solution: `SELECT emp_id, emp_name, dept_id, job, salary
FROM   employees
WHERE  (dept_id = 10 OR dept_id = 30)
  AND  salary > 50000
ORDER  BY emp_id`,
  },

  // ── UNION / UNION ALL ───────────────────────────────────────
  {
    id: 'union-1', topicId: 'union', difficulty: 1,
    title: 'UNION 會自動去重',
    prompt: '用 UNION 列出「員工資料中出現過的部門代碼」與「專案資料中出現過的部門代碼」的聯集，只輸出 dept_id 一欄，兩邊都要排除 NULL，依 dept_id 排序。',
    hint: 'UNION 會把兩邊的結果合併後去除重複列，所以同一個 dept_id 只會出現一次。',
    requires: ['UNION'], ordered: true,
    solution: `SELECT dept_id FROM employees WHERE dept_id IS NOT NULL
UNION
SELECT dept_id FROM projects  WHERE dept_id IS NOT NULL
ORDER  BY dept_id`,
  },
  {
    id: 'union-2', topicId: 'union', difficulty: 2,
    title: 'UNION ALL 保留重複',
    prompt: '用 UNION ALL 把「參與 9001 的員工編號」與「參與 9004 的員工編號」接在一起，只輸出 emp_id 一欄，依 emp_id 排序。重複的人要出現兩次。',
    hint: '這題跟 INTERSECT 那題用的是同樣兩個集合，正好可以對照：UNION ALL 不去重，所以同時參與兩案的人會出現兩次。',
    requires: ['UNION ALL'], ordered: true,
    solution: `SELECT emp_id FROM emp_projects WHERE proj_id = 9001
UNION ALL
SELECT emp_id FROM emp_projects WHERE proj_id = 9004
ORDER  BY emp_id`,
  },
  {
    id: 'union-3', topicId: 'union', difficulty: 2,
    title: '把兩張不同的表併成一份清單',
    prompt: "用 UNION ALL 把員工與專案併成一份清單，欄位為 source_type（員工列顯示 '員工'，專案列顯示 '專案'）、id、name。依 source_type、id 排序。",
    hint: 'UNION ALL 兩側的欄位數量與型別要對得上，欄位名稱以第一段為準，所以別名寫在第一段就好。',
    requires: ['UNION ALL'], ordered: true,
    solution: `SELECT '員工' AS source_type, emp_id AS id, emp_name AS name FROM employees
UNION ALL
SELECT '專案', proj_id, proj_name FROM projects
ORDER  BY source_type, id`,
  },

  // ── JOIN UPDATE ─────────────────────────────────────────────
  {
    id: 'join-update-1', topicId: 'join-update', difficulty: 3, kind: 'dml', affects: ['employees'],
    title: '依調薪檔更新員工薪資',
    prompt: '把 salary_adjust 裡的 new_salary 套用到 employees.salary。只更新調薪檔裡有的員工，其他人不能動。注意 salary_adjust 裡的 1013 在 employees 並不存在，不可以因此新增資料。',
    hint: '兩種寫法都可以：Oracle 的可更新連接檢視 UPDATE (SELECT … JOIN …) SET a = b，或是相關子查詢 UPDATE … SET col = (SELECT …) WHERE EXISTS (…)。用第二種時千萬別漏掉 WHERE EXISTS，否則沒對到的人薪資會被更新成 NULL。',
    requires: ['UPDATE'], requiresAny: [['JOIN', 'EXISTS', 'IN (', 'MERGE']],
    solution: `UPDATE ( SELECT e.salary     AS old_salary,
                a.new_salary AS new_salary
         FROM   employees e
         JOIN   salary_adjust a ON a.emp_id = e.emp_id )
SET    old_salary = new_salary`,
  },
  {
    id: 'join-update-2', topicId: 'join-update', difficulty: 3, kind: 'dml', affects: ['emp_bonus'],
    title: '用相關子查詢回填獎金',
    prompt: "把 emp_bonus 現有的三筆資料更新：bonus_amt 改成該員工的 salary × 所屬薪資級距的 bonus_rate（級距由 salary 落在 salary_grades 的 min_sal 與 max_sal 之間決定），updated_at 改成 TO_CHAR(SYSDATE, 'YYYY-MM-DD')。grade 欄位維持原值不動。",
    hint: '用 UPDATE emp_bonus b SET b.bonus_amt = (SELECT … WHERE e.emp_id = b.emp_id) 的相關子查詢寫法，並且加上 WHERE EXISTS 保護。本站的 SYSDATE 固定是 2024-09-30。',
    requires: ['UPDATE', 'EXISTS'],
    solution: `UPDATE emp_bonus b
SET    b.bonus_amt = ( SELECT e.salary * g.bonus_rate
                       FROM   employees e
                       JOIN   salary_grades g
                              ON e.salary BETWEEN g.min_sal AND g.max_sal
                       WHERE  e.emp_id = b.emp_id ),
       b.updated_at = TO_CHAR(SYSDATE, 'YYYY-MM-DD')
WHERE  EXISTS ( SELECT 1 FROM employees e WHERE e.emp_id = b.emp_id )`,
  },

  // ── MERGE ───────────────────────────────────────────────────
  {
    id: 'merge-1', topicId: 'merge', difficulty: 3, kind: 'dml', affects: ['emp_bonus'],
    title: 'MERGE 做完整的 UPSERT',
    prompt: "把全部 12 位員工的年終獎金寫進 emp_bonus：已經存在的（1001、1003、1004）更新 bonus_amt、grade、updated_at，不存在的則新增一筆。bonus_amt = salary × 該薪資級距的 bonus_rate，grade 取自 salary_grades，updated_at 一律填 '2024-09-30'。",
    hint: 'USING 後面放一段子查詢（employees JOIN salary_grades），ON 寫 (b.emp_id = s.emp_id)，然後 WHEN MATCHED THEN UPDATE SET … 與 WHEN NOT MATCHED THEN INSERT (…) VALUES (…) 兩個分支都要寫。',
    requires: ['MERGE', 'WHEN MATCHED', 'WHEN NOT MATCHED'],
    solution: `MERGE INTO emp_bonus b
USING ( SELECT e.emp_id,
               e.salary * g.bonus_rate AS bonus_amt,
               g.grade
        FROM   employees e
        JOIN   salary_grades g ON e.salary BETWEEN g.min_sal AND g.max_sal ) s
ON    (b.emp_id = s.emp_id)
WHEN MATCHED THEN
  UPDATE SET b.bonus_amt  = s.bonus_amt,
             b.grade      = s.grade,
             b.updated_at = '2024-09-30'
WHEN NOT MATCHED THEN
  INSERT (emp_id, bonus_amt, grade, updated_at)
  VALUES (s.emp_id, s.bonus_amt, s.grade, '2024-09-30')`,
  },
  {
    id: 'merge-2', topicId: 'merge', difficulty: 3, kind: 'dml', affects: ['employees'],
    title: 'MERGE 只更新、而且只漲不跌',
    prompt: '用 MERGE 把 salary_adjust 套用到 employees，但只有在新薪資「比原本高」的時候才更新（1011 是降薪，必須維持原值 45000）。這題只要 WHEN MATCHED 分支，不要新增任何資料。',
    hint: 'MERGE 的 WHEN MATCHED THEN UPDATE SET … 後面可以再接一個 WHERE，用來篩掉不想更新的列：WHERE a.new_salary > e.salary。',
    requires: ['MERGE', 'WHEN MATCHED'], forbids: ['WHEN NOT MATCHED'],
    solution: `MERGE INTO employees e
USING salary_adjust a
ON    (e.emp_id = a.emp_id)
WHEN MATCHED THEN
  UPDATE SET e.salary = a.new_salary
  WHERE  a.new_salary > e.salary`,
  },
];

export const COMBOS = [
  {
    id: 'combo-1', difficulty: 2, topicIds: ['left-join', 'aggregate', 'group-having', 'nvl', 'case-when'],
    title: '部門薪資總表',
    prompt: '做一張部門總表：dept_id、dept_name、人數 emp_cnt、薪資總額 total_salary（沒有員工時顯示 0）、規模 dept_size（0 人顯示 \'無人\'、3 人以上顯示 \'大部門\'、其餘顯示 \'小部門\'）。所有部門都要出現，依 dept_id 排序。',
    hint: 'LEFT JOIN 保留全部部門 → COUNT(e.emp_id) 才不會把空部門算成 1 → SUM 在沒有列時回傳 NULL，要用 NVL 補 0 → 規模用 CASE WHEN 判斷。',
    requires: ['LEFT JOIN', 'GROUP BY', 'NVL', 'CASE'], ordered: true,
    solution: `SELECT d.dept_id,
       d.dept_name,
       COUNT(e.emp_id)          AS emp_cnt,
       NVL(SUM(e.salary), 0)    AS total_salary,
       CASE WHEN COUNT(e.emp_id) = 0 THEN '無人'
            WHEN COUNT(e.emp_id) >= 3 THEN '大部門'
            ELSE '小部門'
       END AS dept_size
FROM   departments d
LEFT   JOIN employees e ON e.dept_id = d.dept_id
GROUP  BY d.dept_id, d.dept_name
ORDER  BY d.dept_id`,
  },
  {
    id: 'combo-2', difficulty: 2, topicIds: ['exists', 'union'],
    title: '全員專案參與狀態',
    prompt: "把全部 12 位員工標記成兩類：有參與專案的顯示 '有參與'，沒有的顯示 '未參與'。輸出 emp_name 與 status 兩欄，依 status、emp_name 排序。請用 EXISTS / NOT EXISTS 兩段查詢再以 UNION ALL 合併。",
    hint: '第一段 WHERE EXISTS，第二段 WHERE NOT EXISTS，中間用 UNION ALL。因為兩段不會重疊，用 UNION ALL 比 UNION 省事也省成本。',
    requires: ['EXISTS', 'NOT EXISTS', 'UNION ALL'], ordered: true,
    solution: `SELECT e.emp_name, '有參與' AS status
FROM   employees e
WHERE  EXISTS (SELECT 1 FROM emp_projects ep WHERE ep.emp_id = e.emp_id)
UNION ALL
SELECT e.emp_name, '未參與'
FROM   employees e
WHERE  NOT EXISTS (SELECT 1 FROM emp_projects ep WHERE ep.emp_id = e.emp_id)
ORDER  BY status, emp_name`,
  },
  {
    id: 'combo-3', difficulty: 3, topicIds: ['multi-join', 'distinct', 'group-having', 'aggregate'],
    title: '人力吃重的進行中專案',
    prompt: "找出 status 為 'ACTIVE' 且參與人數（不重複員工）至少 2 人的專案，輸出 proj_id、proj_name、負責部門 dept_name、參與人數 member_cnt、總工時 total_hours，依 proj_id 排序。",
    hint: '三張表 JOIN，WHERE 篩 status，GROUP BY 之後用 HAVING COUNT(DISTINCT ep.emp_id) >= 2。DISTINCT 可以寫在聚合函數裡面。',
    requires: ['JOIN', 'DISTINCT', 'GROUP BY', 'HAVING'], ordered: true,
    solution: `SELECT p.proj_id,
       p.proj_name,
       d.dept_name,
       COUNT(DISTINCT ep.emp_id) AS member_cnt,
       SUM(ep.hours)             AS total_hours
FROM   projects p
JOIN   departments  d  ON d.dept_id  = p.dept_id
JOIN   emp_projects ep ON ep.proj_id = p.proj_id
WHERE  p.status = 'ACTIVE'
GROUP  BY p.proj_id, p.proj_name, d.dept_name
HAVING COUNT(DISTINCT ep.emp_id) >= 2
ORDER  BY p.proj_id`,
  },
  {
    id: 'combo-4', difficulty: 3, topicIds: ['minus', 'in-notin'],
    title: '參與 A 案但沒參與 B 案的人',
    prompt: '找出「有參與 9001，但沒有參與 9004」的員工姓名，只輸出 emp_name 一欄，依 emp_name 排序。請用 MINUS 算出員工編號，再用 IN 把姓名查出來。',
    hint: '先用 MINUS 做出一組 emp_id，再把整段放進 WHERE emp_id IN ( … ) 裡面當子查詢。',
    requires: ['MINUS', 'IN'], ordered: true,
    solution: `SELECT emp_name
FROM   employees
WHERE  emp_id IN ( SELECT emp_id FROM emp_projects WHERE proj_id = 9001
                   MINUS
                   SELECT emp_id FROM emp_projects WHERE proj_id = 9004 )
ORDER  BY emp_name`,
  },
  {
    id: 'combo-5', difficulty: 3, topicIds: ['nvl', 'aggregate', 'group-having', 'or', 'in-notin'],
    title: '主要職稱的薪酬概況',
    prompt: "只看職稱以 'MGR' 結尾、或是 job 為 'DEV' 或 'SALES' 的員工，依 job 分組統計：job、人數 cnt、有填獎金比例的人數 with_comm、平均實際總薪 avg_total_pay（salary × (1 + NVL(commission_pct,0))，四捨五入到整數）。依 job 排序。",
    hint: "WHERE 用 job LIKE '%MGR' OR job IN ('DEV','SALES')。with_comm 可以用 SUM(NVL2(commission_pct, 1, 0)) 或 COUNT(commission_pct) 算出來。",
    requires: ['GROUP BY', 'NVL', 'OR', 'IN'], ordered: true,
    solution: `SELECT job,
       COUNT(*)                        AS cnt,
       SUM(NVL2(commission_pct, 1, 0)) AS with_comm,
       ROUND(AVG(salary * (1 + NVL(commission_pct, 0))), 0) AS avg_total_pay
FROM   employees
WHERE  job LIKE '%MGR' OR job IN ('DEV', 'SALES')
GROUP  BY job
ORDER  BY job`,
  },
  {
    id: 'combo-6', difficulty: 3, kind: 'dml', affects: ['employees', 'emp_bonus'],
    topicIds: ['merge', 'join-update', 'multi-join'],
    title: '年度調薪與獎金結算（兩段 DML）',
    prompt: "分兩段完成，中間用分號隔開：\n第一段——用 MERGE 把 salary_adjust 套用到 employees，只有新薪資比原薪高時才更新。\n第二段——用 MERGE 依調整後的薪資重算全部 12 位員工的年終獎金寫入 emp_bonus（bonus_amt = salary × bonus_rate、grade 取自 salary_grades、updated_at 填 '2024-09-30'），已存在的更新、不存在的新增。",
    hint: '第二段的 USING 子查詢要在第一段跑完之後才讀 employees，所以順序不能顛倒。兩段都用 MERGE 即可。',
    requires: ['MERGE', 'WHEN MATCHED', 'WHEN NOT MATCHED'],
    solution: `MERGE INTO employees e
USING salary_adjust a
ON    (e.emp_id = a.emp_id)
WHEN MATCHED THEN
  UPDATE SET e.salary = a.new_salary
  WHERE  a.new_salary > e.salary;

MERGE INTO emp_bonus b
USING ( SELECT e.emp_id,
               e.salary * g.bonus_rate AS bonus_amt,
               g.grade
        FROM   employees e
        JOIN   salary_grades g ON e.salary BETWEEN g.min_sal AND g.max_sal ) s
ON    (b.emp_id = s.emp_id)
WHEN MATCHED THEN
  UPDATE SET b.bonus_amt  = s.bonus_amt,
             b.grade      = s.grade,
             b.updated_at = '2024-09-30'
WHEN NOT MATCHED THEN
  INSERT (emp_id, bonus_amt, grade, updated_at)
  VALUES (s.emp_id, s.bonus_amt, s.grade, '2024-09-30')`,
  },
];

export const ALL_ITEMS = [
  ...EXERCISES.map((e) => ({ ...e, mode: 'single' })),
  ...COMBOS.map((c) => ({ ...c, mode: 'combo', topicId: 'combo' })),
];

export function findItem(id) {
  return ALL_ITEMS.find((x) => x.id === id) || null;
}
