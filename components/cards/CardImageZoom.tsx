"use client";

import * as React from "react";
import Image from "next/image";
import { X, Tag, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";

interface CardImageZoomProps {
  src:       string | null;
  alt:       string;
  className?: string;
}

export function CardImageZoom({ src, alt, className }: CardImageZoomProps) {
  const [open, setOpen] = React.useState(false);

  // Close on Escape
  React.useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  // Prevent body scroll while open
  React.useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else      document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Thumbnail — clickable only when image exists */}
      <div
        className={cn(
          "relative rounded-xl overflow-hidden shadow-card-lg border border-border aspect-[2.5/3.5] bg-secondary",
          src && "cursor-zoom-in group",
          className,
        )}
        onClick={() => src && setOpen(true)}
        role={src ? "button" : undefined}
        aria-label={src ? `Ver ${alt} en tamaño completo` : undefined}
        tabIndex={src ? 0 : undefined}
        onKeyDown={(e) => e.key === "Enter" && src && setOpen(true)}
      >
        {src ? (
          <>
            <Image
              src={src}
              alt={alt}
              fill
              sizes="(max-width: 640px) 176px, 208px"
              className="object-cover transition-transform duration-200 group-hover:scale-[1.03]"
              priority
            />
            {/* Zoom hint badge */}
            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm">
                <ZoomIn size={14} className="text-white" />
              </div>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Tag size={36} className="text-border" />
          </div>
        )}
      </div>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={alt}
        >
          {/* Close button */}
          <button
            className="absolute top-4 right-4 flex items-center justify-center w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            onClick={() => setOpen(false)}
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>

          {/* Card image */}
          <div
            className="relative max-h-[90vh] max-w-[min(90vw,480px)] w-full aspect-[2.5/3.5] rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={src!}
              alt={alt}
              fill
              sizes="480px"
              className="object-contain"
              priority
            />
          </div>
        </div>
      )}
    </>
  );
}
