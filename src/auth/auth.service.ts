import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as argon2 from 'argon2';

interface RegisterDto {
  username: string;
  password: string;
  displayColor?: string;
}

interface LoginDto {
  username: string;
  password: string;
}

@Injectable()
export class AuthService {
  constructor(private readonly jwt: JwtService, private readonly prisma: PrismaService) {}

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({ where: { username: dto.username } });
    if (exists) throw new ConflictException("Nom d'utilisateur déjà utilisé");
    const passwordHash = await argon2.hash(dto.password);
    const user = await this.prisma.user.create({
      data: { username: dto.username, passwordHash, displayColor: dto.displayColor },
    });
    const token = this.jwt.sign({ sub: user.id, username: user.username });
    return { accessToken: token };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { username: dto.username } });
    if (!user) throw new UnauthorizedException('Identifiants invalides');
    const ok = await argon2.verify(user.passwordHash, dto.password);
    if (!ok) throw new UnauthorizedException('Identifiants invalides');
    const token = this.jwt.sign({ sub: user.id, username: user.username });
    return { accessToken: token };
  }
}