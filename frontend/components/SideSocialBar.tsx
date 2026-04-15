"use client";

import React from "react";
import { motion } from "framer-motion";

type SocialItem = {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
};

const items: SocialItem[] = [
  {
    id: "github",
    label: "GitHub",
    href: "https://github.com/",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" aria-hidden="true">
        <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.72c-2.78.61-3.37-1.19-3.37-1.19-.45-1.14-1.1-1.45-1.1-1.45-.9-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.84.09-.64.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.95 0-1.1.39-2 1.03-2.7-.1-.25-.45-1.29.1-2.68 0 0 .84-.27 2.75 1.03a9.5 9.5 0 0 1 5 0c1.9-1.3 2.74-1.03 2.74-1.03.56 1.4.21 2.43.1 2.68.64.7 1.03 1.6 1.03 2.7 0 3.85-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2z" />
      </svg>
    ),
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    href: "https://linkedin.com/",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" aria-hidden="true">
        <path d="M4.98 3.5a2.5 2.5 0 1 0 0 5.01 2.5 2.5 0 0 0 0-5Zm-2 6.5h4v11h-4Zm7 0h3.83v1.5h.05c.53-1 1.84-2.05 3.78-2.05 4.04 0 4.78 2.66 4.78 6.12V21h-4v-4.87c0-1.16-.02-2.65-1.61-2.65-1.62 0-1.87 1.27-1.87 2.57V21h-4Z" />
      </svg>
    ),
  },
  {
    id: "x",
    label: "X",
    href: "https://x.com/",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" aria-hidden="true">
        <path d="M18.9 2H22l-6.76 7.73L23 22h-6.13l-4.8-6.3L6.56 22H3.44l7.22-8.25L1 2h6.27l4.33 5.71L18.9 2ZM17.8 20h1.7L6.31 3.9H4.48L17.8 20Z" />
      </svg>
    ),
  },
  {
    id: "instagram",
    label: "Instagram",
    href: "https://instagram.com/",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" aria-hidden="true">
        <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm0 1.8A3.95 3.95 0 0 0 3.8 7.75v8.5a3.95 3.95 0 0 0 3.95 3.95h8.5a3.95 3.95 0 0 0 3.95-3.95v-8.5a3.95 3.95 0 0 0-3.95-3.95h-8.5Zm8.95 1.35a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.8A3.2 3.2 0 1 0 12 15.2 3.2 3.2 0 0 0 12 8.8Z" />
      </svg>
    ),
  },
];

export default function SideSocialBar() {
  return (
    <aside className="fixed left-3 bottom-8 z-50 hidden md:block">
      <div className="relative rounded-[28px] bg-[#d9b8ff] border border-white/35 px-3 py-4 shadow-[0_0_34px_rgba(168,85,247,0.58)]">
        <div className="absolute inset-0 rounded-[28px] pointer-events-none bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.35),transparent_45%)]" />
        <div className="relative flex flex-col items-center gap-5">
          {items.map((item, idx) => (
            <motion.a
              key={item.id}
              href={item.href}
              target="_blank"
              rel="noreferrer"
              aria-label={item.label}
              className="text-black/90 hover:text-black transition-colors"
              whileHover={{ scale: 1.15, y: -1 }}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.12 + idx * 0.06 }}
              title={item.label}
            >
              {item.icon}
            </motion.a>
          ))}
        </div>
      </div>
    </aside>
  );
}

