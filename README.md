# Oracle SQL 線上練習場

在瀏覽器裡寫 Oracle SQL、按下去就真的執行、然後自動批改。不用裝資料庫、不用連線、關掉分頁也不會留下任何東西。

**線上版：** https://jie80219.github.io/oracle-sql-web/

## 這是什麼

93 題練習，分成兩種：

- **單一練習（83 題，39 個主題）** — 一個語法一次講清楚，每個主題 2～3 題，由淺入深。
- **組合練習（10 題）** — 一題要同時用上 LEFT JOIN + GROUP BY + NVL + CASE WHEN 這種，比較接近實務上真的會寫出來的查詢。

另外有一個 **Sandbox**，空白編輯器接同一套資料，想試什麼就試什麼，DML 改動會留著直到你按重設。

## 涵蓋的語法

| 分類 | 內容 |
| --- | --- |
| JOIN | INNER / LEFT / RIGHT / FULL OUTER / 三表以上的多表 JOIN、自我連接、CROSS JOIN、BETWEEN 非等值連接 |
| 集合運算 | UNION、UNION ALL、MINUS、INTERSECT |
| 篩選 | IN / NOT IN（含 NULL 陷阱）、EXISTS / NOT EXISTS、ANY / ALL、OR 與 AND 的優先權、LIKE、BETWEEN、IS NULL |
| 彙總 | COUNT / SUM / AVG / MAX / MIN、GROUP BY、HAVING |
| 分析函數 | ROW_NUMBER、RANK / DENSE_RANK、NTILE、LAG / LEAD、FIRST_VALUE / LAST_VALUE、SUM / AVG … OVER (PARTITION BY …)、累計與佔比、ROWS 視窗範圍 |
| 進階查詢 | WITH（CTE）、內嵌視圖、純量子查詢、關聯子查詢、CONNECT BY / START WITH / LEVEL / SYS_CONNECT_BY_PATH 階層查詢 |
| 排序與分頁 | ORDER BY 的 NULLS FIRST / LAST、FETCH FIRST n ROWS ONLY、OFFSET 分頁、ROWNUM 舊寫法 |
| 函數 | 字串（\|\| / SUBSTR / INSTR / LPAD / REPLACE …）、日期（TO_CHAR / EXTRACT / MONTHS_BETWEEN / ADD_MONTHS / LAST_DAY / TRUNC）、數值（ROUND / TRUNC / MOD / CEIL / FLOOR）、LISTAGG、COALESCE / NULLIF |
| 其他 | DISTINCT、CASE WHEN、NVL / NVL2 |
| Oracle 慣用寫法 | JOIN UPDATE（可更新連接視圖）、MERGE / UPSERT、INSERT … SELECT、DELETE … NOT EXISTS |

## 批改是怎麼判的

不是比對字串。每次檢查都會開兩個全新的資料庫，一個跑參考答案、一個跑你的 SQL，然後比對結果：

- **查詢題** 比對整個結果集。除非題目明講要排序（那種題目會標 `ordered`），否則列的順序不影響對錯。數字與數字字串視為相等，浮點數比到小數第 6 位。
- **DML 題**（JOIN UPDATE、MERGE、INSERT、DELETE）比對執行後受影響資料表的完整內容快照。
- **語法要求** 另外檢查：該用 `LEFT JOIN` 的題目不能用子查詢繞過去，該用 `MERGE` 的不能拆成兩句。檢查時會先把字串常值與註解遮掉，所以字串裡出現關鍵字不會誤判。
- 欄位別名跟參考答案不同只會提醒，不算錯。

只要結果對、寫法符合要求，用什麼等價寫法都算過。

參考答案與教學範例一律用小寫關鍵字、select 清單一欄一行的排版，跟自己平常寫的習慣一致。

**看解答要密碼。** 按「看解答」會先跳出密碼框，密碼是 `123456`，輸入一次之後同一個分頁就不用再輸入，關掉分頁就失效。這只是給自己的緩衝，不是資安機制 —— 密碼就寫在前端原始碼裡，想繞過隨時繞得過去，真正擋住的是「手比腦快先按下去」那一下。

## 底層怎麼跑的

瀏覽器裡沒有 Oracle。這裡用的是 **sql.js**（SQLite 編成 WebAssembly），外面包一層自己寫的 Oracle 方言轉換，讓下列寫法可以直接執行：

