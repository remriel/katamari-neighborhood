// Keep physics and the three-pickup cadence independent of display refresh rate.
export class FrameClock {
  constructor(){this.reset();}
  reset(){this.remaining=0;}
  advance(seconds,step){
    this.remaining+=Math.max(0,Math.min(.25,Number.isFinite(seconds)?seconds:0));
    let steps=0;
    while(this.remaining+1e-10>=1/60){
      this.remaining=Math.max(0,this.remaining-1/60);steps++;
      if(step(1/60)===false){this.reset();break;}
    }
    return steps;
  }
}
