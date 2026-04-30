import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Step {
  label:    string;
  sublabel?: string;
}

export interface StepIndicatorProps {
  steps:       Step[];
  currentStep: number;  // 0-indexed
  className?:  string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function StepIndicator({ steps, currentStep, className }: StepIndicatorProps) {
  return (
    <nav aria-label="Progreso del registro" className={cn("w-full", className)}>
      <ol className="flex items-center justify-center gap-0">
        {steps.map((step, i) => {
          const isDone    = i < currentStep;
          const isActive  = i === currentStep;
          const isLast    = i === steps.length - 1;

          return (
            <React.Fragment key={i}>
              {/* Step node */}
              <li className="flex flex-col items-center gap-1.5 min-w-[64px]">
                {/* Circle */}
                <span
                  aria-current={isActive ? "step" : undefined}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full border-2 transition-all duration-300",
                    isDone  && "border-primary   bg-primary   text-white",
                    isActive && "border-primary   bg-white     text-primary ring-4 ring-primary/15",
                    !isDone && !isActive && "border-border bg-surface text-text-muted"
                  )}
                >
                  {isDone ? (
                    <Check size={14} strokeWidth={2.5} />
                  ) : (
                    <span className={cn(
                      "text-xs font-semibold font-sans",
                      isActive ? "text-primary" : "text-text-muted"
                    )}>
                      {i + 1}
                    </span>
                  )}
                </span>

                {/* Labels */}
                <div className="text-center">
                  <p className={cn(
                    "text-xs font-medium font-sans leading-tight",
                    isActive ? "text-text-primary" : "text-text-muted"
                  )}>
                    {step.label}
                  </p>
                  {step.sublabel && (
                    <p className="text-2xs text-text-muted font-sans">{step.sublabel}</p>
                  )}
                </div>
              </li>

              {/* Connector line */}
              {!isLast && (
                <span
                  className={cn(
                    "h-0.5 flex-1 mx-1 mb-5 rounded-full transition-colors duration-300",
                    i < currentStep ? "bg-primary" : "bg-border"
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
