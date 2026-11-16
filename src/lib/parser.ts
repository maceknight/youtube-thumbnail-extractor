const HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtu.be"]);
export const VIDEO_ID = /^[a-zA-Z0-9_-]{11}$/;

export function parseVideoUrl(input: string): string {
  let url: URL;
  try { url = new URL(input.trim()); } catch { throw new Error("YouTubeのURLを入力してください。"); }
  if (!HOSTS.has(url.hostname) || !["https:", "http:"].includes(url.protocol) || url.username || url.password || url.port) {
    throw new Error("youtube.com または youtu.be の動画URLを入力してください。");
  }
  const parts = url.pathname.split("/").filter(Boolean);
  let id: string | null = null;
  if (url.hostname === "youtu.be" || url.hostname === "www.youtu.be") {
    if (parts.length === 1) id = parts[0];
  } else if (url.pathname === "/watch") id = url.searchParams.get("v");
  else if (parts.length === 2 && ["shorts", "embed", "live"].includes(parts[0])) id = parts[1];
  if (!id || !VIDEO_ID.test(id)) throw new Error("動画IDが正しくありません。動画の共有URLを確認してください。");
  return id;
}

export function parseBatch(input: string) {
  const seen = new Set<string>();
  const videos: { id: string; url: string }[] = [];
  const errors: { input: string; message: string }[] = [];
  let duplicates = 0;
  const lines = input.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  for (const line of lines) {
    try {
      const id = parseVideoUrl(line);
      if (seen.has(id)) { duplicates++; continue; }
      seen.add(id);
      videos.push({ id, url: `https://www.youtube.com/watch?v=${id}` });
    } catch (error) { errors.push({ input: line, message: (error as Error).message }); }
  }
  return { videos, errors, duplicates, count: lines.length };
}
