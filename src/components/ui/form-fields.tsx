"use client"

import { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from "react"

const baseInput = `
  .form-group { display: flex; flex-direction: column; gap: 6px; }
  .form-label { font-size: 13px; font-weight: 500; color: #9ca3af; }
  .form-label .req { color: #f87171; margin-left: 2px; }
  .form-input, .form-select, .form-textarea {
    background: #0f1117; border: 1px solid #374151; color: #e2e8f0;
    border-radius: 8px; font-size: 14px; transition: border-color 0.15s, box-shadow 0.15s;
    width: 100%;
  }
  .form-input:focus, .form-select:focus, .form-textarea:focus {
    outline: none; border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.15);
  }
  .form-input, .form-select { padding: 10px 12px; }
  .form-textarea { padding: 10px 12px; resize: vertical; min-height: 90px; font-family: inherit; }
  .form-select { cursor: pointer; }
  .form-grid { display: grid; gap: 16px; }
  .form-grid-2 { grid-template-columns: 1fr 1fr; }
  .form-grid-3 { grid-template-columns: 1fr 1fr 1fr; }
  @media (max-width: 640px) {
    .form-grid-2, .form-grid-3 { grid-template-columns: 1fr; }
  }
  .form-actions { display: flex; gap: 12px; justify-content: flex-end; padding-top: 8px; }
  .form-toggle-wrap { display: flex; align-items: center; gap: 10px; }
  .form-toggle {
    position: relative; width: 42px; height: 22px; cursor: pointer;
  }
  .form-toggle input { opacity: 0; width: 0; height: 0; }
  .form-toggle-slider {
    position: absolute; inset: 0; background: #374151; border-radius: 11px;
    transition: background 0.2s;
  }
  .form-toggle-slider::before {
    content: ''; position: absolute; width: 16px; height: 16px;
    left: 3px; top: 3px; background: #fff; border-radius: 50%;
    transition: transform 0.2s;
  }
  .form-toggle input:checked + .form-toggle-slider { background: #6366f1; }
  .form-toggle input:checked + .form-toggle-slider::before { transform: translateX(20px); }
`

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  required?: boolean
}

export function FormInput({ label, required, ...props }: InputProps) {
  return (
    <>
      <div className="form-group">
        <label className="form-label">
          {label}{required && <span className="req">*</span>}
        </label>
        <input className="form-input" required={required} {...props} />
      </div>
      <style>{baseInput}</style>
    </>
  )
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  required?: boolean
}

export function FormTextarea({ label, required, ...props }: TextareaProps) {
  return (
    <>
      <div className="form-group">
        <label className="form-label">
          {label}{required && <span className="req">*</span>}
        </label>
        <textarea className="form-textarea" required={required} {...props} />
      </div>
      <style>{baseInput}</style>
    </>
  )
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  required?: boolean
  options: { value: string; label: string }[]
}

export function FormSelect({ label, required, options, ...props }: SelectProps) {
  return (
    <>
      <div className="form-group">
        <label className="form-label">
          {label}{required && <span className="req">*</span>}
        </label>
        <select className="form-select" required={required} {...props}>
          <option value="">Select {label}</option>
          {options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      <style>{baseInput}</style>
    </>
  )
}

interface ToggleProps {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}

export function FormToggle({ label, checked, onChange }: ToggleProps) {
  return (
    <>
      <div className="form-group">
        <span className="form-label">{label}</span>
        <div className="form-toggle-wrap">
          <label className="form-toggle">
            <input
              type="checkbox"
              checked={checked}
              onChange={e => onChange(e.target.checked)}
            />
            <span className="form-toggle-slider" />
          </label>
          <span style={{ fontSize: 13, color: checked ? "#a5b4fc" : "#6b7280" }}>
            {checked ? "Active" : "Inactive"}
          </span>
        </div>
      </div>
      <style>{baseInput}</style>
    </>
  )
}

export { baseInput as formStyles }
