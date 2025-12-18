"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import type { Components } from "react-markdown";

const MarkdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="text-4xl font-bold my-10 text-center">{children}</h1>
  ),

  h2: ({ children }) => (
    <h2 className="text-2xl font-bold mt-12 mb-6 text-center">{children}</h2>
  ),

  h3: ({ children }) => (
    <h3 className="text-lg font-semibold mt-6 mb-2">{children}</h3>
  ),

 h4: ({ children }) => (
  <h4 className="mt-6 mb-2 text-left text-sm font-semibold tracking-wide text-black uppercase">
    {children}
  </h4>
),

p: ({ children }) => (
  <p className="my-0.5 text-left text-gray-800">
    {children}
  </p>
),


blockquote: ({ children }) => (
  <div className="mt-4 mb-6 mx-auto max-w-sm rounded-xl border border-gray-200 bg-gray-50 px-6 py-4 text-center shadow-sm">
    {children}
  </div>
),



  a: ({ href, children, ...props }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block mt-1 mb-2 text-blue-600 font-medium underline underline-offset-2 hover:text-blue-800"
      {...props}
    >
      {children}
    </a>
  ),

  ul: ({ children }) => (
    <ul className="list-disc list-inside space-y-1 my-2 ml-4">
      {children}
    </ul>
  ),

  ol: ({ children }) => (
    <ol className="list-decimal list-inside space-y-1 my-2 ml-4">
      {children}
    </ol>
  ),

  strong: ({ children }) => (
    <strong className="font-semibold text-gray-900">{children}</strong>
  ),
};


export default function FAQPage() {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/markdown/FAQ.md")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load FAQ");
        return res.text();
      })
      .then(setContent)
      .catch(() => setContent("Failed to load FAQ content."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      {loading ? (
        <p>Loading...</p>
      ) : (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={MarkdownComponents}
        >
          {content}
        </ReactMarkdown>
      )}
    </div>
  );
}
