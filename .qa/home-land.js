const {chromium}=require('playwright');
(async()=>{const browser=await chromium.launch();let checks=0;const check=(v,m)=>{checks++;if(!v)throw Error(m)};
try{for(const width of [320,390,1024,1440]){const page=await browser.newPage({viewport:{width,height:900}});await page.goto('http://127.0.0.1:8123/index.html',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('.toc a').getAnimations().length>0);
check(await page.locator('.toc a').first().evaluate(el=>getComputedStyle(el).animationName)==='home-fade','Missing gentle entrance');
check(await page.locator('.masthead').evaluate(el=>el.getAnimations({subtree:true}).length)===0,'Header animated');
const before=await page.locator('.hero').evaluate(el=>[el.offsetTop,el.offsetHeight]);
if(width===1024){await page.evaluate(()=>document.querySelectorAll('.hero-caption,.hero-tagline,.toc-title,.toc a,.hero-glyph').forEach(el=>el.getAnimations().forEach(a=>{a.pause();a.currentTime=260})));await page.screenshot({path:'/Users/jwalr/.codex/visualizations/2026/10/09/01a12278-606e-76a2-9ac6-a2470dcb8cd7/home-gentle-landing.png'});await page.evaluate(()=>document.querySelectorAll('.hero *').forEach(el=>el.getAnimations().forEach(a=>a.play())));}
await page.waitForTimeout(1000);check(JSON.stringify(before)===JSON.stringify(await page.locator('.hero').evaluate(el=>[el.offsetTop,el.offsetHeight])),'Hero layout shifts');
await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));await page.waitForTimeout(900);
check(await page.locator('.home-arrival').evaluateAll(els=>els.every(el=>el.classList.contains('is-in'))),'Skipped headings/footer remain hidden');
check(await page.locator('.index-row').evaluateAll(els=>els.every(el=>getComputedStyle(el).opacity==='1')),'Skipped rows remain hidden');
check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Horizontal overflow');await page.close();}
const page=await browser.newPage({reducedMotion:'reduce'});await page.goto('http://127.0.0.1:8123/index.html');check(await page.locator('.toc a').first().evaluate(el=>el.getAnimations().length)===0,'Reduced motion entrance');check(await page.locator('.home-arrival').first().evaluate(el=>getComputedStyle(el.firstElementChild).opacity)==='1','Reduced motion hides content');await page.goto('http://127.0.0.1:8123/photography.html');check(await page.locator('canvas').count()===0,'Photography retains bokeh');check(await page.locator('.page-head h1').innerText()==='Through the lens','Photography title lost');console.log('PASS: '+checks+' home motion, layout, viewport, skipped-scroll, reduced-motion and photography removal checks');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
