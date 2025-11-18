
import { Toaster } from "@/components/ui/toaster"
import RegistrationProgress from "@/app/components/dashboard/RegistrationProgress"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
   <div className="w-full h-screen">
    <div className="px-4 pt-4">
      <RegistrationProgress
        steps={["Select sport", "Submit forms", "Finalise registrations", "Payment"]}
        current={2}
        completed={1}
      />
    </div>
    
    <main className="flex items-center justify-center ">
        {children}
      </main>
      <Toaster />
   </div>


  )
}
