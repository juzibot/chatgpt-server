import {
  Column,
  Entity,
  ObjectID,
  ObjectIdColumn,
} from 'typeorm'

@Entity()
export class SessionInfo {
  @ObjectIdColumn()
  _id: ObjectID

  @Column()
  sessionId: string
  
  @Column({ nullable: true })
  email: string

  @Column({ nullable: true })
  conversationId: string | null

  @Column({ nullable: true })
  parentMessageId: string | null
}
