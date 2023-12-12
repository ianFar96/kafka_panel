export type Key = string
export type Value = string | null
export type Headers = Record<Key, Value> | null

export type MessageKeyValue = {
  key: Key
  value: Value
}

export type MessageContent = MessageKeyValue & {
  headers: Headers | null
}

export type Message = MessageContent & {
  timestamp: number
  offset: number
  partition: number
}

export type StorageMessage = MessageContent & {
  id?: string
  tags: string[]
}

export type StorageMessageWithId = Required<StorageMessage>
