import {
  Column,
  Entity,
  ObjectID,
  ObjectIdColumn,
} from 'typeorm'
import { AccountType } from './chatgpt-account'

@Entity()
export class AccountWeight {
  @ObjectIdColumn()
  _id: ObjectID

  @Column()
  type: AccountType

  @Column()
  weight: number
}
