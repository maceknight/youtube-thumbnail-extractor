import type { NextConfig } from "next";
// GitHub Pages 用の静的書き出し。リポジトリ名のサブパスで公開される。
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const config: NextConfig = {
  output: "export",
  basePath,
  images: { unoptimized: true },
  trailingSlash: true
};
export default config;
