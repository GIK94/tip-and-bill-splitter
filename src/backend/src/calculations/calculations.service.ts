import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { calculate, CalculationInput } from '../../../shared/calc';
import { Calculation } from './calculation.entity';
import { SaveCalculationDto } from './calculations.dto';

export type CalculationSummary = Pick<Calculation, 'id' | 'title' | 'method' | 'totalCents' | 'peopleCount' | 'createdAt'>;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Every query is scoped to the owner's user ID, so users can only ever reach their own calculations. */
@Injectable()
export class CalculationsService {
  constructor(@InjectRepository(Calculation) private readonly calculations: Repository<Calculation>) {}

  list(userId: number): Promise<CalculationSummary[]> {
    return this.calculations.find({
      select: { id: true, title: true, method: true, totalCents: true, peopleCount: true, createdAt: true },
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async get(userId: number, id: string): Promise<Calculation> {
    // Someone else's calculation is reported exactly like a missing one, so IDs can't be probed.
    const calculation = UUID_RE.test(id) ? await this.calculations.findOneBy({ id, userId }) : null;
    if (!calculation) throw new NotFoundException('Calculation not found.');
    return calculation;
  }

  async remove(userId: number, id: string): Promise<void> {
    const { affected } = UUID_RE.test(id) ? await this.calculations.delete({ id, userId }) : { affected: 0 };
    if (!affected) throw new NotFoundException('Calculation not found.');
  }

  async create(userId: number, dto: SaveCalculationDto): Promise<Calculation> {
    const outcome = calculate(dto.input as CalculationInput);
    if (!outcome.ok) {
      throw new BadRequestException({ statusCode: 400, message: outcome.errors.map((e) => e.message), errors: outcome.errors });
    }
    const saved = await this.calculations.save(
      this.calculations.create({
        userId,
        title: dto.title?.trim() || null,
        method: outcome.input.method,
        totalCents: outcome.result.totalCents,
        peopleCount: outcome.result.shares.length,
        input: outcome.input,
        result: outcome.result,
      }),
    );
    return this.get(userId, saved.id);
  }
}
