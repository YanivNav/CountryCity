import { Injectable } from '@nestjs/common';
import { ScoringConfig } from '@country-city/shared';

@Injectable()
export class ScoringService {
  constructor() {}

  async calculateRound(roundId: string, scoring: ScoringConfig): Promise<void> {
    // TODO: implement
  }

  normalize(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/^(the |a |an |ה|ה־)/i, '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
  }
}
