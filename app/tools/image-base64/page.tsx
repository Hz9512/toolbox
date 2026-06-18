import { ImageBase64Tool } from "@/components/image-base64-tool";

export const metadata = {
  title: "图片转 Base64 - Personal Toolbox",
  description: "将本地图片转换为 Data URL 或纯 Base64 字符串"
};

export default function ImageBase64Page() {
  return <ImageBase64Tool />;
}
