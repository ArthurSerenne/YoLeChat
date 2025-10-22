import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { ServersService } from './servers.service';
import { ServersController } from './servers.controller';

@Module({
  imports: [PrismaModule, RealtimeModule],
  providers: [ServersService],
  controllers: [ServersController],
  exports: [ServersService],
})
export class ServersModule {}