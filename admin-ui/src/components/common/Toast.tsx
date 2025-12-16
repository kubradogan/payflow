import React from "react";
import "../../App.css";

// Props for optional toast notification
type ToastProps = {
    toast: {
        type: "success" | "error";
        message: string;
    } | null;
};

export function Toast({toast}: ToastProps) {

    // Do not render anything when there is no toast message
    if (!toast) return null;

    // Applies visual styling only for error messages
    const extraStyle =
        toast.type === "error"
            ? {
                borderColor: "rgba(239,68,68,0.8)",
                color: "#fecaca",
            }
            : undefined;

    return (
        <div className="toast" style={extraStyle}>
            {toast.message}
        </div>
    );
}