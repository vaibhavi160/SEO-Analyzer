const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

app.post("/analyze", async (req, res) => {
  let { url } = req.body;
  if (!url || !url.trim()) return res.status(400).json({ error: "URL is required" });

  try {
    if (!url.startsWith("http")) url = "https://" + url;
    const origin = new URL(url).origin;

    const startTime = Date.now();
    const { data, headers: resHeaders } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SEOAuditor/1.0)" },
      timeout: 12000,
      maxRedirects: 5,
    });
    const loadTime = Date.now() - startTime;

    const $ = cheerio.load(data);

    /* ── 1. METADATA ── */
    const title = $("title").text().trim();
    const titleLength = title.length;

    const metaDescription = $('meta[name="description"]').attr("content") || "";
    const metaDescriptionLength = metaDescription.length;

    const metaKeywords = $('meta[name="keywords"]').attr("content") || "";
    const metaRobots = $('meta[name="robots"]').attr("content") || "";
    const canonical = $('link[rel="canonical"]').attr("href") || "";
    const favicon =
      $('link[rel="icon"]').attr("href") ||
      $('link[rel="shortcut icon"]').attr("href") ||
      "";

    /* ── 2. HEADINGS ── */
    const h1Count = $("h1").length;
    const h2Count = $("h2").length;
    const h3Count = $("h3").length;
    const h4Count = $("h4").length;
    const h1Text = $("h1").first().text().trim().slice(0, 80);

    /* ── 3. CONTENT ── */
    const bodyText = $("body").text().replace(/\s+/g, " ").trim();
    const words = bodyText.match(/\b\w+\b/g) || [];
    const wordCount = words.length;
    const paragraphCount = $("p").length;
    const htmlSize = Buffer.byteLength(data, "utf8");
    const textBytes = Buffer.byteLength(bodyText, "utf8");
    const textHTMLRatio = ((textBytes / htmlSize) * 100).toFixed(1);
    const strongTags = $("strong,b").length;
    const lists = $("ul,ol").length;
    const blockquotes = $("blockquote").length;

    /* ── 4. LINKS ── */
    const links = $("a[href]");
    const totalLinks = links.length;
    let internalLinks = 0,
      externalLinks = 0,
      nofollowLinks = 0,
      brokenAnchors = 0;

    links.each((i, el) => {
      const href = $(el).attr("href") || "";
      const rel = $(el).attr("rel") || "";
      if (rel.includes("nofollow")) nofollowLinks++;
      if (href.startsWith("http") && !href.includes(new URL(url).hostname)) externalLinks++;
      else internalLinks++;
      if (href === "#" || href === "javascript:void(0)") brokenAnchors++;
    });

    /* ── 5. IMAGES ── */
    const images = $("img");
    const totalImages = images.length;
    let imagesWithoutAlt = 0,
      largeImages = 0;

    images.each((i, el) => {
      const alt = $(el).attr("alt");
      if (alt === undefined || alt === null) imagesWithoutAlt++;
      const w = parseInt($(el).attr("width") || "0");
      if (w > 1000) largeImages++;
    });

    const altCoverage =
      totalImages > 0
        ? (((totalImages - imagesWithoutAlt) / totalImages) * 100).toFixed(1)
        : "N/A";

    /* ── 6. TECHNICAL ── */
    const isHTTPS = url.startsWith("https");
    const viewport = $('meta[name="viewport"]').length > 0;
    const htmlLang = $("html").attr("lang") || "";
    const amp = $('link[rel="amphtml"]').length > 0;
    const hasCharset =
      $('meta[charset]').length > 0 ||
      $('meta[http-equiv="Content-Type"]').length > 0;

    let robotsTxt = false;
    try {
      await axios.get(origin + "/robots.txt", { timeout: 4000 });
      robotsTxt = true;
    } catch {}

    let sitemap = false;
    try {
      await axios.get(origin + "/sitemap.xml", { timeout: 4000 });
      sitemap = true;
    } catch {}

    /* ── 7. PERFORMANCE ── */
    const htmlSizeKB = (htmlSize / 1024).toFixed(2);
    const scriptCount = $("script").length;
    const externalScripts = $('script[src]').length;
    const cssFiles = $('link[rel="stylesheet"]').length;
    const inlineStyles = $("[style]").length;
    const loadTimeMs = loadTime;

    /* ── 8. ENGAGEMENT ── */
    const forms = $("form").length;
    const tables = $("table").length;
    const videos = $("video,iframe[src*='youtube'],iframe[src*='vimeo']").length;

    /* ── 9. SOCIAL / STRUCTURED DATA ── */
    const openGraph = $('meta[property^="og"]').length;
    const twitterCards = $('meta[name^="twitter"]').length;
    const socialMeta = openGraph + twitterCards;
    const structuredData = $('script[type="application/ld+json"]').length;

    /* ── 10. ACCESSIBILITY ── */
    const headingStructure = h1Count === 1 && h2Count > 0;
    const hasSkipLink = $('a[href="#main"],a[href="#content"]').length > 0;
    const inputsWithLabels = $("input[id]").filter((i, el) => {
      const id = $(el).attr("id");
      return $(`label[for="${id}"]`).length > 0;
    }).length;
    const totalInputs = $("input:not([type='hidden'])").length;
    const labelCoverage =
      totalInputs > 0 ? ((inputsWithLabels / totalInputs) * 100).toFixed(0) : "N/A";

    /* ── 11. READABILITY ── */
    const avgWordsPerParagraph =
      paragraphCount > 0 ? Math.round(wordCount / paragraphCount) : 0;
    const readabilityHint = wordCount > 300;
    const longParagraphs = $("p")
      .toArray()
      .filter((el) => $(el).text().split(" ").length > 100).length;

    /* ── SUGGESTIONS ── */
    const suggestions = [];
    const checks = [
      { pass: !!title, msg: "Missing title tag", category: "Metadata" },
      { pass: titleLength >= 30, msg: "Title too short (< 30 chars)", category: "Metadata" },
      { pass: titleLength <= 60, msg: "Title too long (> 60 chars)", category: "Metadata" },
      { pass: metaDescriptionLength >= 120, msg: "Meta description too short (< 120 chars)", category: "Metadata" },
      { pass: metaDescriptionLength <= 160, msg: "Meta description too long (> 160 chars)", category: "Metadata" },
      { pass: !!canonical, msg: "No canonical tag found", category: "Metadata" },
      { pass: !!favicon, msg: "No favicon found", category: "Metadata" },
      { pass: h1Count === 1, msg: h1Count === 0 ? "No H1 tag found" : "Multiple H1 tags found", category: "Content" },
      { pass: h2Count > 0, msg: "No H2 headings (add subheadings)", category: "Content" },
      { pass: wordCount >= 300, msg: "Content too short (< 300 words)", category: "Content" },
      { pass: imagesWithoutAlt === 0, msg: `${imagesWithoutAlt} image(s) missing alt text`, category: "Images" },
      { pass: internalLinks >= 3, msg: "Too few internal links (< 3)", category: "Links" },
      { pass: externalLinks >= 1, msg: "No external/outbound links", category: "Links" },
      { pass: robotsTxt, msg: "robots.txt not found", category: "Technical" },
      { pass: sitemap, msg: "sitemap.xml not found", category: "Technical" },
      { pass: viewport, msg: "Viewport meta tag missing", category: "Technical" },
      { pass: isHTTPS, msg: "Site not using HTTPS", category: "Technical" },
      { pass: hasCharset, msg: "Charset meta tag missing", category: "Technical" },
      { pass: !!htmlLang, msg: "HTML lang attribute missing", category: "Accessibility" },
      { pass: openGraph >= 4, msg: "Insufficient Open Graph tags", category: "Social" },
      { pass: twitterCards >= 2, msg: "Twitter Card tags missing", category: "Social" },
      { pass: structuredData > 0, msg: "No structured data (JSON-LD) found", category: "Structure" },
      { pass: htmlSizeKB < 200, msg: "HTML page size too large (> 200KB)", category: "Performance" },
      { pass: loadTimeMs < 3000, msg: "Page load time too slow (> 3s)", category: "Performance" },
      { pass: externalScripts <= 10, msg: "Too many external scripts (> 10)", category: "Performance" },
      { pass: longParagraphs === 0, msg: `${longParagraphs} paragraph(s) too long (> 100 words)`, category: "Readability" },
      { pass: parseFloat(textHTMLRatio) > 10, msg: "Text-to-HTML ratio too low (< 10%)", category: "Content" },
      { pass: brokenAnchors === 0, msg: `${brokenAnchors} placeholder anchor(s) found (href='#')`, category: "Links" },
    ];

    checks.forEach((c) => {
      if (!c.pass) suggestions.push({ msg: c.msg, category: c.category });
    });

    /* ── SCORE ── */
    const passCount = checks.filter((c) => c.pass).length;
    const score = Math.round((passCount / checks.length) * 100);

    const categoryScores = {};
    const cats = [...new Set(checks.map((c) => c.category))];
    cats.forEach((cat) => {
      const catChecks = checks.filter((c) => c.category === cat);
      const catPass = catChecks.filter((c) => c.pass).length;
      categoryScores[cat] = Math.round((catPass / catChecks.length) * 100);
    });

    res.json({
      url, title, titleLength,
      metaDescription, metaDescriptionLength, metaKeywords,
      metaRobots, canonical, favicon,
      h1Count, h2Count, h3Count, h4Count, h1Text,
      wordCount, paragraphCount, textHTMLRatio,
      strongTags, lists, blockquotes,
      totalLinks, internalLinks, externalLinks,
      nofollowLinks, brokenAnchors,
      totalImages, imagesWithoutAlt, largeImages, altCoverage,
      isHTTPS, viewport, htmlLang, amp, hasCharset,
      robotsTxt, sitemap,
      htmlSizeKB, scriptCount, externalScripts,
      cssFiles, inlineStyles, loadTimeMs,
      forms, tables, videos,
      openGraph, twitterCards, socialMeta,
      structuredData,
      headingStructure, hasSkipLink,
      labelCoverage, avgWordsPerParagraph,
      readabilityHint, longParagraphs,
      score, categoryScores,
      suggestions,
      checksTotal: checks.length,
      checksPassed: passCount,
    });
  } catch (error) {
    const msg =
      error.code === "ECONNREFUSED"
        ? "Connection refused"
        : error.code === "ETIMEDOUT"
        ? "Request timed out"
        : error.response
        ? `HTTP ${error.response.status}`
        : "Site not accessible";
    res.status(500).json({ error: msg });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`SEO Auditor running on http://localhost:${PORT}`));