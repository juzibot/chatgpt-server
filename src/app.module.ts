import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ChatgptModule } from './chatgpt/chatgpt.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): TypeOrmModuleOptions =>  {
        return {
          type: 'mongodb',
          url: configService.get('mongoUri') || undefined,
          database: `chatgpt-server`,
          entities: require('./entities'),
          synchronize: true,
        }
      },
    }),
    ScheduleModule.forRoot(),
    ChatgptModule,
  ],
})
export class AppModule {}
