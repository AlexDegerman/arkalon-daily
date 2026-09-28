import 'server-only'

import type { PatternGeneratorId } from '@/types/puzzle'

export interface CipherBaseConfig {
  generators: PatternGeneratorId[]
  stepsShown: number
  choiceCount: number
  timerSeconds: number | null
  roundCount: number
}

export const CIPHER_BASE_CONFIGS: CipherBaseConfig[] = [
  {
    generators: ['alternating'],
    stepsShown: 5,
    choiceCount: 4,
    timerSeconds: null,
    roundCount: 8
  },
  {
    generators: ['tri_variable'],
    stepsShown: 6,
    choiceCount: 4,
    timerSeconds: 15,
    roundCount: 8
  },
  {
    generators: ['dual_variable'],
    stepsShown: 5,
    choiceCount: 4,
    timerSeconds: null,
    roundCount: 7
  },
  {
    generators: ['alternating', 'tri_variable'],
    stepsShown: 6,
    choiceCount: 5,
    timerSeconds: 15,
    roundCount: 9
  },
  {
    generators: ['rule_discovery'],
    stepsShown: 5,
    choiceCount: 4,
    timerSeconds: null,
    roundCount: 8
  },
  {
    generators: ['constrained_choice'],
    stepsShown: 0,
    choiceCount: 4,
    timerSeconds: 16,
    roundCount: 8
  },
  {
    generators: ['dual_variable', 'rule_discovery'],
    stepsShown: 4,
    choiceCount: 5,
    timerSeconds: null,
    roundCount: 9
  },
  {
    generators: ['rule_discovery'],
    stepsShown: 3,
    choiceCount: 4,
    timerSeconds: null,
    roundCount: 7
  },
  {
    generators: ['tri_variable'],
    stepsShown: 6,
    choiceCount: 5,
    timerSeconds: 14,
    roundCount: 8
  },
  {
    generators: ['alternating', 'constrained_choice'],
    stepsShown: 4,
    choiceCount: 4,
    timerSeconds: 16,
    roundCount: 10
  },
  {
    generators: ['tri_variable', 'constrained_choice'],
    stepsShown: 6,
    choiceCount: 5,
    timerSeconds: 16,
    roundCount: 9
  },
  {
    generators: ['tri_variable', 'rule_discovery'],
    stepsShown: 4,
    choiceCount: 6,
    timerSeconds: null,
    roundCount: 9
  },
  {
    generators: ['dual_variable', 'constrained_choice'],
    stepsShown: 5,
    choiceCount: 5,
    timerSeconds: 14,
    roundCount: 10
  },
  {
    generators: ['dual_variable', 'tri_variable'],
    stepsShown: 6,
    choiceCount: 6,
    timerSeconds: 16,
    roundCount: 8
  },
  {
    generators: ['rule_discovery', 'constrained_choice', 'dual_variable'],
    stepsShown: 4,
    choiceCount: 6,
    timerSeconds: 14,
    roundCount: 12
  }
]