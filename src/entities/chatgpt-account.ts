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
}

@Entity()
export class ChatgptAccount {
  @ObjectIdColumn()
  _id: ObjectID

  @Column()
  email: string

  @Column()
  password: string

  @Column({
    type: 'enum',
    enum: AccountStatus,
  })
  status: AccountStatus

  @Column({ nullable: true })
  errorMsg: string | null

  @Column({ nullable: true })
  errorTimestamp: number | null

  @CreateDateColumn()
  createDate?: Date
}
