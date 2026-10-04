async page => {
  const context=await page.context().browser().newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const game=await context.newPage(),errors=[];game.on('pageerror',e=>errors.push(e.message));
  await game.goto('http://127.0.0.1:5177/?qa=1');
  await game.waitForFunction(()=>window.__katamariQa&&!document.getElementById('start').disabled);
  const endings=[];
  for(const island of ['oahu','lanai']){
    await game.evaluate(id=>window.__katamariQa.endingFixture(id),island);
    await game.getByRole('button',{name:'Admire your finished monstrosity'}).waitFor({state:'visible'});
    const state=await game.evaluate(()=>window.__katamariQa.state());
    if(state.mode!=='result'||state.chapters!==4||state.elapsed!==240||state.collected!==state.attachedPieces)throw new Error('The four-stage run did not end with its pieces retained');
    await game.screenshot({path:'outputs/playwright/'+island+'-ending-mobile.png'});
    await game.getByRole('button',{name:'Admire your finished monstrosity'}).click();
    await game.getByRole('button',{name:'Rotate camera 45 degrees'}).click();
    await game.waitForTimeout(300);
    const inspect=await game.evaluate(()=>window.__katamariQa.state());
    if(inspect.attachedPieces!==state.attachedPieces||inspect.mode!=='result')throw new Error('Finished pile changed during inspection');
    endings.push({island,state,inspect});
    if(island==='oahu'){
      await game.getByRole('button',{name:'Pause game'}).click();
      await game.locator('#next-island').click();
      const next=await game.evaluate(()=>window.__katamariQa.state());
      if(next.islandId!=='lanai'||next.mode!=='playing')throw new Error('Next-island navigation failed');
    }
  }
  await context.close();return{endings,errors};
}
