/**
 * APIDocsPage — Interactive API documentation page for BeetleSense.ai.
 *
 * A custom Swagger-like UI built with React (no swagger-ui dependency).
 * Features:
 *  - Endpoint list with expandable details
 *  - Request/response examples
 *  - "Try it" button for authenticated users
 *  - Copy curl command button
 *  - Language selector (curl, JavaScript, Python)
 */

import { useState, useCallback, useMemo } from 'react';
import { useAuthStore } from '@/stores/authStore';

// ── Types ──────────────────────────────────────────────────────────────────

interface EndpointParam {
  name: string;
  in: 'query' | 'body' | 'header';
  required: boolean;
  type: string;
  description: string;
  default?: string;
}

interface EndpointDef {
  id: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  summary: string;
  description: string;
  tag: string;
  params: EndpointParam[];
  requestBody?: {
    contentType: string;
    example: string;
  };
  responseExample: string;
  responseStatus: number;
  errors: Array<{ status: number; description: string }>;
}

type CodeLang = 'curl' | 'javascript' | 'python';

// ── Endpoint Definitions ───────────────────────────────────────────────────

const ENDPOINTS: EndpointDef[] = [
  {
    id: 'companion-chat',
    method: 'POST',
    path: '/companion-chat',
    summary: 'Stream AI forestry advice (SSE)',
    description:
      'Send a message to the BeetleSense Forest Advisor. The response is streamed back as ' +
      'Server-Sent Events (SSE). The AI performs RAG retrieval against research papers, regulatory ' +
      'documents, and user-specific survey data before answering.\n\n' +
      'SSE Event Types: session, token, citation, confidence, done.\n\n' +
      'Intent Classification: analysis_question, regulatory_lookup, how_to, scenario_request, ' +
      'data_request, general_forestry, out_of_scope.\n\n' +
      'Includes prompt injection detection and domain guardrails.',
    tag: 'AI Companion',
    params: [],
    requestBody: {
      contentType: 'application/json',
      example: JSON.stringify(
        {
          message: 'How do I detect bark beetle infestations early?',
          session_id: '550e8400-e29b-41d4-a716-446655440000',
          parcel_id: '660e8400-e29b-41d4-a716-446655440001',
        },
        null,
        2,
      ),
    },
    responseExample:
      'event: message\n' +
      'data: {"type":"session","data":{"session_id":"abc-123","intent":"analysis_question"}}\n\n' +
      'event: message\n' +
      'data: {"type":"token","data":"Bark beetle infestations can be detected..."}\n\n' +
      'event: message\n' +
      'data: {"type":"confidence","data":{"level":"high","score":0.82}}\n\n' +
      'event: message\n' +
      'data: {"type":"done","data":{"done":true,"sources":["SLU Report 2024"]}}',
    responseStatus: 200,
    errors: [
      { status: 400, description: 'Invalid or missing message' },
      { status: 401, description: 'Missing or expired JWT token' },
      { status: 502, description: 'AI service unavailable' },
    ],
  },
  {
    id: 'parcel-register',
    method: 'POST',
    path: '/parcel-register',
    summary: 'Register a new forestry parcel',
    description:
      'Register a parcel by its Swedish property ID (fastighetsbeteckning). Resolves the property ' +
      'boundary via Lantmateriet API (mock in demo). Requires organisation membership. Duplicates ' +
      'within the same organisation are rejected with 409.',
    tag: 'Parcels',
    params: [],
    requestBody: {
      contentType: 'application/json',
      example: JSON.stringify(
        { fastighets_id: 'VARNAMO KARDA 1:5', name: 'Norra skiftet' },
        null,
        2,
      ),
    },
    responseExample: JSON.stringify(
      {
        data: {
          parcel_id: '770e8400-e29b-41d4-a716-446655440002',
          fastighets_id: 'VARNAMO KARDA 1:5',
          name: 'Norra skiftet',
          status: 'pending',
          area_ha: 42.5,
        },
      },
      null,
      2,
    ),
    responseStatus: 201,
    errors: [
      { status: 400, description: 'Invalid fastighets_id format' },
      { status: 403, description: 'User is not a member of any organisation' },
      { status: 409, description: 'Duplicate fastighets_id in organisation' },
    ],
  },
  {
    id: 'survey-status',
    method: 'GET',
    path: '/survey-status',
    summary: 'Get survey processing status',
    description:
      'Retrieve the current status of a survey including upload progress, per-module analysis ' +
      'status, and aggregate completion percentage. Access is restricted to users within the ' +
      'same organisation as the survey\'s parcel.',
    tag: 'Surveys',
    params: [
      {
        name: 'survey_id',
        in: 'query',
        required: true,
        type: 'uuid',
        description: 'The UUID of the survey to check',
      },
    ],
    responseExample: JSON.stringify(
      {
        data: {
          survey: { id: 'uuid', name: 'Spring 2025 Survey', status: 'processing' },
          modules: [
            { module: 'tree-count', status: 'completed', progress: 100 },
            { module: 'beetle-detection', status: 'running', progress: 45 },
          ],
          progress: { aggregate_percent: 73, completed: 3, failed: 0, total: 5 },
        },
      },
      null,
      2,
    ),
    responseStatus: 200,
    errors: [
      { status: 400, description: 'Missing survey_id parameter' },
      { status: 403, description: 'Access denied to this survey' },
      { status: 404, description: 'Survey not found' },
    ],
  },
  {
    id: 'upload-presign',
    method: 'POST',
    path: '/upload-presign',
    summary: 'Get a presigned URL for file upload',
    description:
      'Generate a presigned upload URL for a survey file. Max 500 MB. URL expires in 1 hour. ' +
      'Accepts GeoTIFF, LiDAR (.las/.laz), shapefiles (.zip), CSV, PDF, JPEG, PNG.',
    tag: 'Uploads',
    params: [],
    requestBody: {
      contentType: 'application/json',
      example: JSON.stringify(
        {
          survey_id: '880e8400-e29b-41d4-a716-446655440003',
          filename: 'drone_orthomosaic.tiff',
          content_type: 'image/tiff',
          file_size_bytes: 157286400,
        },
        null,
        2,
      ),
    },
    responseExample: JSON.stringify(
      {
        data: {
          upload_id: '990e8400-e29b-41d4-a716-446655440004',
          upload_url: 'https://project.supabase.co/storage/v1/upload/sign/surveys/...',
          expires_at: '2025-04-15T11:00:00Z',
        },
      },
      null,
      2,
    ),
    responseStatus: 200,
    errors: [
      { status: 400, description: 'Invalid content type or file size' },
      { status: 403, description: 'No organisation or survey access denied' },
      { status: 404, description: 'Survey not found' },
    ],
  },
  {
    id: 'upload-complete',
    method: 'POST',
    path: '/upload-complete',
    summary: 'Trigger post-upload validation',
    description:
      'Mark an upload as complete and trigger asynchronous validation. The upload status ' +
      'transitions from "pending" to "validating". Only pending uploads can be completed.',
    tag: 'Uploads',
    params: [],
    requestBody: {
      contentType: 'application/json',
      example: JSON.stringify(
        { upload_id: '990e8400-e29b-41d4-a716-446655440004' },
        null,
        2,
      ),
    },
    responseExample: JSON.stringify(
      {
        data: {
          upload_id: '990e8400-e29b-41d4-a716-446655440004',
          status: 'validating',
          message: 'Upload marked as complete. Validation has been triggered.',
        },
      },
      null,
      2,
    ),
    responseStatus: 200,
    errors: [
      { status: 404, description: 'Upload not found' },
      { status: 409, description: 'Upload not in pending state' },
    ],
  },
  {
    id: 'knowledge-search',
    method: 'POST',
    path: '/knowledge-search',
    summary: 'RAG vector search over forestry knowledge',
    description:
      'Search the BeetleSense knowledge base using semantic similarity. Queries are embedded via ' +
      'Google text-embedding-004 and matched against research papers and regulatory documents ' +
      'using pgvector cosine similarity. Results can be filtered by document type and topic tags.',
    tag: 'Knowledge',
    params: [],
    requestBody: {
      contentType: 'application/json',
      example: JSON.stringify(
        {
          query: 'bark beetle detection methods drone survey',
          limit: 5,
          filters: { type: 'research_paper', topic_tags: ['bark_beetle'] },
        },
        null,
        2,
      ),
    },
    responseExample: JSON.stringify(
      {
        data: {
          results: [
            {
              id: 'doc-uuid-1',
              title: 'Bark Beetle Detection Using UAV Imagery',
              source: 'SLU Research Paper 2024',
              similarity: 0.89,
            },
          ],
          sources: ['SLU Research Paper 2024'],
          query: 'bark beetle detection methods drone survey',
          count: 1,
        },
      },
      null,
      2,
    ),
    responseStatus: 200,
    errors: [
      { status: 400, description: 'Missing or too-long query' },
      { status: 401, description: 'Missing authentication' },
    ],
  },
  {
    id: 'parcel-share',
    method: 'POST',
    path: '/parcel-share',
    summary: 'Create share invitation or generate share link',
    description:
      'Two modes:\n' +
      '1. Invite by email: Send parcel_id, email, and role. Auto-accepted for existing users.\n' +
      '2. Generate share link: Send generate_link: true, parcel_id, optional expires_in and password.\n\n' +
      'Also supports GET (list collaborators), PATCH (update role), DELETE (remove collaborator).',
    tag: 'Sharing',
    params: [],
    requestBody: {
      contentType: 'application/json',
      example: JSON.stringify(
        {
          parcel_id: '770e8400-e29b-41d4-a716-446655440002',
          email: 'colleague@example.com',
          role: 'editor',
        },
        null,
        2,
      ),
    },
    responseExample: JSON.stringify(
      {
        data: {
          id: 'share-uuid-1',
          parcel_id: '770e8400-e29b-41d4-a716-446655440002',
          invited_email: 'colleague@example.com',
          role: 'editor',
          status: 'accepted',
        },
      },
      null,
      2,
    ),
    responseStatus: 201,
    errors: [
      { status: 403, description: 'No permission to share' },
      { status: 409, description: 'Already shared with this user' },
    ],
  },
  {
    id: 'alerts-subscribe',
    method: 'POST',
    path: '/alerts-subscribe',
    summary: 'Store push notification subscription',
    description:
      'Register or update a Web Push subscription for the authenticated user. Each device/browser ' +
      'has a unique endpoint. If a subscription with the same endpoint exists, it is updated.',
    tag: 'Notifications',
    params: [],
    requestBody: {
      contentType: 'application/json',
      example: JSON.stringify(
        {
          subscription: {
            endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
            keys: { p256dh: 'BNcRd...', auth: 'tBHI...' },
          },
          preferences: {
            survey_complete: true,
            new_job: true,
            report_shared: false,
          },
        },
        null,
        2,
      ),
    },
    responseExample: JSON.stringify(
      {
        data: {
          subscription_id: 'sub-uuid-1',
          status: 'created',
          preferences: { survey_complete: true, new_job: true, report_shared: false },
        },
      },
      null,
      2,
    ),
    responseStatus: 200,
    errors: [
      { status: 400, description: 'Invalid subscription or preferences format' },
    ],
  },
  {
    id: 'request-quote',
    method: 'POST',
    path: '/request-quote',
    summary: 'Request a contractor quote',
    description:
      'Submit a quote request from a forest owner to a forestry professional. The request is ' +
      'stored in the database. Email notification integration is pending.',
    tag: 'Quotes',
    params: [],
    requestBody: {
      contentType: 'application/json',
      example: JSON.stringify(
        {
          professional_id: 'prof-uuid-1',
          professional_email: 'inspector@forestry.se',
          parcel_id: '770e8400-e29b-41d4-a716-446655440002',
          service_type: 'beetle_inspection',
          preferred_date: '2025-06-15',
          notes: 'Suspected bark beetle damage in the northern section.',
          requester_name: 'Anna Svensson',
          requester_email: 'anna@example.com',
        },
        null,
        2,
      ),
    },
    responseExample: JSON.stringify(
      {
        data: {
          quote_request_id: 'quote-uuid-1',
          status: 'pending',
          created_at: '2025-04-15T10:00:00Z',
        },
      },
      null,
      2,
    ),
    responseStatus: 201,
    errors: [
      { status: 400, description: 'Missing required fields' },
    ],
  },
];

