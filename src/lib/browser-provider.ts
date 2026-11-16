import { VIDEO_ID } from "./parser";
import type { Thumbnail } from "./types";

// ブラウザから直接 i.ytimg.com / YouTube oEmbed を取得し、Canvas で 1920×1080 に変換する。
export const CANDIDATES = [
  { name: "maxresdefault", width: 1280, height: 720 },
  { name: "sddefault", width: 640, height: 480 },
  { name: "hqdefault", width: 480, height: 360 },
  { name: "mqdefault", width: 320, height: 180 },
  { name: "default", width: 120, height: 90 }
] as const;
const MAX_BYTES = 8 * 1024 * 1024;

export class ThumbnailError extends Error {}

function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function metadata(id: string) {
  try {
    const url = new URL("https://www.youtube.com/oembed");
    url.searchParams.set("url", `https://www.youtube.com/watch?v=${id}`);
    url.searchParams.set("format", "json");
    const response = await fetch(url, { signal: AbortSignal.timeout(6000), cache: "no-store" });
    if ([401, 403, 404].includes(response.status)) return { unavailable: true, title: id };
    if (!response.ok) return { unavailable: false, title: id };
    const data = await response.json();
    return { unavailable: false, title: typeof data.title === "string" ? data.title.slice(0, 500) : id };
  } catch { return { unavailable: false, title: id }; }
}

async function convert(blob: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1920; canvas.height = 1080;
    const ctx = canvas.getContext("2d", { colorSpace: "srgb" });
    if (!ctx) throw new Error("canvas");
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    // 中央基準で 16:9 にクロップ（cover）
    const scale = Math.max(1920 / bitmap.width, 1080 / bitmap.height);
    const sw = 1920 / scale, sh = 1080 / scale;
    ctx.drawImage(bitmap, (bitmap.width - sw) / 2, (bitmap.height - sh) / 2, sw, sh, 0, 0, 1920, 1080);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(b => (b ? resolve(b) : reject(new Error("toBlob"))), "image/jpeg", 0.95));
  } finally { bitmap.close(); }
}

export async function getThumbnail(id: string): Promise<Thumbnail> {
  if (!VIDEO_ID.test(id)) throw new ThumbnailError("動画IDが正しくありません。");
  const infoPromise = metadata(id);
  let selected: { blob: Blob; width: number; height: number; name: string } | undefined;
  let networkFailure = false;
  for (const candidate of CANDIDATES) {
    try {
      const response = await fetch(`https://i.ytimg.com/vi/${id}/${candidate.name}.jpg`,
        { signal: AbortSignal.timeout(8000), cache: "no-store" });
      if (!response.ok) { if (response.status !== 404) networkFailure = true; continue; }
      const blob = await response.blob();
      if (blob.type !== "image/jpeg" || blob.size > MAX_BYTES) continue;
      const bitmap = await createImageBitmap(blob);
      const { width, height } = bitmap; bitmap.close();
      if (width < candidate.width || height < candidate.height) continue;
      selected = { blob, width, height, name: candidate.name };
      break;
    } catch { networkFailure = true; }
  }
  const info = await infoPromise;
  if (info.unavailable) throw new ThumbnailError("動画を取得できません。削除・非公開・視聴制限などの可能性があります。");
  if (!selected) throw new ThumbnailError(networkFailure
    ? "サムネイルを取得できませんでした。通信環境を確認して再試行してください。"
    : "サムネイルが見つかりません。動画URLや公開状態を確認してください。");
  const base = {
    id, url: `https://www.youtube.com/watch?v=${id}`, title: info.title, createdAt: new Date().toISOString(),
    original: await toDataUrl(selected.blob),
    sourceWidth: selected.width, sourceHeight: selected.height, sourceName: selected.name
  };
  try {
    const out = await convert(selected.blob);
    return { ...base, processed: await toDataUrl(out), outputWidth: 1920, outputHeight: 1080, bytes: out.size };
  } catch {
    return { ...base, processed: null, outputWidth: null, outputHeight: null, bytes: selected.blob.size,
      warning: "1920×1080への変換に失敗しました。元画像はプレビューから保存できます。" };
  }
}