- `MINUS` → `EXCEPT`
- `MERGE ... WHEN MATCHED / WHEN NOT MATCHED` → 拆成 `UPDATE ... FROM` + `INSERT ... SELECT ... WHERE NOT EXISTS`
- `UPDATE (SELECT ...) SET ...` 可更新連接視圖 → `UPDATE ... FROM`
- `DECODE` → `CASE WHEN ... IS ...`（用 SQLite 的 null-safe `IS`）
- `NVL`、`NVL2`、`TO_CHAR`、`TO_DATE`、`TO_NUMBER`、`INITCAP`、`LPAD`、`RPAD`、`MOD`、`MONTHS_BETWEEN`、`ADD_MONTHS`、`LAST_DAY`、`TRUNC`、`GREATEST`、`LEAST`、`LISTAGG` 以 UDF 或改寫實作
- `DUAL`、`ROWNUM`、`FETCH FIRST n ROWS ONLY`、`OFFSET n ROWS FETCH NEXT m ROWS ONLY`
- `EXTRACT(YEAR FROM ...)` → `CAST(strftime(...) AS INTEGER)`
- `> ANY` / `< ALL` 這類量化比較 → `MAX()` / `MIN()` 子查詢（`= ANY` → `IN`、`<> ALL` → `NOT IN`）
- `CONNECT BY ... START WITH ...` 階層查詢 → `WITH RECURSIVE`，含 `LEVEL`、`PRIOR`、`NOCYCLE`、`SYS_CONNECT_BY_PATH`
- `ORDER BY` 的 NULL 位置比照 Oracle（ASC → NULLS LAST、DESC → NULLS FIRST），SQLite 預設剛好相反
- 分析函數（`ROW_NUMBER` / `RANK` / `DENSE_RANK` / `NTILE` / `LAG` / `LEAD` / `FIRST_VALUE` / `LAST_VALUE` / 彙總 `OVER`）與 `WITH` 由 SQLite 原生支援，寫法跟 Oracle 一樣，不需要轉換

`SYSDATE` 固定在 **2024-09-30**，這樣跟日期有關的題目答案才不會隔天就變。

**已知差異**：`(+)` 舊式外連接語法不支援（會直接報錯要你改寫成標準 JOIN）；`ROLLUP` / `CUBE` / `GROUPING SETS` 與 `PIVOT` / `UNPIVOT` 不支援；`LISTAGG` 的 `WITHIN GROUP (ORDER BY ...)` 會被忽略；`CONNECT BY` 限單一資料表、最多 100 層，`CONNECT_BY_ROOT` / `CONNECT_BY_ISLEAF` 不支援；`> ALL (空集合)` 在 Oracle 為真、本站會得到 NULL；沒有 PL/SQL 與序列。網頁裡「方言對照」分頁列了完整清單。

## 練習用的資料

8 張表，資料刻意做得不對稱，這樣各種 JOIN 才看得出差別：

`departments`（5 個部門，其中客服部沒有任何員工）、`employees`（12 人，2 人沒有部門、6 人沒有獎金比例）、`projects`（6 案，1 案沒有部門也沒有成員）、`emp_projects`、`salary_grades`、`emp_bonus`（只有 3 筆，讓 MERGE 兩個分支都會走到）、`salary_adjust`（含一筆調降、一筆對應不到員工）、`dual`。

不用背表名。右上角的 **🗺️ 關聯圖** 會把 8 張表、每個欄位的型別、主鍵與外鍵一次畫出來，箭頭指向它參照的欄位，滑過欄位還有中文說明；非等值連接（`salary` 落在 `salary_grades` 的哪個級距）也標在圖例裡。編輯器裡打字則會跳出提示，表名、欄位名、函數都會補，`e.` 這種別名前綴會自動對應到該表的欄位；`Ctrl / ⌘ + Space` 可以手動叫出來。

## 本機跑

因為用了 ES modules，直接用 `file://` 開會被瀏覽器擋，要起一個本機伺服器：

```bash
git clone https://github.com/jie80219/oracle-sql-web.git
cd oracle-sql-web
python3 -m http.server 8000
# 開 http://localhost:8000
```

跑測試（驗證全部 93 題的參考答案都能執行、結果非空、且通過自己的批改）：

```bash
npm install
npm test
```

## 結構

```
index.html              版面
css/style.css           樣式（自動跟隨系統深色模式，也可手動切）
js/schema.js            資料表定義與種子資料
js/oracle.js            Oracle → SQLite 方言轉換層
js/engine.js            建庫、執行、快照、評分流程
js/checker.js           結果比對與語法要求檢查
js/exercises.js         39 個主題、83 題單一練習、10 題組合練習
js/db.js                sql.js 載入與資料庫管理
js/diagram.js           資料表關聯圖
js/autocomplete.js      編輯器的提示字
js/app.js               介面控制
test/verify.mjs         Node 測試（npm test）
vendor/                 sql.js 的 wasm，直接放在 repo 裡，不依賴 CDN
```

作答進度與草稿存在瀏覽器的 localStorage，不會上傳任何東西。右上角可以清除。

## 授權

MIT。sql.js 為 MIT 授權，授權條款在 `vendor/sql.js-LICENSE`。
