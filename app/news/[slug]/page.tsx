import * as React from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getAllNewsSlugs, getNewsPostBySlug } from "@/lib/news";
import type { NewsTag } from "@/lib/news";
import { Badge } from "@/components/ui/badge";
import { SiteFooter } from "@/components/layout/SiteFooter";

interface Props {
  params: { slug: string };
}

export function generateStaticParams() {
  return getAllNewsSlugs().map((slug) => ({ slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const post = getNewsPostBySlug(params.slug);
  if (!post) return {};

  return {
    title:       `${post.title} — CardStash.ar`,
    description: post.summary,
  };
}

const TAG_VARIANT: Record<NewsTag, React.ComponentProps<typeof Badge>["variant"]> = {
  feature:      "gold",
  fix:          "green",
  announcement: "blue",
};

const TAG_LABEL: Record<NewsTag, string> = {
  feature:      "Nueva función",
  fix:          "Mejora",
  announcement: "Anuncio",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day:   "numeric",
    month: "long",
    year:  "numeric",
  });
}

// This repo doesn't use @tailwindcss/typography, so MDX elements are mapped
// to explicit classes here instead of wrapping in a `prose` className, to
// stay consistent with the rest of the site (explicit font-serif/font-sans,
// text-text-primary/secondary tokens rather than default prose grays).
const mdxComponents = {
  h2: (props: React.ComponentPropsWithoutRef<"h2">) => (
    <h2 className="text-xl font-serif font-semibold text-text-primary mt-8 mb-3" {...props} />
  ),
  h3: (props: React.ComponentPropsWithoutRef<"h3">) => (
    <h3 className="text-lg font-serif font-semibold text-text-primary mt-6 mb-2" {...props} />
  ),
  p: (props: React.ComponentPropsWithoutRef<"p">) => (
    <p className="text-sm font-sans text-text-secondary leading-relaxed mb-4" {...props} />
  ),
  ul: (props: React.ComponentPropsWithoutRef<"ul">) => (
    <ul className="list-disc pl-5 mb-4 space-y-1.5 text-sm font-sans text-text-secondary" {...props} />
  ),
  ol: (props: React.ComponentPropsWithoutRef<"ol">) => (
    <ol className="list-decimal pl-5 mb-4 space-y-1.5 text-sm font-sans text-text-secondary" {...props} />
  ),
  li: (props: React.ComponentPropsWithoutRef<"li">) => (
    <li className="leading-relaxed" {...props} />
  ),
  strong: (props: React.ComponentPropsWithoutRef<"strong">) => (
    <strong className="font-semibold text-text-primary" {...props} />
  ),
  a: (props: React.ComponentPropsWithoutRef<"a">) => (
    <a className="text-primary hover:text-accent transition-colors" {...props} />
  ),
};

export default function NewsPostPage({ params }: Props) {
  const post = getNewsPostBySlug(params.slug);
  if (!post) notFound();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 mx-auto w-full max-w-2xl px-4 sm:px-6 py-12">
        <Badge variant={TAG_VARIANT[post.tag]} size="sm" className="mb-3">
          {TAG_LABEL[post.tag]}
        </Badge>
        <h1 className="font-serif text-3xl font-bold text-text-primary mb-2">
          {post.title}
        </h1>
        <p className="text-xs text-text-muted font-sans mb-8">{formatDate(post.date)}</p>
        <article>
          <MDXRemote source={post.content} components={mdxComponents} />
        </article>
      </main>

      <SiteFooter />
    </div>
  );
}
