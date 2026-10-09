const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const BASE = 'http://127.0.0.1:8123/';
const OUT = '/Users/jwalr/.codex/visualizations/2026/10/09/01a12278-606e-76a2-9ac6-a2470dcb8cd7';
(async () => {
 const browser = await chromium.launch();
 let checks = 0;
 const check = (ok, label) => { checks++; if(!ok) throw new Error(label); };
 try {
  for(const width of [320,390,768,1024,1440]) {
   const page = await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   const headers=[];
   for(const name of ['index.html','swiftios6.html','swiftonios6guidepart1.html','support.html','photography.html']) {
    await page.goto(BASE+name); await page.evaluate(()=>document.fonts.ready);
    const geometry=await page.evaluate(()=>{
     const r=document.querySelector('.masthead').getBoundingClientRect();
     const active=document.querySelector('.nav a[aria-current]');
     const a=active.getBoundingClientRect(),n=document.querySelector('.nav').getBoundingClientRect();
     return {x:r.x,y:r.y,w:r.width,h:r.height,overflow:document.documentElement.scrollWidth>innerWidth+1,activeVisible:a.left>=n.left-1&&a.right<=n.right+1,links:document.querySelectorAll('.nav a').length};
    });
    check(!geometry.overflow,`${name}: overflow at ${width}`);
    check(geometry.activeVisible,`${name}: active nav clipped at ${width}`);
    check(geometry.links===5,`${name}: missing photography nav`);
    headers.push(geometry);
   }
   for(const h of headers)for(const key of ['x','y','w','h'])check(Math.abs(h[key]-headers[0][key])<.5,`Header ${key} differs at ${width}`);
   check(await page.locator('.photo-album').count()===3,'Wrong album count');
   check(await page.locator('.photo-details[open]').count()===0,'Metadata not initially collapsed');
   const covers=await page.locator('.photo-cover').evaluateAll(els=>els.map(el=>el.getBoundingClientRect().height));
   check(covers.every(h=>h>100),'Cover layout not reserved');
   // Use keyboard, not just pointer, to open and close native details.
   const summary=page.locator('.photo-details summary').first();
   await summary.focus();await page.keyboard.press('Enter');
   check(await page.locator('.photo-details[open]').count()===1,'Keyboard disclosure failed');
   check((await page.locator('.photo-details[open] dd').allTextContents()).includes('4'),'Incorrect real Portraits count');
   await page.keyboard.press('Enter');
   check(await page.locator('.photo-details[open]').count()===0,'Disclosure does not close');
   check(errors.length===0,'Runtime errors');
   if([390,1440].includes(width)) {
    await page.locator('.photo-cover img').first().evaluate(img=>img.decode());
    await page.locator('.photo-section-head').click();
    await page.screenshot({path:path.join(OUT,`photography-${width}.png`),fullPage:true});
    if(width===1440) {
     await page.locator('.photo-details summary').nth(1).click();
     await page.screenshot({path:path.join(OUT,'photography-details.png'),fullPage:true});
    }
   }
   await page.close();
  }
  const page=await browser.newPage({viewport:{width:1024,height:900}});
  await page.route('https://images.pixieset.com/**',route=>route.abort());
  await page.goto(BASE+'photography.html');
  await page.waitForTimeout(400);
  check(await page.locator('.photo-cover.is-unavailable').count()>=1,'Image failure not handled');
  check(await page.locator('.photo-album .photo-link').first().isVisible(),'Broken image removes gallery link');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.locator('.photo-link').first().hover();
  check(await page.locator('.photo-cover img').first().evaluate(el=>getComputedStyle(el).transform==='none'),'Reduced-motion cover still moves');
  await page.close();
  const nojs=await browser.newPage({javaScriptEnabled:false,viewport:{width:390,height:844}});
  await nojs.goto(BASE+'photography.html');
  check(await nojs.locator('.photo-album').count()===3,'No-JS album content missing');
  await nojs.locator('.photo-details summary').first().click();
  check(await nojs.locator('.photo-details[open]').count()===1,'No-JS details unusable');
  await nojs.close();
  console.log(`PASS: ${checks} photography and shared-nav checks, five widths, keyboard/no-JS details, image failures and reduced motion`);
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
