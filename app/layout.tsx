import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "mngr's installer on Python 3.15: a one-flag fix (unofficial demo)",
  description:
    "On a Mac whose newest Python is 3.15 (Homebrew's python3), mngr's one-line install fails building google-re2. Pinning --python 3.12 in install.sh fixes it. Unofficial demo by Cheryl Aurelia.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="antialiased">
      <body>{children}</body>
    </html>
  );
}
