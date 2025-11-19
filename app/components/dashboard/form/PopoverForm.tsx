"use client"
// PopoverForm.tsx
import styles from "@/app/styles/toast.module.css"
import { generateDefaultValues } from "@/app/utils/forms/generateDefaultValues";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z, ZodObject, ZodRawShape, ZodString, ZodDate, ZodEnum, ZodEffects } from "zod"

import {  useToast } from "@/hooks/use-toast"
import { useState } from "react";
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { post } from "@/app/utils/PostGetData";
import { formMeta } from "@/app/utils/forms/schema";
import { encrypt } from "@/app/utils/encryption";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ObjectId } from "mongodb";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
interface FormSelectProps {
  name: string;
  options: { value: string; label: string }[];
  label: string;
  placeholder: string; // Array of options with value and label
}
const RenderPopoverForm: React.FC<{ schema: ZodObject<ZodRawShape>, meta: formMeta }> = ({ schema, meta }) => {
    const { toast } = useToast()
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: generateDefaultValues(schema),
  })
  const getAuthToken = (): string | null => {
    const cookies = document.cookie.split("; ");
    const authToken = cookies.find(cookie => cookie.startsWith("authToken="));
    return authToken ? authToken.split("=")[1] : null;
  };

  async function onSubmit(data: z.infer<typeof schema>) {
    setIsSubmitting(true);

    try {
      const response = await post<{ success: boolean; formId?: ObjectId }>(`/api/form/addForm`, {
        data,
        cookies: getAuthToken,
      });

      if (response.data?.success && response.data?.formId) {
        router.push(`/dashboard/regForm/form?i=${encrypt({id:response.data?.formId,title:data.Sports})}`);
        toast({
          variant: "default",
          title: "Form created!",
          description: `Form created for sports ${data.sports}`,
          className: styles["mobile-toast"]
        })
        // Redirect to /?formId=formId
      } else {
        toast({
          variant: "destructive",
          title: "Uh oh! Something went wrong.",
          description: `${response.error.message}`,
          className: styles["mobile-toast"]
        })
        setIsSubmitting(false);
        // Show a success toast in case the formId is not returned

      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: `${error}`,
        className: styles["mobile-toast"]
      });
      setIsSubmitting(false);
    } finally {
      //  // Reset loading state
    }
  }





  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-




  const FormInput = ({ name, label, placeholder }: { name: string; label: string; placeholder: string; }) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="font-bold">{label}</FormLabel>
          <FormControl>
            <Input placeholder={placeholder} {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )  // Render form fields based on the provided schema


  const FormDate = ({ name, label, placeholder }: { name: string; label: string; placeholder: string; }) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-col">
          <FormLabel className="font-bold">{label}</FormLabel>
          <Popover>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[240px] pl-3 text-left font-normal",
                    !field.value && "text-muted-foreground"
                  )}
                >
                  {field.value ? (
                    format(field.value, "PPP")
                  ) : (
                    <span>{placeholder}</span>
                  )}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={field.value}
                onSelect={field.onChange}
                disabled={(date) =>
                  date > new Date() || date < new Date("1900-01-01")
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )}
    />
  )

  const FormSelect = ({ name, options, label }: FormSelectProps,) => (
    <FormField
          control={form.control}
          name={name}
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel className="font-bold text-black">{label}</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col space-y-1"
                >
                  {options.map((option) => (
                <FormItem className="flex items-center space-x-3 space-y-0" key={option.value}>
                <FormControl>
                  <RadioGroupItem value={option.value} />
                </FormControl>
                <FormLabel className="font-normal">
                  {option.label}  
                </FormLabel>
              </FormItem>
              ))}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
  );

  const renderFormFields = (schema: ZodObject<ZodRawShape>, path = "") => {
    return Object.entries(schema.shape).map(([key, value]) => {
      const fieldPath = path ? `${path}.${key}` : key;
      if (value instanceof ZodEffects) {
        const baseSchema = value._def.schema;

        // Process based on the base type
        if (baseSchema instanceof ZodString) {
          return <FormInput key={fieldPath} name={fieldPath} label={meta[fieldPath].label as string} placeholder={meta[fieldPath].placeholder as string} />;
        } else if (baseSchema instanceof ZodDate) {
          return <FormDate key={fieldPath} name={fieldPath} label={meta[fieldPath].label as string} placeholder={meta[fieldPath].placeholder as string} />;
        }
      }
      else if (value instanceof ZodString) {
        return <FormInput key={fieldPath} name={fieldPath} label={meta[fieldPath].label as string} placeholder={meta[fieldPath].placeholder as string} />;
      } else if (value instanceof ZodDate) {
        return <FormDate key={fieldPath} name={fieldPath} label={meta[fieldPath].label as string} placeholder={meta[fieldPath].placeholder as string} />;
      } else if (value instanceof ZodEnum) {
        const options = (value as ZodEnum<[string, ...string[]]>)._def.values.map((option) => ({
          value: option,
          label: option,
        }));
        return <FormSelect key={fieldPath} name={fieldPath} options={options} label={meta[fieldPath].label as string} placeholder={meta[fieldPath].placeholder as string} />;
      } else if (value instanceof ZodObject) {
        // For nested Zod objects, recursively call renderFormFields
        return (
          <div key={fieldPath} className="nested-form">
            <h3>{key}</h3>
            {renderFormFields(value, fieldPath)} {/* Pass the current path */}
          </div>
        );
      }
      // Handle other types if needed
      return null;
    });
  };


  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          className="flex items-center space-x-2 text-white transition-transform transform hover:scale-105 shadow-md"
        >
          <Plus className="h-5 w-5" />
          <span>Select Sport</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogTitle></AlertDialogTitle>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-h-[70vh] overflow-y-scroll">
            {renderFormFields(schema)}
            <div className="flex justify-end space-x-2 items-end sticky bottom-0 right-0 pt-4 bg-white mt-4 mr-5">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <div className="spinner-border animate-spin inline-block w-4 h-4 border-2 rounded-full"></div>
                ) : (
                  "Submit"
                )}
              </Button>
            </div>
          </form>
        </Form>

      </AlertDialogContent>
    </AlertDialog>

  )
}

export default RenderPopoverForm
