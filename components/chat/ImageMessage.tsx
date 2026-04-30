"use client";

import * as React from "react";
import Image from "next/image";
import { X, ZoomIn } from "lucide-react";

interface ImageMessageProps {
  src:    string;
  isMine: boolean;
}

export function ImageMessage({ src, isMine }: ImageMessageProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      {/* Thumbnail */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={[
          "group relative block rounded-xl overflow-hidden border",
          "max-w-[200px] aspect-[4/3]",
          isMine ? "border-primary/20" : "border-border",
        ].join(" ")}
        aria-label="Ver imagen completa"
      >
        <Image
          src={src}
          alt="Imagen del chat"
          fill
          sizes="200px"
          className="object-cover transition-opacity group-hover:opacity-90"
        />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
          <ZoomIn size={20} className="text-white" />
        </div>
      </button>

      {/* Lightbox */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-fade-in"
          onClick={() => setOpen(false)}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
            onClick={() => setOpen(false)}
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
          <div
            className="relative max-w-3xl max-h-[85vh] w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt="Imagen del chat"
              className="max-w-full max-h-[85vh] rounded-xl object-contain mx-auto block"
            />
          </div>
        </div>
      )}
    </>
  );
}
