/* BRIGHT-Flash · Compute × Accuracy Atlas
   Vanilla JS, inline SVG, no external dependencies. */
(() => {
  'use strict';
  window.addEventListener('error', (event) => {
    document.documentElement.setAttribute('data-js-error', event.message || 'unknown');
  });
  window.addEventListener('unhandledrejection', (event) => {
    document.documentElement.setAttribute('data-js-error', String(event.reason || 'unhandled rejection'));
  });

  const DATA = window.DASHBOARD_DATA;
  const PARAMS = new URLSearchParams(location.search);
  const STATIC_MODE = PARAMS.has('static');
  const SECTION_PARAM = PARAMS.get('section');
  const TASK_PARAM = PARAMS.get('tasks');
  const TIME_PARAM = PARAMS.get('time');
  const MODELS_PARAM = PARAMS.get('models');
  const HEAT_PARAM = PARAMS.get('heat');
  const CAPTURE_MODE = new URLSearchParams(location.search).has('capture');
  if (CAPTURE_MODE) document.documentElement.classList.add('capture');
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  if (!DATA || !DATA.models) {
    document.body.innerHTML = '<p style="padding:40px;color:#14202e">缺少数据包。请先运行 <code>python3 visualizations/interactive/build_data.py</code>。</p>';
    return;
  }

  const MODELS = DATA.models;
  const IDS = Object.keys(MODELS);

  const LIGHT_MODEL_COLORS = {
    'BRIGHT': '#6d5bd0',
    'BRIGHT-Flash-1007': '#b4233d',
    'BRIGHT-Flash-pipeline': '#0e7490',
    'EAGLE': '#a16207',
    'Virchow2': '#2563eb',
    'BRIGHT-Flash': '#c2410c',
    'UNIv2': '#0f766e',
    'Prov-Gigapath': '#9a3412',
    'Conchv1.5': '#7e22ce',
    'CHIEF': '#be123c'
  };
  const MODEL_FULL_ZH = {
    'BRIGHT': 'BRIGHT（20×）',
    'BRIGHT-Flash-1007': 'BRIGHT-Flash-1007（ep6）',
    'BRIGHT-Flash-pipeline': 'BRIGHT-Flash-pipeline（5× → 20× 级联）',
    'EAGLE': 'EAGLE（高效级联基线）',
    'Virchow2': 'Virchow2（20× 基础编码器）',
    'BRIGHT-Flash': 'BRIGHT-Flash（ep3）',
    'UNIv2': 'UNIv2（20× 基础编码器）',
    'Prov-Gigapath': 'Prov-Gigapath（20× 基础编码器）',
    'Conchv1.5': 'Conchv1.5（20× 基础编码器）',
    'CHIEF': 'CHIEF（20× 基础编码器）'
  };
  const ROLE_ZH = {
    'BRIGHT 20× + ABMIL': 'BRIGHT（20×）+ ABMIL',
    'BRIGHT-Flash ep6 + ABMIL': 'BRIGHT-Flash ep6 + ABMIL',
    'BRIGHT-Flash 5× → S2 → BRIGHT 20× → ABMIL': 'BRIGHT-Flash 5× → S2 → BRIGHT（20×）→ ABMIL',
    '5x CTransPath → CHIEF top-25 → Virchow2': '5× CTransPath → CHIEF Top-25 → Virchow2',
    '20x foundation encoder + ABMIL': '20× 基础编码器 + ABMIL',
    'BRIGHT-Flash ep3 + ABMIL': 'BRIGHT-Flash ep3 + ABMIL',
    '20x CTransPath + ABMIL': '20× CTransPath + ABMIL'
  };
  Object.entries(MODELS).forEach(([id, model]) => {
    if (LIGHT_MODEL_COLORS[id]) model.color = LIGHT_MODEL_COLORS[id];
    if (MODEL_FULL_ZH[id]) model.full = MODEL_FULL_ZH[id];
    if (ROLE_ZH[model.role]) model.role = ROLE_ZH[model.role];
  });
  const FOUNDATION = ['Virchow2', 'UNIv2', 'Prov-Gigapath', 'Conchv1.5', 'CHIEF'];
  const DEFAULT_SELECTED = ['BRIGHT', 'BRIGHT-Flash-1007', 'BRIGHT-Flash-pipeline', 'EAGLE'];
  const OURS = ['BRIGHT-Flash-1007', 'BRIGHT-Flash-pipeline'];
  const CATEGORY_ORDER = ['IHC / receptor', 'Diagnosis / grading', 'Staging', 'Treatment response'];
  const CATEGORY_LABELS = {
    'IHC / receptor': '免疫组化 / 受体',
    'Diagnosis / grading': '诊断 / 分级',
    'Staging': '分期',
    'Treatment response': '治疗反应'
  };
  const CATEGORY_COLORS = {
    'IHC / receptor': '#b45309',
    'Diagnosis / grading': '#0e7490',
    'Staging': '#6d5bd0',
    'Treatment response': '#be123c'
  };
  const LABEL_OFFSETS = {
    'BRIGHT': [-12, -15, 'end'],
    'BRIGHT-Flash-1007': [14, -17, 'start'],
    'BRIGHT-Flash-pipeline': [14, 18, 'start'],
    'EAGLE': [13, 16, 'start'],
    'BRIGHT-Flash': [14, 18, 'start'],
    'Virchow2': [-13, 15, 'end'],
    'UNIv2': [14, 4, 'start'],
    'Prov-Gigapath': [14, 5, 'start'],
    'Conchv1.5': [-13, -12, 'end'],
    'CHIEF': [-13, -10, 'end']
  };
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const state = {
    taskSet: TASK_PARAM === '17' ? '17' : '20',
    timeMode: TIME_PARAM === 'e2e' ? 'e2e' : 'model',
    selected: MODELS_PARAM === 'all' ? new Set(IDS) : new Set(DEFAULT_SELECTED),
    heatmapMode: HEAT_PARAM === 'absolute' ? 'absolute' : 'delta'
  };

  let tipSeq = 0;
  const tipStore = new Map();

  /* ---------- small helpers ---------- */
  const fmt = (value, digits = 3) => Number(value).toFixed(digits);
  const signed = (value, digits = 3) => `${value >= 0 ? '+' : ''}${Number(value).toFixed(digits)}`;
  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
  const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));

  function svgEl(tag, attrs = {}, parent = null) {
    const node = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs).forEach(([key, value]) => {
      if (value !== undefined && value !== null) node.setAttribute(key, String(value));
    });
    if (parent) parent.appendChild(node);
    return node;
  }

  function svgText(parent, x, y, content, attrs = {}) {
    const node = svgEl('text', { x, y, ...attrs }, parent);
    node.textContent = content;
    return node;
  }

  function registerTip(html) {
    const key = `tip-${++tipSeq}`;
    tipStore.set(key, html);
    return key;
  }

  function attachTip(node, key) {
    node.setAttribute('data-tip-key', key);
    node.setAttribute('tabindex', '0');
    node.setAttribute('role', 'img');
    return node;
  }

  function modelTip(id) {
    const model = MODELS[id];
    const timeLabel = state.timeMode === 'model' ? '模型耗时' : '端到端';
    const star = id === 'BRIGHT-Flash-1007' ? '*' : '';
    const dagger = id === 'BRIGHT-Flash-1007' ? '†' : '';
    return `<strong>${esc(model.full)}</strong><br><span class="tt-muted">${esc(model.role)}</span>
      <div class="tt-rule"></div>
      <div class="tt-row"><span>${state.taskSet} 任务均值</span><span>${fmt(meanOf(model))}</span></div>
      <div class="tt-row"><span>${timeLabel}</span><span>${fmt(timeOf(model), 2)} s${star}</span></div>
      <div class="tt-row"><span>权重</span><span>${model.weights.gib.toFixed(2)} GiB${dagger}</span></div>
      <div class="tt-row"><span>Top-2</span><span>${top2Of(model)}/${state.taskSet}</span></div>`;
  }

  function tasks() {
    return state.taskSet === '20' ? DATA.tasks20 : DATA.tasks17;
  }

  function meanOf(model) {
    return state.taskSet === '20' ? model.mean20 : model.mean17;
  }

  function rankOf(model) {
    return state.taskSet === '20' ? model.rank20 : model.rank17;
  }

  function top2Of(model) {
    return state.taskSet === '20' ? model.top2_20 : model.top2_17;
  }

  function timeOf(model) {
    return state.timeMode === 'model' ? model.timing.modelTime : model.timing.endToEnd;
  }

  function cellOf(model, task) {
    return state.taskSet === '20' ? model.auc20[task] : model.auc17[task];
  }

  function selectedIds() {
    return IDS.filter((id) => state.selected.has(id));
  }

  function isOurs(id) {
    return OURS.includes(id);
  }

  function categoryOf(task) {
    return DATA.taskMeta[task].category;
  }

  function sortedTasks() {
    return [...tasks()].sort((a, b) => {
      const ca = CATEGORY_ORDER.indexOf(categoryOf(a));
      const cb = CATEGORY_ORDER.indexOf(categoryOf(b));
      if (ca !== cb) return ca - cb;
      return DATA.tasks20.indexOf(a) - DATA.tasks20.indexOf(b);
    });
  }

  function mean(values) {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  /* ---------- number animation ---------- */
  function setValue(el, value, digits = 3, suffix = '', animate = false) {
    if (!el) return;
    const target = Number(value);
    const text = `${target.toFixed(digits)}${suffix}`;
    if (!animate || reduceMotion || STATIC_MODE || el.dataset.animated === '1') {
      el.textContent = text;
      el.dataset.animated = '1';
      return;
    }
    el.dataset.animated = '1';
    const start = performance.now();
    const duration = 850;
    const from = 0;
    function tick(now) {
      const k = clamp((now - start) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - k, 3);
      el.textContent = `${(from + (target - from) * eased).toFixed(digits)}${suffix}`;
      if (k < 1) requestAnimationFrame(tick);
      else el.textContent = text;
    }
    requestAnimationFrame(tick);
  }

  /* ---------- tooltips ---------- */
  const tooltip = $('#tooltip');

  function positionTooltip(event) {
    if (!tooltip) return;
    const rect = tooltip.getBoundingClientRect();
    const gap = 14;
    let x = event.clientX + gap;
    let y = event.clientY + gap;
    if (x + rect.width > window.innerWidth - 12) x = event.clientX - rect.width - gap;
    if (y + rect.height > window.innerHeight - 12) y = event.clientY - rect.height - gap;
    tooltip.style.left = `${Math.max(8, x)}px`;
    tooltip.style.top = `${Math.max(8, y)}px`;
  }

  function showTooltip(key, event) {
    const html = tipStore.get(key);
    if (!html || !tooltip) return;
    tooltip.innerHTML = html;
    tooltip.classList.add('show');
    positionTooltip(event);
  }

  function hideTooltip() {
    if (tooltip) tooltip.classList.remove('show');
  }

  document.addEventListener('pointerover', (event) => {
    const el = event.target.closest('[data-tip-key]');
    if (el) showTooltip(el.getAttribute('data-tip-key'), event);
  });
  document.addEventListener('pointermove', (event) => {
    if (tooltip && tooltip.classList.contains('show')) positionTooltip(event);
  });
  document.addEventListener('pointerout', (event) => {
    if (event.target.closest('[data-tip-key]')) hideTooltip();
  });
  document.addEventListener('focusin', (event) => {
    const el = event.target.closest('[data-tip-key]');
    if (!el) return;
    const rect = el.getBoundingClientRect();
    showTooltip(el.getAttribute('data-tip-key'), {
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2
    });
  });
  document.addEventListener('focusout', (event) => {
    if (event.target.closest('[data-tip-key]')) hideTooltip();
  });

  /* ---------- hero ---------- */
  function renderHero(animate = false) {
    const a = MODELS['BRIGHT-Flash-1007'];
    const p = MODELS['BRIGHT-Flash-pipeline'];
    const b = MODELS['BRIGHT'];
    setValue($('#hero-1007-auc'), meanOf(a), 3, '', animate);
    setValue($('#hero-pipe-auc'), meanOf(p), 3, '', animate);
    setValue($('#hero-bright-auc'), meanOf(b), 3, '', animate);
    setValue($('#hero-1007-time'), timeOf(a), 2, 's*', animate);
    setValue($('#hero-pipe-time'), timeOf(p), 2, 's', animate);
    setValue($('#hero-bright-time'), timeOf(b), 2, 's', animate);
    $('#hero-1007-size').textContent = `${a.weights.gib.toFixed(2)} GiB`;
    $('#hero-pipe-size').textContent = `${p.weights.gib.toFixed(2)} GiB`;
    $('#hero-bright-size').textContent = `${b.weights.gib.toFixed(2)} GiB`;
    $$('.hero-auc-label').forEach((el) => { el.textContent = `${state.taskSet} 任务平均 AUC`; });

    const ratioA = timeOf(b) / timeOf(a);
    const ratioP = timeOf(b) / timeOf(p);
    $('#path-1007-time').textContent = `${timeOf(a).toFixed(2)} s*`;
    $('#path-pipe-time').textContent = `${timeOf(p).toFixed(2)} s`;
    $('#path-1007-speed').textContent = `比 BRIGHT 快 ${ratioA.toFixed(1)}×`;
    $('#path-pipe-speed').textContent = `比 BRIGHT 快 ${ratioP.toFixed(1)}×`;
  }

  /* ---------- model chips ---------- */
  function renderChips() {
    const wrap = $('#model-chips');
    if (!wrap) return;
    wrap.innerHTML = '';
    IDS.forEach((id) => {
      const model = MODELS[id];
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `chip${state.selected.has(id) ? ' active' : ''}${isOurs(id) ? ' ours' : ''}`;
      button.style.setProperty('--chip', model.color);
      button.dataset.id = id;
      button.setAttribute('aria-pressed', String(state.selected.has(id)));
      button.innerHTML = `<span class="chip-dot" aria-hidden="true"></span><span>${esc(model.short)}</span>`;
      button.addEventListener('click', () => toggleModel(id));
      wrap.appendChild(button);
    });
  }

  function toggleModel(id) {
    if (state.selected.has(id) && state.selected.size === 1) return;
    if (state.selected.has(id)) state.selected.delete(id);
    else state.selected.add(id);
    renderChips();
    renderAll(false);
  }

  function setSelection(ids) {
    state.selected = new Set(ids.filter((id) => MODELS[id]));
    renderChips();
    renderAll(false);
  }

  /* ---------- scatter ---------- */
  function renderScatter() {
    const svg = $('#scatter');
    if (!svg) return;
    svg.innerHTML = '';
    const W = 980, H = 560;
    const M = { top: 30, right: 38, bottom: 64, left: 76 };
    const IW = W - M.left - M.right;
    const IH = H - M.top - M.bottom;

    const xValues = IDS.map((id) => timeOf(MODELS[id]));
    const yValues = IDS.map((id) => meanOf(MODELS[id]));
    const xMin = Math.min(...xValues) * 0.88;
    const xMax = Math.max(...xValues) * 1.12;
    const yMin = Math.min(...yValues) - 0.0045;
    const yMax = Math.max(...yValues) + 0.0045;

    const log = (value) => Math.log10(value);
    const sx = (value) => M.left + ((log(value) - log(xMin)) / (log(xMax) - log(xMin))) * IW;
    const sy = (value) => M.top + (1 - (value - yMin) / (yMax - yMin)) * IH;

    const defs = svgEl('defs', {}, svg);
    const glow = svgEl('filter', { id: 'scatter-glow', x: '-60%', y: '-60%', width: '220%', height: '220%' }, defs);
    svgEl('feGaussianBlur', { stdDeviation: '4', result: 'blur' }, glow);
    const merge = svgEl('feMerge', {}, glow);
    svgEl('feMergeNode', { in: 'blur' }, merge);
    svgEl('feMergeNode', { in: 'SourceGraphic' }, merge);

    svgEl('rect', {
      x: M.left, y: M.top, width: IW, height: IH, rx: 6,
      fill: '#fbfdff', stroke: '#e3ebf4'
    }, svg);

    // The five 20x foundation encoders form a comparison band.
    const fx1 = Math.min(...FOUNDATION.map((id) => timeOf(MODELS[id])));
    const fx2 = Math.max(...FOUNDATION.map((id) => timeOf(MODELS[id])));
    svgEl('rect', {
      x: sx(fx1), y: M.top, width: sx(fx2) - sx(fx1), height: IH,
      fill: 'rgba(37,99,235,.045)', stroke: 'rgba(37,99,235,.18)', 'stroke-dasharray': '4 6'
    }, svg);
    svgText(svg, (sx(fx1) + sx(fx2)) / 2, M.top + 15, '20× 基础编码器', {
      'text-anchor': 'middle', class: 'annotation-text', fill: '#2563eb'
    });

    const bestFoundation = FOUNDATION.reduce((a, b) => meanOf(MODELS[b]) > meanOf(MODELS[a]) ? b : a);
    const foundationY = sy(meanOf(MODELS[bestFoundation]));
    svgEl('line', {
      x1: M.left, y1: foundationY, x2: M.left + IW, y2: foundationY,
      stroke: 'rgba(37,99,235,.28)', 'stroke-dasharray': '3 5'
    }, svg);

    const fastest = IDS.reduce((a, b) => timeOf(MODELS[b]) < timeOf(MODELS[a]) ? b : a);
    const fastestX = sx(timeOf(MODELS[fastest]));
    svgEl('line', {
      x1: fastestX, y1: M.top, x2: fastestX, y2: M.top + IH,
      stroke: 'rgba(180,35,61,.28)', 'stroke-dasharray': '3 5'
    }, svg);
    svgText(svg, fastestX + 7, M.top + 15, `最快 · ${timeOf(MODELS[fastest]).toFixed(2)}s*`, {
      class: 'annotation-text', fill: '#b4233d'
    });

    // Grid and axes.
    const yStep = 0.01;
    const yStart = Math.ceil(yMin / yStep) * yStep;
    for (let value = yStart; value <= yMax; value += yStep) {
      const y = sy(value);
      svgEl('line', { x1: M.left, y1: y, x2: M.left + IW, y2: y, class: 'grid-line' }, svg);
      svgText(svg, M.left - 10, y + 3, value.toFixed(3), { 'text-anchor': 'end', class: 'axis-text' });
    }
    const xTicks = state.timeMode === 'model' ? [2, 3, 5, 10, 20, 40] : [5, 10, 20, 40];
    xTicks.filter((v) => v >= xMin && v <= xMax).forEach((value) => {
      const x = sx(value);
      svgEl('line', { x1: x, y1: M.top, x2: x, y2: M.top + IH, class: 'grid-line' }, svg);
      svgText(svg, x, M.top + IH + 21, `${value}s`, { 'text-anchor': 'middle', class: 'axis-text' });
    });
    svgEl('line', { x1: M.left, y1: M.top + IH, x2: M.left + IW, y2: M.top + IH, class: 'axis-line' }, svg);
    svgEl('line', { x1: M.left, y1: M.top, x2: M.left, y2: M.top + IH, class: 'axis-line' }, svg);
    svgText(svg, M.left + IW / 2, H - 13, '单张耗时（秒，对数轴）', {
      'text-anchor': 'middle', class: 'axis-title'
    });
    svgText(svg, 14, M.top + IH / 2, state.timeMode === 'model' ? '仅模型耗时' : '端到端耗时', {
      'text-anchor': 'middle', transform: `rotate(-90 14 ${M.top + IH / 2})`, class: 'axis-title'
    });
    svgText(svg, M.left + 4, M.top - 10, '↑ 平均 AUC 更高', { class: 'axis-title' });
    svgText(svg, M.left + IW, M.top - 10, '← 更快', { 'text-anchor': 'end', class: 'axis-title' });

    // Points; unselected first so selected marks sit on top.
    const order = [...IDS].sort((a, b) => Number(state.selected.has(a)) - Number(state.selected.has(b)));
    order.forEach((id) => {
      const model = MODELS[id];
      const x = sx(timeOf(model));
      const y = sy(meanOf(model));
      const r = 5.2 + Math.sqrt(model.weights.gib) * 4.7;
      const active = state.selected.has(id);
      const g = svgEl('g', {}, svg);
      attachTip(g, registerTip(modelTip(id)));
      g.style.cursor = 'pointer';
      g.setAttribute('aria-label', `${model.full}：${fmt(meanOf(model))} 平均 AUC，${fmt(timeOf(model), 2)} 秒`);
      if (active) {
        svgEl('circle', {
          cx: x, cy: y, r: r + 4.5, fill: 'none', stroke: model.color,
          'stroke-opacity': .28, 'stroke-width': 1.2
        }, g);
      }
      svgEl('circle', {
        cx: x, cy: y, r,
        fill: model.color,
        'fill-opacity': active ? .92 : .24,
        stroke: active ? '#ffffff' : '#cbd5e1',
        'stroke-width': active ? 1.4 : 1,
        filter: active ? 'url(#scatter-glow)' : undefined
      }, g);
      if (active) {
        svgEl('circle', { cx: x, cy: y, r: 2.1, fill: '#fff', 'fill-opacity': .9 }, g);
      }
    });

    // Labels only for selected models, with deterministic offsets.
    selectedIds().forEach((id) => {
      const model = MODELS[id];
      const [dx, dy, anchor] = LABEL_OFFSETS[id] || [10, 4, 'start'];
      let lx = sx(timeOf(model)) + dx;
      let ly = sy(meanOf(model)) + dy;
      const label = model.short;
      const width = label.length * 6.1 + 12;
      lx = clamp(lx, M.left + 4, M.left + IW - 4);
      ly = clamp(ly, M.top + 14, M.top + IH - 8);
      const g = svgEl('g', {}, svg);
      const rectX = anchor === 'end' ? lx - width : lx;
      svgEl('rect', {
        x: rectX, y: ly - 9, width, height: 18, rx: 5,
        fill: 'rgba(255,255,255,.96)', stroke: model.color, 'stroke-opacity': .55
      }, g);
      svgText(g, anchor === 'end' ? lx - 6 : lx + 6, ly + 3, label, {
        'text-anchor': anchor, class: 'point-label-text', fill: model.color
      });
    });
  }

  function renderEfficiencyNotes() {
    const wrap = $('#efficiency-notes');
    if (!wrap) return;
    const a = MODELS['BRIGHT-Flash-1007'];
    const p = MODELS['BRIGHT-Flash-pipeline'];
    const b = MODELS['BRIGHT'];
    const e = MODELS['EAGLE'];
    const ratios = FOUNDATION.map((id) => timeOf(MODELS[id]) / timeOf(p));
    const minRatio = Math.min(...ratios).toFixed(1);
    const maxRatio = Math.max(...ratios).toFixed(1);
    const notes = [
      {
        cls: 'coral',
        title: '1007 · 最低计算成本',
        body: `<b>${fmt(timeOf(a), 2)} s*</b>，AUC <b>${fmt(meanOf(a))}</b>；比 BRIGHT 快 <b>${(timeOf(b) / timeOf(a)).toFixed(1)}×</b>，AUC 低 <b>${Math.abs(meanOf(a) - meanOf(b)).toFixed(4)}</b>。`
      },
      {
        cls: 'cyan',
        title: 'Pipeline · 基础模型组之上',
        body: `<b>${fmt(timeOf(p), 2)} s</b>，AUC <b>${fmt(meanOf(p))}</b>；快于五个 20× 基础编码器 <b>${minRatio}–${maxRatio}×</b>。`
      },
      {
        cls: 'amber',
        title: 'EAGLE · 效率参照',
        body: `<b>${fmt(timeOf(e), 2)} s</b>，20 任务 <b>${fmt(e.mean20)}</b>，17 任务 <b>${fmt(e.mean17)}</b>；比 Pipeline 快 <b>${(timeOf(p) / timeOf(e)).toFixed(1)}×</b>。`
      },
      {
        cls: 'violet',
        title: 'BRIGHT · 精度上界',
        body: `<b>${fmt(timeOf(b), 2)} s</b>，<b>${fmt(b.mean20)}</b> / <b>${fmt(b.mean17)}</b>；比 1007 慢 <b>${(timeOf(b) / timeOf(a)).toFixed(1)}×</b>，比 Pipeline 慢 <b>${(timeOf(b) / timeOf(p)).toFixed(1)}×</b>。`
      }
    ];
    wrap.innerHTML = notes.map((note) => `
      <div class="note ${note.cls}">
        <div class="note-title"><span class="dot" aria-hidden="true"></span>${note.title}</div>
        <div class="note-body">${note.body}</div>
      </div>`).join('');
  }

  /* ---------- weights ---------- */
  function renderWeights() {
    const svg = $('#weights-chart');
    if (!svg) return;
    svg.innerHTML = '';
    const W = 980, H = 430;
    const M = { top: 24, right: 94, bottom: 38, left: 164 };
    const IW = W - M.left - M.right;
    const IH = H - M.top - M.bottom;
    const rows = [...IDS].sort((a, b) => MODELS[a].weights.gib - MODELS[b].weights.gib);
    const rowH = IH / rows.length;
    const maxWeight = 4.5;
    const sx = (value) => M.left + (value / maxWeight) * IW;

    svgEl('rect', { x: M.left, y: M.top, width: IW, height: IH, fill: '#fbfdff' }, svg);
    [0, 1, 2, 3, 4].forEach((value) => {
      const x = sx(value);
      svgEl('line', { x1: x, y1: M.top, x2: x, y2: M.top + IH, class: 'grid-line' }, svg);
      svgText(svg, x, M.top + IH + 20, `${value} GiB`, { 'text-anchor': 'middle', class: 'axis-text' });
    });

    rows.forEach((id, index) => {
      const model = MODELS[id];
      const y = M.top + index * rowH + rowH / 2;
      const active = state.selected.has(id);
      const opacity = active ? 1 : .38;
      const g = svgEl('g', {}, svg);
      attachTip(g, registerTip(weightsTip(id)));
      g.style.cursor = 'pointer';

      svgEl('circle', { cx: 18, cy: y, r: 3.3, fill: model.color, opacity }, g);
      svgText(g, M.left - 16, y + 3, model.short, {
        'text-anchor': 'end', class: 'heat-label', opacity, fill: active ? '#14202e' : '#7a8a9b'
      });
      svgEl('rect', { x: M.left, y: y - 7, width: IW, height: 14, rx: 3, class: 'bar-track', opacity: .55 }, g);

      let cursor = M.left;
      model.weights.parts.forEach((part, partIndex) => {
        const width = (part.gib / maxWeight) * IW;
        if (width <= 0) return;
        const opacities = [.95, .62, .38, .26];
        svgEl('rect', {
          x: cursor, y: y - 7, width: Math.max(1.2, width), height: 14, rx: 2.5,
          fill: model.color, 'fill-opacity': opacities[partIndex] || .3,
          stroke: '#ffffff', 'stroke-width': .8
        }, g);
        cursor += width;
      });

      const totalW = sx(model.weights.gib) - M.left;
      const labelX = Math.min(M.left + totalW + 8, W - M.right + 6);
      svgText(g, labelX, y + 3, `${model.weights.gib.toFixed(2)}${id === 'BRIGHT-Flash-1007' ? '†' : ''}`, {
        class: 'value-text', fill: active ? model.color : '#7a8a9b'
      });
    });
    svgEl('line', { x1: M.left, y1: M.top + IH, x2: M.left + IW, y2: M.top + IH, class: 'axis-line' }, svg);

    const cap = $('#weights-caption');
    if (cap) {
      cap.innerHTML = `Pipeline 为 <b>${MODELS['BRIGHT-Flash-pipeline'].weights.gib.toFixed(2)} GiB</b>（1007 的 <b>${(MODELS['BRIGHT-Flash-pipeline'].weights.gib / MODELS['BRIGHT-Flash-1007'].weights.gib).toFixed(1)}×</b>），BRIGHT（20×）占主导。† 1007 以 ep3 文件作同架构代理。`;
    }
  }

  function weightsTip(id) {
    const model = MODELS[id];
    return `<strong>${esc(model.full)}</strong><br><span class="tt-muted">${esc(model.role)}</span>
      <div class="tt-rule"></div>
      ${model.weights.parts.map((part) => `<div class="tt-row"><span>${esc(part.label)}</span><span>${part.gib.toFixed(2)} GiB</span></div>`).join('')}
      <div class="tt-rule"></div>
      <div class="tt-row"><span>合计</span><span>${model.weights.gib.toFixed(2)} GiB</span></div>
      ${model.weights.note ? `<div class="tt-warn">${esc(model.weights.note)}</div>` : ''}`;
  }

  /* ---------- GPU ---------- */
  function renderGpu() {
    const svg = $('#gpu-chart');
    if (!svg) return;
    svg.innerHTML = '';
    const W = 520, H = 430;
    const M = { top: 24, right: 54, bottom: 38, left: 116 };
    const IW = W - M.left - M.right;
    const IH = H - M.top - M.bottom;
    const rows = [...IDS].sort((a, b) => MODELS[b].timing.gpuPeakGB - MODELS[a].timing.gpuPeakGB);
    const rowH = IH / rows.length;
    const maxGpu = 16;
    const sx = (value) => M.left + (value / maxGpu) * IW;

    [0, 4, 8, 12, 16].forEach((value) => {
      const x = sx(value);
      svgEl('line', { x1: x, y1: M.top, x2: x, y2: M.top + IH, class: 'grid-line' }, svg);
      svgText(svg, x, M.top + IH + 20, `${value}`, { 'text-anchor': 'middle', class: 'axis-text' });
    });

    rows.forEach((id, index) => {
      const model = MODELS[id];
      const y = M.top + index * rowH + rowH / 2;
      const active = state.selected.has(id);
      const opacity = active ? 1 : .36;
      const g = svgEl('g', {}, svg);
      attachTip(g, registerTip(`<strong>${esc(model.full)}</strong><br><span class="tt-muted">峰值显存</span>
        <div class="tt-rule"></div>
        <div class="tt-row"><span>GPU 峰值</span><span>${model.timing.gpuPeakGB.toFixed(2)} GB</span></div>
        <div class="tt-row"><span>权重</span><span>${model.weights.gib.toFixed(2)} GiB</span></div>
        <div class="tt-row"><span>吞吐</span><span>${model.timing.throughput ? model.timing.throughput.toFixed(4) : '—'} 张/秒</span></div>`));
      g.style.cursor = 'pointer';
      svgEl('circle', { cx: 14, cy: y, r: 3.2, fill: model.color, opacity }, g);
      svgText(g, M.left - 16, y + 3, model.short, {
        'text-anchor': 'end', class: 'heat-label', opacity, fill: active ? '#14202e' : '#7a8a9b'
      });
      svgEl('rect', { x: M.left, y: y - 6, width: IW, height: 12, rx: 3, class: 'bar-track', opacity: .55 }, g);
      svgEl('rect', {
        x: M.left, y: y - 6, width: Math.max(1, sx(model.timing.gpuPeakGB) - M.left), height: 12, rx: 3,
        fill: model.color, 'fill-opacity': active ? .85 : .24
      }, g);
      const gpuX = sx(model.timing.gpuPeakGB);
      const inside = gpuX > W - 100;
      svgText(g, inside ? gpuX - 8 : gpuX + 7, y + 3, model.timing.gpuPeakGB.toFixed(2), {
        'text-anchor': inside ? 'end' : 'start',
        class: 'value-text', style: inside ? 'fill:#ffffff' : `fill:${active ? model.color : '#7a8a9b'}`
      });
    });
    svgEl('line', { x1: M.left, y1: M.top + IH, x2: M.left + IW, y2: M.top + IH, class: 'axis-line' }, svg);
    svgText(svg, M.left + IW / 2, H - 11, '峰值显存（GB）', { 'text-anchor': 'middle', class: 'axis-title' });

    const cap = $('#gpu-caption');
    if (cap) {
      cap.innerHTML = `Pipeline 峰值 <b>${MODELS['BRIGHT-Flash-pipeline'].timing.gpuPeakGB.toFixed(2)} GB</b>；1007 为 <b>${MODELS['BRIGHT-Flash-1007'].timing.gpuPeakGB.toFixed(2)} GB</b>，权重仅 <b>${MODELS['BRIGHT-Flash-1007'].weights.gib.toFixed(2)} GiB</b>。峰值由激活与切片批处理主导。`;
    }
  }

  /* ---------- latency ---------- */
  function latencySegments(model) {
    const total = timeOf(model);
    const prepare = state.timeMode === 'e2e' ? model.timing.prepare : 0;
    const io = model.timing.io;
    const s2 = model.timing.s2 || 0;
    const compute = Math.max(0, model.timing.modelTotal - io - s2);
    return [
      { label: '预处理', value: prepare, color: '#94a3b8' },
      { label: 'I/O', value: io, color: '#6366f1' },
      { label: 'S2', value: s2, color: '#d97706' },
      { label: '计算', value: compute, color: '#0f766e' },
      { label: '', value: 0, color: 'transparent', totalHint: total }
    ].filter((segment) => segment.value > 0.0001);
  }

  function renderLatency() {
    const svg = $('#latency-chart');
    if (!svg) return;
    svg.innerHTML = '';
    const W = 980, H = 520;
    const M = { top: 24, right: 96, bottom: 38, left: 154 };
    const IW = W - M.left - M.right;
    const IH = H - M.top - M.bottom;
    const rows = [...IDS].sort((a, b) => timeOf(MODELS[a]) - timeOf(MODELS[b]));
    const rowH = IH / rows.length;
    const maxTime = Math.max(...rows.map((id) => timeOf(MODELS[id]))) * 1.04;
    const sx = (value) => M.left + (value / maxTime) * IW;
    const ticks = [0, 5, 10, 15, 20, 25, 30, 35, 40].filter((v) => v <= maxTime);

    ticks.forEach((value) => {
      const x = sx(value);
      svgEl('line', { x1: x, y1: M.top, x2: x, y2: M.top + IH, class: 'grid-line' }, svg);
      svgText(svg, x, M.top + IH + 20, `${value}s`, { 'text-anchor': 'middle', class: 'axis-text' });
    });

    const fastestId = rows[0];
    const fastestX = sx(timeOf(MODELS[fastestId]));
    svgEl('line', {
      x1: fastestX, y1: M.top, x2: fastestX, y2: M.top + IH,
      stroke: 'rgba(180,35,61,.35)', 'stroke-dasharray': '3 5'
    }, svg);
    svgText(svg, fastestX + 7, M.top + 14, `最快 · ${timeOf(MODELS[fastestId]).toFixed(2)}s*`, {
      class: 'annotation-text', fill: '#b4233d'
    });

    rows.forEach((id, index) => {
      const model = MODELS[id];
      const y = M.top + index * rowH + rowH / 2;
      const active = state.selected.has(id);
      const opacity = active ? 1 : .38;
      const g = svgEl('g', {}, svg);
      attachTip(g, registerTip(latencyTip(id)));
      g.style.cursor = 'pointer';

      svgEl('circle', { cx: 17, cy: y, r: 3.3, fill: model.color, opacity }, g);
      svgText(g, M.left - 16, y + 3, model.short, {
        'text-anchor': 'end', class: 'heat-label', opacity, fill: active ? '#14202e' : '#7a8a9b'
      });
      let cursor = M.left;
      latencySegments(model).forEach((segment) => {
        const width = (segment.value / maxTime) * IW;
        const rect = svgEl('rect', {
          x: cursor, y: y - 8, width: Math.max(1, width), height: 16,
          fill: segment.color, 'fill-opacity': active ? .82 : .2,
          stroke: '#ffffff', 'stroke-width': .7
        }, g);
        if (width > 28) {
          svgText(g, cursor + width / 2, y + 3, segment.label, {
            'text-anchor': 'middle', class: 'muted-text', style: 'fill:#ffffff;opacity:.95'
          });
        }
        cursor += width;
      });
      const totalX = Math.min(cursor + 7, W - 8);
      svgText(g, totalX, y + 3, `${timeOf(model).toFixed(2)}${id === 'BRIGHT-Flash-1007' ? '*' : ''}`, {
        class: 'value-text', fill: active ? model.color : '#7a8a9b'
      });
    });
    svgEl('line', { x1: M.left, y1: M.top + IH, x2: M.left + IW, y2: M.top + IH, class: 'axis-line' }, svg);
    svgText(svg, M.left + IW / 2, H - 11, state.timeMode === 'model' ? '仅模型耗时（秒）' : '端到端耗时（秒）', {
      'text-anchor': 'middle', class: 'axis-title'
    });

    const cap = $('#latency-caption');
    if (cap) {
      const a = MODELS['BRIGHT-Flash-1007'];
      const p = MODELS['BRIGHT-Flash-pipeline'];
      if (state.timeMode === 'model') {
        cap.innerHTML = `Pipeline：I/O <b>${p.timing.io.toFixed(2)} s</b> + BRIGHT <b>${p.timing.infer.toFixed(2)} s</b> + 路由 <b>${p.timing.s2.toFixed(2)} s</b>；1007 合计 <b>${a.timing.modelTotal.toFixed(2)} s</b>，差距 <b>${(p.timing.modelTotal / a.timing.modelTotal).toFixed(1)}×</b>。`;
      } else {
        cap.innerHTML = `共享预处理 <b>${a.timing.prepare.toFixed(2)} s</b>；端到端 1007 <b>${a.timing.endToEnd.toFixed(2)} s</b>，Pipeline <b>${p.timing.endToEnd.toFixed(2)} s</b>，差距 <b>${(p.timing.endToEnd / a.timing.endToEnd).toFixed(1)}×</b>。`;
      }
    }
  }

  function latencyTip(id) {
    const model = MODELS[id];
    const segs = latencySegments(model);
    return `<strong>${esc(model.full)}</strong><br><span class="tt-muted">${state.timeMode === 'model' ? '仅模型' : '端到端'}时延</span>
      <div class="tt-rule"></div>
      ${segs.map((segment) => `<div class="tt-row"><span>${segment.label || '合计'}</span><span>${segment.value.toFixed(3)} s</span></div>`).join('')}
      <div class="tt-rule"></div>
      <div class="tt-row"><span>合计</span><span>${timeOf(model).toFixed(3)} s${id === 'BRIGHT-Flash-1007' ? '*' : ''}</span></div>
      ${id === 'BRIGHT-Flash-1007' ? '<div class="tt-warn">沿用 profile，并非新测。</div>' : ''}`;
  }

  function renderLatencyNotes() {
    const wrap = $('#latency-notes');
    if (!wrap) return;
    const a = MODELS['BRIGHT-Flash-1007'];
    const p = MODELS['BRIGHT-Flash-pipeline'];
    const b = MODELS['BRIGHT'];
    const e = MODELS['EAGLE'];
    const modeLabel = state.timeMode === 'model' ? '仅模型' : '端到端';
    const prepNote = state.timeMode === 'model' ? '' : '（含预处理 2.43 s）';
    const notes = [
      {
        cls: 'coral',
        title: '1007 · 一次 5× 前向',
        body: `I/O <b>${a.timing.io.toFixed(2)} s</b> + 计算 <b>${(a.timing.modelTotal - a.timing.io).toFixed(2)} s</b>；${modeLabel} <b>${fmt(timeOf(a), 2)} s</b>${prepNote}。`
      },
      {
        cls: 'cyan',
        title: 'Pipeline · 三项额外成本',
        body: `I/O <b>${p.timing.io.toFixed(2)} s</b>、BRIGHT <b>${p.timing.infer.toFixed(2)} s</b>、S2 <b>${p.timing.s2.toFixed(2)} s</b>；${modeLabel} <b>${fmt(timeOf(p), 2)} s</b>。`
      },
      {
        cls: 'violet',
        title: 'BRIGHT · 单独运行',
        body: `推理 <b>${b.timing.infer.toFixed(2)} s</b> + I/O <b>${b.timing.io.toFixed(2)} s</b>；${modeLabel} <b>${fmt(timeOf(b), 2)} s</b>。`
      },
      {
        cls: 'amber',
        title: 'EAGLE · 效率参照',
        body: `${modeLabel} <b>${fmt(timeOf(e), 2)} s</b>；比 Pipeline 快 <b>${(timeOf(p) / timeOf(e)).toFixed(1)}×</b>。`
      }
    ];
    wrap.innerHTML = notes.map((note) => `
      <div class="note ${note.cls}">
        <div class="note-title"><span class="dot" aria-hidden="true"></span>${note.title}</div>
        <div class="note-body">${note.body}</div>
      </div>`).join('');
  }

  /* ---------- ranking ---------- */
  function renderRanking() {
    const svg = $('#ranking-chart');
    if (!svg) return;
    svg.innerHTML = '';
    const W = 980, H = 470;
    const M = { top: 22, right: 104, bottom: 58, left: 194 };
    const IW = W - M.left - M.right;
    const IH = H - M.top - M.bottom;
    const rows = [...IDS].sort((a, b) => rankOf(MODELS[a]) - rankOf(MODELS[b]));
    const rowH = IH / rows.length;
    const values = rows.map((id) => meanOf(MODELS[id]));
    const xMin = Math.min(...values) - 0.004;
    const xMax = Math.max(...values) + 0.003;
    const sx = (value) => M.left + ((value - xMin) / (xMax - xMin)) * IW;
    const step = 0.01;
    const tickStart = Math.ceil(xMin / step) * step;

    for (let value = tickStart; value <= xMax; value += step) {
      const x = sx(value);
      svgEl('line', { x1: x, y1: M.top, x2: x, y2: M.top + IH, class: 'grid-line' }, svg);
      svgText(svg, x, M.top + IH + 20, value.toFixed(3), { 'text-anchor': 'middle', class: 'axis-text' });
    }

    const brightY = sx(MODELS.BRIGHT.mean20);
    const brightY17 = sx(MODELS.BRIGHT.mean17);
    const ceilingX = state.taskSet === '20' ? brightY : brightY17;
    svgEl('line', {
      x1: ceilingX, y1: M.top, x2: ceilingX, y2: M.top + IH,
      stroke: 'rgba(91,75,183,.42)', 'stroke-dasharray': '3 5'
    }, svg);

    rows.forEach((id, index) => {
      const model = MODELS[id];
      const y = M.top + index * rowH + rowH / 2;
      const active = state.selected.has(id);
      const opacity = active ? 1 : .35;
      const g = svgEl('g', {}, svg);
      attachTip(g, registerTip(`<strong>${esc(model.full)}</strong><br><span class="tt-muted">排名 ${rankOf(model)} / 10 · ${state.taskSet} 任务</span>
        <div class="tt-rule"></div>
        <div class="tt-row"><span>平均 AUC</span><span>${fmt(meanOf(model), 4)}</span></div>
        <div class="tt-row"><span>Top-2 任务</span><span>${top2Of(model)}/${state.taskSet}</span></div>
        <div class="tt-row"><span>模型耗时</span><span>${timeOf(model).toFixed(2)} s</span></div>
        <div class="tt-row"><span>权重</span><span>${model.weights.gib.toFixed(2)} GiB</span></div>`));
      g.style.cursor = 'pointer';

      svgText(g, 16, y + 3, String(rankOf(model)).padStart(2, '0'), {
        class: 'muted-text', fill: active ? '#6b7c8f' : '#a8b5c3'
      });
      svgEl('circle', { cx: 44, cy: y, r: 3.2, fill: model.color, opacity }, g);
      svgText(g, 56, y + 3.5, model.short, {
        class: 'heat-label', fill: active ? '#14202e' : '#7a8a9b', opacity
      });

      svgEl('rect', { x: M.left, y: y - 5, width: IW, height: 10, rx: 4, class: 'bar-track', opacity: .5 }, g);
      svgEl('rect', {
        x: M.left, y: y - 5, width: Math.max(1, sx(meanOf(model)) - M.left), height: 10, rx: 4,
        fill: model.color, 'fill-opacity': active ? .84 : .42
      }, g);
      svgEl('circle', {
        cx: sx(meanOf(model)), cy: y, r: 4,
        fill: active ? model.color : '#cbd5e1',
        stroke: '#ffffff', 'stroke-width': 1
      }, g);

      const valueX = sx(meanOf(model)) + 10;
      svgText(g, valueX, y + 3.5, fmt(meanOf(model), 4), {
        class: 'value-text', fill: active ? '#14202e' : '#6b7c8f'
      });
      svgText(g, W - 14, y + 3.5, `Top-2 ${top2Of(model)}`, {
        'text-anchor': 'end', class: 'muted-text', fill: active ? '#6b7c8f' : '#8a98a8'
      });
    });
    svgEl('line', { x1: M.left, y1: M.top + IH, x2: M.left + IW, y2: M.top + IH, class: 'axis-line' }, svg);
    svgText(svg, M.left + IW / 2, H - 10, '平均 AUC', { 'text-anchor': 'middle', class: 'axis-title' });

    const cap = $('#ranking-caption');
    if (cap) {
      const aRank = MODELS['BRIGHT-Flash-1007'][state.taskSet === '20' ? 'rank20' : 'rank17'];
      const pRank = MODELS['BRIGHT-Flash-pipeline'][state.taskSet === '20' ? 'rank20' : 'rank17'];
      const eRank = MODELS.EAGLE[state.taskSet === '20' ? 'rank20' : 'rank17'];
      cap.innerHTML = `${state.taskSet} 任务：1007 第 <b>${aRank}</b>，Pipeline 第 <b>${pRank}</b>，EAGLE 第 <b>${eRank}</b>。`;
    }
  }

  /* ---------- heatmap ---------- */
  function colorMix(a, b, t) {
    const parse = (hex) => {
      const value = hex.replace('#', '');
      return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)];
    };
    const ca = parse(a);
    const cb = parse(b);
    const channels = ca.map((channel, index) => Math.round(channel + (cb[index] - channel) * t));
    return `rgb(${channels.join(',')})`;
  }

  function absoluteColor(t) {
    if (t < 0.55) return colorMix('#f1f5f9', '#99f6e4', t / 0.55);
    return colorMix('#99f6e4', '#0f766e', (t - 0.55) / 0.45);
  }

  function deltaColor(delta) {
    const t = clamp(delta / 0.15, -1, 1);
    if (t >= 0) return colorMix('#f8fafc', '#0f766e', t);
    return colorMix('#f8fafc', '#b4233d', -t);
  }

  function renderHeatmap() {
    const svg = $('#heatmap');
    if (!svg) return;
    svg.innerHTML = '';
    const cols = selectedIds();
    const rows = sortedTasks();
    const W = Math.max(780, 214 + cols.length * 84);
    const H = 74 + rows.length * 28 + 42;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.style.minWidth = `${W}px`;
    const labelW = 214;
    const top = 64;
    const rowH = 28;
    const colW = (W - labelW - 20) / cols.length;
    const allAucs = [];
    cols.forEach((id) => rows.forEach((task) => allAucs.push(cellOf(MODELS[id], task).auc)));
    const vmin = Math.floor(Math.min(...allAucs) * 20) / 20;
    const vmax = Math.ceil(Math.max(...allAucs) * 20) / 20;

    // Header.
    cols.forEach((id, index) => {
      const x = labelW + index * colW + colW / 2;
      svgText(svg, x, 28, MODELS[id].short, { 'text-anchor': 'middle', class: 'heat-header' });
      svgEl('rect', {
        x: labelW + index * colW + 6, y: 40, width: Math.max(4, colW - 12), height: 2.5, rx: 1.5,
        fill: MODELS[id].color, opacity: .8
      }, svg);
    });
    svgEl('line', { x1: 10, y1: top, x2: W - 10, y2: top, stroke: 'rgba(148,163,184,.22)' }, svg);

    let previousCategory = null;
    rows.forEach((task, rowIndex) => {
      const meta = DATA.taskMeta[task];
      const y = top + rowIndex * rowH;
      const category = meta.category;
      if (previousCategory && category !== previousCategory) {
        svgEl('line', {
          x1: 10, y1: y, x2: W - 10, y2: y, stroke: 'rgba(148,163,184,.18)', 'stroke-dasharray': '2 4'
        }, svg);
      }
      if (category !== previousCategory) {
        svgText(svg, 30, y + rowH / 2 + 3, CATEGORY_LABELS[category] || category, {
          class: 'heat-cat', fill: CATEGORY_COLORS[category] || '#64748b'
        });
      }
      previousCategory = category;

      svgEl('circle', {
        cx: 18, cy: y + rowH / 2, r: 3,
        fill: CATEGORY_COLORS[category] || '#8ea3bd', class: 'category-dot'
      }, svg);
      svgText(svg, labelW - 14, y + rowH / 2 + 3.5, meta.short, {
        'text-anchor': 'end', class: 'heat-label'
      });

      cols.forEach((id, colIndex) => {
        const model = MODELS[id];
        const cell = cellOf(model, task);
        const brightCell = cellOf(MODELS.BRIGHT, task);
        const delta = cell.auc - brightCell.auc;
        const x = labelW + colIndex * colW;
        const isDelta = state.heatmapMode === 'delta';
        const t = isDelta
          ? clamp(delta / 0.15, -1, 1)
          : clamp((cell.auc - vmin) / Math.max(1e-6, vmax - vmin), 0, 1);
        const fill = isDelta ? deltaColor(delta) : absoluteColor(t);
        const tip = `<strong>${esc(model.full)}</strong><br><span class="tt-muted">${esc(meta.batch || task)} · ${esc(CATEGORY_LABELS[category] || category)}</span>
          <div class="tt-rule"></div>
          <div class="tt-row"><span>AUC</span><span>${fmt(cell.auc, 4)}</span></div>
          <div class="tt-row"><span>Δ 相对 BRIGHT</span><span>${signed(delta, 4)}</span></div>
          ${cell.ciLow != null ? `<div class="tt-row"><span>95% CI</span><span>${fmt(cell.ciLow, 3)}–${fmt(cell.ciHigh, 3)}</span></div>` : ''}
          <div class="tt-row"><span>验证集 n</span><span>${meta.valN != null ? meta.valN : '—'}</span></div>
          <div class="tt-row"><span>测试集 n</span><span>${meta.testN != null ? meta.testN : '—'}</span></div>
          <div class="tt-row"><span>最佳 epoch</span><span>${meta.bestEpoch != null ? meta.bestEpoch : '—'}</span></div>
          ${task === 'NAT-TNBC (2)' ? '<div class="tt-warn">小队列：n=29。1007 held-out 测试 AUC = 0.7167。</div>' : ''}`;
        const rect = svgEl('rect', {
          x: x + 1.5, y: y + 1.5, width: colW - 3, height: rowH - 3, rx: 3,
          fill, class: 'heat-cell'
        }, svg);
        attachTip(rect, registerTip(tip));
        rect.style.cursor = 'crosshair';
        const textValue = isDelta ? signed(delta, 3) : fmt(cell.auc, 3);
        const textFill = isDelta
          ? (Math.abs(t) > 0.42 ? '#ffffff' : '#334155')
          : (t > 0.72 ? '#ffffff' : '#14202e');
        if (colW >= 50) {
          svgText(svg, x + colW / 2, y + rowH / 2 + 3.5, textValue, {
            'text-anchor': 'middle', class: 'heat-text', fill: textFill
          });
        }
      });
    });

    svgEl('line', { x1: labelW, y1: top, x2: labelW, y2: top + rows.length * rowH, stroke: 'rgba(148,163,184,.18)' }, svg);

    const legend = $('#heatmap-legend');
    if (legend) {
      if (state.heatmapMode === 'delta') {
        legend.innerHTML = `<div class="legend-labels"><span>低于 BRIGHT</span><span>BRIGHT</span><span>高于 BRIGHT</span></div>
          <div class="legend-bar" style="background:linear-gradient(90deg,#b4233d,#f8fafc 50%,#0f766e)"></div>
          <div class="legend-scale"><span>−0.15</span><span>0</span><span>+0.15</span></div>`;
      } else {
        legend.innerHTML = `<div class="legend-labels"><span>AUC 较低</span><span>AUC 较高</span></div>
          <div class="legend-bar" style="background:linear-gradient(90deg,#f1f5f9,#99f6e4,#0f766e)"></div>
          <div class="legend-scale"><span>${vmin.toFixed(2)}</span><span>${vmax.toFixed(2)}</span></div>`;
      }
    }

    const cap = $('#heatmap-caption');
    if (cap) {
      if (state.heatmapMode === 'delta') {
        const natTask = 'NAT-TNBC (2)';
        const natA = MODELS['BRIGHT-Flash-1007'].auc20[natTask].auc;
        const natBright = MODELS.BRIGHT.auc20[natTask].auc;
        const natPipe = MODELS['BRIGHT-Flash-pipeline'].auc20[natTask].auc;
        cap.innerHTML = state.taskSet === '20'
          ? `Δ 相对 BRIGHT：<b>青色</b>优于，<b>红色</b>低于。NAT-TNBC 为离群项：1007 比 BRIGHT 高 <b>${signed(natA - natBright, 3)}</b>，比 Pipeline 高 <b>${signed(natA - natPipe, 3)}</b>（n=29）。`
          : `Δ 相对 BRIGHT：<b>青色</b>优于，<b>红色</b>低于。17 任务视图已移除三个 NAT 队列。`;
      } else {
        cap.innerHTML = state.taskSet === '20'
          ? `绝对 macro OVR AUC；悬停查看 n、最佳 epoch 与置信区间。`
          : `绝对 macro OVR AUC（17 任务，已排除三个 NAT 队列）。`;
      }
    }
  }

  /* ---------- delta ---------- */
  function renderDelta() {
    const svg = $('#delta-chart');
    if (!svg) return;
    svg.innerHTML = '';
    const a = MODELS['BRIGHT-Flash-1007'];
    const p = MODELS['BRIGHT-Flash-pipeline'];
    const rows = tasks().map((task) => ({
      task,
      a: cellOf(a, task).auc,
      p: cellOf(p, task).auc,
      delta: cellOf(a, task).auc - cellOf(p, task).auc
    })).sort((x, y) => y.delta - x.delta);

    const W = 980;
    const M = { top: 66, right: 92, bottom: 44, left: 214 };
    const IH = rows.length * 24;
    const H = M.top + IH + M.bottom;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const IW = W - M.left - M.right;
    const zeroX = M.left + IW / 2;
    const cap = 0.07;
    const sx = (delta) => zeroX + (clamp(delta, -cap, cap) / cap) * (IW / 2);

    // Positive / negative background.
    svgEl('rect', { x: zeroX, y: M.top - 10, width: IW / 2, height: IH + 10, fill: 'rgba(180,35,61,.035)' }, svg);
    svgEl('rect', { x: M.left, y: M.top - 10, width: IW / 2, height: IH + 10, fill: 'rgba(14,116,144,.035)' }, svg);

    [-cap, -cap / 2, 0, cap / 2, cap].forEach((value) => {
      const x = sx(value);
      svgEl('line', {
        x1: x, y1: M.top - 10, x2: x, y2: M.top + IH,
        class: value === 0 ? 'axis-line' : 'grid-line',
        'stroke-dasharray': value === 0 ? '' : '2 4'
      }, svg);
      svgText(svg, x, M.top + IH + 20, value === 0 ? '0' : signed(value, 3), {
        'text-anchor': 'middle', class: 'axis-text'
      });
    });
    svgText(svg, zeroX, M.top + IH + 38, 'Δ AUC（1007 − Pipeline）', {
      'text-anchor': 'middle', class: 'axis-title'
    });

    rows.forEach((row, index) => {
      const y = M.top + index * 24 + 12;
      const positive = row.delta >= 0;
      const clipped = Math.abs(row.delta) > cap;
      const color = positive ? '#b4233d' : '#0e7490';
      const meta = DATA.taskMeta[row.task];
      const g = svgEl('g', {}, svg);
      attachTip(g, registerTip(`<strong>${esc(meta.short)}</strong><br><span class="tt-muted">${esc(meta.batch || row.task)}</span>
        <div class="tt-rule"></div>
        <div class="tt-row"><span>1007</span><span>${fmt(row.a, 4)}</span></div>
        <div class="tt-row"><span>Pipeline</span><span>${fmt(row.p, 4)}</span></div>
        <div class="tt-row"><span>Δ</span><span>${signed(row.delta, 4)}</span></div>
        <div class="tt-row"><span>验证集 n</span><span>${meta.valN != null ? meta.valN : '—'}</span></div>
        ${row.task === 'NAT-TNBC (2)' ? '<div class="tt-warn">条形已截断。n=29；1007 held-out 测试 AUC = 0.7167。</div>' : ''}`));
      g.style.cursor = 'crosshair';

      svgText(g, M.left - 14, y + 3.5, meta.short, {
        'text-anchor': 'end', class: 'heat-label', fill: row.task === 'NAT-TNBC (2)' ? '#b4233d' : '#334155'
      });
      if (row.task === 'NAT-TNBC (2)') {
        svgEl('circle', { cx: M.left - 8, cy: y, r: 2.4, fill: '#b4233d' }, g);
      }

      const x = sx(row.delta);
      const barX = positive ? zeroX : x;
      const barW = Math.max(1, Math.abs(x - zeroX));
      svgEl('rect', {
        x: barX, y: y - 5, width: barW, height: 10, rx: 2.5,
        fill: color, 'fill-opacity': clipped ? .82 : .82,
        stroke: clipped ? color : 'none', 'stroke-dasharray': clipped ? '3 2' : ''
      }, g);

      if (clipped) {
        svgEl('line', {
          x1: x, y1: y - 8, x2: x, y2: y + 8, stroke: color, 'stroke-width': 1.2, 'stroke-dasharray': '2 2'
        }, g);
        svgText(g, positive ? x - 16 : x + 8, y + 3.5, signed(row.delta, 3), {
          'text-anchor': positive ? 'end' : 'start',
          class: 'value-text',
          style: 'fill:#ffffff'
        });
      } else {
        svgText(g, positive ? x + 6 : x - 6, y + 3.5, signed(row.delta, 3), {
          'text-anchor': positive ? 'start' : 'end', class: 'value-text', fill: color
        });
      }
    });

    const delta20 = a.mean20 - p.mean20;
    const delta17 = a.mean17 - p.mean17;
    const wins20 = DATA.tasks20.filter((task) => a.auc20[task].auc > p.auc20[task].auc).length;
    const losses20 = DATA.tasks20.filter((task) => a.auc20[task].auc < p.auc20[task].auc).length;
    const wins17 = DATA.tasks17.filter((task) => a.auc17[task].auc > p.auc17[task].auc).length;
    const losses17 = DATA.tasks17.filter((task) => a.auc17[task].auc < p.auc17[task].auc).length;
    const summary = $('#delta-summary');
    if (summary) {
      const activeDelta = state.taskSet === '20' ? delta20 : delta17;
      const activeWins = state.taskSet === '20' ? wins20 : wins17;
      const activeLosses = state.taskSet === '20' ? losses20 : losses17;
      summary.innerHTML = `
        <div class="delta-kpi"><span>平均 Δ</span><strong class="${activeDelta >= 0 ? 'pos' : 'neg'}">${signed(activeDelta, 4)}</strong></div>
        <div class="delta-kpi"><span>1007 胜</span><strong>${activeWins}</strong></div>
        <div class="delta-kpi"><span>Pipeline 胜</span><strong>${activeLosses}</strong></div>
        <div class="delta-kpi"><span>${state.taskSet === '20' ? 'NAT-TNBC 离群项' : 'NAT 任务'}</span>${state.taskSet === '20' ? '<strong class="pos">+0.2389</strong>' : '<strong>已排除</strong>'}</div>`;
    }

    const capEl = $('#delta-caption');
    if (capEl) {
      if (state.taskSet === '20') {
        capEl.innerHTML = `1007 胜 <b>${wins20}</b> 项，Pipeline 胜 <b>${losses20}</b> 项；平均 Δ <b>${signed(delta20, 4)}</b>。NAT-TNBC <b>+0.2389</b>（n=29）主导正均值；该条截断在 ±0.07。`;
      } else {
        capEl.innerHTML = `移除三个 NAT 任务：1007 胜 <b>${wins17}</b>，Pipeline 胜 <b>${losses17}</b>，平均 Δ <b>${signed(delta17, 4)}</b>。`;
      }
    }
  }

  /* ---------- claims / caveats ---------- */
  function renderClaims() {
    const wrap = $('#claims-grid');
    if (!wrap) return;
    const a = MODELS['BRIGHT-Flash-1007'];
    const p = MODELS['BRIGHT-Flash-pipeline'];
    const b = MODELS['BRIGHT'];
    const e = MODELS.EAGLE;
    const bestFoundation = FOUNDATION.reduce((x, y) => MODELS[y].mean20 > MODELS[x].mean20 ? y : x);
    const worstFoundation = FOUNDATION.reduce((x, y) => MODELS[y].mean20 < MODELS[x].mean20 ? y : x);
    const foundationRatios = FOUNDATION.map((id) => MODELS[id].timing.modelTime / p.timing.modelTime);
    const foundationTimes = FOUNDATION.map((id) => MODELS[id].timing.modelTime);
    const minFoundationTime = Math.min(...foundationTimes).toFixed(2);
    const maxFoundationTime = Math.max(...foundationTimes).toFixed(2);
    const minRatio = Math.min(...foundationRatios).toFixed(1);
    const maxRatio = Math.max(...foundationRatios).toFixed(1);
    const delta20 = a.mean20 - p.mean20;
    const delta17 = a.mean17 - p.mean17;
    const natDelta = a.auc20['NAT-TNBC (2)'].auc - p.auc20['NAT-TNBC (2)'].auc;
    const claims = [
      {
        verdict: 'strong',
        label: '支持',
        scope: '20 任务 · 点估计',
        index: '01',
        title: '1007：最低计算成本，接近精度上界。',
        body: `仅模型 <b>${a.timing.modelTime.toFixed(2)} s*</b>，20 任务均值 <b>${fmt(a.mean20)}</b>，权重 <b>${a.weights.gib.toFixed(2)} GiB†</b>；比 BRIGHT 快 <b>${(b.timing.modelTime / a.timing.modelTime).toFixed(1)}×</b>，AUC 低 <b>${Math.abs(a.mean20 - b.mean20).toFixed(4)}</b>。`,
        metrics: [
          { value: fmt(a.mean20), label: '20 任务均值' },
          { value: `${a.timing.modelTime.toFixed(2)} s*`, label: '模型耗时' },
          { value: `${(b.timing.modelTime / a.timing.modelTime).toFixed(1)}×`, label: '快于 BRIGHT' }
        ],
        boundary: 'held-out 0.8577；2.08 s 为沿用值；AUC 为 best_validation。'
      },
      {
        verdict: 'bounded',
        label: '有条件',
        scope: '20 任务 · 五个 20× 基础模型',
        index: '02',
        title: 'Pipeline：跨过 20× 基础模型组的效率前沿。',
        body: `仅模型 <b>${p.timing.modelTime.toFixed(2)} s</b>，均值 <b>${fmt(p.mean20)}</b>；五个 20× 基础编码器为 <b><span class="nowrap">${minFoundationTime}–${maxFoundationTime} s</span></b>、<b><span class="nowrap">${fmt(MODELS[worstFoundation].mean20)}–${fmt(MODELS[bestFoundation].mean20)}</span></b>。`,
        metrics: [
          { value: `${p.timing.modelTime.toFixed(2)} s`, label: '模型耗时' },
          { value: fmt(p.mean20), label: '20 任务均值' },
          { value: `${minRatio}–${maxRatio}×`, label: '快于基础组' }
        ],
        boundary: '不是全局 Pareto：1007 / EAGLE 更快，BRIGHT 更准。'
      },
      {
        verdict: 'strong',
        label: '支持',
        scope: '20 / 17 任务 · 表内',
        index: '03',
        title: 'Pipeline：更稳定的任务级表现。',
        body: `Top-2 任务 <b>${p.top2_20}/20</b> 对 <b>${a.top2_20}/20</b>；17 任务均值 <b>${fmt(p.mean17)}</b> 对 <b>${fmt(a.mean17)}</b>。`,
        metrics: [
          { value: `${p.top2_20}/20`, label: 'Top-2 任务' },
          { value: fmt(p.mean17), label: '17 任务均值' },
          { value: fmt(a.mean17), label: '1007 对照' }
        ],
        boundary: '1007 held-out 17 任务 0.8749，低于 Pipeline 表内 0.8768；非同口径。'
      },
      {
        verdict: 'sensitive',
        label: '敏感性',
        scope: 'n=29 · 小队列',
        index: '04',
        title: '1007 的均值优势集中于 NAT-TNBC。',
        body: `20 任务 Δ <b>${signed(delta20, 4)}</b>；NAT-TNBC 贡献 <b>${signed(natDelta, 4)}</b>（n=29）；移除三个 NAT 任务后，17 任务 Δ <b>${signed(delta17, 4)}</b>。`,
        metrics: [
          { value: signed(delta20, 4), label: '20 任务 Δ' },
          { value: signed(natDelta, 4), label: 'NAT-TNBC Δ' },
          { value: signed(delta17, 4), label: '17 任务 Δ' }
        ],
        boundary: '验证集 0.9000，held-out 0.7167；不要引用 0.9000 作为测试结果。'
      }
    ];
    wrap.innerHTML = claims.map((claim) => `
      <article class="evidence-row evidence-row-${claim.verdict}">
        <div class="evidence-row-index">${claim.index}</div>
        <div class="evidence-row-main">
          <div class="evidence-row-meta">
            <span class="verdict verdict-${claim.verdict}"><i></i>${claim.label}</span>
            <span class="evidence-scope">${claim.scope}</span>
          </div>
          <h3>${claim.title}</h3>
          <p>${claim.body}</p>
        </div>
        <div class="evidence-row-metrics">
          ${claim.metrics.map((metric) => `<div class="evidence-metric"><b>${metric.value}</b><span>${metric.label}</span></div>`).join('')}
        </div>
        <div class="evidence-row-boundary"><span>边界</span>${claim.boundary}</div>
      </article>`).join('');

    const rail = $('#boundary-rail');
    if (rail) {
      const boundaries = [
        { num: '01', title: '计时是沿用值', body: '2.08 s / 4.51 s 沿用 BRIGHT-Flash；不是新测，阶段拆分亦同。' },
        { num: '02', title: 'AUC 取验证集最佳 epoch', body: '0.8622 是 best_validation；held-out 为 0.8577（20）/ 0.8749（17）。' },
        { num: '03', title: '不是同 checkpoint 消融', body: '1007 用 ep6；Pipeline S1 为 encoder_ep_3.pth；架构差异与 checkpoint 差异混合。' }
      ];
      rail.innerHTML = boundaries.map((item) => `
        <div class="boundary-rail-item">
          <span class="boundary-rail-num">${item.num}</span>
          <div><h4>${item.title}</h4><p>${item.body}</p></div>
        </div>`).join('');
    }
  }

  function renderCaveats() {
    const wrap = $('#caveat-grid');
    if (!wrap) return;
    const a = MODELS['BRIGHT-Flash-1007'];
    const caveats = [
      {
        title: '1007 的耗时是沿用值，不是实测。',
        body: `2.08 s / 4.51 s 沿用 BRIGHT-Flash，阶段拆分亦同。`
      },
      {
        title: '1007 的 AUC 是 best_validation，不是测试。',
        body: `0.8622 为验证集最佳 epoch；held-out 为 <b>0.8577</b>（20）/ <b>0.8749</b>（17）。`
      },
      {
        title: '1007 与 Pipeline 是 ep6 对 ep3。',
        body: `1007 用 ep6；Pipeline S1 为 <b>encoder_ep_3.pth</b>；非同 checkpoint 消融。`
      },
      {
        title: 'NAT-TNBC 只有 29 张切片。',
        body: `验证集 0.9000，held-out <b>0.7167</b>；该格主导 20 任务均值，移除后符号翻转。`
      },
      {
        title: '我们的模型行没有 CI 或 p 值。',
        body: `基线行带 95% CI；我们的模型差异仅为点估计。`
      },
      {
        title: '排名随任务集变化。',
        body: `20 任务：1007 第 2，Pipeline 第 3。17 任务：EAGLE 第 2，Pipeline 第 3，1007 第 5。`
      }
    ];
    wrap.innerHTML = caveats.map((caveat, index) => `
      <div class="caveat">
        <div class="caveat-num">注意 ${String(index + 1).padStart(2, '0')}</div>
        <h4>${caveat.title}</h4>
        <p>${caveat.body}</p>
      </div>`).join('');
  }

  /* ---------- table ---------- */
  function renderTable() {
    const body = $('#model-table-body');
    if (!body) return;
    const rows = [...IDS].sort((a, b) => MODELS[a].rank20 - MODELS[b].rank20);
    body.innerHTML = rows.map((id) => {
      const model = MODELS[id];
      const cls = id === 'BRIGHT' ? 'anchor' : (isOurs(id) ? 'ours' : '');
      return `<tr class="${cls}">
        <td class="tag-cell">${String(model.rank20).padStart(2, '0')}</td>
        <td><span class="model-cell" style="--dot:${model.color}"><span class="dot"></span>${esc(model.full)}</span></td>
        <td>${fmt(model.mean20, 4)}</td>
        <td>${fmt(model.mean17, 4)}</td>
        <td>${model.timing.modelTime.toFixed(2)}${id === 'BRIGHT-Flash-1007' ? '*' : ''}</td>
        <td>${model.timing.endToEnd.toFixed(2)}</td>
        <td>${model.weights.gib.toFixed(2)}${id === 'BRIGHT-Flash-1007' ? '†' : ''}</td>
        <td>${model.timing.gpuPeakGB.toFixed(2)}</td>
        <td>${model.top2_20}</td>
        <td>${model.top2_17}</td>
      </tr>`;
    }).join('');
  }

  /* ---------- captions / metadata ---------- */
  function updateCaptions() {
    const a = MODELS['BRIGHT-Flash-1007'];
    const p = MODELS['BRIGHT-Flash-pipeline'];
    const scatterSub = $('#scatter-sub');
    if (scatterSub) scatterSub.textContent = `${state.taskSet} 任务平均 AUC · ${state.timeMode === 'model' ? '仅模型' : '端到端'}耗时 · 对数横轴`;
    const scatterCap = $('#scatter-caption');
    if (scatterCap) {
      scatterCap.innerHTML = `横轴：${state.timeMode === 'model' ? '仅模型' : '端到端'}耗时（秒，对数）；纵轴：${state.taskSet} 任务平均 AUC；气泡：checkpoint 体积。虚线为五个 20× 基础编码器中的最高均值（Virchow2，0.854）。1007 耗时沿用 BRIGHT-Flash。`;
    }
    const latencySub = $('#latency-sub');
    if (latencySub) latencySub.textContent = `${state.timeMode === 'model' ? '仅模型' : '端到端'}耗时，按阶段堆叠`;
    const latencyTag = $('#latency-mode-tag');
    if (latencyTag) latencyTag.textContent = state.timeMode === 'model' ? '仅模型' : '端到端';
    const rankingSub = $('#ranking-sub');
    if (rankingSub) rankingSub.textContent = `${state.taskSet} 任务平均 AUC · 按排名排序`;
    const ceilingTag = $('#ranking-ceiling-tag');
    if (ceilingTag) ceilingTag.textContent = `上界 = BRIGHT ${fmt(MODELS.BRIGHT[state.taskSet === '20' ? 'mean20' : 'mean17'])}`;
    const heatSub = $('#heatmap-sub');
    if (heatSub) heatSub.textContent = `${state.taskSet} 任务 AUC · ${selectedIds().length} 个模型 · ${state.heatmapMode === 'delta' ? 'Δ 相对 BRIGHT' : '绝对 AUC'}`;
    const deltaSub = $('#delta-sub');
    if (deltaSub) {
      deltaSub.textContent = state.taskSet === '20'
        ? '正值 = 1007 更好 · 负值 = Pipeline 更好 · 截断在 ±0.07'
        : '正值 = 1007 更好 · 负值 = Pipeline 更好 · 已排除 NAT 任务';
    }
    const deltaTag = $('#delta-task-tag');
    if (deltaTag) deltaTag.textContent = `${state.taskSet} 任务`;
    const generated = $('#generated-at');
    if (generated) {
      const date = DATA.meta.generatedAt ? new Date(DATA.meta.generatedAt) : new Date();
      generated.textContent = date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: '2-digit' });
    }
  }

  /* ---------- controls ---------- */
  function syncSeg(selector, value) {
    $$(`${selector} button`).forEach((button) => {
      const active = button.dataset.value === value;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function initControls() {
    $$('#task-set button').forEach((button) => {
      button.addEventListener('click', () => {
        state.taskSet = button.dataset.value;
        syncSeg('#task-set', state.taskSet);
        renderAll(false);
      });
    });
    $$('#time-mode button').forEach((button) => {
      button.addEventListener('click', () => {
        state.timeMode = button.dataset.value;
        syncSeg('#time-mode', state.timeMode);
        renderAll(false);
      });
    });
    $$('#heatmap-mode button').forEach((button) => {
      button.addEventListener('click', () => {
        state.heatmapMode = button.dataset.value;
        syncSeg('#heatmap-mode', state.heatmapMode);
        renderHeatmap();
        updateCaptions();
      });
    });
    $('#focus-ours').addEventListener('click', () => setSelection(['BRIGHT-Flash-1007', 'BRIGHT-Flash-pipeline', 'BRIGHT-Flash']));
    $('#focus-all').addEventListener('click', () => setSelection(IDS));
    $('#reset').addEventListener('click', () => {
      state.taskSet = '20';
      state.timeMode = 'model';
      state.heatmapMode = 'delta';
      state.selected = new Set(DEFAULT_SELECTED);
      syncSeg('#task-set', state.taskSet);
      syncSeg('#time-mode', state.timeMode);
      syncSeg('#heatmap-mode', state.heatmapMode);
      renderChips();
      renderAll(false);
    });
  }

  /* ---------- render everything ---------- */
  function renderAll(animateHero = false) {
    tipStore.clear();
    tipSeq = 0;
    renderHero(animateHero);
    renderScatter();
    renderEfficiencyNotes();
    renderWeights();
    renderGpu();
    renderLatency();
    renderLatencyNotes();
    renderRanking();
    renderHeatmap();
    renderDelta();
    renderClaims();
    renderCaveats();
    renderTable();
    updateCaptions();
    if (PARAMS.has('debug')) {
      const nat = [...document.querySelectorAll('#delta-chart text')].find((node) => node.textContent === '-0.113');
      if (nat) {
        document.documentElement.setAttribute('data-debug-fill', getComputedStyle(nat).fill);
        document.documentElement.setAttribute('data-debug-style', nat.getAttribute('style') || '');
      }
      const w = (sel) => document.querySelector(sel)?.getBoundingClientRect().width?.toFixed(1) || 'na';
      document.documentElement.setAttribute('data-debug-widths', JSON.stringify({
        doc: document.documentElement.scrollWidth, body: document.body.scrollWidth,
        wrap: w('.wrap'), hero: w('.hero-copy'), sub: w('.hero-sub'),
        panel: w('.panel'), chartScroll: w('.chart-scroll'), chart: w('.chart'),
        heroCard: w('.hero-card'), stats: w('.hero-stats')
      }));
    }
  }

  /* ---------- reveal / progress / nav ---------- */
  function initReveal() {
    const elements = $$('.reveal');
    if (reduceMotion || !('IntersectionObserver' in window)) {
      elements.forEach((el) => el.classList.add('in'));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    elements.forEach((el) => observer.observe(el));

    // Failsafe for embedded/headless WebViews where IntersectionObserver may not fire.
    // Keep the reveal animation when it works, but never leave visible content at opacity 0.
    window.setTimeout(() => {
      const visiblePending = elements.some((el) => {
        if (el.classList.contains('in')) return false;
        const rect = el.getBoundingClientRect();
        return rect.bottom > 0 && rect.top < window.innerHeight;
      });
      if (visiblePending) elements.forEach((el) => el.classList.add('in'));
    }, 1600);
  }

  function initProgress() {
    const bar = $('#progress');
    if (!bar) return;
    const update = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = scrollable > 0 ? window.scrollY / scrollable : 0;
      bar.style.width = `${clamp(ratio, 0, 1) * 100}%`;
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  function initNav() {
    const links = $$('.nav-links a');
    const sections = links.map((link) => document.querySelector(link.getAttribute('href'))).filter(Boolean);
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((link) => link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`));
      });
    }, { rootMargin: '-35% 0px -55% 0px', threshold: 0 });
    sections.forEach((section) => observer.observe(section));
  }


  /* ---------- detailed flow animation ---------- */
  function initFlow() {
    const board = $('#flow-board');
    if (!board) return;
    const steps = $$('.flow-step', board).sort((a, b) => parseFloat(a.dataset.delay || 0) - parseFloat(b.dataset.delay || 0));
    const replay = $('#flow-replay');
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const laneA = $('.flow-lane-1007', board);
    const laneB = $('.flow-lane-pipeline', board);
    const forkUp = document.getElementById('fork-up');
    const forkDown = document.getElementById('fork-down');
    const updateFork = () => {
      if (!laneA || !laneB || !forkUp || !forkDown || window.innerWidth <= 900) return;
      const stage = $('.flow-stage', board);
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      if (!rect.height) return;
      const center = (node) => {
        const r = node.getBoundingClientRect();
        return (r.top - rect.top + r.height / 2) / rect.height * 100;
      };
      const top = Math.max(10, Math.min(46, center(laneA)));
      const bottom = Math.max(54, Math.min(90, center(laneB)));
      forkUp.setAttribute('d', `M0,50 C36,50 36,${top} 72,${top}`);
      forkDown.setAttribute('d', `M0,50 C36,50 36,${bottom} 72,${bottom}`);
    };
    updateFork();
    window.requestAnimationFrame(updateFork);
    window.addEventListener('resize', updateFork);
    let timers = [];
    const clear = () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers = [];
      steps.forEach((step) => step.classList.remove('is-lit'));
    };
    const play = () => {
      clear();
      board.classList.add('is-flowing');
      if (STATIC_MODE || reduce) {
        steps.forEach((step) => step.classList.add('is-lit'));
        return;
      }
      steps.forEach((step) => {
        const delay = parseFloat(step.dataset.delay || 0);
        timers.push(window.setTimeout(() => step.classList.add('is-lit'), delay));
      });
    };
    if (replay) replay.addEventListener('click', play);
    if (STATIC_MODE || reduce) {
      steps.forEach((step) => step.classList.add('is-lit'));
      board.classList.add('is-flowing');
      return;
    }
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          play();
          observer.disconnect();
        });
      }, { threshold: 0.18 });
      observer.observe(board);
    } else {
      play();
    }
  }

  /* ---------- boot ---------- */
  function boot() {
    renderChips();
    syncSeg('#task-set', state.taskSet);
    syncSeg('#time-mode', state.timeMode);
    syncSeg('#heatmap-mode', state.heatmapMode);
    initControls();
    renderAll(true);
    if (PARAMS.has('open')) document.querySelectorAll('details').forEach((node) => { node.open = true; });
    initReveal();
    initProgress();
    initFlow();
    initNav();
    if (SECTION_PARAM) {
      window.setTimeout(() => {
        const target = document.getElementById(SECTION_PARAM);
        if (!target) return;
        document.documentElement.style.scrollBehavior = 'auto';
        window.scrollTo(0, Math.max(0, target.getBoundingClientRect().top + window.scrollY - 76));
      }, 80);
    }
    if (PARAMS.has('tip')) {
      window.setTimeout(() => {
        const node = document.querySelector('#scatter circle');
        if (!node) return;
        const rect = node.getBoundingClientRect();
        node.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, clientX: rect.left + 8, clientY: rect.top + 8 }));
      }, 80);
    }
    if (PARAMS.has('selftest')) {
      const events = [];
      const click = (sel) => {
        const node = document.querySelector(sel);
        if (!node) { events.push(`missing:${sel}`); return; }
        node.click(); events.push(sel);
      };
      click('#task-set button[data-value="17"]');
      click('#time-mode button[data-value="e2e"]');
      click('#heatmap-mode button[data-value="absolute"]');
      click('#focus-all');
      click('#focus-ours');
      click('#reset');
      click('#model-chips button[data-id="BRIGHT"]');
      document.documentElement.setAttribute('data-selftest', JSON.stringify({
        events, taskSet: state.taskSet, timeMode: state.timeMode, heatmapMode: state.heatmapMode,
        selected: [...state.selected], heatTexts: document.querySelectorAll('#heatmap text').length,
        rankingTexts: document.querySelectorAll('#ranking-chart text').length,
        deltaTexts: document.querySelectorAll('#delta-chart text').length
      }));
    }
    window.addEventListener('resize', () => {
      // SVG viewBoxes scale; re-render only the heatmap width if the viewport
      // crosses a meaningful breakpoint.
      const width = window.innerWidth;
      if (width !== boot.lastWidth) {
        boot.lastWidth = width;
        renderHeatmap();
      }
    }, { passive: true });
  }

  boot();
})();
