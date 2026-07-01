const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder("utf-8");

export type SupportedAudioKind = "mp3" | "flac";

export type EmbedLyricsResult = {
  bytes: Uint8Array;
  mimeType: string;
  warnings: string[];
};

export type LyricsMatchStrategy = "exact" | "fuzzy" | "single";

export type LyricsMatchResult<T extends { name: string }> = {
  file: T;
  score: number;
  strategy: LyricsMatchStrategy;
};

export type LyricsMatchOptions = {
  allowSingleFallback?: boolean;
};

type Id3Frame = {
  id: string;
  data: Uint8Array;
};

type FlacBlock = {
  type: number;
  data: Uint8Array;
};

export function getAudioKind(fileName: string, mimeType = ""): SupportedAudioKind | null {
  const lowerName = fileName.toLowerCase();
  const lowerMime = mimeType.toLowerCase();

  if (lowerName.endsWith(".mp3") || lowerMime.includes("mpeg") || lowerMime.includes("mp3")) {
    return "mp3";
  }

  if (lowerName.endsWith(".flac") || lowerMime.includes("flac")) {
    return "flac";
  }

  return null;
}

export function getBaseName(fileName: string) {
  return fileName.replace(/\.[^/.]+$/, "");
}

export function normalizeMatchName(fileName: string) {
  return createMatchProfile(fileName).compact;
}

export function findBestLyricsMatch<T extends { name: string }>(
  audioFileName: string,
  lyricsFiles: T[],
  options: LyricsMatchOptions = {}
): LyricsMatchResult<T> | null {
  if (lyricsFiles.length === 0) {
    return null;
  }

  const audioProfile = createMatchProfile(audioFileName);
  const exact = lyricsFiles.find((file) => createMatchProfile(file.name).compact === audioProfile.compact);

  if (exact) {
    return { file: exact, score: 1, strategy: "exact" };
  }

  if (lyricsFiles.length === 1 && options.allowSingleFallback) {
    return { file: lyricsFiles[0], score: scoreFileNameMatch(audioProfile, createMatchProfile(lyricsFiles[0].name)), strategy: "single" };
  }

  const matches = lyricsFiles
    .map((file) => ({
      file,
      score: scoreFileNameMatch(audioProfile, createMatchProfile(file.name))
    }))
    .sort((left, right) => right.score - left.score);

  const best = matches[0];
  if (!best || best.score < 0.78) {
    return null;
  }

  return { file: best.file, score: best.score, strategy: "fuzzy" };
}

type MatchProfile = {
  compact: string;
  tokens: string[];
};

const matchStopWords = new Set([
  "lrc",
  "lyric",
  "lyrics",
  "歌词",
  "歌詞",
  "动态歌词",
  "動態歌詞",
  "逐字歌词",
  "逐字歌詞"
]);

