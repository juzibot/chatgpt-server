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

export enum AccountType {
  OPEN_AI = 'OPEN_AI',
  AZURE = 'AZURE',
}

@Entity()
export class ChatgptAccount {
  @ObjectIdColumn()
  _id: ObjectID

  @Column({ nullable: true })
  email: string

  @Column({ nullable: true })
  password: string

  @Column()
  apiKey: string

  @Column({
    type: 'enum',
    enum: AccountStatus,
  })
  status: AccountStatus

  @Column({
    type: 'enum',
    enum: AccountType,
    default: AccountType.OPEN_AI,
  })
  type: AccountType

  @Column({ nullable: true })
  resourceName: string | null

  @Column({ nullable: true })
  deploymentId: string | null

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
