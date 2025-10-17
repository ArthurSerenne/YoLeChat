import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, OnGatewayConnection, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({ cors: true })
export class RealtimeGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  private typingTimeouts = new Map<string, NodeJS.Timeout>();

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
    } catch {
      socket.data.user = null;
    }
  }

  @SubscribeMessage('chat:join')
  async handleJoin(@ConnectedSocket() socket: Socket) {
    try {
      if (!socket.data.user) return { status: 'error', error: 'unauthorized' };
      await socket.join('general');
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
      const room = await this.prisma.room.findFirst({ where: { name: 'general', isPrivate: false } })
        || await this.prisma.room.create({ data: { name: 'general', isPrivate: false, createdBy: 'system' } });
      const msg = await this.prisma.message.create({
        data: { roomId: room.id, authorId: u.id, content },
        include: { author: { select: { id: true, username: true, displayColor: true } } },
      });
      this.server.to('general').emit('message.new', { id: msg.id, content: msg.content, createdAt: msg.createdAt, author: msg.author });
      return { status: 'ok' };
    } catch (e: any) {
      return { status: 'error', error: 'send_failed' };
    }
  }

  @SubscribeMessage('typing.start')
  handleTypingStart(@ConnectedSocket() socket: Socket) {
    try {
      const u = socket.data.user;
      if (!u) return { status: 'error', error: 'unauthorized' };
      const existing = this.typingTimeouts.get(u.id);
      if (existing) clearTimeout(existing);
      const t = setTimeout(() => {
        this.typingTimeouts.delete(u.id);
        this.broadcastTyping().catch(() => {});
      }, 3000);
      this.typingTimeouts.set(u.id, t);
      this.broadcastTyping().catch(() => {});
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
      const existing = this.typingTimeouts.get(u.id);
      if (existing) clearTimeout(existing);
      this.typingTimeouts.delete(u.id);
      this.broadcastTyping().catch(() => {});
      return { status: 'ok' };
    } catch {
      return { status: 'error', error: 'typing_failed' };
    }
  }

  private async broadcastTyping() {
    const ids = Array.from(this.typingTimeouts.keys());
    if (ids.length === 0) {
      this.server.to('general').emit('typing.update', { users: [] });
      return;
    }
    const users = await this.prisma.user.findMany({ where: { id: { in: ids } }, select: { username: true } });
    this.server.to('general').emit('typing.update', { users: users.map(u => u.username) });
  }
}