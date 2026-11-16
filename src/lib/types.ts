export interface Thumbnail {
  id: string;
  url: string;
  title: string;
  createdAt: string;
  original: string;
  processed: string | null;
  sourceWidth: number;
  sourceHeight: number;
  outputWidth: number | null;
  outputHeight: number | null;
  bytes: number;
  sourceName: string;
  warning?: string;
}
export interface Failure { id: string; url: string; message: string }