// ── Code Generation ────────────────────────────────────────────────────────

function generateCurl(ep: EndpointDef, baseUrl: string, token: string): string {
  const parts: string[] = [];
  const url = `${baseUrl}${ep.path}`;

  if (ep.method === 'GET' && ep.params.length > 0) {
    const queryStr = ep.params
      .map((p) => `${p.name}=${p.default || `<${p.name}>`}`)
      .join('&');
    parts.push(`curl -X GET "${url}?${queryStr}"`);
  } else {
    parts.push(`curl -X ${ep.method} "${url}"`);
  }

  parts.push(`  -H "Authorization: Bearer ${token || '<YOUR_JWT_TOKEN>'}"`);

  if (ep.requestBody) {
    parts.push(`  -H "Content-Type: ${ep.requestBody.contentType}"`);
    parts.push(`  -d '${ep.requestBody.example.replace(/\n\s*/g, ' ')}'`);
  }

  if (ep.id === 'companion-chat') {
    parts[0] = parts[0].replace('curl -X POST', 'curl -N -X POST');
  }

  return parts.join(' \\\n');
}

function generateJavaScript(ep: EndpointDef, baseUrl: string): string {
  const url = ep.method === 'GET' && ep.params.length > 0
    ? `${baseUrl}${ep.path}?${ep.params.map((p) => `${p.name}=\${${p.name}}`).join('&')}`
    : `${baseUrl}${ep.path}`;

  const isSSE = ep.id === 'companion-chat';

  if (isSSE) {
    return `const response = await fetch(\`${url}\`, {
  method: '${ep.method}',
  headers: {
    'Authorization': \`Bearer \${token}\`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(${ep.requestBody?.example || '{}'}),
});

const reader = response.body.getReader();
const decoder = new TextDecoder();
let buffer = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  buffer += decoder.decode(value, { stream: true });
  const lines = buffer.split('\\n');
  buffer = lines.pop() ?? '';

  for (const line of lines) {
    if (!line.startsWith('data: ')) continue;
    const event = JSON.parse(line.slice(6));
    console.log(event.type, event.data);
  }
}`;
  }

  const fetchOpts: string[] = [
    `  method: '${ep.method}',`,
    `  headers: {`,
    `    'Authorization': \`Bearer \${token}\`,`,
  ];

  if (ep.requestBody) {
    fetchOpts.push(`    'Content-Type': '${ep.requestBody.contentType}',`);
  }

  fetchOpts.push(`  },`);

  if (ep.requestBody) {
    fetchOpts.push(`  body: JSON.stringify(${ep.requestBody.example}),`);
  }

  return `const response = await fetch(\`${url}\`, {\n${fetchOpts.join('\n')}\n});\n\nconst { data } = await response.json();\nconsole.log(data);`;
}

