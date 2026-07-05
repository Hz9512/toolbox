import {
  AudioLines,
  Braces,
  Calculator,
  Code2,
  FileText,
  ImageIcon,
  Palette,
  Repeat,
  Scissors,
  Sparkles,
  Wand2
} from "lucide-react";

export const categories = [
  { id: "all", name: "全部" },
  { id: "text", name: "文本工具" },
  { id: "generator", name: "生成器" },
  { id: "converter", name: "转换器" },
  { id: "calculator", name: "计算器" },
  { id: "image", name: "图像工具" },
  { id: "developer", name: "开发工具" },
  { id: "audio", name: "音频工具" }
] as const;

export type CategoryId = (typeof categories)[number]["id"];
export type ToolStatus = "ready" | "planned";

export type Tool = {
  id: string;
  name: string;
  description: string;
  category: Exclude<CategoryId, "all">;
  href: string;
  keywords: string[];
  status: ToolStatus;
  icon: typeof ImageIcon;
};

export const tools: Tool[] = [
  {
    id: "image-base64",
    name: "图片转 Base64",
    description: "上传图片，实时生成 Data URL 与纯 Base64，可复制、预览和下载文本。",
    category: "image",
    href: "/tools/image-base64",
    keywords: ["图片", "base64", "data url", "转换", "image"],
    status: "ready",
    icon: ImageIcon
  },
  {
    id: "image-format",
    name: "图片格式转换",
    description: "批量将 PNG 转换为 JPG，支持质量调节、透明背景填充和 ZIP 下载。",
    category: "image",
    href: "/tools/image-format",
    keywords: ["图片", "格式", "转换", "png", "jpg", "jpeg", "批量", "zip"],
    status: "ready",
    icon: Repeat
  },
  {
    id: "audio-lyrics",
    name: "歌词音频合成",
    description: "上传 mp3/flac 与 lrc，按文件名批量匹配并写入歌词元数据。",
    category: "audio",
    href: "/tools/audio-lyrics",
    keywords: ["音频", "歌词", "lrc", "mp3", "flac", "批量", "metadata"],
    status: "ready",
    icon: AudioLines
  },
  {
    id: "image-compress",
    name: "图片压缩",
    description: "前端本地压缩图片，计划支持质量、尺寸与格式调整。",
    category: "image",
    href: "/",
    keywords: ["图片", "压缩", "尺寸", "quality"],
    status: "planned",
    icon: Wand2
  },
  {
    id: "image-crop",
    name: "图片裁剪",
    description: "快速裁剪头像、封面和固定比例图片。",
    category: "image",
    href: "/",
    keywords: ["图片", "裁剪", "比例", "头像"],
    status: "planned",
    icon: Scissors
  },
  {
    id: "color-picker",
    name: "颜色提取器",
    description: "从图片中提取主色与调色板。",
    category: "image",
    href: "/",
    keywords: ["颜色", "取色", "调色板", "palette"],
    status: "planned",
    icon: Palette
  },
  {
    id: "json-format",
    name: "JSON 格式化",
    description: "格式化、压缩和校验 JSON 数据。",
    category: "developer",
    href: "/",
    keywords: ["json", "格式化", "校验", "开发"],
    status: "planned",
    icon: Braces
  },
  {
    id: "text-cleaner",
    name: "文本清理",
    description: "去空行、去首尾空格、大小写转换和批量替换。",
    category: "text",
    href: "/",
    keywords: ["文本", "清理", "替换", "大小写"],
    status: "planned",
    icon: FileText
  },
  {
    id: "uuid-generator",
    name: "UUID 生成器",
    description: "批量生成 UUID、短 ID 与随机令牌。",
    category: "generator",
    href: "/",
    keywords: ["uuid", "id", "随机", "token"],
    status: "planned",
    icon: Sparkles
  },
  {
    id: "unit-converter",
    name: "单位转换器",
    description: "常用长度、重量、面积、时间单位互转。",
    category: "converter",
    href: "/",
    keywords: ["单位", "转换", "长度", "重量"],
    status: "planned",
    icon: Code2
  },
  {
    id: "date-calculator",
    name: "日期计算器",
    description: "计算日期差、工作日和倒计时。",
    category: "calculator",
    href: "/",
    keywords: ["日期", "计算", "倒计时", "工作日"],
    status: "planned",
    icon: Calculator
  }
];

export function getToolById(id: string) {
  return tools.find((tool) => tool.id === id);
}

export function getCategoryName(id: CategoryId) {
  return categories.find((category) => category.id === id)?.name ?? id;
}
