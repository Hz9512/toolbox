"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  AudioLines,
  CheckCircle2,
  Download,
  FileAudio,
  FileText,
  Loader2,
  Trash2,
  Upload,
  XCircle
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  embedLyricsInAudio,
  extractLrcPreview,
  findBestLyricsMatch,
  getAudioKind,
  getBaseName,
  readLyricsFile
} from "@/lib/audio-lyrics";
import { formatBytes } from "@/lib/utils";
import { createZip } from "@/lib/zip";

type JobStatus = "missing" | "ready" | "processing" | "done" | "error";

type AudioJob = {
  id: string;
  audioFile: File;
  lyricsFile: File | null;
  status: JobStatus;
  outputName?: string;
  outputUrl?: string;
  outputBlob?: Blob;
  outputSize?: number;
  preview?: string[];
  message?: string;
};

function createJobId(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function getOutputName(file: File) {
  const kind = getAudioKind(file.name, file.type);
  return `${getBaseName(file.name)}.with-lyrics.${kind ?? "audio"}`;
}

function downloadFile(url: string, name: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
}

function createZipName() {
  const time = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  return `lyrics-audio-${time}.zip`;
}

export function AudioLyricsTool() {
  const [audioFiles, setAudioFiles] = useState<File[]>([]);
  const [lyricsFiles, setLyricsFiles] = useState<File[]>([]);
  const [jobs, setJobs] = useState<AudioJob[]>([]);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const outputUrls = useRef<string[]>([]);

  useEffect(() => {
    setJobs((currentJobs) => {
      const currentById = new Map(currentJobs.map((job) => [job.id, job]));

      return audioFiles.map((audioFile) => {
        const id = createJobId(audioFile);
        const match = findBestLyricsMatch(audioFile.name, lyricsFiles, {
          allowSingleFallback: audioFiles.length === 1 && lyricsFiles.length === 1
        });
        const lyricsFile = match?.file ?? null;
        const existing = currentById.get(id);
        const status = lyricsFile ? "ready" : "missing";

        if (existing?.lyricsFile === lyricsFile && existing.status === "done") {
          return existing;
        }

        return {
          id,
          audioFile,
          lyricsFile,
          status,
          message: getMatchMessage(match)
        };
      });
    });
  }, [audioFiles, lyricsFiles]);

  useEffect(() => {
    return () => {
      outputUrls.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const stats = useMemo(() => {
    return {
      total: jobs.length,
      ready: jobs.filter((job) => job.status === "ready").length,
      done: jobs.filter((job) => job.status === "done").length,
      missing: jobs.filter((job) => job.status === "missing").length
    };
  }, [jobs]);

  function onAudioChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).filter((file) =>
      Boolean(getAudioKind(file.name, file.type))
    );
    setAudioFiles(files);
    event.target.value = "";
  }

  function onLyricsChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).filter((file) =>
      file.name.toLowerCase().endsWith(".lrc")
    );
    setLyricsFiles(files);
    event.target.value = "";
  }

  async function processJob(job: AudioJob) {
    if (!job.lyricsFile) {
      setJobs((items) =>
        items.map((item) =>
          item.id === job.id ? { ...item, status: "missing", message: "请上传匹配的 LRC 文件" } : item
        )
      );
      return;
    }

    setJobs((items) =>
      items.map((item) =>
        item.id === job.id ? { ...item, status: "processing", message: "正在写入歌词元数据..." } : item
      )
    );

    try {
      const [lyrics, audioBuffer] = await Promise.all([
        readLyricsFile(job.lyricsFile),
        job.audioFile.arrayBuffer()
      ]);
      const result = embedLyricsInAudio(job.audioFile.name, job.audioFile.type, audioBuffer, lyrics);
      const payload = new ArrayBuffer(result.bytes.byteLength);
      new Uint8Array(payload).set(result.bytes);
      const blob = new Blob([payload], { type: result.mimeType });
      const url = URL.createObjectURL(blob);
      outputUrls.current.push(url);
      revokeOutputUrl(job.outputUrl);

      setJobs((items) =>
        items.map((item) =>
          item.id === job.id
            ? {
                ...item,
                status: "done",
                outputName: getOutputName(job.audioFile),
                outputUrl: url,
                outputBlob: blob,
                outputSize: blob.size,
                preview: extractLrcPreview(lyrics),
                message: result.warnings.join(" ")
              }
            : item
        )
      );
    } catch (error) {
      setJobs((items) =>
        items.map((item) =>
          item.id === job.id
            ? {
                ...item,
                status: "error",
                message: error instanceof Error ? error.message : "处理失败"
              }
            : item
        )
      );
    }
  }

  function revokeOutputUrl(url?: string) {
    if (!url) {
      return;
    }

    URL.revokeObjectURL(url);
    outputUrls.current = outputUrls.current.filter((item) => item !== url);
  }

  function removeJob(job: AudioJob) {
    revokeOutputUrl(job.outputUrl);
    setAudioFiles((files) => files.filter((file) => createJobId(file) !== job.id));
    setJobs((items) => items.filter((item) => item.id !== job.id));
  }

  async function processAll() {
    const queue = jobs.filter((job) => job.status === "ready" || job.status === "error");

    for (const job of queue) {
      await processJob(job);
    }
  }

  async function downloadAll() {
    const completedJobs = jobs.filter((job) => job.status === "done" && job.outputBlob && job.outputName);

    if (completedJobs.length === 0) {
      return;
    }

    setIsDownloadingAll(true);

    try {
      const zip = await createZip(
        completedJobs.map((job) => ({
          name: job.outputName as string,
          blob: job.outputBlob as Blob
        }))
      );
      const url = URL.createObjectURL(zip);

      downloadFile(url, createZipName());
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } finally {
      setIsDownloadingAll(false);
    }
  }

  function clearFiles() {
    outputUrls.current.forEach((url) => URL.revokeObjectURL(url));
    outputUrls.current = [];
    setAudioFiles([]);
    setLyricsFiles([]);
    setJobs([]);
  }

  return (
    <div className="mx-auto max-w-7xl">
      <section className="rounded-lg border bg-card p-6 shadow-sm lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm text-muted-foreground">
              <AudioLines className="h-4 w-4" />
              MP3 / FLAC · LRC · 批量处理
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">歌词音频合成</h1>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              上传音频文件和 LRC 歌词文件，浏览器会自动按文件名匹配并写入歌词元数据。MP3 使用 ID3
              USLT 帧，FLAC 使用 Vorbis Comment 的 LYRICS 字段，不会上传文件。
            </p>
          </div>
          <div className="grid grid-cols-4 gap-3 rounded-md border bg-background p-3 text-center">
            <div>
              <div className="text-2xl font-semibold">{stats.total}</div>
              <div className="text-xs text-muted-foreground">音频</div>
            </div>
            <div>
              <div className="text-2xl font-semibold">{stats.ready}</div>
              <div className="text-xs text-muted-foreground">待处理</div>
            </div>
            <div>
              <div className="text-2xl font-semibold">{stats.done}</div>
              <div className="text-xs text-muted-foreground">已完成</div>
            </div>
            <div>
              <div className="text-2xl font-semibold">{stats.missing}</div>
              <div className="text-xs text-muted-foreground">缺歌词</div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <label className="file-drop flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center transition-colors hover:bg-accent">
            <FileAudio className="h-8 w-8 text-muted-foreground" />
            <span className="mt-4 font-medium">上传音频文件</span>
            <span className="mt-2 text-sm text-muted-foreground">
              可多选，支持 .mp3 和 .flac
            </span>
            <input
              type="file"
              multiple
              accept=".mp3,.flac,audio/mpeg,audio/flac"
              className="hidden"
              onChange={onAudioChange}
            />
          </label>

          <label className="file-drop flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center transition-colors hover:bg-accent">
            <FileText className="h-8 w-8 text-muted-foreground" />
            <span className="mt-4 font-medium">上传 LRC 歌词</span>
            <span className="mt-2 text-sm text-muted-foreground">
              可多选，支持按歌名和歌手模糊匹配
            </span>
            <input type="file" multiple accept=".lrc" className="hidden" onChange={onLyricsChange} />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Button onClick={processAll} disabled={!jobs.some((job) => job.status === "ready" || job.status === "error")}>
            <Upload className="mr-2 h-4 w-4" />
            合成全部
          </Button>
          <Button
            variant="outline"
            onClick={() => void downloadAll()}
            disabled={isDownloadingAll || !jobs.some((job) => job.status === "done" && job.outputBlob)}
          >
            {isDownloadingAll ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {isDownloadingAll ? "打包中" : "下载全部"}
          </Button>
          <Button variant="ghost" onClick={clearFiles} disabled={jobs.length === 0}>
            清空
          </Button>
        </div>
      </section>

      <section className="mt-8 grid gap-4">
        {jobs.length === 0 ? (
          <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
            还没有待处理文件。请先上传音频和 LRC 歌词文件。
          </div>
        ) : (
          jobs.map((job) => (
            <article key={job.id} className="rounded-lg border bg-card p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-lg font-semibold tracking-tight">{job.audioFile.name}</h2>
                    <StatusBadge status={job.status} />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-sm text-muted-foreground">
                    <Badge>{getAudioKind(job.audioFile.name, job.audioFile.type)?.toUpperCase()}</Badge>
                    <Badge>{formatBytes(job.audioFile.size)}</Badge>
                    <Badge>{job.lyricsFile ? job.lyricsFile.name : "未匹配 LRC"}</Badge>
                  </div>
                  {job.message ? (
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{job.message}</p>
                  ) : null}
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void processJob(job)}
                    disabled={job.status === "missing" || job.status === "processing"}
                  >
                    {job.status === "processing" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    {job.status === "done" ? "重新合成" : "合成"}
                  </Button>
                  <Button
                    size="sm"
                    disabled={!job.outputUrl || !job.outputName}
                    onClick={() => downloadFile(job.outputUrl as string, job.outputName as string)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    下载
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-red-600"
                    aria-label={`删除 ${job.audioFile.name}`}
                    onClick={() => removeJob(job)}
                    disabled={job.status === "processing"}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {job.status === "done" ? (
                <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_280px]">
                  <div className="rounded-md border bg-background p-4">
                    <div className="mb-3 text-sm font-medium">输出文件</div>
                    <div className="text-sm text-muted-foreground">
                      {job.outputName} · {job.outputSize ? formatBytes(job.outputSize) : "-"}
                    </div>
                    {job.outputUrl ? (
                      <audio className="mt-4 w-full" controls src={job.outputUrl}>
                        <track kind="captions" />
                      </audio>
                    ) : null}
                  </div>
                  <div className="rounded-md border bg-background p-4">
                    <div className="mb-3 text-sm font-medium">歌词预览</div>
                    <div className="space-y-1 text-xs leading-5 text-muted-foreground">
                      {(job.preview ?? []).map((line) => (
                        <div key={line} className="truncate">
                          {line}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </article>
          ))
        )}
      </section>
    </div>
  );
}

function getMatchMessage(match: ReturnType<typeof findBestLyricsMatch<File>>) {
  if (!match) {
    return "未找到匹配的 LRC 文件";
  }

  if (match.strategy === "exact") {
    return "已匹配同名歌词文件";
  }

  if (match.strategy === "single") {
    return "仅有一个 LRC 文件，已自动匹配";
  }

  return `已模糊匹配歌词文件，相似度 ${Math.round(match.score * 100)}%`;
}

function StatusBadge({ status }: { status: JobStatus }) {
  const map: Record<JobStatus, { label: string; className: string; icon: typeof CheckCircle2 }> = {
    missing: {
      label: "缺少歌词",
      className: "border-amber-500/30 text-amber-600 dark:text-amber-300",
      icon: XCircle
    },
    ready: {
      label: "可合成",
      className: "border-blue-500/30 text-blue-600 dark:text-blue-300",
      icon: CheckCircle2
    },
    processing: {
      label: "处理中",
      className: "border-muted-foreground/30 text-muted-foreground",
      icon: Loader2
    },
    done: {
      label: "已完成",
      className: "border-emerald-500/30 text-emerald-600 dark:text-emerald-300",
      icon: CheckCircle2
    },
    error: {
      label: "失败",
      className: "border-red-500/30 text-red-600 dark:text-red-300",
      icon: XCircle
    }
  };
  const item = map[status];
  const Icon = item.icon;

  return (
    <Badge className={item.className}>
      <Icon className={status === "processing" ? "mr-1.5 h-3.5 w-3.5 animate-spin" : "mr-1.5 h-3.5 w-3.5"} />
      {item.label}
    </Badge>
  );
}
