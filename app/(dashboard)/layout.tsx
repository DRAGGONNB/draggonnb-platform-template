import { Sidebar } from '@/components/dashboard/Sidebar'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar />

      {/* Header */}
      <DashboardHeader />

      {/* Main Content */}
      <main className="ml-64 mt-18 px-8 py-12">
        {children}
      </main>
    </div>
  )
}
