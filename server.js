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
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120"
      },
      timeout: 10000
    });

    const $ = cheerio.load(data);

    // 📄 Basic SEO
    const title = $("title").text().trim();
    const metaDescription =
      $('meta[name="description"]').attr("content") || "";

    const h1Count = $("h1").length;
    const h2Count = $("h2").length;
    const links = $("a").length;

    // 🖼 Images
    const images = $("img");
    let imagesWithoutAlt = 0;

    images.each((i, el) => {
      if (!$(el).attr("alt")) imagesWithoutAlt++;
    });

    // 🔍 Keyword Density
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

    // ⚡ Extra checks
    const htmlSizeKB = (Buffer.byteLength(data) / 1024).toFixed(2);
    const hasViewport = $('meta[name="viewport"]').length > 0;
    const isHTTPS = url.startsWith("https");

    // 🎯 Suggestions
    let suggestions = [];

    if (!metaDescription) suggestions.push("Add meta description");
    if (title.length < 30 || title.length > 60)
      suggestions.push("Optimize title length (30–60 chars)");
    if (h1Count === 0) suggestions.push("Add at least one H1 tag");
    if (imagesWithoutAlt > 0)
      suggestions.push("Add alt text to images");
    if (!hasViewport)
      suggestions.push("Add viewport for mobile responsiveness");
    if (!isHTTPS)
      suggestions.push("Use HTTPS for security");

    // 🧠 Score
    let score = 100 - suggestions.length * 10;
    if (score < 0) score = 0;

    let grade = "Poor";
    if (score > 80) grade = "Excellent";
    else if (score > 60) grade = "Good";
    else if (score > 40) grade = "Average";

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

  } catch (error) {
    console.error(error.message);

    res.status(500).json({
      error: "⚠ Website blocked or not accessible"
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});