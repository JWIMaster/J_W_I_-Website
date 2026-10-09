const { chromium } = require('playwright');
const path = require('path');
(async()=>{
 const browser=await chromium.launch();
 const page=await browser.newPage({viewport:{width:1024,height:800},reducedMotion:'no-preference'});
 await page.goto('http://127.0.0.1:8123/index.html');await page.evaluate(()=>document.fonts.ready);
 const clip=await page.locator('.hero-name').evaluate(el=>{const r=el.getBoundingClientRect();return{x:Math.max(0,r.x-16),y:Math.max(0,r.y-44),width:Math.min(380,r.width+32),height:r.height+76};});
 for(let i=0;i<24;i++){
  await page.evaluate(t=>document.getAnimations().forEach(a=>{a.pause();a.currentTime=a.animationName==='wordmark-land'?t:2000;}),i*50);
  await page.screenshot({path:path.join(__dirname,`frame-${String(i).padStart(2,'0')}.png`),clip});
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1});
