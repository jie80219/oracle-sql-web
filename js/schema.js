// 練習用資料庫：一家虛構軟體公司的人事／專案資料。
// 資料刻意安排了 NULL、孤兒列與空集合，讓各種 JOIN 與 NULL 函數都能看出差異：
//   - 部門 50（客服部）沒有任何員工      → LEFT JOIN from departments 會看到
//   - 員工 1009、1012 沒有部門           → RIGHT / FULL JOIN 會看到
//   - 專案 9006 沒有部門、也沒有成員      → NOT EXISTS / NOT IN 練習
//   - commission_pct 大量為 NULL         → NVL / NVL2 練習
export const SCHEMA_SQL = `
DROP TABLE IF EXISTS salary_adjust;
DROP TABLE IF EXISTS emp_bonus;
DROP TABLE IF EXISTS salary_grades;
DROP TABLE IF EXISTS emp_projects;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS employees;
DROP TABLE IF EXISTS departments;
DROP TABLE IF EXISTS dual;

CREATE TABLE dual (dummy TEXT);
INSERT INTO dual VALUES ('X');

CREATE TABLE departments (
  dept_id    INTEGER PRIMARY KEY,
  dept_name  TEXT NOT NULL,
  location   TEXT,
  manager_id INTEGER
);

CREATE TABLE employees (
  emp_id         INTEGER PRIMARY KEY,
  emp_name       TEXT NOT NULL,
  dept_id        INTEGER,
  job            TEXT,
  salary         NUMERIC,
  commission_pct NUMERIC,
  manager_id     INTEGER,
  hire_date      TEXT,
  email          TEXT
);

CREATE TABLE projects (
  proj_id    INTEGER PRIMARY KEY,
  proj_name  TEXT NOT NULL,
  dept_id    INTEGER,
  budget     NUMERIC,
  start_date TEXT,
  end_date   TEXT,
  status     TEXT
);

CREATE TABLE emp_projects (
  emp_id  INTEGER,
  proj_id INTEGER,
  role    TEXT,
  hours   NUMERIC,
  PRIMARY KEY (emp_id, proj_id)
);

CREATE TABLE salary_grades (
  grade      TEXT PRIMARY KEY,
  min_sal    NUMERIC,
  max_sal    NUMERIC,
  bonus_rate NUMERIC
);

CREATE TABLE emp_bonus (
  emp_id     INTEGER PRIMARY KEY,
  bonus_amt  NUMERIC,
  grade      TEXT,
  updated_at TEXT
);

CREATE TABLE salary_adjust (
  emp_id        INTEGER PRIMARY KEY,
  new_salary    NUMERIC,
  adjust_reason TEXT
);

INSERT INTO departments (dept_id, dept_name, location, manager_id) VALUES
  (10, '業務部', '台北', 1001),
  (20, '研發部', '新竹', 1003),
  (30, '行銷部', '台北', 1007),
  (40, '財務部', '台中', NULL),
  (50, '客服部', '高雄', NULL);

INSERT INTO employees (emp_id, emp_name, dept_id, job, salary, commission_pct, manager_id, hire_date, email) VALUES
  (1001, '王大明', 10,   'SALES_MGR',  82000, 0.15, NULL, '2015-03-01', 'daming@example.com'),
  (1002, '李小華', 10,   'SALES',      48000, 0.10, 1001, '2018-07-15', 'hua@example.com'),
  (1003, '陳志強', 20,   'DEV_MGR',    95000, NULL, NULL, '2013-01-20', 'chiang@example.com'),
  (1004, '林美玲', 20,   'DEV',        72000, NULL, 1003, '2019-09-01', 'meiling@example.com'),
  (1005, '張家豪', 20,   'DEV',        68000, NULL, 1003, '2021-04-12', NULL),
  (1006, '黃淑芬', 30,   'MARKETING',  55000, 0.05, 1007, '2020-02-28', 'shufen@example.com'),
  (1007, '吳建宏', 30,   'MKT_MGR',    78000, 0.08, NULL, '2016-11-05', 'hung@example.com'),
  (1008, '劉雅婷', 40,   'ACCOUNTANT', 60000, NULL, NULL, '2017-06-30', 'yating@example.com'),
  (1009, '蔡明軒', NULL, 'INTERN',     28000, NULL, 1003, '2024-01-08', NULL),
  (1010, '鄭怡君', 20,   'QA',         58000, NULL, 1003, '2022-08-19', 'yijun@example.com'),
  (1011, '許文龍', 10,   'SALES',      45000, 0.12, 1001, '2023-05-02', 'wenlung@example.com'),
  (1012, '楊宗翰', NULL, 'CONSULTANT', 90000, 0.20, NULL, '2024-03-15', NULL);

INSERT INTO projects (proj_id, proj_name, dept_id, budget, start_date, end_date, status) VALUES
  (9001, 'CRM 系統升級',  20,   1500000, '2024-01-01', '2024-12-31', 'ACTIVE'),
  (9002, '東區通路拓展',  10,    800000, '2024-03-01', NULL,         'ACTIVE'),
  (9003, '品牌重塑',      30,   1200000, '2023-06-01', '2024-05-31', 'CLOSED'),
  (9004, '資料倉儲',      20,   2000000, '2024-05-01', NULL,         'ACTIVE'),
  (9005, '年度稽核',      40,    300000, '2024-02-01', '2024-04-30', 'CLOSED'),
  (9006, '行動 App 2.0',  NULL,  950000, '2024-07-01', NULL,         'PLANNING');

INSERT INTO emp_projects (emp_id, proj_id, role, hours) VALUES
  (1003, 9001, 'LEAD',   320),
  (1004, 9001, 'DEV',    480),
  (1005, 9001, 'DEV',    400),
  (1010, 9001, 'QA',     260),
  (1004, 9004, 'DEV',    200),
  (1010, 9004, 'QA',     120),
  (1001, 9002, 'LEAD',   180),
  (1002, 9002, 'SALES',  240),
  (1011, 9002, 'SALES',   90),
  (1007, 9003, 'LEAD',   300),
  (1006, 9003, 'DESIGN', 350),
  (1008, 9005, 'AUDIT',  150);

INSERT INTO salary_grades (grade, min_sal, max_sal, bonus_rate) VALUES
  ('A', 80000, 9999999, 0.20),
  ('B', 60000,   79999, 0.12),
  ('C', 40000,   59999, 0.06),
  ('D',     0,   39999, 0.02);

-- 只先放三筆，MERGE 練習才會同時有 MATCHED 與 NOT MATCHED
INSERT INTO emp_bonus (emp_id, bonus_amt, grade, updated_at) VALUES
  (1001, 5000, 'B', '2023-12-31'),
  (1003, 8000, 'A', '2023-12-31'),
  (1004, 4000, 'C', '2023-12-31');

-- 待套用的調薪檔，1013 不存在於 employees，可練 MERGE 的 NOT MATCHED 分支
INSERT INTO salary_adjust (emp_id, new_salary, adjust_reason) VALUES
  (1002, 52000, '績效調薪'),
  (1005, 71000, '晉升'),
  (1009, 32000, '轉正'),
  (1011, 42000, '降級調整'),
  (1013, 50000, '新進人員');
`;

