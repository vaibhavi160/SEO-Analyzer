'use strict';

/* ─── State ─── */
let sites = [];
let donutChart, radarChart, contentChart, barChart, compareChart;
let allChecks = [];
let currentFilter = 'all';

/* ─── Label Map ─── */
const LABELS = {
  url:'URL', title:'Title Tag', titleLength:'Title Length',
  metaDescriptionLength:'Meta Desc Length', metaKeywords:'Keywords Tag',
  metaRobots:'Robots Meta', canonical:'Canonical URL', favicon:'Favicon',
  h1Count:'H1 Tags', h2Count:'H2 Tags', h3Count:'H3 Tags', h4Count:'H4 Tags',
  h1Text:'H1 Text Preview', wordCount:'Word Count', paragraphCount:'Paragraphs',
  textHTMLRatio:'Text/HTML %', strongTags:'Bold Tags', lists:'Lists',
  blockquotes:'Blockquotes', totalLinks:'Total Links', internalLinks:'Internal Links',
  externalLinks:'External Links', nofollowLinks:'Nofollow Links', brokenAnchors:'Empty Anchors',
  totalImages:'Total Images', imagesWithoutAlt:'Missing Alt Text',
  largeImages:'Large Images', altCoverage:'Alt Coverage',
  isHTTPS:'HTTPS', viewport:'Viewport Tag', htmlLang:'HTML Lang',
  amp:'AMP Version', hasCharset:'Charset Tag', robotsTxt:'robots.txt',
  sitemap:'sitemap.xml', htmlSizeKB:'HTML Size', scriptCount:'Script Tags',
  externalScripts:'External Scripts', cssFiles:'CSS Files',
  inlineStyles:'Inline Styles', loadTimeMs:'Load Time',
  forms:'Forms', tables:'Tables', videos:'Videos/iFrames',
  openGraph:'Open Graph Tags', twitterCards:'Twitter Cards',
  socialMeta:'Social Meta Total', structuredData:'Structured Data',
  headingStructure:'Heading Hierarchy', hasSkipLink:'Skip Link',
  labelCoverage:'Input Label %', avgWordsPerParagraph:'Avg Words/Para',
  longParagraphs:'Long Paragraphs', score:'SEO Score',
  checksPassed:'Checks Passed', checksTotal:'Total Checks',
};

/* ─── Colour helpers ─── */
function scoreColor(s) {
  if (s >= 80) return '#10b981';
  if (s >= 50) return '#f59e0b';
  return '#ef4444';
}
function valClass(key, val) {
  const good = ['isHTTPS','viewport','hasCharset','htmlLang','robotsTxt','sitemap',
    'amp','headingStructure','hasSkipLink','canonical','favicon','readabilityHint'];
  const badZero = ['wordCount','internalLinks','externalLinks','h1Count',
    'openGraph','twitterCards','structuredData'];
  if (good.includes(key)) return (val === true || val === 'true') ? 'good' : 'bad';
  if (['imagesWithoutAlt','brokenAnchors','longParagraphs'].includes(key))
    return Number(val) > 0 ? 'bad' : 'good';
  if (badZero.includes(key)) return Number(val) > 0 ? 'good' : 'bad';
  if (key === 'score') { if (val >= 80) return 'good'; if (val >= 50) return 'warn'; return 'bad'; }
  return 'neutral';
}
function fmt(key, val) {
  if (typeof val === 'boolean') return val ? '✓ Yes' : '✗ No';
  if (val === '' || val == null) return '—';
  if (key === 'loadTimeMs') return val + ' ms';
  if (key === 'htmlSizeKB') return val + ' KB';
  if (['altCoverage','textHTMLRatio','labelCoverage'].includes(key)) return val + '%';
  if (typeof val === 'string' && val.length > 48) return val.slice(0,46) + '…';
  return val;
}

