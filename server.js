const express=require("express");
const axios=require("axios");
const cheerio=require("cheerio");
const cors=require("cors");

const app=express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

app.post("/analyze",async(req,res)=>{

let {url}=req.body;

try{

if(!url.startsWith("http")){
url="https://"+url;
}

const {data}=await axios.get(url,{
headers:{ "User-Agent":"Mozilla/5.0"},
timeout:10000
});

const $=cheerio.load(data);

/* BASIC SEO */

const title=$("title").text().trim();

const metaDescription=$('meta[name="description"]').attr("content")||"";

const canonical=$('link[rel="canonical"]').attr("href")||"";

const h1Count=$("h1").length;
const h2Count=$("h2").length;

/* LINKS */

const links=$("a").length;

let internalLinks=0;
let externalLinks=0;

$("a").each((i,el)=>{

const href=$(el).attr("href")||"";

if(href.startsWith("http")) externalLinks++;
else internalLinks++;

});

/* IMAGES */

const images=$("img");

let imagesWithoutAlt=0;

images.each((i,el)=>{
if(!$(el).attr("alt")) imagesWithoutAlt++;
});

/* TEXT ANALYSIS */

const text=$("body").text().toLowerCase();

const words=text.match(/\b\w+\b/g)||[];

const wordTotal=words.length;

let wordCount={};

words.forEach(w=>{
if(w.length>3){
wordCount[w]=(wordCount[w]||0)+1;
}
});

const keywords=Object.entries(wordCount)
.sort((a,b)=>b[1]-a[1])
.slice(0,10);

/* PAGE SIZE */

const htmlSizeKB=(Buffer.byteLength(data)/1024).toFixed(2);

/* EXTRA FEATURES */

const paragraphCount=$("p").length;

const listCount=$("ul,ol").length;

const strongTags=$("strong").length;

const scriptCount=$("script").length;

const cssFiles=$('link[rel="stylesheet"]').length;

const forms=$("form").length;

const tables=$("table").length;

const videos=$("video,iframe").length;

const hasViewport=$('meta[name="viewport"]').length>0;

const isHTTPS=url.startsWith("https");

const htmlLang=$("html").attr("lang")||"";

/* SEO SUGGESTIONS */

let suggestions=[];

if(!title) suggestions.push("Missing title tag");

if(title.length<30) suggestions.push("Title too short");

if(title.length>60) suggestions.push("Title too long");

if(!metaDescription) suggestions.push("Meta description missing");

if(metaDescription.length<120) suggestions.push("Meta description too short");

if(imagesWithoutAlt>0) suggestions.push(imagesWithoutAlt+" images missing alt text");

if(h1Count===0) suggestions.push("No H1 tag found");

if(h1Count>1) suggestions.push("Multiple H1 tags found");

if(!canonical) suggestions.push("Canonical tag missing");

if(!hasViewport) suggestions.push("Viewport tag missing");

if(wordTotal<300) suggestions.push("Low content length");

if(internalLinks<3) suggestions.push("Add more internal links");

if(externalLinks===0) suggestions.push("Add outbound links");

if(!htmlLang) suggestions.push("HTML lang attribute missing");

/* SCORE */

let score=100-suggestions.length*5;

if(score<0) score=0;

let grade="Poor";

if(score>85) grade="Excellent";
else if(score>70) grade="Good";
else if(score>50) grade="Average";

res.json({

url,
title,
metaDescription,

score,
grade,

h1Count,
h2Count,

links,
internalLinks,
externalLinks,

totalImages:images.length,
imagesWithoutAlt,

htmlSizeKB,

keywords,

wordTotal,
paragraphCount,
listCount,
strongTags,
scriptCount,
cssFiles,
forms,
tables,
videos,

hasViewport,
isHTTPS,
htmlLang,

suggestions

});

}catch(error){

res.status(500).json({error:"Website not accessible"});

}

});

const PORT=process.env.PORT||3000;

app.listen(PORT,()=>{

console.log("Server running on "+PORT);

});