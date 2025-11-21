"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { useEffect, useState } from "react"
import { ArrowRight, Medal } from 'lucide-react';
import HeadingWithUnderline from "@/app/components/dashboard/headingWithUnderline"
import RenderPopoverForm from "@/app/components/dashboard/form/PopoverForm"
import { eventSchema, sports } from "@/app/utils/forms/schema"
import { post } from "@/app/utils/PostGetData"
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { encrypt } from "@/app/utils/encryption"
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
const EmptyState = () => (
  <div className="flex flex-col items-center justify-center p-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
    <Medal className="w-16 h-16 text-gray-400 mb-4" />
    <h3 className="text-xl font-bold text-gray-700 mb-2">No Sports Registered</h3>
    <p className="text-gray-500 text-center max-w-md">
      You haven't registered for any sports yet. Click on Select sport to start your athletic journey!
    </p>
  </div>
);
export type FormData = {
  _id: string;
  title: string;
  updatedAt: string;
  status: string;
  playerFields: Array<Record<string, any>>;
  fields?: { playerFields?: Array<Record<string, any>>; [k: string]: any };
};

const ActionCell: React.FC<{ row: any }> = ({ row }) => {
  const router = useRouter();
  const { status, _id, title } = row.original;

  return (
    <div className="flex justify-center">
      {status === "draft" ? (
        <Button
          onClick={() =>
            router.push(`/dashboard/regForm/form?i=${encrypt({ id: _id, title: title })}`)
          }
          className="mr-2"
        >
          Edit
        </Button>
      ) : (
        <Button disabled className="mr-2">Edit</Button>
      )}


      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button>
            Delete
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogTitle>Delete Form</AlertDialogTitle>
          <p>Are you sure you want to delete this form? This action cannot be undone.</p>
          <div className="flex justify-end space-x-2 gap-2 items-end sticky bottom-0 right-0 pt-4 bg-white mt-4 mr-5">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button onClick={async () => {
                try {
                  const response = await post("/api/form/deleteForm", {
                    id: _id,
                    title: title,
                  });

                  const res = response.data as { success: boolean; message?: string };

                  if (res.success) {
                    window.location.reload(); // or router.refresh()
                  } else {
                    console.error("Failed to delete form");
                  }
                } catch (error) {
                  console.error("Error deleting form:", error);
                }
              }}
            >
              Delete Form
            </Button>
          </div>
  
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const columns: ColumnDef<FormData>[] = [
  {
    accessorKey: "title",
    header: "Sports",
    cell: ({ row }) => {
      const title = row.original.title;
      const matchingSport = sports[title];
      return matchingSport || "Unknown";
    },
  },
  {
    accessorKey: "updatedAt",
    header: "Last updated at",
    cell: (info) => {
      const date = new Date(info.getValue() as string);
      return date.toLocaleString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "numeric",
        minute: "numeric",
      });
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      if (status === "draft") return "Draft";
      if (status === "submitted") return "Submitted";
      return status;
    },
  },
  {
    id: "actions",
    header: "Form Actions",
    cell: ({ row }) => <ActionCell row={row} />, // Use the new functional component
  },
  {
    accessorKey: "estimatedCost",
    header: "Estimated Cost",
    cell: ({ row }) => {
      const count = Array.isArray(row.original.playerFields)
        ? row.original.playerFields.length
        : Array.isArray(row.original.fields?.playerFields)
        ? row.original.fields.playerFields.length
        : 0;
      return `₹${count * 800}`;
    },
  },
];

const getAuthToken = (): string | null => {
  const cookies = document.cookie.split("; ")
  const authToken = cookies.find((cookie) => cookie.startsWith("authToken="))
  return authToken ? authToken.split("=")[1] : null
}

