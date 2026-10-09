const { chromium } = require('playwright');
const { pathToFileURL } = require('url');
const path = require('path');
(async () => {
 const browser = await chromium.launch();
 try {
  for (const width of [320,390,768,1024,1440]) {
   const page = await browser.newPage({viewport:{width,height:900}});
   await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);
   if(await page.locator('.hero-orbit, .orbit-toggle, .hero-aside').count())throw new Error('Old sculpture still present');
   if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw new Error('Overflow '+width);
   const underscore = page.locator('.hero-name .u').first();
   if(!await underscore.evaluate(el=>el.getAnimations().some(a=>a.animationName==='underscore-shimmer'&&a.effect.getTiming().iterations===Infinity)))throw new Error('Missing shimmer');
   await page.emulateMedia({reducedMotion:'reduce'});
   if(await underscore.evaluate(el=>el.getAnimations().length))throw new Error('Reduced motion failed');
   if(await underscore.evaluate(el=>getComputedStyle(el).color)==='rgba(0, 0, 0, 0)')throw new Error('Reduced-motion wordmark invisible');
   await page.close();
  }
  console.log('PASS: clean home layout, continuous underscore shimmer and reduced motion at five widths');
 } finally { await browser.close(); }
})().catch(e=>{console.error(e.message);process.exitCode=1});
