import * as Ably from 'ably'

export const ably = new Ably.Realtime({
  key: process.env.ABLY_API_KEY
}) 