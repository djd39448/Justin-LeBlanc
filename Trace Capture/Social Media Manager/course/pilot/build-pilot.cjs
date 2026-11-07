#!/usr/bin/env node
/* Generate this pilot from the canonical Lesson 1 script and retained audio.
   Synthesis uses existing FAL_KEY. A failed/uncertain request is never retried automatically.
   Rendering is local and repeatable using retained audio and the HTML presentation. */
/* eslint @typescript-eslint/no-require-imports: "off" -- This retained production CLI is CommonJS, matching its .cjs extension and Node runtime. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { createRequire } = require('node:module');
const { pathToFileURL } = require('node:url');

const root = __dirname;
const courseRoot = path.resolve(root, '..');
const lessonPath = path.join(courseRoot, 'lessons', '01.html');
const projectRequire = createRequire(path.resolve(root, '../../../../package.json'));
const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
const ffprobe = process.env.FFPROBE_PATH || 'ffprobe';
const mode = process.argv[2] || 'render';
const visual = [
  ['One messy idea','A performer wants every inquiry in one reliable place.',['Emails, texts, and forms','What exactly should happen?','Fast assumptions can miss the goal']],
  ['Cloud → contract → code','Turn a raw idea into a shared agreement and a system you can evaluate.',['Cloud · the idea','Contract · the shared behavior','Code · the implementation']],
  ['Two loops','Conversations create alignment. Delivery turns an agreement into evidence.',['Conversation · understand','Delivery · build and verify','Return when new information changes the picture']],
  ['Start with a brain dump','Put the context and uncertainty on the table, in your own words.',['What frustrates you?','Who is involved?','What is still uncertain?']],
  ['Mirror the idea','Ask the agent to describe the goal, people, actions, and expected result.',['A visitor sends an inquiry','The performer sees what needs a reply','The owner corrects the readback']],
  ['The alignment gate','The owner confirms the experience before the architecture rests on it.',['Read back observable behavior','Correct wrong assumptions','Proceed from the stage already agreed']],
  ['Research reality','Distinguish what exists, what is planned, and what is still unknown.',['Verified fact','Planned behavior','Assumption or unknown']],
  ['Make decisions visible','Compare choices that change the design, then preserve why a choice was made.',['Options and tradeoffs','A clear choice and rationale','When to reopen the decision']],
  ['Architecture → specification','Describe how the pieces fit, then define the behavior that can be tested.',['Architecture · responsibilities','Workflow · behavior over time','Specification · observable acceptance']],
  ['Authorize the build','A kickoff tells a fresh agent what to do, what is allowed, and how to verify.',['Establish the baseline','Read the governing decisions','Respect the owner’s authorization']],
  ['Build in small slices','Deliver one complete, verifiable behavior at a time and document the result.',['Save a fictional inquiry','Show and change its status','Record progress and the next step']],
  ['Evidence has levels','Match the claim to the observation that actually supports it.',['Implemented → exists in code','Offline-tested → checked in isolation','Live-observed → seen in the real environment']],
  ['Your turn','Carry one small idea through the stages and make the next action clear.',['Capture and align','Design and authorize','Build, prove, and hand off']]
];

function ensure(p) { fs.mkdirSync(p,{recursive:true}); }
function digest(text) { return crypto.createHash('sha256').update(text).digest('hex'); }
function probe(file) { return Number(execFileSync(ffprobe,['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',file],{encoding:'utf8'}).trim()); }
function esc(value) { return value.replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'"); }
function loadScenes() {
  const html=fs.readFileSync(lessonPath,'utf8');
  const match=html.match(/<article[^>]*id="lecture-script"[^>]*>([\s\S]*?)<\/article>/i);
  if (!match) throw new Error('Canonical lecture-script article not found in lessons/01.html');
  const spoken=[...match[1].matchAll(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/gi)].map(x=>esc(x[1].replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim()));
  if (spoken.length!==visual.length) throw new Error(`Expected ${visual.length} canonical paragraphs; found ${spoken.length}. Reconcile scene mapping before synthesis.`);
  return spoken.map((text,i)=>({id:String(i+1).padStart(2,'0'),title:visual[i][0],visual:visual[i][1],points:visual[i][2],spoken:text}));
}
function timestamp(sec) { const n=Math.max(0,Math.round(sec*1000));const h=Math.floor(n/3600000),m=Math.floor(n/60000)%60,s=Math.floor(n/1000)%60,ms=n%1000;return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(ms).padStart(3,'0')}`; }
function alignWords(chunks) {
  if(!Array.isArray(chunks)) return [];
  let offset=0,last=0,word='',start=0,end=0,words=[];
  const flush=()=>{if(word.trim()) words.push({text:word.trim(),start,end});word='';};
  for(const chunk of chunks) {
    const chars=chunk.characters || chunk.chars || [];
    const starts=chunk.character_start_times_seconds || chunk.character_start_times || [];
    const ends=chunk.character_end_times_seconds || chunk.character_end_times || [];
    if(!chars.length || starts.length!==chars.length || ends.length!==chars.length) continue;
    if(Number(starts[0])+offset < last-.01) offset=last;
    chars.forEach((c,i)=>{const a=Number(starts[i])+offset,b=Number(ends[i])+offset;if(/\s/.test(c)) flush();else {if(!word)start=a;word+=c;end=b;}last=Math.max(last,b);});
  }
  flush();return words;
}
function vttCues(words) { let result=[],group=[]; const flush=()=>{if(group.length){result.push({start:group[0].start,end:group[group.length-1].end,text:group.map(x=>x.text).join(' ')});group=[];}}; for(const w of words){if(group.length && (group.map(x=>x.text).join(' ').length+w.text.length+1>58 || w.end-group[0].start>5)) flush();group.push(w);if(/[.!?]$/.test(w.text))flush();}flush();return result; }
function asVtt(cues) { return `WEBVTT\n\n${cues.map(c=>`${timestamp(c.start)} --> ${timestamp(Math.max(c.end,c.start+.2))}\n${c.text}\n`).join('\n')}`; }
function writePresentationData(scenes) { fs.writeFileSync(path.join(root,'scene-data.js'),`window.PILOT_SCENES = ${JSON.stringify(scenes.map(({id,title,visual,points})=>({id,title,visual,points})),null,2)};\n`); fs.writeFileSync(path.join(root,'transcript.md'),`# Lesson 1 transcript: The whole system\n\n${scenes.map(s=>`## ${s.title}\n\n${s.spoken}`).join('\n\n')}\n`); }
function getKey() {
  if(process.env.FAL_KEY) return process.env.FAL_KEY;
  const envPath=path.join(process.env.HOME,'ShortFactoryClaude','.env');
  const line=fs.readFileSync(envPath,'utf8').split(/\r?\n/).find(x=>/^\s*FAL_KEY\s*=/.test(x));
  if(!line) throw new Error('No existing FAL_KEY found.');
  return line.slice(line.indexOf('=')+1).trim().replace(/^(['"])(.*)\1$/,'$2');
}
async function synthesize(scenes) {
  const key=getKey();ensure(path.join(root,'audio'));ensure(path.join(root,'captions'));ensure(path.join(root,'alignment'));
  for(const scene of scenes) {
    const audio=path.join(root,'audio',`${scene.id}.mp3`),align=path.join(root,'alignment',`${scene.id}.json`);
    if(fs.existsSync(audio)&&fs.existsSync(align)) { const prior=JSON.parse(fs.readFileSync(align,'utf8'));if(prior.sourceSha256!==digest(scene.spoken)) throw new Error(`Scene ${scene.id} source changed since narration; reconcile before another paid request.`);console.log(`Scene ${scene.id}: retained audio and alignment`);continue; }
    if(fs.existsSync(audio)||fs.existsSync(align)) throw new Error(`Scene ${scene.id} has incomplete prior files; reconcile before another paid request.`);
    console.log(`Scene ${scene.id}: requesting Brian narration (${scene.spoken.length} characters)`);
    const response=await fetch('https://fal.run/fal-ai/elevenlabs/tts/multilingual-v2',{method:'POST',headers:{Authorization:`Key ${key}`,'Content-Type':'application/json'},body:JSON.stringify({text:scene.spoken,voice:'Brian',timestamps:true,stability:.5,similarity_boost:.8,style:.15}),signal:AbortSignal.timeout(180000)});
    if(!response.ok) throw new Error(`Scene ${scene.id}: fal returned HTTP ${response.status}. Do not retry without reconciling charge/effect.`);
    const data=await response.json();
    if(!data.audio?.url) throw new Error(`Scene ${scene.id}: no audio returned; reconcile request before retry.`);
    const url=new URL(data.audio.url); if(url.protocol!=='https:') throw new Error('Provider returned a non-HTTPS audio URL.');
    const audioResponse=await fetch(url,{signal:AbortSignal.timeout(120000)});
    if(!audioResponse.ok) throw new Error(`Scene ${scene.id}: audio download returned HTTP ${audioResponse.status}; reconcile before retry.`);
    const bytes=Buffer.from(await audioResponse.arrayBuffer());if(bytes.length<1000)throw new Error(`Scene ${scene.id}: empty audio; reconcile before retry.`);
    fs.writeFileSync(audio,bytes);fs.writeFileSync(align,JSON.stringify({sourceSha256:digest(scene.spoken),timestamps:data.timestamps || []}));
    const words=alignWords(data.timestamps); if(!words.length) { console.log(`Scene ${scene.id}: provider returned no usable alignment; captions need manual timing.`);continue; }
    fs.writeFileSync(path.join(root,'captions',`${scene.id}.vtt`),asVtt(vttCues(words)));
  }
}
async function render(scenes) {
  const {chromium}=projectRequire('playwright');
  for(const scene of scenes) {
    for(const kind of ['audio','alignment','captions']) {const ext=kind==='audio'?'mp3':kind==='alignment'?'json':'vtt';if(!fs.existsSync(path.join(root,kind,`${scene.id}.${ext}`))) throw new Error(`Missing ${kind} for scene ${scene.id}; resolve before rendering.`);}
    const prior=JSON.parse(fs.readFileSync(path.join(root,'alignment',`${scene.id}.json`),'utf8'));if(prior.sourceSha256!==digest(scene.spoken)) throw new Error(`Scene ${scene.id} source changed since narration; reconcile audio before rendering.`);
  }
  ensure(path.join(root,'frames'));ensure(path.join(root,'segments'));
  const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
  let offset=0,fullCues=[],manifest=[];
  try {for(let i=0;i<scenes.length;i++) {
    const scene=scenes[i],audio=path.join(root,'audio',`${scene.id}.mp3`),frame=path.join(root,'frames',`${scene.id}.png`),segment=path.join(root,'segments',`${scene.id}.mp4`);
    const duration=probe(audio);if(!Number.isFinite(duration)||duration<1)throw new Error(`Invalid duration: scene ${scene.id}`);
    await page.goto(`${pathToFileURL(path.join(root,'presentation.html')).href}?scene=${i}&capture=1`,{waitUntil:'load'});await page.screenshot({path:frame});
    const align=JSON.parse(fs.readFileSync(path.join(root,'alignment',`${scene.id}.json`),'utf8'));
    const cues=vttCues(alignWords(align.timestamps));if(!cues.length)throw new Error(`Missing alignment for scene ${scene.id}`);
    fullCues.push(...cues.map(c=>({start:c.start+offset,end:c.end+offset,text:c.text})));
    console.log(`Rendering scene ${scene.id} (${duration.toFixed(1)} seconds)`);
    const frames=Math.ceil(duration*15);
    execFileSync(ffmpeg,['-hide_banner','-loglevel','error','-y','-loop','1','-framerate','15','-i',frame,'-i',audio,'-vf',`scale=1400:788,zoompan=z='min(zoom+0.00015,1.06)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1280x720:fps=15,format=yuv420p`,'-t',String(duration),'-c:v','h264_videotoolbox','-b:v','650k','-c:a','aac','-b:a','96k','-movflags','+faststart',segment],{stdio:'inherit'});
    const segmentDuration=probe(segment);
    manifest.push({id:scene.id,title:scene.title,narrationSegmentId:scene.id,startMs:Math.round(offset*1000),endMs:Math.round((offset+segmentDuration)*1000),audio:`audio/${scene.id}.mp3`,accessibleDescription:scene.visual});
    offset+=segmentDuration;
  }} finally {await browser.close();}
  fs.writeFileSync(path.join(root,'captions.vtt'),asVtt(fullCues));
  fs.writeFileSync(path.join(root,'cues.json'),JSON.stringify({version:1,lesson:'01',generatedFrom:'../lessons/01.html#lecture-script',scenes:manifest},null,2)+'\n');
  fs.writeFileSync(path.join(root,'segments','concat.txt'),scenes.map(s=>`file '${s.id}.mp4'`).join('\n')+'\n');
  const intermediate=path.join(root,'segments','assembled.mp4');
  execFileSync(ffmpeg,['-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',path.join(root,'segments','concat.txt'),'-c','copy',intermediate],{stdio:'inherit'});
  execFileSync(ffmpeg,['-hide_banner','-loglevel','error','-y','-i',intermediate,'-i',path.join(root,'captions.vtt'),'-map','0:v:0','-map','0:a:0','-map','1:0','-c:v','copy','-c:a','copy','-c:s','mov_text','-metadata:s:s:0','language=eng','-movflags','+faststart',path.join(root,'lesson-01.mp4')],{stdio:'inherit'});
  console.log(`Done: lesson-01.mp4 (${probe(path.join(root,'lesson-01.mp4')).toFixed(1)} seconds).`);
}
async function main() { const scenes=loadScenes();writePresentationData(scenes);if(mode==='synthesize'||mode==='all')await synthesize(scenes);if(mode==='render'||mode==='all')await render(scenes); }
main().catch(err=>{console.error(`Pilot build stopped: ${err.message}`);process.exitCode=1;});
