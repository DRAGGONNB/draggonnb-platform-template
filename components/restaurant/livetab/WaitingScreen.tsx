'use client'

interface Props {
  restaurantName: string
  tableLabel: string
}

export function WaitingScreen({ restaurantName, tableLabel }: Props) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center bg-[#2D2F33]">
      <div className="max-w-sm w-full space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{restaurantName}</h1>
          <p className="text-gray-400 text-sm mt-1">{tableLabel}</p>
        </div>

        <div className="bg-[#1E2023] rounded-2xl p-8 space-y-5">
          <div className="flex items-center justify-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full bg-[#6B1420] animate-[pulse_1.2s_ease-in-out_0s_infinite]"
            />
            <span
              className="w-2.5 h-2.5 rounded-full bg-[#6B1420] animate-[pulse_1.2s_ease-in-out_0.4s_infinite]"
            />
            <span
              className="w-2.5 h-2.5 rounded-full bg-[#6B1420] animate-[pulse_1.2s_ease-in-out_0.8s_infinite]"
            />
          </div>

          <div>
            <p className="text-white font-medium">Your table is being set up.</p>
            <p className="text-gray-400 text-sm mt-1">
              This page will update automatically.
            </p>
          </div>
        </div>

        <p className="text-xs text-gray-600">
          Your data is processed in accordance with POPIA.{' '}
          <a href="/privacy" className="underline hover:text-gray-400">
            Privacy policy
          </a>
          .
        </p>
      </div>
    </div>
  )
}
