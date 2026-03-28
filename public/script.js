let chart;
let sites=[];

async function analyze(){

const url=document.getElementById("urlInput").value;

const response=await fetch("/analyze",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({url})
});

const data=await response.json();

document.getElementById("result").classList.remove("hidden");

showChart(data);

showFeatures(data);

showKeywords(data);

showSuggestions(data);

setupPDF(data);

sites.push(data);

renderComparison();

}

/* CHART */

function showChart(data){

const ctx=document.getElementById("scoreChart");

if(chart) chart.destroy();

chart=new Chart(ctx,{

type:"doughnut",

data:{
labels:["Score","Remaining"],
datasets:[{
data:[data.score,100-data.score]
}]
}

});

}

/* FEATURE GRID */

function showFeatures(data){

const grid=document.getElementById("featureGrid");

grid.innerHTML="";

const features={

"SEO Score":data.score,
"H1 Tags":data.h1Count,
"H2 Tags":data.h2Count,
"Total Images":data.totalImages,
"Images without ALT":data.imagesWithoutAlt,
"Internal Links":data.internalLinks,
"External Links":data.externalLinks,
"Word Count":data.wordTotal,
"Paragraphs":data.paragraphCount,
"Lists":data.listCount,
"Scripts":data.scriptCount,
"CSS Files":data.cssFiles,
"Forms":data.forms,
"Tables":data.tables,
"Videos":data.videos,
"HTML Size KB":data.htmlSizeKB,
"HTTPS":data.isHTTPS,
"Viewport":data.hasViewport,
"HTML Lang":data.htmlLang||"Missing"

};

Object.entries(features).forEach(([k,v])=>{

grid.innerHTML+=`

<div class="feature-card">

<div class="feature-title">${k}</div>

<div class="feature-value">${v}</div>

</div>

`;

});

}

/* KEYWORDS */

function showKeywords(data){

const list=document.getElementById("keywords");

list.innerHTML="";

data.keywords.forEach(k=>{
list.innerHTML+=`<li>${k[0]} (${k[1]})</li>`;
});

}

/* SUGGESTIONS */

function showSuggestions(data){

const list=document.getElementById("suggestions");

list.innerHTML="";

data.suggestions.forEach(s=>{
list.innerHTML+=`<li>${s}</li>`;
});

}

/* PDF */

function setupPDF(data){

document.getElementById("downloadPDF").onclick=function(){

const {jsPDF}=window.jspdf;

const doc=new jsPDF();

let y=20;

doc.text("SEO Report",20,y);

y+=10;

doc.text("Website: "+data.url,20,y);

y+=10;

doc.text("Score: "+data.score,20,y);

y+=10;

doc.text("Grade: "+data.grade,20,y);

y+=10;

doc.text("Title: "+data.title,20,y);

y+=10;

doc.text("Meta Description: "+data.metaDescription,20,y);

y+=10;

doc.text("Suggestions:",20,y);

y+=10;

data.suggestions.forEach(s=>{

doc.text("- "+s,20,y);

y+=8;

});

doc.save("seo-report.pdf");

}

}

/* COMPARISON */

function renderComparison(){

const table=document.getElementById("comparisonTable");

table.innerHTML="";

sites.forEach(site=>{

table.innerHTML+=`

<tr>
<td>${site.url}</td>
<td>${site.score}</td>
<td>${site.h1Count}</td>
<td>${site.totalImages}</td>
<td>${site.wordTotal}</td>
<td>${site.grade}</td>
</tr>

`;

});

}