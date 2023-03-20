import { Column, Entity, ObjectIdColumn } from 'typeorm';
import { ObjectId } from 'mongodb';
import { AlarmType } from 'src/notification/notification.interface';

@Entity('notification')
export class NotificationModel {
  @ObjectIdColumn()
  _id: ObjectId

  @Column()
  key: string

  @Column()
  type: AlarmType

  @Column()
  createAlarmTimestamp: number

  @Column()
  lastAlarmTimestamp: number
}
