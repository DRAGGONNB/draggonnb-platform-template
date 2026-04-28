'use client'
import { ToggleViewButton } from '@/components/module-home/ToggleViewButton'

export function AdvancedKanbanShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ToggleViewButton
        currentMode="advanced"
        easyHref="/dashboard/crm"
        advancedHref="/dashboard/crm/advanced"
        apiEndpoint="/api/crm/ui-mode"
      />
    </>
  )
}
