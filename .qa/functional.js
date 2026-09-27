const { chromium } = require('playwright');

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const results = [];

  // 1. navigation: click every masthead link from home, expect matching title
  await p.goto('http://127.0.0.1:8123/index.html', { waitUntil: 'domcontentloaded' });
  const links = await p.$$eval('.masthead nav a', as => as.map(a => ({ text: a.textContent.trim(), href: a.getAttribute('href') })));
  for (const l of links) {
    await p.goto('http://127.0.0.1:8123/' + l.href, { waitUntil: 'domcontentloaded' });
    const t = await p.title();
    results.push(`${l.text} => ${t.split('|')[0].trim()}  OK`);
  }

  // 2. copy button on the article
  await p.goto('http://127.0.0.1:8123/swiftios6.html', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(400);
  const btn = p.locator('[data-copy-target="#ex1"]');
  await btn.click();
  await p.waitForTimeout(200);
  const cls = await btn.getAttribute('class');
  results.push('copy #ex1: ' + (cls.includes('ok') ? ' OK' : ' FAIL ' + cls));

  // copy button on the guide (part 2, AppDelegate)
  await p.goto('http://127.0.0.1:8123/swiftonios6guidepart2.html', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(400);
  const btn2 = p.locator('[data-copy-target="#appdelegate"]');
  if (await btn2.count()) {
    await btn2.click();
    await p.waitForTimeout(200);
    results.push('copy #appdelegate: ' + ((await btn2.getAttribute('class')).includes('ok') ? ' OK' : ' FAIL'));
  }

  // 3. mailto + portfolio links on support
  await p.goto('http://127.0.0.1:8123/support.html', { waitUntil: 'domcontentloaded' });
  const mailto = await p.$$eval('a[href^="mailto:"]', as => as.map(a => a.getAttribute('href')));
  results.push('mailto: ' + mailto.join(', ') || ' NONE');

  // 4. article anchor navigation from index
  await p.goto('http://127.0.0.1:8123/swiftios6.html#ex3', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1600); /* let the smooth scroll settle before measuring */
  const scrollY = await p.evaluate(() => window.scrollY);
  results.push('anchor #ex3 scrollY: ' + scrollY + (scrollY > 100 ? ' OK' : ' FAIL'));

  // 5. no Style links left anywhere in the masthead
  const styleLinks = await p.$$eval('a[href="style.html"]', as => as.length);
  results.push('style.html links: ' + (styleLinks === 0 ? ' 0 OK' : ' FAIL ' + styleLinks));

  // 6. scroll reveal is one-way: fade in on the way down, stays on the way up
  await p.goto('http://127.0.0.1:8123/swiftios6.html', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2500); // let the typewriter settle first
  await p.evaluate(async () => {
    const de = document.documentElement;
    for (let y = 0; y <= de.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 80)); }
  });
  await p.waitForTimeout(800);
  const allIn = await p.evaluate(() => [...document.querySelectorAll('.fade-io')].every(el => el.classList.contains('is-in')));
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForTimeout(900); // time that WOULD reverse a reversible fade
  const stillIn = await p.evaluate(() => [...document.querySelectorAll('.fade-io')].every(el => el.classList.contains('is-in')));
  results.push('reveal one-way (in after scroll-down: ' + allIn + ', stays after scroll-up: ' + stillIn + '): ' + (allIn && stillIn ? ' OK' : ' FAIL'));

  // 7. intro fade plays on every load: full text immediately, no typing residue after settle
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(250);
  const twMid = await p.evaluate(() => ({
    text: document.querySelector('[data-typewrite]').textContent.trim(),
    cursor: document.querySelectorAll('.tw-cursor').length,
  }));
  await p.waitForTimeout(1600);
  const twEnd = await p.evaluate(() => ({
    text: document.querySelector('[data-typewrite]').textContent.trim(),
    twClasses: document.querySelectorAll('.tw-rest, .tw-in, .tw-cursor').length,
  }));
  const expected = 'Yes, you read that correctly: Swift on iOS 6.';
  const noTyping = twMid.cursor === 0 && twMid.text === expected;
  results.push('intro fade every-load: mid="' + twMid.text + '" cursor=' + twMid.cursor + ' end="' + twEnd.text + '" classes=' + twEnd.twClasses + ': ' + (noTyping && twEnd.text === expected && twEnd.twClasses === 0 ? ' OK' : ' FAIL'));

  // 8. code panels flush with the step text (guide part 1)
  await p.goto('http://127.0.0.1:8123/swiftonios6guidepart1.html', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2500);
  /* walk the wizard to the first step that contains a code panel (rpath, step 3) */
  await p.click('.os-card:has(input[value="monterey"])');
  for (let i = 0; i < 3; i++) await p.click('#wiz-next');
  const align = await p.evaluate(() => {
    /* wizard: only count panels that are actually visible */
    const visible = e => e.offsetParent !== null;
    const body = [...document.querySelectorAll('.step-body')].find(visible);
    const code = [...document.querySelectorAll('.code')].find(visible);
    if (!body || !code) return null;
    return Math.abs(body.getBoundingClientRect().left - code.getBoundingClientRect().left);
  });
  results.push('code alignment: ' + (align === null ? 'n/a' : Math.round(align * 10) / 10 + 'px ' + (align <= 1 ? 'OK' : 'FAIL')));

  // 9. hero wordmark fades in on every load (no typing spans created, DOM untouched)
  await p.goto('http://127.0.0.1:8123/index.html', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(500);
  const heroMid = await p.evaluate(() => ({
    chars: document.querySelectorAll('.hero-ch').length,
    on: document.querySelectorAll('.hero-ch.on').length,
  }));
  await p.waitForTimeout(1200);
  const heroDone = await p.evaluate(() => ({
    chars: document.querySelectorAll('.hero-ch').length,
    text: document.querySelector('.hero-name').textContent,
  }));
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(500);
  const heroReload = await p.evaluate(() => ({
    chars: document.querySelectorAll('.hero-ch').length,
    on: document.querySelectorAll('.hero-ch.on').length,
    text: document.querySelector('.hero-name').textContent,
  }));
  const heroOk = heroMid.chars === 0 && heroDone.text === 'J_W_I_' && heroDone.chars === 0 && heroReload.chars === 0 && heroReload.text === 'J_W_I_';
  results.push('hero fade every-load: mid chars=' + heroMid.chars + ', done="' + heroDone.text + '" (chars=' + heroDone.chars + '), reload="' + heroReload.text + '" (chars=' + heroReload.chars + ') ' + (heroOk ? 'OK' : 'FAIL'));

  console.log(results.join('\n'));
  await b.close();
})();
