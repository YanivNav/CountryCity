import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';

@Injectable()
export class AiValidationService {
  private readonly client = new Anthropic();

  async validate(value: string, category: string, letter: string, language: string) {
    const prompt = `You are validating an answer in the game "Country City" (Scattergories).

Letter: "${letter.toUpperCase()}"
Category: "${category}"
Answer: "${value}"
Language: ${language}

Is this a valid answer? The answer must start with "${letter.toUpperCase()}" and genuinely fit the category. Be lenient with alternate spellings. Do not penalize minor typos.

Respond with JSON only: { "valid": true/false, "reason": "one sentence" }`;

    const response = await this.client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 100,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
    const parsed = JSON.parse(text);
    return { valid: parsed.valid as boolean, confidence: 'low' as const, reason: parsed.reason as string };
  }
}
