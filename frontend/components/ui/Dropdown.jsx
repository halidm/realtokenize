"use client";

import { useState, useEffect, useRef } from "react";

export function Dropdown({ 
  trigger, 
  children, 
  align = "right",
  width = "w-64",
  className = "",
  disabled = false 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Check for screen edge and adjust position if needed
  useEffect(() => {
    if (isOpen && dropdownRef.current && triggerRef.current) {
      const dropdownRect = dropdownRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      
      // If dropdown extends beyond right edge of viewport, adjust it
      if (dropdownRect.right > viewportWidth) {
        dropdownRef.current.style.right = "0";
        dropdownRef.current.style.left = "auto";
      }
    }
  }, [isOpen]);

  // Toggle dropdown
  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  // Calculate alignment classes
  const getAlignmentClasses = () => {
    if (align === "left") {
      return "left-0 origin-top-left";
    } else if (align === "right" || align === "end") {
      return "right-0 origin-top-right";
    } else if (align === "center") {
      return "left-1/2 -translate-x-1/2 origin-top";
    }
    return "right-0 origin-top-right"; // Default to right
  };
  
  return (
    <div className={`relative inline-block ${className}`} ref={triggerRef}>
      {/* Trigger button */}
      <div onClick={toggleDropdown} className={`${disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}>
        {trigger}
      </div>
      
      {/* Dropdown content */}
      {isOpen && (
        <div 
          ref={dropdownRef}
          className={`absolute z-[999] ${width} ${getAlignmentClasses()} mt-1 bg-white border border-gray-300 rounded-md shadow-lg`}
          style={{ maxWidth: "calc(100vw - 16px)" }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

// Dropdown item component for consistent styling
export function DropdownItem({ 
  children, 
  onClick, 
  className = "", 
  active = false,
  disabled = false
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full p-2 text-left hover:bg-gray-100 transition-colors ${
        active ? "bg-gray-100 font-medium" : ""
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
    >
      {children}
    </button>
  );
}

// Dropdown section with optional header
export function DropdownSection({ 
  children, 
  title, 
  divider = true,
  className = "" 
}) {
  return (
    <div className={`${divider ? "border-b border-gray-200 last:border-b-0" : ""} ${className}`}>
      {title && (
        <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
          {title}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
} 