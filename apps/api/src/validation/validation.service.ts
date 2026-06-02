import { Injectable } from '@nestjs/common';
import { DictionaryService } from './dictionary.service';
import { AiValidationService } from './ai-validation.service';

@Injectable()
export class ValidationService {
  constructor(
    private readonly dictionary: DictionaryService,
    private readonly ai: AiValidationService,
  ) {}

  async validate(value: string, category: string, letter: string, language: string) {
    const firstChar = value.trim()[0]?.toLowerCase();
    if (firstChar !== letter.toLowerCase()) {
      return { valid: false, confidence: 'high' as const, reason: 'Wrong starting letter' };
    }

    const standardCategories = ['country', 'city', 'animal', 'plant', 'profession'];
    if (standardCategories.includes(category)) {
      const inDict = await this.dictionary.check(value, category, language);
      if (inDict !== null) return { valid: inDict, confidence: 'high' as const };
    }

    return this.ai.validate(value, category, letter, language);
  }
}
