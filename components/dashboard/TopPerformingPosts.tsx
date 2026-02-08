import { TrendingUp } from 'lucide-react'

interface Post {
  id: string
  title: string
  engagements: number
}

interface TopPerformingPostsProps {
  posts?: Post[]
}

export function TopPerformingPosts({ posts }: TopPerformingPostsProps) {
  if (!posts || posts.length === 0) {
    return (
      <div className="rounded-2xl border bg-white p-6">
        <h3 className="mb-4 text-base font-semibold">Top Performing Posts</h3>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <TrendingUp className="h-8 w-8 text-gray-300 mb-2" />
          <p className="text-sm font-medium text-gray-500">No posts yet</p>
          <p className="text-xs text-gray-400 mb-4">Create your first post to see performance</p>
          <a
            href="/content-generator"
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Create Post
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border bg-white p-6 transition-all hover:shadow-lg">
      <h3 className="mb-4 flex items-center gap-2 text-base font-semibold">
        <span>📊</span>
        Top Performing Posts
      </h3>
      <div className="space-y-3">
        {posts.map((post, index) => (
          <div
            key={post.id}
            className="border-b border-gray-100 pb-3 last:border-0 last:pb-0"
          >
            <div className="mb-1 flex items-start justify-between">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-700 text-[10px] font-bold text-white">
                  {index + 1}
                </span>
                <div className="font-medium text-gray-900">{post.title}</div>
              </div>
            </div>
            <div className="ml-7 text-sm text-gray-600">{post.engagements} engagements</div>
          </div>
        ))}
      </div>
    </div>
  )
}
