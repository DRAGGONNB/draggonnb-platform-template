interface PostingTime {
  id: string
  time: string
  description: string
}

interface BestPostingTimesProps {
  times?: PostingTime[]
}

const defaultTimes: PostingTime[] = [
  { id: '1', time: 'Tuesday 2 PM', description: 'Highest engagement' },
  { id: '2', time: 'Thursday 10 AM', description: 'High reach' },
  { id: '3', time: 'Monday 6 PM', description: 'Good engagement' },
]

export function BestPostingTimes({ times = defaultTimes }: BestPostingTimesProps) {
  return (
    <div className="rounded-2xl border bg-white p-6 transition-all hover:shadow-lg">
      <h3 className="mb-4 flex items-center gap-2 text-base font-semibold">
        <span>🕐</span>
        Best Posting Times
      </h3>
      <div className="space-y-3">
        {times.map((time, index) => (
          <div
            key={time.id}
            className="border-b border-gray-100 pb-3 last:border-0 last:pb-0"
          >
            <div className="mb-1 flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-green-600 text-[10px] font-bold text-white">
                {index + 1}
              </span>
              <div className="font-medium text-gray-900">{time.time}</div>
            </div>
            <div className="ml-7 text-sm text-gray-600">{time.description}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
