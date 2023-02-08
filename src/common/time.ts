export const SECOND = 1000
export const MINUTE = 60 * SECOND
export const HOUR = 60 * MINUTE
export const DAY = 24 * HOUR
export const WEEK = 7 * DAY

export const sleep = function (timeInMillisecond: number) {
  return new Promise(resolve => {
    setTimeout(resolve, timeInMillisecond)
  })
}
