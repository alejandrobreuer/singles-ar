import fs from "fs";
import path from "path";
import matter from "gray-matter";

const NEWS_DIR = path.join(process.cwd(), "content", "news");

export type NewsTag = "feature" | "fix" | "announcement";

export interface NewsPostMeta {
  slug: string;
  title: string;
  date: string; // ISO string, e.g. "2026-07-23"
  summary: string;
  tag: NewsTag;
}

export interface NewsPost extends NewsPostMeta {
  content: string; // raw MDX body, to be rendered by the caller
}

/**
 * Derives a slug from the filename, stripping the leading date prefix.
 * "2026-07-23-buy-orders-launch.mdx" -> "buy-orders-launch"
 */
function slugFromFilename(filename: string): string {
  return filename
    .replace(/\.mdx?$/, "")
    .replace(/^\d{4}-\d{2}-\d{2}-/, "");
}

function readAllFiles(): string[] {
  if (!fs.existsSync(NEWS_DIR)) return [];
  return fs.readdirSync(NEWS_DIR).filter((f) => f.endsWith(".mdx") || f.endsWith(".md"));
}

/**
 * Returns metadata for every news post, sorted newest first.
 * Use this for the listing page — it avoids parsing full MDX content
 * when only the summary/title/date are needed.
 */
export function getAllNewsMeta(): NewsPostMeta[] {
  const files = readAllFiles();

  const posts = files.map((filename) => {
    const fullPath = path.join(NEWS_DIR, filename);
    const raw = fs.readFileSync(fullPath, "utf8");
    const { data } = matter(raw);

    return {
      slug: slugFromFilename(filename),
      title: data.title as string,
      date: data.date as string,
      summary: data.summary as string,
      tag: (data.tag as NewsTag) ?? "announcement",
    };
  });

  return posts.sort((a, b) => (a.date < b.date ? 1 : -1));
}

/**
 * Returns a single post (metadata + raw content) by slug, or null if not found.
 */
export function getNewsPostBySlug(slug: string): NewsPost | null {
  const files = readAllFiles();
  const filename = files.find((f) => slugFromFilename(f) === slug);
  if (!filename) return null;

  const fullPath = path.join(NEWS_DIR, filename);
  const raw = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(raw);

  return {
    slug,
    title: data.title as string,
    date: data.date as string,
    summary: data.summary as string,
    tag: (data.tag as NewsTag) ?? "announcement",
    content,
  };
}

/** Returns all slugs — used by generateStaticParams. */
export function getAllNewsSlugs(): string[] {
  return readAllFiles().map(slugFromFilename);
}
