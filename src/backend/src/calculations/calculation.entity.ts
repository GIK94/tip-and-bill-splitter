import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import type { CalculationInput, CalculationResult, SplitMethod } from '../../../shared/calc';

/** A saved, read-only snapshot of a calculation. */
@Entity('calculations')
@Index('IDX_calculations_user_created', ['userId', 'createdAt'])
export class Calculation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @Column({ type: 'varchar', length: 60, nullable: true })
  title: string | null;

  @Column({ type: 'varchar', length: 10 })
  method: SplitMethod;

  @Column({ name: 'total_cents', type: 'int' })
  totalCents: number;

  @Column({ name: 'people_count', type: 'int' })
  peopleCount: number;

  @Column({ type: 'json' })
  input: CalculationInput;

  @Column({ type: 'json' })
  result: CalculationResult;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt: Date;
}
