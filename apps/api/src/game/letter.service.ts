import { Injectable } from '@nestjs/common';
import { RoomSettings } from '@country-city/shared';

const DEFAULT_POOL_EN = 'ABCDEFGHIJKLMNOPRSTW'.split('');
const DEFAULT_POOL_HE = 'אבגדהוזחטיכלמנסעפצקרשת'.split('');

@Injectable()
export class LetterService {
  pick(settings: RoomSettings, usedLetters: string[]): string {
    const pool = settings.language === 'he' ? DEFAULT_POOL_HE : DEFAULT_POOL_EN;
    const filtered = pool
      .filter((l) => !settings.skipLetters.includes(l))
      .filter((l) => !usedLetters.includes(l));
    const source = filtered.length > 0 ? filtered : pool.filter((l) => !settings.skipLetters.includes(l));
    return source[Math.floor(Math.random() * source.length)];
  }
}
