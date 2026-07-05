import { ImageFormatConverterTool } from "@/components/image-format-converter-tool";

export const metadata = {
  title: "图片格式转换 - Personal Toolbox",
  description: "批量将 PNG 图片转换为 JPG 格式"
};

export default function ImageFormatPage() {
  return <ImageFormatConverterTool />;
}
