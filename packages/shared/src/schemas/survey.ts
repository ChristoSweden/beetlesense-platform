import { z } from 'zod'
import { AnalysisModule } from '../types/modules'

export const surveyCreationSchema = z.object({
  parcelId: z.string().uuid('Invalid parcel ID'),
  name: z
    .string()
    .min(1, 'Survey name is required')
    .max(200, 'Survey name must be under 200 characters'),
  surveyType: z.enum(['drone', 'smartphone', 'satellite']),
  modules: z
    .array(z.nativeEnum(AnalysisModule))
    .min(1, 'At least one analysis module is required')
    .max(6),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  scheduledAt: z.string().datetime().nullable().optional(),
})

export type SurveyCreationInput = z.infer<typeof surveyCreationSchema>

export const surveyUpdateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  modules: z.array(z.nativeEnum(AnalysisModule)).min(1).max(6).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
})

export type SurveyUpdateInput = z.infer<typeof surveyUpdateSchema>
