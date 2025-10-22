import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ServersService } from './servers.service';

@Controller('servers')
export class ServersController {
  constructor(private readonly servers: ServersService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async create(@Req() req: any, @Body('name') name: string) {
    const userId = req.user.id;
    const trimmed = (name || '').trim();
    if (!trimmed) return { error: 'invalid_name' };
    const server = await this.servers.createServer(userId, trimmed);
    return { id: server.id, name: server.name };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  async listMine(@Req() req: any) {
    const userId = req.user.id;
    return this.servers.listForUser(userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  async getOne(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.id;
    try {
      const server = await this.servers.getServerForUser(id, userId);
      return { id: server.id, name: server.name };
    } catch {
      return { error: 'forbidden' };
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/invite')
  async invite(@Req() req: any, @Param('id') id: string, @Body('username') username: string) {
    const userId = req.user.id;
    const trimmed = (username || '').trim();
    if (!trimmed) return { error: 'invalid_username' };
    try {
      await this.servers.inviteUser(id, userId, trimmed);
      return { status: 'ok' };
    } catch (e: any) {
      const code = e?.message || 'error';
      return { status: 'error', code };
    }
  }
}