/**
 * OpenAPI specification generator for BeetleSense platform.
 *
 * Covers:
 *  - All Supabase Edge Functions (public API)
 *  - Worker internal health/metrics endpoints
 *
 * Run: npx tsx src/openapi.ts > openapi.json
 */

export interface WorkerOpenAPISpec {
  openapi: string;
  info: { title: string; version: string; description: string };
  servers: Array<{ url: string; description: string; variables?: Record<string, { default: string; description: string }> }>;
  tags: Array<{ name: string; description: string }>;
  paths: Record<string, Record<string, unknown>>;
  components: Record<string, unknown>;
  security: Array<Record<string, unknown[]>>;
}

function buildSpec(): WorkerOpenAPISpec {
  const healthPort = parseInt(process.env.HEALTH_PORT || '3002', 10);

  return {
    openapi: '3.1.0',
    info: {
      title: 'BeetleSense API',
      version: '1.0.0',
      description:
        'AI-powered forest intelligence platform for bark beetle detection, forest health monitoring, ' +
        'and timber valuation. Combines Supabase Edge Functions (public API) with internal worker ' +
        'health/metrics endpoints.',
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
        url: `http://localhost:${healthPort}`,
        description: 'Worker health/metrics (internal)',
      },
    ],
    tags: [
      { name: 'AI Companion', description: 'Streaming AI chat with RAG retrieval' },
      { name: 'Parcels', description: 'Forest parcel registration and management' },
      { name: 'Surveys', description: 'Survey lifecycle and status tracking' },
      { name: 'Uploads', description: 'Presigned file uploads and post-upload processing' },
      { name: 'Knowledge', description: 'RAG vector search over research/regulatory documents' },
      { name: 'Sharing', description: 'Parcel collaboration and sharing' },
      { name: 'Notifications', description: 'Push notification subscriptions' },
      { name: 'Quotes', description: 'Contractor quote requests' },
      { name: 'Health', description: 'Worker health, readiness, and Prometheus metrics' },
    ],
    paths: {
      // ── Edge Functions ──────────────────────────────────────────────────

      '/companion-chat': {
        post: {
          tags: ['AI Companion'],
          operationId: 'companionChat',
          summary: 'Stream AI forestry advice (SSE)',
          description:
            'Send a message to the BeetleSense Forest Advisor. Response streams as SSE events: ' +
            'session, token, citation, confidence, done. Performs RAG retrieval against research ' +
            'papers, regulatory docs, and user survey data. Includes intent classification, ' +
            'prompt injection detection, and domain guardrails.',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CompanionChatRequest' },
                examples: {
                  basic: {
                    summary: 'Basic forestry question',
                    value: { message: 'How do I detect bark beetle infestations early?' },
                  },
                  withContext: {
                    summary: 'Question with parcel context',
                    value: {
                      message: 'What does my latest survey show?',
                      session_id: '550e8400-e29b-41d4-a716-446655440000',
                      parcel_id: '660e8400-e29b-41d4-a716-446655440001',
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'SSE stream of AI response tokens',
              content: { 'text/event-stream': { schema: { type: 'string' } } },
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '405': { $ref: '#/components/responses/MethodNotAllowed' },
            '500': { $ref: '#/components/responses/InternalError' },
            '502': { description: 'AI service (Claude/Google) unavailable' },
          },
        },
      },

      '/parcel-register': {
        post: {
          tags: ['Parcels'],
          operationId: 'registerParcel',
          summary: 'Register a new forestry parcel',
          description:
            'Register a parcel by Swedish fastighetsbeteckning. Resolves boundary via Lantmateriet API ' +
            '(mock in demo). Requires organisation membership. Rejects duplicates within the same org (409).',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ParcelRegisterRequest' },
                example: { fastighets_id: 'VARNAMO KARDA 1:5', name: 'Norra skiftet' },
              },
            },
          },
          responses: {
            '201': {
              description: 'Parcel created',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ParcelRegisterResponse' },
                },
              },
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '403': { description: 'User not in any organisation' },
            '409': { description: 'Duplicate fastighets_id in organisation' },
            '500': { $ref: '#/components/responses/InternalError' },
          },
        },
      },

      '/survey-status': {
        get: {
          tags: ['Surveys'],
          operationId: 'getSurveyStatus',
          summary: 'Get survey processing status',
          description:
            'Returns survey metadata, uploads, per-module analysis progress, and aggregate ' +
            'completion percentage. Requires organisation access.',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'survey_id',
              in: 'query',
              required: true,
              schema: { type: 'string', format: 'uuid' },
              description: 'UUID of the survey',
            },
          ],
          responses: {
            '200': {
              description: 'Survey status with modules and uploads',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SurveyStatusResponse' },
                },
              },
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '403': { description: 'Access denied to this survey' },
            '404': { description: 'Survey not found' },
            '500': { $ref: '#/components/responses/InternalError' },
          },
        },
      },

      '/upload-presign': {
        post: {
          tags: ['Uploads'],
          operationId: 'getPresignedUploadUrl',
          summary: 'Get a presigned URL for file upload',
          description:
            'Generate a presigned URL for uploading a survey file. Max 500 MB. URL expires in 1 hour. ' +
            'Accepts GeoTIFF, LiDAR, shapefiles, CSV, PDF, JPEG, PNG.',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UploadPresignRequest' },
                example: {
                  survey_id: '880e8400-e29b-41d4-a716-446655440003',
                  filename: 'drone_orthomosaic.tiff',
                  content_type: 'image/tiff',
                  file_size_bytes: 157286400,
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Presigned upload URL',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/UploadPresignResponse' },
                },
              },
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '403': { description: 'No organisation or survey access denied' },
            '404': { description: 'Survey not found' },
            '500': { $ref: '#/components/responses/InternalError' },
          },
        },
      },

      '/upload-complete': {
        post: {
          tags: ['Uploads'],
          operationId: 'completeUpload',
          summary: 'Trigger post-upload validation',
          description:
            'Mark an upload as complete and transition to validating state. Enqueues a validation ' +
            'job on the worker. Only pending uploads can be completed (409 otherwise).',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UploadCompleteRequest' },
                example: { upload_id: '990e8400-e29b-41d4-a716-446655440004' },
              },
            },
          },
          responses: {
            '200': {
              description: 'Upload marked as complete',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/UploadCompleteResponse' },
                },
              },
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '403': { description: 'Access denied to this upload' },
            '404': { description: 'Upload not found' },
            '409': { description: 'Upload not in pending state' },
            '500': { $ref: '#/components/responses/InternalError' },
          },
        },
      },

      '/knowledge-search': {
        post: {
          tags: ['Knowledge'],
          operationId: 'knowledgeSearch',
          summary: 'RAG vector search over forestry knowledge',
          description:
            'Search the knowledge base using semantic similarity. Queries are embedded via ' +
            'Google text-embedding-004 and matched against research_embeddings and ' +
            'regulatory_embeddings tables using pgvector cosine similarity.',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/KnowledgeSearchRequest' },
                examples: {
                  basic: {
                    summary: 'Search for bark beetle info',
                    value: { query: 'bark beetle detection methods', limit: 5 },
                  },
                  filtered: {
                    summary: 'Filtered search',
                    value: {
                      query: 'EUDR compliance',
                      limit: 10,
                      filters: { type: 'regulatory', topic_tags: ['eudr'] },
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Search results ranked by similarity',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/KnowledgeSearchResponse' },
                },
              },
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '500': { $ref: '#/components/responses/InternalError' },
          },
        },
      },

      '/parcel-share': {
        get: {
          tags: ['Sharing'],
          operationId: 'listParcelCollaborators',
          summary: 'List collaborators, shared parcels, or accept share link',
          description:
            'Three modes: ?parcel_id=<uuid> lists collaborators, ?shared_with_me=true lists ' +
            'parcels shared with calling user, ?token=<token> accepts a share invitation.',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'parcel_id', in: 'query', schema: { type: 'string', format: 'uuid' } },
            { name: 'shared_with_me', in: 'query', schema: { type: 'string', enum: ['true'] } },
            { name: 'token', in: 'query', schema: { type: 'string' } },
          ],
          responses: {
            '200': { description: 'Collaborator list or shared parcels' },
            '400': { $ref: '#/components/responses/BadRequest' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '403': { description: 'No permission' },
            '404': { description: 'Invalid share link' },
            '410': { description: 'Share link expired' },
          },
        },
        post: {
          tags: ['Sharing'],
          operationId: 'createParcelShare',
          summary: 'Create share invitation or generate share link',
          description:
            'Invite by email (parcel_id + email + role) or generate a share link ' +
            '(generate_link: true). Supports optional password and expiration.',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ShareInviteRequest' },
                examples: {
                  invite: {
                    summary: 'Invite by email',
                    value: { parcel_id: 'uuid', email: 'user@example.com', role: 'editor' },
                  },
                  link: {
                    summary: 'Generate share link',
                    value: { parcel_id: 'uuid', generate_link: true, expires_in: '7d' },
                  },
                },
              },
            },
          },
          responses: {
            '201': { description: 'Share created' },
            '400': { $ref: '#/components/responses/BadRequest' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '403': { description: 'No permission to share' },
            '409': { description: 'Already shared' },
            '500': { $ref: '#/components/responses/InternalError' },
          },
        },
        patch: {
          tags: ['Sharing'],
          operationId: 'updateParcelShare',
          summary: 'Update collaborator role',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['share_id', 'role'],
                  properties: {
                    share_id: { type: 'string', format: 'uuid' },
                    role: { type: 'string', enum: ['viewer', 'commenter', 'editor', 'admin'] },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Share updated' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '403': { description: 'No permission' },
            '404': { description: 'Share not found' },
          },
        },
        delete: {
          tags: ['Sharing'],
          operationId: 'removeParcelShare',
          summary: 'Remove collaborator',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['share_id'],
                  properties: { share_id: { type: 'string', format: 'uuid' } },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Collaborator removed' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '403': { description: 'No permission' },
            '404': { description: 'Share not found' },
          },
        },
      },

      '/alerts-subscribe': {
        post: {
          tags: ['Notifications'],
          operationId: 'alertsSubscribe',
          summary: 'Store push notification subscription',
          description:
            'Register or update a Web Push subscription. Each device/browser has a unique endpoint. ' +
            'Preferences control which notification types the user receives.',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AlertsSubscribeRequest' },
                example: {
                  subscription: {
                    endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
                    keys: { p256dh: 'BNcRd...', auth: 'tBHI...' },
                  },
                  preferences: { survey_complete: true, new_job: true, report_shared: false },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Subscription stored or updated' },
            '400': { $ref: '#/components/responses/BadRequest' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '500': { $ref: '#/components/responses/InternalError' },
          },
        },
      },

      '/request-quote': {
        post: {
          tags: ['Quotes'],
          operationId: 'requestQuote',
          summary: 'Request a contractor quote',
          description:
            'Submit a quote request from a forest owner to a forestry professional. ' +
            'Stored in quote_requests table. Email notification integration pending.',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RequestQuoteRequest' },
                example: {
                  professional_id: 'prof-uuid-1',
                  professional_email: 'inspector@forestry.se',
                  parcel_id: 'parcel-uuid',
                  service_type: 'beetle_inspection',
                  preferred_date: '2025-06-15',
                  notes: 'Suspected bark beetle damage.',
                  requester_name: 'Anna Svensson',
                  requester_email: 'anna@example.com',
                },
              },
            },
          },
          responses: {
            '201': { description: 'Quote request created' },
            '400': { $ref: '#/components/responses/BadRequest' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '500': { $ref: '#/components/responses/InternalError' },
          },
        },
      },

      // ── Worker Internal ────────────────────────────────────────────────

      '/health': {
        get: {
          tags: ['Health'],
          operationId: 'healthLiveness',
          summary: 'Liveness probe',
          description:
            'Returns the worker health status including Redis connectivity, Supabase connectivity, ' +
            'memory usage, and per-queue job counts. Returns 200 if Redis is connected, 503 if degraded.',
          responses: {
            '200': {
              description: 'Healthy',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/HealthResponse' },
                  example: {
                    status: 'ok',
                    uptime_seconds: 3600,
                    redis: { connected: true, latency_ms: 2 },
                    supabase: { connected: true, latency_ms: 45 },
                    memory: { rss_mb: 128, heap_used_mb: 64, heap_total_mb: 96, external_mb: 12 },
                    queues: {
                      'survey-processing': { active: 2, waiting: 5, failed: 0 },
                      'upload-validation': { active: 0, waiting: 1, failed: 0 },
                    },
                    timestamp: '2025-04-15T10:00:00.000Z',
                  },
                },
              },
            },
            '503': { description: 'Redis disconnected or worker unhealthy' },
          },
        },
      },

      '/ready': {
        get: {
          tags: ['Health'],
          operationId: 'healthReadiness',
          summary: 'Readiness probe',
          description:
            'Returns ready when Redis, Supabase, and all BullMQ queues are reachable. ' +
            'Returns 503 if any dependency is unavailable.',
          responses: {
            '200': {
              description: 'Ready',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ReadyResponse' },
                  example: {
                    status: 'ready',
                    redis: true,
                    supabase: true,
                    queues: [
                      { name: 'survey-processing', ready: true },
                      { name: 'upload-validation', ready: true },
                    ],
                    timestamp: '2025-04-15T10:00:00.000Z',
                  },
                },
              },
            },
            '503': { description: 'One or more dependencies not ready' },
          },
        },
      },

      '/health/ready': {
        get: {
          tags: ['Health'],
          operationId: 'healthReadinessAlias',
          summary: 'Readiness probe (alias)',
          description: 'Alias for /ready. Provided for Kubernetes compatibility.',
          responses: {
            '200': { description: 'Ready' },
            '503': { description: 'Not ready' },
          },
        },
      },

      '/health/metrics': {
        get: {
          tags: ['Health'],
          operationId: 'healthMetrics',
          summary: 'Prometheus-compatible metrics',
          description:
            'Returns metrics in Prometheus exposition format: per-queue job counters ' +
            '(processed, failed, active, waiting, delayed, completed), Redis memory, ' +
            'Supabase connectivity, process uptime, and heap usage.',
          responses: {
            '200': {
              description: 'Prometheus metrics',
              content: {
                'text/plain; version=0.0.4; charset=utf-8': {
                  schema: { type: 'string' },
                  example:
                    '# HELP beetlesense_jobs_processed_total Total jobs processed successfully\n' +
                    '# TYPE beetlesense_jobs_processed_total counter\n' +
                    'beetlesense_jobs_processed_total{queue="survey-processing"} 142\n' +
                    '# HELP beetlesense_queue_active Number of currently active jobs\n' +
                    '# TYPE beetlesense_queue_active gauge\n' +
                    'beetlesense_queue_active{queue="survey-processing"} 2\n' +
                    '# HELP process_uptime_seconds Uptime of the worker process\n' +
                    '# TYPE process_uptime_seconds gauge\n' +
                    'process_uptime_seconds 3600\n',
                },
              },
            },
            '500': { description: 'Error generating metrics' },
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
          description: 'Supabase Auth JWT. Obtain via supabase.auth.signInWithPassword() or /auth/v1/token.',
        },
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          required: ['error'],
          properties: {
            error: { type: 'string' },
            code: { type: 'string' },
            details: {},
          },
        },
        CompanionChatRequest: {
          type: 'object',
          required: ['message'],
          properties: {
            message: { type: 'string', minLength: 1, maxLength: 4000 },
            session_id: { type: 'string', format: 'uuid' },
            parcel_id: { type: 'string', format: 'uuid' },
          },
        },
        ParcelRegisterRequest: {
          type: 'object',
          required: ['fastighets_id'],
          properties: {
            fastighets_id: { type: 'string', minLength: 3, maxLength: 100 },
            name: { type: 'string' },
          },
        },
        ParcelRegisterResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                parcel_id: { type: 'string', format: 'uuid' },
                fastighets_id: { type: 'string' },
                name: { type: 'string', nullable: true },
                status: { type: 'string', enum: ['pending', 'active', 'archived'] },
                area_ha: { type: 'number' },
                boundary: { type: 'object', description: 'GeoJSON Polygon in SWEREF99 TM' },
              },
            },
          },
        },
        SurveyStatusResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                survey: { type: 'object' },
                uploads: { type: 'array', items: { type: 'object' } },
                modules: { type: 'array', items: { type: 'object' } },
                progress: {
                  type: 'object',
                  properties: {
                    aggregate_percent: { type: 'integer' },
                    completed: { type: 'integer' },
                    failed: { type: 'integer' },
                    total: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
        UploadPresignRequest: {
          type: 'object',
          required: ['survey_id', 'filename', 'content_type', 'file_size_bytes'],
          properties: {
            survey_id: { type: 'string', format: 'uuid' },
            filename: { type: 'string' },
            content_type: { type: 'string' },
            file_size_bytes: { type: 'integer', minimum: 1, maximum: 524288000 },
          },
        },
        UploadPresignResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                upload_id: { type: 'string', format: 'uuid' },
                upload_url: { type: 'string', format: 'uri' },
                expires_at: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
        UploadCompleteRequest: {
          type: 'object',
          required: ['upload_id'],
          properties: {
            upload_id: { type: 'string', format: 'uuid' },
          },
        },
        UploadCompleteResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                upload_id: { type: 'string', format: 'uuid' },
                status: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
        KnowledgeSearchRequest: {
          type: 'object',
          required: ['query'],
          properties: {
            query: { type: 'string', minLength: 1, maxLength: 2000 },
            limit: { type: 'integer', minimum: 1, maximum: 20, default: 5 },
            filters: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                topic_tags: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
        KnowledgeSearchResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                results: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', format: 'uuid' },
                      title: { type: 'string' },
                      content: { type: 'string' },
                      source: { type: 'string' },
                      similarity: { type: 'number' },
                      table: { type: 'string' },
                      metadata: { type: 'object' },
                    },
                  },
                },
                sources: { type: 'array', items: { type: 'string' } },
                query: { type: 'string' },
                count: { type: 'integer' },
              },
            },
          },
        },
        ShareInviteRequest: {
          type: 'object',
          required: ['parcel_id'],
          properties: {
            parcel_id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['viewer', 'commenter', 'editor', 'admin'] },
            generate_link: { type: 'boolean' },
            expires_in: { type: 'string', enum: ['24h', '7d', '30d', 'permanent'] },
            password: { type: 'string' },
          },
        },
        AlertsSubscribeRequest: {
          type: 'object',
          required: ['subscription', 'preferences'],
          properties: {
            subscription: {
              type: 'object',
              required: ['endpoint', 'keys'],
              properties: {
                endpoint: { type: 'string', format: 'uri' },
                expirationTime: { type: 'integer', nullable: true },
                keys: {
                  type: 'object',
                  required: ['p256dh', 'auth'],
                  properties: {
                    p256dh: { type: 'string' },
                    auth: { type: 'string' },
                  },
                },
              },
            },
            preferences: {
              type: 'object',
              required: ['survey_complete', 'new_job', 'report_shared'],
              properties: {
                survey_complete: { type: 'boolean' },
                new_job: { type: 'boolean' },
                report_shared: { type: 'boolean' },
              },
            },
          },
        },
        RequestQuoteRequest: {
          type: 'object',
          required: ['professional_id', 'professional_email', 'parcel_id', 'service_type'],
          properties: {
            professional_id: { type: 'string', format: 'uuid' },
            professional_email: { type: 'string', format: 'email' },
            parcel_id: { type: 'string', format: 'uuid' },
            service_type: { type: 'string' },
            preferred_date: { type: 'string', format: 'date', nullable: true },
            notes: { type: 'string', maxLength: 2000, nullable: true },
            requester_name: { type: 'string' },
            requester_email: { type: 'string', format: 'email' },
          },
        },
        HealthResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['ok', 'degraded', 'error'] },
            uptime_seconds: { type: 'integer' },
            redis: {
              type: 'object',
              properties: {
                connected: { type: 'boolean' },
                latency_ms: { type: 'integer' },
              },
            },
            supabase: {
              type: 'object',
              properties: {
                connected: { type: 'boolean' },
                latency_ms: { type: 'integer' },
              },
            },
            memory: {
              type: 'object',
              properties: {
                rss_mb: { type: 'integer' },
                heap_used_mb: { type: 'integer' },
                heap_total_mb: { type: 'integer' },
                external_mb: { type: 'integer' },
              },
            },
            queues: {
              type: 'object',
              additionalProperties: {
                type: 'object',
                properties: {
                  active: { type: 'integer' },
                  waiting: { type: 'integer' },
                  failed: { type: 'integer' },
                },
              },
            },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
        ReadyResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['ready', 'not_ready'] },
            redis: { type: 'boolean' },
            supabase: { type: 'boolean' },
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
      responses: {
        BadRequest: {
          description: 'Invalid request body or parameters',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: { error: 'Invalid JSON body' },
            },
          },
        },
        Unauthorized: {
          description: 'Missing or invalid authentication token',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: { error: 'Missing or invalid Authorization header' },
            },
          },
        },
        MethodNotAllowed: {
          description: 'HTTP method not allowed',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: { error: 'Method not allowed' },
            },
          },
        },
        InternalError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: { error: 'Internal server error' },
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  };
}

// Export for programmatic use
export const spec = buildSpec();
export type { WorkerOpenAPISpec as OpenAPISpec };

// CLI: output JSON when run directly
const isMain = typeof require !== 'undefined'
  ? require.main === module
  : process.argv[1]?.endsWith('openapi.ts') || process.argv[1]?.endsWith('openapi.js');

if (isMain) {
  console.log(JSON.stringify(spec, null, 2));
}
