import type { BlogRecord, ConditionRecord, MediaDescriptor, ProviderRecord } from "../../../../src/shared/content/models.ts";
import { blogPath, conditionPath, providerPath, sortByDateDescending } from "../../../../src/shared/content/urls.ts";
import { createExcerpt } from "../../../../src/utils/strapi-excerpt.ts";
import { formatContentDate } from "./presentation.ts";

export function toBlogArchiveItems(records: BlogRecord[], mediaByRoute: Record<string, MediaDescriptor> = {}) {
  return sortByDateDescending(records).flatMap((blog) => {
    const slug = blogPath(blog.slug);
    if (!slug) return [];
    const title = blog.title || "Untitled";
    const thumbnail = mediaByRoute[`blog:${blog.slug}`] ?? blog.thumbnail;
    return [{ slug, title, date: formatContentDate(blog.date), description: blog.description || "",
      thumbnail: thumbnail ? { ...thumbnail, alt: title } : undefined }];
  });
}

export function toConditionArchiveItems(records: ConditionRecord[], mediaByRoute: Record<string, MediaDescriptor> = {}) {
  return records.flatMap((condition) => {
    const slug = conditionPath(condition.slug);
    return slug ? [{
      slug,
      title: condition.heading || condition.title || "untitled",
      thumbnail: mediaByRoute[`condition:${condition.slug}`] ?? condition.thumbnail,
    }] : [];
  });
}

export function toProviderArchiveItems(records: ProviderRecord[]) {
  return records.flatMap((provider) => {
    const slug = providerPath(provider.slug);
    return slug ? [{
      slug,
      excerpt: provider.body ? createExcerpt(provider.body, 600) : "",
      name: provider.name,
      retired: provider.retirementNotice?.retired || false,
      image: provider.image,
    }] : [];
  });
}
