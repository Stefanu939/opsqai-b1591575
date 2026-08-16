import { useState } from "react";
import { Smile } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { cn } from "@/lib/utils";

const GROUPS = {
  smileys: [
    "😀","😄","😊","🙂","😉","😍","🤩","😎","🤗","🤔","😐","😴","😅","😂","🥲","😢","😮","😡","🥳","🤝",
  ],
  work: [
    "👍","👎","👏","🙏","💪","✅","❌","⚠️","📄","📁","📊","📈","📉","🧾","🔧","⚙️","🛠️","🧪","🔍","📌",
  ],
  ops: [
    "🏭","🚚","📦","🕒","📅","🔐","🛡️","🚨","🧯","♻️","🧹","🧰","⚡","💡","🔥","🌡️","🥽","🦺","🧑‍🏭","📋",
  ],
} as const;

type GroupKey = keyof typeof GROUPS;

export function EmojiPicker({
  onPick,
  className,
  align = "start",
  label = "Insert emoji",
}: {
  onPick: (emoji: string) => void;
  className?: string;
  align?: "start" | "center" | "end";
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [group, setGroup] = useState<GroupKey>("smileys");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className={cn(
            "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            className,
          )}
        >
          <Smile className="h-[18px] w-[18px]" />
        </button>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-[292px] p-3">
        <SegmentedTabs
          size="sm"
          ariaLabel="Emoji category"
          value={group}
          onChange={(v) => setGroup(v)}
          options={[
            { value: "smileys", label: "Smileys" },
            { value: "work", label: "Work" },
            { value: "ops", label: "Ops" },
          ]}
          className="mb-2 w-full"
        />
        <div className="grid grid-cols-8 gap-1">
          {GROUPS[group].map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => {
                onPick(e);
                setOpen(false);
              }}
              className="grid h-8 w-8 place-items-center rounded-md text-lg transition-transform hover:scale-110 hover:bg-muted"
            >
              {e}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
