import { openDB } from "idb";
import type { Thumbnail } from "./types";

const MAX_ITEMS = 100;
const MAX_DATA_BYTES = 100 * 1024 * 1024;
const db = () => openDB("youtube-thumbnail-extractor", 1, {
  upgrade(database) { database.createObjectStore("thumbnails", { keyPath: "id" }); }
});
export async function loadHistory(): Promise<Thumbnail[]> {
  const database = await db();
  try {
    const rows: Thumbnail[] = await database.getAll("thumbnails");
    return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } finally { database.close(); }
}
export async function saveHistory(item: Thumbnail): Promise<number> {
  const database = await db();
  try {
    const tx = database.transaction("thumbnails", "readwrite");
    await tx.store.put(item);
    const rows: Thumbnail[] = (await tx.store.getAll()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    let bytes = 0;
    let removed = 0;
    for (const [i, row] of rows.entries()) {
      bytes += (row.original.length + (row.processed?.length ?? 0)) * 2;
      if (i >= MAX_ITEMS || bytes > MAX_DATA_BYTES) { await tx.store.delete(row.id); removed++; }
    }
    await tx.done;
    return removed;
  } finally { database.close(); }
}
export async function deleteHistory(ids?: string[]) {
  const database = await db();
  try {
    const tx = database.transaction("thumbnails", "readwrite");
    if (ids) { for (const id of ids) await tx.store.delete(id); } else await tx.store.clear();
    await tx.done;
  } finally { database.close(); }
}
