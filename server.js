const express=require("express")
const axios=require("axios")
const cheerio=require("cheerio")
const cors=require("cors")

const app=express()

app.use(cors())
app.use(express.json())
app.use(express.static("public"))

app.post("/analyze",async(req,res)=>{

let {url}=req.body

try{

if(!url.startsWith("http")){
url="https://"+url
}

const {data}=await axios.get(url,{
headers:{ "User-Agent":"Mozilla/5.0"},
timeout:10000
})

const $=cheerio.load(data)

/* METADATA */

const title=$("title").text().trim()
const titleLength=title.length

const metaDescription=$('meta[name="description"]').attr("content")||""
const metaDescriptionLength=metaDescription.length

const metaRobots=$('meta[name="robots"]').attr("content")||""

const canonical=$('link[rel="canonical"]').attr("href")||""

const favicon=$('link[rel="icon"]').attr("href")||""

/* HEADINGS */

const h1Count=$("h1").length
const h2Count=$("h2").length
const h3Count=$("h3").length

/* CONTENT */

const bodyText=$("body").text()
const words=bodyText.match(/\b\w+\b/g)||[]
const wordCount=words.length

const paragraphCount=$("p").length

const htmlSize=Buffer.byteLength(data)

const textHTMLRatio=(bodyText.length/htmlSize*100).toFixed(2)

const strongTags=$("strong").length
const lists=$("ul,ol").length

/* LINKS */

const links=$("a")

const totalLinks=links.length

let internalLinks=0
let externalLinks=0
let nofollowLinks=0

links.each((i,el)=>{

const href=$(el).attr("href")||""
const rel=$(el).attr("rel")||""

if(rel.includes("nofollow")) nofollowLinks++

if(href.startsWith("http")) externalLinks++
else internalLinks++

})

/* IMAGES */

const images=$("img")
const totalImages=images.length

let imagesWithoutAlt=0
let largeImages=0

images.each((i,el)=>{

if(!$(el).attr("alt")) imagesWithoutAlt++

const width=$(el).attr("width")
if(width && parseInt(width)>1000) largeImages++

})

const altCoverage=((totalImages-imagesWithoutAlt)/totalImages*100||0).toFixed(1)

/* TECHNICAL */

const isHTTPS=url.startsWith("https")

const viewport=$('meta[name="viewport"]').length>0

const htmlLang=$("html").attr("lang")||""

const amp=$('link[rel="amphtml"]').length>0

let robotsTxt=false
try{
await axios.get(url+"/robots.txt")
robotsTxt=true
}catch{}

let sitemap=false
try{
await axios.get(url+"/sitemap.xml")
sitemap=true
}catch{}

/* PERFORMANCE */

const htmlSizeKB=(htmlSize/1024).toFixed(2)

const scriptCount=$("script").length

const cssFiles=$('link[rel="stylesheet"]').length

const inlineStyles=$("[style]").length

/* ENGAGEMENT */

const forms=$("form").length

const tables=$("table").length

const videos=$("video,iframe").length

const socialMeta=$('meta[property^="og"]').length

/* STRUCTURE */

const structuredData=$('script[type="application/ld+json"]').length

const openGraph=$('meta[property^="og"]').length

const twitterCards=$('meta[name^="twitter"]').length

/* ACCESSIBILITY */

const headingStructure=(h1Count===1 && h2Count>0)

const readabilityHint=wordCount>300

/* SUGGESTIONS */

let suggestions=[]

if(!title) suggestions.push("Missing title tag")
if(titleLength<30) suggestions.push("Title too short")
if(metaDescriptionLength<120) suggestions.push("Meta description short")
if(imagesWithoutAlt>0) suggestions.push("Add alt text to images")
if(h1Count===0) suggestions.push("Add H1 heading")
if(internalLinks<3) suggestions.push("Add internal links")
if(!robotsTxt) suggestions.push("robots.txt missing")
if(!sitemap) suggestions.push("sitemap.xml missing")
if(!viewport) suggestions.push("Viewport tag missing")
if(!isHTTPS) suggestions.push("Site should use HTTPS")
if(wordCount<300) suggestions.push("Content too short")

/* SCORE */

let score=100-suggestions.length*5
if(score<0) score=0

res.json({

url,

title,titleLength,
metaDescription,metaDescriptionLength,
metaRobots,canonical,favicon,

h1Count,h2Count,h3Count,

wordCount,paragraphCount,textHTMLRatio,strongTags,lists,

totalLinks,internalLinks,externalLinks,nofollowLinks,

totalImages,imagesWithoutAlt,largeImages,altCoverage,

isHTTPS,viewport,htmlLang,amp,robotsTxt,sitemap,

htmlSizeKB,scriptCount,cssFiles,inlineStyles,

forms,tables,videos,socialMeta,

structuredData,openGraph,twitterCards,

headingStructure,readabilityHint,

score,

suggestions

})

}catch(error){

res.status(500).json({error:"Site not accessible"})

}

})

const PORT=process.env.PORT||3000

app.listen(PORT,()=>{
console.log("Server running "+PORT)
})