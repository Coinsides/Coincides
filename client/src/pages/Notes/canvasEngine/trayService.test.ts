import { describe, expect, it } from 'vitest';
import { buildNoteCanvasRuntimeModel } from './engineModel';
import { buildLayoutPayload, buildRuntimeBlockPlacement, readStoredLayout } from './placementService';
import { applyCanvasLayoutsToBlocks } from './canvasObjectRepository';
import { normalizeCanvasPersistencePayload } from './canvasPersistenceNormalizer';
import { buildTrayEntries } from './trayService';
import { getVisibleBlocksForSurface, createSurfaceModePolicy } from './modePolicyService';
import type { CanvasObject, CanvasPlacement, ContentMount } from './types';
import type { NoteBlock } from './runtimeDataTypes';

const block: NoteBlock = { id:'block', placement_id:'placement', display_overrides_json:{}, block_type:'paragraph', title:null,
  content_json:{body:'Synthetic block'}, plain_text:'Synthetic block', metadata:{}, order_index:0, source_references:[] };
const objects: CanvasObject[] = [
  { objectId:'paragraph',canvasId:'note',kind:'paragraph_block_projection',backing:'note_block',objectClass:'block_backed',status:'active',source:'runtime_seed' },
  { objectId:'shape',canvasId:'note',kind:'shape',backing:'none',objectClass:'pure',status:'active',source:'runtime_seed' },
  { objectId:'mounted',canvasId:'note',kind:'shape',backing:'note_block',objectClass:'block_backed',status:'active',source:'runtime_seed' },
];
const placements: CanvasPlacement[] = objects.map((object,index) => ({
  placementId:index ? `p-${index}` : 'placement', objectId:object.objectId, canvasId:'note',
  surface:'tray',boundaryRole:'outside',x:0,y:0,width:0,height:0,rotation:0,zIndex:10-index,orderIndex:index,
}));
const mounts: ContentMount[] = [
  {mountId:'m1',objectId:'paragraph',targetKind:'note_block',targetId:'block',projectionMode:'owned',syncPolicy:'manual'},
  {mountId:'m2',objectId:'mounted',targetKind:'note_block',targetId:'backing',projectionMode:'owned',syncPolicy:'manual'},
];

describe('tray placement semantics', () => {
  it('retains tray and order across raw normalization, layout attachment and payload; never reclassifies placeholder geometry', () => {
    const raw = normalizeCanvasPersistencePayload({canvasObjects:objects, canvasPlacements:[{
      placement_id:'placement',object_id:'paragraph',surface:'tray',order_index:8,x:0,y:0,width:0,height:0,
    }],blockLayouts:[{placement_id:'placement',block_id:'block',layout:{x:0,y:0,width:0,height:0,surface:'tray',order_index:8,coordinate_space:'page_frame_local'}}]});
    expect(raw.canvasPlacements[0]).toMatchObject({surface:'tray',orderIndex:8});
    const hydrated = applyCanvasLayoutsToBlocks([block],raw.blockLayouts);
    expect(readStoredLayout(hydrated[0])).toMatchObject({surface:'tray',order_index:8});
    expect(buildLayoutPayload(hydrated[0].canvas_layout as any)).toMatchObject({surface:'tray',order_index:8,width:0,frame_id:null});
    expect(getVisibleBlocksForSurface(hydrated,createSurfaceModePolicy('page'),760)).toEqual([]);
    expect(getVisibleBlocksForSurface(hydrated,createSurfaceModePolicy('canvas'),760)).toEqual([]);
    // Two mounts of the same block must retain their own placement's surface.
    const duplicate = {...block, placement_id:'paper-placement'};
    const both = applyCanvasLayoutsToBlocks([block,duplicate],[...raw.blockLayouts,{
      placement_id:'paper-placement',block_id:'block',layout:{x:0,y:40,width:760,height:72,surface:'formal_page'},
    }]);
    expect(readStoredLayout(both[0])?.surface).toBe('tray');
    expect(readStoredLayout(both[1])?.surface).toBe('formal_page');
  });
  it('excludes tray from block runtime, fragments and generic geometry, including a stale blockLayouts-derived projection', () => {
    const stale = buildRuntimeBlockPlacement({block,canvasId:'note',layout:{x:0,y:30,width:760,height:100,surface:'formal_page'},pageFrame:null,pageOffsetX:0,zIndex:0});
    const mixed = {...placements[1], placementId:'shape-paper', surface:'canvas_workspace' as const, width:100,height:100};
    const runtime = buildNoteCanvasRuntimeModel({mode:'page', primaryPageFrame:null,
      viewport:{x:0,y:0,width:1000,height:800,zoom:1},blockPlacements:[stale],
      genericCanvasObjects:objects,genericCanvasPlacements:[...placements,mixed],genericContentMounts:mounts});
    expect(runtime.blockPlacements).toEqual([]);
    expect(runtime.blockFragmentProjections).toEqual([]);
    expect(runtime.canvasPlacements.map((p) => p.placementId)).toEqual(['shape-paper']);
    expect(runtime.canvasObjects.map((object) => object.objectId)).toEqual(['shape']);
  });
  it('lists one row per placement, ordered independently of z, with block/object/mount categories and empty state', () => {
    const rows = buildTrayEntries(objects, placements, mounts, [block]);
    expect(rows.map((row) => row.category)).toEqual(['block','object','mount']);
    expect(rows[0].block?.id).toBe('block');
    expect(buildTrayEntries(objects,[...placements,{...placements[1],placementId:'other',orderIndex:3}],mounts,[block])).toHaveLength(4);
    expect(buildTrayEntries([],[],[],[])).toEqual([]);
  });
});
