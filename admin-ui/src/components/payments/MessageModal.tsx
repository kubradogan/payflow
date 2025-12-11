import React from "react";
import "../../App.css";

type MessageModalProps = {
    type: "success" | "error";
    message: string;
    onClose: () => void;
};

export function MessageModal({ type, message, onClose }: MessageModalProps) {
    return (
        <div className="modal-backdrop">
            <div className="modal message-modal">
                <div className="modal-header">
                    <div className="modal-title">
                        {type === "success" ? "Payment Created" : "Payment Failed"}
                    </div>
                    <button className="modal-close" onClick={onClose}>
                        ×
                    </button>
                </div>
                <div className="modal-body">
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
                    <button className="btn-ghost" onClick={onClose}>
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
}