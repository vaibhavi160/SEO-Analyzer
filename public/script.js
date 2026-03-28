let chart
let sites=[]

async function analyze(){

const url=document.getElementById("urlInput").value

const res=await fetch("/analyze",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({url})
})

const data=await res.json()

showGraph(data)

showFeatures(data)

showSuggestions(data)

sites.push(data)

renderComparison()

}

function showGraph(data){

const ctx=document.getElementById("scoreChart")

if(chart) chart.destroy()

chart=new Chart(ctx,{

type:"bar",

data:{
labels:["SEO Score"],
datasets:[{
label:"Score",
data:[data.score]
}]
}

})

}

function showFeatures(data){

const grid=document.getElementById("featureGrid")

grid.innerHTML=""

Object.entries(data).forEach(([k,v])=>{

if(typeof v==="string"||typeof v==="number"||typeof v==="boolean"){

grid.innerHTML+=`

<div class="feature-card">

<div class="feature-title">${k}</div>

<div class="feature-value">${v}</div>

</div>

`

}

})

}

function showSuggestions(data){

const list=document.getElementById("suggestions")

list.innerHTML=""

data.suggestions.forEach(s=>{

list.innerHTML+=`<li>${s}</li>`

})

}

function renderComparison(){

const table=document.getElementById("comparisonTable")

table.innerHTML=""

sites.forEach(s=>{

table.innerHTML+=`

<tr>

<td>${s.url}</td>

<td>${s.score}</td>

<td>${s.wordCount}</td>

<td>${s.totalImages}</td>

<td>${s.totalLinks}</td>

<td>${s.h1Count}</td>

</tr>

`

})

}