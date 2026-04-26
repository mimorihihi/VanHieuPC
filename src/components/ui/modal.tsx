"use client"

import { ReactNode, useEffect, useRef } from "react"
import { X } from "lucide-react"

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  size?: "sm" | "md" | "lg"
}

export function Modal({ open, onClose, title, children, size = "md" }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    if (open) document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [open, onClose])

  if (!open) return null

  const widths = { sm: "480px", md: "600px", lg: "800px" }

  return (
    <div
      ref={overlayRef}
      className="modal-overlay"
      onClick={(e) => e.target === overlayRef.current && onClose()}
    >
      <div className="modal-box" style={{ maxWidth: widths[size] }}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed; inset: 0; z-index: 100;
          background: rgba(0,0,0,0.7);
          display: flex; align-items: center; justify-content: center;
          padding: 16px;
          animation: fadeIn 0.15s ease;
        }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        .modal-box {
          background: #1a2233;
          border: 1px solid #2d3748;
          border-radius: 16px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          animation: slideUp 0.2s ease;
          box-shadow: 0 25px 50px rgba(0,0,0,0.5);
        }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        .modal-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 24px 16px;
          border-bottom: 1px solid #2d3748;
        }
        .modal-title { font-size: 18px; font-weight: 600; color: #f1f5f9; }
        .modal-close {
          background: none; border: none; color: #9ca3af; cursor: pointer;
          padding: 6px; border-radius: 8px; display: flex;
          transition: background 0.15s, color 0.15s;
        }
        .modal-close:hover { background: #374151; color: #f1f5f9; }
        .modal-body { padding: 24px; }
      `}</style>
    </div>
  )
}
