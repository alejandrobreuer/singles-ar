import * as React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { getAllNewsMeta } from "@/lib/news";
import type { NewsTag } from "@/lib/news";
import { Badge } from "@/components/ui/badge";
import { SiteFooter } from "@/components/layout/SiteFooter";

export const metadata: Metadata = {
  title: "Novedades — CardStash.ar",
  description: "Últimas funcionalidades y novedades de CardStash.ar.",
};

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

export default function NewsIndexPage() {
  const posts = getAllNewsMeta();

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* Hero */}
      <section className="bg-primary">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-14">
          <div className="flex items-center gap-2 mb-3">
            <span className="block w-5 h-px bg-accent" />
            <span className="text-2xs font-semibold uppercase tracking-[0.1em] text-accent">Novedades</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-white mb-2">
            Novedades
          </h1>
          <p className="text-sm text-white/50 font-sans">
            Funcionalidades nuevas y cambios importantes en CardStash.ar.
          </p>
        </div>
      </section>

      {/* Content */}
      <main className="flex-1 mx-auto w-full max-w-3xl px-4 sm:px-6 py-10">
        <div className="flex flex-col gap-4">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/news/${post.slug}`}
              className="surface-raised p-5 no-underline hover:shadow-card-md transition-shadow duration-150"
            >
              <Badge variant={TAG_VARIANT[post.tag]} size="sm" className="mb-3">
                {TAG_LABEL[post.tag]}
              </Badge>
              <h2 className="text-lg font-serif font-semibold text-text-primary mb-1">
                {post.title}
              </h2>
              <p className="text-xs text-text-muted font-sans mb-2">{formatDate(post.date)}</p>
              <p className="text-sm text-text-secondary font-sans leading-relaxed">{post.summary}</p>
            </Link>
          ))}

          {posts.length === 0 && (
            <p className="text-sm text-text-muted font-sans text-center py-12">
              Todavía no hay novedades publicadas.
            </p>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
