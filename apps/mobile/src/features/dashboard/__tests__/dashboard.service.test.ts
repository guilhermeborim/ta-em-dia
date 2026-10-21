import { buildMonthSummary } from '../models/dashboard.service';

describe('buildMonthSummary', () => {
  it('projeta o mês e compara com o anterior', () => {
    const summary = buildMonthSummary(300, 600, new Date(2026, 9, 10));
    expect(summary.projection).toBeCloseTo(930);
    expect(summary.vsPreviousPct).toBeCloseTo(-50);
  });
});
