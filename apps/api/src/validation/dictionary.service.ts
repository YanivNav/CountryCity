import { Injectable } from '@nestjs/common';

@Injectable()
export class DictionaryService {
  async check(value: string, category: string, language: string): Promise<boolean | null> {
    // TODO: implement wordlist-based dictionary checks
    return null;
  }
}
