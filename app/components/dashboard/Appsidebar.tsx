"use client";

import { CreditCard, BookText, LayoutDashboard, LogOut, HelpCircle} from "lucide-react";
// import { CreditCard, BookText, LayoutDashboard, LogOut, //Home, Hotel } from "lucide-react"; - If home and hotel icons are needed
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { post } from "@/app/utils/PostGetData"
import { usePathname } from "next/navigation";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";

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

const MarkdownComponents: Components = {
  table: ({ children }) => (
    <table className="min-w-full divide-y divide-gray-200 my-4 border">
      {children}
    </table>
  ),
  thead: ({ children }) => <thead className="bg-gray-50">{children}</thead>,
  tbody: ({ children }) => (
    <tbody className="bg-white divide-y divide-gray-200">{children}</tbody>
  ),
  tr: ({ children }) => <tr className="hover:bg-gray-50">{children}</tr>,
  td: ({ children }) => (
    <td className="px-6 py-4 whitespace-normal border-r last:border-r-0">
      {children}
    </td>
  ),
  th: ({ children }) => (
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r last:border-r-0">
      {children}
    </th>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-outside space-y-2 my-4 ml-4">
      {children}
    </ol>
  ),
  ul: ({ children }) => (
    <ul className="list-disc list-outside space-y-2 my-4 ml-4">
      {children}
    </ul>
  ),
  li: ({ children }) => <li className="pl-2">{children}</li>,
  p: ({ children }) => <p className="my-4">{children}</p>,
  h1: ({ children }) => (
    <h1 className="text-2xl font-bold my-4 hidden">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-xl font-bold my-3">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-lg font-bold my-2">{children}</h3>
  ),
  pre: ({ children }) => (
    <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto my-4">
      {children}
    </pre>
  ),
  code: ({ children }) => (
    <code className="bg-gray-100 px-1 rounded">{children}</code>
  ),
};

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
    pathname === "/dashboard/regForm" ? 2 :
    pathname === "/dashboard/Payments" ? 3 :
    4;

  const [items, setItems] = useState<MenuItem[]>([
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, disabled: false },
    { title: "Registration Form", url: "/dashboard/regForm", icon: BookText, disabled: false },
    { title: "Payments", url: "/dashboard/Payments", icon: CreditCard, disabled: true },
  ]);
  const [loading, setLoading] = useState(false)
  const [registrationDone, setRegistrationDone] = useState<boolean | null>(null)
  const [paymentDone, setPaymentDone] = useState<boolean | null>(null)
  const [hasAnyForm, setHasAnyForm] = useState<boolean>(false)
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false)
  
  const [faqOpen, setFaqOpen] = useState(false)
  const [faqContent, setFaqContent] = useState<string>("")

  const handleLogout = () => {
    document.cookie = "authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
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

  // Fetch FAQ content when modal opens
  useEffect(() => {
    if (faqOpen && !faqContent) {
      const fetchFAQ = async () => {
        try {
          const response = await fetch("/markdown/FAQ.md");
          if (response.ok) {
            const text = await response.text();
            setFaqContent(text);
          }
        } catch (error) {
          console.error("Error fetching FAQ:", error);
        }
      };
      fetchFAQ();
    }
  }, [faqOpen, faqContent]);

  // ESC close for FAQ
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFaqOpen(false);
    };
    if (faqOpen) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [faqOpen]);

    useEffect(() => {
      // derive items so we can toggle disabled based on fetched user flags
      setItems(items.map((it) => {
        
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
    onClick={() => router.push("/dashboard/regForm")}
    className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-400 hover:bg-gray-200"
  >
    2
  </button>

  <div className="flex-1 h-px bg-gray-300 mx-2"></div>

  {/* STEP 3 */}
  <button
    onClick={() => router.push("/dashboard/Payments")}
    className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-400 hover:bg-gray-200"
  >
    3
  </button>

  <div className="flex-1 h-px bg-gray-300 mx-2"></div>

  {/* STEP 4 — sends user back to dashboard */}
  <button
    onClick={() => router.push("/dashboard")}
    className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-400 hover:bg-gray-200"
  >
    4
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
                      currentStep === 1 ? "25%" :
                      currentStep === 2 ? "50%" :
                      currentStep === 3 ? "75%" :
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
                <SidebarMenuButton onClick={() => setFaqOpen(true)} className="flex space-x-2 text-lg">
                  <HelpCircle className="h-5 w-5" />
                  <span>FAQ</span>
                </SidebarMenuButton>
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

      {/* FAQ Modal */}
      <AnimatePresence>
        {faqOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/50 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFaqOpen(false)}
            />

            {/* Modal */}
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="w-full max-w-3xl bg-white rounded-lg shadow-lg max-h-[85vh] overflow-y-auto"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
              >
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">Frequently Asked Questions</h2>
                    <button
                      onClick={() => setFaqOpen(false)}
                      className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                    >
                      ×
                    </button>
                  </div>
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={MarkdownComponents}
                    >
                      {faqContent}
                    </ReactMarkdown>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      </>}
    </Sidebar>
  );
}
