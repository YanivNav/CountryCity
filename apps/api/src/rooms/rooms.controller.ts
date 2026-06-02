import { Body, Controller, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  create(@Request() req: any, @Body() dto: CreateRoomDto) {
    return this.roomsService.create(req.user, dto);
  }

  @Get(':code')
  findByCode(@Param('code') code: string) {
    return this.roomsService.findByCode(code);
  }

  @Patch(':code/settings')
  updateSettings(
    @Request() req: any,
    @Param('code') code: string,
    @Body() settings: any,
  ) {
    return this.roomsService.updateSettings(req.user.id, code, settings);
  }

  @Get(':code/history')
  getHistory(@Param('code') code: string) {
    return this.roomsService.getHistory(code);
  }
}
