async page => {
  const browser=page.context().browser();
  const mobile=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const phone=await mobile.newPage(),errors=[];
  phone.on('pageerror',error=>errors.push(error.message));
  await phone.goto('http://127.0.0.1:5177/?performance=1&qa=1');
  await phone.waitForFunction(()=>window.__katamariQa&&!document.getElementById('start').disabled);
  await phone.getByRole('button',{name:'Lānaʻi Town & wild highlands'}).click();
  await phone.getByRole('button',{name:'Roll Lānaʻi · 4 stages'}).click();
  const selection=await phone.evaluate(()=>window.__katamariQa.state());
  if(selection.islandId!=='lanai'||selection.mode!=='playing')throw new Error('Island selection did not start Lānaʻi');
  const fixtures=[];
  for(const island of ['oahu','lanai']){
    for(const meters of [.32,6,30,120,500,1800,2500]){
      await phone.evaluate(({meters,island})=>window.__katamariQa.setScaleMeters(meters,island),{meters,island});
      if(meters===30)await phone.evaluate(()=>window.__katamariQa.addTestAttachments([29,15,12,32,46,42]));
      if(meters===1800)await phone.evaluate(()=>window.__katamariQa.addTestAttachments([37,39,40,47,48,49]));
      await phone.waitForTimeout(1500);
      const fixture=await phone.evaluate(()=>({state:window.__katamariQa.state(),metrics:window.__katamariQa.metrics(),visible:window.__katamariQa.visible().length,errorVisible:!document.getElementById('error').classList.contains('hidden')}));
      if(fixture.errorVisible||fixture.state.coreDiameterMeters!==.32)throw new Error('Scale fixture failed');
      fixtures.push({island,meters,...fixture});
      if([30,1800].includes(meters)){
        await phone.keyboard.press('F3');
        await phone.screenshot({path:'outputs/playwright/'+island+'-'+meters+'m-mobile.png'});
        await phone.keyboard.press('F3');
      }
    }
    await phone.evaluate(island=>{window.__katamariQa.setScaleMeters(1200,island);window.__katamariQa.overview();},island);
    await phone.waitForTimeout(2200);
    await phone.keyboard.press('F3');
    await phone.screenshot({path:'outputs/playwright/'+island+'-island-mobile.png'});
    await phone.keyboard.press('F3');
  }
  await phone.evaluate(()=>{window.__katamariQa.setScaleMeters(8,'oahu');window.__katamariQa.addTestAttachments([6,12,17,42,46]);window.__katamariQa.resume();window.__katamariQa.notice('milestone');});
  await phone.waitForTimeout(800);
  await phone.keyboard.press('F3');
  await phone.screenshot({path:'outputs/playwright/top-notice-mobile.png'});
  const notice=await phone.evaluate(()=>{const box=document.getElementById('milestone').getBoundingClientRect();return{top:box.top,bottom:box.bottom,height:box.height,viewportHeight:innerHeight,dpr:devicePixelRatio,visible:document.getElementById('milestone').classList.contains('show')};});
  if(notice.bottom>90||!notice.visible||notice.dpr!==2)throw new Error('Mobile notice position or device scale failed');
  await mobile.close();
  return{selection,fixtures,notice,errors};
}
