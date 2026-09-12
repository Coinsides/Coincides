> **Status**: evidence / branch B stop
> **Date**: 2026-09-12

# Placement ID source evidence

HEAD: 73eb8627abf083f77d60c77ca56cab5ea599382b · 2026-09-12T02:42:59-04:00 · docs: 源投影单补遗二(placement id 同形修:取证现役形状,确定性派生保持两表对应,⛔碰 client hydration)

## server/src/services/sourceProjectionMaterializer.ts

### HEAD

```text
188:     ) {
189:       addFrame(block.page_index);
190:     }
191:     const frame = currentFrame!;
192:     const notePlacementId = uuidv4();
193:     const blockId = uuidv4();
194:     const canvasObjectId = `canvas-object:${frame.frameId}:${notePlacementId}`;
195:     plannedBlocks.push({
196:       blockId,
197:       notePlacementId,
198:       canvasObjectId,
199:       canvasPlacementId: `canvas-placement:${notePlacementId}`,
200:       mountId: `content-mount:${notePlacementId}`,
201:       artifact: block,
202:       orderIndex: index,
203:       frame,
204:       x: frame.x + CONTENT_LEFT,
205:       y: frame.y + localY,
```

```text
480:           source_record_id, source_materialization_id, created_at
481:         ) VALUES (?, ?, NULL, NULL, ?, ?, ?, ?, 1, ?, ?, ?, ?)
482:       `);
483:       const insertMount = db.prepare(`
484:         INSERT INTO content_mounts (
485:           id, user_id, course_id, note_id, object_id, target_kind, target_id,
486:           projection_mode, sync_policy, metadata, created_at, updated_at
487:         ) VALUES (?, ?, ?, ?, ?, 'note_block', ?, 'owned', 'manual', ?, ?, ?)
488:       `);
```

```text
514:         insertNotePlacement.run(
515:           block.notePlacementId,
516:           noteId,
517:           block.blockId,
518:           block.orderIndex,
519:           now,
520:           now,
521:         );
522:         insertReceipt.run(
```

```text
557:         insertCanvasPlacement.run(
558:           block.canvasPlacementId,
559:           source.user_id,
560:           source.course_id,
561:           noteId,
562:           block.canvasObjectId,
563:           canvasId,
564:           coordinates.x,
565:           coordinates.y,
```

```text
394:       const insertCanvasPlacement = db.prepare(`
395:         INSERT INTO canvas_placements (
396:           id, user_id, course_id, note_id, object_id, canvas_id,
397:           x, y, width, height, rotation, frame_id, surface, boundary_role,
398:           z_index, snap_state_json, visibility_state, render_visibility, metadata,
399:           created_at, updated_at
400:         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'formal_page', 'inside',
401:           ?, '{}', 'normal', 'visible', ?, ?, ?)
402:       `);
```

```text
470:       const insertNotePlacement = db.prepare(`
471:         INSERT INTO note_block_placements (
472:           id, note_id, block_id, order_index, display_mode, display_overrides_json,
473:           created_at, updated_at
474:         ) VALUES (?, ?, ?, ?, 'default', '{}', ?, ?)
475:       `);
```

### Working tree

```text
207:     const index = plannedBlocks.length;
208:     const height = estimateBlockHeight(block);
209:     const frame = currentFrame;
210:     const localY = nextYByFrame.get(frame) ?? CONTENT_TOP;
211:     const notePlacementId = uuidv4();
212:     const blockId = projectionIdentity(sourceFileId, 'block', block.artifact_block_id);
213:     const canvasObjectId = `canvas-object:${frame.frameId}:${notePlacementId}`;
214:     plannedBlocks.push({
215:       blockId,
216:       notePlacementId,
217:       canvasObjectId,
218:       canvasPlacementId: `canvas-placement:${notePlacementId}`,
219:       mountId: `content-mount:${notePlacementId}`,
220:       artifact: block,
221:       orderIndex: index,
222:       frame,
223:       x: frame.x + CONTENT_LEFT,
224:       y: frame.y + localY,
```

```text
515:       `);
516:       const insertMount = db.prepare(`
517:         INSERT INTO content_mounts (
518:           id, user_id, course_id, note_id, object_id, target_kind, target_id,
519:           projection_mode, sync_policy, metadata, created_at, updated_at
520:         ) VALUES (?, ?, ?, ?, ?, 'note_block', ?, 'owned', 'manual', ?, ?, ?)
521:       `);
522: 
523:       for (const block of layout.blocks) {
```

```text
549:         insertNotePlacement.run(
550:           block.notePlacementId,
551:           noteId,
552:           block.blockId,
553:           block.orderIndex,
554:           now,
555:           now,
556:         );
557:         insertReceipt.run(
```

```text
592:         insertCanvasPlacement.run(
593:           block.canvasPlacementId,
594:           source.user_id,
595:           source.course_id,
596:           noteId,
597:           block.canvasObjectId,
598:           canvasId,
599:           coordinates.x,
600:           coordinates.y,
```

```text
426:       const insertCanvasPlacement = db.prepare(`
427:         INSERT INTO canvas_placements (
428:           id, user_id, course_id, note_id, object_id, canvas_id,
429:           x, y, width, height, rotation, frame_id, surface, boundary_role,
430:           z_index, snap_state_json, visibility_state, render_visibility, metadata,
431:           created_at, updated_at
432:         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'formal_page', 'inside',
433:           ?, '{}', 'normal', 'visible', ?, ?, ?)
434:       `);
```

```text
503:       const insertNotePlacement = db.prepare(`
504:         INSERT INTO note_block_placements (
505:           id, note_id, block_id, order_index, display_mode, display_overrides_json,
506:           created_at, updated_at
507:         ) VALUES (?, ?, ?, ?, 'default', '{}', ?, ?)
508:       `);
```

## server/src/services/notes.ts

### HEAD

```text
148: }: NoteBlockReadTarget) {
149:   getOwnedNote(noteId, userId);
150: 
151:   const blocks = getDb().prepare(`
152:     SELECT
153:       nbp.id AS placement_id,
154:       nbp.note_id,
155:       nbp.block_id,
156:       nbp.parent_placement_id,
157:       nbp.order_index,
158:       nbp.display_mode,
159:       nbp.display_overrides_json,
160:       nb.id,
161:       nb.user_id,
162:       nb.course_id,
163:       nb.block_type,
```

### Working tree

```text
148: }: NoteBlockReadTarget) {
149:   getOwnedNote(noteId, userId);
150: 
151:   const blocks = getDb().prepare(`
152:     SELECT
153:       nbp.id AS placement_id,
154:       nbp.note_id,
155:       nbp.block_id,
156:       nbp.parent_placement_id,
157:       nbp.order_index,
158:       nbp.display_mode,
159:       nbp.display_overrides_json,
160:       nb.id,
161:       nb.user_id,
162:       nb.course_id,
163:       nb.block_type,
```

## server/src/services/canvasObjects.ts

### HEAD

```text
1747:   const blockRows = db.prepare(`
1748:     SELECT
1749:       cp.*,
1750:       cm.target_id AS block_id
1751:     FROM canvas_placements cp
1752:     JOIN canvas_objects co ON co.id = cp.object_id
1753:     JOIN content_mounts cm
1754:       ON cm.object_id = co.id
1755:       AND cm.target_kind = 'note_block'
1756:       AND cm.note_id = cp.note_id
1757:     JOIN note_blocks nb
1758:       ON nb.id = cm.target_id
1759:       AND nb.user_id = cp.user_id
1760:       AND nb.status = 'active'
1761:     WHERE cp.user_id = ?
1762:       AND cp.note_id = ?
1763:       AND co.kind = 'paragraph_block_projection'
1764:       AND co.status = 'active'
1765:     ORDER BY cp.z_index ASC, cp.id ASC
1766:   `).all(userId, noteId) as BlockPlacementRow[];
```

```text
1776:     blockLayouts: blockRows.map((row) => ({
1777:       placement_id: row.id,
1778:       block_id: row.block_id,
1779:       layout: layoutFromPlacement(row),
1780:     })),
1781:   };
```

### Working tree

```text
1747:   const blockRows = db.prepare(`
1748:     SELECT
1749:       cp.*,
1750:       cm.target_id AS block_id
1751:     FROM canvas_placements cp
1752:     JOIN canvas_objects co ON co.id = cp.object_id
1753:     JOIN content_mounts cm
1754:       ON cm.object_id = co.id
1755:       AND cm.target_kind = 'note_block'
1756:       AND cm.note_id = cp.note_id
1757:     JOIN note_blocks nb
1758:       ON nb.id = cm.target_id
1759:       AND nb.user_id = cp.user_id
1760:       AND nb.status = 'active'
1761:     WHERE cp.user_id = ?
1762:       AND cp.note_id = ?
1763:       AND co.kind = 'paragraph_block_projection'
1764:       AND co.status = 'active'
1765:     ORDER BY cp.z_index ASC, cp.id ASC
1766:   `).all(userId, noteId) as BlockPlacementRow[];
```

```text
1776:     blockLayouts: blockRows.map((row) => ({
1777:       placement_id: row.id,
1778:       block_id: row.block_id,
1779:       layout: layoutFromPlacement(row),
1780:     })),
1781:   };
```

## client/src/pages/Notes/canvasEngine/canvasObjectRepository.ts

### HEAD

```text
66:   } = {},
67: ): NoteBlock[] {
68:   if (blockLayouts.length === 0) return blocks;
69:   const pageFrames = options.pageFrameCollection?.pageFrames || [];
70:   const layoutsByBlockId = new Map(blockLayouts.map((item) => [
71:     item.block_id,
72:     reconcileHydratedBlockLayoutSurfaceAuthority(item.layout, pageFrames, options.coordinateContract),
73:   ]));
74:   const layoutsByPlacementId = new Map(blockLayouts.map((item) => [
75:     item.placement_id,
76:     reconcileHydratedBlockLayoutSurfaceAuthority(item.layout, pageFrames, options.coordinateContract),
77:   ]));
78:   return blocks.map((block) => {
79:     const layout = block.placement_id
80:       ? layoutsByPlacementId.get(block.placement_id)
81:       : layoutsByBlockId.get(block.id);
82:     return layout ? { ...block, canvas_layout: layout } : block;
83:   });
84: }
```

### Working tree

```text
66:   } = {},
67: ): NoteBlock[] {
68:   if (blockLayouts.length === 0) return blocks;
69:   const pageFrames = options.pageFrameCollection?.pageFrames || [];
70:   const layoutsByBlockId = new Map(blockLayouts.map((item) => [
71:     item.block_id,
72:     reconcileHydratedBlockLayoutSurfaceAuthority(item.layout, pageFrames, options.coordinateContract),
73:   ]));
74:   const layoutsByPlacementId = new Map(blockLayouts.map((item) => [
75:     item.placement_id,
76:     reconcileHydratedBlockLayoutSurfaceAuthority(item.layout, pageFrames, options.coordinateContract),
77:   ]));
78:   return blocks.map((block) => {
79:     const layout = block.placement_id
80:       ? layoutsByPlacementId.get(block.placement_id)
81:       : layoutsByBlockId.get(block.id);
82:     return layout ? { ...block, canvas_layout: layout } : block;
83:   });
84: }
```

Git reads only: see the explicit show/log command list and hashes in round3-placement-id-evidence.json.
