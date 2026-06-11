import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));

  try {
    console.log("Navigating to http://localhost:3000/ ...");
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 10000 });
    
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle0' });

    await page.type('#buid-input', 'BUID9999');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const noBtn = buttons.find(b => b.textContent.includes('cuenta'));
      if (noBtn) noBtn.click();
    });
    await new Promise(r => setTimeout(r, 200));

    await page.evaluate(() => {
      const form = document.querySelector('form');
      if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    });

    await page.waitForSelector('button', { timeout: 5000 });
    await new Promise(r => setTimeout(r, 1000));

    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const playBtn = buttons.find(b => b.textContent.includes('Jugar'));
      if (playBtn) playBtn.click();
    });

    await new Promise(r => setTimeout(r, 1000));

    const initialPos = await page.evaluate(() => {
      if (!window.phaserGame) return "No game instance";
      const scene = window.phaserGame.scene.keys['GameScene'];
      if (!scene || !scene.ball) return "No scene or ball";
      return { x: scene.ball.x, y: scene.ball.y, isPaused: scene.physics.world.isPaused };
    });
    console.log("Initial state:", initialPos);

    console.log("Clicking '¡ARRANCAR PARTIDA!' tutorial button...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const startBtn = buttons.find(b => b.textContent.includes('ARRANCAR'));
      if (startBtn) startBtn.click();
    });

    await new Promise(r => setTimeout(r, 200));

    const afterStartPos = await page.evaluate(() => {
      if (!window.phaserGame) return "No game instance";
      const scene = window.phaserGame.scene.keys['GameScene'];
      if (!scene || !scene.ball) return "No scene or ball";
      return { x: scene.ball.x, y: scene.ball.y, isPaused: scene.physics.world.isPaused, velocityY: scene.ball.body.velocity.y };
    });
    console.log("State after 200ms:", afterStartPos);

    console.log("Tracking ball fall and attempting collision...");
    for (let i = 0; i < 5; i++) {
      await new Promise(r => setTimeout(r, 200));
      const tracking = await page.evaluate(() => {
        if (!window.phaserGame) return "No game";
        const scene = window.phaserGame.scene.keys['GameScene'];
        if (!scene || !scene.ball) return "No scene/ball";
        scene.player.x = scene.ball.x;
        return {
          ballY: Math.round(scene.ball.y),
          ballX: Math.round(scene.ball.x),
          playerX: Math.round(scene.player.x),
          velocityY: Math.round(scene.ball.body.velocity.y),
          score: scene.score,
          isGameOver: scene.isGameOver
        };
      });
      console.log(`Frame ${i}:`, tracking);
    }
  } catch (err) {
    console.error("Test error:", err);
  } finally {
    await browser.close();
  }
})();
