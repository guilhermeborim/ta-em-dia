import { AppConfigService } from './config.service';

describe('AppConfigService', () => {
  it('libera export.pdf só no premium', () => {
    const service = new AppConfigService();
    expect(service.flags('free')['export.pdf']).toBe(false);
    expect(service.flags('premium')['export.pdf']).toBe(true);
  });
});
