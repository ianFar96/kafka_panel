export type KafkaMessage = {
  headers: Record<string, unknown> | null
  key: unknown
  value: unknown
  timestamp: number
  offset: number
  partition: number
}

export type SendMessage = {
  key: string
  value: string
}

export type StorageMessage = {
  id: string
  key: string
  value: string
  tags: string[]
}
