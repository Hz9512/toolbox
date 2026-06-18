import { AudioLyricsTool } from "@/components/audio-lyrics-tool";

export const metadata = {
  title: "歌词音频合成 - Personal Toolbox",
  description: "上传 mp3/flac 和 lrc 歌词文件，批量写入歌词元数据"
};

export default function AudioLyricsPage() {
  return <AudioLyricsTool />;
}
