import JSZip from "jszip";
import { VIDEO_ID } from "./parser";
import type { Thumbnail } from "./types";

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
export function jpegBlob(data: string) {
  if (!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(data)) throw new Error("JPEG画像の形式が正しくありません。");
  return new Blob([Uint8Array.from(atob(data.split(",")[1]), c => c.charCodeAt(0))], { type: "image/jpeg" });
}
export async function createZip(items: Thumbnail[]) {
  const zip = new JSZip();
  const seen = new Set<string>();
  for (const item of items) {
    if (!VIDEO_ID.test(item.id) || !item.processed || seen.has(item.id)) continue;
    jpegBlob(item.processed);
    seen.add(item.id);
    zip.file(`${item.id}.jpg`, item.processed.split(",")[1], { base64: true });
  }
  if (!seen.size) throw new Error("保存できる画像がありません。");
  return zip.generateAsync({ type: "blob", compression: "STORE" });
}
export function zipName(date = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `youtube_thumbnails_${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}.zip`;
}
