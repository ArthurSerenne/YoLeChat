import { Controller, Get, Patch, Body, Req, UseGuards, Query } from '@nestjs/common';
import { IsOptional, IsString, MinLength, Matches } from 'class-validator';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';


class UpdateMeDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  username?: string;

  @IsOptional()
  @Matches(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
  displayColor?: string;
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  getMe(@Req() req: any) {
    return this.usersService.getMe(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('me')
  updateMe(@Req() req: any, @Body() body: UpdateMeDto) {
    return this.usersService.updateMe(req.user.id, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('search')
  search(@Req() req: any, @Query('q') q: string, @Query('limit') limit?: string) {
    const query = (q || '').trim();
    const take = Math.min(Math.max(parseInt(limit || '8', 10) || 8, 1), 20);
    if (!query || query.length < 2) return [];
    return this.usersService.searchUsers(query, take, req.user.id);
  }
}