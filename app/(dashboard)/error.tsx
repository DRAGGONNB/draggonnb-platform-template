'use client'

/**
 * Layout-level error boundary for the (dashboard) route group.
 *
 * Without this file, errors thrown in `app/(dashboard)/layout.tsx` (or any
 * server component above the page) escape past the dashboard/error.tsx
 * page-level boundary and surface as Next.js's default opaque
 * "Application error: a server-side exception has occurred" white screen.
 *
 * This boundary catches layout-level crashes and renders a friendlier UI
 * with sign-out + retry options so the user is never stranded.
 */
export default function DashboardLayoutError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 py-20 text-center">
          <div className="max-w-md rounded-lg border border-red-200 bg-red-50 p-6">
            <h2 className="text-lg font-semibold text-red-800">Dashboard could not load</h2>
            <p className="mt-2 text-sm text-red-700">
              The app hit a server-side error while rendering this view. This is usually
              transient — try again, or sign out and back in if it persists.
            </p>
            {error.digest && (
              <p className="mt-2 font-mono text-xs text-red-500">
                Error ID: {error.digest}
              </p>
            )}
            <div className="mt-4 flex gap-3 justify-center">
              <button
                onClick={reset}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700"
              >
                Try Again
              </button>
              <a
                href="/api/auth/signout"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                Sign Out
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
