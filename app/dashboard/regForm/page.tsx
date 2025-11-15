"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { useEffect, useState } from "react"
import { Medal } from 'lucide-react';
import HeadingWithUnderline from "@/app/components/dashboard/headingWithUnderline"
import RenderPopoverForm from "@/app/components/dashboard/form/PopoverForm"
import { eventSchema, sports } from "@/app/utils/forms/schema"
import { post } from "@/app/utils/PostGetData"
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { encrypt } from "@/app/utils/encryption"
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
        >
          Edit
        </Button>
      ) : (
        <Button disabled>Edit</Button>
      )}
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
  },
  {
    id: "actions",
    header: "Edit Form",
    cell: ({ row }) => <ActionCell row={row} />, // Use the new functional component
  },
];

const getAuthToken = (): string | null => {
  const cookies = document.cookie.split("; ")
  const authToken = cookies.find((cookie) => cookie.startsWith("authToken="))
  return authToken ? authToken.split("=")[1] : null
}

export default function RegForm() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<FormData[]>([])

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

  return (
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
              <p className="text-gray-700">After submitting the form, visit the Payments section to complete your registration. You must pay the registration fee to confirm your participation.</p>
              </div>
            
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-sm">4</span>
              <p className="text-gray-700">Once you submit the form, you'll receive a confirmation email with your responses. Our team will review your details and send a final registration confirmation email. You can also view your registration status on the dashboard.</p>
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
  
      <div className="w-full mt-6 pb-8 pr-5">
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
    </div>
  )
}