function createMatchProfile(fileName: string): MatchProfile {
  const text = getBaseName(fileName)
    .toLowerCase()
    .normalize("NFKC")
    .replace(/\[[^\]]*]|\([^)]*\)|（[^）]*）|【[^】]*】/g, " ")
    .replace(/['"`]/g, "")
    .replace(/[._\-–—]+/g, " ")
    .replace(/[·•,，、/\\|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const tokens = text
    .split(" ")
    .map((token) => compactMatchText(token))
    .filter((token) => token && !matchStopWords.has(token));
  const compact = compactMatchText(text);

  return {
    compact,
    tokens: Array.from(new Set(tokens))
  };
}

function compactMatchText(text: string) {
  let compact = text
    .replace(/\[[^\]]*]|\([^)]*\)|（[^）]*）|【[^】]*】/g, "")
    .replace(/['"`]/g, "")
    .replace(/[^a-z0-9\u00c0-\uffff]+/g, "")
    .toLowerCase()
    .normalize("NFKC");

  matchStopWords.forEach((word) => {
    compact = compact.replaceAll(word, "");
  });

  return compact;
}

function scoreFileNameMatch(audioProfile: MatchProfile, lyricsProfile: MatchProfile) {
  if (!audioProfile.compact || !lyricsProfile.compact) {
    return 0;
  }

  if (audioProfile.compact === lyricsProfile.compact) {
    return 1;
  }

  const tokenScore = scoreTokenCoverage(audioProfile, lyricsProfile);
  const substringScore = scoreSubstring(audioProfile.compact, lyricsProfile.compact);
  const diceScore = scoreDiceCoefficient(audioProfile.compact, lyricsProfile.compact);

  return Math.max(tokenScore, substringScore, diceScore);
}

function scoreTokenCoverage(audioProfile: MatchProfile, lyricsProfile: MatchProfile) {
  const audioTokens = audioProfile.tokens.filter((token) => token.length > 1);

  if (audioTokens.length < 2) {
    return 0;
  }

  const covered = audioTokens.filter((token) =>
    lyricsProfile.compact.includes(token) ||
    lyricsProfile.tokens.some((lyricsToken) => lyricsToken.includes(token) || token.includes(lyricsToken))
  );
  const coverage = covered.length / audioTokens.length;

  if (coverage < 1) {
    return coverage * 0.72;
  }

  const extraTokenPenalty = Math.max(0, lyricsProfile.tokens.length - audioTokens.length) * 0.02;
  return Math.max(0.82, 0.96 - extraTokenPenalty);
}

function scoreSubstring(left: string, right: string) {
  const shorter = left.length <= right.length ? left : right;
  const longer = left.length > right.length ? left : right;

  if (shorter.length < 4 || !longer.includes(shorter)) {
    return 0;
  }

  return 0.76 + (shorter.length / longer.length) * 0.18;
}

function scoreDiceCoefficient(left: string, right: string) {
  const leftPairs = createBigrams(left);
  const rightPairs = createBigrams(right);

  if (leftPairs.length === 0 || rightPairs.length === 0) {
    return left === right ? 1 : 0;
  }

  const counts = new Map<string, number>();
  leftPairs.forEach((pair) => counts.set(pair, (counts.get(pair) ?? 0) + 1));

  let intersection = 0;
  rightPairs.forEach((pair) => {
    const count = counts.get(pair) ?? 0;
    if (count > 0) {
      intersection += 1;
      counts.set(pair, count - 1);
    }
  });

  return (2 * intersection) / (leftPairs.length + rightPairs.length);
}

function createBigrams(text: string) {
  if (text.length <= 1) {
    return text ? [text] : [];
  }

  return Array.from({ length: text.length - 1 }, (_, index) => text.slice(index, index + 2));
}

export async function readLyricsFile(file: File) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    try {
      return new TextDecoder("gb18030").decode(bytes);
    } catch {
      return textDecoder.decode(bytes);
    }
  }
}

export function extractLrcPreview(lyrics: string) {
  return lyrics
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 6);
}

export function embedLyricsInAudio(
  fileName: string,
  mimeType: string,
  audioBuffer: ArrayBuffer,
  lyrics: string
): EmbedLyricsResult {
  const kind = getAudioKind(fileName, mimeType);
  const audioBytes = new Uint8Array(audioBuffer);

  if (!kind) {
    throw new Error("仅支持 MP3 和 FLAC 音频文件。");
  }

  if (!lyrics.trim()) {
    throw new Error("歌词文件是空的。");
  }

  if (kind === "mp3") {
    return {
      bytes: embedLyricsInMp3(audioBytes, lyrics),
      mimeType: "audio/mpeg",
      warnings: ["已写入 ID3v2.3 USLT 歌词帧，保留 LRC 时间轴文本。"]
    };
  }

  return {
    bytes: embedLyricsInFlac(audioBytes, lyrics),
    mimeType: "audio/flac",
    warnings: ["已写入 FLAC Vorbis Comment 的 LYRICS 字段，保留 LRC 时间轴文本。"]
  };
}

function embedLyricsInMp3(audioBytes: Uint8Array, lyrics: string) {
  const parsed = parseId3Frames(audioBytes);
  const lyricsFrame = createId3Frame("USLT", createUsltFrameData(lyrics));
  const frames = concatBytes([...parsed.frames.map((frame) => createId3Frame(frame.id, frame.data)), lyricsFrame]);
  const header = concatBytes([
    asciiBytes("ID3"),
    new Uint8Array([3, 0, 0]),
    writeSynchsafeInt(frames.length)
  ]);

  return concatBytes([header, frames, audioBytes.slice(parsed.audioStart)]);
}

