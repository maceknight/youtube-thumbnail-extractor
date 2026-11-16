"use client";
import { useEffect, useMemo, useState } from "react";
import { ClipboardPaste, Download, ImageIcon, LoaderCircle, Play, Settings2, Trash2 } from "lucide-react";
import Modal from "@/components/Modal";
import { parseBatch } from "@/lib/parser";
import { getThumbnail } from "@/lib/browser-provider";
import { loadHistory, saveHistory, deleteHistory } from "@/lib/storage";
import { createZip, jpegBlob, saveBlob, zipName } from "@/lib/download";
import type { Thumbnail, Failure } from "@/lib/types";

export default function Home() {
  const [input, setInput] = useState("");
  const parsed = useMemo(() => parseBatch(input), [input]);
  const [results, setResults] = useState<Thumbnail[]>([]);
  const [history, setHistory] = useState<Thumbnail[]>([]);
  const [historyReady, setHistoryReady] = useState(false);
  const [tab, setTab] = useState<"results" | "history">("results");
  const [errors, setErrors] = useState<Failure[]>([]);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [concurrency, setConcurrency] = useState(5);
  const [progress, setProgress] = useState({ done: 0, total: 0, ok: 0, failed: 0 });
  const [current, setCurrent] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<Thumbnail | null>(null);
  const [original, setOriginal] = useState(false);
  const [zipItems, setZipItems] = useState<Thumbnail[] | null>(null);
  const [zipping, setZipping] = useState(false);
  const [deleteAll, setDeleteAll] = useState(false);
  const items = tab === "results" ? results : history;
  const targets = items.filter(item => item.processed && (selected.size === 0 || selected.has(item.id)));

  useEffect(() => {
    let mounted = true;
    loadHistory().then(rows => { if (mounted) setHistory(rows); })
      .catch(() => { if (mounted) setNotice("履歴を読み込めませんでした。このブラウザでの保存設定を確認してください。"); })
      .finally(() => { if (mounted) setHistoryReady(true); });
    return () => { mounted = false; };
  }, []);

  async function run(videos = parsed.videos, retry = false) {
    if (busy || !videos.length) return;
    if (videos.length > 50 || (!retry && parsed.count > 50)) { setNotice("1回に入力できるURLは50件までです。"); return; }
    setBusy(true); setTab("results"); setSelected(new Set()); setNotice("");
    if (!retry) setErrors([]);
    else setErrors(previous => previous.filter(error => !videos.some(video => video.id === error.id)));
    setProgress({ done: 0, total: videos.length, ok: 0, failed: 0 });
    let cursor = 0;
    async function worker() {
      while (cursor < videos.length) {
        const video = videos[cursor++];
        setCurrent(previous => [...previous, video.id]);
        try {
          const item = await getThumbnail(video.id);
          setResults(previous => [item, ...previous.filter(row => row.id !== item.id)]);
          try {
            const removed = await saveHistory(item);
            setHistory(await loadHistory());
            if (removed) setNotice("履歴の上限に達したため、古い画像を自動削除しました。");
          } catch { setNotice("履歴を保存できませんでした。今回の画像は画面からダウンロードできます。"); }
          setProgress(previous => ({ ...previous, done: previous.done + 1, ok: previous.ok + 1 }));
        } catch (error) {
          const message = error instanceof Error && error.name !== "TimeoutError" && error.name !== "TypeError"
            ? error.message : "通信に失敗しました。接続を確認して再試行してください。";
          setErrors(previous => [...previous.filter(row => row.id !== video.id), { ...video, message }]);
          setProgress(previous => ({ ...previous, done: previous.done + 1, failed: previous.failed + 1 }));
        } finally { setCurrent(previous => previous.filter(id => id !== video.id)); }
      }
    }
    try { await Promise.all(Array.from({ length: Math.min(concurrency, videos.length) }, () => worker())); }
    finally { setBusy(false); }
  }

  function showPreview(item: Thumbnail) { setOriginal(!item.processed); setPreview(item); }
  async function remove(ids: string[]) {
    try {
      await deleteHistory(ids);
      setHistory(previous => previous.filter(item => !ids.includes(item.id)));
      setResults(previous => previous.filter(item => !ids.includes(item.id)));
      setSelected(previous => new Set([...previous].filter(id => !ids.includes(id))));
    } catch { setNotice("履歴を削除できませんでした。再試行してください。"); }
  }
  async function clearHistory() {
    try { await deleteHistory(); setHistory([]); setResults([]); setSelected(new Set()); setDeleteAll(false); }
    catch { setNotice("履歴を削除できませんでした。再試行してください。"); setDeleteAll(false); }
  }
  function download(item: Thumbnail, source: boolean) {
    try {
      const data = source ? item.original : item.processed;
      if (data) saveBlob(jpegBlob(data), source ? `${item.id}_original.jpg` : `${item.id}.jpg`);
    } catch { setNotice("画像を保存できませんでした。もう一度お試しください。"); }
  }
  async function downloadZip() {
    if (!zipItems) return;
    setZipping(true);
    try { saveBlob(await createZip(zipItems), zipName()); setZipItems(null); }
    catch { setNotice("ZIPを作成できませんでした。画像は残っていますので再試行してください。"); }
    finally { setZipping(false); }
  }
  function toggle(id: string) {
    setSelected(previous => { const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }
  const storedMb = (history.reduce((sum, item) => sum + (item.original.length + (item.processed?.length ?? 0)) * 2, 0) / 1024 / 1024).toFixed(1);

  return <main>
    <header className="header"><div className="brand"><span className="brand-icon"><Play fill="currentColor" size={18}/></span><div><strong>THUMBNAIL EXTRACTOR</strong><span className="brand-sub">YouTubeのサムネイルを、使いやすいサイズに。</span></div></div><span className="format-badge">JPEG · 1920 × 1080</span></header>
    <section className="intro"><span className="eyebrow">YOUTUBE THUMBNAILS</span><h1>URLを入れて、<br className="mobile-break"/>サムネイルを保存。</h1><p>まとめて取得して、プレビューを確認。そのままJPEGやZIPで保存できます。</p></section>
    <section className="input-panel" aria-label="URLの入力">
      <div className="section-top"><label htmlFor="urls">YouTubeの動画URL</label><button className="text-button" disabled={busy} onClick={async () => {
        try { const text = await navigator.clipboard.readText(); setInput(value => value ? `${value}\n${text}` : text); }
        catch { setNotice("クリップボードを読み取れませんでした。入力欄に直接貼り付けてください。"); }
      }}><ClipboardPaste size={15}/>貼り付け</button></div>
      <textarea id="urls" value={input} onChange={event => setInput(event.target.value)} disabled={busy}
        placeholder={"https://www.youtube.com/watch?v=...\nhttps://youtu.be/..."} spellCheck={false} rows={4}/>
      <div className="input-footer"><span className="muted">改行区切り・最大50件 <span className="count">{parsed.videos.length}件</span>{parsed.duplicates > 0 && ` · 重複${parsed.duplicates}件を除外`}</span><div className="button-row"><button disabled={busy || !input} onClick={() => setInput("")}>クリア</button><button className="primary" onClick={() => run()} disabled={busy || !historyReady || !parsed.videos.length || parsed.count > 50}>{busy ? <LoaderCircle className="spin" size={16}/> : <ImageIcon size={16}/>}サムネイルを取得</button></div></div>
      <details className="settings"><summary><Settings2 size={14}/>取得設定</summary><label htmlFor="concurrency">同時取得数</label><select id="concurrency" value={concurrency} disabled={busy} onChange={event => setConcurrency(Number(event.target.value))}>{[1,2,3,4,5].map(value => <option key={value} value={value}>{value}件</option>)}</select><span className="muted">通信が不安定な場合は件数を減らしてください。</span></details>
    </section>
    {parsed.errors.length > 0 && <div className="validation" role="alert">{parsed.errors.map((error, i) => <p key={i}><span className="error-url">{error.input}</span>：{error.message}</p>)}</div>}
    {parsed.count > 50 && <p className="notice" role="alert">1回に入力できるURLは50件までです。</p>}
    {notice && <p className="notice" role="status">{notice}</p>}
    {progress.total > 0 && <section className="progress-panel" aria-live="polite"><div className="section-top"><strong>{busy ? "取得中" : "処理完了"} <span className="muted">{progress.done} / {progress.total}件</span></strong><span>成功 {progress.ok} · 失敗 {progress.failed} · {Math.round(progress.done / progress.total * 100)}%</span></div><progress value={progress.done} max={progress.total} aria-label="取得の進捗"/>{current.length > 0 && <p className="muted processing">処理中：{current.join(" / ")}</p>}</section>}
    {errors.length > 0 && <section className="validation" aria-label="取得エラー"><div className="section-top"><strong>取得できなかった動画 {errors.length}件</strong><button disabled={busy} onClick={() => run(errors.map(({ id, url }) => ({ id, url })), true)}>失敗分を再試行</button></div>{errors.map(error => <p key={error.id}><code>{error.id}</code>：{error.message}</p>)}</section>}
    <section className="collection" aria-label="サムネイル一覧">
      <div className="collection-top"><div className="tabs" role="tablist" aria-label="表示する画像"><button role="tab" aria-selected={tab === "results"} onClick={() => { setTab("results"); setSelected(new Set()); }}>今回の取得 <span>{results.length}</span></button><button role="tab" aria-selected={tab === "history"} onClick={() => { setTab("history"); setSelected(new Set()); }}>履歴 <span>{history.length}</span></button></div><button className="primary zip-button" onClick={() => setZipItems(targets)} disabled={busy || !targets.length}><Download size={15}/>{selected.size ? `選択した${targets.length}件` : `全${targets.length}件`}をZIPで保存</button></div>
      {items.length > 0 && <div className="selection-bar"><label><input type="checkbox" checked={items.length > 0 && items.every(item => selected.has(item.id))} onChange={event => setSelected(event.target.checked ? new Set(items.map(item => item.id)) : new Set())}/>すべて選択</label><span className="muted">{selected.size}件選択</span>{selected.size > 0 && <button className="text-button danger" disabled={busy} onClick={() => remove([...selected])}>選択した画像を削除</button>}</div>}
      {!historyReady ? <div className="empty"><LoaderCircle className="spin"/><p>履歴を読み込んでいます</p></div> : items.length === 0 ? <div className="empty"><ImageIcon size={32} strokeWidth={1.25}/><h2>{tab === "results" ? "取得したサムネイルがここに表示されます" : "保存した履歴はまだありません"}</h2><p>通常の動画・Shorts・LiveのURLに対応しています。</p></div> : <div className="grid">{items.map(item => <article className="card" key={item.id}>
        <div className="card-image"><button className="image-button" onClick={() => showPreview(item)} aria-label={`${item.title}をプレビュー`}><img src={item.processed || item.original} alt={item.title}/><span className="preview-hint">クリックしてプレビュー</span></button><input className="card-checkbox" type="checkbox" aria-label={`${item.id}を選択`} checked={selected.has(item.id)} onChange={() => toggle(item.id)}/><span className={`image-status ${item.warning ? "warning" : ""}`}>{item.processed ? "取得済み" : "元画像のみ"}</span></div>
        <div className="card-body"><h3 title={item.title}>{item.title}</h3><code>{item.id}</code><p className="dimensions">元画像 {item.sourceWidth} × {item.sourceHeight}<span>→ {item.processed ? "1920 × 1080" : "変換失敗"}</span></p>{item.warning && <p className="warning-text">{item.warning}</p>}<div className="card-actions"><button onClick={() => showPreview(item)}><Download size={14}/>確認して保存</button><button className="icon-button" disabled={busy} onClick={() => remove([item.id])} aria-label={`${item.id}を削除`}><Trash2 size={16}/></button></div></div>
      </article>)}</div>}
      {tab === "history" && <div className="history-footer"><span className="muted">このブラウザに保存：{history.length} / 100件 · 約{storedMb} / 100 MB<br/>上限を超えると古い画像から自動削除します。履歴は他の端末には同期されません。</span><button disabled={busy || !history.length} className="text-button danger" onClick={() => setDeleteAll(true)}><Trash2 size={14}/>全履歴を削除</button></div>}
    </section>
    <footer>元画像が小さい場合、拡大しても画質は向上しません。<br/>利用する権利のある画像を対象に、<a href="https://www.youtube.com/t/terms" target="_blank" rel="noreferrer">YouTubeの利用規約</a>に従ってご利用ください。</footer>
    {preview && <Modal title="画像のプレビュー" onClose={() => setPreview(null)}><div className="preview-modes"><button aria-pressed={!original} disabled={!preview.processed} className={!original ? "active" : ""} onClick={() => setOriginal(false)}>出力画像</button><button aria-pressed={original} className={original ? "active" : ""} onClick={() => setOriginal(true)}>元画像</button></div><img className="large-preview" src={original ? preview.original : preview.processed!} alt={preview.title}/><h3 className="preview-title">{preview.title}</h3><dl className="image-info"><div><dt>元画像</dt><dd>{preview.sourceWidth} × {preview.sourceHeight} px</dd></div><div><dt>出力画像</dt><dd>{preview.processed ? "1920 × 1080 px" : "変換失敗"}</dd></div><div><dt>形式・サイズ</dt><dd>JPEG · {(jpegBlob(original ? preview.original : preview.processed!).size / 1024).toFixed(1)} KB</dd></div><div><dt>取得日時</dt><dd>{new Date(preview.createdAt).toLocaleString("ja-JP")}</dd></div></dl><a className="video-link" href={preview.url} target="_blank" rel="noreferrer">{preview.url}</a>{preview.warning && <p className="warning-text">{preview.warning}</p>}<div className="modal-actions"><button onClick={() => setPreview(null)}>閉じる</button><button className="primary" onClick={() => download(preview, original)}><Download size={16}/>{original ? "元画像を保存" : "JPEGを保存"}</button></div></Modal>}
    {zipItems && <Modal title="ZIP保存の確認" onClose={() => { if (!zipping) setZipItems(null); }}><p className="zip-description">出力画像 {zipItems.length}件をZIPにまとめます。対象の画像を確認してください。</p><div className="zip-grid">{zipItems.map(item => <div key={item.id}><img src={item.processed!} alt={item.title}/><p>{item.title}</p><code>{item.id}.jpg</code></div>)}</div><div className="modal-actions"><button disabled={zipping} onClick={() => setZipItems(null)}>戻る</button><button className="primary" disabled={zipping} onClick={downloadZip}>{zipping ? <LoaderCircle className="spin" size={16}/> : <Download size={16}/>}ZIPをダウンロード</button></div></Modal>}
    {deleteAll && <Modal title="全履歴の削除" onClose={() => setDeleteAll(false)}><p>このブラウザに保存した{history.length}件の履歴と、今回の取得一覧を削除します。削除すると元に戻せません。</p><div className="modal-actions"><button onClick={() => setDeleteAll(false)}>キャンセル</button><button className="danger" onClick={clearHistory}>全履歴を削除する</button></div></Modal>}
  </main>;
}
