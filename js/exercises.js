// 題庫：每個主題兩題左右，另有跨主題的組合題。
// 判定方式一律「跑你的 SQL，跟參考答案的結果集（或 DML 後的資料狀態）比對」，
// 所以寫法不必跟參考答案一模一樣，只要結果對、而且用到指定語法就算過。

export const TOPICS = [
  {
    id: 'inner-join', name: 'INNER JOIN', group: 'JOIN',
    summary: '只留下兩邊都對得上的資料，對不上的整列消失。',
    syntax: `select e.emp_name, d.dept_name
from employees e
inner join departments d
       on e.dept_id = d.dept_id;

-- INNER 可以省略，JOIN 預設就是 INNER JOIN`,
  },
  {
    id: 'left-join', name: 'LEFT JOIN', group: 'JOIN',
    summary: '左表全留，右表對不到就補 NULL。配合 IS NULL 可做「反向查詢」。',
    syntax: `select d.dept_name, e.emp_name
from departments d
left join employees e on e.dept_id = d.dept_id;

-- 找出「右邊沒有對應資料」的經典寫法
select d.dept_name
from departments d
left join employees e on e.dept_id = d.dept_id
where e.emp_id is null;`,
  },
  {
    id: 'right-join', name: 'RIGHT JOIN', group: 'JOIN',
    summary: '右表全留，左表對不到補 NULL。把兩張表位置對調就等同 LEFT JOIN。',
    syntax: `select e.emp_name, d.dept_name
from departments d
right join employees e on e.dept_id = d.dept_id;

-- 等價於：
-- from employees e left join departments d on e.dept_id = d.dept_id`,
  },
  {
    id: 'full-join', name: 'FULL OUTER JOIN', group: 'JOIN',
    summary: '兩邊都全留，任一邊對不到就補 NULL，用來做「差異比對」。',
    syntax: `select d.dept_name, e.emp_name
from departments d
full outer join employees e on e.dept_id = d.dept_id;

-- 只要兩邊對不起來的列
where d.dept_id is null or e.emp_id is null`,
  },
  {
    id: 'multi-join', name: '多表 JOIN', group: 'JOIN',
    summary: '一路串下去，每個 JOIN 都要有自己的 ON；也可以用不等式做範圍比對。',
    syntax: `select e.emp_name, d.dept_name, p.proj_name
from employees e
join departments  d  on d.dept_id  = e.dept_id
join emp_projects ep on ep.emp_id  = e.emp_id
join projects     p  on p.proj_id  = ep.proj_id;

-- 非等值連接（範圍比對）
join salary_grades g on e.salary between g.min_sal and g.max_sal`,
  },
  {
    id: 'distinct', name: 'DISTINCT', group: '查詢基礎',
    summary: '針對「整列」去重，不是只針對第一個欄位。也能寫在聚合函數裡。',
    syntax: `select distinct job from employees;

select distinct d.dept_id, d.dept_name  -- 兩欄一起去重
from departments d join employees e on e.dept_id = d.dept_id;

select count(distinct dept_id) from employees;`,
  },
  {
    id: 'exists', name: 'EXISTS / NOT EXISTS', group: '子查詢',
    summary: '只問「子查詢有沒有資料」，不看內容，所以裡面寫 SELECT 1 就好。NULL 不會害你。',
    syntax: `select e.emp_name
from employees e
where exists (select 1 from emp_projects ep
               where ep.emp_id = e.emp_id);

select p.proj_name
from projects p
where not exists (select 1 from emp_projects ep
                   where ep.proj_id = p.proj_id);`,
  },
  {
    id: 'case-when', name: 'CASE WHEN', group: '運算式',
    summary: '由上往下第一個成立的 WHEN 勝出。搭配聚合函數就是行轉欄（PIVOT）。',
    syntax: `select emp_name,
       case when salary >= 80000 then '高'
            when salary >= 60000 then '中'
            else '低' end as level
from employees;

-- 行轉欄
select sum(case when job = 'DEV' then 1 else 0 end) as dev_cnt
from employees;`,
  },
  {
    id: 'nvl', name: 'NVL / NVL2', group: '運算式',
    summary: 'NVL(a,b)：a 是 NULL 就換成 b。NVL2(a,b,c)：a 不是 NULL 給 b，是 NULL 給 c。',
    syntax: `select nvl(commission_pct, 0)                    as comm,
       nvl2(email, '已填寫', '未填寫')            as email_status,
       salary * (1 + nvl(commission_pct, 0))     as total_pay
from employees;

-- 相關寫法：COALESCE 可接多個參數、NULLIF 相等時給 NULL`,
  },
  {
    id: 'aggregate', name: '聚合函數', group: '彙總',
    summary: 'COUNT(*) 算列數、COUNT(欄位) 會略過 NULL；SUM / AVG 也都跳過 NULL。',
    syntax: `select count(*)              as 總列數,
       count(commission_pct) as 有填獎金的列數,
       sum(salary), avg(salary), max(salary), min(salary)
from employees;`,
  },
  {
    id: 'group-having', name: 'GROUP BY / HAVING', group: '彙總',
    summary: 'WHERE 在分組前過濾原始列，HAVING 在分組後過濾群組。',
    syntax: `select d.dept_id, d.dept_name, count(*) as cnt
from departments d
join employees e on e.dept_id = d.dept_id
where e.salary > 30000          -- 先篩列
group by d.dept_id, d.dept_name
having count(*) >= 2             -- 再篩群組
order by d.dept_id;`,
  },
  {
    id: 'minus', name: 'MINUS', group: '集合運算',
    summary: 'Oracle 專有，取「在 A 不在 B」。會自動去重，欄位數與型別要對齊。',
    syntax: `select emp_id from employees
minus
select emp_id from emp_projects;

-- 注意：子集合裡有 NULL 時語意容易出錯，建議先 WHERE ... IS NOT NULL`,
  },
  {
    id: 'intersect', name: 'INTERSECT', group: '集合運算',
    summary: '取兩邊的交集，同樣會去重。',
    syntax: `select emp_id from emp_projects where proj_id = 9001
intersect
select emp_id from emp_projects where proj_id = 9004;`,
  },
  {
    id: 'in-notin', name: 'IN / NOT IN', group: '子查詢',
    summary: 'NOT IN 只要子查詢冒出一個 NULL，整個條件就永遠不成立，回傳空集合。',
    syntax: `select emp_name from employees
where dept_id in (select dept_id from departments where location = '台北');

-- 這個陷阱一定要記住：先把 NULL 濾掉
where dept_id not in (select dept_id from projects where dept_id is not null);`,
  },
  {
    id: 'or', name: 'OR', group: '查詢基礎',
    summary: 'AND 的優先順序高於 OR，混用時務必加括號。',
    syntax: `select * from employees
where job = 'DEV' or salary >= 80000;

-- 沒括號的話 AND 會先結合，意思完全不同
where (dept_id = 10 or dept_id = 30) and salary > 50000;`,
  },
  {
    id: 'union', name: 'UNION / UNION ALL', group: '集合運算',
    summary: 'UNION 會排序去重、成本較高；UNION ALL 直接接起來，確定不重複時用它。',
    syntax: `select dept_id from employees where dept_id is not null
union
select dept_id from projects  where dept_id is not null;

select '員工' as src, emp_id, emp_name from employees
union all
select '專案',      proj_id, proj_name from projects;`,
  },
  {
    id: 'join-update', name: 'JOIN UPDATE', group: 'DML',
    summary: 'Oracle 不能直接寫 UPDATE ... FROM，要嘛用可更新連接檢視，要嘛用相關子查詢。',
    syntax: `-- 寫法一：可更新連接檢視（連接欄位必須有唯一鍵）
update ( select e.salary as old_sal, a.new_salary as new_sal
         from employees e
         join salary_adjust a on a.emp_id = e.emp_id )
set old_sal = new_sal;

-- 寫法二：相關子查詢 + EXISTS（最通用，一定要加 WHERE EXISTS，
--         否則沒對到的列會被更新成 NULL）
update employees e
set e.salary = (select a.new_salary from salary_adjust a
                   where a.emp_id = e.emp_id)
where exists     (select 1 from salary_adjust a
                   where a.emp_id = e.emp_id);`,
  },
  {
    id: 'merge', name: 'MERGE / UPSERT', group: 'DML',
    summary: '一句話同時處理「有就更新、沒有就新增」，是 Oracle 做 UPSERT 的標準作法。',
    syntax: `merge into emp_bonus b
using ( select e.emp_id, e.salary * g.bonus_rate as bonus_amt, g.grade
        from employees e
        join salary_grades g
               on e.salary between g.min_sal and g.max_sal ) s
on (b.emp_id = s.emp_id)
when matched then
  update set b.bonus_amt = s.bonus_amt, b.grade = s.grade
  where s.bonus_amt > 0            -- 可選：再加條件
when not matched then
  insert (emp_id, bonus_amt, grade)
  values (s.emp_id, s.bonus_amt, s.grade);`,
  },

  // ── 分析函數（視窗函數）────────────────────────────────────
  {
    id: 'row-number', name: 'ROW_NUMBER', group: '分析函數',
    summary: '依指定順序給每一列一個流水號。加上 PARTITION BY 就是「每組各自從 1 開始編」，是取「每組前 N 名」的標準做法。',
    syntax: `select emp_name, dept_id, salary,
       row_number() over (partition by dept_id order by salary desc) as rn
from employees;

-- 取每個部門薪水最高的那一位：先編號，再包一層在外面篩 rn = 1
select *
from ( select emp_name, dept_id, salary,
              row_number() over (partition by dept_id order by salary desc) as rn
       from employees )
where rn = 1;

-- 注意：視窗函數不能直接寫在 WHERE 裡，一定要包一層子查詢`,
  },
  {
    id: 'rank', name: 'RANK / DENSE_RANK', group: '分析函數',
    summary: '兩個都是排名，差別在並列之後會不會跳號：RANK 會跳、DENSE_RANK 不會。',
    syntax: `select emp_name, salary,
       rank()       over (order by salary desc) as rk,
       dense_rank() over (order by salary desc) as drk,
       row_number() over (order by salary desc) as rn
from employees;

-- 三個人並列第 1 時：
--   rank       → 1, 1, 1, 4
--   dense_rank → 1, 1, 1, 2
--   ROW_NUMBER → 1, 2, 3, 4（一定不重複）`,
  },
  {
    id: 'window-agg', name: '彙總開窗 OVER', group: '分析函數',
    summary: 'COUNT / SUM / AVG 後面接 OVER，資料就不會被併成一列，而是「每一列都帶著那一組的統計值」。',
    syntax: `-- 每一列都帶自己部門的平均薪資，筆數不變
select emp_name, dept_id, salary,
       avg(salary) over (partition by dept_id) as dept_avg
from employees;

-- 累計加總：加上 ORDER BY 就變成「到目前這一列為止」
select emp_id, salary,
       sum(salary) over (order by emp_id
                         rows between unbounded preceding and current row) as running
from employees;

-- OVER () 留空就是「整份資料」，常拿來算佔比
select emp_name, salary * 100.0 / sum(salary) over () as pct from employees;`,
  },
  {
    id: 'lag-lead', name: 'LAG / LEAD', group: '分析函數',
    summary: '直接讀「上一列」或「下一列」的值，算差額、比較前後期都靠它，不用自我連接。',
    syntax: `select emp_name, hire_date,
       lag(hire_date)  over (order by hire_date) as prev_hire,
       lead(hire_date) over (order by hire_date) as next_hire
from employees;

-- 第二個參數是往前／往後幾列，第三個是沒有值時的替代值
lag(salary, 1, 0) over (partition by dept_id order by salary desc)`,
  },
  {
    id: 'ntile-firstlast', name: 'NTILE / FIRST_VALUE', group: '分析函數',
    summary: 'NTILE 把資料平均切成 n 份（分位數），FIRST_VALUE / LAST_VALUE 抓視窗裡的頭尾那一列。',
    syntax: `-- 依薪資把全體切成 4 組，1 是最低的那一組
select emp_name, salary, ntile(4) over (order by salary) as quartile from employees;

-- 每一列都帶出「自己部門薪水最高的人是誰」
select emp_name, dept_id,
       first_value(emp_name) over (partition by dept_id order by salary desc) as top_earner
from employees;

-- LAST_VALUE 預設的視窗只看到「目前這一列為止」，要自己把範圍開到底
last_value(emp_name) over (partition by dept_id order by salary desc
                           rows between unbounded preceding and unbounded following)`,
  },

  // ── 進階查詢 ─────────────────────────────────────────────
  {
    id: 'with-cte', name: 'WITH（CTE）', group: '進階查詢',
    summary: '把子查詢先取名放在最前面，後面就能像一張表一樣重複使用，長查詢會好讀非常多。',
    syntax: `with dept_avg as (
  select dept_id, avg(salary) as avg_sal
  from employees
  group by dept_id
)
select e.emp_name, e.salary, d.avg_sal
from employees e
join dept_avg d on d.dept_id = e.dept_id
where e.salary > d.avg_sal;

-- 可以一次定義多個，用逗號隔開，後面的能引用前面的
with a as ( select ... ),
     b as ( select * from a where ... )
select * from b;`,
  },
  {
    id: 'hierarchy', name: 'CONNECT BY 階層查詢', group: '進階查詢',
    summary: 'Oracle 專屬的樹狀展開：START WITH 指定起點、CONNECT BY PRIOR 指定「誰接在誰下面」，LEVEL 是目前層數。',
    syntax: `select level, emp_id, emp_name, manager_id
from employees
start with manager_id is null          -- 從沒有主管的人開始
connect by prior emp_id = manager_id   -- 上一層的 emp_id = 這一層的 manager_id
order by level, emp_id;

-- SYS_CONNECT_BY_PATH 會把一路走下來的值串成路徑
select level, sys_connect_by_path(emp_name, '/') as path
from employees
start with emp_id = 1003
connect by prior emp_id = manager_id;

-- 本站把它改寫成 WITH RECURSIVE 執行，單表階層查詢可用；
-- ORDER SIBLINGS BY 會退化成一般 ORDER BY，層數上限 100 層。`,
  },
  {
    id: 'inline-view', name: '內嵌視圖 / 純量子查詢', group: '進階查詢',
    summary: '子查詢可以放在 FROM 裡當一張暫時的表（內嵌視圖），也可以放在 SELECT 裡當一個值（純量子查詢）。',
    syntax: `-- 內嵌視圖：先聚合，再對聚合結果篩選
select *
from ( select dept_id, count(*) as cnt from employees group by dept_id )
where cnt >= 3;

-- 純量子查詢：放在 SELECT 裡，只能回傳「一列一欄」，否則會報錯
select e.emp_name,
       (select d.dept_name from departments d where d.dept_id = e.dept_id) as dept_name
from employees e;`,
  },
  {
    id: 'correlated', name: '關聯子查詢', group: '進階查詢',
    summary: '子查詢裡引用到外層的欄位，就變成「外層每跑一列、裡面就重算一次」。EXISTS 幾乎都是這樣用的。',
    syntax: `-- 找出薪水高於「自己部門平均」的員工
select e.emp_name, e.salary
from employees e
where e.salary > ( select avg(x.salary)
                    from employees x
                    where x.dept_id = e.dept_id );  -- 這行引用了外層的 e，就是關聯

-- 關聯子查詢也可以放在 SELECT 裡當計數器
select e.emp_name,
       (select count(*) from emp_projects p where p.emp_id = e.emp_id) as proj_cnt
from employees e;`,
  },
  {
    id: 'any-all', name: 'ANY / ALL', group: '進階查詢',
    summary: '拿一個值去跟子查詢回傳的「一整組值」比較。ALL 是「全部都要成立」，ANY 是「有一個成立就算」。',
    syntax: `-- 薪水比業務部（10）每一個人都高
select emp_name from employees
where salary > all (select salary from employees where dept_id = 10);

-- 薪水只要比研發部（20）隨便哪一個人高就算
select emp_name from employees
where salary > any (select salary from employees where dept_id = 20);

-- = ANY 等同 IN，<> ALL 等同 NOT IN（SOME 是 ANY 的同義字）`,
  },
  {
    id: 'self-join', name: '自我連接', group: '進階查詢',
    summary: '同一張表 JOIN 自己，用不同別名當分身。最常見的就是「員工對主管」。',
    syntax: `select e.emp_name as 員工, m.emp_name as 主管
from employees e
left join employees m on m.emp_id = e.manager_id;

-- 找同一位主管底下的同事配對，用 a.emp_id < b.emp_id 避免重複與自己配自己
select a.emp_name, b.emp_name
from employees a
join employees b on b.manager_id = a.manager_id and a.emp_id < b.emp_id;`,
  },
  {
    id: 'cross-nonequi', name: 'CROSS JOIN / 非等值連接', group: '進階查詢',
    summary: 'CROSS JOIN 產生所有組合（笛卡兒積）；非等值連接是 ON 裡面不用 =，最常見是拿 BETWEEN 去對級距表。',
    syntax: `-- 非等值連接：把薪水對到級距（salary_grades 上沒有外鍵）
select e.emp_name, e.salary, g.grade
from employees e
join salary_grades g on e.salary between g.min_sal and g.max_sal;

-- CROSS JOIN：5 個部門 × 4 個級距 = 20 種組合
select d.dept_name, g.grade
from departments d cross join salary_grades g;`,
  },

  // ── 查詢基礎（補充）──────────────────────────────────────
  {
    id: 'like-between', name: 'LIKE / BETWEEN / IS NULL', group: '查詢基礎',
    summary: '模糊比對用 LIKE（% 任意長度、_ 剛好一個字），範圍用 BETWEEN（含頭含尾），NULL 只能用 IS NULL 判斷。',
    syntax: `select * from employees where job like '%MGR';       -- 結尾是 MGR
select * from employees where emp_name like '王_';    -- 王 + 剛好一個字
select * from employees where salary between 50000 and 80000;  -- 含 50000 與 80000
select * from employees where email is null;          -- = NULL 永遠不成立，一定要用 IS NULL`,
  },
  {
    id: 'top-n', name: 'Top-N 與分頁', group: '查詢基礎',
    summary: 'Oracle 12c 之後用 FETCH FIRST n ROWS ONLY，分頁再加 OFFSET；12c 之前只能用 ROWNUM 包一層子查詢。',
    syntax: `-- 12c 之後的寫法
select emp_name, salary from employees
order by salary desc
fetch first 3 rows only;

-- 分頁：跳過 3 筆再取 3 筆
select emp_name, salary from employees
order by salary desc
offset 3 rows fetch next 3 rows only;

-- 舊寫法：ROWNUM 是「取出來才編號」，必須排序完才篩，所以要包一層
select * from ( select emp_name, salary from employees order by salary desc )
where rownum <= 3;`,
  },
  {
    id: 'order-null', name: 'ORDER BY 與 NULL 排序', group: '查詢基礎',
    summary: 'Oracle 預設 ASC 時 NULL 排最後、DESC 時 NULL 排最前，可以用 NULLS FIRST / NULLS LAST 自己指定。',
    syntax: `select emp_name, commission_pct from employees order by commission_pct;        -- NULL 在最後
select emp_name, commission_pct from employees order by commission_pct desc;   -- NULL 在最前
select emp_name, commission_pct from employees order by commission_pct nulls first;

-- 也可以用別名或欄位序號排序
select dept_id, count(*) as cnt from employees group by dept_id order by cnt desc, 1;`,
  },

  // ── 函數 ────────────────────────────────────────────────
  {
    id: 'string-func', name: '字串函數', group: '函數',
    summary: '串接用 ||，切字串 SUBSTR、找位置 INSTR、補齊 LPAD / RPAD、大小寫 UPPER / LOWER / INITCAP、長度 LENGTH、替換 REPLACE。',
    syntax: `select emp_name || '（' || job || '）'      as label,
       substr(emp_name, 1, 1)               as 姓,
       instr(email, '@')                    as at_pos,
       upper(job), lower(job), initcap(job),
       length(emp_name)                     as 字數,
       lpad(emp_id, 8, '0')                 as padded,
       replace(email, '@example.com', '')   as account,
       trim(emp_name)
from employees;`,
  },
  {
    id: 'date-func', name: '日期函數', group: '函數',
    summary: 'TO_CHAR 轉字串、EXTRACT 抓年月日、MONTHS_BETWEEN 算月數差、ADD_MONTHS 加月、LAST_DAY 取月底、TRUNC 砍到月初。',
    syntax: `select hire_date,
       to_char(hire_date, 'YYYY-MM')              as ym,
       extract(year  from hire_date)              as y,
       extract(month from hire_date)              as m,
       round(months_between(sysdate, hire_date))  as 年資月數,
       add_months(hire_date, 3)                   as 三個月後,
       last_day(hire_date)                        as 當月月底,
       trunc(hire_date, 'MM')                     as 當月月初
from employees;

-- 本站的 SYSDATE 固定在 2024-09-30，答案才不會隔天就變`,
  },
  {
    id: 'number-func', name: '數值函數', group: '函數',
    summary: 'ROUND 四捨五入、TRUNC 直接砍掉、MOD 取餘數、CEIL / FLOOR 進位與捨去、ABS 絕對值、POWER / SQRT。',
    syntax: `select round(1234.567, 1)   as a,   -- 1234.6
       trunc(1234.567, 1)   as b,   -- 1234.5（不四捨五入）
       trunc(1234567, -3)   as c,   -- 1234000（負數是砍整數位）
       mod(10, 3)           as d,   -- 1
       ceil(1.2), floor(1.8), abs(-5), power(2, 10), sqrt(16)
from dual;`,
  },
  {
    id: 'listagg', name: 'LISTAGG', group: '函數',
    summary: '把同一組的多列值串成一個字串，做「部門成員名單」這種輸出最好用。',
    syntax: `select dept_id,
       listagg(emp_name, '、') within group (order by emp_id) as members
from employees
group by dept_id;

-- WITHIN GROUP (ORDER BY ...) 決定串起來的順序，不能省`,
  },
  {
    id: 'coalesce', name: 'COALESCE / NULLIF', group: '函數',
    summary: 'COALESCE 回傳第一個不是 NULL 的值（參數可以很多個，NVL 只能兩個）；NULLIF 在兩值相等時回 NULL。',
    syntax: `select coalesce(email, phone, '（未提供）') as contact from ...;

-- NULLIF 最常拿來擋除以零：分母是 0 就變成 NULL，整個算式回 NULL 而不是報錯
select total / nullif(head_count, 0) as per_head from ...;`,
  },

  // ── DML（補充）──────────────────────────────────────────
  {
    id: 'insert-delete', name: 'INSERT / DELETE', group: 'DML',
    summary: 'INSERT 可以直接給值，也可以 INSERT … SELECT 把一整段查詢的結果灌進去；DELETE 永遠記得先寫 WHERE。',
    syntax: `insert into emp_bonus (emp_id, bonus_amt, grade, updated_at)
values (1010, 3000, 'C', '2024-09-30');

-- 從查詢結果批次新增
insert into emp_bonus (emp_id, bonus_amt, grade, updated_at)
select e.emp_id, e.salary * g.bonus_rate, g.grade, '2024-09-30'
from employees e
join salary_grades g on e.salary between g.min_sal and g.max_sal
where e.emp_id not in (select emp_id from emp_bonus);

-- 刪掉在另一張表對不到的孤兒資料
delete from salary_adjust
where not exists (select 1 from employees e where e.emp_id = salary_adjust.emp_id);`,
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
    solution: `select
  e.emp_id,
  e.emp_name,
  d.dept_name
from employees e
inner join departments d on e.dept_id = d.dept_id
order by e.emp_id`,
  },
  {
    id: 'inner-join-2', topicId: 'inner-join', difficulty: 2,
    title: '進行中的專案與負責部門',
    prompt: "列出所有 status 為 'ACTIVE' 的專案，顯示 proj_name、負責部門的 dept_name 與 budget。依 proj_id 排序。",
    hint: 'JOIN 的 ON 只寫連接條件，篩選 status 的條件放在 WHERE 比較好讀。',
    requires: ['JOIN'], ordered: true,
    solution: `select
  p.proj_name,
  d.dept_name,
  p.budget
from projects p
join departments d on p.dept_id = d.dept_id
where p.status = 'ACTIVE'
order by p.proj_id`,
  },

  // ── LEFT JOIN ───────────────────────────────────────────────
  {
    id: 'left-join-1', topicId: 'left-join', difficulty: 1,
    title: '部門名冊（含空部門）',
    prompt: '列出所有部門的 dept_id、dept_name 及底下每位員工的 emp_name。沒有任何員工的部門也要出現一列，emp_name 留 NULL。依 dept_id、emp_name 排序。',
    hint: '以 departments 當左表做 LEFT JOIN。如果用 INNER JOIN，沒有員工的部門就會整個不見。',
    requires: ['LEFT JOIN'], ordered: true,
    solution: `select
  d.dept_id,
  d.dept_name,
  e.emp_name
from departments d
left join employees e on e.dept_id = d.dept_id
order by d.dept_id,e.emp_name`,
  },
  {
    id: 'left-join-2', topicId: 'left-join', difficulty: 2,
    title: '找出沒有員工的部門',
    prompt: '找出目前沒有任何員工的部門，顯示 dept_id 與 dept_name，依 dept_id 排序。請用 LEFT JOIN 搭配 IS NULL 的反連接寫法完成。',
    hint: 'LEFT JOIN 之後，右表對不到的列所有欄位都會是 NULL，因此 WHERE e.emp_id IS NULL 就等於「這個部門沒有員工」。',
    requires: ['LEFT JOIN', 'IS NULL'], ordered: true,
    solution: `select
  d.dept_id,
  d.dept_name
from departments d
left join employees e on e.dept_id = d.dept_id
where e.emp_id is null
order by d.dept_id`,
  },

  // ── RIGHT JOIN ──────────────────────────────────────────────
  {
    id: 'right-join-1', topicId: 'right-join', difficulty: 1,
    title: '全體員工與部門（右表全留）',
    prompt: '以 departments 為左表、employees 為右表做 RIGHT JOIN，列出 emp_id、emp_name、dept_name。沒有部門的員工也要出現，dept_name 為 NULL。依 emp_id 排序。',
    hint: 'RIGHT JOIN 保留右表全部的列。這題刻意讓你體會：它跟「employees LEFT JOIN departments」結果是一樣的。',
    requires: ['RIGHT JOIN'], ordered: true,
    solution: `select
  e.emp_id,
  e.emp_name,
  d.dept_name
from departments d
right join employees e on e.dept_id = d.dept_id
order by e.emp_id`,
  },
  {
    id: 'right-join-2', topicId: 'right-join', difficulty: 2,
    title: '找出沒有掛部門的專案',
    prompt: '用 RIGHT JOIN 找出 dept_id 是空的專案，顯示 proj_id 與 proj_name，依 proj_id 排序。',
    hint: '把 projects 放在 RIGHT 那一側全部留下，再用 WHERE d.dept_id IS NULL 篩出對不到部門的專案。',
    requires: ['RIGHT JOIN', 'IS NULL'], ordered: true,
    solution: `select
  p.proj_id,
  p.proj_name
from departments d
right join projects p on d.dept_id = p.dept_id
where d.dept_id is null
order by p.proj_id`,
  },

  // ── FULL OUTER JOIN ─────────────────────────────────────────
  {
    id: 'full-join-1', topicId: 'full-join', difficulty: 2,
    title: '部門與員工的完整對照表',
    prompt: '用 FULL OUTER JOIN 列出 dept_id、dept_name、emp_id、emp_name。沒有員工的部門、沒有部門的員工，兩種都要出現。依 dept_id、emp_id 排序。',
    hint: 'FULL OUTER JOIN 等於 LEFT JOIN 的結果再聯集 RIGHT JOIN 的結果。Oracle 的排序預設把 NULL 放最後。',
    requires: ['FULL'], ordered: true,
    solution: `select
  d.dept_id,
  d.dept_name,
  e.emp_id,
  e.emp_name
from departments d
full outer join employees e on e.dept_id = d.dept_id
order by d.dept_id,e.emp_id`,
  },
  {
    id: 'full-join-2', topicId: 'full-join', difficulty: 3,
    title: '只列出兩邊對不起來的資料',
    prompt: '用 FULL OUTER JOIN 找出「沒有員工的部門」與「沒有部門的員工」，顯示 dept_name 與 emp_name 兩欄，依 dept_name、emp_name 排序。',
    hint: '先 FULL OUTER JOIN，再用 WHERE d.dept_id IS NULL OR e.emp_id IS NULL 把配對成功的列濾掉。這是資料對帳最常用的手法。',
    requires: ['FULL', 'OR'], ordered: true,
    solution: `select
  d.dept_name,
  e.emp_name
from departments d
full outer join employees e on e.dept_id = d.dept_id
where d.dept_id is null or e.emp_id is null
order by d.dept_name,e.emp_name`,
  },

  // ── 多表 JOIN ────────────────────────────────────────────────
  {
    id: 'multi-join-1', topicId: 'multi-join', difficulty: 2,
    title: '四張表串起來',
    prompt: '列出每一筆專案參與紀錄：員工姓名 emp_name、部門名稱 dept_name、專案名稱 proj_name、投入工時 hours。依 emp_id、proj_id 排序。',
    hint: 'employees → departments → emp_projects → projects，四張表三個 JOIN，每個 JOIN 都要有自己的 ON。',
    requires: ['JOIN'], ordered: true,
    solution: `select
  e.emp_name,
  d.dept_name,
  p.proj_name,
  ep.hours
from employees e
join departments d on d.dept_id = e.dept_id
join emp_projects ep on ep.emp_id = e.emp_id
join projects p on p.proj_id = ep.proj_id
order by e.emp_id,p.proj_id`,
  },
  {
    id: 'multi-join-2', topicId: 'multi-join', difficulty: 3,
    title: '非等值連接：查出薪資級距',
    prompt: '列出有部門的員工其 emp_name、dept_name 與所屬薪資級距 grade。級距判定方式是 salary 落在 salary_grades 的 min_sal 與 max_sal 之間。依 emp_id 排序。',
    hint: 'JOIN 的 ON 不一定要用等號，可以寫 ON e.salary BETWEEN g.min_sal AND g.max_sal，這叫非等值連接。',
    requires: ['JOIN', 'BETWEEN'], ordered: true,
    solution: `select
  e.emp_name,
  d.dept_name,
  g.grade
from employees e
join departments d on d.dept_id = e.dept_id
join salary_grades g on e.salary between g.min_sal and g.max_sal
order by e.emp_id`,
  },

  // ── DISTINCT ────────────────────────────────────────────────
  {
    id: 'distinct-1', topicId: 'distinct', difficulty: 1,
    title: '不重複的職稱清單',
    prompt: '列出 employees 裡出現過的所有 job，不可重複，依 job 排序。',
    hint: 'SELECT DISTINCT job FROM employees。注意 DEV 與 SALES 各有兩個人。',
    requires: ['DISTINCT'], ordered: true,
    solution: `select distinct job
from employees
order by job`,
  },
  {
    id: 'distinct-2', topicId: 'distinct', difficulty: 2,
    title: '有人參與專案的部門',
    prompt: '列出「底下至少有一位員工參與過專案」的部門，顯示 dept_id 與 dept_name，不可重複，依 dept_id 排序。',
    hint: 'JOIN 之後同一個部門會出現很多次，用 DISTINCT 對兩個欄位一起去重。',
    requires: ['DISTINCT', 'JOIN'], ordered: true,
    solution: `select distinct
  d.dept_id,
  d.dept_name
from departments d
join employees e on e.dept_id = d.dept_id
join emp_projects ep on ep.emp_id = e.emp_id
order by d.dept_id`,
  },

  // ── EXISTS / NOT EXISTS ─────────────────────────────────────
  {
    id: 'exists-1', topicId: 'exists', difficulty: 2,
    title: '有參與專案的員工',
    prompt: '找出有參與任何專案的員工，顯示 emp_id 與 emp_name，依 emp_id 排序。請用 EXISTS 完成，不要用 JOIN。',
    hint: 'WHERE EXISTS (SELECT 1 FROM emp_projects ep WHERE ep.emp_id = e.emp_id)。子查詢裡選什麼都無所謂，EXISTS 只問「有沒有列」。',
    requires: ['EXISTS'], forbids: ['JOIN'], ordered: true,
    solution: `select
  e.emp_id,
  e.emp_name
from employees e
where exists (select 1 from emp_projects ep where ep.emp_id = e.emp_id)
order by e.emp_id`,
  },
  {
    id: 'exists-2', topicId: 'exists', difficulty: 2,
    title: '沒有任何成員的專案',
    prompt: '找出目前沒有任何成員的專案，顯示 proj_id 與 proj_name，依 proj_id 排序。請用 NOT EXISTS 完成。',
    hint: 'NOT EXISTS 與 NOT IN 不同：即使子查詢裡有 NULL，NOT EXISTS 仍然會正確運作。',
    requires: ['NOT EXISTS'], ordered: true,
    solution: `select
  p.proj_id,
  p.proj_name
from projects p
where not exists (select 1 from emp_projects ep where ep.proj_id = p.proj_id)
order by p.proj_id`,
  },

  // ── CASE WHEN ───────────────────────────────────────────────
  {
    id: 'case-when-1', topicId: 'case-when', difficulty: 1,
    title: '薪資分級',
    prompt: "列出 emp_name、salary，以及一個名為 salary_level 的欄位：salary >= 80000 顯示 '高'，>= 60000 顯示 '中'，其餘顯示 '低'。依 emp_id 排序。",
    hint: 'CASE WHEN 由上往下比，第一個成立的就勝出，所以條件要由嚴到寬排列。',
    requires: ['CASE', 'WHEN'], ordered: true,
    solution: `select
  emp_name,
  salary,
  case when salary >= 80000 then '高' when salary >= 60000 then '中' else '低' end as salary_level
from employees
order by emp_id`,
  },
  {
    id: 'case-when-2', topicId: 'case-when', difficulty: 3,
    title: '用 CASE 做行轉欄統計',
    prompt: "統計每個部門的 dept_id、dept_name、工程職人數 dev_cnt（job 以 'DEV' 開頭）與業務職人數 sales_cnt（job 以 'SALES' 開頭）。沒有員工的部門也要出現，數字為 0。依 dept_id 排序。",
    hint: "把 CASE WHEN 包在 SUM() 裡面：SUM(CASE WHEN job LIKE 'DEV%' THEN 1 ELSE 0 END)。部門要全留所以用 LEFT JOIN。",
    requires: ['CASE', 'SUM'], ordered: true,
    solution: `select
  d.dept_id,
  d.dept_name,
  sum(case when e.job like 'DEV%' then 1 else 0 end) as dev_cnt,
  sum(case when e.job like 'SALES%' then 1 else 0 end) as sales_cnt
from departments d
left join employees e on e.dept_id = d.dept_id
group by d.dept_id,d.dept_name
order by d.dept_id`,
  },

  // ── NVL / NVL2 ──────────────────────────────────────────────
  {
    id: 'nvl-1', topicId: 'nvl', difficulty: 1,
    title: 'NVL：把 NULL 當成 0 來算',
    prompt: '列出 emp_name、salary、獎金比例 comm（commission_pct 為 NULL 時顯示 0），以及實際總薪 total_pay = salary × (1 + 獎金比例)。依 emp_id 排序。',
    hint: '直接用 salary * (1 + commission_pct) 的話，只要 commission_pct 是 NULL，整個算式就是 NULL。要先用 NVL 補 0。',
    requires: ['NVL'], ordered: true,
    solution: `select
  emp_name,
  salary,
  nvl(commission_pct, 0) as comm,
  salary * (1 + nvl(commission_pct, 0)) as total_pay
from employees
order by emp_id`,
  },
  {
    id: 'nvl-2', topicId: 'nvl', difficulty: 2,
    title: 'NVL2：依「是不是 NULL」給不同結果',
    prompt: "列出 emp_name、email_status（email 有值顯示 '已填寫'，NULL 顯示 '未填寫'）與 bonus（commission_pct 有值時為 salary × commission_pct，NULL 時為 0）。依 emp_id 排序。",
    hint: 'NVL2(運算式, 不是NULL時的值, 是NULL時的值)，剛好三個參數，順序別記反了。',
    requires: ['NVL2'], ordered: true,
    solution: `select
  emp_name,
  nvl2(email, '已填寫', '未填寫') as email_status,
  nvl2(commission_pct, salary * commission_pct, 0) as bonus
from employees
order by emp_id`,
  },

  // ── 聚合函數 ─────────────────────────────────────────────────
  {
    id: 'aggregate-1', topicId: 'aggregate', difficulty: 1,
    title: '五個聚合函數一次用',
    prompt: '對 employees 做整體統計，依序輸出：emp_cnt（總人數）、comm_cnt（commission_pct 有填的人數）、total_salary（薪資總和）、avg_salary（平均薪資，四捨五入到小數 2 位）、max_salary、min_salary。',
    hint: 'COUNT(*) 算的是列數；COUNT(commission_pct) 會自動略過 NULL，兩個數字不一樣正是重點。',
    requires: ['COUNT', 'SUM', 'AVG', 'MAX', 'MIN'], ordered: false,
    solution: `select
  count(*) as emp_cnt,
  count(commission_pct) as comm_cnt,
  sum(salary) as total_salary,
  round(avg(salary), 2) as avg_salary,
  max(salary) as max_salary,
  min(salary) as min_salary
from employees`,
  },
  {
    id: 'aggregate-2', topicId: 'aggregate', difficulty: 2,
    title: '每個專案的人力統計',
    prompt: '列出每個專案的 proj_id、proj_name、成員數 member_cnt、總工時 total_hours、單人最高工時 max_hours。沒有成員的專案也要出現（成員數 0、工時為 NULL）。依 proj_id 排序。',
    hint: '用 LEFT JOIN 保留所有專案，並且要用 COUNT(ep.emp_id) 而不是 COUNT(*)，否則沒有成員的專案會被算成 1。',
    requires: ['COUNT', 'SUM', 'MAX', 'LEFT JOIN'], ordered: true,
    solution: `select
  p.proj_id,
  p.proj_name,
  count(ep.emp_id) as member_cnt,
  sum(ep.hours) as total_hours,
  max(ep.hours) as max_hours
from projects p
left join emp_projects ep on ep.proj_id = p.proj_id
group by p.proj_id,p.proj_name
order by p.proj_id`,
  },

  // ── GROUP BY / HAVING ───────────────────────────────────────
  {
    id: 'group-having-1', topicId: 'group-having', difficulty: 2,
    title: '人數兩人以上的部門',
    prompt: '統計各部門的 dept_id、dept_name、人數 emp_cnt 與平均薪資 avg_salary（四捨五入到整數），只保留人數 2 人以上的部門，依 dept_id 排序。',
    hint: '過濾「群組」的條件要寫在 HAVING，不能寫在 WHERE；WHERE 是在分組之前作用的。',
    requires: ['GROUP BY', 'HAVING'], ordered: true,
    solution: `select
  d.dept_id,
  d.dept_name,
  count(*) as emp_cnt,
  round(avg(e.salary), 0) as avg_salary
from departments d
join employees e on e.dept_id = d.dept_id
group by d.dept_id,d.dept_name
having count(*) >= 2
order by d.dept_id`,
  },
  {
    id: 'group-having-2', topicId: 'group-having', difficulty: 2,
    title: '薪資總額破九萬的職稱',
    prompt: '依 job 分組，列出 job、人數 cnt、薪資總額 total，只保留薪資總額大於 90000 的職稱，依 job 排序。',
    hint: 'HAVING 裡面可以直接寫聚合函數：HAVING SUM(salary) > 90000。',
    requires: ['GROUP BY', 'HAVING', 'SUM'], ordered: true,
    solution: `select
  job,
  count(*) as cnt,
  sum(salary) as total
from employees
group by job
having sum(salary) > 90000
order by job`,
  },

  // ── MINUS ───────────────────────────────────────────────────
  {
    id: 'minus-1', topicId: 'minus', difficulty: 2,
    title: 'MINUS 找出沒有員工的部門',
    prompt: '用 MINUS 找出「沒有任何員工」的部門代碼，只輸出 dept_id 一欄，依 dept_id 排序。',
    hint: '所有部門的 dept_id 減掉「員工資料裡出現過的 dept_id」。記得在第二段加上 WHERE dept_id IS NOT NULL，避免 NULL 干擾。',
    requires: ['MINUS'], ordered: true,
    solution: `select dept_id
from departments
minus
select dept_id
from employees
where dept_id is not null
order by dept_id`,
  },
  {
    id: 'minus-2', topicId: 'minus', difficulty: 2,
    title: 'MINUS 找出沒參與專案的員工',
    prompt: '用 MINUS 找出沒有參與任何專案的員工編號，只輸出 emp_id 一欄，依 emp_id 排序。這題請不要使用 NOT EXISTS 或 NOT IN。',
    hint: '全體員工的 emp_id 減掉 emp_projects 裡的 emp_id。MINUS 會自動去重，不必再加 DISTINCT。',
    requires: ['MINUS'], forbids: ['NOT EXISTS', 'NOT IN'], ordered: true,
    solution: `select emp_id
from employees
minus
select emp_id
from emp_projects
order by emp_id`,
  },

  // ── INTERSECT ───────────────────────────────────────────────
  {
    id: 'intersect-1', topicId: 'intersect', difficulty: 2,
    title: '同時參與兩個專案的人',
    prompt: '用 INTERSECT 找出同時參與 9001 與 9004 兩個專案的員工編號，只輸出 emp_id 一欄，依 emp_id 排序。',
    hint: '把「參與 9001 的人」與「參與 9004 的人」兩個集合取交集。',
    requires: ['INTERSECT'], ordered: true,
    solution: `select emp_id
from emp_projects
where proj_id = 9001
intersect
select emp_id
from emp_projects
where proj_id = 9004
order by emp_id`,
  },
  {
    id: 'intersect-2', topicId: 'intersect', difficulty: 3,
    title: '既是部門主管又有參與專案',
    prompt: '用 INTERSECT 找出「同時是某部門主管（出現在 departments.manager_id）」且「有參與專案」的員工編號，欄位名稱請用 emp_id，依 emp_id 排序。',
    hint: 'departments 那一段要寫 SELECT manager_id AS emp_id，並排除 manager_id 為 NULL 的部門。',
    requires: ['INTERSECT'], ordered: true,
    solution: `select manager_id as emp_id
from departments
where manager_id is not null
intersect
select emp_id
from emp_projects
order by emp_id`,
  },

  // ── IN / NOT IN ─────────────────────────────────────────────
  {
    id: 'in-notin-1', topicId: 'in-notin', difficulty: 1,
    title: 'IN 搭配子查詢',
    prompt: "找出在台北上班的員工（部門 location 為 '台北'），顯示 emp_id 與 emp_name，依 emp_id 排序。請用 IN 搭配子查詢完成，不要用 JOIN 或 EXISTS。",
    hint: 'WHERE dept_id IN (SELECT dept_id FROM departments WHERE location = ...)。',
    requires: ['IN'], forbids: ['JOIN', 'EXISTS'], ordered: true,
    solution: `select
  e.emp_id,
  e.emp_name
from employees e
where e.dept_id in (select d.dept_id from departments d where d.location = '台北')
order by e.emp_id`,
  },
  {
    id: 'in-notin-2', topicId: 'in-notin', difficulty: 3,
    title: 'NOT IN 的 NULL 陷阱',
    prompt: '找出「沒有負責任何專案」的部門，顯示 dept_id 與 dept_name，依 dept_id 排序。請用 NOT IN 完成。注意 projects.dept_id 裡面有 NULL。',
    hint: '只要 NOT IN 的子查詢冒出一個 NULL，整個條件的結果就是 UNKNOWN，查出來一列都沒有。解法是在子查詢加上 WHERE dept_id IS NOT NULL。',
    requires: ['NOT IN'], ordered: true,
    solution: `select
  d.dept_id,
  d.dept_name
from departments d
where d.dept_id not in (select p.dept_id from projects p where p.dept_id is not null)
order by d.dept_id`,
  },

  // ── OR ──────────────────────────────────────────────────────
  {
    id: 'or-1', topicId: 'or', difficulty: 1,
    title: '兩個條件擇一成立',
    prompt: "找出 job 等於 'DEV' 或是 salary 大於等於 80000 的員工，顯示 emp_id、emp_name、job、salary，依 emp_id 排序。",
    hint: '兩個條件用 OR 串起來即可，只要任一成立就會被選中。',
    requires: ['OR'], ordered: true,
    solution: `select
  emp_id,
  emp_name,
  job,
  salary
from employees
where job = 'DEV' or salary >= 80000
order by emp_id`,
  },
  {
    id: 'or-2', topicId: 'or', difficulty: 2,
    title: 'OR 與 AND 的優先順序',
    prompt: '找出「部門是 10 或 30」而且「薪資大於 50000」的員工，顯示 emp_id、emp_name、dept_id、job、salary，依 emp_id 排序。',
    hint: 'AND 的優先順序高於 OR。如果寫成 dept_id = 10 OR dept_id = 30 AND salary > 50000，會被解讀成 dept_id = 10 OR (dept_id = 30 AND salary > 50000)，答案就錯了。記得加括號。',
    requires: ['OR'], ordered: true,
    solution: `select
  emp_id,
  emp_name,
  dept_id,
  job,
  salary
from employees
where (dept_id = 10 or dept_id = 30) and salary > 50000
order by emp_id`,
  },

  // ── UNION / UNION ALL ───────────────────────────────────────
  {
    id: 'union-1', topicId: 'union', difficulty: 1,
    title: 'UNION 會自動去重',
    prompt: '用 UNION 列出「員工資料中出現過的部門代碼」與「專案資料中出現過的部門代碼」的聯集，只輸出 dept_id 一欄，兩邊都要排除 NULL，依 dept_id 排序。',
    hint: 'UNION 會把兩邊的結果合併後去除重複列，所以同一個 dept_id 只會出現一次。',
    requires: ['UNION'], ordered: true,
    solution: `select dept_id
from employees
where dept_id is not null
union
select dept_id
from projects
where dept_id is not null
order by dept_id`,
  },
  {
    id: 'union-2', topicId: 'union', difficulty: 2,
    title: 'UNION ALL 保留重複',
    prompt: '用 UNION ALL 把「參與 9001 的員工編號」與「參與 9004 的員工編號」接在一起，只輸出 emp_id 一欄，依 emp_id 排序。重複的人要出現兩次。',
    hint: '這題跟 INTERSECT 那題用的是同樣兩個集合，正好可以對照：UNION ALL 不去重，所以同時參與兩案的人會出現兩次。',
    requires: ['UNION ALL'], ordered: true,
    solution: `select emp_id
from emp_projects
where proj_id = 9001
union all
select emp_id
from emp_projects
where proj_id = 9004
order by emp_id`,
  },
  {
    id: 'union-3', topicId: 'union', difficulty: 2,
    title: '把兩張不同的表併成一份清單',
    prompt: "用 UNION ALL 把員工與專案併成一份清單，欄位為 source_type（員工列顯示 '員工'，專案列顯示 '專案'）、id、name。依 source_type、id 排序。",
    hint: 'UNION ALL 兩側的欄位數量與型別要對得上，欄位名稱以第一段為準，所以別名寫在第一段就好。',
    requires: ['UNION ALL'], ordered: true,
    solution: `select
  '員工' as source_type,
  emp_id as id,
  emp_name as name
from employees
union all
select
  '專案',
  proj_id,
  proj_name
from projects
order by source_type,id`,
  },

  // ── JOIN UPDATE ─────────────────────────────────────────────
  {
    id: 'join-update-1', topicId: 'join-update', difficulty: 3, kind: 'dml', affects: ['employees'],
    title: '依調薪檔更新員工薪資',
    prompt: '把 salary_adjust 裡的 new_salary 套用到 employees.salary。只更新調薪檔裡有的員工，其他人不能動。注意 salary_adjust 裡的 1013 在 employees 並不存在，不可以因此新增資料。',
    hint: '兩種寫法都可以：Oracle 的可更新連接檢視 UPDATE (SELECT … JOIN …) SET a = b，或是相關子查詢 UPDATE … SET col = (SELECT …) WHERE EXISTS (…)。用第二種時千萬別漏掉 WHERE EXISTS，否則沒對到的人薪資會被更新成 NULL。',
    requires: ['UPDATE'], requiresAny: [['JOIN', 'EXISTS', 'IN (', 'MERGE']],
    solution: `update (
  select
    e.salary as old_salary,
    a.new_salary as new_salary
  from employees e
  join salary_adjust a on a.emp_id = e.emp_id
)
set old_salary = new_salary`,
  },
  {
    id: 'join-update-2', topicId: 'join-update', difficulty: 3, kind: 'dml', affects: ['emp_bonus'],
    title: '用相關子查詢回填獎金',
    prompt: "把 emp_bonus 現有的三筆資料更新：bonus_amt 改成該員工的 salary × 所屬薪資級距的 bonus_rate（級距由 salary 落在 salary_grades 的 min_sal 與 max_sal 之間決定），updated_at 改成 TO_CHAR(SYSDATE, 'YYYY-MM-DD')。grade 欄位維持原值不動。",
    hint: '用 UPDATE emp_bonus b SET b.bonus_amt = (SELECT … WHERE e.emp_id = b.emp_id) 的相關子查詢寫法，並且加上 WHERE EXISTS 保護。本站的 SYSDATE 固定是 2024-09-30。',
    requires: ['UPDATE', 'EXISTS'],
    solution: `update emp_bonus b
set
  b.bonus_amt = (
    select e.salary * g.bonus_rate
    from employees e
    join salary_grades g on e.salary between g.min_sal and g.max_sal
    where e.emp_id = b.emp_id
  ),
  b.updated_at = to_char(sysdate, 'YYYY-MM-DD')
where exists (select 1 from employees e where e.emp_id = b.emp_id)`,
  },

  // ── MERGE ───────────────────────────────────────────────────
  {
    id: 'merge-1', topicId: 'merge', difficulty: 3, kind: 'dml', affects: ['emp_bonus'],
    title: 'MERGE 做完整的 UPSERT',
    prompt: "把全部 12 位員工的年終獎金寫進 emp_bonus：已經存在的（1001、1003、1004）更新 bonus_amt、grade、updated_at，不存在的則新增一筆。bonus_amt = salary × 該薪資級距的 bonus_rate，grade 取自 salary_grades，updated_at 一律填 '2024-09-30'。",
    hint: 'USING 後面放一段子查詢（employees JOIN salary_grades），ON 寫 (b.emp_id = s.emp_id)，然後 WHEN MATCHED THEN UPDATE SET … 與 WHEN NOT MATCHED THEN INSERT (…) VALUES (…) 兩個分支都要寫。',
    requires: ['MERGE', 'WHEN MATCHED', 'WHEN NOT MATCHED'],
    solution: `merge into emp_bonus b
using (
  select
    e.emp_id,
    e.salary * g.bonus_rate as bonus_amt,
    g.grade
  from employees e
  join salary_grades g on e.salary between g.min_sal and g.max_sal
) s on (b.emp_id = s.emp_id)
when matched then
  update set
    b.bonus_amt = s.bonus_amt,
    b.grade = s.grade,
    b.updated_at = '2024-09-30'
when not matched then
  insert (emp_id, bonus_amt, grade, updated_at)
  values (s.emp_id, s.bonus_amt, s.grade, '2024-09-30')`,
  },
  {
    id: 'merge-2', topicId: 'merge', difficulty: 3, kind: 'dml', affects: ['employees'],
    title: 'MERGE 只更新、而且只漲不跌',
    prompt: '用 MERGE 把 salary_adjust 套用到 employees，但只有在新薪資「比原本高」的時候才更新（1011 是降薪，必須維持原值 45000）。這題只要 WHEN MATCHED 分支，不要新增任何資料。',
    hint: 'MERGE 的 WHEN MATCHED THEN UPDATE SET … 後面可以再接一個 WHERE，用來篩掉不想更新的列：WHERE a.new_salary > e.salary。',
    requires: ['MERGE', 'WHEN MATCHED'], forbids: ['WHEN NOT MATCHED'],
    solution: `merge into employees e
using salary_adjust a on (e.emp_id = a.emp_id)
when matched then
  update set e.salary = a.new_salary
  where a.new_salary > e.salary`,
  },

  // ── ROW_NUMBER ──────────────────────────────────────────────
  {
    id: 'row-number-1', topicId: 'row-number', difficulty: 1,
    title: '全公司薪資流水號',
    prompt: '列出所有員工的 emp_name、salary，以及依 salary 由高到低編出來的流水號 rn。薪水相同時再依 emp_id 由小到大。依 rn 排序。',
    hint: 'ROW_NUMBER() OVER (ORDER BY ...)。括號裡的 ORDER BY 決定編號順序，跟最外層的 ORDER BY 是兩回事。',
    requires: ['ROW_NUMBER', 'OVER'], ordered: true,
    solution: `select
  emp_name,
  salary,
  row_number() over (order by salary desc, emp_id) as rn
from employees
order by rn`,
  },
  {
    id: 'row-number-2', topicId: 'row-number', difficulty: 2,
    title: '每個部門薪水最高的人',
    prompt: '找出每個部門薪水最高的那一位員工，顯示 dept_id、emp_name、salary。沒有部門的員工不算。依 dept_id 排序。',
    hint: '視窗函數不能寫在 WHERE 裡。先用 ROW_NUMBER() OVER (PARTITION BY dept_id ORDER BY salary DESC) 編號，把整段包成 FROM 裡的子查詢，外層再篩 rn = 1。',
    requires: ['ROW_NUMBER', 'PARTITION BY'], ordered: true,
    solution: `select
  dept_id,
  emp_name,
  salary
from (
  select
    dept_id,
    emp_name,
    salary,
    row_number() over (partition by dept_id order by salary desc) as rn
  from employees
  where dept_id is not null
)
where rn = 1
order by dept_id`,
  },
  {
    id: 'row-number-3', topicId: 'row-number', difficulty: 3,
    title: '每個專案的工時前兩名',
    prompt: '每個專案列出投入工時 hours 最多的前兩名，顯示 proj_id、emp_name、hours。工時相同時 emp_id 小的優先。依 proj_id、hours 由大到小排序。',
    hint: 'PARTITION BY proj_id 分組編號，外層篩 rn <= 2。emp_name 要從 employees 接過來，JOIN 可以放在子查詢裡。',
    requires: ['ROW_NUMBER', 'PARTITION BY'], ordered: true,
    solution: `select
  proj_id,
  emp_name,
  hours
from (
  select
    ep.proj_id,
    e.emp_name,
    ep.hours,
    row_number() over (partition by ep.proj_id order by ep.hours desc, ep.emp_id) as rn
  from emp_projects ep
  join employees e on e.emp_id = ep.emp_id
)
where rn <= 2
order by proj_id,hours desc`,
  },

  // ── RANK / DENSE_RANK ───────────────────────────────────────
  {
    id: 'rank-1', topicId: 'rank', difficulty: 2,
    title: '看出 RANK 與 DENSE_RANK 的差別',
    prompt: '依 job 分組算出人數 cnt，再用 RANK 與 DENSE_RANK 各給一個「人數由多到少」的排名，顯示 job、cnt、rk、drk。依 cnt 由大到小、job 排序。',
    hint: '視窗函數可以直接對聚合結果開窗：RANK() OVER (ORDER BY COUNT(*) DESC)。兩個人數並列時，RANK 下一名會跳號、DENSE_RANK 不會，跑出來對照一下就懂了。',
    requires: ['RANK', 'DENSE_RANK'], ordered: true,
    solution: `select
  job,
  count(*) as cnt,
  rank() over (order by count(*) desc) as rk,
  dense_rank() over (order by count(*) desc) as drk
from employees
group by job
order by cnt desc,job`,
  },
  {
    id: 'rank-2', topicId: 'rank', difficulty: 2,
    title: '部門內的薪資名次',
    prompt: '列出每位有部門的員工的 dept_id、emp_name、salary，以及他在自己部門內薪資由高到低的 DENSE_RANK 名次 drk。依 dept_id、drk、emp_name 排序。',
    hint: 'PARTITION BY dept_id 讓名次在每個部門內各自從 1 開始。',
    requires: ['DENSE_RANK', 'PARTITION BY'], ordered: true,
    solution: `select
  dept_id,
  emp_name,
  salary,
  dense_rank() over (partition by dept_id order by salary desc) as drk
from employees
where dept_id is not null
order by dept_id,drk,emp_name`,
  },
  {
    id: 'rank-3', topicId: 'rank', difficulty: 3,
    title: '全公司薪資第二高',
    prompt: '找出全公司薪資「第二高」的員工，只輸出 emp_name、salary。薪水相同視為同一名次，所以請用 DENSE_RANK 完成。',
    hint: '先算出 DENSE_RANK 名次，包一層之後篩 drk = 2。用 MAX 硬湊會在有並列時出錯。',
    requires: ['DENSE_RANK'],
    solution: `select
  emp_name,
  salary
from (select emp_name, salary, dense_rank() over (order by salary desc) as drk from employees)
where drk = 2`,
  },

  // ── 彙總開窗 ────────────────────────────────────────────────
  {
    id: 'window-agg-1', topicId: 'window-agg', difficulty: 2,
    title: '跟部門平均比一比',
    prompt: '列出有部門的員工 emp_name、dept_id、salary，以及所屬部門的平均薪資 dept_avg（四捨五入到整數），還有 salary 減掉 dept_avg 的差額 diff。依 dept_id、emp_name 排序。',
    hint: 'AVG(salary) OVER (PARTITION BY dept_id)。不用 GROUP BY，筆數不會被併掉，每一列都會帶著自己部門的平均。',
    requires: ['OVER', 'PARTITION BY'], ordered: true,
    solution: `select
  emp_name,
  dept_id,
  salary,
  round(avg(salary) over (partition by dept_id), 0) as dept_avg,
  salary - round(avg(salary) over (partition by dept_id), 0) as diff
from employees
where dept_id is not null
order by dept_id,emp_name`,
  },
  {
    id: 'window-agg-2', topicId: 'window-agg', difficulty: 2,
    title: '薪資累計',
    prompt: '依 emp_id 由小到大列出 emp_id、emp_name、salary，以及「到這一列為止的薪資累計」running_total。依 emp_id 排序。',
    hint: 'SUM(salary) OVER (ORDER BY emp_id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)。OVER 裡面有了 ORDER BY，加總就從「整組」變成「到目前為止」。',
    requires: ['OVER'], ordered: true,
    solution: `select
  emp_id,
  emp_name,
  salary,
  sum(salary) over (order by emp_id rows between unbounded preceding
    and current row) as running_total
from employees
order by emp_id`,
  },
  {
    id: 'window-agg-3', topicId: 'window-agg', difficulty: 3,
    title: '部門內的薪資佔比',
    prompt: '列出每位有部門的員工 emp_name、dept_id、salary，以及他的薪水佔「自己部門薪資總和」的百分比 pct（四捨五入到小數第 1 位）。依 dept_id、pct 由大到小排序。',
    hint: 'salary * 100.0 / SUM(salary) OVER (PARTITION BY dept_id)。乘 100.0 而不是 100，才不會被當成整數相除。',
    requires: ['OVER', 'PARTITION BY', 'SUM'], ordered: true,
    solution: `select
  emp_name,
  dept_id,
  salary,
  round(salary * 100.0 / sum(salary) over (partition by dept_id), 1) as pct
from employees
where dept_id is not null
order by dept_id,pct desc`,
  },

  // ── LAG / LEAD ──────────────────────────────────────────────
  {
    id: 'lag-lead-1', topicId: 'lag-lead', difficulty: 2,
    title: '前一位到職的人是誰',
    prompt: '依 hire_date 由早到晚列出 emp_name、hire_date，以及「前一位到職者的姓名」prev_name。第一筆沒有前一位，留 NULL。依 hire_date 排序。',
    hint: 'LAG(emp_name) OVER (ORDER BY hire_date)。LAG 讀上一列、LEAD 讀下一列。',
    requires: ['LAG', 'OVER'], ordered: true,
    solution: `select
  emp_name,
  hire_date,
  lag(emp_name) over (order by hire_date) as prev_name
from employees
order by hire_date`,
  },
  {
    id: 'lag-lead-2', topicId: 'lag-lead', difficulty: 3,
    title: '部門內的薪資落差',
    prompt: '在每個部門內依 salary 由高到低排，列出 dept_id、emp_name、salary，以及「比他高一名的那個人的薪水」upper_salary；自己就是最高的話補 0。沒有部門的員工不算。依 dept_id、salary 由大到小排序。',
    hint: 'LAG 的第三個參數就是「沒有上一列時要回傳什麼」：LAG(salary, 1, 0)。',
    requires: ['LAG', 'PARTITION BY'], ordered: true,
    solution: `select
  dept_id,
  emp_name,
  salary,
  lag(salary, 1, 0) over (partition by dept_id order by salary desc) as upper_salary
from employees
where dept_id is not null
order by dept_id,salary desc`,
  },

  // ── NTILE / FIRST_VALUE ─────────────────────────────────────
  {
    id: 'ntile-firstlast-1', topicId: 'ntile-firstlast', difficulty: 2,
    title: '薪資四分位',
    prompt: '依 salary 由低到高把 12 位員工切成 4 組，列出 emp_name、salary 與組別 quartile。薪水相同時依 emp_id 排。依 salary、emp_id 排序。',
    hint: 'NTILE(4) OVER (ORDER BY salary, emp_id)。12 筆平均切 4 組，每組剛好 3 個人。',
    requires: ['NTILE'], ordered: true,
    solution: `select
  emp_name,
  salary,
  ntile(4) over (order by salary, emp_id) as quartile
from employees
order by salary,emp_id`,
  },
  {
    id: 'ntile-firstlast-2', topicId: 'ntile-firstlast', difficulty: 3,
    title: '部門薪資的頭與尾',
    prompt: '列出有部門的員工 dept_id、emp_name、salary，並帶出他所在部門「薪水最高的人的姓名」top_name 與「薪水最低的人的姓名」low_name。同薪時取 emp_id 小的。依 dept_id、emp_name 排序。',
    hint: 'LAST_VALUE 預設的視窗只到目前這一列，所以拿不到真正的最後一名，要自己補上 ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING。',
    requires: ['FIRST_VALUE', 'LAST_VALUE'], ordered: true,
    solution: `select
  dept_id,
  emp_name,
  salary,
  first_value(emp_name) over (partition by dept_id order by salary desc, emp_id) as top_name,
  last_value(emp_name) over (partition by dept_id order by salary desc, emp_id
    rows between unbounded preceding and unbounded following) as low_name
from employees
where dept_id is not null
order by dept_id,emp_name`,
  },

  // ── WITH（CTE）──────────────────────────────────────────────
  {
    id: 'with-cte-1', topicId: 'with-cte', difficulty: 2,
    title: '薪水高於部門平均的人',
    prompt: '用 WITH 先算出每個部門的平均薪資，再找出薪水高於自己部門平均的員工，顯示 emp_name、dept_id、salary，以及部門平均 avg_sal（四捨五入到整數）。沒有部門的員工不算。依 dept_id、emp_name 排序。',
    hint: 'WITH dept_avg AS ( SELECT dept_id, AVG(salary) AS avg_sal ... GROUP BY dept_id ) 之後，dept_avg 就能當成一張表拿來 JOIN。',
    requires: ['WITH'], ordered: true,
    solution: `with dept_avg as (
  select
    dept_id,
    avg(salary) as avg_sal
  from employees
  where dept_id is not null
  group by dept_id
)
select
  e.emp_name,
  e.dept_id,
  e.salary,
  round(a.avg_sal, 0) as avg_sal
from employees e
join dept_avg a on a.dept_id = e.dept_id
where e.salary > a.avg_sal
order by e.dept_id,e.emp_name`,
  },
  {
    id: 'with-cte-2', topicId: 'with-cte', difficulty: 3,
    title: '兩段 WITH 串起來',
    prompt: '用兩段 WITH 完成：一段算每個部門的專案預算總和 total_budget，一段算每個部門的人數 head_count；最後列出 dept_name、head_count、total_budget、以及平均每人分到的預算 budget_per_head（四捨五入到整數）。只看「既有專案也有員工」的部門，依 dept_name 排序。',
    hint: 'WITH a AS ( ... ), b AS ( ... ) 用逗號接第二段，不用再寫一次 WITH。最後把兩段跟 departments 一起 JOIN，INNER JOIN 自然會把缺任一邊的部門濾掉。',
    requires: ['WITH'], ordered: true,
    solution: `with proj_sum as (
  select
    dept_id,
    sum(budget) as total_budget
  from projects
  where dept_id is not null
  group by dept_id
),
emp_cnt as (
  select
    dept_id,
    count(*) as head_count
  from employees
  where dept_id is not null
  group by dept_id
)
select
  d.dept_name,
  c.head_count,
  p.total_budget,
  round(p.total_budget * 1.0 / c.head_count, 0) as budget_per_head
from departments d
join proj_sum p on p.dept_id = d.dept_id
join emp_cnt c on c.dept_id = d.dept_id
order by d.dept_name`,
  },

  // ── 階層查詢 ────────────────────────────────────────────────
  {
    id: 'hierarchy-1', topicId: 'hierarchy', difficulty: 2,
    title: '把組織圖展開',
    prompt: '從沒有主管的人開始，把整個組織往下展開，列出層數 LEVEL、emp_id、emp_name。依 LEVEL、emp_id 排序。',
    hint: 'START WITH manager_id IS NULL 指定起點，CONNECT BY PRIOR emp_id = manager_id 表示「上一層的 emp_id 等於這一層的 manager_id」。PRIOR 加在哪一邊決定往下還是往上走。',
    requires: ['CONNECT BY', 'START WITH'], ordered: true,
    solution: `select
  level,
  emp_id,
  emp_name
from employees
start with manager_id is null
connect by prior emp_id = manager_id
order by level,emp_id`,
  },
  {
    id: 'hierarchy-2', topicId: 'hierarchy', difficulty: 3,
    title: '某位主管往下的路徑',
    prompt: "以 emp_id = 1003 為起點往下展開，列出 LEVEL、emp_name，以及從 1003 一路串下來的路徑 path（用 SYS_CONNECT_BY_PATH 搭配 '/' 分隔）。依 path 排序。",
    hint: "SYS_CONNECT_BY_PATH(emp_name, '/') 會把沿路走過的值接起來，每一段前面都會補上分隔符號。",
    requires: ['CONNECT BY', 'SYS_CONNECT_BY_PATH'], ordered: true,
    solution: `select
  level,
  emp_name,
  sys_connect_by_path(emp_name, '/') as path
from employees
start with emp_id = 1003
connect by prior emp_id = manager_id
order by path`,
  },

  // ── 內嵌視圖 / 純量子查詢 ───────────────────────────────────
  {
    id: 'inline-view-1', topicId: 'inline-view', difficulty: 2,
    title: '人數三人以上的部門',
    prompt: '找出員工人數 3 人（含）以上的部門，顯示 dept_id、cnt，依 dept_id 排序。沒有部門的員工不算。這一題請用內嵌視圖（把聚合查詢放進 FROM 裡再篩），不要用 HAVING。',
    hint: 'FROM ( SELECT dept_id, COUNT(*) AS cnt ... GROUP BY dept_id ) 之後，cnt 就是一個普通欄位，外層直接 WHERE cnt >= 3 就好。',
    requires: ['GROUP BY'], forbids: ['HAVING'], ordered: true,
    solution: `select
  dept_id,
  cnt
from (select dept_id, count(*) as cnt from employees where dept_id is not null group by dept_id)
where cnt >= 3
order by dept_id`,
  },
  {
    id: 'inline-view-2', topicId: 'inline-view', difficulty: 2,
    title: '用純量子查詢帶出部門名',
    prompt: '列出每位員工的 emp_name 與部門名稱 dept_name，沒有部門的人 dept_name 留 NULL。這一題不准用 JOIN，請把 departments 的查詢寫成 SELECT 裡的純量子查詢。依 emp_id 排序。',
    hint: '純量子查詢放在 SELECT 清單裡，只能回傳一列一欄；對不到資料時它會自己回傳 NULL，效果就跟 LEFT JOIN 一樣。',
    forbids: ['JOIN'], ordered: true,
    solution: `select
  e.emp_name,
  (select d.dept_name from departments d where d.dept_id = e.dept_id) as dept_name
from employees e
order by e.emp_id`,
  },

  // ── 關聯子查詢 ──────────────────────────────────────────────
  {
    id: 'correlated-1', topicId: 'correlated', difficulty: 3,
    title: '薪水高於自己部門平均',
    prompt: '用關聯子查詢找出薪水高於自己部門平均的員工，顯示 emp_name、dept_id、salary。沒有部門的員工不算。這一題不准用 JOIN。依 dept_id、emp_name 排序。',
    hint: 'WHERE e.salary > (SELECT AVG(x.salary) FROM employees x WHERE x.dept_id = e.dept_id)。子查詢裡引用外層的 e.dept_id，就會對每一列各算一次。',
    forbids: ['JOIN'], ordered: true,
    solution: `select
  e.emp_name,
  e.dept_id,
  e.salary
from employees e
where e.dept_id is not null
and e.salary > (select avg(x.salary) from employees x where x.dept_id = e.dept_id)
order by e.dept_id,e.emp_name`,
  },
  {
    id: 'correlated-2', topicId: 'correlated', difficulty: 2,
    title: '每個人參與幾個專案',
    prompt: '列出每位員工的 emp_name 以及他參與的專案數 proj_cnt，沒參與的顯示 0。這一題不准用 JOIN 也不准用 GROUP BY，請把計數寫成 SELECT 裡的關聯子查詢。依 emp_id 排序。',
    hint: '(SELECT COUNT(*) FROM emp_projects p WHERE p.emp_id = e.emp_id)。COUNT 在沒有列時本來就回 0，不用補 NVL。',
    forbids: ['JOIN', 'GROUP BY'], ordered: true,
    solution: `select
  e.emp_name,
  (select count(*) from emp_projects p where p.emp_id = e.emp_id) as proj_cnt
from employees e
order by e.emp_id`,
  },

  // ── ANY / ALL ───────────────────────────────────────────────
  {
    id: 'any-all-1', topicId: 'any-all', difficulty: 2,
    title: '比業務部所有人都高薪',
    prompt: '找出薪水比業務部（dept_id = 10）每一位員工都高的員工，顯示 emp_name、salary，依 salary 由大到小排序。請用 ALL 完成。',
    hint: 'salary > ALL (子查詢)：要比子查詢回傳的每一個值都大，等價於「大於其中的最大值」。',
    requires: ['ALL'], ordered: true,
    solution: `select
  emp_name,
  salary
from employees
where salary > all (select salary from employees where dept_id = 10)
order by salary desc`,
  },
  {
    id: 'any-all-2', topicId: 'any-all', difficulty: 2,
    title: '至少比研發部某個人低薪',
    prompt: '找出薪水比研發部（dept_id = 20）「至少一位」員工還低的員工，顯示 emp_name、salary，研發部自己的人不算。依 salary、emp_name 排序。請用 ANY 完成。',
    hint: 'salary < ANY (子查詢)：只要比其中任何一個值小就成立，等價於「小於其中的最大值」。另外注意 dept_id <> 20 會把 dept_id 是 NULL 的人濾掉，要另外補 OR dept_id IS NULL。',
    requires: ['ANY'], ordered: true,
    solution: `select
  emp_name,
  salary
from employees
where (dept_id <> 20 or dept_id is null)
and salary < any (select salary from employees where dept_id = 20)
order by salary,emp_name`,
  },

  // ── 自我連接 ────────────────────────────────────────────────
  {
    id: 'self-join-1', topicId: 'self-join', difficulty: 2,
    title: '員工與他的主管',
    prompt: '列出每位員工的 emp_name 與直屬主管的姓名 manager_name。沒有主管的人也要出現，manager_name 留 NULL。依 emp_id 排序。',
    hint: 'employees e LEFT JOIN employees m ON m.emp_id = e.manager_id。同一張表要給兩個不同別名，否則分不出誰是誰。',
    requires: ['JOIN'], ordered: true,
    solution: `select
  e.emp_name,
  m.emp_name as manager_name
from employees e
left join employees m on m.emp_id = e.manager_id
order by e.emp_id`,
  },
  {
    id: 'self-join-2', topicId: 'self-join', difficulty: 3,
    title: '同一位主管底下的同事配對',
    prompt: '列出「同一位主管底下」的同事配對，顯示 manager_id、其中一位的姓名 name_a、另一位的姓名 name_b。同一組只出現一次（用 a.emp_id < b.emp_id 控制），也不要自己配自己。依 manager_id、name_a、name_b 排序。',
    hint: 'ON 裡面除了 b.manager_id = a.manager_id，再加一個 a.emp_id < b.emp_id，就同時解決了「自己配自己」與「A-B 跟 B-A 重複」兩個問題。',
    requires: ['JOIN'], ordered: true,
    solution: `select
  a.manager_id,
  a.emp_name as name_a,
  b.emp_name as name_b
from employees a
join employees b on b.manager_id = a.manager_id and a.emp_id < b.emp_id
order by a.manager_id,name_a,name_b`,
  },

  // ── CROSS JOIN / 非等值連接 ─────────────────────────────────
  {
    id: 'cross-nonequi-1', topicId: 'cross-nonequi', difficulty: 2,
    title: '薪水落在哪個級距',
    prompt: '列出每位員工的 emp_name、salary、所屬級距 grade 與年終倍率 bonus_rate。employees 跟 salary_grades 之間沒有外鍵，要用 BETWEEN 做非等值連接。依 emp_id 排序。',
    hint: 'ON e.salary BETWEEN g.min_sal AND g.max_sal。ON 裡面不是只能寫 =，任何條件都可以。',
    requires: ['JOIN', 'BETWEEN'], ordered: true,
    solution: `select
  e.emp_name,
  e.salary,
  g.grade,
  g.bonus_rate
from employees e
join salary_grades g on e.salary between g.min_sal and g.max_sal
order by e.emp_id`,
  },
  {
    id: 'cross-nonequi-2', topicId: 'cross-nonequi', difficulty: 2,
    title: '部門 × 級距對照表',
    prompt: '用 CROSS JOIN 產生「每個部門 × 每個級距」的所有組合，顯示 dept_name、grade。依 dept_id、grade 排序。',
    hint: 'CROSS JOIN 不需要 ON，直接把兩邊每一列都配一次。5 個部門 × 4 個級距 = 20 列。',
    requires: ['CROSS JOIN'], ordered: true,
    solution: `select
  d.dept_name,
  g.grade
from departments d
cross join salary_grades g
order by d.dept_id,g.grade`,
  },

  // ── LIKE / BETWEEN / IS NULL ────────────────────────────────
  {
    id: 'like-between-1', topicId: 'like-between', difficulty: 1,
    title: '找出主管職',
    prompt: "找出職稱 job 以 'MGR' 結尾的員工，顯示 emp_name、job，依 emp_id 排序。",
    hint: "LIKE '%MGR'：% 代表任意長度（含 0 個字）。想要「剛好一個字」用底線 _。",
    requires: ['LIKE'], ordered: true,
    solution: `select
  emp_name,
  job
from employees
where job like '%MGR'
order by emp_id`,
  },
  {
    id: 'like-between-2', topicId: 'like-between', difficulty: 2,
    title: '薪資區間又沒填信箱',
    prompt: '找出薪資介於 50000 與 80000（含兩端）、而且 email 是 NULL 的員工，顯示 emp_name、salary，依 emp_id 排序。',
    hint: 'BETWEEN 是含頭含尾的閉區間。NULL 不能用 = NULL 或 <> NULL 判斷，只能用 IS NULL / IS NOT NULL。',
    requires: ['BETWEEN', 'IS NULL'], ordered: true,
    solution: `select
  emp_name,
  salary
from employees
where salary between 50000 and 80000 and email is null
order by emp_id`,
  },

  // ── Top-N 與分頁 ────────────────────────────────────────────
  {
    id: 'top-n-1', topicId: 'top-n', difficulty: 1,
    title: '薪資前三高',
    prompt: '找出薪水最高的前 3 位，顯示 emp_name、salary，依 salary 由大到小排序。請用 FETCH FIRST 寫法。',
    hint: 'ORDER BY salary DESC 之後接 FETCH FIRST 3 ROWS ONLY。這是 Oracle 12c 之後才有的語法。',
    requires: ['FETCH FIRST'], ordered: true,
    solution: `select
  emp_name,
  salary
from employees
order by salary desc
fetch first 3 rows only`,
  },
  {
    id: 'top-n-2', topicId: 'top-n', difficulty: 2,
    title: '薪資排名第 4 到第 6',
    prompt: '用分頁寫法取出薪資排名第 4 到第 6 名的員工，顯示 emp_name、salary，依 salary 由大到小排序。',
    hint: 'OFFSET 3 ROWS FETCH NEXT 3 ROWS ONLY：先跳過 3 筆，再取 3 筆。OFFSET 一定要寫在 FETCH 前面。',
    requires: ['OFFSET', 'FETCH'], ordered: true,
    solution: `select
  emp_name,
  salary
from employees
order by salary desc
offset 3 rows
fetch next 3 rows only`,
  },
  {
    id: 'top-n-3', topicId: 'top-n', difficulty: 2,
    title: 'ROWNUM 的舊寫法',
    prompt: '用 ROWNUM 的舊寫法取出薪資最高的 3 位，顯示 emp_name、salary。',
    hint: 'ROWNUM 是「資料被取出來的當下才編號」，所以直接寫 WHERE ROWNUM <= 3 ORDER BY salary DESC 會拿到隨便三個人再排序。正確做法是先把排好序的查詢包成子查詢，外層再篩 ROWNUM。',
    requires: ['ROWNUM'], ordered: true,
    solution: `select
  emp_name,
  salary
from (select emp_name, salary from employees order by salary desc)
where rownum <= 3`,
  },

  // ── ORDER BY 與 NULL 排序 ───────────────────────────────────
  {
    id: 'order-null-1', topicId: 'order-null', difficulty: 2,
    title: '把 NULL 排到最前面',
    prompt: '列出所有員工的 emp_name 與 commission_pct，依 commission_pct 由小到大排，但沒填的（NULL）要排在最前面；NULL 之間、數值相同時再依 emp_id 排。',
    hint: 'Oracle 的 ASC 預設 NULL 在最後，要反過來就加 NULLS FIRST。寫法是 ORDER BY commission_pct NULLS FIRST, emp_id。',
    requires: ['NULLS FIRST'], ordered: true,
    solution: `select
  emp_name,
  commission_pct
from employees
order by commission_pct nulls first,emp_id`,
  },
  {
    id: 'order-null-2', topicId: 'order-null', difficulty: 2,
    title: '用別名排序',
    prompt: '算出每個部門的人數，顯示 dept_id、cnt（沒有部門的員工歸成一組，dept_id 是 NULL）。依 cnt 由大到小排，人數相同時依 dept_id 由小到大，且 NULL 的 dept_id 排在最後。',
    hint: 'ORDER BY 可以直接用 SELECT 裡取的別名。dept_id 升冪時 Oracle 預設 NULL 就在最後，剛好符合要求。',
    requires: ['GROUP BY'], ordered: true,
    solution: `select
  dept_id,
  count(*) as cnt
from employees
group by dept_id
order by cnt desc,dept_id`,
  },

  // ── 字串函數 ────────────────────────────────────────────────
  {
    id: 'string-func-1', topicId: 'string-func', difficulty: 2,
    title: '做一張員工名牌',
    prompt: '產生每位員工的名牌字串 label，格式是「姓名（職稱）」，例如 王大明（SALES_MGR）；另外取出姓氏 surname，也就是姓名的第一個字。顯示 emp_id、label、surname，依 emp_id 排序。',
    hint: 'Oracle 用 || 串字串（不是 +，也不是 CONCAT 接一堆）。SUBSTR(emp_name, 1, 1) 從第 1 個字取 1 個字，Oracle 的位置從 1 開始算。',
    requires: ['SUBSTR'], ordered: true,
    solution: `select
  emp_id,
  emp_name || '（' || job || '）' as label,
  substr(emp_name, 1, 1) as surname
from employees
order by emp_id`,
  },
  {
    id: 'string-func-2', topicId: 'string-func', difficulty: 2,
    title: '從 email 取出帳號',
    prompt: "列出有填 email 的員工，顯示 emp_name、email，以及 '@' 前面的帳號 account。依 emp_id 排序。",
    hint: "INSTR(email, '@') 回傳 @ 的位置，再用 SUBSTR(email, 1, 位置 - 1) 把前面那段切出來。",
    requires: ['INSTR', 'SUBSTR'], ordered: true,
    solution: `select
  emp_name,
  email,
  substr(email, 1, instr(email, '@') - 1) as account
from employees
where email is not null
order by emp_id`,
  },

  // ── 日期函數 ────────────────────────────────────────────────
  {
    id: 'date-func-1', topicId: 'date-func', difficulty: 2,
    title: '每年到職人數',
    prompt: '依到職年份分組，算出每一年到職的人數，顯示 hire_year、cnt，依 hire_year 排序。請用 EXTRACT 取年份。',
    hint: 'EXTRACT(YEAR FROM hire_date)。GROUP BY 裡也要寫一次同樣的算式（不能只寫別名）。',
    requires: ['EXTRACT'], ordered: true,
    solution: `select
  extract(year from hire_date) as hire_year,
  count(*) as cnt
from employees
group by extract(year from hire_date)
order by hire_year`,
  },
  {
    id: 'date-func-2', topicId: 'date-func', difficulty: 3,
    title: '算年資',
    prompt: '列出每位員工的 emp_name、hire_date，以及到 SYSDATE 為止的年資 years（整數年，不滿一年無條件捨去）。依 years 由大到小、emp_id 排序。',
    hint: 'MONTHS_BETWEEN(SYSDATE, hire_date) 算出相差幾個月（會有小數），除以 12 再 FLOOR。本站的 SYSDATE 固定在 2024-09-30。',
    requires: ['MONTHS_BETWEEN'], ordered: true,
    solution: `select
  emp_name,
  hire_date,
  floor(months_between(sysdate, hire_date) / 12) as years
from employees
order by years desc,emp_id`,
  },

  // ── 數值函數 ────────────────────────────────────────────────
  {
    id: 'number-func-1', topicId: 'number-func', difficulty: 2,
    title: '實際年薪',
    prompt: '算出每位員工的實際年薪 annual_pay = salary × 12 ×（1 + 獎金比例），獎金比例是 NULL 時當成 0，四捨五入到整數；另外用 TRUNC 算出「捨去到千位」的 annual_k。顯示 emp_name、annual_pay、annual_k，依 annual_pay 由大到小排序。',
    hint: 'ROUND(x, 0) 四捨五入到整數；TRUNC(x, -3) 的負數位數表示往整數位砍，-3 就是砍到千位。NULL 參與運算結果會是 NULL，所以 commission_pct 要先用 NVL 補 0。',
    requires: ['ROUND', 'TRUNC'], ordered: true,
    solution: `select
  emp_name,
  round(salary * 12 * (1 + nvl(commission_pct, 0)), 0) as annual_pay,
  trunc(round(salary * 12 * (1 + nvl(commission_pct, 0)), 0), -3) as annual_k
from employees
order by annual_pay desc`,
  },
  {
    id: 'number-func-2', topicId: 'number-func', difficulty: 2,
    title: '用餘數分組',
    prompt: '用 MOD 把員工依 emp_id 除以 3 的餘數分成三組，算出每組人數，顯示 grp、cnt，依 grp 排序。',
    hint: 'MOD(emp_id, 3) 取餘數。SELECT 跟 GROUP BY 都要寫同一個算式。',
    requires: ['MOD'], ordered: true,
    solution: `select
  mod(emp_id, 3) as grp,
  count(*) as cnt
from employees
group by mod(emp_id,3)
order by grp`,
  },

  // ── LISTAGG ─────────────────────────────────────────────────
  {
    id: 'listagg-1', topicId: 'listagg', difficulty: 2,
    title: '部門成員名單',
    prompt: "依部門把成員姓名串成一個字串，顯示 dept_id、members（用 '、' 分隔，依 emp_id 排序）。沒有部門的員工不算，依 dept_id 排序。",
    hint: "LISTAGG(emp_name, '、') WITHIN GROUP (ORDER BY emp_id)。它是聚合函數，所以要搭配 GROUP BY。",
    requires: ['LISTAGG'], ordered: true,
    solution: `select
  dept_id,
  listagg(emp_name, '、') within group (order by emp_id) as members
from employees
where dept_id is not null
group by dept_id
order by dept_id`,
  },
  {
    id: 'listagg-2', topicId: 'listagg', difficulty: 3,
    title: '專案成員名單',
    prompt: "每個有成員的專案列出 proj_name、參與成員名單 members（用 ', ' 分隔，依 emp_id 排序）與人數 cnt。依 proj_id 排序。",
    hint: '三張表串起來：emp_projects 是中間表，往左接 projects、往右接 employees。GROUP BY 要把 proj_id 跟 proj_name 都放進去。',
    requires: ['LISTAGG', 'JOIN'], ordered: true,
    solution: `select
  p.proj_name,
  listagg(e.emp_name, ', ') within group (order by e.emp_id) as members,
  count(*) as cnt
from emp_projects ep
join projects p on p.proj_id = ep.proj_id
join employees e on e.emp_id = ep.emp_id
group by p.proj_id,p.proj_name
order by p.proj_id`,
  },

  // ── COALESCE / NULLIF ───────────────────────────────────────
  {
    id: 'coalesce-1', topicId: 'coalesce', difficulty: 2,
    title: '補上預設的聯絡方式',
    prompt: "列出每位員工的 emp_name、聯絡方式 contact（有 email 就用 email，沒有就顯示 '（未提供）'），以及 comm（commission_pct 有值就用它，沒有就用 0）。請用 COALESCE 完成，依 emp_id 排序。",
    hint: 'COALESCE 由左往右回傳第一個不是 NULL 的值，參數可以放很多個，NVL 則只能兩個。',
    requires: ['COALESCE'], ordered: true,
    solution: `select
  emp_name,
  coalesce(email, '（未提供）') as contact,
  coalesce(commission_pct, 0) as comm
from employees
order by emp_id`,
  },
  {
    id: 'coalesce-2', topicId: 'coalesce', difficulty: 3,
    title: '用 NULLIF 擋掉除以零',
    prompt: '做一張部門資源表：dept_name、人數 head_count、專案預算總和 total_budget（沒有專案的部門顯示 0）、以及平均每人分到的預算 per_head（四捨五入到整數）。人數為 0 的部門 per_head 要是 NULL，不能讓它除以零。所有部門都要出現，依 dept_id 排序。',
    hint: 'NULLIF(head_count, 0)：等於 0 時回 NULL，NULL 當分母整個算式就是 NULL，不會報錯。人數跟預算都可以用純量子查詢取。',
    requires: ['NULLIF'], ordered: true,
    solution: `select
  d.dept_name,
  (select count(*) from employees e where e.dept_id = d.dept_id) as head_count,
  nvl((select sum(p.budget) from projects p where p.dept_id = d.dept_id), 0) as total_budget,
  round(nvl((select sum(p.budget) from projects p where p.dept_id = d.dept_id), 0) * 1.0
    / nullif((select count(*) from employees e where e.dept_id = d.dept_id), 0), 0) as per_head
from departments d
order by d.dept_id`,
  },

  // ── INSERT / DELETE ─────────────────────────────────────────
  {
    id: 'insert-delete-1', topicId: 'insert-delete', difficulty: 2,
    kind: 'dml', affects: ['emp_bonus'],
    title: '補齊獎金名單',
    prompt: "emp_bonus 目前只有 3 筆。請用 INSERT ... SELECT 把「還沒有獎金紀錄」的員工一次補進去：bonus_amt = salary × 該級距的 bonus_rate、grade 取級距代碼、updated_at 填 '2024-09-30'。已經有紀錄的人不要重複新增。",
    hint: 'INSERT INTO ... SELECT 可以把一整段查詢的結果灌進表裡，不用一筆一筆 VALUES。級距用 BETWEEN 對應，排除已有紀錄用 NOT IN (SELECT emp_id FROM emp_bonus)。',
    requires: ['INSERT', 'SELECT'],
    solution: `insert into emp_bonus (emp_id, bonus_amt, grade, updated_at)
select
  e.emp_id,
  e.salary * g.bonus_rate,
  g.grade,
  '2024-09-30'
from employees e
join salary_grades g on e.salary between g.min_sal and g.max_sal
where e.emp_id not in (select emp_id from emp_bonus)`,
  },
  {
    id: 'insert-delete-2', topicId: 'insert-delete', difficulty: 2,
    kind: 'dml', affects: ['salary_adjust'],
    title: '清掉對不到員工的調薪申請',
    prompt: 'salary_adjust 裡有一筆 emp_id 在 employees 找不到的孤兒資料。請用 DELETE 搭配 NOT EXISTS 把這種資料刪掉，其他的都要留著。',
    hint: 'DELETE FROM salary_adjust WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE e.emp_id = salary_adjust.emp_id)。子查詢裡要用完整表名去引用外層被刪的那張表。',
    requires: ['DELETE', 'NOT EXISTS'],
    solution: `delete from salary_adjust
where not exists (select 1 from employees e where e.emp_id = salary_adjust.emp_id)`,
  },
];

