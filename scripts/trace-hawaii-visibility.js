async page => {
  const browser=page.context().browser(),context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const game=await context.newPage(),errors=[];
  game.on('pageerror',error=>errors.push(error.message));
  await game.goto('http://127.0.0.1:5177/?performance=1&qa=1');
  await game.waitForFunction(()=>window.__katamariQa&&!document.getElementById('start').disabled);
  const cases=[],selected=Number(await page.evaluate(()=>new URLSearchParams(location.search).get('trace')||0));
  const fixtures=[{island:'oahu',meters:.32,wide:false},{island:'lanai',meters:.32,wide:false},{island:'oahu',meters:30,wide:true},{island:'lanai',meters:30,wide:false}];
  for(const fixture of [fixtures[selected]]){
    await game.setViewportSize(fixture.wide?{width:1440,height:900}:{width:390,height:844});
    await game.evaluate(({island,meters})=>window.__katamariQa.setScaleMeters(meters,island),fixture);
    await game.waitForTimeout(2000);
    await game.evaluate(()=>{window.__katamariQa.clearMetrics();window.__katamariQa.resume();});
    const before=await game.evaluate(()=>({state:window.__katamariQa.state(),metrics:window.__katamariQa.metrics()}));
    let previous=[],interiorPops=[],checks=0,levels=new Set([before.state.scaleExponent]);
    const started=Date.now();
    while(Date.now()-started<12000){
      const sample=await game.evaluate(({previous,fixture})=>{
        const qa=window.__katamariQa,state=qa.state(),visible=qa.visible(),ids=new Set(visible.map(i=>i.id));
        const missing=previous.filter(i=>i.pixels>=5&&Math.abs(i.ndc[0])<.8&&Math.abs(i.ndc[1])<.8&&!ids.has(i.id));
        const pops=qa.inspectItems(missing).filter(i=>!i.collected&&i.pixels>=5&&Math.abs(i.ndc[0])<.8&&Math.abs(i.ndc[1])<.8&&i.ndc[2]>-1&&i.ndc[2]<1);
        if(fixture.meters===.32){const target=qa.nearby()[0];if(target)qa.driveWorld(target.x-state.x,target.z-state.z,true);}
        else qa.driveWorld(1,.15,true);
        return{visible,pops,state};
      },{previous,fixture});
      previous=sample.visible;interiorPops.push(...sample.pops);levels.add(sample.state.scaleExponent);checks++;
      if(sample.state.collected!==sample.state.attachedPieces)throw new Error('Collected objects disappeared from pile');
      if(sample.state.mode!=='playing')throw new Error('Run ended unexpectedly during trace');
      if(fixture.meters===.32&&sample.state.normalizedDiameter*2**sample.state.scaleExponent>3)throw new Error('Runaway early growth');
      await game.waitForTimeout(100);
    }
    await game.evaluate(()=>window.__katamariQa.driveWorld(0,0,false));
    const after=await game.evaluate(()=>({state:window.__katamariQa.state(),metrics:window.__katamariQa.metrics()}));
    await game.keyboard.press('F3');
    await game.screenshot({path:'outputs/playwright/'+fixture.island+'-'+fixture.meters+'m-trace.png'});
    await game.keyboard.press('F3');
    cases.push({fixture,before,after,checks,levels:[...levels],interiorPops});
  }
  await context.close();
  return{cases,errors};
}
