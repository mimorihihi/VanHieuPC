"use client"

import React, { forwardRef, ButtonHTMLAttributes } from "react"

type Variant = "primary" | "secondary" | "danger" | "ghost"
type Size = "sm" | "md" | "lg"

interface AdminBtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

export const AdminBtn = forwardRef<HTMLButtonElement, AdminBtnProps>(({
  variant = "primary",
  size = "md",
  loading,
  children,
  disabled,
  className = "",
  ...rest
}, ref) => {
  return (
    <>
      <button
        ref={ref}
        {...rest}
        disabled={disabled || loading}
        className={`admin-btn admin-btn--${variant} admin-btn--${size} ${className}`}
      >
        {loading ? <span className="btn-spinner" /> : children}
      </button>
      <style>{`
        .admin-btn {
          display: inline-flex; align-items: center; justify-content: center;
          gap: 6px; font-weight: 500; border: none; cursor: pointer;
          border-radius: 8px; transition: all 0.15s ease;
          white-space: nowrap;
        }
        .admin-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .admin-btn--sm { padding: 6px 12px; font-size: 13px; }
        .admin-btn--md { padding: 9px 18px; font-size: 14px; }
        .admin-btn--lg { padding: 12px 24px; font-size: 15px; }
        .admin-btn--primary { background: linear-gradient(135deg,#6366f1,#8b5cf6); color: #fff; }
        .admin-btn--primary:hover:not(:disabled) { background: linear-gradient(135deg,#4f46e5,#7c3aed); box-shadow: 0 4px 15px rgba(99,102,241,0.4); }
        .admin-btn--secondary { background: #1f2937; color: #e2e8f0; border: 1px solid #374151; }
        .admin-btn--secondary:hover:not(:disabled) { background: #374151; }
        .admin-btn--danger { background: linear-gradient(135deg,#ef4444,#dc2626); color: #fff; }
        .admin-btn--danger:hover:not(:disabled) { background: linear-gradient(135deg,#dc2626,#b91c1c); box-shadow: 0 4px 15px rgba(239,68,68,0.4); }
        .admin-btn--ghost { background: transparent; color: #9ca3af; }
        .admin-btn--ghost:hover:not(:disabled) { background: #1f2937; color: #e2e8f0; }
        .btn-spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </>
  )
})
AdminBtn.displayName = "AdminBtn"
