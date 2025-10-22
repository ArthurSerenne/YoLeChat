import { Controller, Get, UseGuards, Query, Delete, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('messages')
  async getMessages(@Req() req: any, @Query('limit') limit?: string, @Query('server') server?: string) {
    const n = limit ? Math.max(1, Math.min(200, parseInt(limit))) : 50;
    const userId = req.user.id;
    const serverId = server || null;
    return this.chat.getRecentMessages(userId, serverId, n);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('messages')
  async clearMessages(@Req() req: any, @Query('server') server?: string) {
    const userId = req.user.id;
    const serverId = server || null;
    const deleted = await this.chat.clearGeneralRoomMessages(userId, serverId);
    return { status: 'ok', deleted };
  }
}