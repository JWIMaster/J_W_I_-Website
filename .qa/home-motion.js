const { chromium } = require('playwright');
const { pathToFileURL } = require('url');
const path = require('path');
(async () => {
 const browser = await chromium.launch();
 try {
  for (const width of [320,390,768,1024,1440]) {
   const page = await browser.newPage({viewport:{width,height:900}});
   await page.goto('http://127.0.0.1:8123/index.html');
   if(await page.locator('.hero-orbit, .orbit-toggle, .hero-aside').count())throw new Error('Old sculpture still present');
   if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw new Error('Overflow '+width);
   const glyphs = page.locator('.hero-glyph');
   if(await glyphs.count()!==6)throw new Error('Missing wordmark letters');
   const initialHeight=await page.locator('.hero-name').evaluate(el=>el.offsetHeight);
   const delays=await glyphs.evaluateAll(els=>els.map(el=>getComputedStyle(el).animationDelay));
   if(delays[0]===delays[5])throw new Error('No stagger');
   await page.waitForTimeout(1100);
   if(await page.locator('.hero-name').evaluate(el=>el.offsetHeight)!==initialHeight)throw new Error('Wordmark layout moved');
   if(await glyphs.evaluateAll(els=>els.some(el=>!['none','matrix(1, 0, 0, 1, 0, 0)'].includes(getComputedStyle(el).transform))))throw new Error('Letters did not settle');
   const underscore = page.locator('.hero-name .u').first();
   if(!await underscore.evaluate(el=>el.getAnimations().some(a=>a.animationName==='underscore-shimmer'&&a.effect.getTiming().iterations===Infinity)))throw new Error('Missing shimmer');
   await page.emulateMedia({reducedMotion:'reduce'});
   if(await underscore.evaluate(el=>el.getAnimations().length))throw new Error('Reduced motion failed');
   if(await underscore.evaluate(el=>getComputedStyle(el).color)==='rgba(0, 0, 0, 0)')throw new Error('Reduced-motion wordmark invisible');
   await page.close();
  }
  console.log('PASS: clean home layout, staggered letter landing, stable layout, continuous underscore shimmer and reduced motion at five widths');
 } finally { await browser.close(); }
})().catch(e=>{console.error(e.message);process.exitCode=1});
