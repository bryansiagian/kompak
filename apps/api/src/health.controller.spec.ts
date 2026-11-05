import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('mengembalikan status ok', () => {
    const controller = new HealthController();
    expect(controller.check()).toEqual({ status: 'ok' });
  });
});
