import { Body, Controller, Delete, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PublicUser } from '../users/user.entity';
import { SaveCalculationDto } from './calculations.dto';
import { CalculationsService } from './calculations.service';

@Controller('calculations')
@UseGuards(JwtAuthGuard)
export class CalculationsController {
  constructor(private readonly calculations: CalculationsService) {}

  @Get()
  list(@CurrentUser() user: PublicUser) {
    return this.calculations.list(user.id);
  }

  @Get(':id')
  get(@CurrentUser() user: PublicUser, @Param('id') id: string) {
    return this.calculations.get(user.id, id);
  }

  @Post()
  create(@CurrentUser() user: PublicUser, @Body() dto: SaveCalculationDto) {
    return this.calculations.create(user.id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: PublicUser, @Param('id') id: string): Promise<void> {
    return this.calculations.remove(user.id, id);
  }
}
