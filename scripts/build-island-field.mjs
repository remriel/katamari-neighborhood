import {writeFileSync,mkdirSync} from 'node:fs';
import {deflateSync} from 'node:zlib';
import {ISLANDS,islandFields} from '../src/island-layout.js';
const side=1024;
const crcTable=Array.from({length:256},(_,v)=>{for(let j=0;j<8;j++)v=v&1?0xedb88320^(v>>>1):v>>>1;return v>>>0;});
function chunk(type,data){
  const name=Buffer.from(type),payload=Buffer.concat([name,data]);let crc=0xffffffff;
  for(const v of payload)crc=crcTable[(crc^v)&255]^(crc>>>8);
  const length=Buffer.alloc(4),checksum=Buffer.alloc(4);length.writeUInt32BE(data.length);checksum.writeUInt32BE((crc^0xffffffff)>>>0);
  return Buffer.concat([length,payload,checksum]);
}
const header=Buffer.alloc(13);header.writeUInt32BE(side,0);header.writeUInt32BE(side,4);header[8]=8;header[9]=6;
mkdirSync('public/assets',{recursive:true});mkdirSync('art/toytown',{recursive:true});
for(const [id,config] of Object.entries(ISLANDS)){
  const raw=Buffer.alloc((side*4+1)*side),overview=Buffer.alloc((side*4+1)*side);
  for(let y=0;y<side;y++){
    const z=(y+.5)/side*config.half*2-config.half;
    for(let x=0;x<side;x++){
      const px=(x+.5)/side*config.half*2-config.half,f=islandFields(px,z,id),at=y*(side*4+1)+1+x*4;
      raw[at]=Math.round(Math.max(0,Math.min(1,.5+f.coast/800))*255);
      raw[at+1]=Math.round(f.city*255);raw[at+2]=Math.round(f.ridge*255);raw[at+3]=255;
      let color=f.coast<0?[39,137,170]:f.coast<90?[238,204,139]:id==='lanai'?[170,172,90]:[126,180,77];
      if(f.coast>=90){
        color=color.map((v,i)=>Math.round(v*(1-f.ridge*.65)+[54,106,65][i]*f.ridge*.65));
        color=color.map((v,i)=>Math.round(v*(1-f.city*.34)+[229,221,180][i]*f.city*.34));
      }
      for(let c=0;c<3;c++)overview[at+c]=color[c];overview[at+3]=255;
    }
  }
  const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);
  writeFileSync('public/assets/'+id+'-field.png',png);
  const picture=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(overview,{level:9})),chunk('IEND',Buffer.alloc(0))]);
  writeFileSync('public/assets/'+id+'-overview.png',picture);
  console.log(JSON.stringify({island:id,size:png.length,resolution:side}));
}
writeFileSync('art/toytown/island-layout.json',JSON.stringify(ISLANDS,null,2));
