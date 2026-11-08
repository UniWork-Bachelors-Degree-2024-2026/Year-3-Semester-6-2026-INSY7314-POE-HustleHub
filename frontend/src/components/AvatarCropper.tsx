import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { clampView, drawnSize, renderAvatar, type CropView } from "../utils/image.ts";
import { CloseIcon, MoveIcon } from "./ProfileIcons.tsx";
//MDN Web Docs (2026) documents keeping pointer events on one element while dragging which assisted this implementation.
//React (2026) documents rendering a pop-up outside its parent element which assisted this implementation.

const FRAME = 280;

// Pop-up for framing the profile photo: drag to move, slider or +/- keys to zoom, arrow keys to nudge.
export function AvatarCropper({
  image,
  onCancel,
  onSave,
}: {
  image: HTMLImageElement;
  onCancel: () => void;
  onSave: (dataUrl: string) => void;
}) {
  const [view, setView] = useState<CropView>({ zoom: 1, x: 0, y: 0 });
  const [failed, setFailed] = useState(false);
  const drag = useRef<{ px: number; py: number; vx: number; vy: number } | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previous?.focus();
    };
  }, [onCancel]);

  const apply = (next: CropView) => setView(clampView(image, FRAME, next));

  const down = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, vx: view.x, vy: view.y };
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (d) apply({ zoom: view.zoom, x: d.vx + e.clientX - d.px, y: d.vy + e.clientY - d.py });
  };
  const up = () => {
    drag.current = null;
  };

  const keys = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = 12;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    if (moves[e.key]) {
      e.preventDefault();
      apply({ zoom: view.zoom, x: view.x + moves[e.key][0], y: view.y + moves[e.key][1] });
    } else if (e.key === "+" || e.key === "=") apply({ ...view, zoom: Math.min(3, view.zoom + 0.1) });
    else if (e.key === "-") apply({ ...view, zoom: Math.max(1, view.zoom - 0.1) });
  };

  const { w, h } = drawnSize(image, FRAME, view.zoom);

  const save = () => {
    const url = renderAvatar(image, FRAME, view);
    if (url) onSave(url);
    else setFailed(true);
  };

  // Rendered on the document body: the page content is animated, and an animated parent makes
  // position: fixed relative to that parent instead of the screen, which pushed the pop-up off centre.
  return createPortal(
    <div className='mk'>
      <div className='pf-modal-backdrop' onClick={onCancel}>
        <div
          className='pf-modal'
          role='dialog'
          aria-modal='true'
          aria-labelledby='crop-title'
          onClick={(e) => e.stopPropagation()}
        >
          <button ref={closeRef} type='button' className='pf-modal-close' aria-label='Close' onClick={onCancel}>
            <CloseIcon size={18} />
          </button>
          <h2 id='crop-title'>Frame your photo</h2>
          <p className='pf-modal-sub'>Drag to reposition and zoom until you look great.</p>

          <div
            className='pf-crop'
            style={{ width: FRAME, height: FRAME }}
            tabIndex={0}
            role='group'
            aria-label='Photo frame. Use arrow keys to move and plus or minus to zoom.'
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
            onKeyDown={keys}
          >
            <img
              src={image.src}
              alt=''
              draggable={false}
              style={{ width: w, height: h, left: FRAME / 2 - w / 2 + view.x, top: FRAME / 2 - h / 2 + view.y }}
            />
            <span className='pf-crop-mask' aria-hidden='true' />
            <span className='pf-crop-hint' aria-hidden='true'>
              <MoveIcon size={14} /> Drag
            </span>
          </div>

          <label className='pf-zoom'>
            <span className='label'>Zoom</span>
            <input
              type='range'
              min={1}
              max={3}
              step={0.01}
              value={view.zoom}
              onChange={(e) => apply({ ...view, zoom: Number(e.target.value) })}
            />
          </label>

          {failed && (
            <p className='err-text' role='alert'>
              Your browser could not prepare that photo. Please try another image.
            </p>
          )}

          <div className='pf-modal-actions'>
            <button type='button' className='btn btn-ghost' onClick={onCancel}>
              Cancel
            </button>
            <button type='button' className='btn' onClick={save}>
              Use this photo
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

//Reference List
//MDN Web Docs, 2026. Element: setPointerCapture() method. [online] Available at: <https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture> [Accessed 11 October 2026].
//React, 2026. createPortal. [online] Available at: <https://react.dev/reference/react-dom/createPortal> [Accessed 11 October 2026].
