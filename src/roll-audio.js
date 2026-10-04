const NOTES=[261.63,293.66,329.63,392,440];
export class RollAudio{
  constructor(){this.enabled=false;this.context=null;this.voices=0;this.lastPickup=-100;}
  enable(enabled){
    this.enabled=enabled;if(!enabled)return;
    const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
    this.context??=new Audio();if(this.context.state==='suspended')this.context.resume().catch(()=>{});
  }
  tone(frequency,duration=.12,delay=0,type='sine',volume=.035){
    const audio=this.context;if(!this.enabled||!audio||this.voices>=8)return;
    const t=audio.currentTime+delay,o=audio.createOscillator(),g=audio.createGain();this.voices++;
    o.type=type;o.frequency.setValueAtTime(frequency,t);o.frequency.exponentialRampToValueAtTime(frequency*.96,t+duration);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(volume,t+.006);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
    o.connect(g);g.connect(audio.destination);o.onended=()=>{this.voices--;o.disconnect();g.disconnect();};o.start(t);o.stop(t+duration+.01);
  }
  pickup(combo,importance,now){
    if(now-this.lastPickup<.075&&importance<3)return;this.lastPickup=now;
    const frequency=NOTES[(Math.max(1,combo)-1)%NOTES.length]*2**Math.min(2,Math.floor(combo/20));
    this.tone(frequency,importance>=2?.16:.08,0,importance>=2?'triangle':'sine',importance>=2?.045:.027);
    if(importance>=2)this.tone(importance===3?82.4:130.8,.2,0,'triangle',.035);
  }
  stinger(major=false){[1,1.25,1.5,2].slice(0,major?4:3).forEach((ratio,i)=>this.tone(392*ratio,.17,i*.065,'sine',.03));}
}
