"use client"
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable react-hooks/exhaustive-deps */
import { Separator } from "@/components/ui/separator"
import { format, set } from "date-fns"
import { Medal } from 'lucide-react';
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, ControllerRenderProps } from "react-hook-form"
import { z } from "zod"
import { useState, useEffect } from "react"
import styles from "@/app/styles/toast.module.css"
import { toast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { useRef } from "react";
import { cn } from "@/lib/utils"
import Image from "next/image";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Calendar } from "@/components/ui/calendar"
import { Plus, CalendarIcon, X } from 'lucide-react';
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import HeadingWithUnderline from "@/app/components/dashboard/headingWithUnderline"
import { post } from "@/app/utils/PostGetData"
import { sports } from '@/app/utils/forms/schema';
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table"
import { useRouter } from "next/navigation";


const EmptyState = () => (
  <div className="flex flex-col items-center justify-center p-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
    <Medal className="w-16 h-16 text-gray-400 mb-4" />
    <h3 className="text-xl font-bold text-gray-700 mb-2">No Sports Registered</h3>
    <p className="text-gray-500 text-center max-w-md">
      You haven't registered for any sports yet.
    </p>
  </div>
);

export type FormData = {
  createdAt: string;
  amountInNumbers: number;
  status: string;
};

const StatusCell: React.FC<{ status: string }> = ({ status }) => {
  const isVerified = status === "verified";
  return (
    <div className="flex items-center gap-2">
      <span
        className={`w-2 h-2 rounded-full ${isVerified ? "bg-green-500" : "bg-yellow-500"}`}
      ></span>
      <span className={isVerified ? "text-green-500" : "text-yellow-500"}>{isVerified ? "Verified" : "In Review"}</span>
    </div>
  );
};

