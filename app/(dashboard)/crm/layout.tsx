import { UndoToastViewport } from '@/components/module-home/UndoToastViewport'

export default function CRMLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <UndoToastViewport />
    </>
  )
}
