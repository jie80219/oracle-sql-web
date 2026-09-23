// 資料表關聯圖：把 8 張表跟彼此的關聯畫出來，寫 SQL 時可以隨時叫出來看。
import { TABLE_META } from './schema.js';

const CARD_W = 260;
const HEAD_H = 38;
const ROW_H = 25;
const PAD_B = 8;

// 版面是手工排的，目的是讓有關聯的表盡量相鄰，線才不會穿過別的卡片
const LAYOUT = {
  departments:   { x: 30,   y: 70 },
  emp_bonus:     { x: 30,   y: 290 },
  salary_adjust: { x: 30,   y: 486 },
  employees:     { x: 370,  y: 70 },
  salary_grades: { x: 370,  y: 400 },
  emp_projects:  { x: 710,  y: 70 },
  dual:          { x: 710,  y: 290 },
  projects:      { x: 1050, y: 70 },
};

const CANVAS_W = 1340;
const CANVAS_H = 660;

const DUAL = {
  name: 'dual', label: 'Oracle 虛擬表',
  columns: [['dummy', 'CHAR', "固定一列，值為 'X'"]],
};

const TABLES = [...TABLE_META, DUAL];

// [來源表, 來源欄, 目標表, 目標欄, 說明, 走線方式]
const LINKS = [
  ['employees', 'dept_id', 'departments', 'dept_id', '員工屬於哪個部門', 'left'],
  ['departments', 'manager_id', 'employees', 'emp_id', '部門主管是誰', 'right'],
  ['employees', 'manager_id', 'employees', 'emp_id', '直屬主管也是員工', 'self'],
  ['emp_projects', 'emp_id', 'employees', 'emp_id', '誰參與了專案', 'left'],
  ['emp_projects', 'proj_id', 'projects', 'proj_id', '參與的是哪個專案', 'right'],
  ['emp_bonus', 'emp_id', 'employees', 'emp_id', '獎金屬於誰', 'right'],
  ['salary_adjust', 'emp_id', 'employees', 'emp_id', '調薪申請是誰的', 'right'],
  ['projects', 'dept_id', 'departments', 'dept_id', '專案由哪個部門負責', 'over'],
];

// 沒有外鍵、但實務上會拿來 JOIN 的搭配
const SOFT_LINKS = [
  ['employees.salary', 'salary_grades.min_sal / max_sal',
   '用 BETWEEN 判定薪資落在哪個級距，這是非等值連接（non-equi join）'],
  ['emp_bonus.grade', 'salary_grades.grade', '獎金表上的級距代碼'],
];

const table = (name) => TABLES.find((t) => t.name === name);
const height = (t) => HEAD_H + t.columns.length * ROW_H + PAD_B;
const rowY = (name, col) => {
  const t = table(name);
  const i = t.columns.findIndex((c) => c[0] === col);
  return LAYOUT[name].y + HEAD_H + i * ROW_H + ROW_H / 2;
};

const isPk = (note) => /（PK）/.test(note);
const fkCols = new Set(LINKS.map(([t, c]) => `${t}.${c}`));

function cardHtml(t) {
  const { x, y } = LAYOUT[t.name];
  const rows = t.columns.map(([col, type, note]) => {
    const key = isPk(note) ? '<span class="dg-key dg-pk">PK</span>'
      : fkCols.has(`${t.name}.${col}`) ? '<span class="dg-key dg-fk">FK</span>'
      : '<span class="dg-key"></span>';
    const nullable = /可為 NULL|多數為 NULL/.test(note) ? '<span class="dg-null">NULL</span>' : '';
    return `<div class="dg-row" title="${note.replace(/"/g, '')}">
      ${key}<span class="dg-col">${col}</span><span class="dg-type">${type}</span>${nullable}
    </div>`;
  }).join('');
  return `<div class="dg-card" style="left:${x}px;top:${y}px;width:${CARD_W}px">
    <div class="dg-head"><b>${t.name}</b><span>${t.label}</span></div>${rows}
  </div>`;
}

