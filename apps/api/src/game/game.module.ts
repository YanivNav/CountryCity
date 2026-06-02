import { Module } from '@nestjs/common';
import { GameGateway } from './game.gateway';
import { GameService } from './game.service';
import { ScoringService } from './scoring.service';
import { LetterService } from './letter.service';
import { AuthModule } from '../auth/auth.module';
import { RoomsModule } from '../rooms/rooms.module';

@Module({
  imports: [AuthModule, RoomsModule],
  providers: [GameGateway, GameService, ScoringService, LetterService],
})
export class GameModule {}
