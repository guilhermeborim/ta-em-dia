import { Injectable } from '@nestjs/common';
import { FeatureFlags, Plan, flagsFor } from '@ta-em-dia/shared';

@Injectable()
export class AppConfigService {
  // Fase 1: só padrões do pacote shared. Depois: sobrescrever pela tabela feature_flags.
  flags(plan: Plan): FeatureFlags {
    return flagsFor(plan);
  }
}
