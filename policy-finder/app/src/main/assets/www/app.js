/* Policy Finder – main UI */
(() => {
  'use strict';
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const esc = Search.escapeHtml;
  const view = $('#view');
  const isAndroid = !!(window.AndroidBridge && AndroidBridge.isAndroid && AndroidBridge.isAndroid());

  if (window.pdfjsLib) pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js';

  const S = { products: [], docs: [], grids: [], rules: [], vehicles: [], schemes: [], cases: [], tab: 'search', query: '', cat: '' };

  const ICON = {
    search: '<svg viewBox="0 0 24 24"><path d="M10 2a8 8 0 0 1 6.3 12.9l5.4 5.4-1.4 1.4-5.4-5.4A8 8 0 1 1 10 2zm0 2a6 6 0 1 0 0 12 6 6 0 0 0 0-12z"/></svg>',
    edit: '<svg viewBox="0 0 24 24"><path d="M3 17.2V21h3.8L17.9 9.9l-3.8-3.8L3 17.2zM20.7 7a1 1 0 0 0 0-1.4l-2.3-2.3a1 1 0 0 0-1.4 0l-1.8 1.8 3.8 3.8L20.7 7z"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>',
    save: '<svg viewBox="0 0 24 24"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>',
    doc: '<svg viewBox="0 0 24 24"><path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm8 1.5V8h4.5L14 3.5z"/></svg>',
  };

  // ---------- helpers ----------
  function toast(msg, ms = 2200) {
    const t = $('#toast'); t.textContent = msg; t.classList.remove('hidden');
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.add('hidden'), ms);
  }
  const productName = id => (S.products.find(p => p.id === id) || {}).name || '';
  const categories = () => [...new Set(S.products.map(p => (p.category || '').trim()).filter(Boolean))].sort();
  function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
  function fmtINR(n) { if (!isFinite(n)) return '—'; return '₹ ' + Math.round(n).toLocaleString('en-IN'); }

  async function loadAll() {
    // Starter data: Car & Commercial Vehicle only. Older sample data (PL, BL, LAP, gold, two wheeler…)
    // is removed once; anything you created yourself is kept.
    if (!(await DB.get('meta', 'seeded-carcv'))) {
      const stores = { products: SEED.products, grids: SEED.grids, rules: SEED.rules, schemes: SEED.schemes, vehicles: SEED.vehicles };
      for (const st of Object.keys(stores)) {
        for (const x of await DB.all(st)) if (x.sample) await DB.del(st, x.id);
        for (const x of stores[st]) await DB.put(st, JSON.parse(JSON.stringify(x)));
      }
      await DB.put('meta', { id: 'seeded-carcv', at: Date.now() });
    }
    [S.products, S.docs, S.grids, S.rules, S.vehicles, S.schemes, S.cases] = await Promise.all(['products', 'docs', 'grids', 'rules', 'vehicles', 'schemes', 'cases'].map(DB.all));
    S.cases.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    S.vehicles.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    S.schemes.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    S.products.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    S.grids.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    S.docs.sort((a, b) => (b.created || 0) - (a.created || 0));
    const n = S.products.length + S.docs.length + S.grids.length + S.rules.length;
    $('#subtitle').textContent = `${S.products.length} products · ${S.docs.length} policies`;
    return n;
  }

  // ---------- sheet (full-screen page) stack ----------
  const stack = [];
  function openSheet(title, render) {
    stack.push({ title, render });
    showTopSheet();
  }
  function showTopSheet() {
    const top = stack[stack.length - 1];
    const sh = $('#sheet');
    if (!top) { sh.classList.add('hidden'); $('#sheetBody').innerHTML = ''; return; }
    sh.classList.remove('hidden');
    $('#sheetTitle').textContent = top.title;
    $('#sheetActions').innerHTML = '';
    const body = $('#sheetBody');
    body.innerHTML = '';
    body.scrollTop = 0;
    if (top.cleanup) { const c = top.cleanup; top.cleanup = null; c(); }
    top.render(body, $('#sheetActions'), t => { top.title = t; $('#sheetTitle').textContent = t; });
  }
  function closeSheet(n = 1) {
    for (let i = 0; i < n && stack.length; i++) { const s = stack.pop(); if (s.cleanup) s.cleanup(); }
    showTopSheet();
  }
  function refreshUnderlying() { renderTab(); }
  $('#sheetClose').onclick = () => closeSheet();
  window.handleBack = () => {
    if (stack.length) { closeSheet(); return true; }
    if (S.tab !== 'search') { setTab('search'); return true; }
    if (S.query) { S.query = ''; renderTab(); return true; }
    return false;
  };
  function actionBtn(container, html, title, onClick) {
    const b = document.createElement('button');
    b.className = 'icon-btn'; b.innerHTML = html; b.title = title; b.setAttribute('aria-label', title);
    b.onclick = onClick; container.appendChild(b); return b;
  }

  // ---------- generic form ----------
  function formSheet(title, fields, obj, onSave, onDelete) {
    openSheet(title, (body, actions) => {
      const draft = { ...obj };
      body.innerHTML = fields.map(f => {
        const v = esc(draft[f.k] == null ? '' : draft[f.k]);
        let input;
        if (f.type === 'textarea') input = `<textarea class="input" data-k="${f.k}" placeholder="${esc(f.ph || '')}">${v}</textarea>`;
        else if (f.type === 'select') input = `<select class="input" data-k="${f.k}">${f.options().map(o => `<option value="${esc(o[0])}" ${o[0] === draft[f.k] ? 'selected' : ''}>${esc(o[1])}</option>`).join('')}</select>`;
        else input = `<input class="input" type="${f.inputType || 'text'}" ${f.inputmode ? `inputmode="${f.inputmode}"` : ''} data-k="${f.k}" value="${v}" placeholder="${esc(f.ph || '')}" ${f.list ? `list="dl-${f.k}"` : ''}>${f.list ? `<datalist id="dl-${f.k}">${f.list().map(o => `<option value="${esc(o)}">`).join('')}</datalist>` : ''}`;
        return `<label class="f">${esc(f.label)}</label>${input}${f.hint ? `<div class="hint">${esc(f.hint)}</div>` : ''}`;
      }).join('') + `<div class="btn-row" style="margin-top:16px"><button class="btn block" id="fSave">Save</button></div>` +
        (onDelete ? `<div class="btn-row"><button class="btn danger block" id="fDel">Delete</button></div>` : '');
      const collect = () => { $$('[data-k]', body).forEach(el => { draft[el.dataset.k] = el.value.trim(); }); return draft; };
      const save = async () => {
        const d = collect();
        const req = fields.find(f => f.required && !d[f.k]);
        if (req) { toast(`Please enter ${req.label}`); return; }
        await onSave(d); closeSheet(); await loadAll(); refreshUnderlying(); if (stack.length) showTopSheet(); toast('Saved');
      };
      $('#fSave', body).onclick = save;
      actionBtn(actions, ICON.save, 'Save', save);
      if (onDelete) $('#fDel', body).onclick = async () => {
        if (!confirm('Delete this item?')) return;
        await onDelete(); closeSheet(2 <= stack.length && stack[stack.length - 2].isDetail ? 2 : 1); await loadAll(); refreshUnderlying(); toast('Deleted');
      };
    });
  }

  const productOptions = () => [['', '— none —'], ...S.products.map(p => [p.id, p.name])];

  const PRODUCT_FIELDS = [
    { k: 'name', label: 'Product name', required: true, ph: 'e.g. Personal Loan' },
    { k: 'category', label: 'Category', ph: 'e.g. Unsecured / Secured – Vehicle', list: categories },
    { k: 'rate', label: 'Interest rate (ROI)', ph: 'e.g. 14% – 24% p.a.' },
    { k: 'pf', label: 'Processing fee', ph: 'e.g. Up to 3% + GST' },
    { k: 'doc', label: 'Documentation charge', ph: 'e.g. ₹ 500 + GST' },
    { k: 'other', label: 'Other charges', type: 'textarea', ph: 'Stamp duty, bounce, foreclosure, penal…' },
    { k: 'amount', label: 'Loan amount', ph: 'e.g. ₹ 50,000 – ₹ 15 lakh' },
    { k: 'tenure', label: 'Tenure', ph: 'e.g. 12 – 60 months' },
    { k: 'eligibility', label: 'Eligibility', type: 'textarea', ph: 'Age, income, CIBIL, vintage…' },
    { k: 'notes', label: 'Policy notes', type: 'textarea', ph: 'Deviations, special rules…' },
    { k: 'keywords', label: 'Search keywords', ph: 'extra words you may type when searching', hint: 'Short forms help: pl, bl, lap, tw, cv, ntc…' },
  ];
  const DECISIONS = [['', 'Info only (no fixed decision)'], ['NO', 'NO – not allowed'], ['YES', 'YES – allowed'], ['COND', 'ONLY WITH CONDITIONS']];
  const RULE_FIELDS = [
    { k: 'title', label: 'Situation / question', required: true, ph: 'e.g. CV loan without property proof', hint: 'Write it the way you would ask. Use “without …” / “no …” for missing documents.' },
    { k: 'decision', label: 'Decision', type: 'select', options: () => DECISIONS },
    { k: 'solution', label: 'Reason / what to do', type: 'textarea', required: true, ph: 'e.g. Property proof of applicant or guarantor is mandatory for all CV cases.' },
    { k: 'ref', label: 'Policy reference', ph: 'e.g. CV Policy 2026, Section 5, page 2' },
    { k: 'keywords', label: 'Other words people may type', ph: 'e.g. truck tata 1109 ashok leyland house proof own house' },
    { k: 'productId', label: 'Linked product', type: 'select', options: productOptions },
  ];

  const editProduct = p => formSheet(p ? 'Edit product' : 'New product', PRODUCT_FIELDS, p || {},
    d => DB.put('products', d), p ? () => DB.del('products', p.id) : null);
  const editRule = (r, prefill) => formSheet(r ? 'Edit policy rule' : 'New policy rule', RULE_FIELDS, r || prefill || {},
    d => { delete d.sample; return DB.put('rules', d); }, r ? () => DB.del('rules', r.id) : null);

  // ---------- tabs ----------
  function setTab(tab) {
    S.tab = tab;
    $$('#tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    view.scrollTop = 0;
    renderTab();
  }
  $$('#tabs button').forEach(b => b.onclick = () => { while (stack.length) closeSheet(); setTab(b.dataset.tab); });
  function renderTab() {
    const fab = $('.fab'); if (fab) fab.remove();
    ({ search: renderSearch, products: renderProducts, docs: renderDocs, grids: renderGrids, more: renderMore })[S.tab]();
  }
  function fab(onClick, label = 'Add') {
    const b = document.createElement('button'); b.className = 'fab'; b.textContent = '+'; b.setAttribute('aria-label', label);
    b.onclick = onClick; document.body.appendChild(b);
  }

  // ---------- SEARCH ----------
  function renderSearch() {
    view.innerHTML = `
      <div class="searchbox">
        <div class="field">${ICON.search}<input id="q" type="search" autocomplete="off" placeholder="Car / CV question or vehicle… e.g. tata 1109 2021 36 months" value="${esc(S.query)}"></div>
        <div class="chips" id="cats"></div>
      </div>
      <div id="results"></div>`;
    const q = $('#q');
    const run = debounce(() => { S.query = q.value; renderResults(); }, 120);
    q.oninput = run;
    const cats = $('#cats');
    cats.innerHTML = ['', ...categories()].map(c => `<button class="chip ${S.cat === c ? 'on' : ''}" data-c="${esc(c)}">${esc(c || 'All')}</button>`).join('');
    cats.onclick = e => { const b = e.target.closest('.chip'); if (!b) return; S.cat = b.dataset.c; $$('.chip', cats).forEach(x => x.classList.toggle('on', x === b)); renderResults(); };
    renderResults();
    if (!S.query) setTimeout(() => q.focus(), 50);
  }

  function productCard(p, terms) {
    const h = t => terms ? Search.highlight(t, terms) : esc(t);
    return `<div class="card tap" data-open="product" data-id="${p.id}">
      <div class="row"><h3>${h(p.name)}</h3>${p.category ? `<span class="badge">${esc(p.category)}</span>` : ''}</div>
      <div class="kv">
        <div><span>ROI</span><b>${h(p.rate || '—')}</b></div>
        <div><span>Proc. fee</span><b>${h(p.pf || '—')}</b></div>
        <div><span>Doc charge</span><b>${h(p.doc || '—')}</b></div>
      </div>
      ${p.sample ? '<div class="meta" style="margin-top:6px">Sample data – edit with your real policy</div>' : ''}
    </div>`;
  }

  // Parse a row/column label into a numeric range, e.g. "700 – 749", "750+", "< 650", "36"
  // numbers with lakh / crore units are converted to lakhs ("1 Cr" -> 100, "50 L" -> 50)
  function numsOf(text) {
    const out = [];
    (text || '').toLowerCase().replace(/,/g, '').replace(/(\d+(?:\.\d+)?)\s*(crores?|cr\b|lakhs?|lacs?|l\b)?/g, (m, n, u) => {
      out.push(u && u.startsWith('c') ? +n * 100 : +n); return m;
    });
    return out;
  }
  function parseRange(label) {
    const s = (label || '').toLowerCase().replace(/,/g, '');
    const nums = numsOf(s);
    if (!nums.length) return null;
    if (/(\+|above|≥|>=|>|more)/.test(s) && nums.length === 1) return { min: nums[0] + (/>(?!=)/.test(s) && !/>=/.test(s) ? 0.0001 : 0), max: Infinity };
    if (/(<|≤|below|upto|up to|less)/.test(s) && nums.length === 1) return { min: -Infinity, max: nums[0] - (/<(?!=)/.test(s) ? 0.0001 : 0) };
    if (nums.length >= 2) return { min: Math.min(nums[0], nums[1]), max: Math.max(nums[0], nums[1]) };
    return { min: nums[0], max: nums[0] };
  }
  // candidates: best label for each query number, plus best text match (num = null)
  function axisCandidates(labels, nums, terms) {
    const out = [];
    nums.forEach(n => {
      let best = null;
      labels.forEach((lab, i) => {
        const r = parseRange(lab);
        if (!r || n < r.min || n > r.max) return;
        const sc = r.min === r.max ? 3 : (isFinite(r.min) && isFinite(r.max) ? 2 : 1.5);
        if (!best || sc > best.score) best = { i, score: sc, num: n };
      });
      if (best) out.push(best);
    });
    let tb = null;
    labels.forEach((lab, i) => {
      const lt = Search.tokens(lab).filter(t => !/^\d/.test(t) && t.length > 1);
      if (!lt.length) return;
      const hit = lt.filter(t => terms.some(q => q === t || (q.length >= 3 && t.startsWith(q)))).length;
      if (hit) { const sc = 1 + hit / lt.length; if (!tb || sc > tb.score) tb = { i, score: sc, num: null }; }
    });
    if (tb) out.push(tb);
    return out;
  }
  function gridLookup(g, query) {
    const terms = Search.queryTerms(query);
    const nums = [...new Set(numsOf(query))];
    const rc = axisCandidates(g.rows.map(r => r.label), nums, terms);
    const cc = axisCandidates(g.cols, nums, terms);
    let best = null;
    rc.forEach(r => cc.forEach(c => {
      if (r.num !== null && r.num === c.num) return;
      const sc = r.score + c.score;
      if (!best || sc > best.sc) best = { sc, r: r.i, c: c.i };
    }));
    if (!best) return null;
    return { r: best.r, c: best.c, val: (g.rows[best.r].cells || [])[best.c] };
  }

  function bestPage(doc, terms) {
    if (!doc.pageTexts || !doc.pageTexts.length) return null;
    const words = Search.expand(terms);
    let best = null;
    doc.pageTexts.forEach((t, i) => {
      const low = (t || '').toLowerCase();
      let sc = 0; terms.forEach(term => { if (low.includes(term)) sc += 2; });
      words.forEach(w => { if (low.includes(w)) sc += 0.5; });
      if (sc && (!best || sc > best.sc)) best = { i, sc };
    });
    return best;
  }

  function renderResults() {
    const out = $('#results');
    const query = S.query.trim();
    const inCat = p => !S.cat || (p.category || '').trim() === S.cat;
    if (!query) {
      const prods = S.products.filter(inCat);
      out.innerHTML =
        `<div class="section-title">${S.cat ? esc(S.cat) : 'All products'} <span>${prods.length}</span></div>` +
        (prods.length ? prods.map(p => productCard(p)).join('') : emptyBox('No products yet. Add them in the Products tab.')) +
        (!S.cat && S.docs.length ? `<div class="section-title">Recent policies</div>` + S.docs.slice(0, 4).map(d => docCard(d)).join('') : '');
      return;
    }
    const terms = Search.queryTerms(query);
    const results = [];
    S.products.filter(inCat).forEach(p => {
      const r = Search.scoreItem(terms, [
        { text: p.name, w: 5 }, { text: p.category, w: 3 }, { text: p.keywords, w: 4 },
        { text: [p.rate, p.pf, p.doc, p.other, p.amount, p.tenure].join(' '), w: 1.5 },
        { text: [p.eligibility, p.notes].join(' '), w: 1.2 },
        { text: 'roi interest rate processing fee pf documentation doc charges tenure amount eligibility', w: 0.8 },
      ]);
      if (r.score > 0.4) results.push({ kind: 'product', item: p, ...r });
    });
    S.rules.forEach(rule => {
      if (S.cat && rule.productId && !inCat(S.products.find(p => p.id === rule.productId) || {})) return;
      const r = Search.scoreItem(terms, [
        { text: rule.title, w: 5 }, { text: rule.keywords, w: 4.5 }, { text: rule.solution, w: 1.5 }, { text: productName(rule.productId), w: 2 },
      ]);
      if (r.score > 0.4) results.push({ kind: 'rule', item: rule, ...r, score: r.score * 1.15 });
    });
    S.grids.forEach(g => {
      const prod = S.products.find(p => p.id === g.productId);
      if (S.cat && !inCat(prod || {})) return;
      const r = Search.scoreItem(terms, [
        { text: g.name, w: 5 }, { text: prod ? prod.name + ' ' + (prod.keywords || '') : '', w: 3 },
        { text: [g.rowLabel, g.colLabel, 'ltv tenure grid'].join(' '), w: 3 },
        { text: g.rows.map(x => x.label).join(' ') + ' ' + g.cols.join(' ') + ' ' + (g.notes || ''), w: 1 },
      ]);
      if (r.score > 0.4) {
        const lk = gridLookup(g, query);
        results.push({ kind: 'grid', item: g, ...r, lookup: lk, score: r.score + (lk ? 3 : 0) });
      }
    });
    S.docs.forEach(d => {
      const prod = S.products.find(p => p.id === d.productId);
      if (S.cat && !inCat(prod || {})) return;
      const r = Search.scoreItem(terms, [
        { text: d.title, w: 5 }, { text: d.tags, w: 4 }, { text: prod ? prod.name : '', w: 3 },
        { text: d.notes, w: 2 }, { text: d.text, w: 1.1 },
      ]);
      if (r.score > 0.4) results.push({ kind: 'doc', item: d, ...r, page: bestPage(d, terms) });
    });
    (S.cases || []).forEach(c => {
      const prod = S.products.find(p => p.id === c.productId);
      if (S.cat && !inCat(prod || {})) return;
      const r = Search.scoreItem(terms, [{ text: c.customer, w: 5 }, { text: c.situation, w: 3 }, { text: c.vehicle, w: 3 }, { text: prod ? prod.name : '', w: 2 }, { text: c.tags, w: 2 }, { text: c.reason, w: 1 }, { text: c.caseNo, w: 4 }]);
      if (r.score > 0.4) results.push({ kind: 'case', item: c, ...r, score: r.score * 0.9 });
    });
    // Question like "can we do X without Y?" -> answer from uploaded policies
    const qa = QA.answer(query, S);
    S.lastQa = qa ? { query, qa } : null;
    // Vehicle model + manufacturing year in the query -> instant max loan / tenure / rate
    const vq = qa && qa.verdict !== 'NOTFOUND' ? null : vehicleFromQuery(query);
    results.sort((a, b) => b.score - a.score);

    if (!results.length && !vq && !qa) {
      out.innerHTML = emptyBox(`No match for “${esc(query)}”. Try fewer or different words (e.g. product short form: pl, bl, lap, tw).`);
      return;
    }
    const top = results[0] || { score: 0 };
    let html = qa ? answerBox(qa) : '';
    if (vq) html += quoteBox(vq.vehicle, vq.quote, true);
    // Instant answer box: best LTV grid lookup (if reasonably relevant), else top situation
    const gridHit = results.find(x => x.kind === 'grid' && x.lookup && x.score >= top.score * 0.4);
    if (vq || qa) { /* answer already shown */ } else if (gridHit) {
      const g = gridHit.item, lk = gridHit.lookup;
      html += `<div class="result-box tap" data-open="grid" data-id="${g.id}" data-r="${lk.r}" data-c="${lk.c}">
        <div class="small">${esc(g.name)}</div>
        <div class="big">${esc(lk.val || '—')}${lk.val && g.unit && /\d$/.test(lk.val) ? esc(g.unit) : ''}</div>
        <div class="small">${esc(g.rowLabel || 'Row')}: ${esc(g.rows[lk.r].label)} · ${esc(g.colLabel || 'Column')}: ${esc(g.cols[lk.c])}</div>
      </div>`;
    } else if (top.kind === 'rule' && top.coverage >= 0.99) {
      html += `<div class="result-box tap" data-open="rule" data-id="${top.item.id}">
        <div class="small">Solution · ${esc(top.item.title)}</div>
        <div class="pre" style="margin-top:4px">${Search.highlight(top.item.solution, terms)}</div>
      </div>`;
    }
    if (results.length) html += `<div class="section-title">${results.length} result${results.length > 1 ? 's' : ''}</div>`;
    html += results.slice(0, 60).map(res => {
      const it = res.item;
      if (res.kind === 'product') return productCard(it, terms);
      if (res.kind === 'rule') return `<div class="card tap" data-open="rule" data-id="${it.id}">
          <div class="row"><h3>${Search.highlight(it.title, terms)}</h3><span class="badge rule">${it.decision ? esc(VERDICT[it.decision][0]) : "Policy rule"}</span></div>
          <div class="snip">${Search.highlight(Search.snippet(it.solution, terms), terms)}</div>
          ${it.productId ? `<div class="meta" style="margin-top:4px">${esc(productName(it.productId))}</div>` : ''}</div>`;
      if (res.kind === 'case') return caseLine(it, terms, true);
      if (res.kind === 'grid') return `<div class="card tap" data-open="grid" data-id="${it.id}" ${res.lookup ? `data-r="${res.lookup.r}" data-c="${res.lookup.c}"` : ''}>
          <div class="row"><h3>${Search.highlight(it.name, terms)}</h3><span class="badge grid">LTV grid</span></div>
          <div class="meta">${esc(it.rowLabel || '')} × ${esc(it.colLabel || '')}${res.lookup ? ` → <b>${esc(res.lookup.val || '—')}${res.lookup.val && it.unit && /\d$/.test(res.lookup.val) ? esc(it.unit) : ''}</b> (${esc(it.rows[res.lookup.r].label)}, ${esc(it.cols[res.lookup.c])})` : ''}</div></div>`;
      const pageTxt = res.page ? it.pageTexts[res.page.i] : null;
      return docCard(it, terms, pageTxt ? Search.snippet(pageTxt, terms) : Search.snippet([it.notes, it.text].filter(Boolean).join(' · '), terms), res.page ? res.page.i + 1 : null);
    }).join('');
    out.innerHTML = html;
  }

  const VERDICT = {
    NO: ['NO', 'Not possible as per your policy'],
    YES: ['YES', 'Allowed as per your policy'],
    COND: ['ONLY WITH CONDITIONS', 'Possible only if the conditions below are met'],
    UNCLEAR: ['CHECK', 'Related policy lines found – read below'],
    NOTFOUND: ['NOT FOUND', 'Nothing about this in your uploaded policies'],
  };
  function answerBox(a) {
    const [big, sub] = VERDICT[a.verdict];
    const terms = [...a.topic, ...a.lacking];
    const ev = a.reasons.map(r => {
      const sn = r.sn;
      const open = sn.kind === 'doc' ? `data-open="doc" data-id="${sn.id}" ${sn.page ? `data-page="${sn.page}"` : ''}` : `data-open="${sn.kind}" data-id="${sn.id}"`;
      const src = sn.kind === 'doc' ? `📄 ${esc(sn.title)}${sn.page ? ' · page ' + sn.page : ''}` : sn.kind === 'rule' ? `${sn.mine ? '⭐ My rule' : '💡 Rule'}: ${esc(sn.title)}${sn.ref ? ' · 📄 ' + esc(sn.ref) : ''}` : `📋 ${esc(sn.title)} – ${esc(sn.field)}`;
      return `<div class="ev tap" ${open}><div class="q">“${Search.highlight(sn.text, terms)}”</div><div class="src">${src}${r.v ? ` · <b class="v-${r.v}">${esc(r.why)}</b>` : ''}${sn.sample ? ' · SAMPLE' : ''}</div></div>`;
    }).join('');
    const pc = a.past;
    const D_ICON = { YES: '✅', NO: '❌', COND: '⚠️' };
    const pastHtml = pc ? `<div class="why">Similar past cases (${pc.total}): ${pc.counts.YES ? `✅ ${pc.counts.YES} approved ` : ''}${pc.counts.COND ? `⚠️ ${pc.counts.COND} with conditions ` : ''}${pc.counts.NO ? `❌ ${pc.counts.NO} rejected` : ''}</div>
      ${a.caseConflict ? '<div class="notice" style="margin:4px 0 8px">Past decisions differ from the policy text – check which is current.</div>' : ''}
      ${pc.list.slice(0, 3).map(x => caseLine(x.c, terms)).join('')}` : '';
    return `<div class="answer v-${a.verdict}">
      <div class="verdict">${big}</div><div class="vsub">${a.fromCases ? `Based on ${pc.total} similar past case${pc.total > 1 ? 's' : ''} (no clear policy line found)` : sub}</div>
      ${a.lacking.length ? `<div class="meta">Missing: <b>${esc(a.lacking.join(' '))}</b></div>` : ''}
      ${a.fromCases ? pastHtml : ''}
      ${ev ? `<div class="why">Why – from your documents:</div>${ev}` : (a.fromCases ? '' : `<div class="meta" style="margin-top:6px">Upload the policy PDF / photo that covers this. For photos and scanned PDFs, run More → “Read text from photos &amp; scanned PDFs”.</div>`)}
      ${a.fromCases ? '' : pastHtml}
      <div class="disc">${a.fromRule ? 'Decision from your saved policy rule.' : a.fromCases ? 'Learned from your past loan cases. Confirm with current policy.' : 'Read automatically from your files. Always confirm with the full circular before sanction.'}</div>
      <div class="btn-row"><button class="btn secondary small" data-saverule>${a.fromRule ? '✎ Change this rule' : '⭐ Save my decision'}</button><button class="btn secondary small" data-savecase>📝 Record as past case</button></div>
    </div>`;
  }

  function docCard(d, terms, snip, page) {
    const h = t => terms ? Search.highlight(t, terms) : esc(t);
    return `<div class="card tap" data-open="doc" data-id="${d.id}" ${page ? `data-page="${page}"` : ''}>
      <div class="row"><h3 class="ellip">${h(d.title || d.fileName || 'Policy')}</h3><span class="badge doc">${d.type === 'pdf' ? 'PDF' : 'Image'}${page ? ' · p.' + page : ''}</span></div>
      <div class="meta">${esc([productName(d.productId), d.tags].filter(Boolean).join(' · '))}</div>
      ${snip ? `<div class="snip">${h(snip)}</div>` : ''}
    </div>`;
  }
  function emptyBox(msg) { return `<div class="empty">${ICON.doc}<div>${msg}</div></div>`; }

  // global click delegation for cards
  document.addEventListener('click', e => {
    if (e.target.closest('[data-savecase]')) {
      const last = S.lastQa; if (!last) return;
      const map = { NO: 'Rejected', YES: 'Approved', COND: 'Approved with conditions' };
      const prodHit = S.products.map(p => ({ p, r: Search.scoreItem(last.qa.topic || [], [{ text: p.name + ' ' + (p.keywords || ''), w: 1 }]) })).filter(x => x.r.matched).sort((a, b) => b.r.score - a.r.score)[0];
      editCase(null, { situation: last.query.replace(/\s*\?+\s*$/, ''), decision: map[last.qa.verdict] || '', date: new Date().toISOString().slice(0, 10), productId: prodHit ? prodHit.p.id : '' });
      return;
    }
    if (e.target.closest('[data-saverule]')) {
      const last = S.lastQa; if (!last) return;
      if (last.qa.fromRule) { editRule(last.qa.fromRule); return; }
      const lack = last.qa.lacking || [];
      const firstDoc = (last.qa.reasons || []).find(r => r.sn.kind === 'doc');
      editRule(null, {
        title: last.query.replace(/\s*\?+\s*$/, ''),
        decision: ['NO', 'YES', 'COND'].includes(last.qa.verdict) ? last.qa.verdict : '',
        solution: last.qa.reasons && last.qa.reasons[0] && last.qa.reasons[0].v ? last.qa.reasons[0].sn.text : '',
        ref: firstDoc ? firstDoc.sn.title + (firstDoc.sn.page ? ', page ' + firstDoc.sn.page : '') : '',
        keywords: [...new Set([...(last.qa.topic || []), ...lack])].join(' '),
      });
      return;
    }
    const el = e.target.closest('[data-open]');
    if (!el) return;
    const id = el.dataset.id;
    const kind = el.dataset.open;
    if (kind === 'product') openProduct(S.products.find(p => p.id === id));
    else if (kind === 'rule') { const r = S.rules.find(x => x.id === id); if (r) openRule(r); }
    else if (kind === 'grid') { const g = S.grids.find(x => x.id === id); if (g) openGrid(g, el.dataset.r != null ? { r: +el.dataset.r, c: +el.dataset.c } : null); }
    else if (kind === 'doc') { const d = S.docs.find(x => x.id === id); if (d) openDoc(d, +el.dataset.page || 1); }
    else if (kind === 'vcalc') openVehicleCalc({ vehicleId: id, year: +el.dataset.year || null, tenure: +el.dataset.tenure || null });
    else if (kind === 'case') { const c = S.cases.find(x => x.id === id); if (c) openCase(c); }
    else if (kind === 'scheme') { const sc = S.schemes.find(x => x.id === id); if (sc) editScheme(sc); }
    else if (kind === 'vehicle') { const v = S.vehicles.find(x => x.id === id); if (v) editVehicle(v); }
  });

  // ---------- PRODUCTS ----------
  function renderProducts() {
    const cats = categories();
    const list = S.products.filter(p => !S.cat || (p.category || '').trim() === S.cat);
    view.innerHTML = `<div class="chips" id="pcats">${['', ...cats].map(c => `<button class="chip ${S.cat === c ? 'on' : ''}" data-c="${esc(c)}">${esc(c || 'All')}</button>`).join('')}</div>
      <div class="section-title">Products <span>${list.length}</span></div>
      ${list.length ? list.map(p => productCard(p)).join('') : emptyBox('No products. Tap + to add your first product with ROI, processing fee and documentation charges.')}
      <div style="height:70px"></div>`;
    $('#pcats').onclick = e => { const b = e.target.closest('.chip'); if (!b) return; S.cat = b.dataset.c; renderProducts(); };
    fab(() => editProduct(null), 'Add product');
  }

  function openProduct(p0) {
    if (!p0) return;
    openSheet(p0.name, (body, actions, setTitle) => {
      const p = S.products.find(x => x.id === p0.id);
      if (!p) { closeSheet(); return; }
      setTitle(p.name);
      stack[stack.length - 1].isDetail = true;
      actionBtn(actions, ICON.edit, 'Edit', () => editProduct(p));
      const rows = PRODUCT_FIELDS.filter(f => f.k !== 'name' && f.k !== 'keywords' && p[f.k]).map(f => `<tr><td>${esc(f.label)}</td><td class="pre">${esc(p[f.k])}</td></tr>`).join('');
      const grids = S.grids.filter(g => g.productId === p.id);
      const docs = S.docs.filter(d => d.productId === p.id);
      const rules = S.rules.filter(r => r.productId === p.id);
      body.innerHTML = `${p.sample ? '<div class="notice">This is SAMPLE data. Tap ✎ to replace with your actual policy.</div>' : ''}
        <div class="card"><table class="detail-table">${rows || '<tr><td colspan=2>No details yet.</td></tr>'}</table></div>
        ${grids.length ? '<div class="section-title">LTV / Tenure grids</div>' + grids.map(g => `<div class="card tap" data-open="grid" data-id="${g.id}"><div class="row"><h3>${esc(g.name)}</h3><span class="badge grid">Grid</span></div><div class="meta">${esc(g.rowLabel)} × ${esc(g.colLabel)}</div></div>`).join('') : ''}
        ${rules.length ? '<div class="section-title">Situations</div>' + rules.map(r => `<div class="card tap" data-open="rule" data-id="${r.id}"><h3>${esc(r.title)}</h3><div class="snip">${esc(Search.snippet(r.solution, [], 140))}</div></div>`).join('') : ''}
        <div class="section-title">Policy documents <span>${docs.length}</span></div>
        ${docs.map(d => docCard(d)).join('') || '<div class="meta" style="padding:0 4px">No documents linked. Upload in the Policies tab and pick this product.</div>'}
        <div class="btn-row" style="margin-top:14px">
          <button class="btn secondary small" id="emiBtn">EMI calculator</button>
          <button class="btn secondary small" id="addDocBtn">+ Policy file</button>
          <button class="btn secondary small" id="addGridBtn">+ LTV grid</button>
        </div>`;
      $('#emiBtn', body).onclick = () => openEmi(p);
      $('#addDocBtn', body).onclick = () => pickDocs(p.id);
      $('#addGridBtn', body).onclick = () => editGrid(null, p.id);
    });
  }

  function openRule(r0) {
    openSheet('Policy rule', (body, actions) => {
      const r = S.rules.find(x => x.id === r0.id);
      if (!r) { closeSheet(); return; }
      stack[stack.length - 1].isDetail = true;
      actionBtn(actions, ICON.edit, 'Edit', () => editRule(r));
      const p = S.products.find(x => x.id === r.productId);
      body.innerHTML = `${r.sample ? '<div class="notice">SAMPLE situation – edit or delete it.</div>' : ''}
        <div class="card"><h3>${esc(r.title)}</h3>
        ${r.decision ? `<div class="answer v-${r.decision}" style="margin:8px 0;box-shadow:none"><div class="verdict">${esc(VERDICT[r.decision][0])}</div><div class="vsub">${esc(VERDICT[r.decision][1])}</div></div>` : ''}
        <div class="snip pre" style="font-size:15px">${esc(r.solution)}</div>
        ${r.ref ? `<div class="meta" style="margin-top:8px">📄 ${esc(r.ref)}</div>` : ''}
        ${r.keywords ? `<div class="meta" style="margin-top:4px">Also matches: ${esc(r.keywords)}</div>` : ''}</div>
        ${p ? productCard(p) : ''}`;
    });
  }

  // ---------- POLICY DOCS ----------
  function renderDocs() {
    view.innerHTML = `<div class="btn-row"><button class="btn" id="upBtn">+ Upload images / PDFs</button></div>
      <div class="hint" style="margin:0 4px 8px">PDF text is read automatically so you can search inside it. For photos, add a title &amp; tags (e.g. “PL ROI card”).</div>
      <div id="docProgress"></div>
      <div class="section-title">Policies <span>${S.docs.length}</span></div>
      ${S.docs.length ? `<div class="thumbs" id="thumbs"></div>` : emptyBox('No policy files yet. Upload your circular PDFs and rate-card photos.')}
      <div style="height:70px"></div>`;
    $('#upBtn').onclick = () => pickDocs('');
    const th = $('#thumbs');
    if (th) {
      S.docs.forEach(d => {
        const el = document.createElement('div');
        el.className = 'thumb card tap'; el.style.padding = 0; el.dataset.open = 'doc'; el.dataset.id = d.id;
        el.innerHTML = `${d.type === 'pdf' && !d.thumb ? '<span class="pdf-icon">PDF</span>' : ''}<div class="lbl">${d.type === 'pdf' ? 'PDF · ' : ''}${esc(d.title || d.fileName)}</div>`;
        th.appendChild(el);
        if (d.thumb) { const img = new Image(); img.src = d.thumb; el.prepend(img); }
      });
    }
    fab(() => pickDocs(''), 'Upload');
  }

  function pickDocs(productId) {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.multiple = true; inp.accept = 'image/*,application/pdf';
    inp.onchange = () => { if (inp.files.length) importFiles([...inp.files], productId); };
    inp.click();
  }

  async function makeThumb(blob) {
    try {
      const url = URL.createObjectURL(blob);
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
      const c = document.createElement('canvas'); const w = 240; c.width = w; c.height = Math.round(w * img.height / img.width) || w;
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      return c.toDataURL('image/jpeg', 0.7);
    } catch (e) { return ''; }
  }

  // ---------- OCR (offline text reading for photos & scanned PDFs) ----------
  let ocrWorkerP = null;
  function getOcr() {
    if (!ocrWorkerP) {
      const base = new URL('lib/ocr/', location.href).href;
      ocrWorkerP = Tesseract.createWorker('eng', 1, {
        workerPath: base + 'worker.min.js', corePath: base, langPath: base.replace(/\/$/, ''),
        gzip: false, cacheMethod: 'none',
      }).catch(e => { ocrWorkerP = null; throw e; });
    }
    return ocrWorkerP;
  }
  async function ocrImage(src) {
    const w = await getOcr();
    const { data } = await w.recognize(src);
    return (data && data.text || '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  }
  async function renderPdfPageCanvas(page, targetWidth = 1700) {
    const vp1 = page.getViewport({ scale: 1 });
    const vp = page.getViewport({ scale: Math.min(3, targetWidth / vp1.width) });
    const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    return c;
  }

  async function pdfExtract(blob, onPage, opts = {}) {
    const buf = await blob.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf), isEvalSupported: false }).promise;
    const pageTexts = [];
    let thumb = '', ocrUsed = false;
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const tc = await page.getTextContent();
      let s = ''; let lastY = null;
      tc.items.forEach(it => { const y = it.transform ? it.transform[5] : null; if (lastY !== null && y !== null && Math.abs(y - lastY) > 2) s += '\n'; else if (s && !s.endsWith(' ')) s += ' '; s += it.str; lastY = y; });
      let pageText = s.replace(/[ \t]+/g, ' ').trim();
      if ((pageText.length < 40 || opts.forceOcr) && opts.ocr !== false) {
        try { onPage && onPage(i - 0.5, pdf.numPages, true); const c = await renderPdfPageCanvas(page); const t = await ocrImage(c); if (t.length > pageText.length) pageText = t; ocrUsed = true; } catch (e) { console.warn('ocr', e); }
      }
      pageTexts.push(pageText);
      if (i === 1) {
        try {
          const vp = page.getViewport({ scale: 1 }); const sc = 240 / vp.width; const v2 = page.getViewport({ scale: sc });
          const c = document.createElement('canvas'); c.width = v2.width; c.height = v2.height;
          await page.render({ canvasContext: c.getContext('2d'), viewport: v2 }).promise;
          thumb = c.toDataURL('image/jpeg', 0.7);
        } catch (e) { /* ignore */ }
      }
      onPage && onPage(i, pdf.numPages);
    }
    pdf.destroy();
    return { pageTexts, thumb, pages: pageTexts.length, ocrUsed };
  }

  async function importFiles(files, productId) {
    const box = $('#docProgress') || document.createElement('div');
    const created = [];
    for (let k = 0; k < files.length; k++) {
      const f = files[k];
      const isPdf = f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
      box.innerHTML = `<div class="meta">Adding ${k + 1}/${files.length}: ${esc(f.name)}</div><div class="progress"><div style="width:${(k / files.length) * 100}%"></div></div>`;
      const fileId = DB.uid();
      await DB.put('files', { id: fileId, blob: f, name: f.name, type: f.type || (isPdf ? 'application/pdf' : 'image/jpeg') });
      const doc = { id: DB.uid(), fileId, fileName: f.name, title: f.name.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' '), type: isPdf ? 'pdf' : 'image', productId: productId || '', tags: '', notes: '', text: '', pageTexts: [], created: Date.now() + k };
      try {
        if (isPdf) {
          const r = await pdfExtract(f, (i, n, isOcr) => { const bar = $('.progress div', box); if (bar) bar.style.width = (((k + i / n) / files.length) * 100) + '%'; const m = $('.meta', box); if (m) m.textContent = `${isOcr ? 'Reading scanned page' : 'Reading page'} ${Math.ceil(i)}/${n} of ${f.name}`; });
          doc.pageTexts = r.pageTexts; doc.text = r.pageTexts.join('\n'); doc.thumb = r.thumb; doc.pages = r.pages; doc.ocr = r.ocrUsed;
        } else {
          doc.thumb = await makeThumb(f);
          const m = $('.meta', box); if (m) m.textContent = `Reading text from photo ${k + 1}/${files.length} (${f.name})…`;
          try { const t = await ocrImage(f); doc.pageTexts = [t]; doc.text = t; doc.ocr = true; } catch (e) { console.warn('ocr', e); }
        }
      } catch (e) { console.warn(e); toast('Could not read ' + f.name); }
      await DB.put('docs', doc);
      created.push(doc);
    }
    box.innerHTML = '';
    await loadAll();
    renderTab();
    if (stack.length) showTopSheet();
    const noText = created.filter(d => !d.text.trim()).length;
    toast(`${created.length} file(s) added${noText ? ` · ${noText} with no readable text: add tags/notes` : ' · text read for search'}`, 3500);
    if (created.length === 1) editDoc(created[0]);
  }

  async function reReadDoc(d, onProgress) {
    const f = await DB.get('files', d.fileId);
    if (!f) return d;
    const full = await DB.get('docs', d.id);
    if (d.type === 'pdf') {
      const r = await pdfExtract(f.blob, onProgress, { forceOcr: !(full.text || '').trim() || full._forceOcr });
      full.pageTexts = r.pageTexts; full.text = r.pageTexts.join('\n'); full.ocr = r.ocrUsed;
    } else {
      onProgress && onProgress(0.5, 1, true);
      const t = await ocrImage(f.blob); full.pageTexts = [t]; full.text = t; full.ocr = true;
    }
    await DB.put('docs', full);
    return full;
  }

  const DOC_FIELDS = [
    { k: 'title', label: 'Title', required: true },
    { k: 'productId', label: 'Product', type: 'select', options: productOptions },
    { k: 'tags', label: 'Tags / keywords', ph: 'e.g. roi card, pf, doc charges, ltv, circular 2026' },
    { k: 'notes', label: 'Notes (searchable)', type: 'textarea', ph: 'Type key points from this image/policy so search can find it.' },
  ];
  function editDoc(d) {
    formSheet('Policy details', DOC_FIELDS, d, async v => { const full = await DB.get('docs', d.id); await DB.put('docs', { ...full, ...v }); },
      async () => { await DB.del('docs', d.id); if (d.fileId) await DB.del('files', d.fileId); });
  }

  function openDoc(d0, page = 1) {
    openSheet(d0.title || d0.fileName, async (body, actions, setTitle) => {
      let objUrl = null, pdf = null, alive = true;
      const d = S.docs.find(x => x.id === d0.id);
      if (!d) { closeSheet(); return; }
      setTitle(d.title || d.fileName);
      const entry = stack[stack.length - 1];
      entry.isDetail = true;
      entry.cleanup = () => { alive = false; if (objUrl) URL.revokeObjectURL(objUrl); if (pdf) pdf.destroy(); };
      actionBtn(actions, ICON.edit, 'Edit details', () => editDoc(d));
      body.addEventListener('click', async e => {
        const b = e.target.closest('[data-reocr]'); if (!b) return;
        b.disabled = true; const msg = $('[data-ocrmsg]', body);
        try {
          const cur = await DB.get('docs', d.id); cur._forceOcr = true; await DB.put('docs', cur);
          await reReadDoc(cur, (i, n) => { msg.textContent = `Reading ${Math.ceil(i)}/${n}…`; });
          const fin = await DB.get('docs', d.id); delete fin._forceOcr; await DB.put('docs', fin);
          await loadAll(); toast('Text updated'); showTopSheet();
        } catch (er) { msg.textContent = 'Failed: ' + er.message; b.disabled = false; }
      });
      const f = await DB.get('files', d.fileId);
      if (!f || !alive) { body.innerHTML = emptyBox('File missing.'); return; }
      const meta = `<div class="meta" style="margin-bottom:8px">${esc([productName(d.productId), d.tags].filter(Boolean).join(' · '))}</div>${d.notes ? `<div class="card pre">${esc(d.notes)}</div>` : ''}
        <details class="card" style="padding:8px 12px"><summary class="meta">Text read from this file (${(d.text || '').trim() ? (d.text.length.toLocaleString() + ' chars' + (d.ocr ? ', OCR' : '')) : 'none'})</summary>
          <div class="pre" style="font-size:13px;max-height:40vh;overflow:auto;margin-top:6px">${esc((d.text || '').slice(0, 20000)) || 'No text yet.'}</div>
          <button class="btn secondary small" data-reocr style="margin-top:8px">Read text again (OCR)</button><span class="meta" data-ocrmsg style="margin-left:8px"></span>
        </details>`;
      if (d.type !== 'pdf') {
        objUrl = URL.createObjectURL(f.blob);
        let zoom = 100;
        body.innerHTML = meta + `<div class="pdf-bar"><button class="btn secondary small" id="zo">−</button><button class="btn secondary small" id="zi">+</button><button class="btn secondary small" id="zf">Fit</button></div><div class="zoomwrap"><img class="viewer-img" id="vimg" src="${objUrl}" alt=""></div>`;
        const img = $('#vimg', body);
        const apply = () => { img.style.width = zoom + '%'; img.style.maxWidth = 'none'; };
        $('#zi', body).onclick = () => { zoom = Math.min(500, zoom + 50); apply(); };
        $('#zo', body).onclick = () => { zoom = Math.max(50, zoom - 50); apply(); };
        $('#zf', body).onclick = () => { zoom = 100; apply(); };
        return;
      }
      body.innerHTML = meta + `<div class="pdf-bar">
          <button class="btn secondary small" id="zo">−</button><button class="btn secondary small" id="zi">+</button>
          <input class="input" id="findIn" placeholder="Find in this PDF" style="flex:1;min-width:120px;margin:0;padding:6px 10px">
        </div><div id="findRes"></div><div class="zoomwrap"><div class="pdf-pages" id="pages"></div></div>`;
      const buf = await f.blob.arrayBuffer();
      pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf), isEvalSupported: false }).promise;
      if (!alive) return;
      const pagesEl = $('#pages', body);
      let scale = 1;
      const width = () => body.clientWidth - 24;
      const holders = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const h = document.createElement('div'); h.dataset.p = i; h.style.minHeight = '200px';
        h.innerHTML = `<div class="pg-label">Page ${i} / ${pdf.numPages}</div>`;
        pagesEl.appendChild(h); holders.push(h);
      }
      const rendered = new Map();
      async function renderPage(i) {
        if (!alive || rendered.get(i) === scale) return;
        rendered.set(i, scale);
        const pg = await pdf.getPage(i);
        const vp1 = pg.getViewport({ scale: 1 });
        const s = (width() / vp1.width) * scale;
        const vp = pg.getViewport({ scale: s * (window.devicePixelRatio || 1) });
        const c = document.createElement('canvas');
        c.width = vp.width; c.height = vp.height;
        c.style.width = (vp.width / (window.devicePixelRatio || 1)) + 'px';
        await pg.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
        const h = holders[i - 1]; const old = h.querySelector('canvas'); if (old) old.remove(); h.appendChild(c); h.style.minHeight = '';
      }
      const io = new IntersectionObserver(ents => ents.forEach(en => { if (en.isIntersecting) renderPage(+en.target.dataset.p); }), { root: body, rootMargin: '600px 0px' });
      holders.forEach(h => io.observe(h));
      const prevCleanup = entry.cleanup; entry.cleanup = () => { io.disconnect(); prevCleanup(); };
      const rezoom = () => { holders.forEach((h, i) => { if (rendered.has(i + 1)) { rendered.delete(i + 1); } }); holders.forEach(h => { io.unobserve(h); io.observe(h); }); };
      $('#zi', body).onclick = () => { scale = Math.min(4, scale + 0.5); rezoom(); };
      $('#zo', body).onclick = () => { scale = Math.max(0.5, scale - 0.5); rezoom(); };
      const goto = p => { const h = holders[p - 1]; if (h) { renderPage(p).then(() => h.scrollIntoView({ block: 'start' })); } };
      $('#findIn', body).oninput = debounce(e => {
        const q = e.target.value.trim(); const res = $('#findRes', body);
        if (!q) { res.innerHTML = ''; return; }
        const terms = Search.queryTerms(q);
        const hits = (d.pageTexts || []).map((t, i) => ({ i, sc: Search.scoreItem(terms, [{ text: t, w: 1 }]).score, t })).filter(x => x.sc > 0.3).sort((a, b) => b.sc - a.sc).slice(0, 8);
        res.innerHTML = hits.length ? hits.map(h => `<div class="card tap" data-goto="${h.i + 1}"><div class="meta">Page ${h.i + 1}</div><div class="snip">${Search.highlight(Search.snippet(h.t, terms, 160), terms)}</div></div>`).join('') : '<div class="meta" style="padding:4px">No text match (scanned PDFs have no text).</div>';
        $$('[data-goto]', res).forEach(el => el.onclick = () => goto(+el.dataset.goto));
      }, 200);
      if (page > 1) setTimeout(() => goto(page), 50);
    });
  }

  // ---------- GRIDS ----------
  function renderGrids() {
    view.innerHTML = `
      <button class="btn block" id="vcalcBtn" style="padding:14px">🚗 Vehicle loan check — model + year + tenure</button>
      <div class="section-title">Vehicle schemes (age bands) <span>${S.schemes.length}</span></div>
      ${S.schemes.map(sc => `<div class="card tap" data-open="scheme" data-id="${sc.id}"><div class="row"><h3>${esc(sc.name)}</h3><span class="badge grid">${(sc.bands || []).length} bands</span></div><div class="meta">${esc([...new Set([...(sc.bands || []).map(b => b.productId), sc.productId].filter(Boolean).map(productName).filter(Boolean))].join(' + '))}${sc.maxAge ? ` · max age at maturity ${esc(sc.maxAge)} yrs` : ''}</div></div>`).join('')}
      <div class="btn-row"><button class="btn secondary small" id="addScheme">+ Scheme</button><button class="btn secondary small" id="vList">Vehicle models (${S.vehicles.length})</button><button class="btn secondary small" id="addVeh">+ Model</button></div>
      <div class="hint" style="margin:10px 4px 8px">Make a grid for LTV by tenure (rows = CIBIL / vehicle age / customer type…, columns = tenure). Tip: copy a table from Excel and paste it in the grid editor.</div>
      <div class="section-title">LTV / Tenure grids <span>${S.grids.length}</span></div>
      ${S.grids.length ? S.grids.map(g => `<div class="card tap" data-open="grid" data-id="${g.id}"><div class="row"><h3>${esc(g.name)}</h3><span class="badge grid">${g.rows.length}×${g.cols.length}</span></div><div class="meta">${esc(productName(g.productId) || 'No product')} · ${esc(g.rowLabel || '')} × ${esc(g.colLabel || '')}</div></div>`).join('') : emptyBox('No grids yet. Tap + to create one.')}
      <div style="height:70px"></div>`;
    fab(() => editGrid(null, ''), 'New grid');
    $('#vcalcBtn').onclick = () => openVehicleCalc({});
    $('#addScheme').onclick = () => editScheme(null);
    $('#addVeh').onclick = () => editVehicle(null);
    $('#vList').onclick = openVehicleList;
  }

  function gridTable(g, opts = {}) {
    const unit = g.unit || '';
    const show = v => esc(v == null ? '' : v) + (v && unit && /\d$/.test(v) && !opts.edit ? `<small>${esc(unit)}</small>` : '');
    const ce = opts.edit ? ' contenteditable="true"' : '';
    return `<table class="ltv"><thead><tr><th class="corner">${esc(g.rowLabel || '')} ↓ / ${esc(g.colLabel || '')} →</th>${g.cols.map((c, j) => `<th data-c="${j}"${ce}>${esc(c)}</th>`).join('')}</tr></thead>
      <tbody>${g.rows.map((r, i) => `<tr><th data-r="${i}"${ce}>${esc(r.label)}</th>${g.cols.map((c, j) => `<td data-r="${i}" data-c="${j}"${ce}>${opts.edit ? esc((r.cells || [])[j] || '') : show((r.cells || [])[j])}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  }

  function openGrid(g0, sel) {
    openSheet(g0.name, (body, actions, setTitle) => {
      const g = S.grids.find(x => x.id === g0.id);
      if (!g) { closeSheet(); return; }
      setTitle(g.name);
      stack[stack.length - 1].isDetail = true;
      actionBtn(actions, ICON.edit, 'Edit grid', () => editGrid(g));
      const p = S.products.find(x => x.id === g.productId);
      body.innerHTML = `${g.sample ? '<div class="notice">SAMPLE grid – tap ✎ to enter your real LTV values.</div>' : ''}
        <div class="meta" style="margin-bottom:8px">${esc(p ? p.name : '')}</div>
        <div class="two">
          <div><label class="f">${esc(g.rowLabel || 'Row')}</label><select class="input" id="selR">${g.rows.map((r, i) => `<option value="${i}">${esc(r.label)}</option>`).join('')}</select></div>
          <div><label class="f">${esc(g.colLabel || 'Column')}</label><select class="input" id="selC">${g.cols.map((c, j) => `<option value="${j}">${esc(c)}</option>`).join('')}</select></div>
        </div>
        <div class="result-box" id="gres"></div>
        <div class="grid-wrap" id="gwrap">${gridTable(g)}</div>
        ${g.notes ? `<div class="card pre" style="margin-top:10px">${esc(g.notes)}</div>` : ''}
        <div class="hint">Tap any cell to see its row &amp; column.</div>`;
      const selR = $('#selR', body), selC = $('#selC', body);
      function mark(r, c) {
        selR.value = r; selC.value = c;
        $$('#gwrap .x, #gwrap .hit', body).forEach(el => el.classList.remove('x', 'hit'));
        $$(`#gwrap [data-r="${r}"]`, body).forEach(el => el.classList.add('x'));
        $$(`#gwrap [data-c="${c}"]`, body).forEach(el => el.classList.add('x'));
        const cell = $(`#gwrap td[data-r="${r}"][data-c="${c}"]`, body);
        if (cell) { cell.classList.remove('x'); cell.classList.add('hit'); cell.scrollIntoView({ block: 'nearest', inline: 'center' }); }
        const v = (g.rows[r].cells || [])[c];
        $('#gres', body).innerHTML = `<div class="small">${esc(g.rowLabel || 'Row')}: ${esc(g.rows[r].label)} · ${esc(g.colLabel || 'Column')}: ${esc(g.cols[c])}</div><div class="big">${esc(v || '—')}${v && g.unit && /\d$/.test(v) ? esc(g.unit) : ''}</div>`;
      }
      selR.onchange = selC.onchange = () => mark(+selR.value, +selC.value);
      $('#gwrap', body).onclick = e => { const td = e.target.closest('td'); if (td) mark(+td.dataset.r, +td.dataset.c); };
      if (g.rows.length && g.cols.length) mark(sel && sel.r < g.rows.length ? sel.r : 0, sel && sel.c < g.cols.length ? sel.c : 0);
    });
  }

  function editGrid(g, productId) {
    const isNew = !g;
    const draft = g ? JSON.parse(JSON.stringify(g)) : {
      name: '', productId: productId || '', rowLabel: 'CIBIL score', colLabel: 'Tenure (months)', unit: '%',
      cols: ['12', '24', '36', '48', '60'], rows: [{ label: '750+', cells: [] }, { label: '700 – 749', cells: [] }, { label: '650 – 699', cells: [] }], notes: ''
    };
    openSheet(isNew ? 'New LTV grid' : 'Edit grid', (body, actions) => {
      function readTable() {
        $$('thead th[data-c]', body).forEach(th => { draft.cols[+th.dataset.c] = th.textContent.trim(); });
        $$('tbody th[data-r]', body).forEach(th => { draft.rows[+th.dataset.r].label = th.textContent.trim(); });
        $$('tbody td', body).forEach(td => { const r = draft.rows[+td.dataset.r]; r.cells = r.cells || []; r.cells[+td.dataset.c] = td.textContent.trim(); });
        ['name', 'rowLabel', 'colLabel', 'unit', 'notes', 'productId'].forEach(k => { const el = $(`[data-g="${k}"]`, body); if (el) draft[k] = el.value.trim(); });
      }
      function draw() {
        body.innerHTML = `
          <label class="f">Grid name</label><input class="input" data-g="name" value="${esc(draft.name)}" placeholder="e.g. Used CV – LTV by vehicle age & tenure">
          <label class="f">Product</label><select class="input" data-g="productId">${productOptions().map(o => `<option value="${esc(o[0])}" ${o[0] === draft.productId ? 'selected' : ''}>${esc(o[1])}</option>`).join('')}</select>
          <div class="two"><div><label class="f">Rows are</label><input class="input" data-g="rowLabel" value="${esc(draft.rowLabel)}"></div>
          <div><label class="f">Columns are</label><input class="input" data-g="colLabel" value="${esc(draft.colLabel)}"></div></div>
          <label class="f">Value unit</label><input class="input" data-g="unit" value="${esc(draft.unit)}" placeholder="% or blank">
          <div class="section-title">Values <span>tap a cell to type</span></div>
          <div class="grid-wrap">${gridTable(draft, { edit: true })}</div>
          <div class="btn-row">
            <button class="btn secondary small" id="addR">+ Row</button><button class="btn secondary small" id="addC">+ Column</button>
            <button class="btn secondary small" id="delR">− Last row</button><button class="btn secondary small" id="delC">− Last column</button>
          </div>
          <label class="f">Paste from Excel</label>
          <textarea class="input" id="paste" placeholder="Copy cells from Excel/Sheets (first row = column headings, first column = row labels) and paste here"></textarea>
          <button class="btn secondary small" id="applyPaste" style="margin-top:6px">Use pasted table</button>
          <label class="f">Notes</label><textarea class="input" data-g="notes">${esc(draft.notes || '')}</textarea>
          <div class="btn-row" style="margin-top:14px"><button class="btn block" id="gSave">Save grid</button></div>
          ${!isNew ? '<div class="btn-row"><button class="btn danger block" id="gDel">Delete grid</button></div>' : ''}`;
        $('#addR', body).onclick = () => { readTable(); draft.rows.push({ label: 'New row', cells: [] }); draw(); };
        $('#addC', body).onclick = () => { readTable(); draft.cols.push('New'); draw(); };
        $('#delR', body).onclick = () => { readTable(); if (draft.rows.length > 1) draft.rows.pop(); draw(); };
        $('#delC', body).onclick = () => { readTable(); if (draft.cols.length > 1) { draft.cols.pop(); draft.rows.forEach(r => r.cells && (r.cells.length = Math.min(r.cells.length, draft.cols.length))); } draw(); };
        $('#applyPaste', body).onclick = () => {
          readTable();
          const t = $('#paste', body).value.replace(/\r/g, '').split('\n').filter(l => l.trim());
          if (t.length < 2) { toast('Paste at least 2 lines'); return; }
          const sep = t[0].includes('\t') ? '\t' : (t[0].includes(';') ? ';' : ',');
          const m = t.map(l => l.split(sep).map(x => x.trim()));
          draft.cols = m[0].slice(1);
          if (m[0][0]) draft.rowLabel = m[0][0];
          draft.rows = m.slice(1).map(r => ({ label: r[0], cells: r.slice(1) }));
          draw(); toast('Table loaded – check and save');
        };
        const save = async () => {
          readTable();
          if (!draft.name) { toast('Enter a grid name'); return; }
          delete draft.sample;
          await DB.put('grids', draft); await loadAll();
          closeSheet();
          renderTab(); toast('Grid saved');
        };
        $('#gSave', body).onclick = save;
        if (!isNew) $('#gDel', body).onclick = async () => { if (!confirm('Delete this grid?')) return; await DB.del('grids', draft.id); await loadAll(); closeSheet(2); renderTab(); toast('Deleted'); };
      }
      draw();
      actionBtn(actions, ICON.save, 'Save', () => $('#gSave', body).click());
    });
  }

  // ---------- EMI ----------
  function openEmi(p) {
    openSheet('EMI calculator', body => {
      const rateGuess = p && p.rate ? (p.rate.match(/\d+(\.\d+)?/) || [''])[0] : '';
      body.innerHTML = `${p ? `<div class="meta" style="margin-bottom:6px">${esc(p.name)} · ROI ${esc(p.rate || '')} · PF ${esc(p.pf || '')}</div>` : ''}
        <label class="f">Loan amount (₹)</label><input class="input" id="eA" inputmode="decimal" value="100000">
        <div class="two"><div><label class="f">Interest % p.a.</label><input class="input" id="eR" inputmode="decimal" value="${esc(rateGuess || '14')}"></div>
        <div><label class="f">Tenure (months)</label><input class="input" id="eT" inputmode="numeric" value="36"></div></div>
        <div class="two"><div><label class="f">Processing fee %</label><input class="input" id="eP" inputmode="decimal" value="2"></div>
        <div><label class="f">Asset value (₹) for LTV</label><input class="input" id="eV" inputmode="decimal" placeholder="optional"></div></div>
        <div class="emi-out" id="eOut"></div>`;
      const calc = () => {
        const A = +$('#eA', body).value.replace(/,/g, '') || 0, R = +$('#eR', body).value || 0, T = +$('#eT', body).value || 0, P = +$('#eP', body).value || 0, V = +($('#eV', body).value || '').replace(/,/g, '') || 0;
        const r = R / 1200;
        const emi = T ? (r ? A * r * Math.pow(1 + r, T) / (Math.pow(1 + r, T) - 1) : A / T) : 0;
        const pf = A * P / 100, gst = pf * 0.18;
        $('#eOut', body).innerHTML = `<div><span>EMI</span><b>${fmtINR(emi)}</b></div><div><span>Total interest</span><b>${fmtINR(emi * T - A)}</b></div>
          <div><span>Processing fee + 18% GST</span><b>${fmtINR(pf + gst)}</b></div><div><span>Total payable</span><b>${fmtINR(emi * T)}</b></div>
          ${V ? `<div><span>LTV</span><b>${(A / V * 100).toFixed(1)}%</b></div><div><span>Margin money</span><b>${fmtINR(V - A)}</b></div>` : ''}`;
      };
      $$('input', body).forEach(i => i.oninput = calc); calc();
    });
  }

  // ---------- MORE ----------
  function renderMore() {
    view.innerHTML = `
      <div class="section-title">My policy rules (fixed decisions) <span>${S.rules.length}</span></div>
      <div class="hint" style="margin:0 4px 8px">Add a new policy yourself: situation + decision (NO / YES / conditions) + reason. When a question matches, the app gives exactly this decision first.</div>
      <button class="btn block" id="addRule" style="margin-bottom:8px">+ Add new policy rule</button>
      ${S.rules.map(r => `<div class="card tap" data-open="rule" data-id="${r.id}"><div class="row"><h3>${esc(r.title)}</h3>${r.decision ? `<span class="badge rule">${esc(VERDICT[r.decision][0])}</span>` : ''}</div><div class="snip">${esc(Search.snippet(r.solution, [], 120))}</div></div>`).join('')}

      <div class="section-title">Past loan cases (app learns from these) <span>${S.cases.length}</span></div>
      <div class="hint" style="margin:0 4px 8px">Record real cases: customer, situation, what was decided and why. New questions show similar past cases, and when the policy text is not clear the app decides from them.</div>
      <div class="btn-row"><button class="btn small" id="addCase">+ Add past case</button><button class="btn small secondary" id="listCases">View / import cases</button></div>
      ${S.cases.slice(0, 3).map(c => caseLine(c, null, true)).join('')}

      <div class="section-title">Tools</div>
      <button class="btn secondary block" id="emi">EMI / PF / LTV calculator</button>

      <div class="section-title">Import / Backup</div>
      <div class="card">
        <div class="btn-row"><button class="btn small" id="exp">Export full backup</button><button class="btn small secondary" id="imp">Restore / import backup</button></div>
        <div class="hint">Backup keeps products, grids, situations and all policy files. Use it to move to a new phone.</div>
        <div class="btn-row" style="margin-top:10px"><button class="btn small secondary" id="csv">Import products from CSV</button><button class="btn small secondary" id="csvT">CSV template</button></div>
        <div class="hint">CSV columns: name, category, rate, pf, doc, other, amount, tenure, eligibility, notes, keywords</div>
      </div>
      <div class="section-title">Text reading (OCR)</div>
      <div class="card">
        <button class="btn small secondary" id="ocrAll">Read text from photos &amp; scanned PDFs</button>
        <div class="hint">Runs offline for files that have no text yet, so questions can be answered from them. Takes a few seconds per page.</div>
        <div id="ocrAllMsg" class="meta"></div>
      </div>
      <div class="section-title">Data</div>
      <div class="card">
        <div class="btn-row"><button class="btn small danger" id="delSample">Delete sample data</button><button class="btn small danger" id="wipe">Delete everything</button></div>
        <div class="hint">All data stays only on this phone. Nothing is uploaded.</div>
      </div>
      <div class="meta" style="text-align:center;margin-top:16px">Policy Finder · works offline</div>`;
    $('#addRule').onclick = () => editRule(null);
    $('#addCase').onclick = () => editCase(null, { date: new Date().toISOString().slice(0, 10) });
    $('#listCases').onclick = openCaseList;
    $('#ocrAll').onclick = async e => {
      const todo = S.docs.filter(d => !(d.text || '').trim());
      const msg = $('#ocrAllMsg');
      if (!todo.length) { msg.textContent = 'All files already have text.'; return; }
      e.target.disabled = true;
      for (let k = 0; k < todo.length; k++) {
        try { await reReadDoc(todo[k], (i, n) => { msg.textContent = `File ${k + 1}/${todo.length} (${todo[k].title}) – page ${Math.ceil(i)}/${n}`; }); } catch (er) { console.warn(er); }
      }
      await loadAll(); msg.textContent = `Done – ${todo.length} file(s) read.`; e.target.disabled = false;
    };
    $('#emi').onclick = () => openEmi(null);
    $('#exp').onclick = exportBackup;
    $('#imp').onclick = () => pickFile('.json,application/json', importBackup);
    $('#csv').onclick = () => pickFile('.csv,text/csv,text/plain', importCsv);
    $('#csvT').onclick = () => saveText('products-template.csv', 'name,category,rate,pf,doc,other,amount,tenure,eligibility,notes,keywords\n"Used Car Loan","Car","12% - 18%","Up to 2.5% + GST","Rs 1000 + GST","","","12-60 months","","","uc used car"\n');
    $('#delSample').onclick = async () => {
      if (!confirm('Delete all SAMPLE products, grids and situations?')) return;
      for (const st of ['products', 'grids', 'rules', 'vehicles', 'schemes']) for (const x of await DB.all(st)) if (x.sample) await DB.del(st, x.id);
      await loadAll(); renderTab(); toast('Sample data deleted');
    };
    $('#wipe').onclick = async () => {
      if (!confirm('Delete ALL products, policies, grids and situations from this phone?')) return;
      if (!confirm('Are you sure? Export a backup first if you need it.')) return;
      for (const st of ['products', 'docs', 'files', 'grids', 'rules', 'vehicles', 'schemes', 'cases']) await DB.clear(st);
      await loadAll(); renderTab(); toast('All data deleted');
    };
  }

  function pickFile(accept, cb) {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = accept;
    inp.onchange = () => inp.files[0] && cb(inp.files[0]); inp.click();
  }

  function saveText(name, text) {
    if (isAndroid) { AndroidBridge.saveText(name, text); return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/octet-stream' })); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  window.onNativeSaved = ok => toast(ok ? 'File saved' : 'Not saved');

  const blobToB64 = b => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.onerror = rej; r.readAsDataURL(b); });
  function b64ToBlob(b64, type) { const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Blob([u], { type }); }

  async function exportBackup() {
    toast('Preparing backup…');
    const data = { app: 'policy-finder', version: 1, exported: new Date().toISOString() };
    for (const st of ['products', 'grids', 'rules', 'docs', 'vehicles', 'schemes', 'cases']) data[st] = await DB.all(st);
    const files = await DB.all('files');
    data.files = [];
    for (const f of files) data.files.push({ id: f.id, name: f.name, type: f.type, data: await blobToB64(f.blob) });
    saveText(`policy-finder-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data));
  }

  async function importBackup(file) {
    try {
      const data = JSON.parse(await file.text());
      if (!data || (data.app !== 'policy-finder' && !data.products)) throw new Error('Not a Policy Finder backup');
      let n = 0;
      for (const st of ['products', 'grids', 'rules', 'docs', 'vehicles', 'schemes', 'cases']) for (const x of (data[st] || [])) { await DB.put(st, x); n++; }
      for (const f of (data.files || [])) await DB.put('files', { id: f.id, name: f.name, type: f.type, blob: b64ToBlob(f.data, f.type) });
      await loadAll(); renderTab(); toast(`Imported ${n} items`);
    } catch (e) { toast('Import failed: ' + e.message, 4000); }
  }

  function parseCsv(text) {
    const rows = []; let row = [], cur = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
      else if (ch === '"') q = true;
      else if (ch === ',') { row.push(cur); cur = ''; }
      else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
      else if (ch !== '\r') cur += ch;
    }
    if (cur || row.length) { row.push(cur); rows.push(row); }
    return rows.filter(r => r.some(c => c.trim()));
  }
  async function importCsv(file) {
    const rows = parseCsv((await file.text()).replace(/^﻿/, ''));
    if (rows.length < 2) { toast('CSV is empty'); return; }
    const head = rows[0].map(h => h.trim().toLowerCase());
    const alias = { 'product': 'name', 'product name': 'name', 'roi': 'rate', 'interest rate': 'rate', 'interest': 'rate', 'processing fee': 'pf', 'documentation charge': 'doc', 'doc charge': 'doc', 'documentation charges': 'doc', 'other charges': 'other', 'loan amount': 'amount' };
    const keys = head.map(h => alias[h] || h);
    let n = 0;
    for (const r of rows.slice(1)) {
      const o = {}; keys.forEach((k, i) => { if (PRODUCT_FIELDS.some(f => f.k === k)) o[k] = (r[i] || '').trim(); });
      if (!o.name) continue;
      const existing = S.products.find(p => p.name.toLowerCase() === o.name.toLowerCase() && !p.sample);
      await DB.put('products', existing ? { ...existing, ...o } : o); n++;
    }
    await loadAll(); renderTab(); toast(`${n} products imported`);
  }


  // ---------- VEHICLE LOAN CHECK ----------
  const THIS_YEAR = new Date().getFullYear();
  const num = v => { const n = parseFloat(String(v == null ? '' : v).replace(/[,₹\s]/g, '')); return isFinite(n) ? n : NaN; };
  function parseYearValues(txt) {
    const m = {};
    String(txt || '').split(/[,;\n]+/).forEach(part => { const x = part.split(/[=:]/); if (x.length === 2) { const y = parseInt(x[0], 10), v = num(x[1]); if (y && isFinite(v)) m[y] = v; } });
    return m;
  }
  const schemeFor = v => v && S.schemes.find(sc => (sc.name || '').toLowerCase() === (v.scheme || '').toLowerCase());
  const calcEmi = (A, R, T) => { const r = R / 1200; return T ? (r ? A * r * Math.pow(1 + r, T) / (Math.pow(1 + r, T) - 1) : A / T) : 0; };

  /** Core rule engine: vehicle (or manual value) + mfg year + tenure -> max loan, tenure, rate. */
  function vehicleQuote({ vehicle, scheme, year, tenure, value }) {
    scheme = scheme || schemeFor(vehicle);
    const q = { ok: false, year, age: null, reasons: [] };
    if (!scheme) { q.reasons.push(vehicle ? `No scheme named “${vehicle.scheme || ''}”. Set the model's scheme.` : 'Choose a scheme.'); return q; }
    q.scheme = scheme;
    if (!year) { q.reasons.push('Enter manufacturing year.'); return q; }
    const age = Math.max(0, THIS_YEAR - year); q.age = age;
    const band = (scheme.bands || []).find(b => age >= num(b.from) && age <= num(b.to));
    if (!band) { q.reasons.push(`Vehicle age ${age} yr${age === 1 ? '' : 's'} is outside the ${scheme.name} policy (not eligible).`); return q; }
    q.band = band;
    // valuation
    let val = num(value), src = 'Entered value';
    if (!isFinite(val) && vehicle) {
      const yv = parseYearValues(vehicle.yearValues);
      if (yv[year]) { val = yv[year]; src = `Valuation for ${year}`; }
      else {
        const price = num(vehicle.price);
        const pcts = String(scheme.valuePct || '').split(/[,\s]+/).map(num).filter(isFinite);
        if (isFinite(price)) {
          if (pcts.length) { const pct = pcts[Math.min(age, pcts.length - 1)]; val = price * pct / 100; src = `${pct}% of new price ₹${price.toLocaleString('en-IN')} (age ${age})`; }
          else { val = price; src = 'Model price'; }
        }
      }
    }
    if (!isFinite(val) || val <= 0) { q.reasons.push('No vehicle value. Enter value or add price to the model.'); return q; }
    q.value = val; q.valueSrc = src;
    q.ltv = num(band.ltv); q.roi = num(band.roi);
    let maxLoan = val * (isFinite(q.ltv) ? q.ltv : 100) / 100;
    const cap = num(band.maxLoan);
    if (isFinite(cap) && cap > 0 && cap < maxLoan) { maxLoan = cap; q.capped = true; }
    q.maxLoan = Math.floor(maxLoan / 1000) * 1000;
    const bandTen = num(band.tenure);
    const ageTen = isFinite(num(scheme.maxAge)) ? (num(scheme.maxAge) - age) * 12 : Infinity;
    q.maxTenure = Math.min(isFinite(bandTen) ? bandTen : Infinity, ageTen);
    q.tenureLimitedByAge = ageTen < bandTen;
    if (!isFinite(q.maxTenure)) q.maxTenure = tenure || 0;
    if (q.maxTenure <= 0) { q.reasons.push(`Vehicle already reaches max age (${scheme.maxAge} yrs) – no tenure possible.`); return q; }
    q.tenure = tenure ? Math.min(tenure, q.maxTenure) : q.maxTenure;
    if (tenure && tenure > q.maxTenure) q.reasons.push(`Asked ${tenure} months, but max allowed is ${q.maxTenure} months.`);
    q.emi = calcEmi(q.maxLoan, isFinite(q.roi) ? q.roi : 0, q.tenure);
    q.product = S.products.find(p => p.id === (band.productId || scheme.productId));
    q.ok = true;
    return q;
  }

  function quoteBox(vehicle, q, tappable) {
    const title = esc(vehicle ? vehicle.name : (q.scheme ? q.scheme.name : 'Vehicle'));
    const attrs = tappable && vehicle ? `class="result-box tap" data-open="vcalc" data-id="${vehicle.id}" data-year="${q.year || ''}" data-tenure="${q.tenure || ''}"` : 'class="result-box"';
    if (!q.ok) return `<div ${attrs}><div class="small">${title}${q.year ? ' · ' + q.year : ''}</div><div style="font-weight:700;margin-top:4px">Not eligible / need more info</div><div class="small">${q.reasons.map(esc).join('<br>')}</div></div>`;
    return `<div ${attrs}>
      <div class="small">${title} · ${q.year} model · age ${q.age} yr${q.age === 1 ? '' : 's'}${vehicle && vehicle.sample ? ' · SAMPLE' : ''}</div>
      <div class="big">${fmtINR(q.maxLoan)}</div>
      <div class="small">Max loan amount${q.product ? ' · ' + esc(q.product.name) : ''}</div>
      <div class="kv" style="margin-top:8px">
        <div style="background:rgba(255,255,255,.14)"><span style="color:#cfe6ef">Rate</span><b>${isFinite(q.roi) ? q.roi + '%' : '—'}</b></div>
        <div style="background:rgba(255,255,255,.14)"><span style="color:#cfe6ef">Max tenure</span><b>${q.maxTenure} m</b></div>
        <div style="background:rgba(255,255,255,.14)"><span style="color:#cfe6ef">LTV</span><b>${isFinite(q.ltv) ? q.ltv + '%' : '—'}</b></div>
      </div>
      <div class="small" style="margin-top:8px">EMI ${fmtINR(q.emi)} for ${q.tenure} months · Value ${fmtINR(q.value)} (${esc(q.valueSrc)})${q.capped ? ' · capped by band max loan' : ''}${q.tenureLimitedByAge ? ` · tenure limited by max vehicle age ${esc(q.scheme.maxAge)} yrs` : ''}</div>
      ${q.reasons.length ? `<div class="small" style="margin-top:4px;color:#ffd58a">${q.reasons.map(esc).join('<br>')}</div>` : ''}
    </div>`;
  }

  function vehicleFromQuery(query) {
    if (!S.vehicles.length) return null;
    const ym = query.match(/\b(19[89]\d|20\d\d)\b/);
    if (!ym) return null;
    const year = +ym[1];
    const rest = query.replace(ym[0], ' ');
    let tenure = null;
    const tm = rest.match(/(\d{1,3})\s*(m|mo|mon|month|months)\b/i) || rest.match(/(\d{1,2})\s*(y|yr|yrs|year|years)\b/i);
    let tenTok = null;
    if (tm) { tenure = /^y/i.test(tm[2]) ? +tm[1] * 12 : +tm[1]; tenTok = tm[1]; }
    else { const bare = rest.match(/\b(\d{1,3})\b/); if (bare && +bare[1] >= 6 && +bare[1] <= 120) { tenure = +bare[1]; tenTok = bare[1]; } }
    // keep model numbers like "1109" / "2049"; drop the tenure number
    const terms = Search.queryTerms(rest).filter(t => t !== tenTok && !(/^\d+$/.test(t) && t.length < 3) && !['month', 'months', 'm', 'yr', 'yrs', 'year', 'years', 'model', 'mfg', 'tenure', 'max', 'amount', 'rate', 'ltv'].includes(t));
    if (!terms.length) return null;
    let best = null;
    S.vehicles.forEach(v => {
      const r = Search.scoreItem(terms, [{ text: v.name, w: 5 }, { text: v.keywords, w: 4 }]);
      if (r.matched && (!best || r.score > best.score)) best = { v, score: r.score };
    });
    if (!best) return null;
    return { vehicle: best.v, quote: vehicleQuote({ vehicle: best.v, year, tenure }) };
  }

  function openVehicleCalc(init) {
    openSheet('Vehicle loan check', body => {
      const v0 = S.vehicles.find(v => v.id === init.vehicleId);
      const years = []; for (let y = THIS_YEAR; y >= THIS_YEAR - 25; y--) years.push(y);
      body.innerHTML = `
        <label class="f">Vehicle model</label>
        <input class="input" id="vM" list="vModels" placeholder="Type model e.g. Swift, Creta, LPT 1109, Ace" value="${esc(v0 ? v0.name : '')}" autocomplete="off">
        <datalist id="vModels">${S.vehicles.map(v => `<option value="${esc(v.name)}">`).join('')}</datalist>
        <div class="two">
          <div><label class="f">Manufacturing year</label><select class="input" id="vY"><option value="">—</option>${years.map(y => `<option ${y === init.year ? 'selected' : ''}>${y}</option>`).join('')}</select></div>
          <div><label class="f">Tenure wanted (months)</label><input class="input" id="vT" inputmode="numeric" placeholder="blank = max" value="${init.tenure || ''}"></div>
        </div>
        <details style="margin-top:10px"><summary class="meta">Model not in list? Enter value &amp; scheme</summary>
          <div class="two">
            <div><label class="f">Scheme</label><select class="input" id="vS"><option value="">(from model)</option>${S.schemes.map(sc => `<option value="${sc.id}">${esc(sc.name)}</option>`).join('')}</select></div>
            <div><label class="f">Vehicle value (₹)</label><input class="input" id="vV" inputmode="decimal" placeholder="valuation"></div>
          </div>
        </details>
        <div id="vOut" style="margin-top:12px"></div>
        <div id="vBand"></div>`;
      const calc = () => {
        const name = $('#vM', body).value.trim().toLowerCase();
        let vehicle = S.vehicles.find(v => v.name.toLowerCase() === name);
        if (!vehicle && name.length >= 2) {
          const terms = Search.queryTerms(name);
          let best = null;
          S.vehicles.forEach(v => { const r = Search.scoreItem(terms, [{ text: v.name, w: 5 }, { text: v.keywords, w: 4 }]); if (r.coverage === 1 && (!best || r.score > best.score)) best = { v, score: r.score }; });
          vehicle = best && best.v;
        }
        const scId = $('#vS', body).value;
        const scheme = scId ? S.schemes.find(x => x.id === scId) : null;
        const year = +$('#vY', body).value || null;
        const tenure = +$('#vT', body).value || null;
        const value = $('#vV', body).value;
        const out = $('#vOut', body);
        if (!vehicle && !scheme) { out.innerHTML = `<div class="meta">${name ? 'Model not found in your list. Pick a scheme and enter the value below, or add the model.' : 'Type a model and choose the manufacturing year.'}</div>`; $('#vBand', body).innerHTML = ''; return; }
        const q = vehicleQuote({ vehicle, scheme, year, tenure, value });
        out.innerHTML = quoteBox(vehicle, q, false);
        const sc = q.scheme;
        $('#vBand', body).innerHTML = sc ? `<div class="section-title">${esc(sc.name)} scheme</div><div class="grid-wrap"><table class="ltv"><thead><tr><th class="corner">Age (yrs)</th><th>LTV %</th><th>ROI %</th><th>Max tenure</th><th>Max loan</th></tr></thead><tbody>${(sc.bands || []).map(b => `<tr><th>${esc(b.from)}–${esc(b.to)}</th>${['ltv', 'roi', 'tenure', 'maxLoan'].map(k => `<td class="${b === q.band ? 'hit' : ''}">${esc(b[k] === '' || b[k] == null ? '—' : b[k])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>${sc.notes ? `<div class="hint">${esc(sc.notes)}</div>` : ''}` : '';
      };
      $$('input,select', body).forEach(el => { el.oninput = calc; el.onchange = calc; });
      calc();
    });
  }

  const VEHICLE_FIELDS = [
    { k: 'name', label: 'Model name', required: true, ph: 'e.g. Maruti Suzuki Swift VXi' },
    { k: 'scheme', label: 'Scheme', type: 'select', options: () => S.schemes.map(sc => [sc.name, sc.name]) },
    { k: 'price', label: 'New price / base value (₹)', ph: 'e.g. 700000' },
    { k: 'yearValues', label: 'Year-wise valuation (optional)', type: 'textarea', ph: '2024=560000, 2023=510000, 2022=470000', hint: 'If a year is listed here that value is used; otherwise new price × scheme value % for the age.' },
    { k: 'keywords', label: 'Other names / keywords', ph: 'e.g. swift dzire hatchback' },
  ];
  const editVehicle = v => formSheet(v ? 'Edit model' : 'New vehicle model', VEHICLE_FIELDS, v || { scheme: (S.schemes[0] || {}).name || '' },
    d => { delete d.sample; return DB.put('vehicles', d); }, v ? () => DB.del('vehicles', v.id) : null);

  function openVehicleList() {
    openSheet('Vehicle models', body => {
      body.innerHTML = `<input class="input" id="vf" placeholder="Filter models" style="margin:0 0 8px">
        <div id="vl"></div>
        <div class="section-title">Bulk add from Excel</div>
        <div class="hint">Copy from Excel and paste. First row = headings: <b>Model, Scheme, Price</b>, then optional year columns (e.g. 2024, 2023, 2022) with the valuation for that year.</div>
        <textarea class="input" id="vPaste" placeholder="Model&#9;Scheme&#9;Price&#9;2024&#9;2023"></textarea>
        <button class="btn secondary small" id="vImport" style="margin-top:6px">Import pasted models</button>`;
      const draw = () => {
        const f = $('#vf', body).value.trim().toLowerCase();
        const list = S.vehicles.filter(v => !f || (v.name + ' ' + (v.keywords || '')).toLowerCase().includes(f));
        $('#vl', body).innerHTML = list.slice(0, 300).map(v => `<div class="card tap" data-open="vehicle" data-id="${v.id}"><div class="row"><h3 class="ellip">${esc(v.name)}</h3><span class="badge">${esc(v.scheme || '?')}</span></div><div class="meta">${v.price ? fmtINR(num(v.price)) : 'no price'}${v.yearValues ? ' · year-wise values' : ''}${v.sample ? ' · SAMPLE' : ''}</div></div>`).join('') || '<div class="meta">No models.</div>';
      };
      $('#vf', body).oninput = draw; draw();
      $('#vImport', body).onclick = async () => {
        const lines = $('#vPaste', body).value.replace(/\r/g, '').split('\n').filter(l => l.trim());
        if (lines.length < 2) { toast('Paste a heading row and at least one model'); return; }
        const sep = lines[0].includes('\t') ? '\t' : (lines[0].includes(';') ? ';' : ',');
        const head = lines[0].split(sep).map(h => h.trim().toLowerCase());
        const iName = head.findIndex(h => /model|vehicle|name/.test(h));
        const iSch = head.findIndex(h => /scheme|category|segment|type/.test(h));
        const iPrice = head.findIndex(h => /price|value|cost|ex.?showroom/.test(h) && !/^\d{4}$/.test(h));
        const yearCols = head.map((h, i) => /^(19|20)\d\d$/.test(h) ? i : -1).filter(i => i >= 0);
        if (iName < 0) { toast('Need a “Model” column'); return; }
        let n = 0;
        for (const l of lines.slice(1)) {
          const c = l.split(sep).map(x => x.trim());
          if (!c[iName]) continue;
          const o = { name: c[iName], scheme: iSch >= 0 ? c[iSch] : '', price: iPrice >= 0 ? String(num(c[iPrice]) || '') : '', yearValues: yearCols.filter(i => isFinite(num(c[i]))).map(i => `${head[i]}=${num(c[i])}`).join(', ') };
          const sc = S.schemes.find(x => x.name.toLowerCase() === (o.scheme || '').toLowerCase());
          if (sc) o.scheme = sc.name;
          const ex = S.vehicles.find(v => v.name.toLowerCase() === o.name.toLowerCase());
          await DB.put('vehicles', ex ? { ...ex, ...o, sample: false } : o); n++;
        }
        await loadAll(); draw(); renderTab(); toast(`${n} models imported`);
      };
    });
  }

  function editScheme(sc0) {
    const isNew = !sc0;
    const d = sc0 ? JSON.parse(JSON.stringify(sc0)) : { name: '', productId: '', maxAge: '', valuePct: '', notes: '', bands: [{ from: 0, to: 3, ltv: '', roi: '', tenure: '', maxLoan: '' }] };
    openSheet(isNew ? 'New vehicle scheme' : 'Edit scheme', (body, actions) => {
      const read = () => {
        ['name', 'productId', 'maxAge', 'valuePct', 'notes'].forEach(k => { d[k] = $(`[data-s="${k}"]`, body).value.trim(); });
        $$('[data-b]', body).forEach(el => { d.bands[+el.dataset.i][el.dataset.b] = el.value.trim(); });
      };
      const draw = () => {
        body.innerHTML = `${d.sample ? '<div class="notice">SAMPLE scheme – replace with your real policy.</div>' : ''}
          <label class="f">Scheme name</label><input class="input" data-s="name" value="${esc(d.name)}" placeholder="e.g. Car / Commercial Vehicle">
          <label class="f">Product</label><select class="input" data-s="productId">${productOptions().map(o => `<option value="${esc(o[0])}" ${o[0] === d.productId ? 'selected' : ''}>${esc(o[1])}</option>`).join('')}</select>
          <div class="two"><div><label class="f">Max vehicle age at loan end (yrs)</label><input class="input" data-s="maxAge" inputmode="numeric" value="${esc(d.maxAge)}"></div>
          <div><label class="f">Value % of new price by age 0,1,2…</label><input class="input" data-s="valuePct" value="${esc(d.valuePct)}" placeholder="90,80,70,62,55"></div></div>
          <div class="section-title">Age bands</div>
          <div class="grid-wrap"><table class="ltv"><thead><tr><th>Age from</th><th>Age to</th><th>Product</th><th>LTV %</th><th>ROI %</th><th>Max tenure (m)</th><th>Max loan ₹</th></tr></thead><tbody>
          ${d.bands.map((b, i) => `<tr>${['from', 'to', 'productId', 'ltv', 'roi', 'tenure', 'maxLoan'].map(k => k === 'productId'
            ? `<td style="padding:2px"><select class="input" style="margin:0;min-width:130px;padding:6px" data-b="productId" data-i="${i}">${productOptions().map(o => `<option value="${esc(o[0])}" ${o[0] === (b.productId || '') ? 'selected' : ''}>${esc(o[0] ? o[1] : '(scheme product)')}</option>`).join('')}</select></td>`
            : `<td style="padding:2px"><input class="input" style="margin:0;min-width:70px;padding:6px" inputmode="decimal" data-b="${k}" data-i="${i}" value="${esc(b[k] == null ? '' : b[k])}"></td>`).join('')}</tr>`).join('')}
          </tbody></table></div>
          <div class="btn-row"><button class="btn secondary small" id="bAdd">+ Band</button><button class="btn secondary small" id="bDel">− Last band</button></div>
          <label class="f">Notes</label><textarea class="input" data-s="notes">${esc(d.notes || '')}</textarea>
          <div class="btn-row" style="margin-top:14px"><button class="btn block" id="scSave">Save scheme</button></div>
          ${!isNew ? '<div class="btn-row"><button class="btn danger block" id="scDel">Delete scheme</button></div>' : ''}`;
        $('#bAdd', body).onclick = () => { read(); const last = d.bands[d.bands.length - 1] || {}; d.bands.push({ from: isFinite(num(last.to)) ? num(last.to) + 1 : '', to: '', ltv: '', roi: '', tenure: '', maxLoan: '' }); draw(); };
        $('#bDel', body).onclick = () => { read(); if (d.bands.length > 1) d.bands.pop(); draw(); };
        $('#scSave', body).onclick = async () => {
          read();
          if (!d.name) { toast('Enter scheme name'); return; }
          const oldName = sc0 && sc0.name;
          delete d.sample;
          await DB.put('schemes', d);
          if (oldName && oldName !== d.name) for (const v of S.vehicles.filter(v => v.scheme === oldName)) await DB.put('vehicles', { ...v, scheme: d.name });
          await loadAll(); closeSheet(); renderTab(); toast('Scheme saved');
        };
        if (!isNew) $('#scDel', body).onclick = async () => { if (!confirm('Delete this scheme?')) return; await DB.del('schemes', d.id); await loadAll(); closeSheet(); renderTab(); toast('Deleted'); };
      };
      draw();
      actionBtn(actions, ICON.save, 'Save', () => $('#scSave', body).click());
    });
  }

  // ---------- PAST LOAN CASES (learning) ----------
  const CASE_DECISIONS = [['Approved', '✅ Approved'], ['Approved with conditions', '⚠️ Approved with conditions'], ['Rejected', '❌ Rejected']];
  const CASE_FIELDS = [
    { k: 'customer', label: 'Customer name', required: true, ph: 'e.g. Ramesh Kumar' },
    { k: 'date', label: 'Date', inputType: 'date' },
    { k: 'caseNo', label: 'Application / loan no. (optional)' },
    { k: 'productId', label: 'Product', type: 'select', options: productOptions },
    { k: 'vehicle', label: 'Vehicle / asset (optional)', ph: 'e.g. Tata LPT 1109, 2019 model', list: () => S.vehicles.map(v => v.name) },
    { k: 'situation', label: 'Situation / customer profile', type: 'textarea', required: true, ph: 'e.g. FTU, no property proof, rented house, CIBIL 690, guarantor brother with own house' },
    { k: 'decision', label: 'Decision taken', type: 'select', options: () => CASE_DECISIONS },
    { k: 'reason', label: 'Reason / conditions', type: 'textarea', ph: 'e.g. Approved at 70% LTV with guarantor property proof, ROI +1%' },
    { k: 'amount', label: 'Loan amount (₹)', inputmode: 'decimal' },
    { k: 'roi', label: 'ROI %', inputmode: 'decimal' },
    { k: 'tenure', label: 'Tenure (months)', inputmode: 'numeric' },
    { k: 'ltv', label: 'LTV %', inputmode: 'decimal' },
    { k: 'tags', label: 'Keywords (optional)', ph: 'extra words to find this case' },
  ];
  const CASE_CLS = { Approved: 'v-YES', Rejected: 'v-NO', 'Approved with conditions': 'v-COND' };
  const CASE_ICON = { Approved: '✅', Rejected: '❌', 'Approved with conditions': '⚠️' };
  function fmtDate(d) { if (!d) return ''; const x = new Date(d); return isNaN(x) ? d : x.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  function caseLine(c, terms, asCard) {
    const h = t => terms ? Search.highlight(t || '', terms) : esc(t || '');
    const facts = [c.amount ? fmtINR(num(c.amount)) : '', c.roi ? c.roi + '%' : '', c.tenure ? c.tenure + ' m' : '', c.ltv ? 'LTV ' + c.ltv + '%' : ''].filter(Boolean).join(' · ');
    const inner = `<div class="row"><b class="ellip">${h(c.customer)}</b><b class="${CASE_CLS[c.decision] || ''}" style="white-space:nowrap">${CASE_ICON[c.decision] || ''} ${esc(c.decision || '')}</b></div>
      <div class="meta">${esc([fmtDate(c.date), productName(c.productId), c.vehicle].filter(Boolean).join(' · '))}</div>
      <div class="snip">${h(Search.snippet(c.situation || '', terms || [], 160))}</div>
      ${c.reason ? `<div class="meta" style="margin-top:2px">→ ${h(Search.snippet(c.reason, terms || [], 140))}</div>` : ''}
      ${facts ? `<div class="meta">${esc(facts)}</div>` : ''}`;
    return asCard ? `<div class="card tap" data-open="case" data-id="${c.id}"><span class="badge" style="float:right;margin-left:6px">Past case</span>${inner}</div>`
      : `<div class="ev tap" data-open="case" data-id="${c.id}">${inner}</div>`;
  }
  const editCase = (c, prefill) => formSheet(c ? 'Edit past case' : 'New past case', CASE_FIELDS, c || { decision: 'Approved', ...(prefill || {}) },
    d => { if (!d.decision) d.decision = 'Approved'; return DB.put('cases', d); }, c ? () => DB.del('cases', c.id) : null);

  function openCase(c0) {
    openSheet('Past case', (body, actions, setTitle) => {
      const c = S.cases.find(x => x.id === c0.id);
      if (!c) { closeSheet(); return; }
      stack[stack.length - 1].isDetail = true;
      setTitle(c.customer || 'Past case');
      actionBtn(actions, ICON.edit, 'Edit', () => editCase(c));
      const rows = CASE_FIELDS.filter(f => c[f.k] && f.k !== 'customer').map(f => `<tr><td>${esc(f.label)}</td><td class="pre">${esc(f.k === 'productId' ? productName(c.productId) : f.k === 'date' ? fmtDate(c.date) : c[f.k])}</td></tr>`).join('');
      const sim = QA.similarCases(c.situation + ' ' + (c.vehicle || '') + ' ' + productName(c.productId), { ...S, cases: S.cases.filter(x => x.id !== c.id) });
      body.innerHTML = `<div class="answer ${CASE_CLS[c.decision] || ''}" style="padding:10px 14px"><div class="verdict" style="font-size:20px">${CASE_ICON[c.decision] || ''} ${esc(c.decision || '')}</div><div class="vsub">${esc(c.customer)}</div></div>
        <div class="card"><table class="detail-table">${rows}</table></div>
        ${sim ? `<div class="section-title">Similar past cases <span>${sim.total}</span></div>${sim.list.map(x => caseLine(x.c, null, true)).join('')}` : ''}`;
    });
  }

  function openCaseList() {
    openSheet('Past loan cases', body => {
      body.innerHTML = `<input class="input" id="cf" placeholder="Search name, vehicle, situation…" style="margin:0 0 8px">
        <div class="chips" id="cdec" style="padding-top:0;margin-bottom:6px">${['All', 'Approved', 'Approved with conditions', 'Rejected'].map((d, i) => `<button class="chip ${i ? '' : 'on'}" data-d="${i ? d : ''}">${i ? CASE_ICON[d] + ' ' : ''}${d}</button>`).join('')}</div>
        <div id="cl"></div>
        <div class="section-title">Bulk add from Excel</div>
        <div class="hint">Copy rows from Excel and paste. First row = headings, e.g. <b>Customer, Date, Product, Vehicle, Situation, Decision, Reason, Amount, ROI, Tenure, LTV</b>. Decision: Approved / Rejected / Conditional.</div>
        <textarea class="input" id="cPaste" placeholder="Customer&#9;Date&#9;Product&#9;Vehicle&#9;Situation&#9;Decision&#9;Reason"></textarea>
        <button class="btn secondary small" id="cImport" style="margin-top:6px">Import pasted cases</button>
        <div class="btn-row" style="margin-top:12px"><button class="btn small" id="cAdd">+ Add past case</button></div>`;
      let dec = '';
      const draw = () => {
        const q = $('#cf', body).value.trim();
        const terms = q ? Search.queryTerms(q) : null;
        let list = S.cases.filter(c => !dec || c.decision === dec);
        if (terms) list = list.map(c => ({ c, r: Search.scoreItem(terms, [{ text: c.customer, w: 5 }, { text: c.situation, w: 3 }, { text: c.vehicle, w: 3 }, { text: productName(c.productId), w: 2 }, { text: c.reason, w: 1 }, { text: c.caseNo, w: 4 }, { text: c.tags, w: 2 }]) })).filter(x => x.r.score > 0.4).sort((a, b) => b.r.score - a.r.score).map(x => x.c);
        $('#cl', body).innerHTML = list.slice(0, 300).map(c => caseLine(c, terms, true)).join('') || '<div class="meta" style="padding:6px">No cases yet.</div>';
      };
      $('#cf', body).oninput = debounce(draw, 120);
      $('#cdec', body).onclick = e => { const b = e.target.closest('.chip'); if (!b) return; dec = b.dataset.d; $$('.chip', $('#cdec', body)).forEach(x => x.classList.toggle('on', x === b)); draw(); };
      $('#cAdd', body).onclick = () => editCase(null, { date: new Date().toISOString().slice(0, 10) });
      $('#cImport', body).onclick = async () => {
        const lines = $('#cPaste', body).value.replace(/\r/g, '').split('\n').filter(l => l.trim());
        if (lines.length < 2) { toast('Paste a heading row and at least one case'); return; }
        const sep = lines[0].includes('\t') ? '\t' : (lines[0].includes(';') ? ';' : ',');
        const head = lines[0].split(sep).map(h => h.trim().toLowerCase());
        const col = re => head.findIndex(h => re.test(h));
        const ix = {
          customer: col(/customer|name|applicant|borrower/), date: col(/date/), caseNo: col(/app|loan\s*no|case\s*no|lan|number/), product: col(/product|scheme/),
          vehicle: col(/vehicle|model|asset/), situation: col(/situation|profile|case\s*detail|remark|details|observation/), decision: col(/decision|status|result|outcome/),
          reason: col(/reason|condition|comment|note/), amount: col(/amount|loan\s*amt|sanction/), roi: col(/roi|rate|interest/), tenure: col(/tenure|tenor|months/), ltv: col(/ltv/)
        };
        if (ix.customer < 0 || ix.situation < 0) { toast('Need “Customer” and “Situation” columns'); return; }
        const normDec = v => { v = (v || '').toLowerCase(); if (/rej|decl|^no\b|not/.test(v)) return 'Rejected'; if (/cond|deviat|with/.test(v)) return 'Approved with conditions'; return v ? 'Approved' : ''; };
        const normDate = v => { if (!v) return ''; const m = v.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/); if (m) { const y = m[3].length === 2 ? '20' + m[3] : m[3]; return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; } return v; };
        let n = 0;
        for (const l of lines.slice(1)) {
          const c = l.split(sep).map(x => x.trim());
          const g = k => ix[k] >= 0 ? (c[ix[k]] || '') : '';
          if (!g('customer') && !g('situation')) continue;
          const prodTxt = g('product').toLowerCase();
          const prod = prodTxt ? S.products.find(p => p.name.toLowerCase() === prodTxt || p.name.toLowerCase().includes(prodTxt) || prodTxt.includes(p.name.toLowerCase().replace(/\s+loan$/, ''))) : null;
          await DB.put('cases', {
            customer: g('customer'), date: normDate(g('date')), caseNo: g('caseNo'), productId: prod ? prod.id : '', vehicle: g('vehicle'),
            situation: g('situation') + (prodTxt && !prod ? ` (${g('product')})` : ''), decision: normDec(g('decision')) || 'Approved', reason: g('reason'),
            amount: g('amount'), roi: g('roi'), tenure: g('tenure'), ltv: g('ltv')
          });
          n++;
        }
        await loadAll(); draw(); renderTab(); toast(`${n} cases imported`);
      };
      draw();
    });
  }

  // ---------- start ----------
  loadAll().then(() => renderTab()).catch(e => { view.innerHTML = emptyBox('Storage error: ' + esc(e.message)); });
})();
