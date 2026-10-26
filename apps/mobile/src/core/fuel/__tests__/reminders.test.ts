import { cancelLegacyFuelDraftReminders } from '../reminders';

describe('cancelLegacyFuelDraftReminders', () => {
  it('cancela os avisos de rascunho que uma versão anterior agendou', async () => {
    const replaceScheduled = jest.fn(async () => true);
    await cancelLegacyFuelDraftReminders({ replaceScheduled });
    expect(replaceScheduled).toHaveBeenCalledWith('fuel-draft:', []);
  });
});
