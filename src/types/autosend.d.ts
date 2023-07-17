import { Timer } from '../services/Timer';

export type Autosend = {
  topic: string,
  key: Record<string, unknown>,
  value: Record<string, unknonw>,
  options: AutosendOptions
}

export type ActiveAutosend = Autosend & {
  timer: Timer,
  id: string
}

export type AutosendOptions = {
  duration: AutosendTime,
  interval: AutosendTime
}

export type AutosendTime = {
  time_unit: 'Hours'| 'Minutes'| 'Seconds'| 'Miliseconds'
  value: number
}