export type Json = { [key: string]: string | number | boolean | Json }

export type Message = {
  key: Json | string
  value: Json | string
  timestamp: number
  offset: number
  partition: number
}