function parseId3Frames(audioBytes: Uint8Array): { frames: Id3Frame[]; audioStart: number } {
  if (!startsWithAscii(audioBytes, "ID3") || audioBytes.length < 10) {
    return { frames: [], audioStart: 0 };
  }

  const version = audioBytes[3];
  const flags = audioBytes[5];
  const tagSize = readSynchsafeInt(audioBytes, 6);
  const tagEnd = Math.min(10 + tagSize, audioBytes.length);
  const frames: Id3Frame[] = [];

  if (version !== 3 && version !== 4) {
    return { frames, audioStart: tagEnd };
  }

  let offset = 10;
  if ((flags & 0x40) !== 0 && offset + 4 <= tagEnd) {
    const extendedSize = version === 4 ? readSynchsafeInt(audioBytes, offset) : readUint32BE(audioBytes, offset);
    offset += version === 4 ? extendedSize : 4 + extendedSize;
  }

  while (offset + 10 <= tagEnd) {
    const id = readAscii(audioBytes, offset, 4);
    if (!/^[A-Z0-9]{4}$/.test(id)) break;

    const frameSize = version === 4 ? readSynchsafeInt(audioBytes, offset + 4) : readUint32BE(audioBytes, offset + 4);
    const dataStart = offset + 10;
    const dataEnd = dataStart + frameSize;
    if (frameSize <= 0 || dataEnd > tagEnd) break;

    if (id !== "USLT" && id !== "SYLT") {
      frames.push({ id, data: audioBytes.slice(dataStart, dataEnd) });
    }

    offset = dataEnd;
  }

  return { frames, audioStart: tagEnd };
}

function createUsltFrameData(lyrics: string) {
  return concatBytes([
    new Uint8Array([1]),
    asciiBytes("chi"),
    new Uint8Array([0, 0]),
    utf16LeWithBom(lyrics)
  ]);
}

function createId3Frame(id: string, data: Uint8Array) {
  return concatBytes([
    asciiBytes(id),
    writeUint32BE(data.length),
    new Uint8Array([0, 0]),
    data
  ]);
}

function embedLyricsInFlac(audioBytes: Uint8Array, lyrics: string) {
  if (!startsWithAscii(audioBytes, "fLaC")) {
    throw new Error("FLAC 文件头无效。");
  }

  const blocks: FlacBlock[] = [];
  let offset = 4;
  let audioStart = audioBytes.length;

  while (offset + 4 <= audioBytes.length) {
    const header = audioBytes[offset];
    const isLast = (header & 0x80) !== 0;
    const type = header & 0x7f;
    const length = readUint24BE(audioBytes, offset + 1);
    const dataStart = offset + 4;
    const dataEnd = dataStart + length;

    if (dataEnd > audioBytes.length) {
      throw new Error("FLAC 元数据块损坏。");
    }

    blocks.push({ type, data: audioBytes.slice(dataStart, dataEnd) });
    offset = dataEnd;

    if (isLast) {
      audioStart = offset;
      break;
    }
  }

  if (blocks.length === 0 || blocks[0].type !== 0) {
    throw new Error("FLAC 文件缺少 STREAMINFO 元数据。");
  }

  const commentBlockIndex = blocks.findIndex((block) => block.type === 4);
  const lyricsBlock = createVorbisCommentBlock(
    commentBlockIndex >= 0 ? blocks[commentBlockIndex].data : null,
    lyrics
  );

  const updatedBlocks =
    commentBlockIndex >= 0
      ? blocks.map((block, index) => (index === commentBlockIndex ? { type: 4, data: lyricsBlock } : block))
      : [blocks[0], { type: 4, data: lyricsBlock }, ...blocks.slice(1)];

  const metadata = updatedBlocks.map((block, index) =>
    concatBytes([
      new Uint8Array([(index === updatedBlocks.length - 1 ? 0x80 : 0) | block.type]),
      writeUint24BE(block.data.length),
      block.data
    ])
  );

  return concatBytes([asciiBytes("fLaC"), ...metadata, audioBytes.slice(audioStart)]);
}