/* ─── Analyse ─── */
async function analyze() {
  const url = document.getElementById('urlInput').value.trim();
  if (!url) return;
  const btn = document.getElementById('analyzeBtn');
  const errEl = document.getElementById('errorMsg');
  const errTxt = document.getElementById('errText');

  errEl.style.display = 'none';
  btn.disabled = true;
  document.getElementById('btnLabel').textContent = 'Analyzing…';
  document.getElementById('results').style.display = 'none';
  document.getElementById('loadingState').style.display = 'flex';

  /* Animated loader steps */
  const steps = ['Crawl','Meta','Content','Technical','Score'];
  let si = 0;
  const stepMsgs = ['Crawling site…','Reading metadata…','Analysing content…','Running technical checks…','Calculating score…'];
  const stepTimer = setInterval(() => {
    if (si > 0) document.getElementById('ls'+(si-1))?.classList.remove('active');
    if (si < steps.length) {
      document.getElementById('ls'+si)?.classList.add('active');
      document.getElementById('loadingStep').textContent = stepMsgs[si];
    }
    si++;
    if (si >= steps.length) clearInterval(stepTimer);
  }, 900);

  try {
    const res = await fetch('/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    const data = await res.json();
    clearInterval(stepTimer);
    document.getElementById('loadingState').style.display = 'none';

    if (data.error) {
      errTxt.textContent = data.error;
      errEl.style.display = 'flex';
    } else {
      renderAll(data);
      sites.push(data);
      renderCompare();
    }
  } catch(e) {
    clearInterval(stepTimer);
    document.getElementById('loadingState').style.display = 'none';
    errTxt.textContent = 'Network error — is the server running?';
    errEl.style.display = 'flex';
  }

  btn.disabled = false;
  document.getElementById('btnLabel').textContent = 'Analyze';
}

/* ─── Render all ─── */
function renderAll(data) {
  document.getElementById('results').style.display = 'block';
  document.getElementById('resultsUrl').textContent = data.url;
  renderScore(data);
  renderCats(data);
  renderFeatures(data);
  buildChecks(data);
  renderCharts(data);
  renderSuggestions(data);
  document.getElementById('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ─── Score ─── */
function renderScore(data) {
  const s = data.score;
  const col = scoreColor(s);
  document.getElementById('scoreNum').textContent = s;
  document.getElementById('scoreNum').style.color = col;
  const grade = s >= 80 ? 'Excellent' : s >= 65 ? 'Good' : s >= 45 ? 'Needs Work' : 'Poor';
  document.getElementById('scoreGrade').textContent = grade;
  document.getElementById('scoreGrade').style.color = col;
  document.getElementById('scoreDesc').textContent = `${data.checksPassed} of ${data.checksTotal} checks passed`;
  document.getElementById('passCount').textContent = `${data.checksPassed} passed`;
  document.getElementById('failCount').textContent = `${data.checksTotal - data.checksPassed} failed`;

  if (donutChart) donutChart.destroy();
  donutChart = new Chart(document.getElementById('scoreDonut'), {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [s, 100 - s],
        backgroundColor: [col, 'rgba(255,255,255,0.05)'],
        borderWidth: 0,
      }],
    },
    options: {
      cutout: '76%',
      animation: { duration: 1000, easing: 'easeOutQuart' },
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
    },
  });
}

/* ─── Categories ─── */
function renderCats(data) {
  const grid = document.getElementById('categoryGrid');
  grid.innerHTML = '';
  Object.entries(data.categoryScores || {}).forEach(([cat, pct]) => {
    const col = scoreColor(pct);
    grid.innerHTML += `
      <div class="cat-card">
        <div class="cat-name">${cat}</div>
        <div class="cat-pct" style="color:${col}">${pct}<span style="font-size:0.65rem;color:var(--muted);font-weight:500">%</span></div>
        <div class="cat-bar"><div class="cat-bar-fill" style="width:${pct}%;background:${col}"></div></div>
      </div>`;
  });
}

/* ─── Features ─── */
function renderFeatures(data) {
  const grid = document.getElementById('featureGrid');
  grid.innerHTML = '';
  const skip = ['suggestions','categoryScores','metaDescription','metaKeywords','metaRobots','readabilityHint'];
  Object.entries(data).forEach(([k, v]) => {
    if (skip.includes(k) || typeof v === 'object') return;
    const label = LABELS[k] || k;
    const cls = valClass(k, v);
    grid.innerHTML += `
      <div class="feat-card">
        <div class="feat-title">${label}</div>
        <div class="feat-val ${cls}">${fmt(k, v)}</div>
      </div>`;
  });
}

