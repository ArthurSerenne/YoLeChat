import { 
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: true })
export class RealtimeGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('message.send')
  handleMessageSend(@MessageBody() payload: any) {
    this.server.emit('message.new', {
      id: Date.now().toString(),
      content: payload?.content ?? '',
      authorId: payload?.authorId ?? 'stub-user-id',
      createdAt: new Date().toISOString(),
    });
    return { status: 'ok' };
  }

  @SubscribeMessage('typing.start')
  handleTypingStart(@MessageBody() payload: any) {
    this.server.emit('typing.update', { userId: payload?.userId, typing: true });
  }

  @SubscribeMessage('typing.stop')
  handleTypingStop(@MessageBody() payload: any) {
    this.server.emit('typing.update', { userId: payload?.userId, typing: false });
  }
}