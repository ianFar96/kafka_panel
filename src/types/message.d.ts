export type ParsedHeaders = Record<string, unknown> | null
export type UnparsedHeaders = Record<string, string> | null

export type MessageContent = {
  headers: ParsedHeaders
  key: unknown
  value: unknown
}

export type Message = MessageContent & {
  timestamp: number
  offset: number
  partition: number
}

export type SendMessage = {
  headers: UnparsedHeaders
  key: string
  value: string
}

export type StorageMessage = MessageContent & {
  id: string
  tags: string[]
}
