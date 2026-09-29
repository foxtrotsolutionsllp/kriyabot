import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Kriyabot", template: "%s · Kriyabot" },
  description: "Your work, projects, schedule, and personal AI assistant in one place.",
  applicationName: "Kriyabot",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/kriyabot-icon.png", type: "image/png" }],
    apple: [{ url: "/kriyabot-icon.png", type: "image/png" }],
  },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
