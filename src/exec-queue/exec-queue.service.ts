/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-async-promise-executor */
import { Injectable, Logger } from '@nestjs/common'
import { MINUTE, sleep } from '../common'

interface FunctionObj {
  func: () => any,
  resolve: (data: any) => void,
  reject: (e: any) => void,
  delayBefore?: number,
  delayAfter?: number,
  uniqueKey?: string,
  timeout?: number,
}

export interface RateOptions {
  queueId?: string,
  delayBefore?: number,
  delayAfter?: number,
  uniqueKey?: string,
  timeout?: number,
}

const MAX_QUEUE_SIZE = 1000
const DEFAULT_TIMEOUT = 10 * MINUTE;

@Injectable()
export class ExecQueueService {
  private readonly logger = new Logger(ExecQueueService.name)

  private queueLength = 0

  private functionQueueMap: { [id: string]: FunctionObj[] } = {}
  private runningMap: { [id: string]: boolean } = {}

  async exec<T> (func: () => T, options: RateOptions = {}) {
    const queueId = options.queueId || 'default'
    const { delayAfter, delayBefore, uniqueKey, timeout } = options

    if (!this.functionQueueMap[queueId]) {
      this.functionQueueMap[queueId] = []
    }

    const maxQueueSize = await this.getMaxQueueSize()
    if (this.queueLength > maxQueueSize) {
      this.logger.error(`Can not exec more tasks since the queue is full, max queue size: ${maxQueueSize}, current length: ${this.queueLength}`)
      throw new Error(`Can not exec more tasks since the execution queue is full`)
    }
    this.queueLength++

    return new Promise<T>((resolve, reject) => {
      this.functionQueueMap[queueId].push({ delayAfter, delayBefore, func, reject, resolve, uniqueKey, timeout })
      if (!this.runningMap[queueId]) {
        this.runningMap[queueId] = true
        this.execNext(queueId).catch(reject)
      }
    })
  }

  private async execNext (queueId: string) {
    const queue = this.functionQueueMap[queueId]
    if (!queue) {
      return
    }

    const funcObj = queue.shift()
    if (!funcObj) {
      throw new Error(`can not get funcObj with queueId: ${queueId}.`)
    }
    const { delayAfter, delayBefore, func, resolve, reject, uniqueKey, timeout } = funcObj
    const queueTimeout = typeof timeout === 'undefined' ? DEFAULT_TIMEOUT : timeout
    if (delayBefore) {
      await sleep(delayBefore)
    }
    try {
      const result = await Promise.race([
        func(),
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        new Promise((_resolve, reject) => setTimeout(() => reject(new Error(`exec task timeout, queueId: ${queueId}`)), queueTimeout))
      ])
      resolve(result)
      /**
       * If uniqueKey is given, will resolve functions with same key in the queue
       */
      if (uniqueKey) {
        const sameFuncIndexes = queue.map((f, index) => ({ func: f, index }))
          .filter(o => o.func.uniqueKey === uniqueKey)
          .map(o => o.index)
          .sort((a, b) => b - a)
        for (const index of sameFuncIndexes) {
          const [sameFunc] = queue.splice(index, 1)
          sameFunc.resolve(result)
          this.queueLength--
        }
      }
    } catch (e) {
      reject(e)
    }

    this.queueLength--
    if (delayAfter) {
      await sleep(delayAfter)
    }
    if (queue.length > 0) {
      await this.execNext(queueId)
    } else {
      delete this.runningMap[queueId]
    }
  }

  private async getMaxQueueSize () {
    return MAX_QUEUE_SIZE
  }
}
