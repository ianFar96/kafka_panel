export type KafkaMessage = {
  key: string
  value: string
  timestamp: number
  offset: number
  partition: number
}

export type SendMessage = {
  key: string
  value: string
}

export type StorageMessage = {
  id?: number
  key: string
  value: string
  tags: string[]
}
