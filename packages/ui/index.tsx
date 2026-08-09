import React from "react";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Class merger helper
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- BUTTON ---
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline" | "glass";
  size?: "sm" | "md" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }: ButtonProps, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-medium rounded-xl transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 disabled:opacity-50 disabled:pointer-events-none",
          // Variants
          {
            "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md shadow-violet-500/10 hover:shadow-lg hover:shadow-violet-500/20":
              variant === "primary",
            "bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700/50": variant === "secondary",
            "bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-500/10": variant === "danger",
            "bg-transparent hover:bg-zinc-800 text-zinc-300 hover:text-white": variant === "ghost",
            "border border-zinc-700 hover:bg-zinc-800 text-zinc-300": variant === "outline",
            "bg-white/10 backdrop-blur-md hover:bg-white/20 text-white border border-white/20": variant === "glass",
          },
          // Sizes
          {
            "px-3 py-1.5 text-xs": size === "sm",
            "px-5 py-2.5 text-sm": size === "md",
            "px-7 py-3 text-base": size === "lg",
            "p-2": size === "icon",
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

// --- INPUT ---
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", label, error, ...props }: InputProps, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && <label className="text-xs font-semibold text-zinc-400 tracking-wider uppercase">{label}</label>}
        <input
          type={type}
          ref={ref}
          className={cn(
            "w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 transition-all focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-sm",
            error && "border-red-500 focus:ring-red-500 focus:border-red-500",
            className
          )}
          {...props}
        />
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>
    );
  }
);
Input.displayName = "Input";

// --- CARD ---
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Card: React.FC<CardProps> = ({ className, children, ...props }: CardProps) => {
  return (
    <div
      className={cn(
        "bg-zinc-900 border border-zinc-800/80 rounded-2xl p-6 shadow-xl shadow-black/5 hover:border-zinc-700/50 transition-all duration-300",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

// --- BADGE ---
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "success" | "warning" | "error" | "info" | "neutral" | "preparing" | "ready";
}

export const Badge: React.FC<BadgeProps> = ({ className, variant = "neutral", children, ...props }: BadgeProps) => {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider",
        {
          "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20": variant === "success",
          "bg-amber-500/10 text-amber-400 border border-amber-500/20": variant === "warning",
          "bg-rose-500/10 text-rose-400 border border-rose-500/20": variant === "error",
          "bg-violet-500/10 text-violet-400 border border-violet-500/20": variant === "info",
          "bg-zinc-800 text-zinc-400 border border-zinc-700": variant === "neutral",
          "bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse": variant === "preparing",
          "bg-pink-500/10 text-pink-400 border border-pink-500/20 shadow-sm shadow-pink-500/20": variant === "ready",
        },
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

// --- MODAL ---
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }: ModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Content */}
      <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800/80 rounded-2xl shadow-2xl p-6 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800/50">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="pt-4 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
};
