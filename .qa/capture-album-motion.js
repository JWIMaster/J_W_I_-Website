const {chromium}=require('playwright');
const fs=require('fs');
const out='/Users/jwalr/.codex/visualizations/2026/10/09/01a12278-606e-76a2-9ac6-a2470dcb8cd7/album-motion';
(async()=>{
 fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch();
 try{
  const page=await browser.newPage({viewport:{width:1024,height:1400}});
  await page.goto('http://127.0.0.1:8123/photography.html');await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(900);
  const panel=page.locator('.photo-details').nth(1),summary=panel.locator('summary');
  const clip=await page.locator('.photo-album').nth(1).evaluate(el=>{
   const r=el.getBoundingClientRect(),caption=el.querySelector('.photo-caption').getBoundingClientRect();
   return {x:Math.floor(r.x-12),y:Math.floor(caption.y-12),width:Math.ceil(r.width+24),height:410};
  });
  let frame=0;
  async function shot(){await page.screenshot({path:`${out}/${String(frame++).padStart(2,'0')}.png`,clip});}
  await shot();await shot();
  async function sample(duration){
   await summary.click();
   await panel.evaluate(el=>el.getAnimations({subtree:true}).forEach(a=>a.pause()));
   for(let t=0;t<=duration;t+=40){
    await panel.evaluate((el,t)=>el.getAnimations({subtree:true}).forEach(a=>a.currentTime=Math.min(t,a.effect.getTiming().duration)),t);
    await shot();
   }
   await panel.evaluate(el=>el.getAnimations({subtree:true}).forEach(a=>a.finish()));
   await page.waitForTimeout(50);
  }
  await sample(360);for(let i=0;i<6;i++)await shot();
  await sample(280);await shot();await shot();
  console.log(out);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
