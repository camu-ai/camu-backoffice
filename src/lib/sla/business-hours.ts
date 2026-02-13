const BRT_OFFSET_HOURS = -3
const BUSINESS_START_HOUR = 8 // 08:00 BRT
const BUSINESS_END_HOUR = 18 // 18:00 BRT
function toBRT(date: Date): Date {
  const utc = date.getTime()
  return new Date(utc + BRT_OFFSET_HOURS * 60 * 60 * 1000)
}

function isWeekday(brtDate: Date): boolean {
  const day = brtDate.getUTCDay()
  return day >= 1 && day <= 5
}

function getBusinessHoursForDay(startHour: number, endHour: number): number {
  const effectiveStart = Math.max(startHour, BUSINESS_START_HOUR)
  const effectiveEnd = Math.min(endHour, BUSINESS_END_HOUR)
  return Math.max(0, effectiveEnd - effectiveStart)
}

export function calculateBusinessHours(start: Date, end: Date): number {
  if (end <= start) return 0

  const brtStart = toBRT(start)
  const brtEnd = toBRT(end)

  let totalHours = 0

  const startDay = new Date(Date.UTC(
    brtStart.getUTCFullYear(),
    brtStart.getUTCMonth(),
    brtStart.getUTCDate(),
  ))

  const endDay = new Date(Date.UTC(
    brtEnd.getUTCFullYear(),
    brtEnd.getUTCMonth(),
    brtEnd.getUTCDate(),
  ))

  const current = new Date(startDay)

  while (current <= endDay) {
    if (isWeekday(current)) {
      const isSameAsStart =
        current.getTime() === startDay.getTime()
      const isSameAsEnd =
        current.getTime() === endDay.getTime()

      let dayStartHour = BUSINESS_START_HOUR
      let dayEndHour = BUSINESS_END_HOUR

      if (isSameAsStart) {
        dayStartHour = brtStart.getUTCHours() + brtStart.getUTCMinutes() / 60
      }
      if (isSameAsEnd) {
        dayEndHour = brtEnd.getUTCHours() + brtEnd.getUTCMinutes() / 60
      }

      totalHours += getBusinessHoursForDay(dayStartHour, dayEndHour)
    }

    current.setUTCDate(current.getUTCDate() + 1)
  }

  return Math.round(totalHours * 100) / 100
}
