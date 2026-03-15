import { z } from 'zod'

const geoJsonPolygonSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(z.array(z.tuple([z.number(), z.number()]))).min(1),
})

const geoJsonPointSchema = z.object({
  type: z.literal('Point'),
  coordinates: z.tuple([z.number(), z.number()]),
})

export const parcelRegistrationSchema = z.object({
  name: z
    .string()
    .min(1, 'Parcel name is required')
    .max(200, 'Parcel name must be under 200 characters'),
  description: z.string().max(2000).nullable().optional(),
  geometry: geoJsonPolygonSchema,
  centroid: geoJsonPointSchema.optional(),
  crs: z.enum(['EPSG:3006', 'EPSG:4326']).default('EPSG:4326'),
  county: z.string().max(100).nullable().optional(),
  municipality: z.string().max(100).nullable().optional(),
  propertyDesignation: z.string().max(200).nullable().optional(),
  tags: z.array(z.string().max(50)).max(20).default([]),
})

export type ParcelRegistrationInput = z.infer<typeof parcelRegistrationSchema>

export const parcelUpdateSchema = parcelRegistrationSchema.partial().extend({
  id: z.string().uuid(),
})

export type ParcelUpdateInput = z.infer<typeof parcelUpdateSchema>
