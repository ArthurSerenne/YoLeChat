import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureGeneralRoomId() {
    const existing = await this.prisma.room.findFirst({ where: { name: 'general', isPrivate: false } });
    if (existing) return existing.id;
    const room = await this.prisma.room.create({ data: { name: 'general', isPrivate: false, createdBy: 'system' } });
    return room.id;
  }

  async getRecentMessages(limit = 50) {
    const roomId = await this.ensureGeneralRoomId();
    const messages = await this.prisma.message.findMany({
      where: { roomId },
      include: { author: { select: { id: true, username: true, displayColor: true } } },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
    return messages.map(m => ({
      id: m.id,
      content: m.content,
      createdAt: m.createdAt,
      author: m.author,
    }));
  }
}