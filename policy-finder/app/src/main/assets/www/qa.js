/*
 * Offline "Can we do it?" answers.
 * Finds the policy lines (from your PDFs, image text, products and saved situations)
 * that match a question and decides NO / YES / CONDITIONAL from the wording of those lines.
 */
const QA = (() => {
  const Q_START = /^\s*(can|could|is|are|does|do|will|would|whether|shall|should|may|kya|allowed|possible|eligible)\b/i;
  const Q_ANY = /\?|\b(can we|can i|is it possible|possible|allowed|eligible|permitted|kya|hoga|chalega|acceptable)\b/i;

  // words that only shape the question, not the topic
  const FILLER = new Set(['need', 'needs', 'needed', 'want', 'wants', 'can', 'could', 'we', 'do', 'does', 'did', 'it', 'applicant', 'customer', 'borrower',
    'client', 'has', 'have', 'had', 'having', 'no', 'not', 'without', 'possible', 'allowed', 'allow', 'eligible', 'permitted', 'acceptable', 'is', 'are', 'was', 'kya', 'hai', 'hoga',
    'chalega', 'but', 'case', 'give', 'take', 'get', 'our', 'us', 'he', 'she', 'they', 'his', 'her', 'their', 'this', 'that', 'there', 'any', 'also', 'please', 'tell',
    'if', 'should', 'would', 'will', 'shall', 'may', 'whether', 'nahi', 'nahin', 'don', 'doesn', 'dont', 'doesnt', 'lack', 'lacks', 'missing', 'proceed', 'process', 'approve', 'sanction',
    'done', 'go', 'ahead', 'yes', 'ok', 'okay', 'policy', 'per', 'as', 'so', 'then', 'only', 'one', 'some', 'like', 'name', 'own']);

  const NEG = /\b(not|never|cannot|can ?not|shall not|will not|won'?t)\s+(be\s+)?(allowed|permitted|eligible|acceptable|accepted|considered|funded|financed|entertained|done|sanctioned|approved|booked)\b|\bnot\s+to\s+be\s+\w+|\bineligible\b|\b(prohibited|restricted|barred|negative\s+(profile|list|area)|not\s+eligible|rejected?|declined?)\b|\bno\s+(loan|funding|finance|case)s?\s+(will|shall|to|can)\b/i;
  const REQ = /\b(mandatory|compulsory|must|required|requirement|essential|necessary|is\s+a\s+must|needs?\s+to\s+be|has\s+to\s+be|have\s+to\s+be|should\s+(have|be|submit|provide)|shall\s+(be|have|submit|provide)|to\s+be\s+(obtained|collected|taken|submitted|verified))\b/i;
  const WAIVE = /\b(not\s+(mandatory|compulsory|required|necessary|needed)|waived?|waiver|optional|exempt(ed)?|relaxation|relaxed|in\s+lieu\s+of|alternatively|or\s+any\s+one\s+of|either|no\s+(\w+\s+)?(cut-?off|check|requirement|bar))\b/i;

  // numeric limits: "70 year old" vs "age 21–58", "cibil 620" vs "CIBIL 700+"
  const METRICS = [
    { key: 'age', word: /\bage\b|\byears?\s+old\b/i, not: /\b(vehicle|asset|car|machine|equipment|property|building)\s+age\b|\bage\s+of\s+(the\s+)?(vehicle|asset|car|machine|property)\b/i,
      q: [/(\d{2})\s*(?:years?|yrs?)\s*old/i, /\bage\s*(?:is|of|=)?\s*(\d{2})\b/i, /(\d{2})\s*(?:yrs?|years?)\s*(?:age|aged)/i] },
    { key: 'cibil', word: /\b(cibil|bureau|credit\s+score|score)\b/i,
      q: [/(?:cibil|score|bureau)\D{0,12}(\d{3})\b/i, /\b(\d{3})\s*(?:cibil|score)/i] },
  ];
  function qMetrics(q) {
    const out = [];
    METRICS.forEach(m => { for (const re of m.q) { const x = q.match(re); if (x) { out.push({ m, n: +x[1] }); break; } } });
    return out;
  }
  function limitIn(text) {
    const t = text.replace(/,/g, '');
    let r = t.match(/(\d{2,3})\s*(?:–|-|to|and)\s*(\d{2,3})/);
    if (r && +r[2] > +r[1]) return { min: +r[1], max: +r[2], label: `${r[1]}–${r[2]}` };
    r = t.match(/(\d{2,3})\s*(?:\+|and\s+above|or\s+above|&\s*above)/i) || t.match(/(?:minimum|min\.?|at\s+least|above|more\s+than|greater\s+than|>=?|≥)\s*(?:[a-z]+\s+){0,3}?(\d{2,3})/i);
    if (r) return { min: +r[1], max: Infinity, label: `min ${r[1]}` };
    r = t.match(/(?:maximum|max\.?|upto|up\s+to|below|less\s+than|not\s+more\s+than|<=?|≤)\s*(?:[a-z]+\s+){0,3}?(\d{2,3})/i);
    if (r) return { min: -Infinity, max: +r[1], label: `max ${r[1]}` };
    return null;
  }
  const ALLOW = /\b(allowed|permitted|eligible|acceptable|accepted|can\s+be|may\s+be|is\s+possible|will\s+be\s+considered|to\s+be\s+considered|funded|financed)\b/i;
  const COND = /\b(subject\s+to|provided\s+(that)?|only\s+if|only\s+when|only\s+for|upto|up\s+to|maximum|max\.?|minimum|min\.?|with\s+(approval|deviation)|on\s+approval|case\s+to\s+case|deviation|lower\s+ltv|higher\s+roi|additional|co-?applicant|guarantor)\b/i;

  function isQuestion(q) { return Q_START.test(q) || Q_ANY.test(q); }

  function split(text) {
    return String(text || '')
      .replace(/\r/g, '')
      // keep wrapped lines together; break only at blank lines / bullets / numbered points
      .replace(/\n(?!\s*\n)(?!\s*(?:[•\-*▪●]|\(?[0-9ivx]{1,3}[.)]\s|\(?[a-h][.)]\s))/g, ' ')
      .split(/(?<=[.;!?])\s+(?=[A-Z0-9(•\-*"“])|\n+|•|▪|●/)
      .map(s => s.replace(/\s+/g, ' ').trim())
      .filter(s => s.length >= 12 && s.length <= 600);
  }

  /** Build the evidence corpus from app state. */
  function corpus(S) {
    const out = [];
    S.docs.forEach(d => {
      const pages = d.pageTexts && d.pageTexts.length ? d.pageTexts : (d.text ? [d.text] : []);
      pages.forEach((t, i) => split(t).forEach(sn => out.push({ text: sn, kind: 'doc', id: d.id, title: d.title || d.fileName, page: pages.length > 1 || d.type === 'pdf' ? i + 1 : null, productId: d.productId })));
      if (d.notes) split(d.notes).forEach(sn => out.push({ text: sn, kind: 'doc', id: d.id, title: (d.title || d.fileName) + ' (notes)', page: null, productId: d.productId }));
    });
    S.products.forEach(p => ['eligibility', 'notes', 'other'].forEach(k => split(p[k]).forEach(sn => out.push({ text: sn, kind: 'product', id: p.id, title: p.name, field: k, productId: p.id, sample: p.sample }))));
    S.rules.forEach(r => split(r.solution).forEach(sn => out.push({ text: sn, kind: 'rule', id: r.id, title: r.title, productId: r.productId, ruleTitle: r.title, sample: r.sample })));
    return out;
  }

  // words after "no / without / doesn't have …" = the thing the customer is missing
  function lackingTerms(q) {
    const m = q.toLowerCase().match(/\b(?:no|without|not\s+have|not\s+having|doesn'?t\s+have|don'?t\s+have|does\s+not\s+have|do\s+not\s+have|lacks?|missing|nahi\s+hai|nahin\s+hai|not\s+available)\s+((?:[a-z0-9]+\s*){1,3})/);
    if (!m) return [];
    const CANON = { profe: 'proof', prof: 'proof', proff: 'proof', prooff: 'proof', propery: 'property', proprty: 'property', docs: 'documents', licence: 'license' };
    return Search.tokens(m[1]).filter(t => !FILLER.has(t) && !Search.STOP.has(t)).map(t => CANON[t] || t).slice(0, 3);
  }

  function mentions(terms, text) {
    if (!terms.length) return false;
    const r = Search.scoreItem(terms, [{ text, w: 1 }]);
    return r.coverage >= (terms.length > 1 ? 0.5 : 1);
  }

  function judge(sent, lacking, metrics) {
    const t = sent.text;
    for (const { m, n } of metrics) {
      const ctx = t + ' ' + (sent.ruleTitle || '');
      if (!m.word.test(ctx) || (m.not && m.not.test(t))) continue;
      const lim = limitIn(t);
      if (!lim) continue;
      const inside = n >= lim.min && n <= lim.max;
      if (NEG.test(t) || /not\s+allowed|not\s+eligible/i.test(t)) {
        if (inside) return { v: 'NO', why: `${m.key} ${n} falls in the not-allowed range (${lim.label})` };
        continue;
      }
      if (!inside) return { v: 'NO', why: `${m.key} ${n} is outside the limit (${lim.label})` };
      return { v: COND.test(t) ? 'COND' : 'YES', why: `${m.key} ${n} is within the limit (${lim.label})` };
    }
    const neg = NEG.test(t), req = REQ.test(t), waive = WAIVE.test(t), allow = ALLOW.test(t), cond = COND.test(t);
    if (lacking.length && mentions(lacking, t)) {
      if (waive) return { v: cond ? 'COND' : 'YES', why: 'policy gives a waiver / alternative' };
      if (req) return { v: 'NO', why: `${lacking.join(' ')} is required` };
      if (neg) return { v: 'NO', why: 'policy says not allowed' };
      if (allow) return { v: cond ? 'COND' : 'YES', why: 'policy allows it' };
      return null;
    }
    if (neg) return { v: 'NO', why: 'policy says not allowed' };
    if (allow && !lacking.length) return { v: cond ? 'COND' : 'YES', why: cond ? 'allowed with conditions' : 'policy allows it' };
    if (req && !lacking.length) return { v: 'COND', why: 'policy lists requirements' };
    return null;
  }

  /** Main entry: returns null if not a question, else { verdict, reasons:[{sent, v, why}], topic, lacking } */
  function answer(query, S) {
    if (!isQuestion(query)) return null;
    const lacking = lackingTerms(query);
    const topic = Search.queryTerms(query).filter(t => !FILLER.has(t));
    if (!topic.length) return null;

    // which products is the question about? (e.g. "tata 1109" -> commercial vehicle)
    const prodBoost = {};
    S.products.forEach(p => {
      const r = Search.scoreItem(topic, [{ text: p.name, w: 1 }, { text: p.keywords, w: 1 }, { text: p.category, w: 0.5 }]);
      if (r.matched) prodBoost[p.id] = 1 + Math.min(1, r.score);
    });
    (S.vehicles || []).forEach(v => {
      const r = Search.scoreItem(topic, [{ text: v.name, w: 1 }, { text: v.keywords, w: 1 }]);
      if (r.matched) { const sc = (S.schemes || []).find(x => (x.name || '').toLowerCase() === (v.scheme || '').toLowerCase()); if (sc && sc.productId) prodBoost[sc.productId] = Math.max(prodBoost[sc.productId] || 1, 1.8); }
    });

    const metrics = qMetrics(query);
    const targeted = Object.keys(prodBoost);
    // short names that identify each product inside a sentence (e.g. "two wheeler", "pl", "gold")
    const aliases = S.products.map(p => ({ id: p.id, names: [p.name.toLowerCase().replace(/\s+loan$/, ''), ...String(p.keywords || '').toLowerCase().split(/\s+/).filter(w => w.length >= 2 && w.length <= 3 && /^[a-z0-9]+$/.test(w)).slice(0, 2)] }));
    const mentionsProd = text => {
      const low = ' ' + text.toLowerCase().replace(/[^a-z0-9]+/g, ' ') + ' ';
      return aliases.filter(a => a.names.some(nm => nm && low.includes(' ' + nm.replace(/[^a-z0-9]+/g, ' ').trim() + ' '))).map(a => a.id);
    };
    const docRel = {};
    S.docs.forEach(d => { const r = Search.scoreItem(topic, [{ text: (d.title || '') + ' ' + (d.tags || '') + ' ' + String(d.text || '').slice(0, 250), w: 1 }]); docRel[d.id] = r.matched ? 1 + 0.5 * r.coverage : 1; });

    const scored = [];
    corpus(S).forEach(sn => {
      const r = Search.scoreItem(topic, [{ text: sn.text, w: 1 }, { text: sn.ruleTitle || '', w: 1.2 }]);
      if (!r.matched) return;
      let score = r.score;
      if (lacking.length && mentions(lacking, sn.text)) score *= 1.8;
      if (sn.productId && prodBoost[sn.productId]) score *= prodBoost[sn.productId];
      if (sn.kind === 'doc' && docRel[sn.id]) score *= docRel[sn.id];
      if (metrics.some(x => x.m.word.test(sn.text + ' ' + (sn.ruleTitle || '')) && !(x.m.not && x.m.not.test(sn.text)) && limitIn(sn.text))) score *= 2.5;
      if (targeted.length) {
        const mp = mentionsProd(sn.text);
        if (mp.some(id => prodBoost[id])) score *= 1.3;
        else if (mp.length) score *= 0.35;
      }
      if (sn.kind === 'rule') score *= 1.15;
      if (sn.sample) score *= 0.6;
      scored.push({ sn, score, cov: r.coverage });
    });
    scored.sort((a, b) => b.score - a.score);
    const top = scored.filter(x => x.cov >= 0.3 || (lacking.length && mentions(lacking, x.sn.text))).slice(0, 8);
    if (!top.length) return { verdict: 'NOTFOUND', reasons: [], topic, lacking };

    const reasons = [];
    top.forEach(x => { const j = judge(x.sn, lacking, metrics); reasons.push({ ...x, v: j ? j.v : null, why: j ? j.why : '' }); });
    const decisive = reasons.filter(r => r.v).slice(0, 4);
    let verdict = 'UNCLEAR';
    if (decisive.length) {
      const best = decisive[0];
      verdict = best.v;
      const others = new Set(decisive.filter(r => r.score >= best.score * 0.7).map(r => r.v));
      if (others.size > 1) verdict = others.has('NO') && !others.has('YES') ? 'NO' : 'COND';
    }
    // decisive lines first, then the rest, max 5
    const cut = (reasons[0] ? reasons[0].score : 0) * 0.35;
    const ordered = [...decisive, ...reasons.filter(r => !r.v)].filter((r, i) => i < 2 || r.score >= cut).slice(0, 4);
    return { verdict, reasons: ordered, topic, lacking };
  }

  return { answer, isQuestion };
})();
