"use client"

import { useState, useRef, useCallback } from "react"
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
      } catch (err: unknown) {
        setError(getErrorMessage(err))
      } finally {
        setUploading(false)
      }
    },
    [onChange, uploadFolder],
  )

  const handleFileSelection = (file: File | null | undefined) => {
    if (!file || uploading) return
    void upload(file)
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelection(e.target.files?.[0])
    if (fileRef.current) fileRef.current.value = ""
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFileSelection(e.dataTransfer.files?.[0])
  }

  const clear = () => {
    onChange("")
    setError(null)
  }


  return (
    <>
      <div className="img-upload-group">
        {label && (
          <label className="form-label">
            {label}
            {required && <span className="req">*</span>}
          </label>
        )}

        {value.trim() ? (
          <div className="img-upload-preview">
            <img src={value.trim()} alt="Preview" className="img-upload-img" />
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
                onClick={() => !uploading && fileRef.current?.click()}
                disabled={uploading}
              >
                Change
              </button>
            </div>
            <div className="img-upload-url">{value}</div>
          </div>
        ) : (
          <div
            className={`img-upload-dropzone ${dragOver ? "drag-over" : ""} ${uploading ? "uploading" : ""}`}
            onClick={() => !uploading && fileRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              if (!uploading) setDragOver(true)
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
          border: 2px dashed #d4d4d8;
          border-radius: 12px;
          padding: 32px 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
          background: #fafafa;
          min-height: 140px;
        }
        .img-upload-dropzone:hover,
        .img-upload-dropzone.drag-over {
          border-color: #60a5fa;
          background: #eff6ff;
          box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.14);
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
          background: #dbeafe;
          border: 1px solid #bfdbfe;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #2563eb;
          margin-bottom: 4px;
        }
        .img-upload-text {
          font-size: 14px;
          color: #18181b;
          font-weight: 600;
        }
        .img-upload-hint {
          font-size: 12px;
          color: #71717a;
        }

        .img-upload-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          color: #2563eb;
          font-size: 14px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }

        .img-upload-preview {
          position: relative;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid #e4e4e7;
          background: #fafafa;
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
          background: rgba(24, 24, 27, 0.42);
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
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #b91c1c;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
        }
        .img-upload-remove:hover {
          background: #fee2e2;
          border-color: #fca5a5;
        }
        .img-upload-change {
          background: #2563eb;
          border: 1px solid #2563eb;
          color: #fff;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s;
        }
        .img-upload-change:hover {
          background: #1d4ed8;
        }
        .img-upload-url {
          padding: 8px 12px;
          font-size: 11px;
          color: #71717a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          background: #f4f4f5;
          border-top: 1px solid #e4e4e7;
        }


        .img-upload-url-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .img-upload-url-icon {
          position: absolute;
          left: 10px;
          color: #71717a;
          pointer-events: none;
        }
        .img-upload-url-input {
          width: 100%;
          background: #fff;
          border: 1px solid #d4d4d8;
          color: #18181b;
          border-radius: 8px;
          padding: 8px 10px 8px 30px;
          font-size: 13px;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .img-upload-url-input:focus {
          outline: none;
          border-color: #60a5fa;
          box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.18);
        }
        .img-upload-url-input::placeholder {
          color: #a1a1aa;
        }

        .img-upload-error {
          font-size: 13px;
          color: #b91c1c;
          background: #fef2f2;
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid #fecaca;
        }
      `}</style>
    </>
  )
}