export default function RegForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<FormData[]>([])
  const [registrationDone, setRegistrationDone] = useState<boolean | null>(null)

  async function completeRegistration() {
    setLoading(true);
    const token = getAuthToken();
    
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await post<{ success: boolean; message?: string }>(
        `/api/form/completeRegistration`,
        { cookies: token }
      );

      if (response?.data?.success) {
        setRegistrationDone(true);

        // navigate then force a re-render of app-router server components
        await router.push("/dashboard/Payments");
        try { router.refresh(); } catch {} // ensure app router revalidates

        // notify any client components (sidebar) to refetch immediately
        try { window.dispatchEvent(new Event("user:updated")); } catch {}

        return;
      }

      console.warn("completeRegistration: unexpected response", response);
    } catch (err) {
      console.error("completeRegistration error:", err);
    } finally {
      setLoading(false);
    }
  }

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
            setRegistrationDone(response.data.data.registrationDone ?? false)
          } else {
            setRegistrationDone(null)
          }
        } catch (error) {
          // console.error("Error fetching registration/payment state:", error)
        } finally {
          setLoading(false)
        }
      }
  
      getRegistrationState()
    }, [])


  useEffect(() => {
    const getForms = async () => {
      try {
        const token = getAuthToken()
        if (!token) {
          // console.error("Auth token not found")
          setLoading(false)
          return
        }

          const response = await post<{ success: boolean; data?: FormData[] }>(
            `/api/form/getAllForms`,
            {
              cookies: token,
            }
          )

        if (response.data?.success && response.data?.data) {
          setData(response.data.data)
        } else {
          // console.error("Failed to retrieve form data or no data returned.")
        }
      } catch (error) {
        // console.error("Error fetching form data:", error)
      } finally {
        setLoading(false)
      }
    }

    getForms()
  }, [])

  const DataTable = ({ columns, data }: { columns: ColumnDef<FormData>[]; data: FormData[] }) => {
    const table = useReactTable({
      data,
      columns,
      getCoreRowModel: getCoreRowModel(),
    })


    return (
      <div className="overflow-x-auto rounded-lg shadow-lg">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="bg-black hover:bg-black-200 group">
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className="text-white text-center group-hover:bg-black-200 transition-colors duration-200"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="text-center">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
    )
  }

  if (registrationDone === true) {
    return <span className="text-red-600 font-semibold">Registrations are already confirmed</span>
  }

  return (
    <>
      <div className="h-screen w-full relative">
        <div className="w-full">
          <HeadingWithUnderline
            text="Registration Forms"
            desktopSize="md:text-6xl"
            mobileSize="text-3xl sm:text-2xl"
          />
          
          {/* Guidelines Section */}
          <div className="w-full mt-6 px-4">
            <h2 className="text-xl font-semibold mb-4">Important Information</h2>
            <div className="space-y-4 ml-4 mb-6">
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-sm">1</span>
                <p className="text-gray-700">Click on select sport to start filling out registration form for a sport</p>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-sm">2</span>
                <p className="text-gray-700">You can't edit a form once it has been submitted</p>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-sm">3</span>
                <p className="text-gray-700">After submitting all forms, visit the payments page to pay for all registrations.</p>
                </div>
              
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-sm">4</span>
                <p className="text-gray-700">Once you submit the form, you'll receive a confirmation email with your responses. Our team will review your details and send a registration confirmation email. You can also check your registration status on the dashboard.</p>
                </div>
              
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-sm">5</span>
                <p className="text-gray-700">For any queries contact at <a href="mailto:agneepath@ashoka.edu.in" className="text-blue-600 hover:underline">agneepath@ashoka.edu.in</a> 
                {/* or you can generate a support request from the sidebar */}
                </p>
              </div>
            </div>
          </div>
        </div>
    
        <div className="flex justify-start">
          <div className="">
            <RenderPopoverForm schema={eventSchema.commonPages[0].fields} meta={eventSchema.commonPages[0].meta} />
          </div>
        </div>
    
        <div className="w-full mt-6 pb-6 pr-5">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : data.length === 0 ? (
            <EmptyState />
          ) : (
            <DataTable columns={columns} data={data} />
          )}
        </div>
        <AlertDialog>
        <AlertDialogTrigger asChild>
          <div className="pr-5 pb-6"><button className="w-full p-3 rounded-md bg-primary text-white flex flex-row items-center justify-center gap-5"><span>Finalise Registrations</span><ArrowRight size={18} /></button></div>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogTitle>Finalise Registrations</AlertDialogTitle>
            <>
                <p>
                  {data.filter((form) => form.status === "submitted").length === 0 ? "You have no completed forms, submit at least one form to proceed." : data.filter((form) => form.status === "draft").length > 0 ? `You have ${data.filter((form) => form.status === "draft").length} form(s) still in draft. These forms will be discarded if you finalise your registrations now.` : "You have completed all your registration forms."}
                </p>
                {data.filter((form) => form.status === "submitted").length > 0 ? <p>
                  Finalising your registrations will lock all your submitted forms. You won't be able to make any further edits. Are you sure you want to proceed?
                </p> : <></>}
            </>
          <div className="flex justify-end space-x-2 items-end sticky bottom-0 right-0 pt-4 bg-white mt-4 mr-5">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {data.filter((form) => form.status === "submitted").length > 0 ? <Button onClick={completeRegistration}>
              Confirm
            </Button> : <></>}
          </div>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </>
  )
}
