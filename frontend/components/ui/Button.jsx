"use client";

import { forwardRef } from "react";
import Link from "next/link";

const variants = {
  primary: "bg-blue-600 hover:bg-blue-700 text-white border-transparent",
  secondary: "bg-gray-200 hover:bg-gray-300 text-gray-900 border-transparent",
  outline: "bg-transparent hover:bg-gray-100 text-gray-800 border-gray-300",
  ghost: "bg-transparent hover:bg-gray-100 text-gray-800 border-transparent",
  danger: "bg-red-600 hover:bg-red-700 text-white border-transparent",
  success: "bg-green-600 hover:bg-green-700 text-white border-transparent",
  dark: "bg-gray-800 hover:bg-gray-900 text-white border-transparent",
};

const sizes = {
  sm: "text-xs px-2 py-1 rounded",
  md: "text-sm px-3 py-2 rounded-md",
  lg: "text-base px-4 py-2 rounded-md",
  xl: "text-lg px-6 py-3 rounded-md",
};

const ButtonOrLink = forwardRef(
  ({ href, navigate, children, ...props }, ref) => {
    if (href) {
      return (
        <Link href={href} {...props} ref={ref}>
          {children}
        </Link>
      );
    }

    if (navigate) {
      return (
        <button
          type="button"
          onClick={navigate}
          {...props}
          ref={ref}
        >
          {children}
        </button>
      );
    }

    return (
      <button type="button" {...props} ref={ref}>
        {children}
      </button>
    );
  }
);

ButtonOrLink.displayName = "ButtonOrLink";

export const Button = forwardRef(
  (
    {
      children,
      className = "",
      disabled = false,
      variant = "primary",
      size = "md",
      fullWidth = false,
      href,
      navigate,
      startIcon,
      endIcon,
      ...props
    },
    ref
  ) => {
    const variantClasses = variants[variant] || variants.primary;
    const sizeClasses = sizes[size] || sizes.md;
    const widthClass = fullWidth ? "w-full" : "";
    const disabledClass = disabled
      ? "opacity-60 cursor-not-allowed pointer-events-none"
      : "";
    
    const baseClasses = `inline-flex items-center justify-center font-medium border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50`;
    
    return (
      <ButtonOrLink
        ref={ref}
        className={`${baseClasses} ${variantClasses} ${sizeClasses} ${widthClass} ${disabledClass} ${className}`}
        disabled={disabled}
        href={href}
        navigate={navigate}
        {...props}
      >
        {startIcon && <span className="mr-2">{startIcon}</span>}
        {children}
        {endIcon && <span className="ml-2">{endIcon}</span>}
      </ButtonOrLink>
    );
  }
);

Button.displayName = "Button"; 