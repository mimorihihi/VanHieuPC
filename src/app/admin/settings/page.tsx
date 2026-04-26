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

  if (loading) return <div className="load-msg">Loading settings…</div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-sub">Configure your store preferences</p>
        </div>
        <AdminBtn type="submit" form="settings-form" loading={saving}>
          <Save size={16} /> Save Settings
        </AdminBtn>
      </div>

      {saved && (
        <div className="success-banner">✓ Settings saved successfully!</div>
      )}

      <form id="settings-form" onSubmit={handleSubmit}>
        {SETTINGS_FIELDS.map(({ section, icon: Icon, fields }) => (
          <div key={section} className="settings-section">
            <div className="settings-section-header">
              <div className="section-icon"><Icon size={18} /></div>
              <h3 className="settings-section-title">{section}</h3>
            </div>
            <div className="settings-fields">
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

      <style>{`
        .page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 28px; gap: 16px; }
        .page-title { font-size: 22px; font-weight: 700; color: #f1f5f9; }
        .page-sub { font-size: 13px; color: #6b7280; margin-top: 2px; }
        .load-msg { color: #6b7280; text-align: center; padding: 40px; }
        .success-banner { background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); color: #34d399; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; }
        .settings-section { background: #111827; border: 1px solid #1f2937; border-radius: 12px; margin-bottom: 16px; overflow: hidden; }
        .settings-section-header { display: flex; align-items: center; gap: 12px; padding: 16px 24px; border-bottom: 1px solid #1f2937; }
        .section-icon { width: 36px; height: 36px; background: rgba(99,102,241,0.15); color: #818cf8; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
        .settings-section-title { font-size: 15px; font-weight: 600; color: #f1f5f9; }
        .settings-fields { padding: 20px 24px; display: flex; flex-direction: column; gap: 16px; }
      `}</style>
    </div>
  )
}