function generatePython(ep: EndpointDef, baseUrl: string): string {
  const url = `${baseUrl}${ep.path}`;
  const lines: string[] = ['import requests', ''];

  if (ep.method === 'GET') {
    const params = ep.params.length > 0
      ? `params={${ep.params.map((p) => `"${p.name}": "${p.default || `<${p.name}>`}"`).join(', ')}}`
      : '';
    lines.push(`response = requests.get(`);
    lines.push(`    "${url}",`);
    lines.push(`    headers={"Authorization": f"Bearer {token}"},`);
    if (params) lines.push(`    ${params},`);
    lines.push(`)`);
  } else {
    lines.push(`response = requests.${ep.method.toLowerCase()}(`);
    lines.push(`    "${url}",`);
    lines.push(`    headers={`);
    lines.push(`        "Authorization": f"Bearer {token}",`);
    if (ep.requestBody) {
      lines.push(`        "Content-Type": "${ep.requestBody.contentType}",`);
    }
    lines.push(`    },`);
    if (ep.requestBody) {
      lines.push(`    json=${ep.requestBody.example.replace(/"/g, '"').replace(/true/g, 'True').replace(/false/g, 'False').replace(/null/g, 'None')},`);
    }
    lines.push(`)`);
  }

  lines.push('');
  lines.push('print(response.json())');

  return lines.join('\n');
}

