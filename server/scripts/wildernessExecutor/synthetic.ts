import Database from 'better-sqlite3';
import { createSyntheticBuffer } from '../wildernessShadow/synthetic.js';
import m040 from '../../src/db/migrations/040_v2_visual_connector_extensions.js';
import m041 from '../../src/db/migrations/041_v2_canvas_image_assets.js';
import m042 from '../../src/db/migrations/042_v2_structured_object_extensions.js';
import m054 from '../../src/db/migrations/054_v13_events_ledger.js';
import m055 from '../../src/db/migrations/055_v13_tray_order.js';
import m056 from '../../src/db/migrations/056_v13_coordinate_contract.js';

/** S3 full spectrum retained, plus S4b successful negative-local controls and real FK dependents.
 * The foreign S3 formal row is tested as a scope refusal separately. In the executable
 * fixture only, it starts in tray so a scoped migration may flip the database-wide flag.
 */
export function createExecutorSyntheticBuffer(foreignFormal = false): Buffer {
  const db = new Database(createSyntheticBuffer());
  try {
    db.pragma('foreign_keys = ON');
    for (const m of [m040, m041, m042, m054, m055, m056]) m.up(db);
    if (!foreignFormal) db.exec("UPDATE canvas_placements SET surface='tray',order_index=9 WHERE id='foreign-placement'");
    db.exec("UPDATE canvas_placements SET order_index=40 WHERE id='tray'");
    // Same columns, new note-scoped frame identity. O=(0,220): x=-10 + inset.left=10.
    db.exec(`INSERT INTO canvas_objects(id,user_id,course_id,note_id,canvas_id,kind)
      VALUES('s4-frame','s0-user','s0-course','zero','zero','page_frame');
      INSERT INTO canvas_placements(id,user_id,course_id,note_id,canvas_id,object_id,x,y,width,height,frame_id)
      VALUES('s4-frame-placement','s0-user','s0-course','zero','zero','s4-frame',-10,200,120,140,'s4-frame');
      INSERT INTO page_frame_extensions(frame_id,user_id,course_id,note_id,object_id,canvas_id,content_inset_json)
      VALUES('s4-frame','s0-user','s0-course','zero','s4-frame','zero','{"left":10,"right":10,"top":20,"bottom":20}');`);
    for (let i = 0; i < 24; i++) {
      const id = `s4-exact-${i}`;
      db.prepare(`INSERT INTO canvas_objects(id,user_id,course_id,note_id,canvas_id,kind)
        VALUES(?,'s0-user','s0-course','zero','zero','paragraph_block_projection')`).run('o-' + id);
      db.prepare(`INSERT INTO canvas_placements(id,user_id,course_id,note_id,canvas_id,object_id,x,y,width,height,rotation,frame_id,metadata)
        VALUES(?,'s0-user','s0-course','zero','zero',?, ?, ?,20,20,0,'s4-frame',?)`)
        .run(id, 'o-' + id, i === 0 ? -5 : 10, i + 0.25,
          JSON.stringify({ retained: 'synthetic-metadata', layout_policy: { coordinate_space: i % 2 ? 'canvas_world' : 'page_frame_local', retained: true } }));
    }
    db.exec(`INSERT INTO visual_connector_extensions(object_id,user_id,course_id,note_id,canvas_id,start_kind,start_x,start_y,end_kind,end_x,end_y)
      VALUES('object-visual_connector','s0-user','s0-course','n','n','point',1,2,'point',3,4);
      INSERT INTO canvas_assets(id,user_id,kind,storage_kind,storage_key,filename,mime_type)
      VALUES('synthetic-asset','s0-user','image','local_file','synthetic/no-file','synthetic.png','image/png');
      INSERT INTO image_object_extensions(object_id,user_id,course_id,note_id,canvas_id,asset_id)
      VALUES('object-image','s0-user','s0-course','n','n','synthetic-asset');
      INSERT INTO structured_object_extensions(object_id,user_id,course_id,note_id,canvas_id,structured_kind,schema_version,data_json)
      VALUES('object-table','s0-user','s0-course','n','n','table','table.v1','{"synthetic":"retained"}');`);
    // Declare these deliberately small S3/S4 geometries as Custom so the live
    // print baseline keeps their stated origins. Original placement rows stay intact.
    db.exec("UPDATE page_frame_extensions SET page_size='Custom'");
    addProductionPositives(db);
    return db.serialize();
  } finally { db.close(); }
}

