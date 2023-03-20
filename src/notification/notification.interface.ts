export interface AlarmConfig {
  triggerIntervalInMs: number,
  mentionAll: boolean,
}

export enum AlarmType {
  DEFAULT = 'default',
  ACCOUNT_LOW_PERCENT = 'account-low-percent',
  ACCOUNT_ALL_DOWN = 'account-all-down',
}
