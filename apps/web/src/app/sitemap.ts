import { listTemplates } from "@niche-factory/db";
import { slugifyTemplateCategory } from "@/lib/template-categories";
import type { MetadataRoute } from "next";

const baseUrl = process.env["NEXT_PUBLIC_SITE_URL"] ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let templates = [] as Awaited<ReturnType<typeof listTemplates>>;
  try {
    templates = await listTemplates({ publishedOnly: true });
  } catch {
    templates = [];
  }

  const categorySlugs = Array.from(
    new Set(templates.map((template) => slugifyTemplateCategory(template.category)).filter(Boolean)),
  );

  const routes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/templates`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/admin`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.3 },
    { url: `${baseUrl}/admin/niches`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.3 },
    { url: `${baseUrl}/admin/templates`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.3 },
    ...categorySlugs.map((category) => ({
      url: `${baseUrl}/templates/category/${category}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...templates.map((template) => ({
      url: `${baseUrl}/templates/${template.slug}`,
      lastModified: new Date(template.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];

  return routes;
}
