/**
 * OpenAPI 3.1 specification for the FoundU API.
 * Served at GET /api/v1/docs/openapi.json
 * Swagger UI at GET /api/v1/docs
 */
export const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'FoundU API',
    version: '1.0.0',
    description:
      'AI-powered campus lost-and-found platform for UMass Amherst. ' +
      'All routes are prefixed with `/api/v1`. Authenticated routes require `Authorization: Bearer <accessToken>`.',
    contact: { name: 'FoundU Team' },
  },
  servers: [
    { url: 'http://localhost:3001/api/v1', description: 'Local development' },
    { url: 'https://api.foundu.app/api/v1', description: 'Production' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      SuccessResponse: {
        type: 'object',
        required: ['success', 'data'],
        properties: {
          success: { type: 'boolean', example: true },
          data: { type: 'object' },
          meta: { type: 'object' },
        },
      },
      ErrorResponse: {
        type: 'object',
        required: ['success', 'error'],
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            required: ['code', 'message'],
            properties: {
              code: { type: 'string', example: 'UNAUTHORIZED' },
              message: { type: 'string' },
              details: { type: 'object' },
            },
          },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          displayName: { type: 'string' },
          avatarUrl: { type: 'string', format: 'uri', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Item: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          type: { type: 'string', enum: ['lost', 'found'] },
          title: { type: 'string' },
          description: { type: 'string', nullable: true },
          category: { type: 'string', nullable: true },
          location: { type: 'string', nullable: true },
          dateOccurred: { type: 'string', format: 'date', nullable: true },
          imageUrl: { type: 'string', format: 'uri', nullable: true },
          thumbnailUrl: { type: 'string', format: 'uri', nullable: true },
          status: { type: 'string', enum: ['active', 'resolved', 'expired'] },
          foundMode: { type: 'string', enum: ['turnin', 'keeper'], nullable: true },
          contactEmail: { type: 'string', format: 'email', nullable: true },
          isAnonymous: { type: 'boolean' },
          aiMetadata: { type: 'object', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Match: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          lostItemId: { type: 'string', format: 'uuid' },
          foundItemId: { type: 'string', format: 'uuid' },
          similarityScore: { type: 'number', minimum: 0, maximum: 1 },
          status: { type: 'string', enum: ['pending', 'confirmed', 'rejected'] },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Claim: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          itemId: { type: 'string', format: 'uuid' },
          claimantId: { type: 'string', format: 'uuid' },
          status: { type: 'string', enum: ['pending', 'approved', 'rejected'] },
          notes: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  paths: {
    // ── Auth ──────────────────────────────────────────────────────────────────
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Exchange Google ID token for JWT pair',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['idToken'],
                properties: { idToken: { type: 'string', description: 'Google OAuth ID token' } },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Authentication successful',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      properties: {
                        data: {
                          type: 'object',
                          properties: {
                            user: { $ref: '#/components/schemas/User' },
                            accessToken: { type: 'string' },
                            refreshToken: { type: 'string' },
                            expiresIn: { type: 'number', example: 900 },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          '401': { description: 'Invalid Google token or non-@umass.edu email' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Rotate refresh token and get new access token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refreshToken'],
                properties: { refreshToken: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          '200': { description: 'New token pair issued' },
          '401': { description: 'Invalid or revoked refresh token' },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Revoke refresh token',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refreshToken'],
                properties: { refreshToken: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Logged out successfully' },
          '401': { description: 'Not authenticated' },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get current user profile',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Current user',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    { properties: { data: { $ref: '#/components/schemas/User' } } },
                  ],
                },
              },
            },
          },
          '401': { description: 'Not authenticated' },
        },
      },
    },

    // ── Items ─────────────────────────────────────────────────────────────────
    '/items/lost': {
      post: {
        tags: ['Items'],
        summary: 'Report a lost item',
        description: 'Accepts multipart/form-data with optional image. Rate limited to 10/hr.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['title'],
                properties: {
                  title: { type: 'string', maxLength: 200 },
                  description: { type: 'string', maxLength: 2000 },
                  category: { type: 'string' },
                  location: { type: 'string', maxLength: 300 },
                  dateLost: { type: 'string', format: 'date' },
                  image: { type: 'string', format: 'binary', description: 'JPEG/PNG/WebP ≤10MB' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Lost item created',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    { properties: { data: { $ref: '#/components/schemas/Item' } } },
                  ],
                },
              },
            },
          },
          '401': { description: 'Not authenticated' },
          '422': { description: 'Validation error' },
          '429': { description: 'Rate limit exceeded' },
        },
      },
    },
    '/items/found': {
      post: {
        tags: ['Items'],
        summary: 'Report a found item',
        description: 'Accepts multipart/form-data with optional image. Rate limited to 10/hr.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['title', 'foundMode'],
                properties: {
                  title: { type: 'string', maxLength: 200 },
                  description: { type: 'string', maxLength: 2000 },
                  category: { type: 'string' },
                  location: { type: 'string', maxLength: 300 },
                  dateFound: { type: 'string', format: 'date' },
                  foundMode: {
                    type: 'string',
                    enum: ['turnin', 'keeper'],
                    description: '`keeper` requires contactEmail',
                  },
                  contactEmail: { type: 'string', format: 'email' },
                  isAnonymous: {
                    type: 'string',
                    enum: ['false'],
                    description: 'Anonymous found posts are not permitted',
                  },
                  image: { type: 'string', format: 'binary' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Found item created' },
          '401': { description: 'Not authenticated' },
          '422': { description: 'Validation error' },
        },
      },
    },
    '/items/feed': {
      get: {
        tags: ['Items'],
        summary: 'Paginated item feed',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['lost', 'found'] } },
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'location', in: 'query', schema: { type: 'string' } },
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['active', 'resolved', 'expired'], default: 'active' },
          },
        ],
        responses: {
          '200': {
            description: 'Paginated items',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        items: { type: 'array', items: { $ref: '#/components/schemas/Item' } },
                        meta: {
                          type: 'object',
                          properties: {
                            page: { type: 'integer' },
                            limit: { type: 'integer' },
                            total: { type: 'integer' },
                            hasMore: { type: 'boolean' },
                            totalPages: { type: 'integer' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/items/search': {
      get: {
        tags: ['Items'],
        summary: 'Semantic text search',
        parameters: [
          { name: 'q', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['lost', 'found'] } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10, maximum: 50 } },
        ],
        responses: {
          '200': { description: 'Ranked results by semantic similarity' },
          '422': { description: 'Validation error' },
        },
      },
    },
    '/items/search/image': {
      post: {
        tags: ['Items'],
        summary: 'Reverse image search',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['image'],
                properties: {
                  image: { type: 'string', format: 'binary' },
                  type: { type: 'string', enum: ['lost', 'found'] },
                  limit: { type: 'integer', default: 10 },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Visually similar items' } },
      },
    },
    '/items/{id}': {
      get: {
        tags: ['Items'],
        summary: 'Get single item',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Item found',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    { properties: { data: { $ref: '#/components/schemas/Item' } } },
                  ],
                },
              },
            },
          },
          '404': { description: 'Item not found' },
        },
      },
    },
    '/items/{id}/status': {
      patch: {
        tags: ['Items'],
        summary: 'Update item status (owner only)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: { type: 'string', enum: ['active', 'resolved', 'expired'] },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Status updated' },
          '403': { description: 'Not the item owner' },
          '404': { description: 'Item not found' },
        },
      },
    },

    // ── AI ────────────────────────────────────────────────────────────────────
    '/ai/vision-analysis': {
      post: {
        tags: ['AI'],
        summary: 'Analyze item image with Gemini',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['imageBase64'],
                properties: {
                  imageBase64: { type: 'string', description: 'Base64-encoded image' },
                  mimeType: { type: 'string', default: 'image/jpeg' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Vision analysis result',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      properties: {
                        data: {
                          type: 'object',
                          properties: {
                            detectedObjects: { type: 'array', items: { type: 'string' } },
                            colors: { type: 'array', items: { type: 'string' } },
                            brand: { type: 'string', nullable: true },
                            condition: { type: 'string' },
                            distinctiveFeatures: { type: 'array', items: { type: 'string' } },
                            category: { type: 'string' },
                            confidence: { type: 'number' },
                            rawDescription: { type: 'string' },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      },
    },
    '/ai/generate-embedding': {
      post: {
        tags: ['AI'],
        summary: 'Generate text-embedding-004 vector (768-dim)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['text'],
                properties: { text: { type: 'string', maxLength: 2048 } },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Embedding vector',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      properties: {
                        data: {
                          type: 'object',
                          properties: {
                            embedding: { type: 'array', items: { type: 'number' }, minItems: 768, maxItems: 768 },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      },
    },

    // ── Matches ───────────────────────────────────────────────────────────────
    '/matches/{itemId}': {
      get: {
        tags: ['Matches'],
        summary: 'Get top AI matches for an item (owner only)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'itemId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Ranked matches with similarity scores' },
          '403': { description: 'Not the item owner' },
          '404': { description: 'Item not found' },
        },
      },
    },
    '/matches/{matchId}/status': {
      patch: {
        tags: ['Matches'],
        summary: 'Confirm or dismiss a match',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'matchId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: { status: { type: 'string', enum: ['confirmed', 'rejected'] } },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Match status updated' },
          '403': { description: 'Not authorized' },
          '404': { description: 'Match not found' },
        },
      },
    },

    // ── Claims ────────────────────────────────────────────────────────────────
    '/claims/create': {
      post: {
        tags: ['Claims'],
        summary: 'Submit an ownership claim with verification answer',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['itemId', 'verificationAnswer'],
                properties: {
                  itemId: { type: 'string', format: 'uuid' },
                  verificationAnswer: { type: 'string', description: 'Answer to AI-generated verification question' },
                  notes: { type: 'string', maxLength: 1000 },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Claim submitted' },
          '409': { description: 'Duplicate claim or cannot claim own item' },
          '422': { description: 'Validation error' },
          '429': { description: 'Rate limit exceeded (10/hr)' },
        },
      },
    },
    '/claims/verify': {
      post: {
        tags: ['Claims'],
        summary: 'Approve or reject a claim (item owner only)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['claimId', 'action'],
                properties: {
                  claimId: { type: 'string', format: 'uuid' },
                  action: { type: 'string', enum: ['approve', 'reject'] },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Claim processed' },
          '403': { description: 'Not the item owner' },
          '404': { description: 'Claim not found' },
        },
      },
    },
    '/claims/item/{itemId}': {
      get: {
        tags: ['Claims'],
        summary: 'List all claims for an item (owner only)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'itemId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Claims list' },
          '403': { description: 'Not the item owner' },
        },
      },
    },

    // ── UCard ─────────────────────────────────────────────────────────────────
    '/ucard/submit': {
      post: {
        tags: ['UCard'],
        summary: 'Submit a found UMass ID card image',
        description:
          'Gemini OCR extracts SPIRE ID + name. SPIRE ID is hashed with Argon2id — never stored raw. Rate limited to 5/hr.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['image'],
                properties: {
                  image: { type: 'string', format: 'binary', description: 'UCard photo' },
                  note: { type: 'string', description: 'Optional finder note' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'UCard processed',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      properties: {
                        data: {
                          type: 'object',
                          properties: {
                            recoveryId: { type: 'string', format: 'uuid' },
                            extracted: {
                              type: 'object',
                              properties: {
                                lastName: { type: 'string', nullable: true },
                                firstName: { type: 'string', nullable: true },
                                isUMassCard: { type: 'boolean' },
                              },
                            },
                            matched: { type: 'boolean' },
                            message: { type: 'string' },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          '422': { description: 'Invalid image or not a UMass card' },
          '429': { description: 'Rate limit exceeded (5/hr)' },
        },
      },
    },
    '/ucard/{recoveryId}': {
      get: {
        tags: ['UCard'],
        summary: 'Get UCard recovery status',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'recoveryId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'Recovery record' },
          '404': { description: 'Not found' },
        },
      },
    },
  },
} as const;

export const swaggerHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>FoundU API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <style>
    body { margin: 0; }
    .swagger-ui .topbar { background: #1a1a2e; }
    .swagger-ui .topbar .download-url-wrapper { display: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: '/api/v1/docs/openapi.json',
      dom_id: '#swagger-ui',
      deepLinking: true,
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
      layout: 'BaseLayout',
      tryItOutEnabled: true,
    });
  </script>
</body>
</html>`;
