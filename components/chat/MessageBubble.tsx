import * as React from "react";
import { Avatar }       from "@/components/ui/avatar";
import { ImageMessage } from "@/components/chat/ImageMessage";
import type { ChatMessageWithSender } from "@/types/database";

interface MessageBubbleProps {
  message:       ChatMessageWithSender;
  isMine:        boolean;
  showAvatar:    boolean;   // false when consecutive messages from same sender
}

export function MessageBubble({ message, isMine, showAvatar }: MessageBubbleProps) {
  const timeLabel = new Date(message.created_at).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={[
        "flex items-end gap-2",
        isMine ? "flex-row-reverse" : "flex-row",
      ].join(" ")}
    >
      {/* Avatar — only for other person; keeps alignment for mine */}
      <div className="w-7 shrink-0">
        {!isMine && showAvatar && (
          <Avatar
            src={message.sender?.avatar_url ?? null}
            name={message.sender?.username ?? "?"}
            size="sm"
          />
        )}
      </div>

      {/* Bubble */}
      <div
        className={[
          "flex flex-col gap-1 max-w-[70%]",
          isMine ? "items-end" : "items-start",
        ].join(" ")}
      >
        {/* Sender label (only once per group, for other person) */}
        {!isMine && showAvatar && message.sender?.username && (
          <span className="text-2xs text-text-muted font-sans px-1">
            {message.sender.username}
          </span>
        )}

        {/* Image */}
        {message.image_url && (
          <ImageMessage src={message.image_url} isMine={isMine} />
        )}

        {/* Text body */}
        {message.body && (
          <div
            className={[
              "px-3.5 py-2.5 rounded-2xl text-sm font-sans leading-relaxed break-words",
              isMine
                ? "bg-primary text-white rounded-br-sm"
                : "bg-secondary text-text-primary border border-border rounded-bl-sm",
            ].join(" ")}
          >
            {message.body}
          </div>
        )}

        {/* Timestamp */}
        <time
          dateTime={message.created_at}
          className="text-2xs text-text-muted font-sans px-1"
        >
          {timeLabel}
        </time>
      </div>
    </div>
  );
}
