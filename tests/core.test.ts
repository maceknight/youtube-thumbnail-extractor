import { test } from "node:test";
import assert from "node:assert/strict";
import { parseBatch, parseVideoUrl } from "../src/lib/parser";
const ID = "dQw4w9WgXcQ";

test("all five URL formats normalize tracking parameters", () => {
  for (const url of [`https://youtube.com/watch?v=${ID}&t=42`, `https://youtu.be/${ID}?si=test`,
    ...["shorts", "embed", "live"].map(kind => `https://www.youtube.com/${kind}/${ID}?feature=share`)]) {
    assert.equal(parseVideoUrl(url), ID);
  }
});
test("rejects hostile hosts, credentials, unsupported paths, IDs and schemes", () => {
  for (const url of [`https://youtube.com.evil.test/watch?v=${ID}`, `https://evil.test/?url=https://youtube.com/watch?v=${ID}`,
    `https://youtube.com@127.0.0.1/watch?v=${ID}`, `ftp://youtube.com/watch?v=${ID}`, `https://youtube.com:3000/watch?v=${ID}`,
    `https://youtube.com/playlist?list=${ID}`, `https://youtube.com/shorts/${ID}/other`, "https://youtu.be/bad", ID]) {
    assert.throws(() => parseVideoUrl(url));
  }
});
test("batch deduplicates by ID and keeps invalid rows separate", () => {
  const parsed = parseBatch(`https://youtu.be/${ID}\nhttps://youtube.com/watch?v=${ID}&t=3\ninvalid\n\n`);
  assert.equal(parsed.videos.length, 1); assert.equal(parsed.duplicates, 1); assert.equal(parsed.errors.length, 1);
});
