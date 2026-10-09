const { chromium } = require('playwright');
(async()=>{
 const browser=await chromium.launch();
 try {
  for(const reducedMotion of ['no-preference','reduce']) for(const name of ['swiftios6.html','support.html','swiftonios6guidepart1.html','index.html']) {
   const page=await browser.newPage({viewport:{width:1024,height:900},reducedMotion});
   await page.goto('http://127.0.0.1:8123/'+name,{waitUntil:'domcontentloaded'});
   if(name==='index.html') {
    if(await page.evaluate(()=>document.getAnimations().some(a=>a.animationName==='page-title-arrive')))throw new Error('Home received title fade');
   } else {
    const title=page.locator(name.includes('guide')?'#wizard > .section-head':'.page-head');
    const initial=await title.evaluate(el => el.offsetTop);
    await page.waitForTimeout(100);
    const state=await title.evaluate(el=>({opacity:Number(getComputedStyle(el).opacity),animation:getComputedStyle(el).animationName,transform:getComputedStyle(el).transform}));
    if((state.animation==='rise')!==(reducedMotion==='no-preference'))throw new Error(name+': incorrect title animation');
    if(reducedMotion==='no-preference'&&!(state.opacity>0&&state.opacity<1))throw new Error(name+': no visible fade');
    await page.waitForTimeout(500);
    const final=await title.evaluate(el => el.offsetTop);
    if(Math.abs(initial-final)>1)throw new Error(name+': title moved');
   }
   await page.close();
  }
  console.log('PASS: matching Home title entrances with stable layout on all three pages; Home unchanged; reduced motion respected');
 } finally {await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1});
