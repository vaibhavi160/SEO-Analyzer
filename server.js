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

  try {

    if (!url.startsWith("http")) {
      url = "https://" + url;
    }

    const { data } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      },
      timeout: 10000
    });

    const $ = cheerio.load(data);

    // TITLE
    const title = $("title").text().trim();

    // META TAGS
    const metaDescription =
      $('meta[name="description"]').attr("content") || "";

    const metaRobots =
      $('meta[name="robots"]').attr("content") || "";

    const canonical =
      $('link[rel="canonical"]').attr("href") || "";

    // OPEN GRAPH
    const ogTitle =
      $('meta[property="og:title"]').attr("content") || "";

    const ogDescription =
      $('meta[property="og:description"]').attr("content") || "";

    // STRUCTURED DATA
    const structuredData =
      $('script[type="application/ld+json"]').length;

    // HEADINGS
    const h1Count = $("h1").length;
    const h2Count = $("h2").length;

    // LINKS
    const links = $("a").length;

    // IMAGES
    const images = $("img");
    let imagesWithoutAlt = 0;

    images.each((i, el) => {
      if (!$(el).attr("alt")) imagesWithoutAlt++;
    });

    // KEYWORDS
    const text = $("body").text().toLowerCase();
    const words = text.match(/\b\w+\b/g) || [];
    const wordCount = {};

    words.forEach(word => {
      if (word.length > 3) {
        wordCount[word] = (wordCount[word] || 0) + 1;
      }
    });

    const keywords = Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // PAGE SIZE
    const htmlSizeKB =
      (Buffer.byteLength(data) / 1024).toFixed(2);

    // MOBILE
    const hasViewport =
      $('meta[name="viewport"]').length > 0;

    // HTTPS
    const isHTTPS =
      url.startsWith("https");

    // FAVICON
    const favicon =
      $('link[rel="icon"]').attr("href") ||
      $('link[rel="shortcut icon"]').attr("href");

    // ROBOTS.TXT CHECK
    let hasRobots = false;

    try {
      await axios.get(url + "/robots.txt");
      hasRobots = true;
    } catch {}

    // SITEMAP CHECK
    let hasSitemap = false;

    try {
      await axios.get(url + "/sitemap.xml");
      hasSitemap = true;
    } catch {}

    // SEO SUGGESTIONS
    let suggestions = [];

    if (!title)
      suggestions.push("Title tag missing");

    else if (title.length < 30)
      suggestions.push("Title too short (30–60 recommended)");

    else if (title.length > 60)
      suggestions.push("Title too long");

    if (!metaDescription)
      suggestions.push("Meta description missing");

    else if (metaDescription.length < 120)
      suggestions.push("Meta description too short");

    else if (metaDescription.length > 160)
      suggestions.push("Meta description too long");

    if (!metaRobots)
      suggestions.push("Meta robots tag missing");

    if (!canonical)
      suggestions.push("Canonical tag missing");

    if (!ogTitle || !ogDescription)
      suggestions.push("Open Graph tags missing");

    if (structuredData === 0)
      suggestions.push("No structured data detected");

    if (h1Count === 0)
      suggestions.push("No H1 tag found");

    if (h1Count > 1)
      suggestions.push("Multiple H1 tags found");

    if (imagesWithoutAlt > 0)
      suggestions.push(imagesWithoutAlt + " images missing alt text");

    if (!hasViewport)
      suggestions.push("Viewport meta tag missing");

    if (!isHTTPS)
      suggestions.push("Website not using HTTPS");

    if (!favicon)
      suggestions.push("Favicon missing");

    if (!hasRobots)
      suggestions.push("robots.txt file missing");

    if (!hasSitemap)
      suggestions.push("sitemap.xml not found");

    // SCORE
    let score = 100 - suggestions.length * 6;

    if (score < 0) score = 0;

    let grade = "Poor";

    if (score > 85)
      grade = "Excellent";

    else if (score > 70)
      grade = "Good";

    else if (score > 50)
      grade = "Average";

    res.json({

      url,

      title,

      metaDescription,

      h1Count,

      h2Count,

      totalImages: images.length,

      imagesWithoutAlt,

      links,

      htmlSizeKB,

      hasViewport,

      isHTTPS,

      keywords,

      score,

      grade,

      suggestions

    });

  }

  catch (error) {

    res.status(500).json({
      error: "Website blocked or not accessible"
    });

  }

});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

  console.log("Server running on port " + PORT);

});