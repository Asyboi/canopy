const express=require("express"),cors=require("cors"),fs=require("fs"),path=require("path");
const port=parseInt(fs.readFileSync(path.join(__dirname,"../.canopy/server.port"),"utf8").trim(),10)||4000;
const app=express();app.use(cors());app.use(express.json());
const a={generatedAt:new Date().toISOString(),features:[
{id:"f1",name:"Notification System",sustainabilityTier:"high",complexityScore:65,dependencies:["f2","f4"],stats:{energyKwh:12.4,waterLiters:22.1,co2Kg:2.88},suggestions:[{id:"s1",featureId:"f1",patternType:"polling",status:"suggested",explanation:"Polls server every 2s. Switch to WebSocket push to eliminate 97% of redundant requests.",estimatedSavings:{energyKwh:4.4,waterLiters:7.9,co2Kg:1.02},savingsPercent:61}]},
{id:"f2",name:"User Feed",sustainabilityTier:"medium",complexityScore:48,dependencies:["f3"],stats:{energyKwh:8.2,waterLiters:14.8,co2Kg:1.91},suggestions:[{id:"s2",featureId:"f2",patternType:"n_plus_one",status:"suggested",explanation:"Fetches user profiles one at a time. Batch to reduce DB round-trips 90%.",estimatedSavings:{energyKwh:2.1,waterLiters:3.8,co2Kg:0.49},savingsPercent:45}]},
{id:"f3",name:"Authentication",sustainabilityTier:"low",complexityScore:28,dependencies:[],stats:{energyKwh:2.3,waterLiters:4.1,co2Kg:0.53},suggestions:[]},
{id:"f4",name:"Real-time Chat",sustainabilityTier:"high",complexityScore:72,dependencies:["f3","f5"],stats:{energyKwh:14.8,waterLiters:26.6,co2Kg:3.44},suggestions:[{id:"s3",featureId:"f4",patternType:"sync_blocking",status:"suggested",explanation:"Sync file I/O blocks event loop. Switch to async streams.",estimatedSavings:{energyKwh:5.6,waterLiters:10.1,co2Kg:1.31},savingsPercent:38}]},
{id:"f5",name:"Search Engine",sustainabilityTier:"medium",complexityScore:55,dependencies:["f3"],stats:{energyKwh:6.8,waterLiters:12.2,co2Kg:1.58},suggestions:[{id:"s4",featureId:"f5",patternType:"polling",status:"suggested",explanation:"Search re-queries on every keystroke without debouncing.",estimatedSavings:{energyKwh:2.8,waterLiters:5.0,co2Kg:0.65},savingsPercent:41}]},
{id:"f6",name:"File Upload",sustainabilityTier:"low",complexityScore:35,dependencies:["f3"],stats:{energyKwh:3.1,waterLiters:5.6,co2Kg:0.72},suggestions:[]},
{id:"f7",name:"Analytics Dashboard",sustainabilityTier:"medium",complexityScore:42,dependencies:["f2","f5"],stats:{energyKwh:5.4,waterLiters:9.7,co2Kg:1.26},suggestions:[]}
],totals:{energyKwh:53,waterLiters:95.1,co2Kg:12.32}};
function recompute(){a.totals=a.features.reduce((t,f)=>({energyKwh:t.energyKwh+f.stats.energyKwh,waterLiters:t.waterLiters+f.stats.waterLiters,co2Kg:t.co2Kg+f.stats.co2Kg}),{energyKwh:0,waterLiters:0,co2Kg:0});}
app.get("/results",(q,r)=>r.json(a));
app.post("/analyze",(q,r)=>{a.generatedAt=new Date().toISOString();r.status(202).json({status:"started"})});
app.post("/apply-suggestion",(q,r)=>{const{suggestionId}=q.body;for(const f of a.features){const s=(f.suggestions||[]).find(x=>x.id===suggestionId);if(s){s.status="applied";s.appliedAt=new Date().toISOString();f.stats.energyKwh=Math.max(0,f.stats.energyKwh-s.estimatedSavings.energyKwh);f.stats.waterLiters=Math.max(0,f.stats.waterLiters-s.estimatedSavings.waterLiters);f.stats.co2Kg=Math.max(0,f.stats.co2Kg-s.estimatedSavings.co2Kg);recompute();return r.json({suggestion:s,updatedTotals:a.totals})}}r.status(404).json({error:"Not found"})});
app.post("/dismiss-suggestion",(q,r)=>{const{suggestionId}=q.body;for(const f of a.features){const s=(f.suggestions||[]).find(x=>x.id===suggestionId);if(s){s.status="dismissed";return r.json({suggestionId})}}r.status(404).json({error:"Not found"})});
app.use(express.static(path.join(__dirname,"..","dashboard","dist","dashboard")));
app.listen(port,()=>console.log("Canopy backend on http://localhost:"+port));
