import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, OnGatewayConnection, OnGatewayDisconnect, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({ cors: true })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) { }

  private typingTimeouts = new Map<string, NodeJS.Timeout>(); // key: `${serverKey}:${userId}`
  private onlineByServer = new Map<string, Set<string>>(); // key: serverKey -> Set<userId>

  private serverKey(serverId?: string | null) {
    return serverId ? `server:${serverId}:general` : 'general';
  }

  async handleConnection(socket: Socket) {
    try {
      const cookie = socket.handshake.headers.cookie || '';
      const token = cookie
        .split(';')
        .map(v => v.trim())
        .find(v => v.startsWith('access_token='))
        ?.slice('access_token='.length) || '';
      const user = token ? this.jwt.verify(token) : null;
      socket.data.user = user ? { id: user.sub, username: user.username } : null;
      if (socket.data.user?.id) {
        await socket.join(`user:${socket.data.user.id}`);
      }
    } catch {
      socket.data.user = null;
    }
  }

  @SubscribeMessage('chat:join')
  async handleJoin(@ConnectedSocket() socket: Socket, @MessageBody() payload?: any) {
    try {
      if (!socket.data.user) return { status: 'error', error: 'unauthorized' };
      const serverId: string | undefined = typeof payload === 'string' ? payload : payload?.serverId;
      if (serverId) {
        const membership = await this.prisma.serverMember.findUnique({ where: { serverId_userId: { serverId, userId: socket.data.user.id } } });
        if (!membership) return { status: 'error', error: 'forbidden' };
      }
      socket.data.serverId = serverId || null;
      const roomName = this.serverKey(socket.data.serverId);
      await socket.join(roomName);
      const u = socket.data.user;
      const key = roomName;
      if (!this.onlineByServer.has(key)) this.onlineByServer.set(key, new Set<string>());
      if (u?.id) this.onlineByServer.get(key)!.add(u.id);
      await this.broadcastPresence(roomName);
      return { status: 'ok' };
    } catch (e: any) {
      return { status: 'error', error: 'join_failed' };
    }
  }

  @SubscribeMessage('message.send')
  async handleMessageSend(@ConnectedSocket() socket: Socket, @MessageBody() payload: any) {
    try {
      const u = socket.data.user;
      if (!u) return { status: 'error', error: 'unauthorized' };
      const content = (payload?.content || '').trim();
      if (!content) return { status: 'error', error: 'empty_message' };
      const serverId: string | null = socket.data.serverId || null;
      let room;
      if (serverId) {
        room = await this.prisma.room.findFirst({ where: { name: 'general', serverId } })
          || await this.prisma.room.create({ data: { name: 'general', isPrivate: true, createdBy: 'system', serverId } });
      } else {
        room = await this.prisma.room.findFirst({ where: { name: 'general', isPrivate: false, serverId: null } })
          || await this.prisma.room.create({ data: { name: 'general', isPrivate: false, createdBy: 'system' } });
      }
      const msg = await this.prisma.message.create({
        data: { roomId: room.id, authorId: u.id, content },
        include: { author: { select: { id: true, username: true, displayColor: true } } },
      });
      const roomName = this.serverKey(serverId);
      this.server.to(roomName).emit('message.new', { id: msg.id, content: msg.content, createdAt: msg.createdAt, author: msg.author });
      return { status: 'ok' };
    } catch (e: any) {
      return { status: 'error', error: 'send_failed' };
    }
  }

  @SubscribeMessage('message.react')
  async handleMessageReact(@ConnectedSocket() socket: Socket, @MessageBody() payload: any) {
    try {
      const u = socket.data.user;
      if (!u) return { status: 'error', error: 'unauthorized' };
      const { messageId, emoji } = payload || {};
      if (!messageId || !emoji) return { status: 'error', error: 'invalid_payload' };

      await this.prisma.reaction.create({
        data: { messageId, userId: u.id, emoji },
      });

      const roomName = this.serverKey(socket.data.serverId);
      this.server.to(roomName).emit('message.reaction.new', { messageId, emoji });
      return { status: 'ok' };
    } catch (e) {
      return { status: 'error', error: 'react_failed' };
    }
  }

  handleDisconnect(socket: Socket) {
    try {
      const u = socket.data.user;
      const roomName = this.serverKey(socket.data.serverId);
      const set = this.onlineByServer.get(roomName);
      if (u?.id && set) {
        set.delete(u.id);
        this.broadcastPresence(roomName).catch(() => { });
      }
    } catch { }
  }

  @SubscribeMessage('typing.start')
  handleTypingStart(@ConnectedSocket() socket: Socket) {
    try {
      const u = socket.data.user;
      if (!u) return { status: 'error', error: 'unauthorized' };
      const roomName = this.serverKey(socket.data.serverId);
      const key = `${roomName}:${u.id}`;
      const existing = this.typingTimeouts.get(key);
      if (existing) clearTimeout(existing);
      const t = setTimeout(() => {
        this.typingTimeouts.delete(key);
        this.broadcastTyping(roomName).catch(() => { });
      }, 3000);
      this.typingTimeouts.set(key, t);
      this.broadcastTyping(roomName).catch(() => { });
      return { status: 'ok' };
    } catch {
      return { status: 'error', error: 'typing_failed' };
    }
  }

  @SubscribeMessage('typing.stop')
  handleTypingStop(@ConnectedSocket() socket: Socket) {
    try {
      const u = socket.data.user;
      if (!u) return { status: 'error', error: 'unauthorized' };
      const roomName = this.serverKey(socket.data.serverId);
      const key = `${roomName}:${u.id}`;
      const existing = this.typingTimeouts.get(key);
      if (existing) clearTimeout(existing);
      this.typingTimeouts.delete(key);
      this.broadcastTyping(roomName).catch(() => { });
      return { status: 'ok' };
    } catch {
      return { status: 'error', error: 'typing_failed' };
    }
  }

  private async broadcastTyping(roomName: string) {
    const keys = Array.from(this.typingTimeouts.keys()).filter(k => k.startsWith(roomName + ':'));
    if (keys.length === 0) {
      this.server.to(roomName).emit('typing.update', { users: [] });
      return;
    }
    const ids = keys.map(k => k.split(':').pop()!).filter(Boolean);
    const users = await this.prisma.user.findMany({ where: { id: { in: ids } }, select: { username: true } });
    this.server.to(roomName).emit('typing.update', { users: users.map(u => u.username) });
  }

  private async broadcastPresence(roomName: string) {
    const set = this.onlineByServer.get(roomName) || new Set<string>();
    if (set.size === 0) {
      this.server.to(roomName).emit('presence.update', { users: [] });
      return;
    }
    const ids = Array.from(set.values());
    const users = await this.prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, username: true, displayColor: true } });
    this.server.to(roomName).emit('presence.update', { users });
  }
}