const columns: ColumnDef<FormData>[] = [
  {
    accessorKey: "transactionId",
    header: "Transaction ID",
  },
  {
    accessorKey: "createdAt",
    header: "Form Submission",
    cell: ({ row }) => {
      const date = new Date(row.original.createdAt);
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
    accessorKey: "amountInNumbers",
    header: "Amount",
    cell: ({ row }) => `₹${row.original.amountInNumbers}`,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusCell status={row.original.status} />,
  },
];





const FormSchema = z
  .object({
    needAccommodation: z.boolean(),
    numberOfPlayers: z
      .number({
        required_error: "Number of players is required when accommodation is needed",
        invalid_type_error: "Number of players must be a number",
      })
      .min(1, "Number of players must be at least 1")
      .optional(),
  })
  .refine(
    (data) =>
      data.needAccommodation
        ? data.numberOfPlayers !== undefined
        : data.numberOfPlayers === undefined,
    {
      message: "Number of players must be at least 1",
      path: ["numberOfPlayers"],
    }
  )

const PaymentFormSchema = z.object({
  paymentMode: z.string().nonempty({ message: "Payment mode is required." }),
  amountInNumbers: z
    .number().min(800, { message: "Amount must be atleast 800 rupees" }),
  amountInWords: z.string()
    .nonempty({ message: "Amount in words is required." })
    .refine((val) => val.toLowerCase().endsWith("rupees only"), {
      message: "Amount in words must end with 'rupees only'.",
    }),
  payeeName: z.string().nonempty({ message: "Payee name is required." }),
  transactionId: z.string().nonempty({ message: "Transaction ID is required." }),
  paymentProof: z
      .custom<File>((v) => v instanceof File && v.size > 0, {
        message: "Payment proof screenshot is required."
      })
      .refine((file) => ["image/jpeg", "image/png", "application/pdf"].includes(file.type), {
        message: "Only JPEG, PNG images or PDFs allowed",
      })
      .refine((file) => file.size <= 10 * 1024 * 1024, {
          message: "File must be smaller than 10MB",
      }),
  paymentDate: z
    .date()
    .refine((date) => !isNaN(date.getTime()), { message: "A valid payment date is required." }),
  remarks: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof PaymentFormSchema>;

interface PaymentFormProps {
  accommodationPrice?: number;
  sportsTotal?: number;
  onCompleted?: () => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ accommodationPrice = 2100, sportsTotal = 0, onCompleted }) => {
  const router = useRouter();
  const [showSportFields, setShowSportFields] = useState(false);
  const [showAccommodationFields, setShowAccommodationFields] = useState(false);
  const [paymentFormloading, setPaymentFormloading] = useState<boolean>(false);
  const [resetForm, setResetForm] = useState<boolean>(false);

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(PaymentFormSchema),
    defaultValues: { paymentDate: new Date(), }
  });

  const resetFormAndState = () => {
    form.reset();
    setShowSportFields(false);
    setShowAccommodationFields(false);
    setPaymentFormloading(false);
  };

  const onSubmit = async (data: PaymentFormValues) => {
    //console.log(data);
    setPaymentFormloading(true);

    try {
      const formData = new FormData();

      formData.append("paymentMode", data.paymentMode);

      formData.append("amountInNumbers", data.amountInNumbers.toString());
      formData.append("amountInWords", data.amountInWords);
      formData.append("payeeName", data.payeeName);
      formData.append("transactionId", data.transactionId);
      formData.append("paymentDate", data.paymentDate.toISOString());


      formData.append("paymentProof", data.paymentProof);


      if (data.remarks) {
        formData.append("remarks", data.remarks);
      }

      const token = getAuthToken();
      if (!token) {
        setPaymentFormloading(false);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Authentication token missing. Please log in.",
          className: styles["mobile-toast"],
        });
        return;
      }

      // Use fetch with proper multipart handling
      const response = await fetch(`/api/payments/submit`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          // DO NOT set Content-Type; browser will set it with boundary for multipart
        },
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast({
          title: "Success",
          description: "Payment submitted successfully",
          className: styles["mobile-toast"],
        });

        resetFormAndState();
        setResetForm(!resetForm);

        if (typeof onCompleted === "function") onCompleted();
      } else {
        setPaymentFormloading(false);
        toast({
          variant: "destructive",
          title: "Error",
          description: result.message || "Failed to submit payment. Please try again.",
          className: styles["mobile-toast"],
        });
      }
    } catch (error) {
      setPaymentFormloading(false);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        className: styles["mobile-toast"],
      });
    }
  };


  // create/revoke blob URL for PDF data URLs so iframe can render
  /*useEffect(() => {
    if (preview && preview.startsWith("data:application/")) {
      try {
        const split = preview.split(',');
        const meta = split[0]; // e.g. "data:application/pdf;base64"
        const b64 = split[1] || '';
        const mimeMatch = meta.match(/data:([^;]+);/);
        const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
        const binary = atob(b64);
        const len = binary.length;
        const buffer = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          buffer[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([buffer], { type: mime });
        const url = URL.createObjectURL(blob);
        setPdfBlobUrl(url);
      } catch (e) {
        console.warn("Failed to create PDF blob URL", e);
        setPdfBlobUrl(null);
      }
    } else {
      // not a PDF preview — ensure any previous object URL is revoked
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
        setPdfBlobUrl(null);
      }
    }
    return () => {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [preview])*/


  const [preview, setPreview] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [paymentProofValue, setPaymentProofValue] = useState<File | string | undefined>(undefined)

  const paymentProofWatch = form.watch("paymentProof");

  useEffect(() => {
    setPaymentProofValue(paymentProofWatch);
  }, [paymentProofWatch]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      if (preview && preview.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [preview, pdfBlobUrl]);

  // Handle PDF blob URL creation
  useEffect(() => {
    if (fileType === "application/pdf" && preview) {
      setPdfBlobUrl(preview);
    } else {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
        setPdfBlobUrl(null);
      }
    }
  }, [fileType, preview]);

  // Fetch preview for existing files (string URLs)
  useEffect(() => {
    if (typeof paymentProofValue === "string") {
      async function fetchPreview() {
        try {
          const res = await fetch(`/api/payments/proof/${paymentProofValue}`);
          if (!res.ok) return;
          const blob = await res.blob();
          const previewUrl = URL.createObjectURL(blob);
          setPreview(previewUrl);
          setFileType(blob.type);
        } catch (err) {
          console.error("Failed to fetch preview", err);
        }
      }
      fetchPreview();
    }
  }, [paymentProofValue]);


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {paymentFormloading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            <FormField
              control={form.control}
              name="paymentMode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg font-bold">Mode of Payment</FormLabel>
                  <Select onValueChange={field.onChange} value={"bank"}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amountInNumbers"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel className={cn(
                    "text-lg font-bold",
                    fieldState.error && "text-red-500"
                  )}>Total Amount in Numbers</FormLabel>
                  <FormDescription className="mt-0">
                    Total amount to pay: ₹{sportsTotal}
                  </FormDescription>
                  <Input
                    type="number"
                    placeholder="Enter amount in numbers"
                    {...field}
                    onChange={e => {
                      const value = parseFloat(e.target.value);
                      field.onChange(isNaN(value) ? 0 : value);
                    }}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amountInWords"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg font-bold">Total Amount in Words</FormLabel>
                  <FormDescription>Add "only" at the end. Ex: Two thousand rupees only</FormDescription>
                  <Input placeholder="Enter amount in words" {...field} />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="payeeName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg font-bold">Name of Payee</FormLabel>
                  <Input placeholder="Enter payee name" {...field} />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="transactionId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg font-bold">Transaction ID</FormLabel>
                  <Input placeholder="Enter transaction ID or cheque number" {...field} />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paymentProof"
              render={({ field }) => {
                const value = field.value;

                const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  // Revoke previous preview URL
                  if (preview && preview.startsWith("blob:")) {
                    URL.revokeObjectURL(preview);
                  }

                  field.onChange(file);
                  const previewUrl = URL.createObjectURL(file);
                  setPreview(previewUrl);
                  setFileType(file.type);
                };

                const handleClear = () => {
                  if (preview && preview.startsWith("blob:")) {
                    URL.revokeObjectURL(preview);
                  }
                  if (pdfBlobUrl) {
                    URL.revokeObjectURL(pdfBlobUrl);
                    setPdfBlobUrl(null);
                  }
                  field.onChange(undefined);
                  setPreview(null);
                  setFileType(null);
                };

                return (
                  <FormItem>
                    <FormLabel className="text-lg font-bold">Payment Proof</FormLabel>
                    <FormDescription>
                      File Type: PDF/JPEG/PNG. Maximum 1. Max filesize: 10MB
                    </FormDescription>
                    <div>
                      <Input
                        type="file"
                        accept="image/jpeg, image/png, application/pdf"
                        hideFileInfo={true}
                        onChange={handleFileChange}
                      />
                      
                      {/* Image Preview */}
                      {preview && fileType?.startsWith("image/") && (
                        <div className="relative inline-block mt-2">
                          <button
                            type="button"
                            onClick={handleClear}
                            className="absolute top-1 right-1 p-1 rounded-full bg-red-50 hover:bg-red-100 text-red-600 z-10"
                          >
                            <X size={16} />
                          </button>
                          <img
                            src={preview}
                            alt="Preview"
                            className="w-[150px] h-[150px] object-cover rounded-md border"
                          />
                        </div>
                      )}

                      {/* PDF Preview */}
                      {preview && fileType === "application/pdf" && (
                        <div className="relative inline-block mt-2">
                          <button
                            type="button"
                            onClick={handleClear}
                            className="absolute top-1 right-1 p-1 rounded-full bg-red-50 hover:bg-red-100 text-red-600 z-10 transition-colors"
                            title="Clear selected file"
                          >
                            <X size={16} />
                          </button>
                          {pdfBlobUrl ? (
                            <iframe
                              src={pdfBlobUrl}
                              width="500"
                              height="500"
                              style={{ border: 'none' }}
                              title="PDF Viewer"
                              className="rounded-md border"
                            />
                          ) : (
                            <div className="w-[500px] h-[500px] flex items-center justify-center bg-gray-100 rounded border">
                              Loading PDF...
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <FormField
              control={form.control}
              name="paymentDate"
              render={({ field }) => {
                const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                  const value = e.target.value;

                  // Must match strict HH:MM:SS (00–23, 00–59, 00–59)
                  const isValid = /^\d{2}:\d{2}:\d{2}$/.test(value);

                  if (!isValid) return; // Ignore partial or invalid input

                  const [h, m, s] = value.split(":").map(Number);

                  const base = field.value ? new Date(field.value) : new Date();
                  base.setHours(h);
                  base.setMinutes(m);
                  base.setSeconds(s);

                  field.onChange(base);
                };


                return (
                  <FormItem className="flex flex-col">
                    <FormLabel className="font-bold text-lg">Date of Payment</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? format(field.value, "PPP p") : "Pick a date"}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>

                      <PopoverContent className="w-auto p-0" align="start">
                        {/* DATE PICKER */}
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                            if (!date) return;

                            // preserve previous time
                            if (field.value) {
                              date.setHours(field.value.getHours());
                              date.setMinutes(field.value.getMinutes());
                              date.setSeconds(field.value.getSeconds());
                            }

                            field.onChange(date);
                          }}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />

                        {/* TIME PICKER */}
                        <div className="flex flex-row items-center justify-center border rounded-md">
                          <label className="text-bold ml-2 mr-2 font-bold">Time</label>
                          <Input
                            type="time"
                            step="1"
                            value={
                              field.value
                                ? `${String(field.value.getHours()).padStart(2, "0")}:` +
                                  `${String(field.value.getMinutes()).padStart(2, "0")}:` +
                                  `${String(field.value.getSeconds()).padStart(2, "0")}`
                                : ""
                            }
                            onChange={handleTimeChange}
                            className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden border-none"
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />


            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg font-bold">Remarks</FormLabel>
                  <Input placeholder="Enter any comments if you have" {...field} />
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full bg-black text-white hover:bg-gray-800">
              Submit Payment
            </Button>
          </>
        )}
      </form>
    </Form>
  );
};

const getAuthToken = (): string | null => {
  if (typeof document !== 'undefined') {
    const cookies = document.cookie.split("; ")
    const authToken = cookies.find((cookie) => cookie.startsWith("authToken="))
    return authToken ? authToken.split("=")[1] : null
  }
  return null
}

interface PaymentData {
  Accommodation: {
    needAccommodation: boolean;
    cp?: number;
  };
  submittedForms: {
    [key: string]: {
      Players: number;
    };
  } | null;

}

export default function Payments() {
  const paymentFormRef = useRef<HTMLDivElement>(null);
  const [registrationDone, setRegistrationDone] = useState<boolean | null>(null)
  const [paymentDone, setPaymentDone] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  async function completePayment() {
    setIsLoading(true);
    const token = getAuthToken();
    
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await post<{ success: boolean; message?: string }>(
        `/api/form/completePayment`,
        { cookies: token }
      );

      if (response?.data?.success) {
        setPaymentDone(true);

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
      setIsLoading(false);
      router.push("/dashboard");
    }
  }

  useEffect(() => {
      setIsLoading(true)
      const getRegistrationState = async () => {
        try {
          const token = getAuthToken()
          if (!token) {
            // console.error("Auth token not found")
            setIsLoading(false)
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
        } catch (error) {
          // console.error("Error fetching registration/payment state:", error)
        } finally {
          setIsLoading(false)
        }
      }
  
      getRegistrationState()
    }, [])


  const [showInput, setShowInput] = useState(false);
  const [paymentData, setPaymentData] = useState<PaymentData>({
    Accommodation: { needAccommodation: false },
    submittedForms: null
  })
  const [filledForms, setFilledForms] = useState<FormData[]>([]);
  const [updatePrice, setUpdatePrice] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null)
  const [accommodationPrice, setAccomodationPrice] = useState<number>(2100);
  const router = useRouter();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: { needAccommodation: false, numberOfPlayers: undefined },
  })


  // const [formReset,setFormReset] = useState(false);


  const resetFormOnce = useRef(false);

  useEffect(() => {
    const fetchPaymentData = async () => {
      try {
        const token = getAuthToken();
        const response = await post<{ success: boolean; data?: PaymentData, form: FormData[] }>(

          `/api/payments`,
          {
            cookies: token,
          }
        );
        if (response.data?.success) {
          if (response.data.data?.Accommodation.cp) {
            setAccomodationPrice(response.data.data?.Accommodation.cp);
          }
          setPaymentData(
            response.data.data || {
              Accommodation: { needAccommodation: false },
              submittedForms: null,
            }
          );
          setFilledForms(response.data.form);
          console.log();
          console.log(response.data.form);

          setShowInput(response.data.data?.Accommodation.needAccommodation || false);

          // Only reset the form once after data is fetched
          if (!resetFormOnce.current) {
            form.reset({ needAccommodation: false, numberOfPlayers: undefined });
            form.reset(response.data.data?.Accommodation || {});
            resetFormOnce.current = true;
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch payment data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPaymentData();
  }, []);

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    // console.log("onSubmit triggered");
    try {
      const token = getAuthToken();
      const response = await post<{ success: boolean; data?: PaymentData }>(
        `/api/payments/Accommodation`,
        {
          cookies: token,
          accommodationData: data
        }
      );

      if (!response.data?.success) {
        return toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to save accommodation data. Please try again.",
          className: styles["mobile-toast"],

        });
      }

      toast({
        title: "Success",
        description: "Data saved successfully",
        className: styles["mobile-toast"],

      });

    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        className: styles["mobile-toast"],

      });
    }
  }


  // async function handleAddPayment(data: z.infer<typeof AddPaymentSchema>) {
  //   try {
  //     // Prepare form data
  //     const formData = new FormData();
  //     if (data.file) {
  //       formData.append("file", data.file); // Append the selected file
  //     }
  //     formData.append("amount", data.amount.toString()); // Append the amount
  //     if (data.message) {
  //       formData.append("message", data.message); // Append optional remarks
  //     }

  //     // Fetch token for authentication
  //     const token = getAuthToken();
  //     if (!token) {
  //       return toast({
  //         variant: "destructive",
  //         title: "Error",
  //         description: "Authentication token missing. Please log in.",
  //         className: styles["mobile-toast"],
  //       });
  //     }
  //     const response = await fetch(`/api/payments/upload`, {

  //       method: "POST",
  //       headers: {
  //         Authorization: `Bearer ${token}`, // Pass the token in headers
  //       },
  //       body: formData, // Send formData directly
  //     });

  //     const result = await response.json();

  //     // Handle response
  //     if (response.ok && result.success) {
  //       toast({
  //         title: "Success",
  //         description: "Payment added successfully",
  //         className: styles["mobile-toast"],
  //       });
  //       formAddPayment.reset(); // Reset the form after success
  //     } else {
  //       toast({
  //         variant: "destructive",
  //         title: "Error",
  //         description: result.message || "Failed to add payment. Please try again.",
  //         className: styles["mobile-toast"],
  //       });
  //     }
  //   } catch (error) {
  //     toast({
  //       variant: "destructive",
  //       title: "Error",
  //       description: error instanceof Error ? error.message : "An unexpected error occurred.",
  //       className: styles["mobile-toast"],
  //     });
  //   }
  // }



  const calculateSportsTotal = () => {
    if (!paymentData?.submittedForms) return 0
    return Object.entries(paymentData.submittedForms).reduce((total, [_, sport]) => {
      return total + (sport.Players * 800)
    }, 0)

  }

  const calculateAccommodationTotal = () => {
    if (!form.getValues("needAccommodation")) return 0
    const players = form.getValues("numberOfPlayers") || 0
    return players * accommodationPrice

  }

  const overallTotal = calculateSportsTotal() + calculateAccommodationTotal()
  const sportsTotal = calculateSportsTotal();


  if (registrationDone === false || registrationDone === null || paymentDone === true) {
    return <div className="w-full h-full flex items-center justify-center"><span className="text-red-600 font-semibold">{paymentDone === true  ? "Payments have already been confirmed"  : "Please complete your registration first before making payments"}</span></div>
  }

  if (isLoading) return <div className="flex items-center justify-center h-64">
    <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
  </div>
  if (error) return <div>Error: {error}</div>
  const DataTable = ({ columns, data }: { columns: ColumnDef<FormData>[]; data: FormData[] }) => {
    const table = useReactTable({
      data,
      columns,
      getCoreRowModel: getCoreRowModel(),
    });

    return (
      <div className="rounded-lg shadow-lg max-w-full">
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
    );
  };

  return (
      <div className="w-full h-full relative">
      <div className="w-full px-6 pb-6">
        <HeadingWithUnderline
          text="Payments"
          desktopSize="md:text-6xl"
          mobileSize="text-3xl sm:text-2xl"
        />
        <div className="w-full mt-6 px-4">
      <h2 className="text-xl font-semibold mb-4">Important Information</h2>
      
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-3">Bank Details</h3>
        <div className="overflow-x-auto">
          <table className="w-full mb-6 border-collapse bg-white shadow-sm rounded-lg">
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="py-3 px-4 font-medium bg-gray-50">Account Name</td>
                <td className="py-3 px-4">Ashoka University Events Collection</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium bg-gray-50">Account Number</td>
                <td className="py-3 px-4">50200008952959</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium bg-gray-50">IFSC Code</td>
                <td className="py-3 px-4">HDFC0003433</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium bg-gray-50">Account Type</td>
                <td className="py-3 px-4">Current</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-4 ml-4">
        <div className="flex items-start gap-3">
          <span className="flex-shrink-0 w-6 h-6 bg-black text-white rounded-full flex items-start justify-center text-sm" style={{paddingTop: "0.05rem"}}>1</span>
          <p className="text-gray-700">Submit your payment details below.</p>
        </div>

        <div className="flex items-start gap-3">
          <span className="flex-shrink-0 w-6 h-6 bg-black text-white rounded-full flex items-start justify-center text-sm" style={{paddingTop: "0.05rem"}}>2</span>
          <p className="text-gray-700">After submitting payment details, you'll receive a confirmation email with a copy of your submission.</p>
        </div>

        <div className="flex items-start gap-3">
          <span className="flex-shrink-0 w-6 h-6 bg-black text-white rounded-full flex items-start justify-center text-sm">3</span>
          <p className="text-gray-700">You can view your auto calculated registration fee below based on your submitted forms.</p>
        </div>

        <div className="flex items-start gap-3">
          <span className="flex-shrink-0 w-6 h-6 bg-black text-white rounded-full flex items-start justify-center text-sm">4</span>
          <p className="text-gray-700">For any queries contact at <a href="mailto:agneepath@ashoka.edu.in" className="text-blue-600 hover:underline">agneepath@ashoka.edu.in</a></p>
        </div>
      </div>
    </div>
        <div className="mt-10 space-y-8 pb-10">
          <Card>
            <CardHeader>
              <HeadingWithUnderline
                text="Amount to be Paid"
                desktopSize="md:text-4xl"
                mobileSize="text-2xl sm:text-xl"
              />
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                {!paymentData?.submittedForms || Object.keys(paymentData.submittedForms).length === 0 ? (
                  <EmptyState />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-bold">Sport</TableHead>
                        <TableHead className="text-right font-bold">Players</TableHead>
                        <TableHead className="text-right font-bold">Registration Fee</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(paymentData.submittedForms).map(([sport, data]) => (
                        <TableRow key={sport}>
                          <TableCell className="font-medium">{sports[sport]}</TableCell>
                          <TableCell className="text-right">{data.Players}</TableCell>
                          <TableCell className="text-right">₹{data.Players * 800}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50">
                        <TableCell colSpan={2} className="font-bold">Total Registration Fee</TableCell>
                        <TableCell className="text-right font-bold">₹{calculateSportsTotal()}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                )}
              </div>
            </CardContent>
          </Card>

          {/* <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Accommodation Details</CardTitle>
              <CardDescription>Accommodation cost per player for the entire event is ₹{accommodationPrice}, which also includes meals and transportation to and from the campus.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="needAccommodation"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-3">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={(checked) => {
                              const isChecked = checked === true
                              field.onChange(isChecked)
                              setShowInput(isChecked)
                              if (!isChecked) {
                                form.setValue("numberOfPlayers", undefined);
                                form.reset({ needAccommodation: false })
                              }
                            }}
                          />
                        </FormControl>
                        <FormLabel>Do you need accommodation?</FormLabel>
                      </FormItem>
                    )}
                  />

                  {showInput && (
                    <FormField
                      control={form.control}
                      name="numberOfPlayers"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold">Number of players</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="number of players"
                              value={field.value || ""}
                              onChange={(e) => {
                                setUpdatePrice(!updatePrice);
                                field.onChange(
                                  e.target.value ? parseInt(e.target.value) : 0
                                )
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Accommodation Cost</span>
                      <span className="font-bold">₹{calculateAccommodationTotal()}</span>
                    </div>
                  </div>

                  <Button type="submit">Save</Button>
                </form>
              </Form>
            </CardContent>
          </Card> */}

          {/* <Card className="bg-primary/5">
            <CardContent className="p-6">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold text-primary">Total Amount to be Paid</span>
                <span className="text-2xl font-bold text-primary">₹{overallTotal}</span>
              </div>
            </CardContent>
          </Card> */}
        </div>

        {/*<div className="mt-6 pb-8 overflow-auto">
          {filledForms.length === 0 ? (
            <div></div>
          ) : (
            <div>
              <Separator className="my-4" ref={paymentFormRef} />
              <CardTitle className="pb-1">Submitted payments</CardTitle>
              <CardDescription className="pb-5">
                Below is the info of submitted forms. if status is in review then our team will verify the payment and get back to you
              </CardDescription>
              <DataTable columns={columns} data={filledForms} />
            </div>
          )}
        </div>*/}

        <Separator className="my-4" ref={paymentFormRef} />
        <h2 className="mt-5 text-2xl font-semibold text-gray-800">Payment Form</h2>
        <p className="text-sm text-gray-600 mb-4">Enter your payment details below</p>
        <PaymentForm
          accommodationPrice={accommodationPrice}
          sportsTotal={sportsTotal}
          onCompleted={completePayment}
        />
      </div>
    </div>
  )
}
