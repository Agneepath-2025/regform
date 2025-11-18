import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agneepath 7.0",
  description: "",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>

      {/* Use Georgia as the primary site font; keep other layout unchanged */}
      <body style={{ fontFamily: "Georgia, serif" }} className="antialiased">
        <div className="pb-20">
          {children}
        </div>
      </body>
    </html>
  );
}
