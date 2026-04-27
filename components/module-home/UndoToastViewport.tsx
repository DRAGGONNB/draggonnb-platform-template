'use client'

// NOTE ON RADIX TOAST VIEWPORT ROUTING:
// @radix-ui/react-toast does not support routing individual toasts to a specific viewport.
// All toasts rendered within a ToastProvider share a single viewport.
// Approach chosen: render a SECOND ToastProvider + Viewport exclusively for Easy-view undo toasts,
// mounted in app/(dashboard)/crm/layout.tsx (Plan 11-07). This second provider is independent
// of the root Toaster, so its viewport can be positioned bottom-center without affecting
// global toasts. The undo toast handler in ActionCardItem.tsx must use the useToast() hook
// that is bound to THIS provider (exported below as `useUndoToast`).
// See: https://www.radix-ui.com/primitives/docs/components/toast -- multiple providers are supported.

import * as React from 'react'
import * as ToastPrimitives from '@radix-ui/react-toast'
import { Toast, ToastAction, ToastClose, ToastDescription, ToastTitle } from '@/components/ui/toast'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils/cn'

export function UndoToastViewport() {
  const { toasts } = useToast()

  return (
    <ToastPrimitives.Provider>
      {toasts.map(({ id, title, description, action, ...props }) => (
        <Toast key={id} {...props}>
          <div className="grid gap-1">
            {title && <ToastTitle>{title}</ToastTitle>}
            {description && <ToastDescription>{description}</ToastDescription>}
          </div>
          {action}
          <ToastClose />
        </Toast>
      ))}
      {/* Mobile-safe bottom-center positioning for Easy-view undo toasts.
          z-[100] ensures it sits above the ToggleViewButton (z-40) and dialogs (z-50). */}
      <ToastPrimitives.Viewport
        className={cn(
          'fixed bottom-[80px] left-1/2 -translate-x-1/2 z-[100]',
          'w-auto max-w-[360px]',
          'flex flex-col gap-2 p-4'
        )}
      />
    </ToastPrimitives.Provider>
  )
}
