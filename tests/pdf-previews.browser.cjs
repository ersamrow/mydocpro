const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');

(async () => {
 const browser = await chromium.launch({headless:true, ...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {})});
 try {
  const page = await browser.newPage();
  const errors=[];
  page.on('pageerror', error=>errors.push(error.message));
  for (const tool of ['organize-pdf','compress-pdf','pdf-to-image','split-pdf','merge-pdf']) {
   await page.goto(`${process.env.TEST_URL || 'http://127.0.0.1:4173'}/${tool}`);
   await page.locator('#upload').setInputFiles([path.join(__dirname,'two-pages.pdf'), ...(tool==='merge-pdf' ? [path.join(__dirname,'one-page.pdf')] : [])]);
   await page.waitForFunction(()=>document.querySelector('#output-summary')?.textContent && !document.querySelector('#output-summary').textContent.includes('Loading'));
   assert.equal(await page.locator('.page-thumbnail img').count(), tool==='merge-pdf' ? 3 : 2);
   assert.equal(await page.locator('#process').isEnabled(),true);
   if(tool==='compress-pdf') {
    assert.equal(await page.locator('.page-toolbar').isVisible(),false);
    assert.equal(await page.locator('.page-move-controls').first().isVisible(),false);
   }
   if(tool==='organize-pdf') {
    await page.getByRole('button',{name:'Move two-pages.pdf page 2 earlier',exact:true}).click();
    assert.equal(await page.locator('#pages').inputValue(),'2, 1');
    await page.getByRole('checkbox',{name:'Select page 1',exact:true}).uncheck();
    assert.equal(await page.locator('#pages').inputValue(),'2');
    await page.locator('#rotation').selectOption('90');
    assert.match(await page.locator('.page-thumbnail img').first().getAttribute('style'),/rotate\(90deg\)/);
    await page.getByRole('button',{name:'Deselect all',exact:true}).click();
    assert.equal(await page.locator('#process').isDisabled(),true);
    await page.getByRole('button',{name:'↶ Undo',exact:true}).click();
    assert.equal(await page.locator('#pages').inputValue(),'2');
   }
   await page.locator('.thumbnail-image').first().click();
   await page.locator('.page-zoom-dialog canvas').waitFor();
   await page.getByRole('button',{name:'Close',exact:true}).click();
   console.log(`${tool}: thumbnails, controls and zoom passed`);
  }
  assert.deepEqual(errors,[]);
 } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
