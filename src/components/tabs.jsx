import React, { createContext, useContext } from "react";

const TabsCtx = createContext(null);

export const Tabs = ({ value, onValueChange, children }) => {
  return (
    <TabsCtx.Provider value={{ value, onValueChange }}>
      <div>{children}</div>
    </TabsCtx.Provider>
  );
};

export const TabsList = ({ className = "", children }) => (
  <div className={`flex gap-2 ${className}`}>{children}</div>
);

export const TabsTrigger = ({ value, className = "", children }) => {
  const ctx = useContext(TabsCtx);
  const active = ctx?.value === value;

  return (
    <button
      type="button"
      onClick={() => ctx?.onValueChange?.(value)}
      className={`px-3 py-2 rounded border text-sm ${
        active ? "bg-emerald-600 text-white border-emerald-600" : "bg-white border-gray-300"
      } ${className}`}
    >
      {children}
    </button>
  );
};

export const TabsContent = ({ value, className = "", children }) => {
  const ctx = useContext(TabsCtx);
  if (ctx?.value !== value) return null;
  return <div className={className}>{children}</div>;
};

