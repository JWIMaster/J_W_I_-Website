const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const BASE = process.env.JWI_PREVIEW_BASE || 'http://127.0.0.1:8123/';
const OUT = path.join(__dirname, 'design-review');
const luminance = rgb => rgb.map(x => {x /= 255;return x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4;}).reduce((n,x,i)=>n+x*[.2126,.7152,.0722][i],0);
const ratio = (a,b) => {a=luminance(a);b=luminance(b);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);};
(async()=>{
 const browser=await chromium.launch(); fs.mkdirSync(OUT,{recursive:true});
 try {
  for(const width of [320,390,768,1024,1440]) for(const name of ['index.html','swiftios6.html','support.html','swiftonios6guidepart1.html']) {
   const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(BASE+name);await page.evaluate(()=>document.fonts.ready);
   const result=await page.evaluate(()=>{
    const c=getComputedStyle(document.documentElement);
    const hex=name=>{let s=c.getPropertyValue(name).trim().slice(1);return [0,2,4].map(i=>parseInt(s.slice(i,i+2),16));};
    return {overflow:document.documentElement.scrollWidth>innerWidth+1,ink:hex('--action-ink'),fill:hex('--action'),links:hex('--blue'),bg:hex('--surface-0'),buttons:[...document.querySelectorAll('.btn')].filter(e=>e.getClientRects().length).map(e=>{const r=e.getBoundingClientRect();return r.left>=-1&&r.right<=innerWidth+1;})};
   });
   if(result.overflow||result.buttons.some(ok=>!ok)||errors.length)throw new Error(`${name} @${width}: overflow or runtime errors`);
   if(ratio(result.ink,result.fill)<4.5||ratio(result.links,result.bg)<4.5)throw new Error('Poor palette contrast');
   if([390,1024].includes(width))await page.screenshot({path:path.join(OUT,`${width}-${name.replace('.html','')}.png`)});
   await page.close();
  }
  console.log('PASS: all four pages at five widths, button fit, primary/link contrast and no runtime errors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1});
