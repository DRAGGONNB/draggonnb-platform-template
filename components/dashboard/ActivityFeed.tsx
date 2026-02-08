import { Users } from 'lucide-react'

interface Activity {
  id: string
  user: string
  initials: string
  action: string
  timestamp: string
}

interface ActivityFeedProps {
  activities?: Activity[]
}

export function ActivityFeed({ activities = [] }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Users className="h-8 w-8 text-gray-300 mb-2" />
        <p className="text-sm font-medium text-gray-500">No activity yet</p>
        <p className="text-xs text-gray-400">Team actions will appear here</p>
      </div>
    )
  }
  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <div key={activity.id} className="text-sm">
          <div className="flex items-start gap-2">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-purple-700 text-[11px] font-semibold text-white">
              {activity.initials}
            </div>
            <div className="flex-1">
              <p className="text-gray-600">
                <span className="font-medium text-gray-900">{activity.user}</span>{' '}
                {activity.action}
              </p>
              <p className="mt-1 text-xs text-gray-400">{activity.timestamp}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