function linkPath([st, sc, dt, dc, , mode], i) {
  const s = LAYOUT[st];
  const d = LAYOUT[dt];
  const y1 = rowY(st, sc);
  const y2 = rowY(dt, dc) + (mode === 'self' ? 0 : (i % 3) - 1); // 多條線收斂到同一列時稍微錯開

  if (mode === 'self') {
    const x = s.x + CARD_W;
    return `M ${x} ${y1} C ${x + 52} ${y1}, ${x + 52} ${y2}, ${x} ${y2}`;
  }
  if (mode === 'over') {
    // 兩端隔太遠，改走上方留白繞過去，不要穿過中間的卡片
    const x1 = s.x;
    return `M ${x1} ${y1} L ${x1 - 26} ${y1} L ${x1 - 26} 26 L 14 26 L 14 ${y2} L ${d.x} ${y2}`;
  }
  // left：來源在目標右邊，從來源左緣連到目標右緣
  const x1 = mode === 'left' ? s.x : s.x + CARD_W;
  const x2 = mode === 'left' ? d.x + CARD_W : d.x;
  const bend = Math.max(40, Math.abs(x2 - x1) * 0.45);
  const dir = mode === 'left' ? -1 : 1;
  return `M ${x1} ${y1} C ${x1 + dir * bend} ${y1}, ${x2 - dir * bend} ${y2}, ${x2} ${y2}`;
}

function endpoints(link) {
  const [st, sc, dt, dc, , mode] = link;
  const s = LAYOUT[st];
  const d = LAYOUT[dt];
  if (mode === 'self') return [[s.x + CARD_W, rowY(st, sc)], [s.x + CARD_W, rowY(dt, dc)]];
  return [
    [mode === 'left' ? s.x : s.x + CARD_W, rowY(st, sc)],
    [mode === 'left' || mode === 'over' ? d.x + (mode === 'over' ? 0 : CARD_W) : d.x, rowY(dt, dc)],
  ];
}

export function diagramHtml() {
  const paths = LINKS.map((l, i) =>
    `<path d="${linkPath(l, i)}" class="dg-link" marker-end="url(#dg-arrow)"><title>${l[0]}.${l[1]} → ${l[2]}.${l[3]}：${l[4]}</title></path>`).join('');
  const dots = LINKS.flatMap((l) => endpoints(l))
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" class="dg-dot" />`).join('');

  return `
  <div class="dg-scroll">
    <div class="dg-canvas" style="width:${CANVAS_W}px;height:${CANVAS_H}px">
      <svg class="dg-svg" width="${CANVAS_W}" height="${CANVAS_H}" aria-hidden="true">
        <defs>
          <marker id="dg-arrow" viewBox="0 0 8 8" refX="7" refY="4"
                  markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 8 4 L 0 8 z" class="dg-arrow" />
          </marker>
        </defs>
        ${paths}${dots}
      </svg>
      ${TABLES.map(cardHtml).join('')}
    </div>
  </div>
  <div class="dg-legend">
    <div class="dg-legend-row">
      <span><span class="dg-key dg-pk">PK</span> 主鍵</span>
      <span><span class="dg-key dg-fk">FK</span> 外鍵，箭頭指向它參照的欄位</span>
      <span><span class="dg-null">NULL</span> 這欄有 NULL，外連接跟 NOT IN 要特別小心</span>
    </div>
    <p class="dg-note"><b>沒有外鍵、但常拿來 JOIN 的：</b></p>
    <ul class="dg-soft">
      ${SOFT_LINKS.map(([a, b, why]) => `<li><code>${a}</code> ↔ <code>${b}</code> —— ${why}</li>`).join('')}
    </ul>
    <p class="dg-note">滑鼠移到欄位上可以看中文說明。這份資料刻意做得不對稱：有部門沒半個員工、有員工沒部門、有專案沒成員，各種 JOIN 的差別才看得出來。</p>
  </div>`;
}
