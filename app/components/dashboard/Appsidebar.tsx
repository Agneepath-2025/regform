"use client";

import { CreditCard, BookText, LayoutDashboard, LogOut, HelpCircle} from "lucide-react";
// import { CreditCard, BookText, LayoutDashboard, LogOut, //Home, Hotel } from "lucide-react"; - If home and hotel icons are needed
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { post } from "@/app/utils/PostGetData"
import { usePathname } from "next/navigation";



import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarHeader,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";

 

type MenuItem = {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
  external?: boolean;
  disabled?: boolean;
};

const getAuthToken = (): string | null => {
  const cookies = document.cookie.split("; ")
  const authToken = cookies.find((cookie) => cookie.startsWith("authToken="))
  return authToken ? authToken.split("=")[1] : null
}


  export function AppSidebar() {
   

  const router = useRouter();


  const pathname = usePathname();

  const currentStep =
    pathname === "/dashboard" ? 1 :
    pathname === "/dashboard/Payments" ? 2 :
    3;

  const [items, setItems] = useState<MenuItem[]>([
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, disabled: false },
    { title: "Payments", url: "/dashboard/Payments", icon: CreditCard, disabled: true },
  ]);
  const [loading, setLoading] = useState(false)
  const [registrationDone, setRegistrationDone] = useState<boolean | null>(null)
  const [paymentDone, setPaymentDone] = useState<boolean | null>(null)
  const [, setHasAnyForm] = useState<boolean>(false)
  const [, setHasSubmitted] = useState<boolean>(false)
  
  
  const handleLogout = () => {
    const isProduction = typeof window !== 'undefined' && window.location.protocol === 'https:';
    document.cookie = `authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; ${isProduction ? 'Secure; ' : ''}SameSite=Lax`;
    router.push("/SignIn");
  };

  useEffect(() => {
      setLoading(true)
      const getRegistrationState = async () => {
        try {
          const token = getAuthToken()
          if (!token) {
            // console.error("Auth token not found")
            setLoading(false)
            return
          }
  
          const response = await post<{ success: boolean; data?: { registrationDone?: boolean; paymentDone?: boolean } }>(
            `/api/sync/dashboard`,
            { cookies: token }
          )

          if (response.data?.success && response.data?.data) {
            setRegistrationDone(!!response.data.data.registrationDone)
            setPaymentDone(!!response.data.data.paymentDone)
          } else {
            setRegistrationDone(null)
            setPaymentDone(null)
          }

          // Also fetch forms to compute progress (any form + any submitted)
          try {
            const formsRes = await post<{ success: boolean; data?: Array<{ status?: string }> }>(
              `/api/form/getAllForms`,
              { cookies: token }
            );
            if (formsRes.data?.success && Array.isArray(formsRes.data.data)) {
  const list = formsRes.data.data;

  // You already check number of forms
  setHasAnyForm(list.length > 0);

  // NEW FIX: enable payments if form status is confirmed OR not_confirmed OR submitted
  setHasSubmitted(
    list.some(
      (f) =>
        f.status &&
        ["confirmed", "not_confirmed", "submitted"].includes(
          f.status.toLowerCase()
        )
    )
  );
} else {
              setHasAnyForm(false);
              setHasSubmitted(false);
            }
          } catch {}
        } catch (error) {
          console.error("Error fetching registration/payment state:", error)
        } finally {
          setLoading(false)
        }
      }
  
      getRegistrationState()

      const onUserUpdated = () => {
        getRegistrationState();
      }

      window.addEventListener("user:updated", onUserUpdated);

      return () => window.removeEventListener("user:updated", onUserUpdated);
    }, [])

  

    useEffect(() => {
      // derive items so we can toggle disabled based on fetched user flags
      setItems((prevItems) => prevItems.map((it) => {
        
        if (it.title === "Payments") {
          // enable payments when registration is done but payment not done
          // adjust logic as needed; here we enable Payments only when registrationDone is true
          return { ...it, disabled: registrationDone === null || registrationDone === false ? true : paymentDone === null ? false : !!paymentDone  };
        }
        return it;
      }))
    }, [registrationDone, paymentDone]);

  return (
    <Sidebar>
      {loading ? <></> :
      <>
      <SidebarHeader>
        <Image className="mx-auto" src="/logo2.png" alt="Logo" width={180} height={38} priority />
      </SidebarHeader>
      <SidebarContent>
        {/* Registration Progress */}
        <SidebarGroup>
  <SidebarGroupLabel>Progress</SidebarGroupLabel>
  <SidebarGroupContent>

    
  

  <div className="flex items-center justify-between px-3 py-2 w-full">

  {/* STEP 1 */}
  <button
    onClick={() => router.push("/dashboard")}
    className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-400 hover:bg-gray-200"
  >
    1
  </button>

  <div className="flex-1 h-px bg-gray-300 mx-2"></div>

  {/* STEP 2 */}
  <button
    onClick={() => router.push("/dashboard/Payments")}
    className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-400 hover:bg-gray-200"
  >
    2
  </button>

</div>

<div className="w-full px-4 mt-4 flex flex-col items-center">

  {/* Background bar */}
  <div className="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden cursor-pointer"
       onClick={() => router.push("/dashboard")}>
    
    {/* Animated fill */}
     <div
                  className="absolute top-0 left-0 h-full bg-black transition-all duration-500"
                  style={{
                    width:
                      currentStep === 1 ? "50%" :
                      "100%"
                  }}
                />
              </div>

  

</div>


  </SidebarGroupContent>
</SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
  {items.map((item) => (
    <SidebarMenuItem key={item.title}>
      <Link 
        href={item.disabled ? "#" : item.url}
        className={`flex items-center space-x-2 text-lg font-medium px-3 py-2 rounded-md 
          hover:bg-gray-200
          ${item.disabled ? "cursor-not-allowed opacity-50 pointer-events-none" : ""}`}
      >
        <item.icon className="h-5 w-5" />
        <span>{item.title}</span>
      </Link>
    </SidebarMenuItem>
  ))}
</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {/* FAQ Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Help</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <Link href="/dashboard/faq">
                <SidebarMenuButton className="flex space-x-2 text-lg">
                <HelpCircle className="h-5 w-5" />
                <span>FAQ</span>
                 </SidebarMenuButton>
                   </Link>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
       <SidebarFooter className="mt-auto p-4">
        <SidebarMenuItem>
          <SidebarMenuButton
            onClick={handleLogout}
            className="flex space-x-2 text-lg w-full justify-start"
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarFooter>

    </>
    }
  </Sidebar>
);
}
