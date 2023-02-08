import { Module } from '@nestjs/common'
import { ExecQueueService } from './exec-queue.service'

@Module({
  providers: [
    ExecQueueService,
  ],
  exports: [
    ExecQueueService,
  ]
})
export class ExecQueueModule {}
