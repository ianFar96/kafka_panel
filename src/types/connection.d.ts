export type Connection = {
  name: string,
  brokers: string[],
  auth?: SaslConfig,
  groupPrefix?: string
}

export type SaslConfig = {
	mechanism: 'PLAIN' | 'SCRAM-SHA-256' | 'SCRAM_SHA_512'
	username: string
	password: string
}