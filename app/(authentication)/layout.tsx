
import { Suspense } from "react";
import "../globals.css";
import Image from "next/image";
import { GoogleOAuthProvider } from "@react-oauth/google";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
        <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-center justify-items-center">
        <Image
          className=""
          src="/logo2.png"
          alt="Next.js logo"
          width={180}
          height={38}
          priority
        />
            <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}>

        <Suspense>{children}</Suspense>
        </GoogleOAuthProvider>

      </main>
    </div>
        
     
  );
}
