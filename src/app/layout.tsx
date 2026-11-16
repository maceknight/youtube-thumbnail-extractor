import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "YouTube Thumbnail Extractor",
  description: "YouTubeのサムネイルを取得し、1920×1080のJPEGで保存するブラウザだけで動くツール。"
};
export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><body>{children}</body></html>;
}
