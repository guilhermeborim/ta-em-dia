import { z } from 'zod';

/** Schemas compartilhados: validam formulários no app e DTOs na API. */

export const vehicleTypeSchema = z.enum(['combustion', 'flex', 'electric']);
export const fuelTypeSchema = z.enum(['gasoline', 'ethanol', 'diesel', 'gnv']);

export const vehicleSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1).max(40),
  type: vehicleTypeSchema,
  brand: z.string().max(40).optional(),
  model: z.string().max(60).optional(),
  year: z.number().int().min(1950).max(2100).optional(),
  plate: z.string().max(10).optional(),
  initialKm: z.number().int().nonnegative(),
});

export const fuelEntrySchema = z.object({
  id: z.uuid(),
  vehicleId: z.uuid(),
  date: z.coerce.date(),
  km: z.number().int().nonnegative(),
  fuelType: fuelTypeSchema,
  liters: z.number().positive(),
  pricePerLiter: z.number().positive(),
  total: z.number().positive(),
  fullTank: z.boolean(),
  stationName: z.string().max(80).optional(),
  note: z.string().max(500).optional(),
});

export type Vehicle = z.infer<typeof vehicleSchema>;
export type FuelEntry = z.infer<typeof fuelEntrySchema>;
