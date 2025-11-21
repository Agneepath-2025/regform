"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import React from "react";

export type RegistrationProgressProps = {
  steps: string[];
  current: number; // 1-based index of the current step in progress
  completed?: number; // number of steps completed
  className?: string;
  compact?: boolean;
};

export default function RegistrationProgress({ steps, current, completed, className, compact = false }: RegistrationProgressProps) {
  const total = steps.length;
  const safeCurrent = Math.min(Math.max(current, 1), total);
  const completedCount = Math.min(
    typeof completed === "number" ? completed : Math.max(safeCurrent - 1, 0),
    total
  );
  const percent = Math.round((completedCount / total) * 100);

  return (
    <div className={cn("w-full", className)}>
      {/* Bar */}
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-black transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Steps */}
      <ol className={cn("mt-3 flex w-full justify-between ph-2", compact && "mt-2")}>
        {steps.map((label, idx) => {
          const stepIndex = idx + 1;
          const isDone = stepIndex <= completedCount;
          const isCurrent = stepIndex === safeCurrent && !isDone;

          return (
            <React.Fragment key={label}>
              <li className="flex min-w-0 items-center">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex h-7 w-7 justify-center rounded-full border text-sm",
                      isDone && "bg-black border-black text-white items-center",
                      isCurrent && !isDone && "bg-white border-black text-black items-start",
                      !isDone && !isCurrent && "bg-white border-gray-300 text-gray-400 items-start"
                    )}
                    aria-current={isCurrent ? "step" : undefined}
                    style={{paddingTop: "0.1rem"}}
                  >
                    {isDone ? <Check size={16} /> : stepIndex}
                  </span>
                  {!compact && (
                    <span
                      className={cn(
                        "text-sm truncate max-w-[11rem]",
                        isDone && "text-gray-900",
                        isCurrent && "text-gray-900 font-medium",
                        !isDone && !isCurrent && "text-gray-500"
                      )}
                      title={label}
                    >
                      {label}
                    </span>
                  )}
                </div>
              </li>
              {idx < steps.length - 1 && (
                <li className="h-px flex-1 bg-gray-300 self-center" aria-hidden="true" style={{maxWidth: "10px"}} />
              )}
            </React.Fragment>
          );
        })}
      </ol>
    </div>
  );
}
