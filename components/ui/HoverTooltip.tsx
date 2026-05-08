"use client";

import * as React from "react";
import ReactDOM    from "react-dom";

interface HoverTooltipProps {
  label:      string;
  detail?:    string;
  children:   React.ReactNode;
  className?: string;        // controls wrapper element's class (use "contents" for grid/flex children)
}

export function HoverTooltip({ label, detail, children, className = "inline-flex" }: HoverTooltipProps) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null);

  return (
    <>
      <span
        ref={ref}
        className={className}
        onMouseEnter={() => {
          const r = ref.current?.getBoundingClientRect();
          if (r) setPos({ top: r.top, left: r.left + r.width / 2 });
        }}
        onMouseLeave={() => setPos(null)}
      >
        {children}
      </span>

      {pos && typeof document !== "undefined" && ReactDOM.createPortal(
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{ top: pos.top, left: pos.left, transform: "translate(-50%, calc(-100% - 10px))" }}
        >
          <div
            className="rounded-lg px-3 py-2.5 shadow-xl text-left"
            style={{ background: "#1a2744", width: "220px" }}
          >
            <p className="text-xs font-semibold font-sans text-white leading-tight">{label}</p>
            {detail && (
              <p
                className="text-2xs font-sans mt-0.5 leading-snug"
                style={{ color: "rgba(255,255,255,0.6)" }}
              >
                {detail}
              </p>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
