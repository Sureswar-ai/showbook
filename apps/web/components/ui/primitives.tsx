"use client";
import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { cva, type VariantProps } from "class-variance-authority";

// ---- Button ---------------------------------------------------
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
  {
    variants: {
      variant: {
        default: "bg-brand text-white hover:bg-brand-700",
        secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200",
        outline: "border border-gray-300 bg-white hover:bg-gray-50 text-gray-900",
        ghost: "hover:bg-gray-100 text-gray-900",
        destructive: "bg-red-600 text-white hover:bg-red-700",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-sm",
        lg: "h-11 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
);
Button.displayName = "Button";

// ---- Input ---------------------------------------------------
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

// ---- Card ---------------------------------------------------
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md",
        className
      )}
      {...props}
    />
  );
}

// ---- Badge --------------------------------------------------
export function Badge({
  className,
  variant = "default",
  ...props
}: { variant?: "default" | "outline" | "success" | "warning" | "danger" } & React.HTMLAttributes<HTMLSpanElement>) {
  const styles =
    variant === "outline"
      ? "border border-gray-300 text-gray-700"
      : variant === "success"
      ? "bg-green-100 text-green-800"
      : variant === "warning"
      ? "bg-orange-100 text-orange-800"
      : variant === "danger"
      ? "bg-red-100 text-red-800"
      : "bg-gray-100 text-gray-800";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        styles,
        className
      )}
      {...props}
    />
  );
}

// ---- Modal (simple, no a11y bells) --------------------------
export function Modal({
  open,
  onClose,
  children,
  className,
  hideCloseButton,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  hideCloseButton?: boolean;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in"
      onClick={onClose}
    >
      <div
        className={cn(
          "relative w-full max-w-md bg-white rounded-2xl shadow-xl animate-slide-up max-h-[90vh] overflow-auto",
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {!hideCloseButton && (
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 right-3 rounded-full p-1 hover:bg-gray-100"
          >
            ✕
          </button>
        )}
        {children}
      </div>
    </div>
  );
}

// ---- Spinner ------------------------------------------------
export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-brand",
        className
      )}
      role="status"
      aria-label="Loading"
    />
  );
}

// ---- Skeleton ----------------------------------------------
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-gray-200", className)} />;
}
