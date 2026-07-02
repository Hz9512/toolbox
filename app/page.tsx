import { HomePage } from "@/components/home-page";
import { categories, CategoryId } from "@/lib/tools";

const modes = ["web", "ai", "tools"] as const;
type SearchMode = (typeof modes)[number];

export default function Page({
  searchParams
}: {
  searchParams?: { category?: string; mode?: string };
}) {
  const categoryIds = categories.map((category) => category.id);
  const category = categoryIds.includes(searchParams?.category as CategoryId)
    ? (searchParams?.category as CategoryId)
    : "all";
  const mode = modes.includes(searchParams?.mode as SearchMode)
    ? (searchParams?.mode as SearchMode)
    : "web";

  return <HomePage initialCategory={category} initialMode={mode} />;
}
