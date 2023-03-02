import {
  Column,
  Entity,
  ObjectID,
  UpdateDateColumn,
  ObjectIdColumn,
  Index,
} from 'typeorm'

export interface ChatGptMessage {
  role: 'user' | 'system' | 'assistant',
  content: string,
}

export interface MessageStore extends ChatGptMessage {
  tokenCount: number,
  timestamp: number,
}

@Entity()
export class ChatGptApiSession {
  @ObjectIdColumn()
  _id: ObjectID

  @Index('sessionId-idx')
  @Column()
  sessionId: string

  @Column()
  messages: MessageStore[]

  @UpdateDateColumn()
  updateDate: Date
}
