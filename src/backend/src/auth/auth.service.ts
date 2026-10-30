import { BadRequestException, ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { QueryFailedError, Repository } from 'typeorm';
import { APP_CONFIG, AppConfig } from '../config';
import { PublicUser, toPublicUser, User } from '../users/user.entity';
import { LoginDto, SignupDto } from './auth.dto';

const BCRYPT_COST = 12;
const INVALID_CREDENTIALS = 'Email or password is incorrect.';

interface SessionPayload {
  sub: number;
}

@Injectable()
export class AuthService {
  /** Compared against when the email is unknown, so response time doesn't reveal which emails exist. */
  private readonly dummyHash = bcrypt.hashSync('not-a-real-password-1', BCRYPT_COST);

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async signup(dto: SignupDto): Promise<User> {
    // bcrypt only uses the first 72 bytes; reject longer passwords rather than silently truncate.
    if (Buffer.byteLength(dto.password, 'utf8') > 72) {
      throw new BadRequestException(['Password is too long.']);
    }
    if (await this.users.existsBy({ email: dto.email })) {
      throw new ConflictException(['An account with this email already exists.']);
    }
    const user = this.users.create({
      name: dto.name,
      email: dto.email,
      passwordHash: await bcrypt.hash(dto.password, BCRYPT_COST),
    });
    try {
      return await this.users.save(user);
    } catch (err) {
      // Two sign-ups racing for the same email: the unique index has the final say.
      if (err instanceof QueryFailedError && (err as { code?: string }).code === 'ER_DUP_ENTRY') {
        throw new ConflictException(['An account with this email already exists.']);
      }
      throw err;
    }
  }

  async login(dto: LoginDto): Promise<User> {
    const user = await this.users.findOneBy({ email: dto.email });
    const passwordOk = await bcrypt.compare(dto.password, user?.passwordHash ?? this.dummyHash);
    if (!user || !passwordOk) throw new UnauthorizedException(INVALID_CREDENTIALS);
    return user;
  }

  createSessionToken(user: User): Promise<string> {
    const payload: SessionPayload = { sub: user.id };
    return this.jwt.signAsync(payload, { expiresIn: `${this.config.sessionHours}h` });
  }

  /** Returns the user for a valid session token, or null if missing, invalid, expired or the user is gone. */
  async userFromToken(token: string | undefined): Promise<PublicUser | null> {
    if (!token) return null;
    try {
      const payload = await this.jwt.verifyAsync<SessionPayload>(token, { algorithms: ['HS256'] });
      const user = await this.users.findOneBy({ id: payload.sub });
      return user ? toPublicUser(user) : null;
    } catch {
      return null;
    }
  }
}
