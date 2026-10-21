import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initialsOf, useAvatarUrl } from "@/lib/avatar";
import { cn } from "@/lib/utils";

/** Shared profile photo with initials fallback — use everywhere a person is shown. */
export function UserAvatar({
  path,
  name,
  email,
  className,
}: {
  path: string | null | undefined;
  name?: string | null;
  email?: string | null;
  className?: string;
}) {
  const url = useAvatarUrl(path);
  return (
    <Avatar className={cn("h-8 w-8 rounded-sm", className)}>
      {url ? <AvatarImage src={url} alt={name ?? ""} className="object-cover" /> : null}
      <AvatarFallback className="rounded-sm bg-primary text-[11px] font-semibold text-primary-foreground">
        {initialsOf({ fullName: name, email })}
      </AvatarFallback>
    </Avatar>
  );
}
