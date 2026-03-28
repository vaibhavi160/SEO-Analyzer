let historyData = [];

function toggleDarkMode() {
document.body.classList.toggle("dark");
}

async function analyze() {

const urlInput = document.getElementById("urlInput");

const resultDiv = document.getElementById("result");

const loading = document.getElementById("loading");

let url = urlInput.value.trim();

if (!url) {

resultDiv.innerHTML = "Enter URL";

return;

}

loading.classList.remove("hidden");

resultDiv.innerHTML = "";

try {

const response = await fetch("/analyze", {

method: "POST",

headers: {

"Content-Type": "application/json"

},

body: JSON.stringify({ url })

});

const data = await response.json();

loading.classList.add("hidden");

if (data.error) {

resultDiv.innerHTML = data.error;

return;

}

historyData.push({

url,

score: data.score

});

let html = `

<div class="card">

<h2>SEO Score: ${data.score}/100</h2>

<p>Grade: ${data.grade}</p>

</div>

<div class="card">

<h3>Page Info</h3>

<p><b>Title:</b> ${data.title || "Not Found"}</p>

<p><b>Meta Description:</b> ${data.metaDescription || "Not Found"}</p>

<p><b>Canonical:</b> ${data.canonical || "Not Found"}</p>

</div>

<div class="card">

<h3>SEO Stats</h3>

<p>H1 Tags: ${data.h1Count}</p>

<p>H2 Tags: ${data.h2Count}</p>

<p>Total Images: ${data.totalImages}</p>

<p>Missing Alt: ${data.imagesWithoutAlt}</p>

<p>Links: ${data.links}</p>

<p>Page Size: ${data.htmlSizeKB} KB</p>

<p>Mobile Friendly: ${data.hasViewport ? "Yes" : "No"}</p>

<p>HTTPS: ${data.isHTTPS ? "Secure" : "Not Secure"}</p>

</div>

<div class="card">

<h3>Top Keywords</h3>

<ul>

${data.keywords.map(k => `<li>${k[0]} (${k[1]})</li>`).join("")}

</ul>

</div>

<div class="card">

<h3>SEO Issues</h3>

<ul>

${data.suggestions.map(s => `<li>${s}</li>`).join("")}

</ul>

</div>

`;

resultDiv.innerHTML = html;

} catch {

loading.classList.add("hidden");

resultDiv.innerHTML = "Server error";

}

}

function downloadCSV() {

let csv = "URL,Score\n";

historyData.forEach(d => {

csv += `${d.url},${d.score}\n`;

});

const blob = new Blob([csv]);

const link = document.createElement("a");

link.href = URL.createObjectURL(blob);

link.download = "seo_report.csv";

link.click();

}

function downloadPDF() {

window.print();

}