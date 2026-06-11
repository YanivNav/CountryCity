import { Injectable } from '@nestjs/common';
import { PlayerAnswer, ScoringConfig } from '@country-city/shared';

@Injectable()
export class ScoringService {
  /**
   * Scores every answer in a single category in place (mutates `answer.score`).
   * Operates on in-memory PlayerAnswer objects — Phase 1 keeps live game state
   * in memory; DB-backed scoring is deferred to Phase 5 (see CLAUDE.md).
   */
  scoreCategory(answers: PlayerAnswer[], config: ScoringConfig): void {
    // Answers that actually count toward matching: have a value and aren't invalid.
    const accepted = answers.filter(
      (a) => a.acceptedValue && a.validationStatus !== 'invalid',
    );

    for (const answer of answers) {
      if (!answer.acceptedValue || answer.validationStatus === 'invalid') {
        answer.score = config.none;
        continue;
      }

      const normalized = this.normalize(answer.acceptedValue);
      const others = accepted.filter((a) => a !== answer);

      if (others.length === 0) {
        // Only player who answered — everyone else blank.
        answer.score = config.uniqueWinner;
        continue;
      }

      const matchCount = accepted.filter(
        (a) => this.normalize(a.acceptedValue as string) === normalized,
      ).length;

      answer.score = matchCount === 1 ? config.unique : config.shared;
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
