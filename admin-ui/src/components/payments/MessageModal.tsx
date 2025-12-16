import React from "react";
import "../../App.css";

type MessageModalProps = {
    // Defines whether the modal represents a success or failure outcome
    type: "success" | "error";

    // Text content shown to the user usually returned from the backend
    message: string;

    // Callback used to close the modal from parent state
    onClose: () => void;
};

export function MessageModal({type, message, onClose}: MessageModalProps) {
    return (
        // Semitransparent backdrop that blocks interaction with the page
        <div className="modal-backdrop">
            <div className="modal message-modal">
                <div className="modal-header">
                    <div className="modal-title">
                        {/* Title changes based on payment outcome */}
                        {type === "success" ? "Payment Created" : "Payment Failed"}
                    </div>

                    {/* Allows the user to dismiss the modal */}
                    <button className="modal-close" onClick={onClose}>
                        ×
                    </button>
                </div>

                <div className="modal-body">
                    {/*
                       Uses <pre> to preserve line breaks for backend messages while keeping UI typography consistent
                    */}
                    <pre
                        style={{
                            fontSize: 16,
                            lineHeight: 1.5,
                            whiteSpace: "pre-wrap",
                            margin: 0,
                            fontFamily: "inherit",
                        }}
                    >
                        {message}
                    </pre>
                </div>

                <div className="modal-footer">
                    {/* Simple confirmation button to close the modal */}
                    <button className="btn-ghost" onClick={onClose}>
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
}