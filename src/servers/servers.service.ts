import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class ServersService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService, private readonly realtime: RealtimeGateway) { }

  async onModuleInit() {
    try {
      const erkant = await this.prisma.user.findUnique({ where: { username: 'Erkant' } });
      if (!erkant) return;
      const servers = await this.prisma.server.findMany({});
      for (const s of servers) {
        const existing = await this.prisma.serverMember.findUnique({ where: { serverId_userId: { serverId: s.id, userId: erkant.id } } });
        if (!existing) {
          await this.prisma.serverMember.create({ data: { serverId: s.id, userId: erkant.id, role: 'admin' } });
        }
      }
    } catch { }
  }

  async createServer(ownerId: string, name: string) {
    const server = await this.prisma.server.create({
      data: { name, ownerId },
    });
    await this.prisma.serverMember.create({
      data: { serverId: server.id, userId: ownerId, role: 'owner' },
    });
    // Ensure a general room inside the server
    await this.prisma.room.create({
      data: { name: 'general', isPrivate: true, createdBy: ownerId, serverId: server.id },
    });
    // Ajoute Erkant en admin si présent
    try {
      const erkant = await this.prisma.user.findUnique({ where: { username: 'Erkant' } });
      if (erkant) {
        const existing = await this.prisma.serverMember.findUnique({ where: { serverId_userId: { serverId: server.id, userId: erkant.id } } });
        if (!existing) await this.prisma.serverMember.create({ data: { serverId: server.id, userId: erkant.id, role: 'admin' } });
      }
    } catch { }
    return server;
  }

  async listForUser(userId: string) {
    const memberships = await this.prisma.serverMember.findMany({
      where: { userId },
      include: { server: true },
      orderBy: { joinedAt: 'asc' },
    });
    return memberships.map(m => ({ id: m.server.id, name: m.server.name, role: m.role }));
  }

  async inviteUser(serverId: string, inviterId: string, username: string) {
    const server = await this.prisma.server.findUnique({ where: { id: serverId } });
    if (!server) throw new Error('not_found');

    // Seul le créateur (owner) peut inviter
    const inviterMembership = await this.prisma.serverMember.findUnique({
      where: { serverId_userId: { serverId, userId: inviterId } },
    });
    if (!inviterMembership || inviterMembership.role !== 'owner') {
      throw new Error('forbidden');
    }

    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) throw new Error('user_not_found');

    const existing = await this.prisma.serverMember.findUnique({
      where: { serverId_userId: { serverId, userId: user.id } },
    });
    if (existing) throw new Error('already_member');

    const membership = await this.prisma.serverMember.create({
      data: { serverId, userId: user.id, role: 'member' },
    });

    // Émet un événement ciblé pour mettre à jour la liste côté invité
    try {
      this.realtime.server.to(`user:${user.id}`).emit('server.added', { id: server.id, name: server.name });
    } catch { }

    return membership;
  }

  async getServerForUser(serverId: string, userId: string) {
    const membership = await this.prisma.serverMember.findUnique({
      where: { serverId_userId: { serverId, userId } },
      include: { server: true },
    });
    if (!membership) throw new Error('forbidden');
    return membership.server;
  }

  async ensureGeneralRoomId(serverId: string) {
    const room = await this.prisma.room.findFirst({ where: { name: 'general', serverId } });
    if (room) return room.id;
    const created = await this.prisma.room.create({
      data: { name: 'general', isPrivate: true, createdBy: 'system', serverId },
    });
    return created.id;
  }
}