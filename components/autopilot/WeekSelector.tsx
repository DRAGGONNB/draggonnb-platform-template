'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

function getISOWeek(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const week1 = new Date(d.getFullYear(), 0, 4)
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

function getWeekDates(isoWeek: string): { start: Date; end: Date } {
  const [yearStr, weekStr] = isoWeek.replace('W', '').split('-')
  const year = parseInt(yearStr)
  const week = parseInt(weekStr)

  const jan4 = new Date(year, 0, 4)
  const dayOfWeek = jan4.getDay() || 7
  const start = new Date(jan4)
  start.setDate(jan4.getDate() - dayOfWeek + 1 + (week - 1) * 7)

  const end = new Date(start)
  end.setDate(start.getDate() + 6)

  return { start, end }
}

function shiftWeek(isoWeek: string, delta: number): string {
  const { start } = getWeekDates(isoWeek)
  start.setDate(start.getDate() + delta * 7)
  return getISOWeek(start)
}

function formatDateRange(start: Date, end: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()} - ${end.getDate()} ${months[start.getMonth()]} ${start.getFullYear()}`
  }
  return `${start.getDate()} ${months[start.getMonth()]} - ${end.getDate()} ${months[end.getMonth()]} ${start.getFullYear()}`
}

interface WeekSelectorProps {
  week: string
  onWeekChange: (week: string) => void
}

export function WeekSelector({ week, onWeekChange }: WeekSelectorProps) {
  const currentWeek = getISOWeek(new Date())
  const { start, end } = getWeekDates(week)
  const isCurrentWeek = week === currentWeek

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onWeekChange(shiftWeek(week, -1))}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="text-center min-w-[200px]">
        <div className="text-sm font-semibold">{week}</div>
        <div className="text-xs text-gray-500">{formatDateRange(start, end)}</div>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onWeekChange(shiftWeek(week, 1))}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {!isCurrentWeek && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onWeekChange(currentWeek)}
        >
          Today
        </Button>
      )}
    </div>
  )
}

export { getISOWeek, getWeekDates }
