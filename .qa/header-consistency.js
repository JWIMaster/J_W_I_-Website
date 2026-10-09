const { chromium } = require('playwright');
const { pathToFileURL } = require('url');
const path = require('path');
const BASE = process.env.JWI_PREVIEW_BASE || 'http://127.0.0.1:8123/';
(async () => {
 const browser = await chromium.launch({ args: ['--disable-features=OverlayScrollbar'] });
 try {
  for (const width of [390,680,1024,1440]) {
   const page = await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
   const measure = () => page.evaluate(() => {
    const box = el => { const r = el.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height}; };
    return {header:box(document.querySelector('.masthead')),brand:box(document.querySelector('.brand')),nav:box(document.querySelector('.nav')), gutter:innerWidth-document.documentElement.clientWidth};
   });
   await page.goto(BASE+'swiftios6.html');
   await page.evaluate(() => scrollTo({top:600,behavior:'instant'}));
   await page.waitForTimeout(150);
   const before = await measure();
   await page.locator('.nav a[href="swiftonios6guidepart1.html"]').click();
   const after = await measure();
   console.log(width,JSON.stringify({before,after}));
   for(const el of ['header','brand','nav']) for(const dim of ['x','y','w','h']) if(Math.abs(before[el][dim]-after[el][dim])>0.5) throw new Error(`${el} ${dim} shifts at ${width}`);
   await page.close();
  }
  console.log('PASS: header stays in place across article-to-guide navigation');
 } finally {await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1});
