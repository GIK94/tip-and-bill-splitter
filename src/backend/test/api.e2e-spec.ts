import { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { getRepositoryToken } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { configureApp } from '../src/app.setup';
import { AuthModule } from '../src/auth/auth.module';
import { Calculation } from '../src/calculations/calculation.entity';
import { CalculationsModule } from '../src/calculations/calculations.module';
import { AppConfigModule } from '../src/config';
import { User } from '../src/users/user.entity';

/** Minimal in-memory stand-in for the TypeORM repository methods the app uses. */
class InMemoryRepository<T extends { id: unknown; createdAt: Date }> {
  rows: T[] = [];
  constructor(private readonly newId: () => T['id']) {}

  private matches(row: T, where: Partial<T>) {
    return Object.entries(where).every(([k, v]) => row[k as keyof T] === v);
  }
  create(data: Partial<T>): T {
    return { ...data } as T;
  }
  async save(row: T): Promise<T> {
    const saved = { ...row, id: this.newId(), createdAt: new Date() };
    this.rows.push(saved);
    return saved;
  }
  async existsBy(where: Partial<T>) {
    return this.rows.some((r) => this.matches(r, where));
  }
  async findOneBy(where: Partial<T>) {
    return this.rows.find((r) => this.matches(r, where)) ?? null;
  }
  async delete(where: Partial<T>) {
    const before = this.rows.length;
    this.rows = this.rows.filter((r) => !this.matches(r, where));
    return { affected: before - this.rows.length };
  }
  async find({ where }: { where: Partial<T> }) {
    return this.rows.filter((r) => this.matches(r, where)).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}

const itemisedInput = {
  method: 'itemised',
  billCents: 5400,
  tip: { type: 'percent', basisPoints: 2000 },
  people: ['Alice', 'Bob', 'Cara'],
  items: [
    { name: 'Pasta', priceCents: 2000, assignees: [0] },
    { name: 'Steak', priceCents: 2500, assignees: [1] },
    { name: 'Fries', priceCents: 600, assignees: [0, 1, 2] },
  ],
};

describe('API (e2e)', () => {
  let app: INestApplication;
  let users: InMemoryRepository<User>;
  let calculations: InMemoryRepository<Calculation>;
  let nextUserId = 1;

  beforeAll(async () => {
    Object.assign(process.env, {
      JWT_SECRET: 'test-secret-that-is-at-least-32-characters-long',
      DB_HOST: 'unused',
      DB_USER: 'unused',
      DB_PASSWORD: 'unused',
      DB_NAME: 'unused',
    });
    users = new InMemoryRepository<User>(() => nextUserId++);
    calculations = new InMemoryRepository<Calculation>(() => randomUUID());

    const moduleRef = await Test.createTestingModule({
      imports: [AppConfigModule, ThrottlerModule.forRoot([{ ttl: 60_000, limit: 1000 }]), AuthModule, CalculationsModule],
      providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
    })
      .overrideProvider(getRepositoryToken(User))
      .useValue(users)
      .overrideProvider(getRepositoryToken(Calculation))
      .useValue(calculations)
      .compile();

    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApp(app as NestExpressApplication);
    await app.init();
  });

  afterAll(() => app.close());

  const signup = (email: string, password = 'secret123') =>
    request(app.getHttpServer()).post('/api/auth/signup').send({ name: 'Test User', email, password });

  const sessionCookie = (res: request.Response): string => {
    const cookies = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
    const cookie = cookies.find((c) => c.startsWith('tbs_session='));
    if (!cookie) throw new Error('No session cookie set');
    return cookie.split(';')[0];
  };

  describe('auth', () => {
    it('signs up, sets an httpOnly cookie and never returns the password hash', async () => {
      const res = await signup('  Ana@Example.com ').expect(201);
      expect(res.body).toEqual({ user: { id: expect.any(Number), name: 'Test User', email: 'ana@example.com' } });
      const cookie = ([] as string[]).concat(res.headers['set-cookie']).join(';');
      expect(cookie).toMatch(/tbs_session=/);
      expect(cookie).toMatch(/HttpOnly/i);
      expect(cookie).toMatch(/SameSite=Lax/i);
    });

    it('AC-13: stores a bcrypt hash, not the password', () => {
      const stored = users.rows.find((u) => u.email === 'ana@example.com')!;
      expect(stored.passwordHash).toMatch(/^\$2[aby]\$12\$/);
      expect(stored.passwordHash).not.toContain('secret123');
    });

    it('AC-08: rejects duplicate emails (case-insensitive) and weak passwords', async () => {
      await signup('ANA@example.com').expect(409);
      const weak = await signup('weak@example.com', 'short1').expect(400);
      expect(weak.body.message).toContain('Password must be 8–72 characters.');
      await signup('noletters@example.com', '12345678').expect(400);
      await signup('nonumbers@example.com', 'abcdefgh').expect(400);
      await signup('not-an-email').expect(400);
    });

    it('logs in with the right password and gives a generic error otherwise', async () => {
      const ok = await request(app.getHttpServer()).post('/api/auth/login').send({ email: 'ana@example.com', password: 'secret123' }).expect(200);
      expect(sessionCookie(ok)).toBeTruthy();
      const wrong = await request(app.getHttpServer()).post('/api/auth/login').send({ email: 'ana@example.com', password: 'nope12345' }).expect(401);
      const unknown = await request(app.getHttpServer()).post('/api/auth/login').send({ email: 'who@example.com', password: 'nope12345' }).expect(401);
      expect(wrong.body.message).toBe('Email or password is incorrect.');
      expect(unknown.body.message).toBe(wrong.body.message);
    });

    it('reports guests as { user: null } and logged-in users by session', async () => {
      await request(app.getHttpServer()).get('/api/auth/me').expect(200, { user: null });
      const cookie = sessionCookie(await signup('me@example.com'));
      const me = await request(app.getHttpServer()).get('/api/auth/me').set('Cookie', cookie).expect(200);
      expect(me.body.user.email).toBe('me@example.com');
    });

    it('logout clears the session cookie', async () => {
      const res = await request(app.getHttpServer()).post('/api/auth/logout').expect(204);
      expect(([] as string[]).concat(res.headers['set-cookie']).join(';')).toMatch(/tbs_session=;.*Expires=Thu, 01 Jan 1970/);
    });
  });

  describe('calculations', () => {
    let alice: string;
    let bob: string;
    let aliceCalcId: string;

    beforeAll(async () => {
      alice = sessionCookie(await signup('alice@example.com'));
      bob = sessionCookie(await signup('bob@example.com'));
    });

    it('AC-12: requires a valid session (401 without one or with a forged token)', async () => {
      await request(app.getHttpServer()).get('/api/calculations').expect(401);
      await request(app.getHttpServer()).post('/api/calculations').send({ input: itemisedInput }).expect(401);
      await request(app.getHttpServer()).get('/api/calculations').set('Cookie', `${alice}x`).expect(401);
      await request(app.getHttpServer())
        .get('/api/calculations')
        .set('Cookie', 'tbs_session=eyJhbGciOiJub25lIn0.eyJzdWIiOjF9.')
        .expect(401);
    });

    it('saves a calculation with a server-calculated result', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/calculations')
        .set('Cookie', alice)
        .send({ title: '  Friday dinner ', input: itemisedInput })
        .expect(201);
      aliceCalcId = res.body.id;
      expect(res.body.title).toBe('Friday dinner');
      expect(res.body.totalCents).toBe(6480);
      expect(res.body.peopleCount).toBe(3);
      expect(res.body.result.shares.map((s: { totalCents: number }) => s.totalCents)).toEqual([2795, 3431, 254]);
    });

    it('AC-15: rejects a client-supplied result', async () => {
      await request(app.getHttpServer())
        .post('/api/calculations')
        .set('Cookie', alice)
        .send({ input: itemisedInput, result: { totalCents: 1 } })
        .expect(400);
    });

    it('rejects inputs the calculation engine considers invalid', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/calculations')
        .set('Cookie', alice)
        .send({ input: { ...itemisedInput, items: [{ name: 'Pasta', priceCents: 2000, assignees: [] }] } })
        .expect(400);
      expect(res.body.errors).toEqual([{ field: 'items.0.assignees', message: 'Assign this item to at least one person.' }]);
      await request(app.getHttpServer())
        .post('/api/calculations')
        .set('Cookie', alice)
        .send({ input: { ...itemisedInput, billCents: '54.00' } })
        .expect(400);
    });

    it('AC-11: lists only the current user’s calculations', async () => {
      const aliceList = await request(app.getHttpServer()).get('/api/calculations').set('Cookie', alice).expect(200);
      expect(aliceList.body.map((c: { id: string }) => c.id)).toEqual([aliceCalcId]);
      const bobList = await request(app.getHttpServer()).get('/api/calculations').set('Cookie', bob).expect(200);
      expect(bobList.body).toEqual([]);
    });

    it('AC-12: returns 404 for another user’s calculation', async () => {
      await request(app.getHttpServer()).get(`/api/calculations/${aliceCalcId}`).set('Cookie', alice).expect(200);
      await request(app.getHttpServer()).get(`/api/calculations/${aliceCalcId}`).set('Cookie', bob).expect(404);
      await request(app.getHttpServer()).get(`/api/calculations/${randomUUID()}`).set('Cookie', alice).expect(404);
      await request(app.getHttpServer()).get('/api/calculations/not-a-uuid').set('Cookie', alice).expect(404);
    });

    it('AC-20: deletes only the owner’s calculation', async () => {
      await request(app.getHttpServer()).delete(`/api/calculations/${aliceCalcId}`).expect(401);
      await request(app.getHttpServer()).delete(`/api/calculations/${aliceCalcId}`).set('Cookie', bob).expect(404);
      await request(app.getHttpServer()).get(`/api/calculations/${aliceCalcId}`).set('Cookie', alice).expect(200);

      await request(app.getHttpServer()).delete(`/api/calculations/${aliceCalcId}`).set('Cookie', alice).expect(204);
      await request(app.getHttpServer()).get(`/api/calculations/${aliceCalcId}`).set('Cookie', alice).expect(404);
      await request(app.getHttpServer()).delete(`/api/calculations/${aliceCalcId}`).set('Cookie', alice).expect(404);
      await request(app.getHttpServer()).delete('/api/calculations/not-a-uuid').set('Cookie', alice).expect(404);
    });
  });
});
