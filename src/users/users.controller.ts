import { Controller, Get, Patch, Body, Req, UseGuards } from '@nestjs/common';
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
    return this.usersService.getMe(req.user.sub);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('me')
  updateMe(@Req() req: any, @Body() body: UpdateMeDto) {
    return this.usersService.updateMe(req.user.sub, body);
  }
}