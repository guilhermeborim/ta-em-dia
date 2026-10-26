import type { NearbyStation } from '../../../core/stations';
import {
  autoStationText,
  matchNearby,
  stationAverageText,
  stationChips,
  stationInputFor,
} from '../models/fuelStation';
import { locationOffer } from '../viewmodels/useNearbyStations';

const shell: NearbyStation = {
  osmId: 'node/1',
  name: 'Shell',
  brand: 'Shell',
  street: 'Av. da Pista',
  lat: -23.5,
  lng: -46.6,
  label: 'Shell · Av. da Pista',
  distanceM: 20,
};
const used: NearbyStation = {
  stationId: '018bcfe5-6800-7000-8000-000000000009',
  osmId: 'node/2',
  name: null,
  brand: null,
  street: 'Rua B',
  lat: -23.501,
  lng: -46.6,
  label: 'Posto · Rua B',
  distanceM: 110,
};
const nearby = [shell, used];
const HERE = { lat: -23.5001, lng: -46.6001 };

describe('stationChips', () => {
  it('no posto sugerido: o segundo mais perto e "Trocar"', () => {
    expect(stationChips('Shell · Av. da Pista', nearby, ['Ipiranga'])).toEqual([
      { label: 'Posto · Rua B', kind: 'station' },
      { label: 'Trocar', kind: 'switch' },
    ]);
  });

  it('no segundo, o primeiro vira o chip; com um posto só, só "Trocar"', () => {
    expect(stationChips('posto · rua b', nearby, [])[0]).toEqual({
      label: 'Shell · Av. da Pista',
      kind: 'station',
    });
    expect(stationChips('Shell · Av. da Pista', [shell], [])).toEqual([
      { label: 'Trocar', kind: 'switch' },
    ]);
  });

  it('campo vazio ou digitado: postos perto primeiro, depois os já usados, filtrados', () => {
    expect(stationChips('', nearby, ['Ipiranga']).map((c) => c.label)).toEqual([
      'Shell · Av. da Pista',
      'Posto · Rua B',
      'Ipiranga',
    ]);
    expect(stationChips('ipi', nearby, ['Ipiranga'])).toEqual([
      { label: 'Ipiranga', kind: 'station' },
    ]);
  });

  it('sem localização: como antes, só os já usados', () => {
    expect(stationChips('', [], ['Ipiranga', 'Shell'])).toEqual([
      { label: 'Ipiranga', kind: 'station' },
      { label: 'Shell', kind: 'station' },
    ]);
  });
});

describe('autoStationText', () => {
  it('preenche o campo vazio com o mais perto', () => {
    expect(autoStationText('', false, nearby)).toBe('Shell · Av. da Pista');
  });

  it('não mexe se a pessoa já mexeu, se o campo tem texto ou se não há posto perto', () => {
    expect(autoStationText('', true, nearby)).toBeNull();
    expect(autoStationText('Ipiranga', false, nearby)).toBeNull();
    expect(autoStationText('', false, [])).toBeNull();
  });
});

describe('stationInputFor', () => {
  const base = { nearby, position: HERE, isToday: true };

  it('posto perto do mapa: leva os dados do mapa, sem a posição da pessoa', () => {
    expect(stationInputFor({ ...base, stationName: 'Shell · Av. da Pista' })).toEqual({
      osmId: 'node/1',
      name: 'Shell',
      brand: 'Shell',
      street: 'Av. da Pista',
      lat: -23.5,
      lng: -46.6,
    });
    expect(matchNearby('SHELL · av. da pista', nearby)).toBe(shell);
  });

  it('posto perto já usado: pelo id', () => {
    expect(stationInputFor({ ...base, stationName: 'Posto · Rua B' })).toEqual({
      id: used.stationId,
    });
  });

  it('digitado: nome e a posição de agora, só se o abastecimento é de hoje', () => {
    expect(stationInputFor({ ...base, stationName: 'Posto do Zé' })).toEqual({
      name: 'Posto do Zé',
      ...HERE,
    });
    expect(stationInputFor({ ...base, stationName: 'Posto do Zé', isToday: false })).toEqual({
      name: 'Posto do Zé',
    });
    expect(stationInputFor({ ...base, stationName: 'Posto do Zé', position: null })).toEqual({
      name: 'Posto do Zé',
    });
  });

  it('editando sem mudar o posto: fica o que já estava', () => {
    const original = { id: '018bcfe5-6800-7000-8000-00000000000a', name: 'Ipiranga' };
    expect(
      stationInputFor({ ...base, nearby: [], original, stationName: 'Ipiranga', isToday: false }),
    ).toEqual({ id: original.id });
    expect(
      stationInputFor({ ...base, nearby: [], original, stationName: 'Shell', isToday: false }),
    ).toEqual({ name: 'Shell' });
  });
});

describe('stationAverageText', () => {
  const rows = [
    { stationId: null, stationName: 'Ipiranga', fuelType: 'gasoline', liters: 20, total: 118 },
    { stationId: null, stationName: 'Ipiranga', fuelType: 'gasoline', liters: 20, total: 120 },
    { stationId: 's1', stationName: 'Shell', fuelType: 'gnv', liters: 10, total: 50 },
  ];

  it('média do combustível escolhido, com quantos abastecimentos', () => {
    expect(stationAverageText(rows, { name: 'Ipiranga' }, 'gasoline')).toBe(
      'Média neste posto: R$ 5,95 o litro de gasolina (2 abastecimentos)',
    );
    expect(stationAverageText(rows, { id: 's1', name: 'Outro' }, 'gnv')).toBe(
      'Média neste posto: R$ 5,00 o litro de GNV (1 abastecimento)',
    );
  });

  it('sem histórico ou sem posto: nada', () => {
    expect(stationAverageText(rows, { name: 'Ipiranga' }, 'ethanol')).toBeNull();
    expect(stationAverageText(rows, { name: ' ' }, 'gasoline')).toBeNull();
  });
});

describe('locationOffer', () => {
  it('nunca perguntou: cartão; depois do "Agora não", só o chip', () => {
    expect(locationOffer(true, 'undetermined', false)).toBe('card');
    expect(locationOffer(true, 'undetermined', true)).toBe('chip');
  });

  it('permitida, recusada de vez, sem módulo, editando ou carregando: nada', () => {
    expect(locationOffer(true, 'granted', false)).toBe('none');
    expect(locationOffer(true, 'denied', false)).toBe('none');
    expect(locationOffer(true, 'unavailable', false)).toBe('none');
    expect(locationOffer(false, 'undetermined', false)).toBe('none');
    expect(locationOffer(true, null, false)).toBe('none');
  });
});
