export type Setting = {
  label: string,
  description: string,
  key: SettingKey
  value: string,
  type: 'text' | 'password' | 'json'
}

export type SettingKey = 'CONNECTIONS' | 'MESSAGES'