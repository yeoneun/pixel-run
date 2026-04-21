import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';

describe('Sprites API', () => {
  let app: INestApplication;
  let token: string;
  const testKey = 'test-sprite';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const loginRes = await request(app.getHttpServer())
      .post('/admin/login')
      .send({ password: 'admin1234' });
    token = loginRes.body.token;
  });

  afterAll(async () => {
    // 테스트 데이터 정리
    await request(app.getHttpServer())
      .delete(`/admin/sprites/${testKey}`)
      .set('Authorization', `Bearer ${token}`);
    await app.close();
  });

  describe('POST /admin/sprites/:key (Create)', () => {
    it('인증 없이 업로드하면 401을 반환한다', async () => {
      await request(app.getHttpServer())
        .post(`/admin/sprites/${testKey}`)
        .expect(401);
    });

    it('이미지를 업로드한다', async () => {
      // 1x1 PNG 바이너리
      const pngBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64',
      );

      const res = await request(app.getHttpServer())
        .post(`/admin/sprites/${testKey}`)
        .set('Authorization', `Bearer ${token}`)
        .attach('image', pngBuffer, { filename: 'test.png', contentType: 'image/png' })
        .expect(201);

      expect(res.body.key).toBe(testKey);
      expect(res.body.mimeType).toBe('image/png');
    });
  });

  describe('GET /admin/sprites/:key (Read - Meta)', () => {
    it('스프라이트 메타데이터를 조회한다', async () => {
      const res = await request(app.getHttpServer())
        .get(`/admin/sprites/${testKey}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.key).toBe(testKey);
      expect(res.body.mimeType).toBe('image/png');
    });

    it('없는 스프라이트를 조회하면 404를 반환한다', async () => {
      await request(app.getHttpServer())
        .get('/admin/sprites/nonexistent')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  describe('GET /sprites/:key (Read - Image)', () => {
    it('이미지 데이터를 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .get(`/sprites/${testKey}`)
        .expect(200);

      expect(res.headers['content-type']).toContain('image/png');
      expect(res.headers['cache-control']).toContain('max-age=86400');
    });
  });

  describe('POST /admin/sprites/:key (Update - Upsert)', () => {
    it('같은 키로 다시 업로드하면 덮어쓴다', async () => {
      const pngBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64',
      );

      const res = await request(app.getHttpServer())
        .post(`/admin/sprites/${testKey}`)
        .set('Authorization', `Bearer ${token}`)
        .attach('image', pngBuffer, { filename: 'test.png', contentType: 'image/png' })
        .expect(201);

      expect(res.body.key).toBe(testKey);
    });
  });

  describe('DELETE /admin/sprites/:key (Delete)', () => {
    it('스프라이트를 삭제한다', async () => {
      await request(app.getHttpServer())
        .delete(`/admin/sprites/${testKey}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // 삭제 후 조회하면 404
      await request(app.getHttpServer())
        .get(`/admin/sprites/${testKey}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('없는 스프라이트를 삭제하면 404를 반환한다', async () => {
      await request(app.getHttpServer())
        .delete('/admin/sprites/nonexistent')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });
});