function createVorbisCommentBlock(existingData: Uint8Array | null, lyrics: string) {
  const parsed = existingData ? parseVorbisComment(existingData) : null;
  const vendor = parsed?.vendor || "Personal Toolbox";
  const comments = (parsed?.comments || []).filter((comment) => {
    const key = comment.split("=", 1)[0]?.toUpperCase();
    return key !== "LYRICS" && key !== "UNSYNCEDLYRICS";
  });

  comments.push(`LYRICS=${lyrics}`);

  const vendorBytes = textEncoder.encode(vendor);
  const commentBytes = comments.map((comment) => textEncoder.encode(comment));

  return concatBytes([
    writeUint32LE(vendorBytes.length),
    vendorBytes,
    writeUint32LE(commentBytes.length),
    ...commentBytes.flatMap((bytes) => [writeUint32LE(bytes.length), bytes])
  ]);
}

function parseVorbisComment(data: Uint8Array): { vendor: string; comments: string[] } | null {
  let offset = 0;
  if (offset + 4 > data.length) return null;

  const vendorLength = readUint32LE(data, offset);
  offset += 4;
  if (offset + vendorLength > data.length) return null;

  const vendor = textDecoder.decode(data.slice(offset, offset + vendorLength));
  offset += vendorLength;

  if (offset + 4 > data.length) return { vendor, comments: [] };
  const count = readUint32LE(data, offset);
  offset += 4;

  const comments: string[] = [];
  for (let index = 0; index < count; index += 1) {
    if (offset + 4 > data.length) break;
    const length = readUint32LE(data, offset);
    offset += 4;
    if (offset + length > data.length) break;
    comments.push(textDecoder.decode(data.slice(offset, offset + length)));
    offset += length;
  }

  return { vendor, comments };
}

function startsWithAscii(bytes: Uint8Array, value: string) {
  if (bytes.length < value.length) return false;
  return value.split("").every((char, index) => bytes[index] === char.charCodeAt(0));
}

function readAscii(bytes: Uint8Array, offset: number, length: number) {
  let value = "";
  for (let index = 0; index < length; index += 1) {
    value += String.fromCharCode(bytes[offset + index]);
  }
  return value;
}

function asciiBytes(value: string) {
  return Uint8Array.from(value.split("").map((char) => char.charCodeAt(0)));
}

function utf16LeWithBom(value: string) {
  const bytes = new Uint8Array(2 + value.length * 2);
  bytes[0] = 0xff;
  bytes[1] = 0xfe;

  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    bytes[2 + index * 2] = code & 0xff;
    bytes[3 + index * 2] = code >> 8;
  }

  return bytes;
}

function concatBytes(chunks: Uint8Array[]) {
  const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;

  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }

  return output;
}

function readUint24BE(bytes: Uint8Array, offset: number) {
  return (bytes[offset] << 16) | (bytes[offset + 1] << 8) | bytes[offset + 2];
}

function writeUint24BE(value: number) {
  return new Uint8Array([(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff]);
}

function readUint32BE(bytes: Uint8Array, offset: number) {
  return (
    bytes[offset] * 0x1000000 +
    ((bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3])
  );
}

function writeUint32BE(value: number) {
  return new Uint8Array([
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff
  ]);
}

function readUint32LE(bytes: Uint8Array, offset: number) {
  return (
    bytes[offset] |
    (bytes[offset + 1] << 8) |
    (bytes[offset + 2] << 16) |
    (bytes[offset + 3] * 0x1000000)
  );
}

function writeUint32LE(value: number) {
  return new Uint8Array([
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff
  ]);
}

function readSynchsafeInt(bytes: Uint8Array, offset: number) {
  return (
    (bytes[offset] << 21) |
    (bytes[offset + 1] << 14) |
    (bytes[offset + 2] << 7) |
    bytes[offset + 3]
  );
}

function writeSynchsafeInt(value: number) {
  return new Uint8Array([
    (value >> 21) & 0x7f,
    (value >> 14) & 0x7f,
    (value >> 7) & 0x7f,
    value & 0x7f
  ]);
}
