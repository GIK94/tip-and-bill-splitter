import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1761700000000 implements MigrationInterface {
  name = 'Init1761700000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE users (
        id INT NOT NULL AUTO_INCREMENT,
        name VARCHAR(50) NOT NULL,
        email VARCHAR(254) NOT NULL,
        password_hash VARCHAR(100) NOT NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (id),
        UNIQUE INDEX UQ_users_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await queryRunner.query(`
      CREATE TABLE calculations (
        id CHAR(36) NOT NULL,
        user_id INT NOT NULL,
        title VARCHAR(60) NULL,
        method VARCHAR(10) NOT NULL,
        total_cents INT NOT NULL,
        people_count INT NOT NULL,
        input JSON NOT NULL,
        result JSON NOT NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (id),
        INDEX IDX_calculations_user_created (user_id, created_at),
        CONSTRAINT FK_calculations_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE calculations');
    await queryRunner.query('DROP TABLE users');
  }
}
