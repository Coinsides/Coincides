// Run from server/: node --import tsx ../client/scripts/pageReadingSmoke/startTray.mjs
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { initDb, closeDb } from '../../../server/src/db/init.ts';
import notes from '../../../server/src/routes/notes.ts';
import canvas from '../../../server/src/routes/canvasObjects.ts';
import blocks from '../../../server/src/routes/noteBlocks.ts';
import { errorHandler } from '../../../server/src/middleware/errorHandler.ts';
import { savePageFrameCollection, saveBlockCanvasPlacement } from '../../../server/src/services/canvasObjects.ts';

const requireServer = createRequire(new URL('../../../server/package.json', import.meta.url));
const express = requireServer('express');
const db = await initDb(':memory:');
const noteId = 'page-reading-smoke-note';
const userId = 'tray-smoke-user';
db.prepare(`INSERT INTO users (id,email,password_hash,name) VALUES (?, 'tray-smoke@example.test','fixture','Synthetic')`).run(userId);
db.prepare(`INSERT INTO courses (id,user_id,name) VALUES ('tray-smoke-course',?,'Synthetic')`).run(userId);
db.prepare(`INSERT INTO notes (id,user_id,course_id,title) VALUES (?,?,'tray-smoke-course','Tray smoke specimen')`).run(noteId,userId);
savePageFrameCollection(db,userId,noteId,{
  pageFrames:[{id:'tray-frame',role:'primary_page_frame',pageSize:'A4',templateId:'a4_portrait',x:0,y:0,width:904,height:1279,
    contentInset:{top:96,right:72,bottom:96,left:72},exportable:true}],
  primaryFrameId:'tray-frame',selectedFrameId:'tray-frame',
});
for(let i=1;i<=2;i++) {
  db.prepare(`INSERT INTO note_blocks (id,user_id,course_id,block_type,content_json,plain_text)
    VALUES (?,?,'tray-smoke-course','paragraph',?,?)`).run(`tray-block-${i}`,userId,JSON.stringify({body:`Synthetic tray block ${i}`}),`Synthetic tray block ${i}`);
  db.prepare(`INSERT INTO note_block_placements (id,note_id,block_id,order_index) VALUES (?,?,?,?)`).run(`tray-placement-${i}`,noteId,`tray-block-${i}`,i);
  saveBlockCanvasPlacement(db,userId,noteId,`tray-placement-${i}`,{block_id:`tray-block-${i}`,layout:{
    x:0,y:100+i*160,width:760,height:100,surface:'formal_page',boundary_role:'inside',coordinate_space:'page_frame_local',frame_id:'tray-frame',
  }});
}
const app = express();
app.use(express.json());
app.use((req,_res,next)=>{req.userId=userId;next();});
app.get('/__tray-fixture',(_req,res)=>res.json(Object.fromEntries(
  ['notes','note_blocks','note_block_placements','canvas_objects','canvas_placements','content_mounts','events']
    .map((table)=>[table,db.prepare(`SELECT * FROM ${table}`).all()]),
)));
app.use('/notes',notes);app.use('/canvas-objects',canvas);app.use('/note-blocks',blocks);app.use(errorHandler);
const clientRoot = fileURLToPath(new URL('../../',import.meta.url));
const realApi = path.resolve(clientRoot,'src/services/api.ts').replaceAll('\\','/');
const mockApi = fileURLToPath(new URL('./mockApi.ts',import.meta.url));
const server = await createServer({configFile:false,envFile:false,root:clientRoot,plugins:[{
  name:'tray-synthetic-api',enforce:'pre',
  async resolveId(source,importer,options){
    if(!/(?:^|\/)api(?:\.ts)?$/.test(source))return null;
    const resolved=await this.resolve(source,importer,{...options,skipSelf:true});
    return resolved?.id.replaceAll('\\','/')===realApi?mockApi:null;
  },configureServer(vite){vite.middlewares.use('/api',app);},
},react()],resolve:{alias:{'@':path.resolve(clientRoot,'src'),'@shared/types':path.resolve(clientRoot,'../shared/types/index.ts'),'@shared':path.resolve(clientRoot,'../shared')}},
server:{host:'127.0.0.1',port:5182,strictPort:true}});
await server.listen();
console.log('Tray smoke: http://127.0.0.1:5182/scripts/pageReadingSmoke/tray.html');
const stop=async()=>{await server.close();closeDb();process.exit(0);};
process.on('SIGINT',stop);process.on('SIGTERM',stop);
