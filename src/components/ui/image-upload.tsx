"use client"

import { useState, useRef, useCallback, useEffect, useMemo } from "react"
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react"

interface ImageUploadProps {
  label?: string
  required?: boolean
  value: string
  onChange: (url: string) => void
  uploadFolder?: string
  /** Optional placeholder text */
  placeholder?: string
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message
  return "Upload failed"
}

export function ImageUpload({
  label = "Image",
  required = false,
  value,
  onChange,
  uploadFolder = "datn-ecomm/images",
  placeholder = "Drag & drop or click to upload",
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const upload = useCallback(
    async (file: File) => {
      setError(null)
      setUploading(true)
      try {
        const fd = new FormData()
        fd.append("file", file)
        fd.append("folder", uploadFolder)

        const res = await fetch("/api/admin/upload", { method: "POST", body: fd })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Upload failed")

        onChange(data.url)
        setPendingFile(null)
      } catch (err: unknown) {
        setError(getErrorMessage(err))
      } finally {
        setUploading(false)
      }
    },
    [onChange, uploadFolder],
  )

  const queueFile = (file: File) => {
    setError(null)
    setPendingFile(file)
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) queueFile(file)
    if (fileRef.current) fileRef.current.value = ""
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) queueFile(file)
  }

  const clear = () => {
    onChange("")
    setError(null)
    setPendingFile(null)
  }

  const pendingPreviewUrl = useMemo(() => {
    if (!pendingFile) return null
    return URL.createObjectURL(pendingFile)
  }, [pendingFile])

  useEffect(() => {
    return () => {
      if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl)
    }
  }, [pendingPreviewUrl])

  return (
    <>
      <div className="img-upload-group">
        {label && (
          <label className="form-label">
            {label}
            {required && <span className="req">*</span>}
          </label>
        )}

        {value || pendingPreviewUrl ? (
          <div className="img-upload-preview">
            <img src={pendingPreviewUrl ?? value} alt="Preview" className="img-upload-img" />
            <div className="img-upload-overlay">
              <button
                type="button"
                className="img-upload-remove"
                onClick={clear}
                title="Remove image"
              >
                <X size={16} />
              </button>
              <button
                type="button"
                className="img-upload-change"
                onClick={() => fileRef.current?.click()}
              >
                Change
              </button>
            </div>
            <div className="img-upload-url">
              {pendingFile ? `Preview: ${pendingFile.name}` : value}
            </div>
          </div>
        ) : (
          <div
            className={`img-upload-dropzone ${dragOver ? "drag-over" : ""} ${uploading ? "uploading" : ""}`}
            onClick={() => !uploading && fileRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            {uploading ? (
              <div className="img-upload-loading">
                <Loader2 size={28} className="spin" />
                <span>Uploading...</span>
              </div>
            ) : (
              <div className="img-upload-empty">
                <div className="img-upload-icon-wrap">
                  <Upload size={24} />
                </div>
                <span className="img-upload-text">{placeholder}</span>
                <span className="img-upload-hint">JPG, PNG, GIF, WebP, SVG - max 5MB</span>
              </div>
            )}
          </div>
        )}

        {pendingFile ? (
          <div className="img-upload-pending">
            <div className="img-upload-pending-name">{pendingFile.name}</div>
            <div className="img-upload-pending-actions">
              <button
                type="button"
                className="img-upload-pending-confirm"
                onClick={() => upload(pendingFile)}
                disabled={uploading}
              >
                Confirm upload
              </button>
              <button
                type="button"
                className="img-upload-pending-cancel"
                onClick={() => setPendingFile(null)}
                disabled={uploading}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {error && <div className="img-upload-error">{error}</div>}

        <div className="img-upload-url-input-wrap">
          <ImageIcon size={14} className="img-upload-url-icon" />
          <input
            className="img-upload-url-input"
            placeholder="Or paste image URL..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleFile}
        />
      </div>

      <style>{`
        .img-upload-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .img-upload-dropzone {
          border: 2px dashed #374151;
          border-radius: 12px;
          padding: 32px 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: border-color 0.2s, background 0.2s;
          background: #0f1117;
          min-height: 140px;
        }
        .img-upload-dropzone:hover,
        .img-upload-dropzone.drag-over {
          border-color: #6366f1;
          background: rgba(99, 102, 241, 0.06);
        }
        .img-upload-dropzone.uploading {
          pointer-events: none;
          opacity: 0.7;
        }

        .img-upload-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        .img-upload-icon-wrap {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2));
          display: flex;
          align-items: center;
          justify-content: center;
          color: #818cf8;
          margin-bottom: 4px;
        }
        .img-upload-text {
          font-size: 14px;
          color: #e2e8f0;
          font-weight: 500;
        }
        .img-upload-hint {
          font-size: 12px;
          color: #6b7280;
        }

        .img-upload-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          color: #818cf8;
          font-size: 14px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }

        .img-upload-preview {
          position: relative;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid #1f2937;
          background: #0f1117;
        }
        .img-upload-img {
          width: 100%;
          height: 160px;
          object-fit: cover;
          display: block;
        }
        .img-upload-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .img-upload-preview:hover .img-upload-overlay {
          opacity: 1;
        }
        .img-upload-remove {
          background: rgba(239, 68, 68, 0.8);
          border: none;
          color: #fff;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.15s;
        }
        .img-upload-remove:hover {
          background: #ef4444;
        }
        .img-upload-change {
          background: rgba(99, 102, 241, 0.8);
          border: none;
          color: #fff;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s;
        }
        .img-upload-change:hover {
          background: #6366f1;
        }
        .img-upload-url {
          padding: 8px 12px;
          font-size: 11px;
          color: #6b7280;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          background: #0a0d14;
          border-top: 1px solid #1f2937;
        }

        .img-upload-pending {
          border: 1px solid #374151;
          border-radius: 10px;
          padding: 10px 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          background: #0f1117;
        }
        .img-upload-pending-name {
          font-size: 12px;
          color: #cbd5e1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .img-upload-pending-actions {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }
        .img-upload-pending-confirm,
        .img-upload-pending-cancel {
          border: 1px solid #374151;
          border-radius: 8px;
          padding: 6px 10px;
          font-size: 12px;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s, color 0.15s;
        }
        .img-upload-pending-confirm {
          background: #2563eb;
          border-color: #2563eb;
          color: #fff;
        }
        .img-upload-pending-confirm:hover:not(:disabled) {
          background: #1d4ed8;
        }
        .img-upload-pending-cancel {
          background: transparent;
          color: #cbd5e1;
        }
        .img-upload-pending-cancel:hover:not(:disabled) {
          background: #1f2937;
        }
        .img-upload-pending-confirm:disabled,
        .img-upload-pending-cancel:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .img-upload-url-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .img-upload-url-icon {
          position: absolute;
          left: 10px;
          color: #4b5563;
          pointer-events: none;
        }
        .img-upload-url-input {
          width: 100%;
          background: #0f1117;
          border: 1px solid #374151;
          color: #e2e8f0;
          border-radius: 8px;
          padding: 8px 10px 8px 30px;
          font-size: 13px;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .img-upload-url-input:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
        }
        .img-upload-url-input::placeholder {
          color: #4b5563;
        }

        .img-upload-error {
          font-size: 13px;
          color: #f87171;
          background: rgba(239, 68, 68, 0.1);
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }
      `}</style>
    </>
  )
}
