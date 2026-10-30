import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { LIMITS } from '../../../shared/calc';

// These DTOs check shapes and types and cap payload sizes. The business rules (ranges,
// unique names, assigned items…) live in the shared calculation engine, which the service runs.

export class TipDto {
  @IsIn(['percent', 'fixed'])
  type: 'percent' | 'fixed';

  @ValidateIf((tip: TipDto) => tip.type === 'percent')
  @IsInt()
  basisPoints?: number;

  @ValidateIf((tip: TipDto) => tip.type === 'fixed')
  @IsInt()
  cents?: number;
}

export class ItemDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsInt()
  priceCents: number;

  @IsArray()
  @ArrayMaxSize(LIMITS.maxPeople)
  @IsInt({ each: true })
  assignees: number[];
}

export class CalculationInputDto {
  @IsIn(['even', 'itemised'])
  method: 'even' | 'itemised';

  @IsInt()
  billCents: number;

  @IsObject()
  @ValidateNested()
  @Type(() => TipDto)
  tip: TipDto;

  @ValidateIf((input: CalculationInputDto) => input.method === 'even')
  @IsInt()
  peopleCount?: number;

  @ValidateIf((input: CalculationInputDto) => input.method === 'itemised')
  @IsArray()
  @ArrayMaxSize(LIMITS.maxPeople)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  people?: string[];

  @ValidateIf((input: CalculationInputDto) => input.method === 'itemised')
  @IsArray()
  @ArrayMaxSize(LIMITS.maxItems)
  @ValidateNested({ each: true })
  @Type(() => ItemDto)
  items?: ItemDto[];
}

/** Inputs only — results are always calculated on the server. */
export class SaveCalculationDto {
  @IsOptional()
  @IsString()
  @MaxLength(LIMITS.titleMax, { message: `Title must be at most ${LIMITS.titleMax} characters.` })
  title?: string;

  @IsObject()
  @ValidateNested()
  @Type(() => CalculationInputDto)
  input: CalculationInputDto;
}
