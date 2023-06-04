export type ConsumerGroup = {
  name: string,
  state: ConsumerGroupState
  watermarks: [number, number]
}

export type ConsumerGroupState = 'Consuming' | 'Disconnected' | 'Unconnected'