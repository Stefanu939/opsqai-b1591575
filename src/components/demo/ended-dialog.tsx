import { Link, useNavigate } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { useDemoSession } from "@/lib/demo/session";

export function DemoEndedDialog() {
  const { ended, end } = useDemoSession();
  const navigate = useNavigate();
  if (!ended) return null;

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent
        className="max-w-md"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary grid place-items-center mb-2">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <DialogTitle>Your interactive demo has ended.</DialogTitle>
          <DialogDescription className="pt-1 leading-relaxed">
            You've experienced how OPSQAI centralizes operational knowledge, AI assistance,
            onboarding and compliance in one governed platform.
            <br />
            <br />
            Ready to use it with your own company?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => {
              end();
              navigate({ to: "/demo" });
            }}
          >
            Restart demo
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
  );
}
