import React from "react";

export const Button = ({
  variant = "default",
  className = "",
  ...props
}) => {
  const base = "px-3 py-2 rounded text-sm font-medium transition border";

  const variants = {
    default: "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700",
    outline: "bg-white text-gray-900 border-gray-300 hover:bg-gray-50",
    destructive: "bg-red-600 text-white border-red-600 hover:bg-red-700",
    ghost: "bg-transparent text-gray-900 border-transparent hover:bg-gray-100",
  };

  return (
    <button className={`${base} ${variants[variant] || variants.default} ${className}`} {...props} />
  );
};
