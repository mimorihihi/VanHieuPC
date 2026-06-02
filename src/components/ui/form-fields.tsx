"use client"

import { type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react"

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  required?: boolean
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  required?: boolean
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  required?: boolean
  options: { value: string; label: string }[]
}

interface ToggleProps {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}

const fieldLabelClass = "text-sm font-medium text-zinc-800"
const fieldClass =
  "h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-400"

export function FormInput({ label, required, ...props }: InputProps) {
  return (
    <div className="space-y-1.5">
      <label className={fieldLabelClass}>
        {label}
        {required ? <span className="ml-1 text-red-500">*</span> : null}
      </label>
      <input className={fieldClass} required={required} {...props} />
    </div>
  )
}

export function FormTextarea({ label, required, ...props }: TextareaProps) {
  return (
    <div className="space-y-1.5">
      <label className={fieldLabelClass}>
        {label}
        {required ? <span className="ml-1 text-red-500">*</span> : null}
      </label>
      <textarea
        className="min-h-[100px] w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-400"
        required={required}
        {...props}
      />
    </div>
  )
}

export function FormSelect({ label, required, options, ...props }: SelectProps) {
  return (
    <div className="space-y-1.5">
      <label className={fieldLabelClass}>
        {label}
        {required ? <span className="ml-1 text-red-500">*</span> : null}
      </label>
      <select className={fieldClass} required={required} {...props}>
        <option value="">Select {label}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export function FormToggle({ label, checked, onChange }: ToggleProps) {
  return (
    <div className="space-y-2">
      <span className={fieldLabelClass}>{label}</span>
      <div className="flex items-center gap-3">
        <button
          id={`toggle-${label.toLowerCase().replace(/\s+/g, "-")}`}
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          className={checked ? "relative inline-flex h-7 w-12 items-center rounded-full bg-zinc-900 transition-colors" : "relative inline-flex h-7 w-12 items-center rounded-full bg-zinc-300 transition-colors"}
        >
          <span className={checked ? "inline-block h-5 w-5 translate-x-6 rounded-full bg-white transition-transform" : "inline-block h-5 w-5 translate-x-1 rounded-full bg-white transition-transform"} />
        </button>
        <span className="text-sm text-zinc-600">{checked ? "Active" : "Inactive"}</span>
      </div>
    </div>
  )
}

export const formStyles = ""
