import {readFileSync,writeFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';
function decodePng(bytes) {
 let p=8,w,h,color; const chunks=[];
 while(p<bytes.length){const n=bytes.readUInt32BE(p),t=bytes.toString('ascii',p+4,p+8),data=bytes.subarray(p+8,p+8+n); if(t==='IHDR'){w=data.readUInt32BE(0);h=data.readUInt32BE(4);color=data[9];if(data[8]!==8||data[12]!==0)throw new Error('Unexpected PNG format');} if(t==='IDAT')chunks.push(data);p+=12+n;}
 const bpp=color===6?4:color===2?3:0;if(!bpp)throw new Error('Unexpected PNG color '+color);
 const packed=inflateSync(Buffer.concat(chunks)),pixels=Buffer.alloc(w*h*bpp);let cursor=0;
 const paeth=(a,b,c)=>{const q=a+b-c,pa=Math.abs(q-a),pb=Math.abs(q-b),pc=Math.abs(q-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
 for(let y=0;y<h;y++){const filter=packed[cursor++];for(let x=0;x<w*bpp;x++){const a=x>=bpp?pixels[y*w*bpp+x-bpp]:0,b=y?pixels[(y-1)*w*bpp+x]:0,c=y&&x>=bpp?pixels[(y-1)*w*bpp+x-bpp]:0;pixels[y*w*bpp+x]=(packed[cursor++]+([0,a,b,Math.floor((a+b)/2),paeth(a,b,c)][filter]))&255;}}
 return {w,h,bpp,pixels};
}

const dir=new URL('./',import.meta.url);
const rows=[];
for(const preset of ['default']) for(const mode of ['header-baseline-no-idle-pseudo']) {
const files=[preset+'-baseline.png',preset+'-'+mode+'.png'];const [a,b]=files.map(f=>decodePng(readFileSync(new URL(f,dir))));
if(a.w!==b.w||a.h!==b.h||a.bpp!==b.bpp)throw new Error('PNG dimensions differ');
let changedPixels=0,maxChannelDelta=0,minX=a.w,minY=a.h,maxX=-1,maxY=-1;
for(let i=0;i<a.w*a.h;i++){let changed=false;for(let c=0;c<a.bpp;c++){const d=Math.abs(a.pixels[i*a.bpp+c]-b.pixels[i*b.bpp+c]);maxChannelDelta=Math.max(maxChannelDelta,d);changed ||= d!==0;}if(changed){changedPixels++;const x=i%a.w,y=Math.floor(i/a.w);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}}
rows.push({preset,mode,files,width:a.w,height:a.h,totalPixels:a.w*a.h,changedPixels,maxChannelDelta,bounds:changedPixels?{minX,minY,maxX,maxY}:null});}
const status=rows.filter(r=>r.mode==='header-baseline-no-idle-pseudo').every(r=>r.changedPixels===0)?'passed':'failed';
writeFileSync(new URL('pseudo-probe-regression.json',dir),JSON.stringify({status,method:'Decoded original PNG pixels, no tolerance, no resize; header-baseline keeps all current material code and rolls back only the explicit header files/title-weight.',rows},null,2));
console.log(JSON.stringify({status,rows},null,2));if(status!=='passed')process.exitCode=1;
