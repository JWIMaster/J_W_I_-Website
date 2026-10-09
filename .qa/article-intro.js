const { chromium } = require('playwright');
const URL = 'http://127.0.0.1:8123/swiftios6.html';
(async()=>{
 const browser=await chromium.launch();
 try{
  for(const width of [390,1024]){
   const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'no-preference'});
   await page.goto(URL,{waitUntil:'domcontentloaded'});
   const lead=page.locator('[data-typewrite]');
   const initial=await lead.boundingBox();
   await page.waitForTimeout(80);
   const partial=await lead.locator('.intro-stream').textContent();
   if(!partial.length||partial.length>=42)throw new Error('Lead is not streaming');
   if(await page.locator('.prose > p').nth(1).evaluate(el=>getComputedStyle(el).opacity)!=='0')throw new Error('Article appeared before lead finished');
   await page.waitForTimeout(350);
   const reveal = await page.locator('.prose > p').evaluateAll(els => els.slice(1,3).map(el => Number(getComputedStyle(el).opacity)));
   if (!(reveal[0] > 0 && reveal[0] < 1 && reveal[1] < reveal[0])) throw new Error('Article reveal does not fade and stagger');
   await page.waitForTimeout(650);
   if(await lead.locator('.intro-copy').textContent()!=='Yes, you read that correctly: Swift on iOS 6.')throw new Error('Lead not restored');
   const final=await lead.boundingBox();
   if(Math.abs(initial.height-final.height)>1)throw new Error('Typing caused layout shift');
   if(await page.locator('.tw-rest,.tw-typing').count())throw new Error('Intro did not clean up');
   if(await page.locator('.prose > p').nth(1).evaluate(el=>getComputedStyle(el).opacity)!=='1')throw new Error('Article not revealed');
   await page.reload({waitUntil:'domcontentloaded'});
   await page.mouse.wheel(0, 400);
   await page.waitForTimeout(100);
   if(await page.locator('.tw-typing').count())throw new Error('Scroll did not finish intro');
   await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
   for (let refresh=0;refresh<3;refresh++) {
     await page.reload({waitUntil:'domcontentloaded'});
     const box=await lead.boundingBox();
     await page.evaluate(()=>{dispatchEvent(new Event('scroll'));document.dispatchEvent(new Event('visibilitychange'));});
     await page.waitForTimeout(80);
     const streamed=await lead.locator('.intro-stream').textContent();
     if(!streamed.length||!await lead.evaluate(el=>el.classList.contains('tw-typing')))throw new Error('Refresh cancelled typing');
     await page.waitForTimeout(900);
     const after=await lead.boundingBox();
     if(Math.abs(box.y-after.y)>1||Math.abs(box.height-after.height)>1)throw new Error('Refresh shifted lead');
   }
   await page.emulateMedia({reducedMotion:'reduce'});
   await page.reload({waitUntil:'domcontentloaded'});
   if(await page.locator('.tw-typing,.tw-rest').count())throw new Error('Reduced motion still streams');
   await page.close();
  }
  console.log('PASS: progressive typing, reserved layout, quick article reveal, user scroll interruption, repeated refresh stability and reduced motion');
 }finally{await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1});
