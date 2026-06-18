import { HomePage } from "@/components/home-page";
import { categories, CategoryId } from "@/lib/tools";

export default function Page({
  searchParams
}: {
  searchParams?: { category?: string };
}) {
  const categoryIds = categories.map((category) => category.id);
  const category = categoryIds.includes(searchParams?.category as CategoryId)
    ? (searchParams?.category as CategoryId)
    : "all";

  return <HomePage initialCategory={category} />;
}
