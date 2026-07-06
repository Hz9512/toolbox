export type WebLink = {
  id: string;
  name: string;
  description: string;
  href: string;
  accent: string;
  logo?: string;
};

export const webLinksStorageKey = "lushifu.webLinks";

export const defaultWebLinks: WebLink[] = [
  {
    id: "baidu",
    name: "百度",
    description: "中文搜索、百科、贴吧和常用信息入口。",
    href: "https://www.baidu.com/",
    logo: "https://www.baidu.com/favicon.ico",
    accent: "from-blue-500/20 to-cyan-500/10"
  },
  {
    id: "bilibili",
    name: "哔哩哔哩",
    description: "视频、学习内容、直播和兴趣社区。",
    href: "https://www.bilibili.com/",
    logo: "https://www.bilibili.com/favicon.ico",
    accent: "from-sky-500/20 to-pink-500/10"
  },
  {
    id: "zhihu",
    name: "知乎",
    description: "问答、专栏、经验分享和热点讨论。",
    href: "https://www.zhihu.com/",
    logo: "https://static.zhihu.com/heifetz/favicon.ico",
    accent: "from-blue-600/20 to-indigo-500/10"
  },
  {
    id: "github",
    name: "GitHub",
    description: "代码托管、开源项目和开发者协作。",
    href: "https://github.com/",
    logo: "https://github.com/favicon.ico",
    accent: "from-slate-500/20 to-zinc-500/10"
  },
  {
    id: "mdn",
    name: "MDN",
    description: "Web 标准、前端 API 和浏览器兼容性文档。",
    href: "https://developer.mozilla.org/",
    logo: "https://developer.mozilla.org/favicon-48x48.png",
    accent: "from-violet-500/20 to-blue-500/10"
  },
  {
    id: "v2ex",
    name: "V2EX",
    description: "技术、产品、创意和日常交流社区。",
    href: "https://www.v2ex.com/",
    logo: "https://www.v2ex.com/static/icon-192.png",
    accent: "from-teal-500/20 to-slate-500/10"
  },
  {
    id: "sspai",
    name: "少数派",
    description: "效率工具、数字生活和软件使用经验。",
    href: "https://sspai.com/",
    logo: "https://cdn.sspai.com/favicon/sspai.ico",
    accent: "from-red-500/20 to-orange-500/10"
  },
  {
    id: "douban",
    name: "豆瓣",
    description: "书影音记录、评分和兴趣小组。",
    href: "https://www.douban.com/",
    logo: "https://www.douban.com/favicon.ico",
    accent: "from-green-500/20 to-lime-500/10"
  }
];
