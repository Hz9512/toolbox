"use client";

import Image from "next/image";
import { ChangeEvent, DragEvent, useMemo, useState } from "react";
import { Check, Clipboard, Download, FileImage, Upload, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatBytes, readFileAsDataUrl } from "@/lib/utils";

type ImageResult = {
  name: string;
  type: string;
  size: number;
  width: number;
  height: number;
  dataUrl: string;
};

function getImageSize(src: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error("无法读取图片尺寸"));
    image.src = src;
  });
}

export function ImageBase64Tool() {
  const [result, setResult] = useState<ImageResult | null>(null);
  const [mode, setMode] = useState<"dataUrl" | "base64">("dataUrl");
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const output = useMemo(() => {
    if (!result) return "";
    if (mode === "dataUrl") return result.dataUrl;
    return result.dataUrl.split(",")[1] ?? "";
  }, [mode, result]);

  async function handleFile(file?: File) {
    setError("");
    setCopied(false);

    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("请选择 PNG、JPG、WebP、GIF 或 SVG 等图片文件。");
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      const size = await getImageSize(dataUrl);
      setResult({
        name: file.name,
        type: file.type || "image/*",
        size: file.size,
        width: size.width,
        height: size.height,
        dataUrl
      });
    } catch {
      setError("图片读取失败，请换一张图片重试。");
    }
  }

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    void handleFile(event.target.files?.[0]);
    event.target.value = "";
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    void handleFile(event.dataTransfer.files?.[0]);
  }

  async function copyOutput() {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function downloadText() {
    if (!result || !output) return;
    const blob = new Blob([output], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${result.name}.${mode === "dataUrl" ? "data-url" : "base64"}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-secondary">
            <FileImage className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">图片转 Base64</h1>
            <p className="mt-2 leading-7 text-muted-foreground">
              将本地图片转换为 Data URL 或纯 Base64 字符串。所有处理都在浏览器内完成，不上传文件。
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4">
          <label
            className={[
              "file-drop flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center transition-colors",
              dragging ? "border-foreground bg-accent" : "hover:bg-accent"
            ].join(" ")}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            <Upload className="h-8 w-8 text-muted-foreground" />
            <span className="mt-4 font-medium">点击上传或拖拽图片到这里</span>
            <span className="mt-2 text-sm text-muted-foreground">
              支持 PNG、JPG、WebP、GIF、SVG 等常见图片格式
            </span>
            <input type="file" accept="image/*" className="hidden" onChange={onInputChange} />
          </label>

          {error ? (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-300">
              {error}
            </div>
          ) : null}

          <div className="rounded-lg border bg-background p-4">
            <h2 className="font-medium">使用方法</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
              <li>上传一张图片，右侧会自动显示预览与编码结果。</li>
              <li>选择输出 Data URL 或纯 Base64。</li>
              <li>点击复制或下载文本文件，用于 CSS、JSON、Markdown 或接口调试。</li>
            </ol>
          </div>
        </div>
      </section>

      <section className="grid gap-6">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">实时预览</h2>
              <p className="text-sm text-muted-foreground">上传后可检查图片尺寸、体积和 MIME 类型。</p>
            </div>
            {result ? (
              <Button variant="outline" onClick={() => setResult(null)}>
                <X className="mr-2 h-4 w-4" />
                清空
              </Button>
            ) : null}
          </div>

          {result ? (
            <div className="mt-5 grid gap-5 lg:grid-cols-[240px_1fr]">
              <div className="relative aspect-square overflow-hidden rounded-lg border bg-secondary">
                <Image
                  src={result.dataUrl}
                  alt={result.name}
                  fill
                  sizes="240px"
                  className="object-contain"
                  unoptimized
                />
              </div>
              <div className="grid content-start gap-3 text-sm">
                <div className="font-medium">{result.name}</div>
                <div className="flex flex-wrap gap-2">
                  <Badge>{result.type}</Badge>
                  <Badge>{formatBytes(result.size)}</Badge>
                  <Badge>
                    {result.width} x {result.height}
                  </Badge>
                </div>
                <div className="rounded-md bg-secondary p-3 text-muted-foreground">
                  Base64 文本长度：{output.length.toLocaleString()} 字符
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-5 flex min-h-64 items-center justify-center rounded-lg border border-dashed text-center text-muted-foreground">
              还没有图片。上传后这里会显示预览。
            </div>
          )}
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">输出结果</h2>
              <p className="text-sm text-muted-foreground">根据使用场景切换 Data URL 或纯 Base64。</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={mode === "dataUrl" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("dataUrl")}
              >
                Data URL
              </Button>
              <Button
                variant={mode === "base64" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("base64")}
              >
                Base64
              </Button>
            </div>
          </div>

          <Textarea
            readOnly
            value={output}
            placeholder="上传图片后会在这里生成结果..."
            className="mt-5 min-h-72 resize-y font-mono text-xs"
          />

          <div className="mt-4 flex flex-wrap gap-3">
            <Button onClick={copyOutput} disabled={!output}>
              {copied ? <Check className="mr-2 h-4 w-4" /> : <Clipboard className="mr-2 h-4 w-4" />}
              {copied ? "已复制" : "复制结果"}
            </Button>
            <Button variant="outline" onClick={downloadText} disabled={!output}>
              <Download className="mr-2 h-4 w-4" />
              下载 TXT
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
