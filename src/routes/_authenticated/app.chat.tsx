import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ChatSidebar } from "@/components/app/chat-sidebar";
import { SubscriptionAccessGate } from "@/components/app/subscription-access-gate";

export const Route = createFileRoute("/_authenticated/app/chat")({
  component: ChatLayout,
});

function ChatLayout() {
  return (
    <div className="flex-1 flex min-h-0">
      <ChatSidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <SubscriptionAccessGate feature="the AI chat">
          <Outlet />
        </SubscriptionAccessGate>
      </div>
    </div>
  );
}
