import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTrayController } from './useTrayController';
import type { RuntimeHistoryEntry } from '../historyService';
import type { NoteBlock } from '../runtimeDataTypes';

const mocks = vi.hoisted(() => ({ save: vi.fn(), post: vi.fn() }));
vi.mock('../canvasObjectRepository', () => ({ saveBlockCanvasPlacementForNote: mocks.save }));
vi.mock('@/services/api', () => ({ default: { post: mocks.post } }));
const block: NoteBlock = { id:'block', placement_id:'placement', display_overrides_json:{},
  block_type:'paragraph', title:null, content_json:{body:'Draft'}, plain_text:'Draft',
  metadata:{}, order_index:0, source_references:[] };

function input() {
  return {noteId:'note',enabled:true,blocks:[block],objects:[],placements:[],mounts:[],
    selectedBlockId:'block',blockLayouts:{block:{x:0,y:100,width:760,height:72,surface:'formal_page' as const}},
    collection:null,pageOffsetX:0,refresh:vi.fn().mockResolvedValue(undefined),clearSelection:vi.fn(),
    pushHistory:vi.fn<(entry: RuntimeHistoryEntry) => void>(),flushBlock:vi.fn().mockResolvedValue(true)};
}
describe('ordinary reversible tray edits', () => {
  beforeEach(() => {mocks.save.mockReset().mockResolvedValue({});mocks.post.mockReset();});
  it('waits for the editor save and retains undo/redo even when refreshing the saved edit fails', async () => {
    const options=input();
    let finish!: (saved: boolean) => void;
    options.flushBlock.mockReturnValue(new Promise<boolean>((resolve) => {finish=resolve;}));
    options.refresh.mockRejectedValue(new Error('Synthetic refresh failure'));
    const {result}=renderHook(()=>useTrayController(options));
    let pending!: Promise<void>;
    act(()=>{pending=result.current.moveSelectedToTray();});
    expect(mocks.save).not.toHaveBeenCalled();
    await act(async()=>{finish(true);await pending;});
    expect(mocks.save.mock.calls[0][0].layout).toMatchObject({surface:'tray',order_index:0,x:0,y:0,width:0,height:0});
    expect(result.current.error).toContain('edit was saved');
    const edit=options.pushHistory.mock.calls[0][0];
    if(edit.type!=='reversibleEdit')throw new Error('Expected ordinary history edit');
    await act(async()=>{expect(await edit.undo()).toBe(true);});
    expect(mocks.save.mock.calls[1][0].layout).toEqual(options.blockLayouts.block);
    await act(async()=>{expect(await edit.redo()).toBe(true);});
    expect(mocks.save.mock.calls[2][0].layout.surface).toBe('tray');
  });
  it('does not remove a block with a pending content save', async () => {
    const options=input();options.flushBlock.mockResolvedValue(false);
    const {result}=renderHook(()=>useTrayController(options));
    await act(async()=>{await result.current.moveSelectedToTray();});
    expect(mocks.save).not.toHaveBeenCalled();expect(options.pushHistory).not.toHaveBeenCalled();
    expect(result.current.error).toBeTruthy();
  });
  it('uses the split receipt for undo/redo and refuses history writes after changing notes', async () => {
    const options=input();mocks.post.mockResolvedValue({data:{note_id:'new-note',batch_id:'batch'}});
    const {result,rerender}=renderHook((props)=>useTrayController(props),{initialProps:options});
    await act(async()=>{await result.current.split(['placement'],'New note');});
    expect(result.current.createdNoteId).toBe('new-note');
    const edit=options.pushHistory.mock.calls[0][0];
    if(edit.type!=='reversibleEdit')throw new Error('Expected ordinary history edit');
    await act(async()=>{expect(await edit.undo()).toBe(true);});
    expect(mocks.post).toHaveBeenLastCalledWith('/notes/note/tray/split/batch',{applied:false});
    await act(async()=>{expect(await edit.redo()).toBe(true);});
    expect(mocks.post).toHaveBeenLastCalledWith('/notes/note/tray/split/batch',{applied:true});
    rerender({...options,noteId:'other-note'});
    expect(await edit.undo()).toBe(false);expect(mocks.post).toHaveBeenCalledTimes(3);
  });
});
