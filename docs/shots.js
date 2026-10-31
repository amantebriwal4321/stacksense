const {chromium}=require('/workspace/promptwars05/rec/node_modules/playwright');
(async()=>{const b=await chromium.launch();const pg=await b.newPage({viewport:{width:1500,height:950}});
await pg.goto('https://stacksense-aman.vercel.app');await pg.waitForTimeout(1200);
for(const p of ['startup','ml','bank','chat','onprem','broke']){await pg.click(`button[data-p=${p}]`);await pg.waitForTimeout(400);
 await pg.evaluate(()=>document.querySelectorAll('details').forEach(d=>d.open=true));
 await pg.locator('#out').screenshot({path:`shots/${p}.png`});}
await b.close()})();
