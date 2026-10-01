// Slide-over side panel with the same API as the Dialog primitives.
// Workspaces import these names to open details and forms in a right-hand
// drawer instead of a centered modal, so the page context stays visible.
import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export const Dialog = Sheet;
export const DialogTrigger = SheetTrigger;
export const DialogClose = SheetClose;

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof SheetContent>,
  React.ComponentPropsWithoutRef<typeof SheetContent>
>(({ className, children, ...props }, ref) => (
  <SheetContent
    ref={ref}
    side="right"
    className={cn(
      "flex w-full flex-col gap-4 overflow-y-auto sm:max-w-xl",
      className,
      "h-full max-h-none",
    )}
    {...props}
  >
    {children}
  </SheetContent>
));
DialogContent.displayName = "SidePanelContent";

export const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <SheetHeader className={cn("border-b border-border pb-4 pr-8 text-left", className)} {...props} />
);
export const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <SheetFooter
    className={cn(
      "sticky bottom-0 -mx-6 -mb-6 mt-auto border-t border-border bg-background px-6 py-4",
      className,
    )}
    {...props}
  />
);
export const DialogTitle = SheetTitle;
export const DialogDescription = SheetDescription;
