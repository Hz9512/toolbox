"use client";

import NextImage from "next/image";
import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Download,
  FileArchive,
  FileImage,
  ImagePlus,
  Loader2,
  RefreshCw,
  Trash2,
  XCircle
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createZip } from "@/lib/zip";
import { cn, formatBytes } from "@/lib/utils";

type ConvertStatus = "pending" | "converting" | "done" | "error";

type ConvertedImage = {
  id: string;
  sourceFile?: File;
  sourceName: string;
  outputName: string;
  sourceSize: number;
  outputSize?: number;
  width?: number;
  height?: number;
  blob?: Blob;
  previewUrl?: string;
  status: ConvertStatus;
  message?: string;
};

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function replaceExtension(name: string, extension: string) {
  const baseName = name.replace(/\.[^.]+$/, "");
  return `${baseName || "image"}.${extension}`;
}

function loadImageFromFile(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("图片读取失败"));
    };
    image.src = url;
  });
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }

        reject(new Error("转换失败"));
      },
      "image/jpeg",
      quality
    );
  });
}

async function convertPngToJpeg(file: File, quality: number, backgroundColor: string) {
  const image = await loadImageFromFile(file);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("浏览器不支持 Canvas 转换");
  }

  context.fillStyle = backgroundColor;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0);

  const blob = await canvasToJpeg(canvas, quality);
  return {
    blob,
    width: canvas.width,
    height: canvas.height
  };
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function createUniqueDownloadName(name: string, usedNames: Set<string>) {
  if (!usedNames.has(name)) {
    usedNames.add(name);
    return name;
  }

  const extensionMatch = name.match(/(\.[^.]+)$/);
  const extension = extensionMatch?.[1] ?? "";
  const baseName = extension ? name.slice(0, -extension.length) : name;
  let index = 2;
  let nextName = `${baseName}-${index}${extension}`;

  while (usedNames.has(nextName)) {
    index += 1;
    nextName = `${baseName}-${index}${extension}`;
  }

  usedNames.add(nextName);
  return nextName;
}

