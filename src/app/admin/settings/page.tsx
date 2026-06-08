"use client"

import { useEffect, useState, FormEvent, useCallback } from "react"
import { Save, Globe, Phone, Store, Truck } from "lucide-react"
import { AdminBtn } from "@/components/ui/button"
import { FormInput } from "@/components/ui/form-fields"

const SETTINGS_FIELDS = [
  {
    section: "Store Info",
    icon: Store,
    fields: [
      { key: "store_name", label: "Store Name", placeholder: "My Ecommerce Store" },
      { key: "store_logo", label: "Logo URL", placeholder: "https://..." },
      { key: "address", label: "Store Address", placeholder: "123 Main Street..." },
    ],
  },
  {
    section: "Contact",
    icon: Phone,
    fields: [
      { key: "hotline", label: "Hotline", placeholder: "0123 456 789" },
      { key: "email", label: "Support Email", placeholder: "support@store.com" },
    ],
  },
  {
    section: "Shipping",
    icon: Truck,
    fields: [
      { key: "free_ship_threshold", label: "Free Shipping Threshold (₫)", placeholder: "500000" },
    ],
  },
  {
    section: "Social",
    icon: Globe,
    fields: [
      { key: "facebook_url", label: "Facebook URL", placeholder: "https://facebook.com/..." },
      { key: "instagram_url", label: "Instagram URL", placeholder: "https://instagram.com/..." },
    ],
  },
]

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const fetchSettings = useCallback(() => {
    fetch("/api/admin/settings")
      .then(r => r.json())
      .then(setSettings)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) return <div className="py-10 text-center text-zinc-500">Loading settings…</div>

  return (
    <div>
      <div className="mb-7 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-zinc-900">Settings</h1>
          <p className="mt-0.5 text-[13px] text-zinc-500">Configure your store preferences</p>
        </div>
        <AdminBtn type="submit" form="settings-form" loading={saving}>
          <Save className="h-4 w-4" /> Save Settings
        </AdminBtn>
      </div>

      {saved && (
        <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">✓ Settings saved successfully!</div>
      )}

      <form id="settings-form" onSubmit={handleSubmit}>
        {SETTINGS_FIELDS.map(({ section, icon: Icon, fields }) => (
          <div key={section} className="mb-4 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-zinc-200 px-6 py-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600"><Icon className="h-5 w-5" /></div>
              <h3 className="text-[15px] font-semibold text-zinc-900">{section}</h3>
            </div>
            <div className="flex flex-col gap-4 px-6 py-5">
              {fields.map(({ key, label, placeholder }) => (
                <FormInput
                  key={key}
                  label={label}
                  placeholder={placeholder}
                  value={settings[key] ?? ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSettings(s => ({ ...s, [key]: e.target.value }))}
                />
              ))}
            </div>
          </div>
        ))}
      </form>
    </div>
  )
}
