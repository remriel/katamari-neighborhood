async page => {
  const context=await page.context().browser().newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const game=await context.newPage(),requests=[],errors=[];
  game.on('request',r=>requests.push(r.url()));game.on('pageerror',e=>errors.push(e.message));
  await game.goto('http://127.0.0.1:5177/?performance=1&qa=1');
  await game.waitForFunction(()=>window.__katamariQa&&!document.getElementById('start').disabled);
  const profiles=[];
  for(const island of ['oahu','lanai']){
    await game.evaluate(island=>window.__katamariQa.setScaleMeters(30,island),island);
    await game.waitForTimeout(2500);
    await game.evaluate(()=>{const qa=window.__katamariQa;qa.clearMetrics();qa.resume();qa.driveWorld(1,.15,true);});
    // No per-frame browser-observer traffic during the measured interval.
    await game.waitForTimeout(10000);
    const result=await game.evaluate(()=>({state:window.__katamariQa.state(),metrics:window.__katamariQa.metrics()}));
    if(result.state.collected!==result.state.renderedPieces||result.state.coreDiameterMeters!==.32)throw new Error('A rendered piece or the seed changed during the profile');
    profiles.push({island,...result});
  }
  const spriteRequests=requests.filter(u=>/\/prop-\d+\.webp/.test(u)),physicsRequests=requests.filter(u=>/rapier|compound-contact/.test(u));
  if(spriteRequests.length||physicsRequests.length)throw new Error('Legacy sprite or physics startup downloads returned');
  await game.evaluate(()=>{const qa=window.__katamariQa;qa.setScaleMeters(8,'oahu');qa.addTestAttachments([6,12,17,42,46]);qa.resume();qa.notice('pickup');});
  await game.waitForTimeout(1000);await game.keyboard.press('F3');
  await game.screenshot({path:'outputs/playwright/top-notice-mobile.png'});
  await game.evaluate(()=>window.__katamariQa.pause());
  await game.screenshot({path:'outputs/playwright/all-3d-pile-mobile.png'});
  await context.close();return{profiles,spriteRequests,physicsRequests,errors};
}