/* ─── Checks ─── */
function buildChecks(data) {
  allChecks = [
    { pass: !!data.title,                                   msg: 'Title tag present',                         cat: 'Metadata' },
    { pass: data.titleLength >= 30 && data.titleLength <= 60, msg: `Title length ${data.titleLength} chars (30–60)`, cat: 'Metadata' },
    { pass: data.metaDescriptionLength >= 120 && data.metaDescriptionLength <= 160, msg: `Meta desc ${data.metaDescriptionLength} chars (120–160)`, cat: 'Metadata' },
    { pass: !!data.canonical,                               msg: 'Canonical tag present',                     cat: 'Metadata' },
    { pass: !!data.favicon,                                 msg: 'Favicon present',                           cat: 'Metadata' },
    { pass: data.hasCharset,                                msg: 'Charset meta tag present',                  cat: 'Technical' },
    { pass: data.viewport,                                  msg: 'Viewport tag present',                      cat: 'Technical' },
    { pass: data.isHTTPS,                                   msg: 'HTTPS enabled',                             cat: 'Technical' },
    { pass: !!data.htmlLang,                                msg: `HTML lang="${data.htmlLang || 'missing'}"`,  cat: 'Technical' },
    { pass: data.robotsTxt,                                 msg: 'robots.txt accessible',                     cat: 'Technical' },
    { pass: data.sitemap,                                   msg: 'sitemap.xml accessible',                    cat: 'Technical' },
    { pass: data.h1Count === 1,                             msg: `H1 count: ${data.h1Count} (exactly 1)`,    cat: 'Content' },
    { pass: data.h2Count > 0,                              msg: `H2 headings found: ${data.h2Count}`,        cat: 'Content' },
    { pass: data.wordCount >= 300,                          msg: `Word count: ${data.wordCount} (min 300)`,   cat: 'Content' },
    { pass: parseFloat(data.textHTMLRatio) > 10,            msg: `Text/HTML ratio: ${data.textHTMLRatio}%`,   cat: 'Content' },
    { pass: data.longParagraphs === 0,                      msg: `Long paragraphs: ${data.longParagraphs}`,   cat: 'Content' },
    { pass: data.imagesWithoutAlt === 0,                    msg: `Missing alt text: ${data.imagesWithoutAlt} images`, cat: 'Images' },
    { pass: data.internalLinks >= 3,                        msg: `Internal links: ${data.internalLinks} (min 3)`, cat: 'Links' },
    { pass: data.externalLinks >= 1,                        msg: `External links: ${data.externalLinks} (min 1)`, cat: 'Links' },
    { pass: data.brokenAnchors === 0,                       msg: `Placeholder anchors (#): ${data.brokenAnchors}`, cat: 'Links' },
    { pass: data.openGraph >= 4,                            msg: `Open Graph tags: ${data.openGraph} (min 4)`, cat: 'Social' },
    { pass: data.twitterCards >= 2,                         msg: `Twitter Card tags: ${data.twitterCards} (min 2)`, cat: 'Social' },
    { pass: data.structuredData > 0,                        msg: `Structured data blocks: ${data.structuredData}`, cat: 'Structure' },
    { pass: parseFloat(data.htmlSizeKB) < 200,             msg: `HTML size: ${data.htmlSizeKB} KB (max 200)`, cat: 'Performance' },
    { pass: data.loadTimeMs < 3000,                         msg: `Load time: ${data.loadTimeMs}ms (max 3000)`, cat: 'Performance' },
    { pass: data.externalScripts <= 10,                     msg: `External scripts: ${data.externalScripts} (max 10)`, cat: 'Performance' },
    { pass: data.hasSkipLink,                               msg: 'Skip navigation link present',              cat: 'Accessibility' },
    { pass: data.headingStructure,                          msg: 'Proper H1 → H2 heading hierarchy',          cat: 'Accessibility' },
  ];
  renderChecksList('all');
}

function renderChecksList(filter) {
  const list = document.getElementById('checksList');
  const filtered = allChecks.filter(c => filter === 'all' ? true : filter === 'pass' ? c.pass : !c.pass);
  document.getElementById('checksCount').textContent = `${filtered.length} checks`;
  list.innerHTML = filtered.map(c => `
    <div class="chk-item">
      <span class="chk-ico">${c.pass ? '✅' : '❌'}</span>
      <div class="chk-body">
        <div class="chk-msg">${c.msg}</div>
        <div class="chk-cat">${c.cat}</div>
      </div>
      <span class="chk-status" style="color:${c.pass ? '#34d399' : '#fca5a5'}">${c.pass ? 'PASS' : 'FAIL'}</span>
    </div>`).join('');
}

function filterChecks(btn, filter) {
  currentFilter = filter;
  document.querySelectorAll('.chkf').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderChecksList(filter);
}

