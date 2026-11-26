"use client";

import { useEffect, useRef, type ReactNode } from "react";

export default function ChatTimeline({ children, newestId }: { children: ReactNode; newestId?: string }) {
  const timeline = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);

  useEffect(() => {
    const node = timeline.current;
    if (node && nearBottom.current) node.scrollTop = node.scrollHeight;
  }, [newestId]);

  return (
    <div ref={timeline} role="region" aria-label="Conversation" tabIndex={0}
      className="max-h-[32rem] min-h-56 overflow-y-auto bg-brand-canvas/70 px-3 py-4 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-brand-primary sm:px-5"
      onScroll={(event) => {
        const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
        nearBottom.current = scrollHeight - scrollTop - clientHeight < 64;
      }}>
      {children}
    </div>
  );
}
