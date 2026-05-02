// app/(dashboard)/onboarding/wizard/manifest-form.tsx
// MANIFEST-03: Client renderer for manifest-derived onboarding form sections.
// Phase 13 ships the renderer; full wizard wiring (navigation, save) is Phase 14+ work.

'use client'

import { useState } from 'react'
import type { FormDescriptor } from '@/lib/onboarding/manifest-form-builder'
import type { TenantInputSpec } from '@/lib/modules/types'

interface ManifestFormProps {
  descriptor: FormDescriptor
  initialValues: Record<string, unknown>
  onSubmit: (values: Record<string, unknown>) => void | Promise<void>
}

export function ManifestForm({ descriptor, initialValues, onSubmit }: ManifestFormProps) {
  const [values, setValues] = useState<Record<string, unknown>>(initialValues)
  const [submitting, setSubmitting] = useState(false)

  if (descriptor.sections.length === 0) {
    return (
      <div className="rounded-lg border border-charcoal-200 bg-white p-6 text-charcoal-500">
        No tenant configuration required for active modules.
      </div>
    )
  }

  const handleChange = (key: string, val: unknown) => {
    setValues(prev => ({ ...prev, [key]: val }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await onSubmit(values)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {descriptor.sections.map(section => (
        <section key={section.module_id} className="rounded-lg border border-charcoal-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-charcoal-900">{section.module_name}</h3>
          <div className="mt-4 space-y-4">
            {section.inputs.map(input => (
              <FieldRenderer
                key={input.key}
                spec={input}
                value={values[input.key]}
                onChange={(v) => handleChange(input.key, v)}
              />
            ))}
          </div>
        </section>
      ))}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-crimson-600 px-4 py-2 text-white hover:bg-crimson-700 disabled:opacity-50"
      >
        {submitting ? 'Saving...' : 'Save configuration'}
      </button>
    </form>
  )
}

function FieldRenderer({ spec, value, onChange }: { spec: TenantInputSpec; value: unknown; onChange: (v: unknown) => void }) {
  const baseLabel = (
    <label className="block text-sm font-medium text-charcoal-700">
      {spec.label}{spec.required && <span className="ml-1 text-crimson-600">*</span>}
    </label>
  )
  const inputClass = 'mt-1 w-full rounded-md border border-charcoal-200 px-3 py-2 text-sm focus:border-crimson-500 focus:outline-none'

  switch (spec.type) {
    case 'text':
      return (
        <div>
          {baseLabel}
          <input type="text" placeholder={spec.placeholder} value={String(value ?? '')} onChange={e => onChange(e.target.value)} className={inputClass} required={spec.required} />
        </div>
      )
    case 'number':
      return (
        <div>
          {baseLabel}
          <input type="number" placeholder={spec.placeholder} value={typeof value === 'number' ? value : ''} onChange={e => onChange(e.target.value === '' ? undefined : Number(e.target.value))} className={inputClass} required={spec.required} />
        </div>
      )
    case 'boolean':
      return (
        <div className="flex items-center gap-2">
          <input type="checkbox" checked={Boolean(value)} onChange={e => onChange(e.target.checked)} />
          {baseLabel}
        </div>
      )
    case 'select':
      return (
        <div>
          {baseLabel}
          <select value={String(value ?? '')} onChange={e => onChange(e.target.value)} className={inputClass} required={spec.required}>
            <option value="">Select...</option>
            {(spec.options ?? []).map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      )
    case 'json':
      return (
        <div>
          {baseLabel}
          <textarea
            placeholder={spec.placeholder}
            value={typeof value === 'string' ? value : JSON.stringify(value ?? '', null, 2)}
            onChange={e => onChange(e.target.value)}
            rows={6}
            className={inputClass + ' font-mono'}
            required={spec.required}
          />
          <p className="mt-1 text-xs text-charcoal-500">JSON format</p>
        </div>
      )
    case 'file_upload':
      return (
        <div>
          {baseLabel}
          <input type="file" onChange={e => onChange(e.target.files?.[0])} className={inputClass} required={spec.required} />
        </div>
      )
    default:
      return null
  }
}
