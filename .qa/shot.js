/* Full-site visual audit: every page × 10 viewports.
   Captures full-page shots at key widths, collects overflow, console
   errors, failed requests, offscreen elements, broken images. */
const { chromium } = require('playwright');
const fs = require('fs');

const BASE = 'http://127.0.0.1:8123';
const PAGES = ['index.html', 'swiftios6.html', 'swiftonios6guidepart1.html', 'swiftonios6guidepart2.html', 'support.html'];
const VIEWS = [
  { name: 'm320', w: 320, h: 568 },
  { name: 'm375', w: 375, h: 812, full: true },
  { name: 'm390', w: 390, h: 844, full: true },
  { name: 'm430', w: 430, h: 932 },
  { name: 't768', w: 768, h: 1024, full: true },
  { name: 'l1024', w: 1024, h: 768 },
  { name: 'd1280', w: 1280, h: 800, full: true },
  { name: 'd1440', w: 1440, h: 900, full: true },
  { name: 'd1728', w: 1728, h: 1117 },
  { name: 'd1920', w: 1920, h: 1080, full: true },
  { name: 'w2560', w: 2560, h: 1080 },
];

fs.mkdirSync('shots', { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const report = [];
  for (const page of PAGES) {
    for (const v of VIEWS) {
      const ctx = await browser.newContext({
        viewport: { width: v.w, height: v.h },
        deviceScaleFactor: v.w < 500 ? 2 : 1,
      });
      const p = await ctx.newPage();
      const consoleErrs = [];
      const failed = [];
      p.on('console', (m) => { if (m.type() === 'error') consoleErrs.push(m.text().slice(0, 200)); });
      p.on('pageerror', (e) => consoleErrs.push('pageerror: ' + e.message.slice(0, 200)));
      p.on('requestfailed', (r) => failed.push(r.url().slice(0, 160)));

      try {
        await p.goto(BASE + '/' + page, { waitUntil: 'networkidle', timeout: 30000 });
      } catch (e) {
        report.push({ page, view: v.name, fatal: 'goto: ' + e.message.slice(0, 120) });
        await ctx.close();
        continue;
      }
      await p.evaluate(() => (document.fonts ? document.fonts.ready : Promise.resolve())).catch(() => {});
      await p.waitForTimeout(400);

      // Trigger lazy images by scrolling through the document first.
      await p.evaluate(async () => {
        const de = document.documentElement;
        for (let y = 0; y <= de.scrollHeight; y += 600) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 100));
        }
        window.scrollTo(0, 0);
        for (const i of document.images) { if (!i.complete) i.loading = 'eager'; }
      });
      await p.waitForTimeout(1500);

      const m = await p.evaluate(() => {
        const de = document.documentElement;
        const overflowX = de.scrollWidth - de.clientWidth;
        const inScroller = (el) => {
          let a = el.parentElement;
          while (a) {
            const cs = getComputedStyle(a);
            if ((cs.overflowX === 'auto' || cs.overflowX === 'scroll') && a.scrollWidth > a.clientWidth + 1) return true;
            a = a.parentElement;
          }
          return false;
        };
        const out = [];
        document.querySelectorAll('body *').forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && (r.right > de.clientWidth + 1 || r.left < -1) && !inScroller(el)) {
            out.push(el.tagName + '.' + String(el.className).slice(0, 32) + ' l=' + Math.round(r.left) + ' r=' + Math.round(r.right));
          }
        });
        const imgs = [...document.images].map((i) => ({
          src: (i.getAttribute('src') || '').slice(0, 60),
          ok: i.complete && i.naturalWidth > 0,
        }));
        return {
          overflowX,
          pageH: de.scrollHeight,
          offscreen: out.slice(0, 12),
          brokenImgs: imgs.filter((i) => !i.ok).map((i) => i.src),
        };
      });

      const suffix = v.full ? 'full' : 'top';
      await p.screenshot({ path: `shots/${page.replace('.html', '')}_${v.name}_${suffix}.png`, fullPage: !!v.full });

      if (m.overflowX > 0 || consoleErrs.length || failed.length || m.offscreen.length || m.brokenImgs.length) {
        report.push({ page, view: v.name, overflowX: m.overflowX, pageH: m.pageH, console: consoleErrs.slice(0, 6), failed: failed.slice(0, 6), offscreen: m.offscreen, brokenImgs: m.brokenImgs });
      }
      await ctx.close();
    }
  }
  await browser.close();
  fs.writeFileSync('report.json', JSON.stringify(report, null, 2));
  console.log(report.length ? JSON.stringify(report, null, 2) : 'ALL_CLEAN');
})().catch((e) => { console.error(e); process.exit(1); });
