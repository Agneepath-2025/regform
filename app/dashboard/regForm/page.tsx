"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function RegForm() {
  const router = useRouter();
  
  // Redirect to dashboard since registrations are closed
  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);
  
  return (
    <div className="flex items-center justify-center w-full h-screen">
      <span className="text-red-600 font-semibold text-lg">Registrations have been closed. Please check back later.</span>
    </div>
  );
}
