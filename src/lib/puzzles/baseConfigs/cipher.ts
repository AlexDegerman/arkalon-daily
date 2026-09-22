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
    roundCount: 4
  },
  {
    generators: ['tri_variable'],
    stepsShown: 4,
    choiceCount: 4,
    timerSeconds: null,
    roundCount: 4
  },
  {
    generators: ['dual_variable'],
    stepsShown: 5,
    choiceCount: 4,
    timerSeconds: null,
    roundCount: 3
  },
  {
    generators: ['alternating', 'tri_variable'],
    stepsShown: 4,
    choiceCount: 5,
    timerSeconds: null,
    roundCount: 5
  },
  {
    generators: ['rule_discovery'],
    stepsShown: 5,
    choiceCount: 4,
    timerSeconds: null,
    roundCount: 3
  },
  {
    generators: ['constrained_choice'],
    stepsShown: 0,
    choiceCount: 4,
    timerSeconds: 15,
    roundCount: 4
  },
  {
    generators: ['dual_variable', 'rule_discovery'],
    stepsShown: 4,
    choiceCount: 5,
    timerSeconds: null,
    roundCount: 4
  },
  {
    generators: ['rule_discovery'],
    stepsShown: 3,
    choiceCount: 4,
    timerSeconds: null,
    roundCount: 3
  },
  {
    generators: ['tri_variable'],
    stepsShown: 5,
    choiceCount: 5,
    timerSeconds: null,
    roundCount: 3
  },
  {
    generators: ['alternating', 'constrained_choice'],
    stepsShown: 4,
    choiceCount: 4,
    timerSeconds: 14,
    roundCount: 5
  },
  {
    generators: ['tri_variable', 'constrained_choice'],
    stepsShown: 3,
    choiceCount: 5,
    timerSeconds: null,
    roundCount: 4
  },
  {
    generators: ['tri_variable', 'rule_discovery'],
    stepsShown: 4,
    choiceCount: 6,
    timerSeconds: null,
    roundCount: 4
  },
  {
    generators: ['dual_variable', 'constrained_choice'],
    stepsShown: 5,
    choiceCount: 5,
    timerSeconds: 13,
    roundCount: 5
  },
  {
    generators: ['dual_variable', 'tri_variable'],
    stepsShown: 3,
    choiceCount: 6,
    timerSeconds: null,
    roundCount: 3
  },
  {
    generators: ['rule_discovery', 'constrained_choice', 'dual_variable'],
    stepsShown: 4,
    choiceCount: 6,
    timerSeconds: 12,
    roundCount: 6
  }
]
