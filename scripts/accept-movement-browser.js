async page => {
  const context=await page.context().browser().newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const game=await context.newPage(),errors=[];game.on('pageerror',error=>errors.push(error.message));
  await game.goto('http://127.0.0.1:5177/?performance=1&qa=1');
  await game.waitForFunction(()=>window.__katamariQa&&!document.getElementById('start').disabled);
  const movement=[];
  for(const kind of ['corridor','corner','reverse','cadence']){
    const before=await game.evaluate(kind=>{const qa=window.__katamariQa;qa.navigationFixture(kind);qa.resume();return qa.state();},kind);
    // Exercise real input events and pointer capture, not just a simulation call.
    const joy=await game.locator('#joystick').boundingBox(),x=joy.x+joy.width/2,y=joy.y+joy.height/2;
    await game.mouse.move(x,y);await game.mouse.down();await game.mouse.move(x,y+joy.width*.3);
    await game.keyboard.down('Shift');
    await game.waitForTimeout(kind==='cadence'?250:kind==='corner'?6000:4000);
    const atTurn=kind==='reverse'?await game.evaluate(()=>window.__katamariQa.state()):null;
    if(kind==='reverse'){await game.mouse.move(x,y-joy.width*.3);await game.waitForTimeout(2000);}
    await game.keyboard.up('Shift');await game.mouse.up();
    const after=await game.evaluate(()=>window.__katamariQa.state());
    movement.push({kind,before,atTurn,after});
    if(kind==='corridor'&&after.z<8)throw new Error('Runtime lumpy bus corridor was blocked: '+JSON.stringify({before,after}));
    if(kind==='corner'&&Math.hypot(after.x,after.z)<5)throw new Error('Runtime corner escape was blocked');
    if(kind==='reverse'&&after.z>atTurn.z-2)throw new Error('Runtime reverse escape was blocked: '+JSON.stringify({atTurn,after}));
    if(kind==='cadence'&&after.collected<3)throw new Error('Runtime pickup cadence fixture did not collect');
    if(after.collected!==after.attachedPieces)throw new Error('Runtime pile lost a piece');
  }
  const transitions=[];
  for(let level=0;level<=9;level++){
    const before=await game.evaluate(level=>{const qa=window.__katamariQa;qa.normalizationFixture(level);qa.resume();return qa.state();},level);
    await game.waitForTimeout(150);
    const after=await game.evaluate(()=>{window.__katamariQa.pause();return window.__katamariQa.state();});
    if(after.scaleExponent<=before.scaleExponent||after.coreDiameterMeters!==.32||after.attachedPieces<1)throw new Error('Runtime normalization failed at '+level);
    transitions.push({level,before,after});
  }
  await context.close();return{movement,transitions,errors};
}
