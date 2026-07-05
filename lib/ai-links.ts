export type AiLink = {
  id: string;
  name: string;
  description: string;
  href: string;
  accent: string;
  logo?: string;
};

export const aiLinksStorageKey = "lushifu.aiLinks";

export const defaultAiLinks: AiLink[] = [
  {
    id: "chatgpt",
    name: "ChatGPT",
    description: "通用对话、写作、代码和多模态助手。",
    href: "https://chatgpt.com/",
    logo: "https://chatgpt.com/favicon.ico",
    accent: "from-emerald-500/20 to-cyan-500/10"
  },
  {
    id: "claude",
    name: "Claude",
    description: "长文分析、写作润色和复杂推理。",
    href: "https://claude.ai/",
    logo: "https://claude.ai/favicon.ico",
    accent: "from-orange-500/20 to-rose-500/10"
  },
  {
    id: "gemini",
    name: "Gemini",
    description: "Google AI 助手，适合资料整理与跨产品协作。",
    href: "https://gemini.google.com/",
    logo: "https://gemini.google.com/favicon.ico",
    accent: "from-blue-500/20 to-violet-500/10"
  },
  {
    id: "perplexity",
    name: "Perplexity",
    description: "带来源的 AI 搜索与研究问答。",
    href: "https://www.perplexity.ai/",
    logo: "https://www.perplexity.ai/favicon.ico",
    accent: "from-sky-500/20 to-teal-500/10"
  },
  {
    id: "copilot",
    name: "Copilot",
    description: "微软 AI 助手，适合搜索、办公和创作。",
    href: "https://copilot.microsoft.com/",
    logo: "https://copilot.microsoft.com/favicon.ico",
    accent: "from-indigo-500/20 to-cyan-500/10"
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    description: "中文与代码推理体验都很顺手。",
    href: "https://chat.deepseek.com/",
    logo: "https://chat.deepseek.com/favicon.ico",
    accent: "from-slate-500/20 to-blue-500/10"
  },
  {
    id: "doubao",
    name: "豆包",
    description: "中文聊天、写作、图片理解和日常助手。",
    href: "https://www.doubao.com/",
    logo: "https://www.doubao.com/favicon.ico",
    accent: "from-pink-500/20 to-orange-500/10"
  },
  {
    id: "kimi",
    name: "Kimi",
    description: "长文档阅读、总结和中文信息处理。",
    href: "https://www.kimi.com/",
    logo: "https://www.kimi.com/favicon.ico",
    accent: "from-violet-500/20 to-blue-500/10"
  }
];
