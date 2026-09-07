import Database from 'better-sqlite3';
import migration035 from '../../src/db/migrations/035_v2_canvas_objects.js';
import migration039 from '../../src/db/migrations/039_v2_page_frame_extension_note_scope.js';

// S0 section four fixture promoted verbatim in shape; new S3 cases listed below.
// No default DB, env loader, server startup or product writers are imported.
interface PlacementOptions {
  nt?: string; x?: number | string; y?: number; width?: number; height?: number;
  frame?: string | null; surface?: string; role?: string; rotation?: number;
  tag?: string | null; metadata?: string; user?: string; status?: string;
}
interface FrameOptions {
  nt?: string; x?: number; y?: number; stack?: string; inset?: Record<string, number> | string;
  object?: string; rotation?: number;
}
interface LegacyOptions { layout?: unknown; raw?: string; blockId?: string; nt?: string }

export const SYNTHETIC_USER = 's0-user';
export function createSyntheticBuffer(): Buffer {
  const db = new Database(':memory:');
  try {
    db.pragma('foreign_keys = ON');
    db.exec(`
     CREATE TABLE users(id TEXT PRIMARY KEY);
     CREATE TABLE courses(id TEXT PRIMARY KEY);
     CREATE TABLE notes(id TEXT PRIMARY KEY,user_id TEXT,course_id TEXT,metadata TEXT,updated_at TEXT);
     CREATE TABLE note_blocks(id TEXT PRIMARY KEY,user_id TEXT,course_id TEXT,status TEXT);
     CREATE TABLE note_block_placements(id TEXT PRIMARY KEY,note_id TEXT,block_id TEXT,order_index REAL,
       display_overrides_json TEXT,updated_at TEXT);
    `);
    migration035.up(db);
    migration039.up(db);
    db.exec("INSERT INTO users VALUES('s0-user'); INSERT INTO users VALUES('s0-other'); INSERT INTO courses VALUES('s0-course');");
    function note(id: string,user='s0-user') {
      db.prepare('INSERT INTO notes VALUES(?,?,?, ?,NULL)').run(id,user,'s0-course','{}');
    }
    for(const id of ['n','other-note','empty','broken','multi','missing-primary','no-frames']) note(id);
    note('foreign-note','s0-other');
    function obj(id: string,kind='shape',nt='n',status='active',user='s0-user') {
      db.prepare('INSERT INTO canvas_objects(id,user_id,course_id,note_id,canvas_id,kind,status) VALUES(?,?,?,?,?,?,?)')
        .run(id,user,'s0-course',nt,nt,kind,status);
    }
    function place(id: string,object: string,{nt='n',x=120,y=230,width=20,height=20,frame='f1',surface='formal_page',role='inside',rotation=0,tag='canvas_world',metadata,user='s0-user'}: PlacementOptions={}) {
      db.prepare(`INSERT INTO canvas_placements(id,user_id,course_id,note_id,canvas_id,object_id,x,y,width,height,frame_id,surface,boundary_role,rotation,metadata)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id,user,'s0-course',nt,nt,object,x,y,width,height,frame,surface,role,rotation,
          metadata===undefined?JSON.stringify({layout_policy:{coordinate_space:tag}}):metadata);
    }
    function mount(id: string,object: string,target='synthetic-target',kind='note_block',nt='n') {
      db.prepare('INSERT INTO content_mounts(id,user_id,course_id,note_id,object_id,target_kind,target_id) VALUES(?,?,?,?,?,?,?)')
        .run(id,'s0-user','s0-course',nt,object,kind,target);
    }
    function block(id: string,options: PlacementOptions={}) {
      const nt=options.nt||'n';
      db.prepare('INSERT INTO note_blocks VALUES(?,?,?,?)').run('b-'+id,'s0-user','s0-course','active');
      obj('o-'+id,'paragraph_block_projection',nt,options.status||'active');
      place(id,'o-'+id,options); mount('m-'+id,'o-'+id,'b-'+id,'note_block',nt);
    }
    function frame(id: string,{nt='n',x=100,y=200,stack='stack1',inset={left:10,right:10,top:20,bottom:20},object='of-'+nt+'-'+id,rotation=0}: FrameOptions={}) {
      obj(object,'page_frame',nt);
      place('pf-'+nt+'-'+id,object,{nt,x,y,width:120,height:140,frame:id,rotation});
      db.prepare(`INSERT INTO page_frame_extensions(frame_id,user_id,course_id,note_id,object_id,canvas_id,page_stack_id,content_inset_json)
        VALUES(?,?,?,?,?,?,?,?)`).run(id,'s0-user','s0-course',nt,object,nt,stack,typeof inset==='string'?inset:JSON.stringify(inset));
    }
    function primary(nt: string,id: string) {
      db.prepare('INSERT INTO canvas_page_collections(note_id,user_id,course_id,canvas_id,primary_frame_id) VALUES(?,?,?,?,?)')
        .run(nt,'s0-user','s0-course',nt,id);
    }
    frame('f1'); frame('f2',{y:500}); primary('n','f1');
    frame('f1',{nt:'other-note',x:1000,y:2000}); primary('other-note','f1');
    frame('bad-inset',{nt:'broken',inset:'{broken'});
    frame('negative-inset',{nt:'broken',inset:{left:-1,right:10,top:20,bottom:20}});
    frame('zero-content',{nt:'broken',inset:{left:60,right:60,top:20,bottom:20}});
    frame('rotated-frame',{nt:'broken',rotation:5});
    frame('duplicate',{nt:'broken'});
    place('pf-duplicate-extra','of-broken-duplicate',{nt:'broken',frame:'duplicate'});
    obj('frame-no-extension','page_frame','broken');
    place('pf-no-extension','frame-no-extension',{nt:'broken',frame:'no-extension'});
    primary('broken','absent');
    frame('fa',{nt:'multi',stack:'stack-a'}); frame('fb',{nt:'multi',stack:'stack-b'}); primary('multi','fa');
    frame('f1',{nt:'missing-primary'}); primary('missing-primary','absent');
    block('world');
    db.prepare('UPDATE canvas_objects SET source_json=? WHERE id=?').run(JSON.stringify({imported_from:'display_overrides_json.better_notebook_layout'}),'o-world');
    block('local',{x:10,y:10,tag:'page_frame_local'});
    block('mixed',{x:10,y:230,tag:'page_frame_local'});
    block('second',{x:10,y:530,frame:'f2',tag:'page_frame_local'});
    block('half',{x:60,y:230,width:100,surface:'canvas_workspace',role:'crossing'});
    block('quarter',{x:35,y:230,width:100,surface:'canvas_workspace',role:'crossing'});
    block('three-quarter',{x:85,y:230,width:100,surface:'canvas_workspace',role:'crossing'});
    block('outside',{x:400,y:700,frame:null,surface:'canvas_workspace',role:'outside'});
    block('stored-inside-wrong',{x:60,y:230,width:100,role:'inside'});
    block('oversize',{x:60,y:170,width:200,height:200,surface:'canvas_workspace',role:'crossing'});
    block('tall-crosspage',{x:120,y:230,width:20,height:320});
    block('zero-width',{width:0});
    block('rotated',{rotation:45});
    block('invalid-meta',{metadata:'{bad'});
    block('missing-frame',{frame:'no-such-frame'});
    block('invalid-inset',{nt:'broken',frame:'bad-inset'});
    block('duplicate-frame',{nt:'broken',frame:'duplicate'});
    block('cross-note',{nt:'other-note',x:10,y:10,tag:'page_frame_local'});
    block('multi-stack',{nt:'multi',frame:'fa'});
    block('missing-primary-block',{nt:'missing-primary'});
    block('inactive',{status:'retired'});
    block('tray',{surface:'tray',role:'outside',frame:null});
    block('no-frame-inventory',{nt:'no-frames',frame:null});
    block('text-x',{x:'not-a-number'});
    block('infinite-x',{x:Infinity});
    for(const kind of ['shape','image','table','visual_connector','future_kind']) {
      obj('object-'+kind,kind); place('p-'+kind,'object-'+kind,{surface:'canvas_workspace',role:'outside',x:500});
    }
    mount('mount-shape','object-shape','b-world');
    mount('mount-table','object-table','structured-target','structured_object');
    obj('unplaced-object'); mount('unplaced-mount','unplaced-object');
    obj('multi-object'); place('multi-p1','multi-object',{surface:'canvas_workspace',role:'outside'});
    place('multi-p2','multi-object',{surface:'formal_page'}); mount('multi-mount','multi-object');
    // 同用户但 object 在别 note：FK 可存在，作用域联接必须识别为 missing，而非漏掉分母。
    obj('wrong-note-object','shape','other-note'); place('wrong-note-placement','wrong-note-object');
    mount('wrong-note-mount','wrong-note-object');
    obj('foreign-object','shape','foreign-note','active','s0-other');
    place('foreign-placement','foreign-object',{nt:'foreign-note',user:'s0-other'});
    function legacy(id: string,{layout={x:10,y:10,width:20,height:20,frame_id:'f1',surface:'formal_page',boundary_role:'inside',coordinate_space:'page_frame_local'},raw,blockId='b-'+id,nt='n'}: LegacyOptions={}) {
      if(!db.prepare('SELECT 1 FROM note_blocks WHERE id=?').get(blockId))
        db.prepare('INSERT INTO note_blocks VALUES(?,?,?,?)').run(blockId,'s0-user','s0-course','active');
      db.prepare('INSERT INTO note_block_placements VALUES(?,?,?,?,?,NULL)').run(id,nt,blockId,0,
        raw===undefined?JSON.stringify({better_notebook_layout:layout}):raw);
    }
    legacy('world'); legacy('inactive'); legacy('legacy-only'); legacy('legacy-invalid',{raw:'{bad'});
    legacy('legacy-nonobject',{layout:'not-a-layout'}); legacy('legacy-none',{raw:'{}'});
    legacy('legacy-other-id',{blockId:'b-local'}); legacy('half',{blockId:'different-target'});
    legacy('unscopable',{nt:'nonexistent-note'});

    // Zero origin supplies affirmative agreement controls, not only disagreement cases.
    note('zero');
    frame('f0',{nt:'zero',x:0,y:0,inset:{left:0,right:0,top:0,bottom:0}});
    frame('fnext',{nt:'zero',x:0,y:200,inset:{left:0,right:0,top:0,bottom:0}});
    primary('zero','f0');
    block('agree-inside',{nt:'zero',frame:'f0',x:10,y:10});
    block('agree-outside',{nt:'zero',frame:'f0',x:1000,y:1000,surface:'canvas_workspace',role:'outside'});
    block('agree-crosspage',{nt:'zero',frame:'f0',x:10,y:10,height:320});
    for (const [id,x,y] of [['untagged-local',10,10],['untagged-mixed',10,230],['untagged-world',120,230]] as const) {
      block(id,{x,y,metadata:'{"layout_policy":{}}'});
      db.prepare('UPDATE canvas_objects SET source_json=? WHERE id=?').run(
        JSON.stringify({imported_from:'display_overrides_json.better_notebook_layout'}),'o-'+id);
    }
    block('oversize-width',{width:200,height:20,surface:'canvas_workspace',role:'crossing'});
    block('oversize-height',{width:20,height:200,surface:'canvas_workspace',role:'crossing'});
    obj('all-wilderness-object');
    place('all-wilderness-p1','all-wilderness-object',{surface:'canvas_workspace',role:'outside'});
    place('all-wilderness-p2','all-wilderness-object',{surface:'canvas_workspace',role:'outside',x:500});
    mount('all-wilderness-mount','all-wilderness-object');
    return db.serialize();
  } finally {
    db.close();
  }
}
