const {chromium}=require('playwright');
const BASE='http://127.0.0.1:8123/';
(async()=>{
 const browser=await chromium.launch(); let checks=0;
 const check=(ok,label)=>{checks++;if(!ok)throw new Error(label);};
 try {
  for(const width of [390,1024]) {
   const page=await browser.newPage({viewport:{width,height:900}});
   await page.goto(BASE+'index.html');
   await page.locator('.nav a[href="photography.html"]').click();
   const title=page.locator('.page-head h1');
   const top=await title.evaluate(el=>el.offsetTop);
   check(await page.locator('.page-head').evaluate(el=>getComputedStyle(el).animationName)==='rise','Missing shared title entrance');
   await page.waitForTimeout(800);
   check(await title.evaluate(el=>el.offsetTop)===top,'Title moved during entry');
   const panel=page.locator('.photo-details').first(), summary=panel.locator('summary');
   await summary.scrollIntoViewIfNeeded();await page.waitForTimeout(400);
   const height=()=>panel.evaluate(el=>el.getBoundingClientRect().height);
   const closed=await height();
   await summary.click();await page.waitForTimeout(65);
   const opening=await height();
   await page.waitForTimeout(400);const open=await height();
   check(closed<opening&&opening<open,'Details hard-cut instead of expanding');
   check(await panel.evaluate(el=>el.open&&!el.style.height&&!el.querySelector('.photo-detail-body').inert),'Open panel did not settle');
   await summary.click();await page.waitForTimeout(65);
   check(await panel.evaluate(el=>el.open&&el.querySelector('.photo-detail-body').inert),'Closing content not rendered/inert until animation ends');
   const closing=await height();check(closing<open&&closing>closed,'Details hard-cut instead of collapsing');
   await page.waitForTimeout(350);
   check(await panel.evaluate(el=>!el.open&&!el.style.height),'Close did not settle');
   for(let i=0;i<7;i++){await summary.click();await page.waitForTimeout(35);}
   await page.waitForTimeout(400);
   check(await panel.evaluate(el=>el.open&&!el.style.height&&!el.querySelector('.photo-detail-body').inert),'Rapid reversals left panel stuck');
   await summary.click();await page.waitForTimeout(30);
   await page.emulateMedia({reducedMotion:'reduce'});
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   check(await panel.evaluate(el=>!el.open&&!el.style.height&&el.getAnimations().length===0),'Changing motion preference left animation active');
   await summary.focus();await page.keyboard.press('Enter');
   check(await panel.evaluate(el=>el.open&&!el.style.height),'Reduced-motion native keyboard open failed');
   await page.keyboard.press('Enter');
   check(await panel.evaluate(el=>!el.open),'Reduced-motion native keyboard close failed');
   // Reload at the top repeatedly without resetting scroll between reloads.
   await page.emulateMedia({reducedMotion:'no-preference'});
   await page.goto(BASE+'photography.html');await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(800);
   const baseline=await page.evaluate(()=>({y:scrollY,top:document.querySelector('.page-head').offsetTop}));
   for(let i=0;i<4;i++) {
    await page.reload();await page.waitForTimeout(80);
    const current=await page.evaluate(()=>({y:scrollY,top:document.querySelector('.page-head').offsetTop}));
    check(current.y===baseline.y&&current.top===baseline.top,'Reload drift during photography entrance');
   }
   await page.close();
  }
  // Every page retains an authored title entrance.
  const p=await browser.newPage({viewport:{width:1024,height:900}});
  for(const [name,selector,animation] of [['index.html','.hero-glyph','wordmark-land'],['swiftios6.html','.page-head','rise'],['support.html','.page-head','rise'],['swiftonios6guidepart1.html','#wizard > .section-head','rise'],['photography.html','.page-head','rise']]) {
   await p.goto(BASE+name);
   check((await p.locator(selector).first().evaluate(el=>getComputedStyle(el).animationName)).includes(animation),'Missing title animation: '+name);
  }
  await p.close();
  console.log(`PASS: ${checks} checks for page-entry motion, smooth expansion/collapse, rapid reversals, keyboard/reduced motion and reload stability`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1});
