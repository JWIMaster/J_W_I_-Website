const { chromium } = require('playwright');
(async () => {
 const browser = await chromium.launch();
 try {
  for (const reducedMotion of ['no-preference','reduce']) {
   const page = await browser.newPage({viewport:{width:1024,height:900},reducedMotion});
   await page.goto('http://127.0.0.1:8123/index.html');
   await page.locator('.nav a[href="swiftios6.html"]').click();
   const start = await page.evaluate(() => {
    const heading = document.querySelector('.page-head');
    const sheet = document.querySelector('.sheet');
    return { top:heading.offsetTop, sheetTop:sheet.getBoundingClientRect().top, animation:getComputedStyle(heading).animationName, transform:getComputedStyle(heading).transform };
   });
   if ((start.animation==='rise') !== (reducedMotion==='no-preference')) throw new Error('Incorrect article entrance');
   await page.waitForTimeout(550);
   const finish = await page.evaluate(() => ({top:document.querySelector('.page-head').offsetTop,sheetTop:document.querySelector('.sheet').getBoundingClientRect().top,typing:document.querySelector('[data-typewrite]').classList.contains('tw-typing'),opacity:getComputedStyle(document.querySelector('.page-head')).opacity}));
   if(Math.abs(start.top-finish.top)>1||Math.abs(start.sheetTop-finish.sheetTop)>1||finish.typing||finish.opacity!=='1')throw new Error('Article shifted or typing too slow');
   await page.close();
  }
  console.log('PASS: navigation entrance fades without movement; typing finishes quickly; reduced motion respected');
 } finally {await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1});
