import assert from 'node:assert/strict';
import test from 'node:test';
import { closeDb, initDb } from '../db/init.js';
import { getNoteCanvasPersistence, savePageFrameCollection } from '../services/canvasObjects.js';
import { savePageFrameCollectionSchema } from '../validators/index.js';

test('paper defaults and single-page geometry round-trip through the existing collection store', async () => {
  const db = await initDb(':memory:');
  try {
    db.prepare("INSERT INTO users(id,email,password_hash,name) VALUES('paper-user','a5@example.test','synthetic','Paper')").run();
    db.prepare("INSERT INTO courses(id,user_id,name) VALUES('paper-course','paper-user','Paper')").run();
    db.prepare("INSERT INTO notes(id,user_id,course_id,title,page_format) VALUES('paper-note','paper-user','paper-course','Paper','a4_portrait')").run();
    const paperDefault = { templateId: 'a3_landscape', pageSize: 'A3', width: 1808, height: 1278.5142857142857 };
    const collection = { paperDefault, primaryFrameId: 'p1', selectedFrameId: 'p2', pageStacks: [],
      pageFrames: ['p1', 'p2'].map((id, index) => ({ ...paperDefault, id, x: 10, y: index * 1400,
        exportable: true, contentInset: { top: 0, right: 72, bottom: 96, left: 72 },
        ...(index ? { width: 1500, paperSizeOverride: true, paperSizeReferenceWidth: 1808 } : {}),
      })),
    };
    const parsed = savePageFrameCollectionSchema.parse({ collection });
    const saved = savePageFrameCollection(db, 'paper-user', 'paper-note', parsed.collection)!;
    assert.deepEqual(saved.paperDefault, paperDefault);
    assert.equal(saved.pageFrames[1].paperSizeOverride, true);
    assert.equal(saved.pageFrames[1].paperSizeReferenceWidth, 1808);
    assert.equal(saved.pageFrames[1].width, 1500);
    const reloaded = getNoteCanvasPersistence(db, 'paper-user', 'paper-note').pageFrameCollection!;
    assert.deepEqual(reloaded, saved);
    const note = db.prepare("SELECT page_format FROM notes WHERE id = 'paper-note'").get() as { page_format: string };
    assert.equal(note.page_format, 'a4_portrait');
    const restored = savePageFrameCollection(db, 'paper-user', 'paper-note', { ...reloaded,
      pageFrames: reloaded.pageFrames.map((frame) => {
        const { paperSizeOverride: _override, paperSizeReferenceWidth: _reference, ...rest } = frame;
        return { ...rest, ...paperDefault };
      }),
    })!;
    assert.deepEqual(restored.paperDefault, paperDefault);
    assert.ok(restored.pageFrames.every((frame) => frame.width === paperDefault.width && !frame.paperSizeOverride
      && frame.paperSizeReferenceWidth === undefined));
    const metadata = db.prepare("SELECT metadata FROM page_frame_extensions WHERE note_id = 'paper-note'").all() as { metadata: string }[];
    assert.ok(metadata.every((row) => !Object.prototype.hasOwnProperty.call(JSON.parse(row.metadata), 'paperSizeOverride')
      && !Object.prototype.hasOwnProperty.call(JSON.parse(row.metadata), 'paperSizeReferenceWidth')));
  } finally { closeDb(); }
});
