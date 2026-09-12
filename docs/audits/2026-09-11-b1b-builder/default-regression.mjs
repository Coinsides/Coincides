import {readFileSync,writeFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const audit=new URL('./',import.meta.url);
function decodePng(bytes) {
 let p=8,w,h,color; const chunks=[];
 while(p<bytes.length){const n=bytes.readUInt32BE(p),t=bytes.toString('ascii',p+4,p+8),data=bytes.subarray(p+8,p+8+n); if(t==='IHDR'){w=data.readUInt32BE(0);h=data.readUInt32BE(4);color=data[9];if(data[8]!==8||data[12]!==0)throw new Error('Unexpected PNG format');} if(t==='IDAT')chunks.push(data);p+=12+n;}
 const bpp=color===6?4:color===2?3:0;if(!bpp)throw new Error('Unexpected PNG color '+color);
 const packed=inflateSync(Buffer.concat(chunks)),pixels=Buffer.alloc(w*h*bpp);let cursor=0;
 const paeth=(a,b,c)=>{const q=a+b-c,pa=Math.abs(q-a),pb=Math.abs(q-b),pc=Math.abs(q-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
 for(let y=0;y<h;y++){const filter=packed[cursor++];for(let x=0;x<w*bpp;x++){const a=x>=bpp?pixels[y*w*bpp+x-bpp]:0,b=y?pixels[(y-1)*w*bpp+x]:0,c=y&&x>=bpp?pixels[(y-1)*w*bpp+x-bpp]:0;pixels[y*w*bpp+x]=(packed[cursor++]+([0,a,b,Math.floor((a+b)/2),paeth(a,b,c)][filter]))&255;}}
 return {w,h,bpp,pixels};
}
const results = [];
for (const suffix of ['board','light-board','panels-layers','panels-selection','panels-bookmarks']) {
const files=[`00-baseline-${suffix}.png`,`01-default-${suffix}.png`];
const raw=files.map(file=>readFileSync(new URL(file,audit))),[a,b]=raw.map(decodePng);
if(a.w!==b.w||a.h!==b.h||a.bpp!==b.bpp)throw new Error('PNG dimensions differ');
let changedPixels=0,maxChannelDelta=0;
for(let p=0;p<a.pixels.length;p+=a.bpp){let changed=false;for(let c=0;c<a.bpp;c++){const d=Math.abs(a.pixels[p+c]-b.pixels[p+c]);maxChannelDelta=Math.max(maxChannelDelta,d);changed ||= d!==0;}if(changed)changedPixels++;}
results.push({status:changedPixels===0?'passed':'failed',files,width:a.w,height:a.h,changedPixels,maxChannelDelta,sha256:raw.map(bytes=>createHash('sha256').update(bytes).digest('hex'))});
}
const result = {status:results.every(row=>row.status==='passed')?'passed':'failed',results};
writeFileSync(new URL('default-regression.json',audit),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));if(result.status!=='passed')process.exitCode=1;
