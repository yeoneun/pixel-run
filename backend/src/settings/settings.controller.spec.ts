import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';

describe('Settings API', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // 로그인해서 토큰 발급
    const loginRes = await request(app.getHttpServer())
      .post('/admin/login')
      .send({ password: 'admin1234' });
    token = loginRes.body.token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /settings', () => {
    it('설정 목록을 조회한다', async () => {
      const res = await request(app.getHttpServer())
        .get('/settings')
        .expect(200);

      expect(res.body).toHaveProperty('happy_ending_score');
    });
  });

  describe('PATCH /admin/settings', () => {
    it('인증 없이 요청하면 401을 반환한다', async () => {
      await request(app.getHttpServer())
        .patch('/admin/settings')
        .send({ happy_ending_score: '5000' })
        .expect(401);
    });

    it('설정값을 수정한다', async () => {
      const res = await request(app.getHttpServer())
        .patch('/admin/settings')
        .set('Authorization', `Bearer ${token}`)
        .send({ happy_ending_score: '5000' })
        .expect(200);

      expect(res.body.happy_ending_score).toBeDefined();

      // 수정된 값 확인
      const getRes = await request(app.getHttpServer())
        .get('/settings')
        .expect(200);

      expect(getRes.body.happy_ending_score).toBe('5000');
    });

    afterAll(async () => {
      // 원래 값으로 복원
      await request(app.getHttpServer())
        .patch('/admin/settings')
        .set('Authorization', `Bearer ${token}`)
        .send({ happy_ending_score: '10000' });
    });
  });
});
