import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('messages')
  async getMessages(@Query('limit') limit?: string) {
    const n = limit ? Math.max(1, Math.min(200, parseInt(limit))) : 50;
    return this.chat.getRecentMessages(n);
  }
}