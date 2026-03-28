let chart;

async function analyze(){

const url=document.getElementById("urlInput").value;

document.getElementById("loader").innerHTML="Analyzing...";

const response=await fetch("/analyze",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({url})

});

const data=await response.json();

document.getElementById("loader").innerHTML="";

document.getElementById("result").classList.remove("hidden");

showChart(data);

showData(data);

setupPDF(data);

}

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

function showData(data){

const seo=document.getElementById("seoData");

seo.innerHTML=`

<li><b>Title:</b> ${data.title}</li>
<li><b>Meta Description:</b> ${data.metaDescription}</li>
<li><b>H1 Count:</b> ${data.h1Count}</li>
<li><b>H2 Count:</b> ${data.h2Count}</li>
<li><b>Total Images:</b> ${data.totalImages}</li>
<li><b>Images without ALT:</b> ${data.imagesWithoutAlt}</li>
<li><b>Total Links:</b> ${data.links}</li>
<li><b>HTML Size:</b> ${data.htmlSizeKB} KB</li>
<li><b>HTTPS:</b> ${data.isHTTPS}</li>
<li><b>Mobile Friendly:</b> ${data.hasViewport}</li>
<li><b>Grade:</b> ${data.grade}</li>

`;

const keywords=document.getElementById("keywords");

keywords.innerHTML="";

data.keywords.forEach(k=>{

keywords.innerHTML+=`<li>${k[0]} (${k[1]})</li>`;

});

const sug=document.getElementById("suggestions");

sug.innerHTML="";

data.suggestions.forEach(s=>{

sug.innerHTML+=`<li>${s}</li>`;

});

}

function setupPDF(data){

document.getElementById("downloadPDF").onclick=function(){

const {jsPDF}=window.jspdf;

const doc=new jsPDF();

let y=20;

doc.setFontSize(20);

doc.text("SEO Audit Report",20,y);

y+=20;

doc.setFontSize(12);

doc.text("Website: "+data.url,20,y);

y+=10;

doc.text("SEO Score: "+data.score,20,y);

y+=10;

doc.text("Grade: "+data.grade,20,y);

y+=10;

doc.text("Title: "+data.title,20,y);

y+=10;

doc.text("Meta Description: "+data.metaDescription,20,y);

y+=10;

doc.text("H1 Count: "+data.h1Count,20,y);

y+=10;

doc.text("H2 Count: "+data.h2Count,20,y);

y+=10;

doc.text("Images without ALT: "+data.imagesWithoutAlt,20,y);

y+=10;

doc.text("Total Links: "+data.links,20,y);

y+=10;

doc.text("HTML Size: "+data.htmlSizeKB+" KB",20,y);

y+=20;

doc.text("Suggestions:",20,y);

y+=10;

data.suggestions.forEach(s=>{

doc.text("- "+s,20,y);

y+=8;

});

doc.save("seo-report.pdf");

}

}