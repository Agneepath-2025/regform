import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/app/components/dashboard/Appsidebar"
import { Toaster } from "@/components/ui/toaster"


export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
  <AppSidebar />
  <div className="pl-1 pt-1"><SidebarTrigger /></div>

  <div className="flex flex-col w-full min-h-screen">
    <main className="flex-1 overflow-y-auto">
      {children}
    </main>
  </div>
  
  <Toaster />
</SidebarProvider>
  )
}

