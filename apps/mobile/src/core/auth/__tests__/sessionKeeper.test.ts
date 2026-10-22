import type { SessionOutcome } from '../anonymousSession';
import { createSessionKeeper, retryDelay } from '../sessionKeeper';

describe('retryDelay', () => {
  it('cresce e para em 5 minutos', () => {
    expect([0, 1, 2, 3, 4, 5, 20].map(retryDelay)).toEqual([
      15_000, 30_000, 60_000, 120_000, 300_000, 300_000, 300_000,
    ]);
  });
});

describe('createSessionKeeper', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const setup = (outcomes: SessionOutcome[]) => {
    const ensure = jest.fn(async () => outcomes.shift() ?? 'ready');
    return { ensure, keeper: createSessionKeeper(ensure) };
  };

  it('deu certo de primeira: tenta uma vez e para', async () => {
    const { ensure, keeper } = setup(['ready']);
    keeper.check();
    await jest.advanceTimersByTimeAsync(10 * 60_000);
    expect(ensure).toHaveBeenCalledTimes(1);
  });

  it('API sem resposta: repete com espera crescente até dar certo', async () => {
    const { ensure, keeper } = setup(['retry', 'retry', 'ready']);
    keeper.check();
    await jest.advanceTimersByTimeAsync(0);
    expect(ensure).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(14_999);
    expect(ensure).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(1);
    expect(ensure).toHaveBeenCalledTimes(2);

    await jest.advanceTimersByTimeAsync(30_000);
    expect(ensure).toHaveBeenCalledTimes(3);

    await jest.advanceTimersByTimeAsync(10 * 60_000);
    expect(ensure).toHaveBeenCalledTimes(3);
  });

  it('API recusou o aparelho: não tenta de novo', async () => {
    const { ensure, keeper } = setup(['rejected']);
    keeper.check();
    await jest.advanceTimersByTimeAsync(10 * 60_000);
    expect(ensure).toHaveBeenCalledTimes(1);
  });

  it('stop cancela a próxima tentativa', async () => {
    const { ensure, keeper } = setup(['retry']);
    keeper.check();
    await jest.advanceTimersByTimeAsync(0);
    keeper.stop();
    await jest.advanceTimersByTimeAsync(10 * 60_000);
    expect(ensure).toHaveBeenCalledTimes(1);
  });

  it('voltar ao app (check) tenta já, sem esperar, e não empilha tentativas', async () => {
    const { ensure, keeper } = setup(['retry', 'ready']);
    keeper.check();
    await jest.advanceTimersByTimeAsync(0);
    keeper.check();
    await jest.advanceTimersByTimeAsync(0);
    expect(ensure).toHaveBeenCalledTimes(2);
    await jest.advanceTimersByTimeAsync(10 * 60_000);
    expect(ensure).toHaveBeenCalledTimes(2);
  });

  it('chamar check durante uma tentativa em curso é ignorado', async () => {
    let release: (value: SessionOutcome) => void = () => undefined;
    const ensure = jest.fn(() => new Promise<SessionOutcome>((resolve) => (release = resolve)));
    const keeper = createSessionKeeper(ensure);
    keeper.check();
    keeper.check();
    expect(ensure).toHaveBeenCalledTimes(1);
    release('ready');
    await jest.advanceTimersByTimeAsync(0);
  });
});
