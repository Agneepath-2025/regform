"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import HeadingWithUnderline from "@/app/components/dashboard/headingWithUnderline";
import { eventSchema, sports, SportsGuidlines } from "@/app/utils/forms/schema";
import RenderForm from "@/app/components/dashboard/form/DynamicForm";
import { useSearchParams } from "next/navigation";
import { decrypt } from "@/app/utils/encryption";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { post } from "@/app/utils/PostGetData";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
const getAuthToken = (): string | null => {
  const cookies = document.cookie.split("; ");
  const authToken = cookies.find((cookie) => cookie.startsWith("authToken="));
  return authToken ? authToken.split("=")[1] : null;
};

function typecastDatesInPlayerFields(playerFields: Record<string, any>[]) {
  playerFields.forEach((obj) => {
    for (const key in obj) {
      if (typeof obj[key] === "string" && !isNaN(Date.parse(obj[key]))) {
        obj[key] = new Date(obj[key]); // Convert string to Date
      }
    }
  });
}

const MarkdownComponents: Components = {
  table: ({ children }) => (
    <table className="min-w-full divide-y divide-gray-200 my-4 border">
      {children}
    </table>
  ),
  thead: ({ children }) => (
    <thead className="bg-gray-50">
      {children}
    </thead>
  ),
  tbody: ({ children }) => (
    <tbody className="bg-white divide-y divide-gray-200">
      {children}
    </tbody>
  ),
  tr: ({ children }) => (
    <tr className="hover:bg-gray-50">
      {children}
    </tr>
  ),
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
  li: ({ children }) => (
    <li className="pl-2">
      {children}
    </li>
  ),
  p: ({ children }) => (
    <p className="my-4">
      {children}
    </p>
  ),
  h1: ({ children }) => (
    <h1 className="text-2xl font-bold my-4">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-xl font-bold my-3">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-lg font-bold my-2">
      {children}
    </h3>
  ),
  pre: ({ children }) => (
    <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto my-4">
      {children}
    </pre>
  ),
  code: ({ children }) => (
    <code className="bg-gray-100 px-1 rounded">
      {children}
    </code>
  ),
};

export default function Form() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Record<string, unknown>>({});
  const [title, setTitle] = useState<string>("");
  const [markdownContent, setMarkdownContent] = useState<string>("");
  const searchParams = useSearchParams();
  const eparam = searchParams.get("i") || "";
  const paramI = decrypt(eparam);
  const formId = paramI.id;

  useEffect(() => {
    const getForms = async () => {
      try {
        const token = getAuthToken();
        if (!token) {
          // console.error("Auth token not found");
          setLoading(false);
          return;
        }

        const response = await post<{ success: boolean; data?: Record<string, any> }>(
          `/api/form/getForm`,
          {
            formId,
            cookies: token,
          }
        );

        if (response.data?.success && response.data?.data) {
          try {
            typecastDatesInPlayerFields(response.data.data.fields.playerFields);
          } catch (e) {
            // Handle error silently
          }
          setData(response.data.data.fields);
          setTitle(response.data.data.title);
        } else {
          // console.error("Failed to retrieve form data or no data returned.");
        }
      } catch (error) {
        // console.error("Error fetching form data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (formId) getForms();
  }, [formId]);

  useEffect(() => {
    const fetchMarkdown = async () => {
      try {
        const response = await fetch(`/markdown/${SportsGuidlines[title]}.md`);
        if (response.ok) {
          const text = await response.text();
          setMarkdownContent(text);
        } else {
          // console.error("Markdown file not found:", `/markdown/${title}.md`);
        }
      } catch (error) {
        // console.error("Error fetching markdown file:", error);
      }
    };

    if (title) fetchMarkdown();
  }, [title]);

  return (
    <div className="w-full mt-6 pb-8 pr-5">
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="h-screen w-full">
          <HeadingWithUnderline
            text={sports[title]}
            desktopSize="md:text-6xl"
            mobileSize="text-5xl sm:text-2xl"
          />

          <div className="flex justify-center mt-4">
            <Drawer>
              <DrawerTrigger asChild>
                <Button className="bg-orange-500 text-white hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-300">
                  View Sports Guidelines 
                </Button>
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Sports Guidelines</DrawerTitle>
                </DrawerHeader>
                <div className="px-4 py-2 max-h-[60vh] overflow-y-auto prose prose-sm max-w-none flex justify-center">
                  <div className="flex justify-center w-full">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={MarkdownComponents}
                    >
                      {markdownContent}
                    </ReactMarkdown>
                  </div>
                </div>
                <DrawerFooter>
                  <DrawerClose asChild>
                    <Button>Close</Button>
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          </div>
            
          <RenderForm
            schema={eventSchema.subEvents[title].specificPages[0].fields}
            draftSchema={eventSchema.subEvents[title].specificPages[0].draft}
            meta={eventSchema.subEvents[title].specificPages[0].meta}
            defaultvalues={data}
            formId={formId as string}
          />
        </div>
      )}
    </div>
  );
}