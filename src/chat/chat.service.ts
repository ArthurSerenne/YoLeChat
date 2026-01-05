import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) { }

  async ensureGeneralRoomId(serverId?: string) {
    if (serverId) {
      const existing = await this.prisma.room.findFirst({ where: { name: 'general', serverId } });
      if (existing) return existing.id;
      const created = await this.prisma.room.create({ data: { name: 'general', isPrivate: true, createdBy: 'system', serverId } });
      return created.id;
    }
    const existing = await this.prisma.room.findFirst({ where: { name: 'general', isPrivate: false, serverId: null } });
    if (existing) return existing.id;
    const room = await this.prisma.room.create({ data: { name: 'general', isPrivate: false, createdBy: 'system' } });
    return room.id;
  }

  async userHasAccessToServer(userId: string, serverId: string) {
    const membership = await this.prisma.serverMember.findUnique({ where: { serverId_userId: { serverId, userId } } });
    return !!membership;
  }

  private async userIsOwnerOfServer(userId: string, serverId: string) {
    const membership = await this.prisma.serverMember.findUnique({ where: { serverId_userId: { serverId, userId } } });
    return !!membership && membership.role === 'owner';
  }

  async getRecentMessages(userId: string, serverId: string | null, limit = 50) {
    const n = Math.max(1, Math.min(200, limit));
    const roomId = await this.ensureGeneralRoomId(serverId || undefined);

    if (serverId) {
      const isOwner = await this.userIsOwnerOfServer(userId, serverId);
      if (!isOwner) return [];
    }

    const messages = await this.prisma.message.findMany({
      where: { roomId },
      include: {
        author: { select: { id: true, username: true, displayColor: true } },
        reactions: { select: { id: true, emoji: true, userId: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: n,
    });
    return messages.map(m => ({
      id: m.id,
      content: m.content,
      createdAt: m.createdAt,
      author: m.author,
      reactions: m.reactions,
    }));
  }

  async clearGeneralRoomMessages(userId: string, serverId: string | null) {
    if (serverId) {
      const allowed = await this.userHasAccessToServer(userId, serverId);
      if (!allowed) return 0;
    }
    const roomId = await this.ensureGeneralRoomId(serverId || undefined);
    const ids = await this.prisma.message.findMany({ where: { roomId }, select: { id: true } });
    const messageIds = ids.map(i => i.id);
    if (messageIds.length > 0) {
      await this.prisma.reaction.deleteMany({ where: { messageId: { in: messageIds } } });
    }
    const res = await this.prisma.message.deleteMany({ where: { roomId } });
    return res.count;
  }
}