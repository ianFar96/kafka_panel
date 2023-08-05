import { Observable } from 'rxjs';

export type Autosend = {
  topic: string,
  key: Record<string, unknown>,
  value: Record<string, unknonw>,
  options: AutosendOptions
}

export type ActiveAutosend = Autosend & {
  id: string,
  remainingTimeObservable?: Observable<string>,
  messagesSentObservable?: Observable<number>
}

export type AutosendOptions = {
  duration: AutosendTime,
  interval: AutosendTime
}

export type AutosendTime = {
  time_unit: 'Hours'| 'Minutes'| 'Seconds'| 'Milliseconds'
  value: number
}