export function ImageFormatConverterTool() {
  const [items, setItems] = useState<ConvertedImage[]>([]);
  const [dragging, setDragging] = useState(false);
  const [quality, setQuality] = useState(0.92);
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const inputRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef<ConvertedImage[]>([]);

  const convertedItems = useMemo(() => items.filter((item) => item.status === "done" && item.blob), [items]);
  const isConverting = items.some((item) => item.status === "converting");
  const totalSavedBytes = convertedItems.reduce((total, item) => {
    if (!item.outputSize) return total;
    return total + Math.max(0, item.sourceSize - item.outputSize);
  }, 0);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    return () => {
      itemsRef.current.forEach((item) => {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
    };
  }, []);

  function updateItem(id: string, patch: Partial<ConvertedImage>) {
    setItems((current) =>
      current.map((item) => {
        if (item.id !== id) return item;
        if (patch.previewUrl && item.previewUrl && item.previewUrl !== patch.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
        return { ...item, ...patch };
      })
    );
  }

  async function convertFile(file: File, id: string) {
    updateItem(id, { status: "converting", message: undefined });

    try {
      const result = await convertPngToJpeg(file, quality, backgroundColor);
      updateItem(id, {
        status: "done",
        blob: result.blob,
        outputSize: result.blob.size,
        width: result.width,
        height: result.height,
        previewUrl: URL.createObjectURL(result.blob)
      });
    } catch {
      updateItem(id, {
        status: "error",
        message: "转换失败，请确认文件是有效 PNG 图片。"
      });
    }
  }

  function addFiles(fileList?: FileList | File[]) {
    if (!fileList?.length) return;

    const files = Array.from(fileList);
    const nextItems = files.map<ConvertedImage>((file) => {
      const isPng = file.type === "image/png" || file.name.toLowerCase().endsWith(".png");

      return {
        id: createId(),
        sourceFile: isPng ? file : undefined,
        sourceName: file.name,
        outputName: replaceExtension(file.name, "jpg"),
        sourceSize: file.size,
        status: isPng ? "pending" : "error",
        message: isPng ? undefined : "仅支持 PNG 文件。"
      };
    });

    setItems((current) => [...nextItems, ...current]);

    nextItems.forEach((item, index) => {
      if (item.status === "pending") {
        void convertFile(files[index], item.id);
      }
    });
  }

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    addFiles(event.target.files ?? undefined);
    event.target.value = "";
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    addFiles(event.dataTransfer.files);
  }

  function clearItems() {
    items.forEach((item) => {
      if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
    });
    setItems([]);
  }

  async function downloadAll() {
    const usedNames = new Set<string>();
    const files = convertedItems
      .filter((item): item is ConvertedImage & { blob: Blob } => Boolean(item.blob))
      .map((item) => ({
        name: createUniqueDownloadName(item.outputName, usedNames),
        blob: item.blob
      }));

    if (!files.length) return;
    if (files.length === 1) {
      downloadBlob(files[0].blob, files[0].name);
      return;
    }

    const zip = await createZip(files);
    downloadBlob(zip, "png-to-jpg.zip");
  }

  async function reconvertAll() {
    const convertibleItems = items.filter((item) => item.sourceFile);
    if (!convertibleItems.length) return;

    convertibleItems.forEach((item) => {
      if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
      updateItem(item.id, {
        blob: undefined,
        outputSize: undefined,
        width: undefined,
        height: undefined,
        previewUrl: undefined,
        status: "pending",
        message: undefined
      });
      void convertFile(item.sourceFile as File, item.id);
    });
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[0.86fr_1.14fr]">
      <section className="cyber-panel rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-border/70 bg-background/80 text-primary shadow-sm">
            <FileImage className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">图片格式转换</h1>
            <p className="mt-2 leading-7 text-muted-foreground">
              批量将 PNG 转换为 JPG，支持透明背景填充、质量调节和打包下载。
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4">
          <label
            className={cn(
              "file-drop flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center transition-colors",
              dragging ? "border-primary bg-accent" : "hover:bg-accent"
            )}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            <ImagePlus className="h-9 w-9 text-muted-foreground" />
            <span className="mt-4 font-medium">选择或拖入 PNG 图片</span>
            <span className="mt-2 text-sm text-muted-foreground">可一次选择多张，转换在浏览器本地完成。</span>
            <input
              ref={inputRef}
              type="file"
              accept="image/png,.png"
              multiple
              className="hidden"
              onChange={onInputChange}
            />
          </label>

          <div className="grid gap-4 rounded-lg border border-border/70 bg-background/60 p-4">
            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="jpg-quality" className="text-sm font-medium">
                  JPG 质量
                </label>
                <Badge className="rounded-full border-border/70 bg-card/80 text-muted-foreground">
                  {Math.round(quality * 100)}%
                </Badge>
              </div>
              <input
                id="jpg-quality"
                type="range"
                min={0.5}
                max={1}
                step={0.01}
                value={quality}
                onChange={(event) => setQuality(Number(event.target.value))}
                className="h-3 w-full cursor-pointer accent-primary"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <label htmlFor="jpg-background" className="text-sm font-medium">
                透明背景填充
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="jpg-background"
                  type="color"
                  value={backgroundColor}
                  onChange={(event) => setBackgroundColor(event.target.value)}
                  className="h-9 w-11 cursor-pointer rounded-md border border-border bg-background p-1"
                />
                <code className="rounded-md border border-border/70 bg-card/80 px-2.5 py-1 text-sm text-muted-foreground">
                  {backgroundColor.toUpperCase()}
                </code>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Stat label="已转换" value={`${convertedItems.length}`} />
            <Stat label="总文件" value={`${items.length}`} />
            <Stat label="节省" value={formatBytes(totalSavedBytes)} />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              className="teal-gradient rounded-full text-white"
              onClick={() => inputRef.current?.click()}
              disabled={isConverting}
            >
              <ImagePlus className="mr-2 h-4 w-4" />
              添加图片
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={downloadAll}
              disabled={!convertedItems.length}
            >
              <FileArchive className="mr-2 h-4 w-4" />
              {convertedItems.length > 1 ? "下载 ZIP" : "下载 JPG"}
            </Button>
            <Button type="button" variant="ghost" className="rounded-full" onClick={clearItems} disabled={!items.length}>
              <Trash2 className="mr-2 h-4 w-4" />
              清空
            </Button>
          </div>
        </div>
      </section>

      <section className="cyber-panel rounded-lg p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">转换队列</h2>
            <p className="text-sm text-muted-foreground">转换完成后可单独下载，或一次打包下载。</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit rounded-full"
            onClick={reconvertAll}
            disabled={!items.length || isConverting}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            重新转换
          </Button>
        </div>

        {items.length ? (
          <div className="grid gap-3">
            {items.map((item) => (
              <ConversionRow
                key={item.id}
                item={item}
                onDownload={() => {
                  if (item.blob) {
                    downloadBlob(item.blob, item.outputName);
                  }
                }}
                onRemove={() => {
                  if (item.previewUrl) {
                    URL.revokeObjectURL(item.previewUrl);
                  }
                  setItems((current) => current.filter((currentItem) => currentItem.id !== item.id));
                }}
              />
            ))}
          </div>
        ) : (
          <div className="flex min-h-[28rem] flex-col items-center justify-center rounded-lg border border-dashed border-border/70 bg-background/40 p-10 text-center text-muted-foreground">
            <ImagePlus className="mb-4 h-10 w-10" />
            <div className="font-medium text-foreground">还没有图片</div>
            <div className="mt-2 text-sm">添加 PNG 后会在这里显示转换进度和结果。</div>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-background/60 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-lg font-semibold tracking-tight">{value}</div>
    </div>
  );
}

function ConversionRow({
  item,
  onDownload,
  onRemove
}: {
  item: ConvertedImage;
  onDownload: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="grid gap-3 rounded-lg border border-border/70 bg-background/60 p-3 sm:grid-cols-[72px_1fr_auto] sm:items-center">
      <div className="flex aspect-square h-[72px] items-center justify-center overflow-hidden rounded-lg border border-border/70 bg-muted">
        {item.previewUrl ? (
          <NextImage
            src={item.previewUrl}
            alt={item.outputName}
            width={72}
            height={72}
            className="h-full w-full object-contain"
            unoptimized
          />
        ) : item.status === "converting" ? (
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        ) : item.status === "error" ? (
          <XCircle className="h-6 w-6 text-red-500" />
        ) : (
          <FileImage className="h-6 w-6 text-muted-foreground" />
        )}
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-sm font-semibold">{item.outputName}</h3>
          {item.status === "done" ? (
            <Badge className="rounded-full border-emerald-500/25 bg-background text-emerald-700 dark:text-emerald-200">
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
              完成
            </Badge>
          ) : item.status === "error" ? (
            <Badge className="rounded-full border-red-500/25 bg-background text-red-500">失败</Badge>
          ) : (
            <Badge className="rounded-full border-border/70 bg-background text-muted-foreground">处理中</Badge>
          )}
        </div>
        <div className="mt-1 truncate text-xs text-muted-foreground">{item.sourceName}</div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span>原始 {formatBytes(item.sourceSize)}</span>
          {item.outputSize ? <span>JPG {formatBytes(item.outputSize)}</span> : null}
          {item.width && item.height ? (
            <span>
              {item.width} x {item.height}
            </span>
          ) : null}
        </div>
        {item.message ? <div className="mt-2 text-xs text-red-500">{item.message}</div> : null}
      </div>

      <div className="flex gap-2 sm:justify-end">
        <Button type="button" variant="outline" size="sm" onClick={onDownload} disabled={!item.blob}>
          <Download className="mr-2 h-4 w-4" />
          下载
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={onRemove}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
