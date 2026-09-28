// 語法小動畫：每個主題用幾個「步驟」把語法的實際效果演一遍。
//
// 一個步驟就是一張畫面快照（要顯示哪些表、哪些列被點亮、畫哪些箭頭、
// 輸出區有什麼），播放就是依序切換快照，CSS transition 負責補間。
// 這樣寫的好處是：新增主題只要描述每一步「長什麼樣」，不用寫時間軸。

const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ── 建構步驟用的小工具 ────────────────────────────────────────

// 一張表：name 是表頭，cols 是欄位名，rows 是每一列的值
// rows 裡每一列可以帶 state：'' | 'hit'（命中）| 'miss'（被排除）| 'null'（補 NULL）
const T = (name, cols, rows) => ({ name, cols, rows });
const R = (cells, state = '') => ({ cells, state });

// ── 播放器 ────────────────────────────────────────────────────

const STEP_MS = 1600;

const cellHtml = (v) => {
  if (v === null || v === undefined) return '<span class="an-null">NULL</span>';
  return esc(v);
};

function tableHtml(t, side) {
  return `
  <div class="an-table" data-side="${side}">
    <div class="an-tname">${esc(t.name)}</div>
    <table>
      <thead><tr>${t.cols.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead>
      <tbody>
        ${t.rows.map((r, i) => `
          <tr class="an-row${r.state ? ` is-${r.state}` : ''}" data-row="${side}${i}">
            ${r.cells.map((c) => `<td>${cellHtml(c)}</td>`).join('')}
          </tr>`).join('')}
      </tbody>
    </table>
  </div>`;
}

function stageHtml(step) {
  const tables = (step.tables || []).map((t, i) => tableHtml(t, i)).join(
    step.op ? `<div class="an-op">${esc(step.op)}</div>` : '');

  const out = step.out
    ? `<div class="an-out">
         <div class="an-arrowdown">▼</div>
         ${tableHtml(step.out, 'o')}
       </div>`
    : '';

  return `<div class="an-stage">
    <div class="an-tables">${tables}</div>
    ${out}
  </div>`;
}

/**
 * 把一組步驟掛到容器上，回傳 destroy()。
 * steps: [{ note, tables, op, out }]
 */
export function mountAnim(host, steps, topicName) {
  if (!steps || !steps.length) return () => {};

  let idx = 0;
  let timer = null;
  let playing = false;

  host.innerHTML = `
    <div class="an-box" role="group" aria-label="${esc(topicName)} 示意動畫">
      <div class="an-viewport"></div>
      <p class="an-note" aria-live="polite"></p>
      <div class="an-ctrl">
        <button type="button" class="an-btn an-play" title="播放／暫停">▶</button>
        <button type="button" class="an-btn an-prev" title="上一步">‹</button>
        <button type="button" class="an-btn an-next" title="下一步">›</button>
        <span class="an-dots"></span>
        <span class="an-count"></span>
      </div>
    </div>`;

  const viewport = host.querySelector('.an-viewport');
  const note = host.querySelector('.an-note');
  const dots = host.querySelector('.an-dots');
  const count = host.querySelector('.an-count');
  const btnPlay = host.querySelector('.an-play');

  function render() {
    const s = steps[idx];
    viewport.innerHTML = stageHtml(s);
    note.textContent = s.note || '';
    count.textContent = `${idx + 1} / ${steps.length}`;
    dots.innerHTML = steps.map((_, i) =>
      `<i class="an-dot${i === idx ? ' on' : ''}" data-i="${i}"></i>`).join('');
  }

  function stop() {
    playing = false;
    clearInterval(timer);
    timer = null;
    btnPlay.textContent = '▶';
  }

  function play() {
    if (playing) return stop();
    playing = true;
    btnPlay.textContent = '❙❙';
    // 已經在最後一步時，從頭開始播
    if (idx >= steps.length - 1) { idx = 0; render(); }
    timer = setInterval(() => {
      if (idx >= steps.length - 1) return stop();
      idx += 1;
      render();
    }, STEP_MS);
  }

  function goto(i) {
    stop();
    idx = Math.max(0, Math.min(steps.length - 1, i));
    render();
  }

  host.addEventListener('click', (e) => {
    const btn = e.target.closest('.an-btn, .an-dot');
    if (!btn) return;
    if (btn.classList.contains('an-play')) play();
    else if (btn.classList.contains('an-prev')) goto(idx - 1);
    else if (btn.classList.contains('an-next')) goto(idx + 1);
    else if (btn.classList.contains('an-dot')) goto(Number(btn.dataset.i));
  });

  render();
  return stop;
}

export { T, R };