/** Addendum 2: main user's full spectrum + a second user's single formal paragraph
 * and structural frame. Reuse frame_id=f1 across users to exercise scoped resolution.
 */
export function createMultiUserSyntheticBuffer(): Buffer {
  const db = new Database(createExecutorSyntheticBuffer(true));
  try {
    db.pragma('foreign_keys = ON');
    db.exec(`UPDATE canvas_objects SET kind='paragraph_block_projection' WHERE id='foreign-object';
      UPDATE canvas_placements SET x=10,y=230 WHERE id='foreign-placement';
      INSERT INTO canvas_objects(id,user_id,course_id,note_id,canvas_id,kind)
        VALUES('foreign-frame','s0-other','s0-course','foreign-note','foreign-note','page_frame');
      INSERT INTO canvas_placements(id,user_id,course_id,note_id,canvas_id,object_id,x,y,width,height,frame_id)
        VALUES('foreign-frame-placement','s0-other','s0-course','foreign-note','foreign-note','foreign-frame',-10,200,120,140,'f1');
      INSERT INTO page_frame_extensions(frame_id,user_id,course_id,note_id,object_id,canvas_id,page_size,content_inset_json)
        VALUES('f1','s0-other','s0-course','foreign-note','foreign-frame','foreign-note','Custom','{"left":10,"right":10,"top":20,"bottom":20}');
      INSERT INTO canvas_page_collections(note_id,user_id,course_id,canvas_id,primary_frame_id)
        VALUES('foreign-note','s0-other','s0-course','foreign-note','f1');`);
    return db.serialize();
  } finally { db.close(); }
}

export const PRODUCTION_POSITIVE_IDS = ['production-local-72-96', 'production-local-54-112', 'production-source-x152'] as const;
function addProductionPositives(db: Database.Database) {
  for (const [index, id] of PRODUCTION_POSITIVE_IDS.entries()) {
    const left = index === 1 ? 54 : 72;
    const top = index === 1 ? 112 : 96;
    db.prepare("INSERT INTO notes VALUES(?,'s0-user','s0-course','{}',NULL)").run(id);
    db.prepare(`INSERT INTO canvas_objects(id,user_id,course_id,note_id,canvas_id,kind)
      VALUES(?,'s0-user','s0-course',?,?,'page_frame')`).run('frame-' + id, id, id);
    db.prepare(`INSERT INTO canvas_placements(id,user_id,course_id,note_id,canvas_id,object_id,x,y,width,height,frame_id)
      VALUES(?,'s0-user','s0-course',?,?,?,80,80,794,1123,?)`).run('pf-' + id, id, id, 'frame-' + id, id);
    db.prepare(`INSERT INTO page_frame_extensions(frame_id,user_id,course_id,note_id,object_id,canvas_id,page_size,content_inset_json)
      VALUES(?,'s0-user','s0-course',?,?,?,'A4',?)`).run(id, id, 'frame-' + id, id,
      JSON.stringify({ left, right: 72, top, bottom: 96 }));
    db.prepare(`INSERT INTO canvas_page_collections(note_id,user_id,course_id,canvas_id,primary_frame_id)
      VALUES(?,'s0-user','s0-course',?,?)`).run(id, id, id);
    db.prepare(`INSERT INTO canvas_objects(id,user_id,course_id,note_id,canvas_id,kind)
      VALUES(?,'s0-user','s0-course',?,?,'paragraph_block_projection')`).run('o-' + id, id, id);
    db.prepare(`INSERT INTO canvas_placements(id,user_id,course_id,note_id,canvas_id,object_id,x,y,width,height,frame_id,metadata)
      VALUES(?,'s0-user','s0-course',?,?,?,?,?,?,72,?,?)`).run(id, id, id, 'o-' + id,
      index === 2 ? 152 : 10, index === 2 ? 176 : 10, index === 2 ? 650 : 100, id,
      JSON.stringify({ layout_policy: { coordinate_space: index === 2 ? 'canvas_world' : 'page_frame_local' } }));
    db.prepare("INSERT INTO note_blocks VALUES(?,'s0-user','s0-course','active')").run('b-' + id);
    db.prepare(`INSERT INTO content_mounts(id,user_id,course_id,note_id,object_id,target_kind,target_id)
      VALUES(?,'s0-user','s0-course',?,?,'note_block',?)`).run('m-' + id, id, 'o-' + id, 'b-' + id);
  }
}
