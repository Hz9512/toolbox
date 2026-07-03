import { HomePage } from "@/components/home-page";
import { categories, CategoryId } from "@/lib/tools";

const modes = ["web", "ai", "tools"] as const;
type SearchMode = (typeof modes)[number];
type PageSearchParams = { category?: string; mode?: string };

export default async function Page({
  searchParams
}: {
  searchParams?: PageSearchParams | Promise<PageSearchParams>;
}) {
  const params = await searchParams;
  const categoryIds = categories.map((category) => category.id);
  const category = categoryIds.includes(params?.category as CategoryId)
    ? (params?.category as CategoryId)
    : "all";
  const mode = modes.includes(params?.mode as SearchMode)
    ? (params?.mode as SearchMode)
    : "web";

  return <HomePage initialCategory={category} initialMode={mode} />;
}
