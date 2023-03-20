import {
  Column,
  CreateDateColumn,
  Entity,
  ObjectID,
  ObjectIdColumn,
} from 'typeorm'

export enum AccountStatus {
  DOWN,
  INITIALIZING,
  RUNNING,
  ERROR,
  FREQUENT,
  BANNED,
  NO_CREDITS,
}

@Entity()
export class ChatgptAccount {
  @ObjectIdColumn()
  _id: ObjectID

  @Column()
  email: string

  @Column()
  password: string

  @Column()
  apiKey: string

  @Column({
    type: 'enum',
    enum: AccountStatus,
  })
  status: AccountStatus

  @Column({ default: false })
  isProAccount: boolean

  @Column({ nullable: true })
  errorMsg: string | null

  @Column({ nullable: true })
  errorTimestamp: number | null

  @Column({ nullable: true })
  errorTime: Date | null

  @CreateDateColumn()
  createDate?: Date
}
