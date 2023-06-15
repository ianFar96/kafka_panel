export type Json = { [key: string]: string | number | boolean | Json }

export type Message = {
  key: Json | string
  value: Json | string
  timestamp: number
  offset: number
  partition: number
}

export type SendMessage = {
  key: Json | string
  value: Json | string
}

export type StorageMessage = {
  id?: number
  key: string
  value: string
  tags: string[]
}
