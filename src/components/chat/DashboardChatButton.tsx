"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import GeneralChatPanel from "./GeneralChatPanel";

export default function DashboardChatButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full border-2 border-sky/50 bg-navy shadow-lg shadow-sky/20 transition-all hover:scale-105 hover:border-sky active:scale-95"
          title="Chat with Navoryn AI"
        >
          <MessageCircle size={22} color="white" strokeWidth={1.75} />
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-navy bg-sky text-[8px] font-bold text-navy">
            AI
          </span>
        </button>
      )}

      <GeneralChatPanel isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}
