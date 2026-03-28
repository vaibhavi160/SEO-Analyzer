/* ── State ── */
let sites = [];
let radarChart, contentChart, barChart, compareChart, donutChart;
let allChecksData = [];
let currentFilter = "all";

/* ── Label map for feature cards ── */
const LABELS = {
  url: "URL", title: "Title", titleLength: "Title Length",
  metaDescriptionLength: "Meta Desc Length", metaKeywords: "Keywords Tag",
  metaRobots: "Robots Meta", canonical: "Canonical URL", favicon: "Favicon",
  h1Count: "H1 Count", h2Count: "H2 Count", h3Count: "H3 Count", h4Count: "H4 Count",
  h1Text: "H1 Text",
  wordCount: "Word Count", paragraphCount: "Paragraphs", textHTMLRatio: "Text/HTML %",
  strongTags: "Bold Tags", lists: "Lists", blockquotes: "Blockquotes",
  totalLinks: "Total Links", internalLinks: "Internal Links",
  externalLinks: "External Links", nofollowLinks: "Nofollow Links",
  brokenAnchors: "Placeholder Anchors",
  totalImages: "Total Images", imagesWithoutAlt: "Images No Alt",
  largeImages: "Large Images (>1000px)", altCoverage: "Alt Coverage %",
  isHTTPS: "HTTPS", viewport: "Viewport Tag", htmlLang: "HTML Lang",
  amp: "AMP Version", hasCharset: "Charset Tag",
  robotsTxt: "robots.txt", sitemap: "sitemap.xml",
  htmlSizeKB: "HTML Size (KB)", scriptCount: "Script Tags",
  externalScripts: "External Scripts", cssFiles: "CSS Files",
  inlineStyles: "Inline Styles", loadTimeMs: "Load Time (ms)",
  forms: "Forms", tables: "Tables", videos: "Videos/iFrames",
  openGraph: "Open Graph Tags", twitterCards: "Twitter Cards",
  socialMeta: "Social Meta Total", structuredData: "Structured Data",
  headingStructure: "Good H Structure", hasSkipLink: "Skip Link",
  labelCoverage: "Input Label %", avgWordsPerParagraph: "Avg Words/Para",
  longParagraphs: "Long Paragraphs", score: "SEO Score",
  checksPassed: "Checks Passed", checksTotal: "Total Checks",
};

/* ── Helpers ── */
function scoreColor(s) {
  if (s >= 80) return "#34d399";
  if (s >= 50) return "#fbbf24";
  return "#f87171";
}

function boolColor(v) {
  if (v === true || v === "true") return "good";
  if (v === false || v === "false") return "bad";
  return "neutral";
}

function valueClass(key, val) {
  const goodKeys = ["isHTTPS", "viewport", "hasCharset", "htmlLang", "robotsTxt",
    "sitemap", "amp", "headingStructure", "hasSkipLink", "canonical", "favicon"];
  const badIfZero = ["wordCount", "internalLinks", "externalLinks", "h1Count",
    "openGraph", "twitterCards", "structuredData"];
  if (goodKeys.includes(key)) return boolColor(val);
  if (key === "imagesWithoutAlt" || key === "brokenAnchors" || key === "longParagraphs")
    return val > 0 ? "bad" : "good";
  if (badIfZero.includes(key)) return val > 0 ? "good" : "bad";
  if (key === "score") {
    if (val >= 80) return "good";
    if (val >= 50) return "warn";
    return "bad";
  }
  return "neutral";
}

function formatVal(key, val) {
  if (typeof val === "boolean") return val ? "✓ Yes" : "✗ No";
  if (val === "" || val === null || val === undefined) return "—";
  if (key === "loadTimeMs") return val + " ms";
  if (key === "htmlSizeKB") return val + " KB";
  if (key === "altCoverage" || key === "textHTMLRatio" || key === "labelCoverage") return val + "%";
  if (typeof val === "string" && val.length > 50) return val.slice(0, 48) + "…";
  return val;
}