// ── Components ─────────────────────────────────────────────────────────────

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  POST: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  PATCH: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  DELETE: 'bg-red-500/20 text-red-400 border-red-500/30',
};

function MethodBadge({ method }: { method: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-md text-xs font-mono font-bold border ${METHOD_COLORS[method] || 'bg-gray-500/20 text-gray-400'}`}
      style={{ minWidth: '60px' }}
    >
      {method}
    </span>
  );
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium
                 bg-[var(--surface2)] text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--surface3)]
                 border border-[var(--border)] transition-colors"
      title="Copy to clipboard"
    >
      {copied ? (
        <>
          <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Copied
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          {label || 'Copy'}
        </>
      )}
    </button>
  );
}

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  return (
    <div className="relative group">
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <CopyButton text={code} />
      </div>
      <pre className="bg-[#0a1a0c] border border-[var(--border)] rounded-lg p-4 overflow-x-auto text-sm font-mono text-[var(--text2)] leading-relaxed">
        <code className={`language-${lang}`}>{code}</code>
      </pre>
    </div>
  );
}

function TryItButton({ endpoint, baseUrl, token }: { endpoint: EndpointDef; baseUrl: string; token: string }) {
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTryIt = useCallback(async () => {
    if (!token) {
      setError('You must be logged in to try API calls.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      let url = `${baseUrl}${endpoint.path}`;

      if (endpoint.method === 'GET' && endpoint.params.length > 0) {
        const queryStr = endpoint.params
          .filter((p) => p.default)
          .map((p) => `${p.name}=${encodeURIComponent(p.default!)}`)
          .join('&');
        if (queryStr) url += `?${queryStr}`;
      }

      const opts: RequestInit = {
        method: endpoint.method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      };

      if (endpoint.requestBody && endpoint.method !== 'GET') {
        opts.body = endpoint.requestBody.example;
      }

      const res = await fetch(url, opts);

      if (endpoint.id === 'companion-chat') {
        // Read SSE stream
        const reader = res.body?.getReader();
        if (!reader) {
          setResult('No response body');
          return;
        }

        const decoder = new TextDecoder();
        let output = '';
        let buffer = '';

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (line.trim()) {
              output += line + '\n';
            }
          }
        }

        setResult(output || '(empty response)');
      } else {
        const text = await res.text();
        try {
          const parsed = JSON.parse(text);
          setResult(JSON.stringify(parsed, null, 2));
        } catch {
          setResult(text);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }, [endpoint, baseUrl, token]);

  return (
    <div className="mt-4 space-y-3">
      <button
        onClick={handleTryIt}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                   bg-[var(--green)] text-white hover:brightness-110 transition
                   disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Running...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Try it
          </>
        )}
      </button>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {result && (
        <div>
          <h5 className="text-xs font-medium text-[var(--text3)] uppercase tracking-wider mb-2">
            Response
          </h5>
          <CodeBlock code={result} lang="json" />
        </div>
      )}
    </div>
  );
}

function EndpointCard({ endpoint, baseUrl, token }: { endpoint: EndpointDef; baseUrl: string; token: string }) {
  const [expanded, setExpanded] = useState(false);
  const [lang, setLang] = useState<CodeLang>('curl');

  const codeSnippet = useMemo(() => {
    switch (lang) {
      case 'curl':
        return generateCurl(endpoint, baseUrl, token);
      case 'javascript':
        return generateJavaScript(endpoint, baseUrl);
      case 'python':
        return generatePython(endpoint, baseUrl);
    }
  }, [endpoint, baseUrl, token, lang]);

  return (
    <div
      className={`border rounded-xl transition-colors ${
        expanded
          ? 'border-[var(--green)]/30 bg-[var(--surface)]/50'
          : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border2)]'
      }`}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <MethodBadge method={endpoint.method} />
        <span className="font-mono text-sm text-[var(--text)] flex-1">{endpoint.path}</span>
        <span className="text-sm text-[var(--text3)] hidden sm:block max-w-xs truncate">
          {endpoint.summary}
        </span>
        <svg
          className={`w-5 h-5 text-[var(--text3)] transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-5 border-t border-[var(--border)]">
          {/* Description */}
          <div className="pt-4">
            <p className="text-sm text-[var(--text2)] whitespace-pre-line leading-relaxed">
              {endpoint.description}
            </p>
          </div>

          {/* Parameters */}
          {endpoint.params.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-[var(--text3)] uppercase tracking-wider mb-2">
                Parameters
              </h4>
              <div className="border border-[var(--border)] rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[var(--surface2)]">
                      <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text3)] uppercase">Name</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text3)] uppercase">In</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text3)] uppercase">Type</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text3)] uppercase">Required</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text3)] uppercase">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {endpoint.params.map((p) => (
                      <tr key={p.name} className="border-t border-[var(--border)]">
                        <td className="px-3 py-2 font-mono text-[var(--text)]">{p.name}</td>
                        <td className="px-3 py-2 text-[var(--text2)]">{p.in}</td>
                        <td className="px-3 py-2 text-[var(--text2)]">{p.type}</td>
                        <td className="px-3 py-2">
                          {p.required ? (
                            <span className="text-amber-400 text-xs font-medium">required</span>
                          ) : (
                            <span className="text-[var(--text3)] text-xs">optional</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-[var(--text2)]">{p.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Request body */}
          {endpoint.requestBody && (
            <div>
              <h4 className="text-xs font-medium text-[var(--text3)] uppercase tracking-wider mb-2">
                Request Body
              </h4>
              <CodeBlock code={endpoint.requestBody.example} lang="json" />
            </div>
          )}

          {/* Response example */}
          <div>
            <h4 className="text-xs font-medium text-[var(--text3)] uppercase tracking-wider mb-2">
              Response ({endpoint.responseStatus})
            </h4>
            <CodeBlock code={endpoint.responseExample} lang={endpoint.id === 'companion-chat' ? 'text' : 'json'} />
          </div>

          {/* Error responses */}
          {endpoint.errors.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-[var(--text3)] uppercase tracking-wider mb-2">
                Error Responses
              </h4>
              <div className="space-y-1">
                {endpoint.errors.map((err) => (
                  <div key={err.status} className="flex items-center gap-3 text-sm">
                    <span className="font-mono text-red-400 font-medium w-8">{err.status}</span>
                    <span className="text-[var(--text2)]">{err.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Code snippets */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-medium text-[var(--text3)] uppercase tracking-wider">
                Code Example
              </h4>
              <div className="flex items-center gap-1 bg-[var(--surface2)] rounded-lg p-0.5 border border-[var(--border)]">
                {(['curl', 'javascript', 'python'] as CodeLang[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                      lang === l
                        ? 'bg-[var(--green)] text-white'
                        : 'text-[var(--text3)] hover:text-[var(--text)]'
                    }`}
                  >
                    {l === 'javascript' ? 'JS' : l.charAt(0).toUpperCase() + l.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <CodeBlock code={codeSnippet} lang={lang === 'javascript' ? 'js' : lang} />
            <div className="mt-2 flex gap-2">
              <CopyButton text={codeSnippet} label="Copy code" />
              {lang === 'curl' && <CopyButton text={codeSnippet} label="Copy curl" />}
            </div>
          </div>

          {/* Try it */}
          {token && <TryItButton endpoint={endpoint} baseUrl={baseUrl} token={token} />}
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function APIDocsPage() {
  const { session } = useAuthStore();
  const token = session?.access_token || '';
  const [search, setSearch] = useState('');
  const [filterTag, setFilterTag] = useState<string | null>(null);

  const baseUrl = import.meta.env.VITE_SUPABASE_URL
    ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
    : 'http://localhost:54321/functions/v1';

  const tags = useMemo(() => {
    const tagSet = new Set(ENDPOINTS.map((e) => e.tag));
    return Array.from(tagSet);
  }, []);

  const filteredEndpoints = useMemo(() => {
    return ENDPOINTS.filter((ep) => {
      if (filterTag && ep.tag !== filterTag) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          ep.path.toLowerCase().includes(q) ||
          ep.summary.toLowerCase().includes(q) ||
          ep.tag.toLowerCase().includes(q) ||
          ep.description.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [search, filterTag]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text)]">API Documentation</h1>
        <p className="mt-2 text-sm text-[var(--text2)]">
          BeetleSense.ai REST API reference. All endpoints require a Supabase Auth JWT token
          passed as <code className="px-1.5 py-0.5 bg-[var(--surface2)] rounded text-xs font-mono">Authorization: Bearer &lt;token&gt;</code>.
        </p>
        <div className="mt-3 flex items-center gap-3 text-xs text-[var(--text3)]">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Base URL: <code className="font-mono">{baseUrl}</code>
          </span>
          {token && (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              Authenticated (Try it enabled)
            </span>
          )}
        </div>
      </div>

      {/* Auth info */}
      <div className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-2">Authentication</h2>
        <p className="text-sm text-[var(--text2)] mb-3">
          Obtain a JWT token via Supabase Auth, then include it in every request:
        </p>
        <CodeBlock
          code={`// Using Supabase JS client
const { data } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password',
});
const token = data.session.access_token;

// Then include in requests
fetch(url, {
  headers: { 'Authorization': \`Bearer \${token}\` }
});`}
          lang="javascript"
        />
      </div>

      {/* Search & filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text3)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search endpoints..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)]
                       text-sm text-[var(--text)] placeholder-[var(--text3)]
                       focus:outline-none focus:ring-2 focus:ring-[var(--green)]/40 focus:border-[var(--green)]
                       transition-colors"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFilterTag(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterTag === null
                ? 'bg-[var(--green)] text-white'
                : 'bg-[var(--surface)] text-[var(--text3)] border border-[var(--border)] hover:text-[var(--text)]'
            }`}
          >
            All
          </button>
          {tags.map((tag) => (
            <button
              key={tag}
              onClick={() => setFilterTag(filterTag === tag ? null : tag)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterTag === tag
                  ? 'bg-[var(--green)] text-white'
                  : 'bg-[var(--surface)] text-[var(--text3)] border border-[var(--border)] hover:text-[var(--text)]'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Endpoints */}
      <div className="space-y-3">
        {filteredEndpoints.length === 0 ? (
          <div className="text-center py-12 text-[var(--text3)]">
            <p className="text-sm">No endpoints match your search.</p>
          </div>
        ) : (
          filteredEndpoints.map((ep) => (
            <EndpointCard key={ep.id} endpoint={ep} baseUrl={baseUrl} token={token} />
          ))
        )}
      </div>

      {/* Worker API section */}
      <div className="pt-6 border-t border-[var(--border)]">
        <h2 className="text-lg font-semibold text-[var(--text)] mb-2">Worker API (Internal)</h2>
        <p className="text-sm text-[var(--text2)] mb-4">
          The BullMQ worker process exposes health and metrics endpoints on port 3002.
          These are for infrastructure monitoring only (Kubernetes probes, Prometheus).
        </p>
        <div className="space-y-2">
          {[
            { method: 'GET', path: '/health', desc: 'Liveness probe -- Redis, Supabase, memory, queue counts' },
            { method: 'GET', path: '/ready', desc: 'Readiness probe -- all dependencies reachable' },
            { method: 'GET', path: '/health/ready', desc: 'Readiness alias (Kubernetes compatibility)' },
            { method: 'GET', path: '/health/metrics', desc: 'Prometheus-compatible metrics (text/plain)' },
          ].map((ep) => (
            <div
              key={ep.path}
              className="flex items-center gap-3 p-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg"
            >
              <MethodBadge method={ep.method} />
              <span className="font-mono text-sm text-[var(--text)]">{ep.path}</span>
              <span className="text-sm text-[var(--text3)] hidden sm:block">{ep.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Rate limits */}
      <div className="pt-6 border-t border-[var(--border)]">
        <h2 className="text-lg font-semibold text-[var(--text)] mb-2">Rate Limits</h2>
        <div className="border border-[var(--border)] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--surface2)]">
                <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text3)] uppercase">Endpoint</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text3)] uppercase">Limit</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text3)] uppercase">Window</th>
              </tr>
            </thead>
            <tbody className="text-[var(--text2)]">
              {[
                { ep: '/companion-chat', limit: '30 requests', window: '1 minute' },
                { ep: '/knowledge-search', limit: '60 requests', window: '1 minute' },
                { ep: '/upload-presign', limit: '20 requests', window: '1 minute' },
                { ep: 'All others', limit: '120 requests', window: '1 minute' },
              ].map((row) => (
                <tr key={row.ep} className="border-t border-[var(--border)]">
                  <td className="px-4 py-2 font-mono">{row.ep}</td>
                  <td className="px-4 py-2">{row.limit}</td>
                  <td className="px-4 py-2">{row.window}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
