import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';

const AVATAR_COLORS = [
  '#FF6B5B',
  '#3D2FCF',
  '#22C997',
  '#F59E0B',
  '#8B5CF6',
  '#EC4899',
  '#14B8A6',
  '#F97316',
];

@Injectable()
export class AuthService {
  constructor(private readonly jwt: JwtService) {}

  createAnonymous(displayName: string) {
    const id = randomUUID();
    const avatarColor =
      AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
    const token = this.jwt.sign({ sub: id, displayName, avatarColor });
    return { token, user: { id, displayName, avatarColor } };
  }

  verifyToken(token: string) {
    try {
      const payload = this.jwt.verify<{
        sub: string;
        displayName: string;
        avatarColor: string;
      }>(token);
      return {
        id: payload.sub,
        displayName: payload.displayName,
        avatarColor: payload.avatarColor,
      };
    } catch {
      return null;
    }
  }
}
