import { Module } from '@nestjs/common';
import { ValidationService } from './validation.service';
import { DictionaryService } from './dictionary.service';
import { AiValidationService } from './ai-validation.service';

@Module({
  providers: [ValidationService, DictionaryService, AiValidationService],
  exports: [ValidationService],
})
export class ValidationModule {}
