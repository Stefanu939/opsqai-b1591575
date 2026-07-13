import { createContext, useContext, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

type Ctx = { show: (feature?: string) => void };
const DemoReadOnlyContext = createContext<Ctx | null>(null);

export function useDemoReadOnly() {
  const ctx = useContext(DemoReadOnlyContext);
  if (!ctx) throw new Error("useDemoReadOnly must be used inside <DemoReadOnlyProvider>");
  return ctx;
}

/** Wire this on any element that would otherwise mutate state in the demo. */
export function useDemoBlockHandler() {
  const { show } = useDemoReadOnly();
  return (feature?: string) =>
    (e?: { preventDefault?: () => void; stopPropagation?: () => void }) => {
      e?.preventDefault?.();
      e?.stopPropagation?.();
      show(feature);
    };
}

export function DemoReadOnlyProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [feature, setFeature] = useState<string | undefined>(undefined);

  return (
    <DemoReadOnlyContext.Provider
      value={{
        show: (f) => {
          setFeature(f);
          setOpen(true);
        },
      }}
    >
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary grid place-items-center mb-2">
              <Lock className="h-5 w-5" />
            </div>
            <DialogTitle>Available in your own OPSQAI workspace</DialogTitle>
            <DialogDescription className="pt-1 leading-relaxed">
              The Interactive Demo is intentionally read-only so you can explore the platform
              safely.
              {feature ? (
                <>
                  {" "}
                  <span className="text-foreground/80">
                    — <em>{feature}</em> is one of the actions reserved for your tenant.
                  </span>
                </>
              ) : null}{" "}
              During implementation, your organization will have full administrative capabilities
              tailored to your roles and permissions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Keep exploring
            </Button>
            <Button asChild variant="outline">
              <Link to="/contact">Contact sales</Link>
            </Button>
            <Button asChild>
              <Link to="/contact">Book a demo</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DemoReadOnlyContext.Provider>
  );
}
