import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  // Simular un móvil vertical (iPhone-ish)
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));
  page.on('requestfailed', request => console.log('BROWSER REQUEST FAILED:', request.url(), request.failure().errorText));

  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 10000 });
    
    // Auto-click the join and start buttons to get into the game
    console.log("Clicking 'UNIRSE AL TORNEO'...");
    
    // Type name
    await page.type('input', 'TEST');
    
    // Click join
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const joinBtn = buttons.find(b => b.textContent.includes('UNIRSE'));
      if (joinBtn) joinBtn.click();
    });
    
    await new Promise(r => setTimeout(r, 1000));
    
    console.log("Clicking 'INICIAR PARTIDA'...");
    // Click start
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const startBtn = buttons.find(b => b.textContent.includes('INICIAR'));
      if (startBtn) startBtn.click();
    });

    await new Promise(r => setTimeout(r, 1200));
    // Cerrar el tutorial
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const ok = buttons.find(b => b.textContent.includes('ENTENDIDO'));
      if (ok) ok.click();
    });
    await new Promise(r => setTimeout(r, 800));
    // Simular cambio de alto del viewport (barra de URL que se oculta en móvil)
    await page.setViewport({ width: 390, height: 760, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await new Promise(r => setTimeout(r, 400));
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await new Promise(r => setTimeout(r, 800));
    console.log("Waiting for game to initialize...");
    
    // Take a screenshot
    await page.screenshot({path: 'screenshot.png'});
    console.log("Screenshot saved to screenshot.png");

  } catch (err) {
    console.log('SCRIPT ERROR:', err.message);
  } finally {
    await browser.close();
  }
})();
