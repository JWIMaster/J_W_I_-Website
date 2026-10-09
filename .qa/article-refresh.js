const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
(async()=>{
 const browser=await chromium.launch();
 try {
  for(const width of [536,1024]) {
   const page=await browser.newPage({viewport:{width,height:800},reducedMotion:'no-preference'});
   await page.goto('http://127.0.0.1:8123/swiftios6.html');
   await page.evaluate(()=>document.fonts.ready);
   await page.evaluate(()=>scrollTo({top:32,behavior:'instant'}));
   await page.waitForTimeout(1200);
   const measure=()=>page.evaluate(()=>({scroll:scrollY,title:document.querySelector('.page-head').offsetTop,lead:document.querySelector('[data-typewrite]').getBoundingClientRect().top}));
   const original=await measure();
   for(let i=0;i<8;i++) {
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForTimeout(80);
    const next=await measure();
    if(Object.keys(original).some(key=>Math.abs(original[key]-next[key])>1))throw new Error('Rapid refresh drift: '+JSON.stringify({original,next}));
   }
   await page.waitForTimeout(1200);
   const final=await measure();
   if(Object.keys(original).some(key=>Math.abs(original[key]-final[key])>1))throw new Error('Settled refresh drift');
   if(width===536){
    await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForTimeout(100);
    const streamed=await page.locator('.intro-stream').textContent();
    if(!streamed.length||streamed.length>=42)throw new Error('Not visibly typing');
    fs.mkdirSync(path.join(__dirname,'article-refresh'),{recursive:true});
    await page.screenshot({path:path.join(__dirname,'article-refresh/typing.png')});
   }
   await page.close();
  }
  console.log('PASS: eight rapid reloads without scroll resets at each width; stable title, lead and scroll position; visible typing');
 } finally {await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1});
