import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length, Matches, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const normaliseEmail = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value);

export class SignupDto {
  @Transform(trim)
  @IsString()
  @Length(1, 50, { message: 'Name must be 1–50 characters.' })
  name: string;

  @Transform(normaliseEmail)
  @IsEmail({}, { message: 'Enter a valid email address.' })
  @MaxLength(254, { message: 'Email must be at most 254 characters.' })
  email: string;

  @IsString()
  @Length(8, 72, { message: 'Password must be 8–72 characters.' })
  @Matches(/[A-Za-z]/, { message: 'Password must contain at least one letter.' })
  @Matches(/\d/, { message: 'Password must contain at least one number.' })
  password: string;
}

export class LoginDto {
  @Transform(normaliseEmail)
  @IsString()
  @MaxLength(254)
  email: string;

  @IsString()
  @MaxLength(200)
  password: string;
}
