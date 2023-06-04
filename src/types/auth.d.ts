export type Auth = {
  username: string,
  password: string,
  mechanism: 'PLAIN' | 'SCRAM-SHA-512' | 'SCRAM-SHA-256'
}