export const COMBOS = [
  {
    id: 'combo-1', difficulty: 2, topicIds: ['left-join', 'aggregate', 'group-having', 'nvl', 'case-when'],
    title: '部門薪資總表',
    prompt: '做一張部門總表：dept_id、dept_name、人數 emp_cnt、薪資總額 total_salary（沒有員工時顯示 0）、規模 dept_size（0 人顯示 \'無人\'、3 人以上顯示 \'大部門\'、其餘顯示 \'小部門\'）。所有部門都要出現，依 dept_id 排序。',
    hint: 'LEFT JOIN 保留全部部門 → COUNT(e.emp_id) 才不會把空部門算成 1 → SUM 在沒有列時回傳 NULL，要用 NVL 補 0 → 規模用 CASE WHEN 判斷。',
    requires: ['LEFT JOIN', 'GROUP BY', 'NVL', 'CASE'], ordered: true,
    solution: `select
  d.dept_id,
  d.dept_name,
  count(e.emp_id) as emp_cnt,
  nvl(sum(e.salary), 0) as total_salary,
  case
    when count(e.emp_id) = 0 then '無人'
    when count(e.emp_id) >= 3 then '大部門'
    else '小部門'
  end as dept_size
from departments d
left join employees e on e.dept_id = d.dept_id
group by d.dept_id,d.dept_name
order by d.dept_id`,
  },
  {
    id: 'combo-2', difficulty: 2, topicIds: ['exists', 'union'],
    title: '全員專案參與狀態',
    prompt: "把全部 12 位員工標記成兩類：有參與專案的顯示 '有參與'，沒有的顯示 '未參與'。輸出 emp_name 與 status 兩欄，依 status、emp_name 排序。請用 EXISTS / NOT EXISTS 兩段查詢再以 UNION ALL 合併。",
    hint: '第一段 WHERE EXISTS，第二段 WHERE NOT EXISTS，中間用 UNION ALL。因為兩段不會重疊，用 UNION ALL 比 UNION 省事也省成本。',
    requires: ['EXISTS', 'NOT EXISTS', 'UNION ALL'], ordered: true,
    solution: `select
  e.emp_name,
  '有參與' as status
from employees e
where exists (select 1 from emp_projects ep where ep.emp_id = e.emp_id)
union all
select
  e.emp_name,
  '未參與'
from employees e
where not exists (select 1 from emp_projects ep where ep.emp_id = e.emp_id)
order by status,emp_name`,
  },
  {
    id: 'combo-3', difficulty: 3, topicIds: ['multi-join', 'distinct', 'group-having', 'aggregate'],
    title: '人力吃重的進行中專案',
    prompt: "找出 status 為 'ACTIVE' 且參與人數（不重複員工）至少 2 人的專案，輸出 proj_id、proj_name、負責部門 dept_name、參與人數 member_cnt、總工時 total_hours，依 proj_id 排序。",
    hint: '三張表 JOIN，WHERE 篩 status，GROUP BY 之後用 HAVING COUNT(DISTINCT ep.emp_id) >= 2。DISTINCT 可以寫在聚合函數裡面。',
    requires: ['JOIN', 'DISTINCT', 'GROUP BY', 'HAVING'], ordered: true,
    solution: `select
  p.proj_id,
  p.proj_name,
  d.dept_name,
  count(distinct ep.emp_id) as member_cnt,
  sum(ep.hours) as total_hours
from projects p
join departments d on d.dept_id = p.dept_id
join emp_projects ep on ep.proj_id = p.proj_id
where p.status = 'ACTIVE'
group by p.proj_id,p.proj_name,d.dept_name
having count(distinct ep.emp_id) >= 2
order by p.proj_id`,
  },
  {
    id: 'combo-4', difficulty: 3, topicIds: ['minus', 'in-notin'],
    title: '參與 A 案但沒參與 B 案的人',
    prompt: '找出「有參與 9001，但沒有參與 9004」的員工姓名，只輸出 emp_name 一欄，依 emp_name 排序。請用 MINUS 算出員工編號，再用 IN 把姓名查出來。',
    hint: '先用 MINUS 做出一組 emp_id，再把整段放進 WHERE emp_id IN ( … ) 裡面當子查詢。',
    requires: ['MINUS', 'IN'], ordered: true,
    solution: `select emp_name
from employees
where emp_id in (
  select emp_id
  from emp_projects
  where proj_id = 9001
  minus
  select emp_id
  from emp_projects
  where proj_id = 9004
)
order by emp_name`,
  },
  {
    id: 'combo-5', difficulty: 3, topicIds: ['nvl', 'aggregate', 'group-having', 'or', 'in-notin'],
    title: '主要職稱的薪酬概況',
    prompt: "只看職稱以 'MGR' 結尾、或是 job 為 'DEV' 或 'SALES' 的員工，依 job 分組統計：job、人數 cnt、有填獎金比例的人數 with_comm、平均實際總薪 avg_total_pay（salary × (1 + NVL(commission_pct,0))，四捨五入到整數）。依 job 排序。",
    hint: "WHERE 用 job LIKE '%MGR' OR job IN ('DEV','SALES')。with_comm 可以用 SUM(NVL2(commission_pct, 1, 0)) 或 COUNT(commission_pct) 算出來。",
    requires: ['GROUP BY', 'NVL', 'OR', 'IN'], ordered: true,
    solution: `select
  job,
  count(*) as cnt,
  sum(nvl2(commission_pct, 1, 0)) as with_comm,
  round(avg(salary * (1 + nvl(commission_pct, 0))), 0) as avg_total_pay
from employees
where job like '%MGR' or job in ('DEV', 'SALES')
group by job
order by job`,
  },
  {
    id: 'combo-6', difficulty: 3, kind: 'dml', affects: ['employees', 'emp_bonus'],
    topicIds: ['merge', 'join-update', 'multi-join'],
    title: '年度調薪與獎金結算（兩段 DML）',
    prompt: "分兩段完成，中間用分號隔開：\n第一段——用 MERGE 把 salary_adjust 套用到 employees，只有新薪資比原薪高時才更新。\n第二段——用 MERGE 依調整後的薪資重算全部 12 位員工的年終獎金寫入 emp_bonus（bonus_amt = salary × bonus_rate、grade 取自 salary_grades、updated_at 填 '2024-09-30'），已存在的更新、不存在的新增。",
    hint: '第二段的 USING 子查詢要在第一段跑完之後才讀 employees，所以順序不能顛倒。兩段都用 MERGE 即可。',
    requires: ['MERGE', 'WHEN MATCHED', 'WHEN NOT MATCHED'],
    solution: `merge into employees e
using salary_adjust a on (e.emp_id = a.emp_id)
when matched then
  update set e.salary = a.new_salary
  where a.new_salary > e.salary;

merge into emp_bonus b
using (
  select
    e.emp_id,
    e.salary * g.bonus_rate as bonus_amt,
    g.grade
  from employees e
  join salary_grades g on e.salary between g.min_sal and g.max_sal
) s on (b.emp_id = s.emp_id)
when matched then
  update set
    b.bonus_amt = s.bonus_amt,
    b.grade = s.grade,
    b.updated_at = '2024-09-30'
when not matched then
  insert (emp_id, bonus_amt, grade, updated_at)
  values (s.emp_id, s.bonus_amt, s.grade, '2024-09-30')`,
  },

  {
    id: 'combo-7', difficulty: 3, topicIds: ['with-cte', 'rank', 'inner-join'],
    title: '各部門薪資前兩名',
    prompt: '用 WITH 先算出每位員工在自己部門內的薪資名次（由高到低，薪水相同算同名次），再列出名次在前 2 名的人：dept_name、emp_name、salary、名次 rk。沒有部門的員工不算，依 dept_id、rk、emp_name 排序。',
    hint: 'WITH ranked AS ( ... DENSE_RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS rk ... ) 之後，外層就能直接 WHERE rk <= 2，再 JOIN departments 取部門名稱。',
    requires: ['WITH', 'DENSE_RANK'], ordered: true,
    solution: `with ranked as (
  select
    dept_id,
    emp_name,
    salary,
    dense_rank() over (partition by dept_id order by salary desc) as rk
  from employees
  where dept_id is not null
)
select
  d.dept_name,
  r.emp_name,
  r.salary,
  r.rk
from ranked r
join departments d on d.dept_id = r.dept_id
where r.rk <= 2
order by r.dept_id,r.rk,r.emp_name`,
  },
  {
    id: 'combo-8', difficulty: 3, topicIds: ['window-agg', 'case-when', 'rank'],
    title: '跟部門平均的比較表',
    prompt: "只看有部門的員工，列出 emp_name、dept_id、salary、部門平均薪資 dept_avg（四捨五入到整數）、部門人數 dept_cnt，以及比較結果 verdict（高於平均顯示 '高於平均'、剛好等於顯示 '持平'、否則 '低於平均'）。依 dept_id、salary 由大到小排序。",
    hint: '同一個 OVER (PARTITION BY dept_id) 可以重複用在 AVG、COUNT 與 CASE WHEN 裡。注意 CASE 裡要拿原始的 AVG 比，不要拿四捨五入後的值比。',
    requires: ['OVER', 'PARTITION BY', 'CASE'], ordered: true,
    solution: `select
  emp_name,
  dept_id,
  salary,
  round(avg(salary) over (partition by dept_id), 0) as dept_avg,
  count(*) over (partition by dept_id) as dept_cnt,
  case
    when salary > avg(salary) over (partition by dept_id) then '高於平均'
    when salary = avg(salary) over (partition by dept_id) then '持平'
    else '低於平均'
  end as verdict
from employees
where dept_id is not null
order by dept_id,salary desc`,
  },
  {
    id: 'combo-9', difficulty: 3, topicIds: ['hierarchy', 'listagg', 'aggregate'],
    title: '組織每一層的名冊',
    prompt: "從沒有主管的人開始展開整個組織，統計每一層的人數 cnt 與該層成員名單 members（用 '、' 分隔，依 emp_id 排序）。輸出 lv、cnt、members，依 lv 排序。",
    hint: 'CONNECT BY 展開之後可以直接接 GROUP BY LEVEL，把 LEVEL 當成一般欄位聚合。名單用 LISTAGG。',
    requires: ['CONNECT BY', 'LISTAGG'], ordered: true,
    solution: `select
  level as lv,
  count(*) as cnt,
  listagg(emp_name, '、') within group (order by emp_id) as members
from employees
start with manager_id is null
connect by prior emp_id = manager_id
group by level
order by level`,
  },
  {
    id: 'combo-10', difficulty: 3, topicIds: ['cross-nonequi', 'window-agg', 'group-having', 'listagg'],
    title: '薪資級距分布',
    prompt: "把每位員工對到 salary_grades 的級距，統計每個級距的人數 cnt、平均薪資 avg_sal（四捨五入到整數）、成員名單 members（用 '、' 分隔，依 emp_id 排序），以及該級距人數佔全公司的百分比 pct（四捨五入到小數第 1 位）。只列出有人的級距，依 grade 排序。",
    hint: '非等值連接用 BETWEEN 對級距；佔比的分母是「全公司人數」，可以用 SUM(COUNT(*)) OVER () 在聚合之後再開一次窗拿到總數。',
    requires: ['BETWEEN', 'GROUP BY', 'LISTAGG', 'OVER'], ordered: true,
    solution: `select
  g.grade,
  count(*) as cnt,
  round(avg(e.salary), 0) as avg_sal,
  listagg(e.emp_name, '、') within group (order by e.emp_id) as members,
  round(count(*) * 100.0 / sum(count(*)) over (), 1) as pct
from employees e
join salary_grades g on e.salary between g.min_sal and g.max_sal
group by g.grade
order by g.grade`,
  },
];

export const ALL_ITEMS = [
  ...EXERCISES.map((e) => ({ ...e, mode: 'single' })),
  ...COMBOS.map((c) => ({ ...c, mode: 'combo', topicId: 'combo' })),
];

export function findItem(id) {
  return ALL_ITEMS.find((x) => x.id === id) || null;
}