/* ─── Charts ─── */
function renderCharts(data) {
  if (radarChart) radarChart.destroy();
  if (contentChart) contentChart.destroy();
  if (barChart) barChart.destroy();

  const cats = Object.keys(data.categoryScores || {});
  const catVals = cats.map(c => data.categoryScores[c]);

  radarChart = new Chart(document.getElementById('radarChart'), {
    type: 'radar',
    data: {
      labels: cats,
      datasets: [{
        data: catVals,
        backgroundColor: 'rgba(99,102,241,0.15)',
        borderColor: '#818cf8',
        borderWidth: 2,
        pointBackgroundColor: '#818cf8',
        pointRadius: 4,
        pointHoverRadius: 6,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: {
        r: {
          min: 0, max: 100,
          ticks: { color: '#7b7b99', stepSize: 25, font: { size: 10 }, backdropColor: 'transparent' },
          grid: { color: 'rgba(255,255,255,0.05)' },
          angleLines: { color: 'rgba(255,255,255,0.05)' },
          pointLabels: { color: '#7b7b99', font: { size: 11, family: 'Instrument Sans' } },
        },
      },
      plugins: { legend: { display: false } },
      animation: { duration: 800 },
    },
  });

  contentChart = new Chart(document.getElementById('contentChart'), {
    type: 'doughnut',
    data: {
      labels: ['Internal Links','External Links','Images','Videos','Forms'],
      datasets: [{
        data: [data.internalLinks, data.externalLinks, data.totalImages, data.videos||0, data.forms||0],
        backgroundColor: ['#6366f1','#10b981','#f59e0b','#ef4444','#3b82f6'],
        borderWidth: 0,
        hoverOffset: 6,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#7b7b99', font: { size: 11 }, padding: 14, boxWidth: 10, boxHeight: 10 },
        },
      },
      animation: { duration: 800 },
    },
  });

  const bLabels = ['Words','Paragraphs','H1','H2','H3','Scripts','CSS','Images','Links'];
  const bData   = [data.wordCount, data.paragraphCount, data.h1Count, data.h2Count, data.h3Count,
                   data.scriptCount, data.cssFiles, data.totalImages, data.totalLinks];
  const bColors = ['#818cf8','#a78bfa','#10b981','#34d399','#6ee7b7','#ef4444','#3b82f6','#f59e0b','#10b981'];

  barChart = new Chart(document.getElementById('barChart'), {
    type: 'bar',
    data: {
      labels: bLabels,
      datasets: [{ data: bData, backgroundColor: bColors, borderRadius: 6, borderSkipped: false }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#7b7b99', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
        y: { ticks: { color: '#7b7b99', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
      },
      animation: { duration: 800 },
    },
  });
}

/* ─── Suggestions ─── */
function renderSuggestions(data) {
  const list = document.getElementById('suggestionsList');
  const sugs = data.suggestions || [];
  document.getElementById('sugCount').textContent = sugs.length + (sugs.length === 1 ? ' issue' : ' issues');
  list.innerHTML = sugs.length === 0
    ? `<div class="sug-item" style="border-left-color:#10b981"><span class="sug-msg" style="color:#34d399">✓ No major issues — great work!</span></div>`
    : sugs.map(s => `
        <div class="sug-item">
          <span class="sug-cat">${s.category||'SEO'}</span>
          <span class="sug-msg">${s.msg}</span>
        </div>`).join('');
}

/* ─── Compare ─── */
function renderCompare() {
  const tbody = document.getElementById('compareBody');
  if (!sites.length) {
    tbody.innerHTML = `<tr><td colspan="9" class="ctable-empty">Analyze a site to start comparing</td></tr>`;
    return;
  }
  tbody.innerHTML = sites.map(s => {
    const col = scoreColor(s.score);
    const host = (() => { try { return new URL(s.url).hostname; } catch { return s.url; } })();
    return `<tr>
      <td style="color:var(--ind2);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${s.url}">${host}</td>
      <td style="color:${col};font-weight:700">${s.score}</td>
      <td>${s.wordCount}</td>
      <td>${s.totalImages}</td>
      <td>${s.totalLinks}</td>
      <td style="color:${s.h1Count===1?'#34d399':'#fca5a5'}">${s.h1Count}</td>
      <td style="color:${s.isHTTPS?'#34d399':'#fca5a5'}">${s.isHTTPS?'✓':'✗'}</td>
      <td style="color:${s.sitemap?'#34d399':'#fca5a5'}">${s.sitemap?'✓':'✗'}</td>
      <td>${s.loadTimeMs}ms</td>
    </tr>`;
  }).join('');

  if (compareChart) compareChart.destroy();
  const labels = sites.map(s => { try { return new URL(s.url).hostname; } catch { return s.url; } });
  compareChart = new Chart(document.getElementById('compareChart'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'SEO Score',
        data: sites.map(s => s.score),
        backgroundColor: sites.map(s => scoreColor(s.score)),
        borderRadius: 8, borderSkipped: false,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            afterLabel: ctx => {
              const s = sites[ctx.dataIndex];
              return [`Words: ${s.wordCount}`, `Links: ${s.totalLinks}`, `Load: ${s.loadTimeMs}ms`];
            },
          },
        },
      },
      scales: {
        x: { ticks: { color: '#7b7b99' }, grid: { color: 'rgba(255,255,255,0.04)' } },
        y: { min: 0, max: 100, ticks: { color: '#7b7b99' }, grid: { color: 'rgba(255,255,255,0.04)' } },
      },
    },
  });
}

