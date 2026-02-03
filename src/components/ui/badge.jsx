import React from "react";

export function Badge({ children, variant = "default" }) {
  const styles = {
    default: {
      background: "#e5e7eb",
      color: "#111827",
    },
    success: {
      background: "#dcfce7",
      color: "#166534",
    },
    warning: {
      background: "#fef9c3",
      color: "#854d0e",
    },
    danger: {
      background: "#fee2e2",
      color: "#991b1b",
    },
  };

  return (
    <span
      style={{
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        ...styles[variant],
      }}
    >
      {children}
    </span>
  );
}
