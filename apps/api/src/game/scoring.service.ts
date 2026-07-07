import { Injectable } from '@nestjs/common';
import { PlayerAnswer, ScoringConfig } from '@country-city/shared';

@Injectable()
export class ScoringService {
  /**
   * Scores every answer in a single category in place (mutates `answer.score`
   * and `answer.acceptedValue`).  When a player submitted multiple answers, the
   * *best* (most unique) value is chosen — so a safety answer that no one else
   * wrote can earn `unique` points even when another answer was shared.
   */
  scoreCategory(answers: PlayerAnswer[], config: ScoringConfig): void {
    // ── 1. Build a global count per normalized value ──────────────
    const countByNorm = new Map<string, number>();
    for (const a of answers) {
      if (a.validationStatus === 'invalid') continue;
      for (const v of a.values) {
        const trimmed = v.trim();
        if (!trimmed) continue;
        const n = this.normalize(trimmed);
        countByNorm.set(n, (countByNorm.get(n) ?? 0) + 1);
      }
    }

    // ── 2. How many *other* players submitted at least one non-empty value?
    const answeredPlayers = answers.filter(
      (a) => a.values.some((v) => v.trim().length > 0),
    );

    // ── 3. Score each player ──────────────────────────────────────
    for (const answer of answers) {
      if (answer.validationStatus === 'invalid') {
        answer.score = config.none;
        answer.acceptedValue = null;
        continue;
      }

      // Pick the best value: lowest global occurrence count (most unique).
      // Ties are broken by the order the player wrote them (first wins).
      let bestValue: string | null = null;
      let bestCount = Infinity;

      for (const v of answer.values) {
        const trimmed = v.trim();
        if (!trimmed) continue;
        const n = this.normalize(trimmed);
        const c = countByNorm.get(n) ?? 0;
        if (c < bestCount) {
          bestCount = c;
          bestValue = trimmed;
        }
      }

      if (!bestValue) {
        answer.score = config.none;
        answer.acceptedValue = null;
        continue;
      }

      answer.acceptedValue = bestValue;

      // How many *other* players answered (any non-empty value)?
      const othersCount = answeredPlayers.filter((a) => a !== answer).length;

      if (othersCount === 0) {
        // Only player who answered — everyone else blank.
        answer.score = config.uniqueWinner;
      } else if (bestCount === 1) {
        // This specific value was written by no one else.
        answer.score = config.unique;
      } else {
        answer.score = config.shared;
      }
    }
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