/* ── Analyze ── */
async function analyze() {
  const url = document.getElementById("urlInput").value.trim();
  if (!url) return;

  const btn = document.getElementById("analyzeBtn");
  const errEl = document.getElementById("errorMsg");
  errEl.style.display = "none";
  btn.disabled = true;
  btn.querySelector(".btn-text").textContent = "Analyzing…";

  document.getElementById("results").style.display = "none";
  document.getElementById("loadingState").style.display = "block";

  const msgs = ["Crawling site…", "Checking metadata…", "Analyzing links…",
    "Scanning images…", "Running 45 checks…"];
  let mi = 0;
  const lt = document.getElementById("loadingText");
  const msgTimer = setInterval(() => {
    lt.textContent = msgs[mi++ % msgs.length];
  }, 1200);

  try {
    const res = await fetch("/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = await res.json();
    clearInterval(msgTimer);

    if (data.error) {
      errEl.textContent = "Error: " + data.error;
      errEl.style.display = "block";
      document.getElementById("loadingState").style.display = "none";
    } else {
      renderResults(data);
      sites.push(data);
      renderCompare();
    }
  } catch (e) {
    clearInterval(msgTimer);
    errEl.textContent = "Network error. Is the server running?";
    errEl.style.display = "block";
    document.getElementById("loadingState").style.display = "none";
  }

  btn.disabled = false;
  btn.querySelector(".btn-text").textContent = "Analyze";
}

/* ── Render Results ── */
function renderResults(data) {
  document.getElementById("loadingState").style.display = "none";
  document.getElementById("results").style.display = "block";
  document.getElementById("resultsUrl").textContent = data.url;

  renderScore(data);
  renderCategoryScores(data);
  renderFeatures(data);
  renderChecks(data);
  renderCharts(data);

  document.getElementById("results").scrollIntoView({ behavior: "smooth" });
}

function renderScore(data) {
  const s = data.score;
  const color = scoreColor(s);

  document.getElementById("scoreNumber").textContent = s;
  document.getElementById("scoreNumber").style.color = color;
  document.getElementById("scoreTitle").textContent =
    s >= 80 ? "Great SEO" : s >= 60 ? "Good SEO" : s >= 40 ? "Needs Work" : "Poor SEO";
  document.getElementById("scoreDesc").textContent =
    `${data.checksPassed} of ${data.checksTotal} checks passed`;
  document.getElementById("passCount").textContent = `${data.checksPassed} passed`;
  document.getElementById("failCount").textContent = `${data.checksTotal - data.checksPassed} failed`;

  if (donutChart) donutChart.destroy();
  donutChart = new Chart(document.getElementById("scoreDonut"), {
    type: "doughnut",
    data: {
      datasets: [{
        data: [s, 100 - s],
        backgroundColor: [color, "rgba(255,255,255,0.05)"],
        borderWidth: 0,
        circumference: 360,
      }],
    },
    options: {
      cutout: "78%",
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      animation: { duration: 900 },
    },
  });

  const sugs = data.suggestions || [];
  const sl = document.getElementById("suggestionsList");
  sl.innerHTML = sugs.length === 0
    ? `<div class="suggestion-item" style="border-left-color:var(--green)"><span class="sug-msg" style="color:var(--green)">✓ No major issues found! Great job.</span></div>`
    : sugs.map(s => `
      <div class="suggestion-item">
        <span class="sug-cat">${s.category || "SEO"}</span>
        <span class="sug-msg">${s.msg}</span>
      </div>`).join("");
}

function renderCategoryScores(data) {
  const grid = document.getElementById("categoryGrid");
  grid.innerHTML = "";
  Object.entries(data.categoryScores || {}).forEach(([cat, score]) => {
    const color = scoreColor(score);
    grid.innerHTML += `
      <div class="cat-card">
        <div class="cat-name">${cat}</div>
        <div class="cat-score" style="color:${color}">${score}<span style="font-size:0.7rem;color:var(--muted);font-weight:400">%</span></div>
        <div class="cat-bar"><div class="cat-bar-fill" style="width:${score}%;background:${color}"></div></div>
      </div>`;
  });
}

function renderFeatures(data) {
  const grid = document.getElementById("featureGrid");
  grid.innerHTML = "";
  const skip = ["suggestions", "categoryScores", "metaDescription", "metaKeywords", "metaRobots"];
  Object.entries(data).forEach(([k, v]) => {
    if (skip.includes(k)) return;
    if (typeof v === "object") return;
    const label = LABELS[k] || k;
    const cls = valueClass(k, v);
    const display = formatVal(k, v);
    grid.innerHTML += `
      <div class="feature-card">
        <div class="feature-title">${label}</div>
        <div class="feature-value ${cls}">${display}</div>
      </div>`;
  });
}

function renderChecks(data) {
  const CHECKS_DEF = [
    { key: "hasTitle", pass: !!data.title, msg: "Title tag present", category: "Metadata" },
    { key: "titleLen", pass: data.titleLength >= 30 && data.titleLength <= 60, msg: `Title length ${data.titleLength} chars (ideal: 30–60)`, category: "Metadata" },
    { key: "metaDescLen", pass: data.metaDescriptionLength >= 120 && data.metaDescriptionLength <= 160, msg: `Meta description ${data.metaDescriptionLength} chars (ideal: 120–160)`, category: "Metadata" },
    { key: "canonical", pass: !!data.canonical, msg: "Canonical tag present", category: "Metadata" },
    { key: "favicon", pass: !!data.favicon, msg: "Favicon present", category: "Metadata" },
    { key: "charset", pass: data.hasCharset, msg: "Charset tag present", category: "Technical" },
    { key: "viewport", pass: data.viewport, msg: "Viewport meta tag present", category: "Technical" },
    { key: "https", pass: data.isHTTPS, msg: "Site uses HTTPS", category: "Technical" },
    { key: "lang", pass: !!data.htmlLang, msg: "HTML lang attribute set", category: "Technical" },
    { key: "robotsTxt", pass: data.robotsTxt, msg: "robots.txt accessible", category: "Technical" },
    { key: "sitemap", pass: data.sitemap, msg: "sitemap.xml accessible", category: "Technical" },
    { key: "h1", pass: data.h1Count === 1, msg: `Exactly one H1 (found: ${data.h1Count})`, category: "Content" },
    { key: "h2", pass: data.h2Count > 0, msg: `H2 headings present (found: ${data.h2Count})`, category: "Content" },
    { key: "wordCount", pass: data.wordCount >= 300, msg: `Word count ${data.wordCount} (min: 300)`, category: "Content" },
    { key: "textRatio", pass: parseFloat(data.textHTMLRatio) > 10, msg: `Text/HTML ratio ${data.textHTMLRatio}% (min: 10%)`, category: "Content" },
    { key: "longParas", pass: data.longParagraphs === 0, msg: `Long paragraphs: ${data.longParagraphs} (ideal: 0)`, category: "Content" },
    { key: "altText", pass: data.imagesWithoutAlt === 0, msg: `Images missing alt: ${data.imagesWithoutAlt}`, category: "Images" },
    { key: "internalLinks", pass: data.internalLinks >= 3, msg: `Internal links: ${data.internalLinks} (min: 3)`, category: "Links" },
    { key: "externalLinks", pass: data.externalLinks >= 1, msg: `External links: ${data.externalLinks} (min: 1)`, category: "Links" },
    { key: "brokenAnchors", pass: data.brokenAnchors === 0, msg: `Placeholder anchors: ${data.brokenAnchors}`, category: "Links" },
    { key: "openGraph", pass: data.openGraph >= 4, msg: `Open Graph tags: ${data.openGraph} (min: 4)`, category: "Social" },
    { key: "twitter", pass: data.twitterCards >= 2, msg: `Twitter Card tags: ${data.twitterCards} (min: 2)`, category: "Social" },
    { key: "structuredData", pass: data.structuredData > 0, msg: `Structured data (JSON-LD): ${data.structuredData}`, category: "Structure" },
    { key: "htmlSize", pass: parseFloat(data.htmlSizeKB) < 200, msg: `HTML size: ${data.htmlSizeKB} KB (max: 200KB)`, category: "Performance" },
    { key: "loadTime", pass: data.loadTimeMs < 3000, msg: `Load time: ${data.loadTimeMs}ms (max: 3000ms)`, category: "Performance" },
    { key: "extScripts", pass: data.externalScripts <= 10, msg: `External scripts: ${data.externalScripts} (max: 10)`, category: "Performance" },
    { key: "skipLink", pass: data.hasSkipLink, msg: "Skip navigation link present", category: "Accessibility" },
    { key: "headingStruct", pass: data.headingStructure, msg: "Proper heading hierarchy (H1 → H2)", category: "Accessibility" },
  ];

  allChecksData = CHECKS_DEF;
  renderChecksList(currentFilter);
}

function renderChecksList(filter) {
  const list = document.getElementById("checksList");
  const items = allChecksData.filter(c => {
    if (filter === "pass") return c.pass;
    if (filter === "fail") return !c.pass;
    return true;
  });
  list.innerHTML = items.map(c => `
    <div class="check-item" data-status="${c.pass ? 'pass' : 'fail'}">
      <span class="check-icon">${c.pass ? "✅" : "❌"}</span>
      <div class="check-info">
        <div class="check-msg">${c.msg}</div>
        <div class="check-cat">${c.category}</div>
      </div>
      <span class="check-status" style="color:${c.pass ? "var(--green)" : "var(--red)"}">${c.pass ? "PASS" : "FAIL"}</span>
    </div>`).join("");
}

function filterChecks(btn, filter) {
  currentFilter = filter;
  document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  renderChecksList(filter);
}

/* ── Charts ── */
function renderCharts(data) {
  if (radarChart) radarChart.destroy();
  if (contentChart) contentChart.destroy();
  if (barChart) barChart.destroy();

  const cats = Object.keys(data.categoryScores || {});
  const catVals = cats.map(c => data.categoryScores[c]);

  radarChart = new Chart(document.getElementById("radarChart"), {
    type: "radar",
    data: {
      labels: cats,
      datasets: [{
        label: "Score",
        data: catVals,
        backgroundColor: "rgba(167,139,250,0.15)",
        borderColor: "#a78bfa",
        borderWidth: 2,
        pointBackgroundColor: "#a78bfa",
        pointRadius: 4,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: {
        r: {
          min: 0, max: 100,
          ticks: { color: "#888899", stepSize: 25, font: { size: 10 } },
          grid: { color: "rgba(255,255,255,0.06)" },
          angleLines: { color: "rgba(255,255,255,0.06)" },
          pointLabels: { color: "#888899", font: { size: 11 } },
        },
      },
      plugins: { legend: { display: false } },
    },
  });

  contentChart = new Chart(document.getElementById("contentChart"), {
    type: "doughnut",
    data: {
      labels: ["Internal Links", "External Links", "Images", "Videos", "Forms"],
      datasets: [{
        data: [data.internalLinks, data.externalLinks, data.totalImages, data.videos, data.forms],
        backgroundColor: ["#818cf8","#34d399","#fbbf24","#f87171","#60a5fa"],
        borderWidth: 0,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: "#888899", font: { size: 11 }, padding: 12, boxWidth: 10 },
        },
      },
    },
  });

  const barLabels = ["Words", "Paragraphs", "H1", "H2", "H3", "Scripts", "CSS Files", "Images", "Links"];
  const barData = [data.wordCount, data.paragraphCount, data.h1Count, data.h2Count, data.h3Count,
    data.scriptCount, data.cssFiles, data.totalImages, data.totalLinks];
  const barColors = barData.map((v, i) => ["#818cf8","#a78bfa","#34d399","#34d399","#6ee7b7",
    "#f87171","#60a5fa","#fbbf24","#34d399"][i]);

  barChart = new Chart(document.getElementById("barChart"), {
    type: "bar",
    data: {
      labels: barLabels,
      datasets: [{
        label: "Value",
        data: barData,
        backgroundColor: barColors,
        borderRadius: 6,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: "#888899", font: { size: 11 } }, grid: { color: "rgba(255,255,255,0.04)" } },
        y: { ticks: { color: "#888899", font: { size: 11 } }, grid: { color: "rgba(255,255,255,0.04)" } },
      },
    },
  });
}

/* ── Comparison ── */
function renderCompare() {
  const tbody = document.getElementById("compareBody");
  if (sites.length === 0) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="9">Analyze a site to begin comparison</td></tr>`;
    return;
  }

  tbody.innerHTML = sites.map((s, i) => `
    <tr>
      <td style="color:var(--accent);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.url}</td>
      <td style="color:${scoreColor(s.score)};font-weight:600">${s.score}</td>
      <td>${s.wordCount}</td>
      <td>${s.totalImages}</td>
      <td>${s.totalLinks}</td>
      <td style="color:${s.h1Count === 1 ? "var(--green)" : "var(--red)"}">${s.h1Count}</td>
      <td style="color:${s.isHTTPS ? "var(--green)" : "var(--red)"}">${s.isHTTPS ? "✓" : "✗"}</td>
      <td style="color:${s.sitemap ? "var(--green)" : "var(--red)"}">${s.sitemap ? "✓" : "✗"}</td>
      <td>${s.loadTimeMs}ms</td>
    </tr>`).join("");

  if (compareChart) compareChart.destroy();

  const labels = sites.map(s => {
    try { return new URL(s.url).hostname; } catch { return s.url; }
  });

  compareChart = new Chart(document.getElementById("compareChart"), {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "SEO Score",
        data: sites.map(s => s.score),
        backgroundColor: sites.map(s => scoreColor(s.score)),
        borderRadius: 8,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            afterLabel: (ctx) => {
              const s = sites[ctx.dataIndex];
              return [`Words: ${s.wordCount}`, `Links: ${s.totalLinks}`, `Load: ${s.loadTimeMs}ms`];
            },
          },
        },
      },
      scales: {
        x: { ticks: { color: "#888899" }, grid: { color: "rgba(255,255,255,0.04)" } },
        y: { min: 0, max: 100, ticks: { color: "#888899" }, grid: { color: "rgba(255,255,255,0.04)" } },
      },
    },
  });
}

/* ── Tabs ── */
function switchTab(btn, id) {
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
  btn.classList.add("active");
  document.getElementById("tab-" + id).classList.add("active");
}

/* ── Clear ── */
function clearAll() {
  sites = [];
  allChecksData = [];
  document.getElementById("results").style.display = "none";
  document.getElementById("urlInput").value = "";
  renderCompare();
}

/* ── PDF Export ── */
async function downloadPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const W = 210;
  const margin = 18;
  let y = 20;

  const lastSite = sites[sites.length - 1];
  if (!lastSite) return;

  // Colors
  const dark = [15, 15, 20];
  const accent = [167, 139, 250];
  const green = [52, 211, 153];
  const red = [248, 113, 113];
  const amber = [251, 191, 36];
  const muted = [136, 136, 153];
  const surface = [24, 24, 31];
  const white = [240, 240, 245];

  // Background
  doc.setFillColor(...dark);
  doc.rect(0, 0, W, 297, "F");

  // Header bar
  doc.setFillColor(...surface);
  doc.rect(0, 0, W, 36, "F");
  doc.setFillColor(...accent);
  doc.rect(0, 34, W, 2, "F");

  // Logo
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...accent);
  doc.text("SEO AUDITOR PRO", margin, 22);

  doc.setFontSize(8);
  doc.setTextColor(...muted);
  doc.text("45-Point SEO Analysis Report", margin, 30);

  // Date on right
  doc.setFontSize(8);
  doc.setTextColor(...muted);
  const now = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  doc.text(now, W - margin, 22, { align: "right" });

  y = 50;

  // URL
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...white);
  doc.text("Analyzed URL:", margin, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...accent);
  const urlTxt = lastSite.url.length > 70 ? lastSite.url.slice(0, 68) + "…" : lastSite.url;
  doc.text(urlTxt, margin + 30, y);

  y += 12;

  // Score big display
  doc.setFillColor(...surface);
  doc.roundedRect(margin, y, 50, 30, 4, 4, "F");
  const sc = lastSite.score;
  const sColor = sc >= 80 ? green : sc >= 50 ? amber : red;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.setTextColor(...sColor);
  doc.text(String(sc), margin + 25, y + 19, { align: "center" });
  doc.setFontSize(8);
  doc.setTextColor(...muted);
  doc.text("SEO SCORE / 100", margin + 25, y + 27, { align: "center" });

  // Stats cards next to score
  const stats = [
    { label: "Checks Passed", val: lastSite.checksPassed + "/" + lastSite.checksTotal },
    { label: "Word Count", val: lastSite.wordCount },
    { label: "Load Time", val: lastSite.loadTimeMs + "ms" },
    { label: "HTML Size", val: lastSite.htmlSizeKB + " KB" },
  ];
  stats.forEach((s, i) => {
    const sx = margin + 58 + i * 32;
    doc.setFillColor(...surface);
    doc.roundedRect(sx, y, 30, 30, 3, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...white);
    doc.text(String(s.val), sx + 15, y + 14, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...muted);
    doc.text(s.label, sx + 15, y + 23, { align: "center" });
  });

  y += 40;

  // Category Scores
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...accent);
  doc.text("CATEGORY SCORES", margin, y);
  y += 6;

  const catEntries = Object.entries(lastSite.categoryScores || {});
  const colW = (W - margin * 2) / Math.min(catEntries.length, 4);

  catEntries.forEach(([ cat, score ], i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const cx = margin + col * colW;
    const cy = y + row * 20;
    const cc = score >= 80 ? green : score >= 50 ? amber : red;

    doc.setFillColor(...surface);
    doc.roundedRect(cx, cy, colW - 3, 16, 3, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...cc);
    doc.text(score + "%", cx + colW / 2 - 1.5, cy + 9, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(...muted);
    doc.text(cat, cx + colW / 2 - 1.5, cy + 14, { align: "center" });
  });

  y += Math.ceil(catEntries.length / 4) * 20 + 10;

  // Checks section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...accent);
  doc.text("SEO CHECKS", margin, y);
  y += 6;

  const checks = [
    { pass: !!lastSite.title, msg: "Title tag present", cat: "Metadata" },
    { pass: lastSite.titleLength >= 30 && lastSite.titleLength <= 60, msg: `Title length (${lastSite.titleLength} chars)`, cat: "Metadata" },
    { pass: lastSite.metaDescriptionLength >= 120 && lastSite.metaDescriptionLength <= 160, msg: `Meta description (${lastSite.metaDescriptionLength} chars)`, cat: "Metadata" },
    { pass: !!lastSite.canonical, msg: "Canonical tag present", cat: "Metadata" },
    { pass: lastSite.isHTTPS, msg: "HTTPS enabled", cat: "Technical" },
    { pass: lastSite.viewport, msg: "Viewport tag present", cat: "Technical" },
    { pass: lastSite.hasCharset, msg: "Charset defined", cat: "Technical" },
    { pass: !!lastSite.htmlLang, msg: `HTML lang="${lastSite.htmlLang || "missing"}"`, cat: "Technical" },
    { pass: lastSite.robotsTxt, msg: "robots.txt accessible", cat: "Technical" },
    { pass: lastSite.sitemap, msg: "sitemap.xml accessible", cat: "Technical" },
    { pass: lastSite.h1Count === 1, msg: `H1 count: ${lastSite.h1Count}`, cat: "Content" },
    { pass: lastSite.h2Count > 0, msg: `H2 count: ${lastSite.h2Count}`, cat: "Content" },
    { pass: lastSite.wordCount >= 300, msg: `Word count: ${lastSite.wordCount}`, cat: "Content" },
    { pass: lastSite.imagesWithoutAlt === 0, msg: `Images missing alt: ${lastSite.imagesWithoutAlt}`, cat: "Images" },
    { pass: lastSite.internalLinks >= 3, msg: `Internal links: ${lastSite.internalLinks}`, cat: "Links" },
    { pass: lastSite.openGraph >= 4, msg: `Open Graph tags: ${lastSite.openGraph}`, cat: "Social" },
    { pass: lastSite.twitterCards >= 2, msg: `Twitter cards: ${lastSite.twitterCards}`, cat: "Social" },
    { pass: lastSite.structuredData > 0, msg: `Structured data blocks: ${lastSite.structuredData}`, cat: "Structure" },
    { pass: parseFloat(lastSite.htmlSizeKB) < 200, msg: `HTML size: ${lastSite.htmlSizeKB} KB`, cat: "Performance" },
    { pass: lastSite.loadTimeMs < 3000, msg: `Load time: ${lastSite.loadTimeMs}ms`, cat: "Performance" },
  ];

  const half = Math.ceil(checks.length / 2);
  checks.forEach((c, i) => {
    const col = i >= half ? 1 : 0;
    const row = i >= half ? i - half : i;
    const cx = margin + col * (W / 2 - margin + 2);
    const cy = y + row * 8;

    if (cy + 8 > 280) {
      doc.addPage();
      doc.setFillColor(...dark);
      doc.rect(0, 0, W, 297, "F");
      y = 20 - row * 8;
    }

    doc.setFontSize(7);
    doc.setTextColor(c.pass ? ...green : ...red);
    doc.text(c.pass ? "✓" : "✗", cx, cy + 4);
    doc.setTextColor(...white);
    doc.text(`${c.msg}`, cx + 5, cy + 4);
    doc.setTextColor(...muted);
    doc.text(c.cat, cx + 67, cy + 4);
  });

  y += half * 8 + 12;

  if (y > 230) {
    doc.addPage();
    doc.setFillColor(...dark);
    doc.rect(0, 0, W, 297, "F");
    y = 20;
  }

  // Suggestions
  if (lastSite.suggestions && lastSite.suggestions.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...accent);
    doc.text("ACTION ITEMS", margin, y);
    y += 7;

    lastSite.suggestions.forEach((s, i) => {
      if (y > 276) {
        doc.addPage();
        doc.setFillColor(...dark);
        doc.rect(0, 0, W, 297, "F");
        y = 20;
      }
      doc.setFillColor(...surface);
      doc.roundedRect(margin, y - 3, W - margin * 2, 8, 2, 2, "F");
      doc.setFontSize(7);
      doc.setTextColor(...red);
      doc.text("!", margin + 3, y + 2.5);
      doc.setTextColor(...white);
      doc.text(s.msg, margin + 8, y + 2.5);
      doc.setTextColor(167, 139, 250);
      doc.text(s.category, W - margin - 2, y + 2.5, { align: "right" });
      y += 10;
    });
  }

  // Comparison page
  if (sites.length > 1) {
    doc.addPage();
    doc.setFillColor(...dark);
    doc.rect(0, 0, W, 297, "F");
    doc.setFillColor(...surface);
    doc.rect(0, 0, W, 20, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...accent);
    doc.text("SITE COMPARISON", margin, 13);

    let ty = 30;
    const headers = ["Website", "Score", "Words", "Links", "Images", "HTTPS", "Sitemap"];
    const colWidths = [65, 18, 20, 18, 18, 18, 18];
    let tx = margin;

    doc.setFillColor(30, 30, 40);
    doc.rect(margin, ty - 5, W - margin * 2, 10, "F");

    headers.forEach((h, i) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...muted);
      doc.text(h, tx + 2, ty);
      tx += colWidths[i];
    });

    ty += 8;
    sites.forEach((s) => {
      if (ty > 270) {
        doc.addPage();
        doc.setFillColor(...dark);
        doc.rect(0, 0, W, 297, "F");
        ty = 20;
      }
      doc.setFillColor(20, 20, 28);
      doc.rect(margin, ty - 5, W - margin * 2, 9, "F");

      const row = [
        s.url.replace(/https?:\/\//, "").slice(0, 38),
        String(s.score), String(s.wordCount), String(s.totalLinks),
        String(s.totalImages), s.isHTTPS ? "Yes" : "No", s.sitemap ? "Yes" : "No",
      ];

      tx = margin;
      row.forEach((cell, i) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        const sc2 = i === 1 ? (parseInt(cell) >= 80 ? green : parseInt(cell) >= 50 ? amber : red) : white;
        doc.setTextColor(...sc2);
        doc.text(cell, tx + 2, ty);
        tx += colWidths[i];
      });

      ty += 10;
    });
  }

  // Footer on all pages
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(...surface);
    doc.rect(0, 285, W, 12, "F");
    doc.setFontSize(7);
    doc.setTextColor(...muted);
    doc.text("Generated by SEO Auditor Pro", margin, 292);
    doc.text(`Page ${i} of ${totalPages}`, W - margin, 292, { align: "right" });
  }

  const domain = (() => { try { return new URL(lastSite.url).hostname; } catch { return "report"; } })();
  doc.save(`seo-report-${domain}-${Date.now()}.pdf`);
}

/* ── Enter key ── */
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("urlInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") analyze();
  });
});