import { describe, expect, it } from 'vitest';
import { canAddVehicle, DEFAULT_FLAGS, flagsFor } from '../flags';

describe('canAddVehicle', () => {
  it('sem limite (nulo) sempre cabe', () => {
    expect(canAddVehicle(0, null)).toBe(true);
    expect(canAddVehicle(50, null)).toBe(true);
  });

  it('com limite, cabe até chegar nele', () => {
    expect(canAddVehicle(0, 1)).toBe(true);
    expect(canAddVehicle(1, 1)).toBe(false);
    expect(canAddVehicle(2, 1)).toBe(false);
    expect(canAddVehicle(1, 2)).toBe(true);
  });
});

describe('sync de quem não fez login', () => {
  it('fica desligado em todos os planos até o dono decidir', () => {
    expect(DEFAULT_FLAGS.free['sync.anonymous']).toBe(false);
    expect(DEFAULT_FLAGS.premium['sync.anonymous']).toBe(false);
    expect(flagsFor('free', { 'sync.anonymous': true })['sync.anonymous']).toBe(true);
  });
});

describe('FIPE', () => {
  it('ainda não existe em nenhum plano; a API liga quando lançar', () => {
    expect(DEFAULT_FLAGS.free['fipe.value']).toBe(false);
    expect(DEFAULT_FLAGS.premium['fipe.value']).toBe(false);
    expect(flagsFor('free', { 'fipe.value': true })['fipe.value']).toBe(true);
  });
});

describe('plano grátis', () => {
  it('tem 1 veículo; o premium não tem limite', () => {
    expect(DEFAULT_FLAGS.free['vehicles.max']).toBe(1);
    expect(DEFAULT_FLAGS.premium['vehicles.max']).toBeNull();
  });

  it('a API pode trocar o limite', () => {
    expect(flagsFor('free', { 'vehicles.max': 3 })['vehicles.max']).toBe(3);
  });
});
