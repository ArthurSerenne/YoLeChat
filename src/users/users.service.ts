import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface UpdateMeDto {
  username?: string;
  displayColor?: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  getMe(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, displayColor: true, createdAt: true },
    });
  }

  updateMe(userId: string, dto: UpdateMeDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { username: dto.username, displayColor: dto.displayColor },
      select: { id: true, username: true, displayColor: true },
    });
  }

  searchUsers(query: string, take: number, requesterId: string) {
    return this.prisma.user.findMany({
      where: {
        AND: [
          { username: { contains: query } },
          { id: { not: requesterId } },
        ],
      },
      select: { id: true, username: true, displayColor: true },
      orderBy: { username: 'asc' },
      take,
    });
  }
}