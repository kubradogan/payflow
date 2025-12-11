import React from "react";
import "../../App.css";

type ToastProps = {
    toast: {
        type: "success" | "error";
        message: string;
    } | null;
};

export function Toast({ toast }: ToastProps) {
    if (!toast) return null;

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