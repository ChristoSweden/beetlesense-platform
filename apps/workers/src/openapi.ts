/**
 * OpenAPI specification generator for BeetleSense platform.
 * Produces an openapi.json covering worker internal APIs and Edge Functions.
 *
 * Run: npx tsx src/openapi.ts > openapi.json
 */

const spec = {
  openapi: '3.1.0',
  info: {
    title: 'BeetleSense API',
    version: '0.1.0',
    description:
      'AI-powered forest intelligence platform for bark beetle detection, forest health monitoring, and timber valuation.',
    contact: {
      name: 'BeetleSense Engineering',
      url: 'https://beetlesense.ai',
    },
    license: {
      name: 'Proprietary',
    },
  },
  servers: [
    {
      url: 'https://{project}.supabase.co/functions/v1',
      description: 'Supabase Edge Functions (production)',
      variables: {
        project: {
          default: 'your-project-ref',
          description: 'Supabase project reference',
        },
      },
    },
    {
      url: 'http://localhost:54321/functions/v1',
      description: 'Local Supabase development',
    },
    {
      url: 'http://localhost:3002',
      description: 'Worker health/metrics (internal)',
    },
  ],
  tags: [
    { name: 'Auth', description: 'Authentication & profiles' },
    { name: 'Parcels', description: 'Forest parcel management' },
    { name: 'Surveys', description: 'Survey lifecycle' },
    { name: 'Uploads', description: 'File upload flow' },
    { name: 'Companion', description: 'AI Companion chat' },
    { name: 'Satellite', description: 'Satellite time series' },
    { name: 'Alerts', description: 'Push notification subscriptions' },
    { name: 'Health', description: 'Worker health & metrics' },
  ],
  paths: {
    // ---------- Edge Functions ----------
    '/parcel-register': {
      post: {
        tags: ['Parcels'],
        operationId: 'registerParcel',
        summary: 'Register a new forest parcel',
        description:
          'Registers a parcel by Swedish fastighetsbeteckning. Fetches geometry from Lantmäteriet and creates the parcel record.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ParcelRegisterRequest' },
              example: {
                designation: 'Värnamo Horda 1:23',
                label: 'Nordskogen',
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Parcel created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Parcel' },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '409': {
            description: 'Parcel already registered for this user',
          },
        },
      },
    },
    '/survey-status': {
      post: {
        tags: ['Surveys'],
        operationId: 'createOrQuerySurvey',
        summary: 'Create a survey or query status',
        description:
          'When action=create, creates a new survey with selected modules. When action=status, returns current survey status.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SurveyRequest' },
              examples: {
                create: {
                  summary: 'Create a new survey',
                  value: {
                    action: 'create',
                    parcel_id: 'uuid-here',
                    modules: ['bark_beetle_detection', 'forest_health', 'timber_volume'],
                    priority: 'normal',
                  },
                },
                status: {
                  summary: 'Query survey status',
                  value: {
                    action: 'status',
                    survey_id: 'uuid-here',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Survey status',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SurveyStatus' },
              },
            },
          },
          '201': {
            description: 'Survey created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Survey' },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/upload-presign': {
      post: {
        tags: ['Uploads'],
        operationId: 'getPresignedUploadUrl',
        summary: 'Get a presigned URL for file upload',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PresignRequest' },
              example: {
                survey_id: 'uuid-here',
                filename: 'DJI_0001.JPG',
                content_type: 'image/jpeg',
                size_bytes: 12582912,
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Presigned upload URL',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PresignResponse' },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '413': { description: 'File too large' },
        },
      },
    },
    '/upload-complete': {
      post: {
        tags: ['Uploads'],
        operationId: 'completeUpload',
        summary: 'Notify server that an upload is complete',
        description: 'Triggers validation and processing pipeline for the uploaded file.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['upload_id'],
                properties: {
                  upload_id: { type: 'string', format: 'uuid' },
                  checksum_sha256: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Upload acknowledged, processing started' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/companion-chat': {
      post: {
        tags: ['Companion'],
        operationId: 'companionChat',
        summary: 'Send a message to the AI Companion',
        description:
          'Sends a user message and returns an AI-generated response about forestry topics. Supports streaming via SSE when stream=true.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CompanionChatRequest' },
              example: {
                message: 'Hur identifierar jag granbarkborre?',
                conversation_id: 'uuid-or-null',
                context: {
                  parcel_id: 'uuid-here',
                  survey_id: 'uuid-here',
                },
                stream: true,
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Chat response (non-streaming)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CompanionChatResponse' },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '429': { description: 'Rate limit exceeded' },
        },
      },
    },
    '/satellite-timeseries': {
      get: {
        tags: ['Satellite'],
        operationId: 'getSatelliteTimeseries',
        summary: 'Get NDVI/EVI time series for a parcel',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'parcel_id',
            in: 'query',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'index',
            in: 'query',
            schema: { type: 'string', enum: ['ndvi', 'evi', 'moisture'], default: 'ndvi' },
          },
          {
            name: 'from',
            in: 'query',
            schema: { type: 'string', format: 'date' },
            description: 'Start date (ISO 8601)',
          },
          {
            name: 'to',
            in: 'query',
            schema: { type: 'string', format: 'date' },
            description: 'End date (ISO 8601)',
          },
        ],
        responses: {
          '200': {
            description: 'Time series data',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    parcel_id: { type: 'string', format: 'uuid' },
                    index: { type: 'string' },
                    series: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          date: { type: 'string', format: 'date' },
                          value: { type: 'number' },
                          cloud_cover: { type: 'number' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/alerts-subscribe': {
      post: {
        tags: ['Alerts'],
        operationId: 'subscribeAlerts',
        summary: 'Subscribe to push notifications',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['subscription'],
                properties: {
                  subscription: {
                    type: 'object',
                    description: 'Web Push subscription object from PushManager.subscribe()',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Subscription saved' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    // ---------- Worker Internal APIs ----------
    '/health': {
      get: {
        tags: ['Health'],
        operationId: 'healthLiveness',
        summary: 'Liveness probe',
        description: 'Returns OK if Redis is connected and the worker process is alive.',
        responses: {
          '200': {
            description: 'Healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    redis: { type: 'string', example: 'connected' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          '503': { description: 'Redis disconnected or worker unhealthy' },
        },
      },
    },
    '/health/ready': {
      get: {
        tags: ['Health'],
        operationId: 'healthReadiness',
        summary: 'Readiness probe',
        description: 'Returns ready when all BullMQ queues are initialized and reachable.',
        responses: {
          '200': {
            description: 'Ready',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ready' },
                    queues: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          name: { type: 'string' },
                          ready: { type: 'boolean' },
                        },
                      },
                    },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          '503': { description: 'One or more queues not ready' },
        },
      },
    },
    '/health/metrics': {
      get: {
        tags: ['Health'],
        operationId: 'healthMetrics',
        summary: 'Prometheus-compatible metrics',
        description:
          'Returns metrics in Prometheus exposition format: jobs processed/failed, queue depths, Redis memory, process uptime.',
        responses: {
          '200': {
            description: 'Prometheus metrics',
            content: {
              'text/plain': {
                schema: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Supabase access token from auth/v1/token',
      },
      apiKey: {
        type: 'apiKey',
        in: 'header',
        name: 'apikey',
        description: 'Supabase anon key',
      },
    },
    schemas: {
      ParcelRegisterRequest: {
        type: 'object',
        required: ['designation'],
        properties: {
          designation: {
            type: 'string',
            description: 'Swedish fastighetsbeteckning (e.g., "Värnamo Horda 1:23")',
          },
          label: {
            type: 'string',
            description: 'Optional friendly name for the parcel',
          },
        },
      },
      Parcel: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          user_id: { type: 'string', format: 'uuid' },
          designation: { type: 'string' },
          label: { type: 'string' },
          geometry: { type: 'object', description: 'GeoJSON Polygon in SWEREF99 TM' },
          area_hectares: { type: 'number' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      SurveyRequest: {
        type: 'object',
        required: ['action'],
        properties: {
          action: { type: 'string', enum: ['create', 'status'] },
          parcel_id: { type: 'string', format: 'uuid' },
          survey_id: { type: 'string', format: 'uuid' },
          modules: {
            type: 'array',
            items: {
              type: 'string',
              enum: [
                'bark_beetle_detection',
                'forest_health',
                'timber_volume',
                'biodiversity',
                'storm_damage',
                'growth_forecast',
              ],
            },
          },
          priority: { type: 'string', enum: ['normal', 'urgent'] },
        },
      },
      Survey: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          parcel_id: { type: 'string', format: 'uuid' },
          status: { type: 'string', enum: ['pending', 'processing', 'completed', 'failed'] },
          modules: { type: 'array', items: { type: 'string' } },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      SurveyStatus: {
        type: 'object',
        properties: {
          survey_id: { type: 'string', format: 'uuid' },
          status: { type: 'string' },
          progress: { type: 'number', minimum: 0, maximum: 100 },
          steps: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                status: { type: 'string', enum: ['pending', 'running', 'done', 'failed'] },
              },
            },
          },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      PresignRequest: {
        type: 'object',
        required: ['survey_id', 'filename', 'content_type', 'size_bytes'],
        properties: {
          survey_id: { type: 'string', format: 'uuid' },
          filename: { type: 'string' },
          content_type: { type: 'string' },
          size_bytes: { type: 'integer' },
        },
      },
      PresignResponse: {
        type: 'object',
        properties: {
          upload_id: { type: 'string', format: 'uuid' },
          presigned_url: { type: 'string', format: 'uri' },
          expires_at: { type: 'string', format: 'date-time' },
        },
      },
      CompanionChatRequest: {
        type: 'object',
        required: ['message'],
        properties: {
          message: { type: 'string', maxLength: 4000 },
          conversation_id: { type: 'string', format: 'uuid', nullable: true },
          context: {
            type: 'object',
            properties: {
              parcel_id: { type: 'string', format: 'uuid' },
              survey_id: { type: 'string', format: 'uuid' },
            },
          },
          stream: { type: 'boolean', default: true },
        },
      },
      CompanionChatResponse: {
        type: 'object',
        properties: {
          conversation_id: { type: 'string', format: 'uuid' },
          message: { type: 'string' },
          citations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                url: { type: 'string', format: 'uri' },
                snippet: { type: 'string' },
              },
            },
          },
        },
      },
    },
    responses: {
      BadRequest: {
        description: 'Invalid request body or parameters',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                error: { type: 'string' },
                details: { type: 'array', items: { type: 'object' } },
              },
            },
          },
        },
      },
      Unauthorized: {
        description: 'Missing or invalid authentication token',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                error: { type: 'string', example: 'Invalid JWT' },
              },
            },
          },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }, { apiKey: [] }],
};

// Output the spec
console.log(JSON.stringify(spec, null, 2));
