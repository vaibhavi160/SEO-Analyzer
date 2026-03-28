let historyData = [];

let seoChart = null;

let compareChart = null;


// DARK MODE
function toggleDarkMode(){

document.body.classList.toggle("dark");

}


// ANALYZE FUNCTION
async function analyze(){

const urlInput = document.getElementById("urlInput");

const resultDiv = document.getElementById("result");

const loading = document.getElementById("loading");

let url = urlInput.value.trim();

if(!url){

resultDiv.innerHTML = "Enter URL";

return;

}

loading.classList.remove("hidden");

resultDiv.innerHTML = "";

try{

const response = await fetch("/analyze",{

method:"POST",

headers:{

"Content-Type":"application/json"

},

body:JSON.stringify({url})

});

const data = await response.json();

loading.classList.add("hidden");

if(data.error){

resultDiv.innerHTML=data.error;

return;

}

historyData.push({

url,

score:data.score

});

renderUI(data);

renderCharts(data);

}

catch{

loading.classList.add("hidden");

resultDiv.innerHTML="Server error";

}

}


// UI RENDER
function renderUI(data){

const resultDiv=document.getElementById("result");

let html=`

<div class="card">

<div class="score">${data.score}/100</div>

<p style="text-align:center">Grade: ${data.grade}</p>

</div>


<div class="card">

<h3>Page Info</h3>

<p><b>Title:</b> ${data.title || "Not Found"}</p>

<p><b>Meta Description:</b> ${data.metaDescription || "Not Found"}</p>

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

${data.keywords.map(k=>`<li>${k[0]} (${k[1]})</li>`).join("")}

</ul>

</div>


<div class="card">

<h3>SEO Suggestions</h3>

<ul>

${data.suggestions.map(s=>`<li>${s}</li>`).join("")}

</ul>

</div>

<canvas id="seoChart"></canvas>

`;

if(historyData.length>1){

html+=`<canvas id="compareChart"></canvas>`;

}

resultDiv.innerHTML=html;

}


// CHARTS
function renderCharts(data){

setTimeout(()=>{

if(seoChart) seoChart.destroy();

if(compareChart) compareChart.destroy();


seoChart=new Chart(document.getElementById("seoChart"),{

type:"bar",

data:{

labels:["H1","H2","Images","Missing Alt","Links"],

datasets:[{

label:"SEO Metrics",

data:[

data.h1Count,

data.h2Count,

data.totalImages,

data.imagesWithoutAlt,

data.links

]

}]

}

});


if(historyData.length>1){

compareChart=new Chart(document.getElementById("compareChart"),{

type:"line",

data:{

labels:historyData.map(d=>d.url),

datasets:[{

label:"SEO Score Comparison",

data:historyData.map(d=>d.score)

}]

}

});

}

},200);

}


// CSV DOWNLOAD
function downloadCSV(){

if(historyData.length===0){

alert("No data");

return;

}

let csv="URL,Score\n";

historyData.forEach(d=>{

csv+=`${d.url},${d.score}\n`;

});

const blob=new Blob([csv]);

const link=document.createElement("a");

link.href=URL.createObjectURL(blob);

link.download="seo_report.csv";

link.click();

}


// PDF DOWNLOAD
function downloadPDF(){

const content=document.getElementById("result").innerHTML;

const win=window.open("","","width=900,height=700");

win.document.write(`

<html>

<head>

<title>SEO Report</title>

</head>

<body>

<h1>SEO Report</h1>

${content}

</body>

</html>

`);

win.document.close();

win.print();

}