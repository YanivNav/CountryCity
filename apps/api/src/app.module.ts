import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { RoomsModule } from './rooms/rooms.module';
import { GameModule } from './game/game.module';
import { ValidationModule } from './validation/validation.module';

@Module({
  imports: [AuthModule, RoomsModule, GameModule, ValidationModule],
})
export class AppModule {}
