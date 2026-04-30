import * as React from "react";
import { Info } from "lucide-react";

interface SystemMessageProps {
  body: string;
  timestamp?: string;
}

export function SystemMessage({ body, timestamp }: SystemMessageProps) {
  return (
    <div className="flex items-center justify-center gap-2 py-1 px-4">
      <div className="flex items-center gap-1.5 bg-secondary border border-border rounded-full px-3 py-1 max-w-xs">
        <Info size={11} className="shrink-0 text-text-muted" />
        <p className="text-2xs font-sans text-text-muted text-center leading-snug">
          {body}
        </p>
      </div>
      {timestamp && (
        <time
          dateTime={timestamp}
          className="text-2xs text-text-muted font-sans shrink-0"
        >
          {new Date(timestamp).toLocaleTimeString("es-AR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </time>
      )}
    </div>
  );
}
