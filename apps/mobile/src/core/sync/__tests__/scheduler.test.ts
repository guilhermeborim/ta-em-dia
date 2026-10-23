import { createSyncScheduler, SYNC_DEBOUNCE_MS, type SyncRunOutcome } from '../scheduler';

/** Relógio manual: `advance` roda os timers que vencem, na ordem, e deixa as promessas terminarem. */
function manualTimers() {
  let now = 0;
  let nextId = 1;
  const pending = new Map<number, { at: number; fn: () => void }>();
  return {
    timers: {
      set: (fn: () => void, ms: number) => {
        const id = nextId++;
        pending.set(id, { at: now + ms, fn });
        return id;
      },
      clear: (id: unknown) => void pending.delete(id as number),
    },
    count: () => pending.size,
    async advance(ms: number) {
      const target = now + ms;
      for (;;) {
        const due = [...pending.entries()]
          .filter(([, t]) => t.at <= target)
          .sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        pending.delete(due[0]);
        now = due[1].at;
        due[1].fn();
        for (let i = 0; i < 10; i++) await Promise.resolve();
      }
      now = target;
    },
  };
}

function setup(outcomes: SyncRunOutcome[]) {
  const clock = manualTimers();
  const run = jest.fn(async () => outcomes.shift() ?? 'done');
  const scheduler = createSyncScheduler(run, clock.timers);
  return { clock, run, scheduler };
}

describe('createSyncScheduler', () => {
  it('várias gravações seguidas viram um sync só, depois da espera', async () => {
    const { clock, run, scheduler } = setup(['done']);
    scheduler.request();
    await clock.advance(1_000);
    scheduler.request();
    await clock.advance(SYNC_DEBOUNCE_MS - 1);
    expect(run).not.toHaveBeenCalled();
    await clock.advance(1_000 + 1);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('immediate roda já, sem esperar', async () => {
    const { clock, run, scheduler } = setup(['done']);
    scheduler.request({ immediate: true });
    await clock.advance(0);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('sem resposta da API: tenta de novo com espera crescente (15 s, 30 s...)', async () => {
    const { clock, run, scheduler } = setup(['retry', 'retry', 'done']);
    scheduler.request({ immediate: true });
    await clock.advance(0);
    expect(run).toHaveBeenCalledTimes(1);
    await clock.advance(14_999);
    expect(run).toHaveBeenCalledTimes(1);
    await clock.advance(1);
    expect(run).toHaveBeenCalledTimes(2);
    await clock.advance(29_999);
    expect(run).toHaveBeenCalledTimes(2);
    await clock.advance(1);
    expect(run).toHaveBeenCalledTimes(3);
    // Deu certo: nada mais agendado.
    expect(clock.count()).toBe(0);
  });

  it('rejected e skipped não repetem sozinhos', async () => {
    for (const outcome of ['rejected', 'skipped'] as const) {
      const { clock, run, scheduler } = setup([outcome]);
      scheduler.request({ immediate: true });
      await clock.advance(10 * 60_000);
      expect(run).toHaveBeenCalledTimes(1);
    }
  });

  it('pedido durante um sync em andamento roda de novo quando ele acaba', async () => {
    const clock = manualTimers();
    let release: () => void = () => undefined;
    const run = jest
      .fn<Promise<SyncRunOutcome>, []>()
      .mockImplementationOnce(() => new Promise((resolve) => (release = () => resolve('done'))))
      .mockResolvedValue('done');
    const scheduler = createSyncScheduler(run, clock.timers);

    scheduler.request({ immediate: true });
    await clock.advance(0);
    expect(run).toHaveBeenCalledTimes(1);
    scheduler.request();
    await clock.advance(SYNC_DEBOUNCE_MS * 2);
    expect(run).toHaveBeenCalledTimes(1);

    release();
    for (let i = 0; i < 10; i++) await Promise.resolve();
    await clock.advance(1);
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('erro inesperado vira nova tentativa, sem derrubar nada', async () => {
    const clock = manualTimers();
    const run = jest
      .fn<Promise<SyncRunOutcome>, []>()
      .mockRejectedValueOnce(new Error('x'))
      .mockResolvedValue('done');
    const scheduler = createSyncScheduler(run, clock.timers);
    scheduler.request({ immediate: true });
    await clock.advance(15_000);
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('stop cancela o que estava agendado; um request depois volta a agendar', async () => {
    const { clock, run, scheduler } = setup(['done', 'done']);
    scheduler.request();
    scheduler.stop();
    await clock.advance(SYNC_DEBOUNCE_MS * 2);
    expect(run).not.toHaveBeenCalled();

    scheduler.request({ immediate: true });
    await clock.advance(0);
    expect(run).toHaveBeenCalledTimes(1);
  });
});
