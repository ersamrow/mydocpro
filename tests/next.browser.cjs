const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{
  const context=await browser.newContext();
  const page=await context.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const base=process.env.TEST_URL||'http://127.0.0.1:4173';
  await page.goto(base);await page.locator('#search').waitFor();
  assert.equal(await page.locator('.card').count(),16);
  await page.locator('#search').fill('merge');assert.equal(await page.locator('.card').count(),1);
  await page.goto(base+'/resize-image');await page.locator('#upload').setInputFiles(path.join(__dirname,'photo.png'));
  await page.locator('#unit').selectOption('px');await page.locator('#width').fill('100');await page.locator('#height').fill('120');
  await page.locator('#process').click();await page.locator('#outputs a[download]').waitFor();
  assert.deepEqual(await page.locator('#outputs img').evaluate(async im=>{await im.decode();return [im.naturalWidth,im.naturalHeight]}),[100,120]);
  await page.goto(base+'/merge-pdf');await page.locator('#upload').setInputFiles([path.join(__dirname,'one-page.pdf'),path.join(__dirname,'two-pages.pdf')]);
  await page.waitForFunction(()=>document.querySelectorAll('.page-thumbnail img').length===3&&document.querySelector('#output-summary')?.textContent&&!document.querySelector('#output-summary').textContent.includes('Loading'));
  await page.locator('#process').click();await page.locator('#outputs a[download]').waitFor();
  assert.ok(await page.locator('#outputs a').evaluate(async a=>(await (await fetch(a.href)).blob()).size>100));
  await page.waitForFunction(()=>document.querySelector('[data-app-status]')?.textContent==='Ready offline',{},{timeout:60000});
  await context.setOffline(true);
  await page.goto(base+'/compress-image?kb=20');await page.locator('#target').waitFor();assert.equal(await page.locator('#target').inputValue(),'20');
  await page.goto(base+'/help');await page.locator('.site-header').waitFor();assert.match(await page.locator('h1').innerText(),/help/i);
  await context.setOffline(false);
  assert.equal((await page.goto(base+'/does-not-exist')).status(),404);
  assert.deepEqual(errors,[]);
  console.log('Next.js: hydration, search, image processing, PDF processing, offline deep links and HTTP 404 passed.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
