import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ChatSidebar } from "@/components/app/chat-sidebar";

export const Route = createFileRoute("/_authenticated/app/chat")({
  component: ChatLayout,
});

function ChatLayout() {
  return (
    <div className="flex-1 flex min-h-0">
      <ChatSidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <Outlet />
      </div>
    </div>
  );
}
