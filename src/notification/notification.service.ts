import axios, { Method } from 'axios';
import { Inject, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AlarmType } from './notification.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { AlarmConfigs } from './notification.config';
import { NotificationModel } from 'src/entities/notification';

const BASE_URL = 'https://open.feishu.cn/open-apis/bot/v2/hook/'

@Injectable()
export class NotificationService {
  @InjectRepository(NotificationModel)
  private readonly notificationRepository: MongoRepository<NotificationModel>

  @Inject()
  private readonly configService: ConfigService

  private readonly logger = new Logger(NotificationService.name)

  async sendTextMessageToLark(text: string) {
    try {
      await this.requestLark({
        msg_type: 'text',
        content: { text },
      })
    } catch (e) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      this.logger.error(`sendTextMessageToLark failed with error:\n${e?.stack || e?.message}`)
    }
  }

  async sendSimpleAlarm (title: string, md: string, key?: string, template = 'yellow', type = AlarmType.DEFAULT) {
    if (!key) {
      key = title;
    }
    const existingAlarm = await this.notificationRepository.findOneBy({
      key,
      type,
    });
    const alarmConfig = AlarmConfigs[type];
    if (existingAlarm && (Date.now() - existingAlarm.lastAlarmTimestamp < alarmConfig.triggerIntervalInMs)) {
      return;
    }

    await this.sendCardMessageToLark({
      header: {
        title: {
          tag: 'plain_text',
          content: title,
        },
        template,
      },
      elements: [{
        tag: 'div',
        text: {
          content: md,
          tag: 'lark_md'
        },
      }]
    });
    await this.notificationRepository.findOneAndUpdate({
      key,
      type,
    }, {
      $set: {
        lastAlarmTimestamp: Date.now(),
      },
      $setOnInsert: {
        createAlarmTimestamp: Date.now(),
      }
    }, { upsert: true });
  }

  async clearSimpleAlarm (title: string, md: string, key: string, type: AlarmType) {
    const alarm = await this.notificationRepository.findOneBy({
      key,
      type,
    });

    if (!alarm) {
      return;
    }

    const duration = Date.now() - alarm.createAlarmTimestamp;

    await this.notificationRepository.delete({
      key,
      type,
    });

    await this.sendCardMessageToLark({
      header: {
        title: {
          tag: 'plain_text',
          content: title,
        },
        template: 'green',
      },
      elements: [{
        tag: 'div',
        text: {
          content: `持续时间：${(duration / 1000 / 60).toFixed(2)} min\n${md}`,
          tag: 'lark_md'
        },
      }]
    });
  }

  async sendCardMessageToLark(card: any) {
    try {
      await this.requestLark({
        msg_type: 'interactive',
        card,
      })
    } catch (e) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      this.logger.error(`sendCardMessageToLark failed with error:\n${e?.stack || e?.message}`)
    }
  }

  private async requestLark (
    data: object,
    method: Method = 'post',
  ) {
    const larkWebhookKey = this.configService.get('larkWebhookKey');
    if (!larkWebhookKey) {
      this.logger.error(`Can not send lark message since no lark webhook key configured.`);
      return;
    }
    const url = `${BASE_URL}${larkWebhookKey}`;
    const res = await axios({
      url,
      method,
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
      },
      data,
    });
    if (res.data.code !== 0) {
      throw new Error(`Send message failed for reason: ${res.data.msg}\ndata: ${JSON.stringify(data)}`);
    }
    return res.data;
  }
}
