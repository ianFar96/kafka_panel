import { Observable } from 'rxjs';
import { MessageContent } from './message';

export type Autosend = MessageContent &  {
  topic: string,
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