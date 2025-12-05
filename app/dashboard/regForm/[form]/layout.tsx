import { Toaster } from "@/components/ui/toaster"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full h-screen">
      <main className="flex items-center justify-center">
        {children}
      </main>
      <Toaster />
    </div>
  )
}
