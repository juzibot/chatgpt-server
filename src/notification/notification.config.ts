import { HOUR, MINUTE } from 'src/common';
import { AlarmConfig, AlarmType } from './notification.interface';

export const AlarmConfigs: { [type in AlarmType]: AlarmConfig } = {
  [AlarmType.DEFAULT]: {
    triggerIntervalInMs: 6 * HOUR,
    mentionAll: false,
  },
  [AlarmType.ACCOUNT_LOW_PERCENT]: {
    triggerIntervalInMs: 2 * HOUR,
    mentionAll: false,
  },
  [AlarmType.ACCOUNT_ALL_DOWN]: {
    triggerIntervalInMs: 30 * MINUTE,
    mentionAll: true,
  },
};
