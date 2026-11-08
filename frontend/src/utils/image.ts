//MDN Web Docs (2026a) documents drawing an image onto a canvas which assisted this implementation.
//MDN Web Docs (2026b) documents reading a chosen file as a data URL which assisted this implementation.
//MDN Web Docs (2026c) documents exporting a canvas as an image which assisted this implementation.
// Helpers for choosing and cropping a profile photo.
// The photo is read as a data URL (the CSP allows img-src data: but not blob:), its real file type is
// checked from the first bytes, and it is redrawn on a canvas. Redrawing drops metadata (EXIF, GPS)
// and anything hidden in the file, so only plain pixels are kept.

export const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
export const AVATAR_OUTPUT = 320;

export function checkImageFile(file: File): string | null {
  if (!AVATAR_TYPES.includes(file.type)) return "Please choose a JPG, PNG or WebP image.";
  if (file.size > AVATAR_MAX_BYTES) return "That image is larger than 5 MB. Please choose a smaller one.";
  if (file.size < 200) return "That file looks empty. Please choose another image.";
  return null;
}

async function hasImageSignature(file: File): Promise<boolean> {
  const b = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const jpeg = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  const png = b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
  const webp =
    b[0] === 0x52 &&
    b[1] === 0x49 &&
    b[2] === 0x46 &&
    b[3] === 0x46 &&
    b[8] === 0x57 &&
    b[9] === 0x45 &&
    b[10] === 0x42 &&
    b[11] === 0x50;
  return jpeg || png || webp;
}

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("read"));
    reader.readAsDataURL(file);
  });

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("decode"));
    img.src = src;
  });

/** Runs every check and returns a decoded image, or throws an Error with a message that is safe to show. */
export async function readImageFile(file: File): Promise<HTMLImageElement> {
  const problem = checkImageFile(file);
  if (problem) throw new Error(problem);
  if (!(await hasImageSignature(file))) throw new Error("That file is not a real JPG, PNG or WebP image.");
  let img: HTMLImageElement;
  try {
    img = await loadImage(await readAsDataUrl(file));
  } catch (cause) {
    throw new Error("We could not open that image. Please try another one.", { cause });
  }
  if (img.naturalWidth < 64 || img.naturalHeight < 64)
    throw new Error("That image is too small. Use one at least 64 px wide.");
  return img;
}

export interface CropView {
  /** 1 fills the frame, higher zooms in */
  zoom: number;
  /** Offset of the image centre from the frame centre, in frame pixels */
  x: number;
  y: number;
}

/** Size the image is drawn at inside a square frame, so it always covers the frame at zoom 1. */
export function drawnSize(img: { naturalWidth: number; naturalHeight: number }, frame: number, zoom: number) {
  const base = Math.max(frame / img.naturalWidth, frame / img.naturalHeight);
  return { w: img.naturalWidth * base * zoom, h: img.naturalHeight * base * zoom };
}

/** Keeps the image covering the frame so no empty edges show. */
export function clampView(
  img: { naturalWidth: number; naturalHeight: number },
  frame: number,
  view: CropView,
): CropView {
  const { w, h } = drawnSize(img, frame, view.zoom);
  const mx = Math.max(0, (w - frame) / 2);
  const my = Math.max(0, (h - frame) / 2);
  return { zoom: view.zoom, x: Math.min(mx, Math.max(-mx, view.x)), y: Math.min(my, Math.max(-my, view.y)) };
}

/** Draws the chosen area onto a canvas and returns it as a small JPEG data URL. */
export function renderAvatar(img: HTMLImageElement, frame: number, view: CropView): string | null {
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_OUTPUT;
  canvas.height = AVATAR_OUTPUT;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const v = clampView(img, frame, view);
  const { w, h } = drawnSize(img, frame, v.zoom);
  const k = AVATAR_OUTPUT / frame;
  ctx.fillStyle = "#141316";
  ctx.fillRect(0, 0, AVATAR_OUTPUT, AVATAR_OUTPUT);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, (frame / 2 - w / 2 + v.x) * k, (frame / 2 - h / 2 + v.y) * k, w * k, h * k);
  return canvas.toDataURL("image/jpeg", 0.88);
}

//Reference List
//MDN Web Docs, 2026a. CanvasRenderingContext2D: drawImage() method. [online] Available at: <https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage> [Accessed 11 October 2026].
//MDN Web Docs, 2026b. FileReader: readAsDataURL() method. [online] Available at: <https://developer.mozilla.org/en-US/docs/Web/API/FileReader/readAsDataURL> [Accessed 11 October 2026].
//MDN Web Docs, 2026c. HTMLCanvasElement: toDataURL() method. [online] Available at: <https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toDataURL> [Accessed 11 October 2026].
