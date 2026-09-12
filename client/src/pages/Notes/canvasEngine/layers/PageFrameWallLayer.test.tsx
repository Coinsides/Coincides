import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { projectPageFrameToReadingSurface } from '../pageFramePresentationService';
import type { PageFrameModel } from '../types';
import { PageFrameWallLayer } from './PageFrameWallLayer';

afterEach(cleanup);

const frame: PageFrameModel = {
  id: 'walls-ui-frame', role: 'primary_page_frame', exportable: true,
  x: 420, y: 24, width: 904, height: 1278,
  contentInset: { left: 72, right: 72, top: 96, bottom: 96 },
};

describe('paper margin walls', () => {
  it('places pointer targets on current projected content bounds without adding a second inset', () => {
    const onPointerDown = vi.fn();
    const props = { frame: projectPageFrameToReadingSurface(frame, 'v2', 0), interactive: true, onPointerDown };
    const view = render(<PageFrameWallLayer {...props} />);
    const left = view.getByRole('separator', { name: 'Left page margin' });
    const right = view.getByRole('separator', { name: 'Right page margin' });
    expect(left.style.left).toBe('0px');
    expect(right.style.left).toBe('760px');
    expect(left.style.top).toBe('120px');
    expect(left.style.height).toBe('1086px');
    expect(left.dataset.pageFrameWallActive).toBe('false');
    expect(right.dataset.pageFrameWallActive).toBe('false');
    fireEvent.pointerDown(right, { pointerId: 1, clientX: 760, button: 0 });
    expect(onPointerDown).toHaveBeenCalledWith(expect.anything(), frame.id, 'right');

    const preview = { ...frame, contentInset: { ...frame.contentInset, left: 24, right: 240 } };
    view.rerender(<PageFrameWallLayer frame={projectPageFrameToReadingSurface(preview, 'v2', 0)}
      interactive activeWall={{ frameId: frame.id, side: 'right' }} onPointerDown={onPointerDown} />);
    expect(left.style.left).toBe('0px');
    expect(right.style.left).toBe('640px');
    expect(right.dataset.pageFrameWallActive).toBe('true');
    expect(left.dataset.pageFrameWallActive).toBe('false');
  });

  it('does not let margin gestures create a blank writing block or open the canvas menu', () => {
    const blankMouseDown = vi.fn();
    const blankDoubleClick = vi.fn();
    const blankContextMenu = vi.fn();
    const view = render(<div onMouseDown={blankMouseDown} onDoubleClick={blankDoubleClick} onContextMenu={blankContextMenu}>
      <PageFrameWallLayer frame={frame} interactive onPointerDown={vi.fn()} />
    </div>);
    const wall = view.getByRole('separator', { name: 'Left page margin' });
    fireEvent.mouseDown(wall);
    fireEvent.doubleClick(wall);
    fireEvent.contextMenu(wall);
    expect(blankMouseDown).not.toHaveBeenCalled();
    expect(blankDoubleClick).not.toHaveBeenCalled();
    expect(blankContextMenu).not.toHaveBeenCalled();
  });

  it('extends idle material across the cover without moving or resizing either live margin target', () => {
    const onPointerDown = vi.fn();
    const view = render(<PageFrameWallLayer frame={frame} interactive idleHeaderHeight={192} onPointerDown={onPointerDown} />);
    const walls = view.getAllByRole('separator');
    expect(walls.map((wall) => [wall.style.left, wall.style.top, wall.style.height]))
      .toEqual([['492px', '120px', '1086px'], ['1252px', '120px', '1086px']]);
    expect(walls.map((wall) => wall.style.getPropertyValue('--paper-wall-idle-top'))).toEqual(['-288px', '-288px']);
    fireEvent.pointerDown(walls[0], { pointerId: 1, button: 0 });
    expect(onPointerDown).toHaveBeenCalledWith(expect.anything(), frame.id, 'left');
  });

  it('keeps material inert outside Layout without exposing margin controls or callbacks', () => {
    const onPointerDown = vi.fn();
    const view = render(<PageFrameWallLayer frame={frame} interactive={false}
      activeWall={{ frameId: frame.id, side: 'left' }} onPointerDown={onPointerDown} />);
    expect(view.queryAllByRole('separator')).toEqual([]);
    const walls = view.container.querySelectorAll<HTMLElement>('[data-page-frame-wall]');
    expect(walls).toHaveLength(2);
    for (const wall of walls) {
      expect(wall.dataset.pageFrameWallInteractive).toBe('false');
      expect(wall.dataset.pageFrameWallActive).toBe('false');
      expect(wall.getAttribute('aria-hidden')).toBe('true');
      fireEvent.pointerDown(wall, { pointerId: 1, button: 0 });
    }
    expect(onPointerDown).not.toHaveBeenCalled();
  });

  it('releases margin event interception when Layout is turned off', () => {
    const onPointerDown = vi.fn();
    const writingMouseDown = vi.fn();
    const writingDoubleClick = vi.fn();
    const writingContextMenu = vi.fn();
    const renderSurface = (layoutMode: boolean) => (
      <div onMouseDown={writingMouseDown} onDoubleClick={writingDoubleClick} onContextMenu={writingContextMenu}>
        <PageFrameWallLayer frame={frame} interactive={layoutMode} onPointerDown={onPointerDown} />
      </div>
    );
    const view = render(renderSurface(true));
    expect(view.getAllByRole('separator')).toHaveLength(2);
    view.rerender(renderSurface(false));
    const wall = view.container.querySelector<HTMLElement>('[data-page-frame-wall="left"]')!;
    fireEvent.pointerDown(wall, { pointerId: 1, button: 0 });
    fireEvent.mouseDown(wall);
    fireEvent.doubleClick(wall);
    fireEvent.contextMenu(wall);
    expect(onPointerDown).not.toHaveBeenCalled();
    expect(writingMouseDown).toHaveBeenCalledTimes(1);
    expect(writingDoubleClick).toHaveBeenCalledTimes(1);
    expect(writingContextMenu).toHaveBeenCalledTimes(1);
    expect(view.queryAllByRole('separator')).toHaveLength(0);
  });
});
