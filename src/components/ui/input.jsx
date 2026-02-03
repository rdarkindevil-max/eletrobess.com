import React from "react";

export const Input = ({ className = "", ...props }) => {
  return (
    <input
      className={`w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400 ${className}`}
      {...props}
    />
  );
};

