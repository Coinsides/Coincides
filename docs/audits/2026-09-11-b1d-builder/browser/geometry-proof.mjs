import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
const directory=new URL('./',import.meta.url);
const report=JSON.parse(readFileSync(new URL('browser-report.json',directory),'utf8'));
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const geometry=canvas=>({canvasPlacements:canvas.canvasPlacements,pageFrameCollection:canvas.pageFrameCollection,blockLayouts:canvas.blockLayouts,contentMounts:canvas.contentMounts});
const before=geometry(report.initial.canvas),after=geometry(report.final.canvas);
const result={status:isDeepStrictEqual(before,after)&&isDeepStrictEqual(report.initialBlocks,report.finalBlocks)?'passed':'failed',
  source:'browser-report.json: initial/final/initialBlocks/finalBlocks; derived without revisiting or changing the fixture',
  blockCount:report.initialBlocks.length,blockHashes:[hash(report.initialBlocks),hash(report.finalBlocks)],
  geometryHashes:[hash(before),hash(after)],before,after};
writeFileSync(new URL('geometry-proof.json',directory),JSON.stringify(result,null,2));
console.log(JSON.stringify({status:result.status,blockCount:result.blockCount,blockHashes:result.blockHashes,geometryHashes:result.geometryHashes}));
if(result.status!=='passed')process.exitCode=1;
