import "./globals.css";
import type { Metadata } from "next";
import AnimatedBackground from "../components/background/AnimatedBackground";

export const metadata: Metadata = {
  title: "AI Voice Stress Detection",
  description: "Real-time voice stress detection with futuristic UI.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="text-white">
        <AnimatedBackground variant="minimal" />
        {children}
      </body>
    </html>
  );
}

