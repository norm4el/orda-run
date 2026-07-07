const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log(`[PAGE CONSOLE] ${msg.type()}: ${msg.text()}`));
  page.on('pageerror', error => console.log(`[PAGE ERROR] ${error.message}`));
  
  console.log("Navigating to http://localhost:5173/");
  try {
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  } catch (e) {
    console.error("Failed to load page:", e);
  }
  
  await browser.close();
})();
