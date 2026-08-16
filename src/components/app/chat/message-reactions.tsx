import { useCallback, useEffect, useState } from "react";
import { SmilePlus } from "lucide-react";
import { EmojiPicker } from "./emoji-picker";
import { cn } from "@/lib/utils";

const KEY = "opsqai.chat.reactions";
const QUICK = ["👍", "🙏", "✅", "🔥", "❤️", "😮"];

type Store = Record<string, string[]>;

function read(): Store {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Store;
  } catch {
    return {};
  }
}

function write(store: Store) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* storage disabled — reactions stay in-memory for the session */
  }
}

/**
 * MessageReactions — messenger-style emoji reactions on a chat message.
 * Reactions are a personal annotation, kept in local storage on this device.
 */
export function MessageReactions({
  messageId,
  align = "start",
  className,
}: {
  messageId: string;
  align?: "start" | "end";
  className?: string;
}) {
  const [reactions, setReactions] = useState<string[]>([]);

  useEffect(() => {
    setReactions(read()[messageId] ?? []);
  }, [messageId]);

  const toggle = useCallback(
    (emoji: string) => {
      setReactions((prev) => {
        const next = prev.includes(emoji) ? prev.filter((e) => e !== emoji) : [...prev, emoji];
        const store = read();
        if (next.length === 0) delete store[messageId];
        else store[messageId] = next;
        write(store);
        return next;
      });
    },
    [messageId],
  );

  return (
    <div
      className={cn(
        "mt-1 flex items-center gap-1",
        align === "end" ? "justify-end" : "justify-start",
        className,
      )}
    >
      {reactions.map((e) => (
        <button
          key={e}
          type="button"
          onClick={() => toggle(e)}
          className="oq-enter inline-flex items-center gap-1 rounded-full border border-gold-line bg-gold-soft px-2 py-0.5 text-xs transition-transform hover:scale-105"
        >
          <span>{e}</span>
        </button>
      ))}
      <div className="flex items-center opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        {QUICK.map((e) => (
          <button
            key={e}
            type="button"
            aria-label={`React ${e}`}
            onClick={() => toggle(e)}
            className={cn(
              "grid h-6 w-6 place-items-center rounded-full text-xs transition-transform hover:scale-125",
              reactions.includes(e) && "bg-muted",
            )}
          >
            {e}
          </button>
        ))}
        <EmojiPicker
          onPick={toggle}
          label="More reactions"
          align={align === "end" ? "end" : "start"}
          className="h-6 w-6"
        />
        <SmilePlus className="hidden" />
      </div>
    </div>
  );
}