/* ─── Tabs ─── */
function switchTab(btn, id) {
  document.querySelectorAll('.tb').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tpane').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('tab-' + id).classList.add('active');
}

/* ─── Clear ─── */
function clearAll() {
  sites = [];
  allChecks = [];
  document.getElementById('results').style.display = 'none';
  document.getElementById('urlInput').value = '';
  [donutChart, radarChart, contentChart, barChart, compareChart].forEach(c => c && c.destroy());
  donutChart = radarChart = contentChart = barChart = compareChart = null;
}

/* ─── PDF ─── */
async function downloadPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, H = 297, mg = 18;
  const last = sites[sites.length - 1];
  if (!last) return;

  const C = {
    bg:     [5, 5, 13],
    surf:   [18, 18, 31],
    surf2:  [24, 24, 42],
    text:   [238, 238, 245],
    muted:  [123, 123, 153],
    ind:    [99, 102, 241],
    ind2:   [129, 140, 248],
    grn:    [16, 185, 129],
    red:    [239, 68, 68],
    amb:    [245, 158, 11],
  };
  const sCol = s => s >= 80 ? C.grn : s >= 50 ? C.amb : C.red;

  const fill = (c) => doc.setFillColor(...c);
  const txt  = (c) => doc.setTextColor(...c);
  const font = (s, w='normal') => { doc.setFontSize(s); doc.setFont('helvetica', w); };

  /* Page 1 */
  fill(C.bg); doc.rect(0, 0, W, H, 'F');

  /* Header */
  fill(C.surf); doc.rect(0, 0, W, 42, 'F');
  fill(C.ind); doc.rect(0, 40, W, 2, 'F');

  txt(C.ind2); font(18, 'bold');
  doc.text('PULSERANK', mg, 24);
  txt(C.muted); font(8);
  doc.text('SEO Intelligence Report — 45-Point Audit', mg, 33);
  txt(C.muted); font(8);
  const dateStr = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
  doc.text(dateStr, W - mg, 33, { align: 'right' });

  let y = 55;

  /* URL */
  txt(C.muted); font(8);
  doc.text('ANALYZED URL', mg, y);
  y += 5;
  txt(C.ind2); font(9);
  const urlShort = last.url.length > 72 ? last.url.slice(0, 70) + '…' : last.url;
  doc.text(urlShort, mg, y);
  y += 12;

  /* Score + stats */
  const sc = last.score;
  const scC = sCol(sc);
  fill(C.surf2); doc.roundedRect(mg, y, 46, 32, 4, 4, 'F');
  txt(scC); font(28, 'bold');
  doc.text(String(sc), mg + 23, y + 19, { align: 'center' });
  txt(C.muted); font(7);
  doc.text('/ 100 SEO SCORE', mg + 23, y + 28, { align: 'center' });

  const stats = [
    ['Checks', `${last.checksPassed}/${last.checksTotal}`],
    ['Words', String(last.wordCount)],
    ['Load', last.loadTimeMs + 'ms'],
    ['HTML', last.htmlSizeKB + 'KB'],
  ];
  stats.forEach(([lbl, val], i) => {
    const sx = mg + 54 + i * 34;
    fill(C.surf2); doc.roundedRect(sx, y, 32, 32, 3, 3, 'F');
    txt(C.text); font(12, 'bold');
    doc.text(val, sx + 16, y + 14, { align: 'center' });
    txt(C.muted); font(6.5);
    doc.text(lbl, sx + 16, y + 25, { align: 'center' });
  });
  y += 42;

  /* Category scores */
  txt(C.ind2); font(8, 'bold');
  doc.text('CATEGORY SCORES', mg, y); y += 7;

  const catE = Object.entries(last.categoryScores || {});
  const cw = (W - mg * 2) / 4;
  catE.forEach(([cat, pct], i) => {
    const col = i % 4, row = Math.floor(i / 4);
    const cx = mg + col * cw, cy = y + row * 22;
    const cc = sCol(pct);
    fill(C.surf2); doc.roundedRect(cx, cy, cw - 4, 18, 3, 3, 'F');
    txt(cc); font(13, 'bold');
    doc.text(pct + '%', cx + (cw - 4) / 2, cy + 10, { align: 'center' });
    txt(C.muted); font(6);
    doc.text(cat, cx + (cw - 4) / 2, cy + 16, { align: 'center' });
  });
  y += Math.ceil(catE.length / 4) * 22 + 10;

  /* Checks */
  txt(C.ind2); font(8, 'bold');
  doc.text('SEO CHECKS', mg, y); y += 7;

  const half = Math.ceil(allChecks.length / 2);
  allChecks.forEach((c, i) => {
    const col = i >= half ? 1 : 0;
    const row = i >= half ? i - half : i;
    const cx = mg + col * (W / 2 - mg + 2);
    const cy = y + row * 8;
    if (cy > 265) return;
    txt(c.pass ? C.grn : C.red); font(7, 'bold');
    doc.text(c.pass ? '✓' : '✗', cx, cy + 4);
    txt(C.text); font(7);
    doc.text(c.msg.slice(0, 44), cx + 5, cy + 4);
    txt(C.muted); font(6);
    doc.text(c.cat, cx + 68, cy + 4);
  });
  y += half * 8 + 12;

  /* Action items */
  if (last.suggestions?.length > 0 && y < 240) {
    txt(C.ind2); font(8, 'bold');
    doc.text('ACTION ITEMS', mg, y); y += 8;
    last.suggestions.forEach(s => {
      if (y > 276) return;
      fill(C.surf2); doc.roundedRect(mg, y - 3, W - mg * 2, 9, 2, 2, 'F');
      txt(C.red); font(7, 'bold'); doc.text('!', mg + 3, y + 2.5);
      txt(C.text); font(7); doc.text(s.msg.slice(0, 60), mg + 9, y + 2.5);
      txt(C.ind2); font(6.5); doc.text(s.category, W - mg - 2, y + 2.5, { align: 'right' });
      y += 11;
    });
  }

  /* Comparison page */
  if (sites.length > 1) {
    doc.addPage();
    fill(C.bg); doc.rect(0, 0, W, H, 'F');
    fill(C.surf); doc.rect(0, 0, W, 20, 'F');
    txt(C.ind2); font(13, 'bold');
    doc.text('SITE COMPARISON', mg, 13);
    let ty = 32;

    const headers = ['Website','Score','Words','Links','Images','HTTPS','Sitemap'];
    const colW = [68, 18, 22, 18, 18, 18, 18];
    fill([22,22,38]); doc.rect(mg, ty - 6, W - mg * 2, 10, 'F');
    let tx = mg;
    headers.forEach((h, i) => {
      txt(C.muted); font(7, 'bold');
      doc.text(h, tx + 2, ty); tx += colW[i];
    });
    ty += 8;

    sites.forEach(s => {
      if (ty > 270) return;
      fill([18,18,32]); doc.rect(mg, ty - 5, W - mg * 2, 9, 'F');
      const row = [
        s.url.replace(/https?:\/\//,'').slice(0,40),
        String(s.score), String(s.wordCount), String(s.totalLinks),
        String(s.totalImages), s.isHTTPS ? 'Yes' : 'No', s.sitemap ? 'Yes' : 'No',
      ];
      tx = mg;
      row.forEach((cell, i) => {
        const c = i === 1 ? sCol(parseInt(cell)) : C.text;
        txt(c); font(7, i === 1 ? 'bold' : 'normal');
        doc.text(cell, tx + 2, ty); tx += colW[i];
      });
      ty += 10;
    });
  }

  /* Footer on all pages */
  const total = doc.internal.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    fill(C.surf); doc.rect(0, 285, W, 12, 'F');
    txt(C.muted); font(7);
    doc.text('PulseRank — SEO Intelligence', mg, 292);
    doc.text(`Page ${p} of ${total}`, W - mg, 292, { align: 'right' });
  }

  const domain = (() => { try { return new URL(last.url).hostname; } catch { return 'report'; } })();
  doc.save(`pulserank-${domain}.pdf`);
}

/* ─── Enter key ─── */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('urlInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') analyze();
  });
});