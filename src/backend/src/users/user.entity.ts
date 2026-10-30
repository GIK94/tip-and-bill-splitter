import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  name: string;

  /** Stored trimmed and lower-cased; unique. */
  @Column({ type: 'varchar', length: 254, unique: true })
  email: string;

  /** bcrypt hash — the plain password is never stored. */
  @Column({ name: 'password_hash', type: 'varchar', length: 100 })
  passwordHash: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt: Date;
}

export interface PublicUser {
  id: number;
  name: string;
  email: string;
}

export const toPublicUser = (user: User): PublicUser => ({ id: user.id, name: user.name, email: user.email });