// 給畫面上的「資料表結構」面板使用
export const TABLE_META = [
  { name: 'departments', label: '部門', columns: [
    ['dept_id', 'NUMBER', '部門代碼（PK）'],
    ['dept_name', 'VARCHAR2', '部門名稱'],
    ['location', 'VARCHAR2', '所在地'],
    ['manager_id', 'NUMBER', '部門主管的 emp_id，可為 NULL'],
  ]},
  { name: 'employees', label: '員工', columns: [
    ['emp_id', 'NUMBER', '員工編號（PK）'],
    ['emp_name', 'VARCHAR2', '姓名'],
    ['dept_id', 'NUMBER', '部門代碼，可為 NULL'],
    ['job', 'VARCHAR2', '職稱'],
    ['salary', 'NUMBER', '月薪'],
    ['commission_pct', 'NUMBER', '獎金比例，多數為 NULL'],
    ['manager_id', 'NUMBER', '直屬主管的 emp_id'],
    ['hire_date', 'DATE', '到職日 YYYY-MM-DD'],
    ['email', 'VARCHAR2', '信箱，可為 NULL'],
  ]},
  { name: 'projects', label: '專案', columns: [
    ['proj_id', 'NUMBER', '專案編號（PK）'],
    ['proj_name', 'VARCHAR2', '專案名稱'],
    ['dept_id', 'NUMBER', '負責部門，可為 NULL'],
    ['budget', 'NUMBER', '預算'],
    ['start_date', 'DATE', '起始日'],
    ['end_date', 'DATE', '結束日，可為 NULL'],
    ['status', 'VARCHAR2', 'ACTIVE / CLOSED / PLANNING'],
  ]},
  { name: 'emp_projects', label: '專案成員', columns: [
    ['emp_id', 'NUMBER', '員工編號'],
    ['proj_id', 'NUMBER', '專案編號'],
    ['role', 'VARCHAR2', '擔任角色'],
    ['hours', 'NUMBER', '投入工時'],
  ]},
  { name: 'salary_grades', label: '薪資級距', columns: [
    ['grade', 'CHAR', '級距 A~D（PK）'],
    ['min_sal', 'NUMBER', '級距下限'],
    ['max_sal', 'NUMBER', '級距上限'],
    ['bonus_rate', 'NUMBER', '年終倍率'],
  ]},
  { name: 'emp_bonus', label: '年終獎金（MERGE 目標表）', columns: [
    ['emp_id', 'NUMBER', '員工編號（PK）'],
    ['bonus_amt', 'NUMBER', '獎金金額'],
    ['grade', 'CHAR', '級距'],
    ['updated_at', 'DATE', '更新日'],
  ]},
  { name: 'salary_adjust', label: '調薪申請檔（來源表）', columns: [
    ['emp_id', 'NUMBER', '員工編號（PK）'],
    ['new_salary', 'NUMBER', '調整後薪資'],
    ['adjust_reason', 'VARCHAR2', '調整原因'],
  ]},
];
