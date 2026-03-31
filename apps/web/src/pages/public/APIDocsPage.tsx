import React, { useState } from 'react';
import { Code2, Copy, Check, ChevronRight, BookOpen, Zap, Shield, Globe } from 'lucide-react';

interface APIEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  title: string;
  description: string;
  params?: string[];
  example: string;
  responseExample: string;
  auth: boolean;
}

export default function APIDocsPage() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const endpoints: APIEndpoint[] = [
    {
      method: 'GET',
      path: '/api/v1/parcels',
      title: 'List Forest Parcels',
      description: 'Retrieve all forest parcels for the authenticated user with health metrics.',
      params: ['limit', 'offset', 'sort_by'],
      example: 'curl -H "Authorization: Bearer YOUR_API_KEY" https://api.beetlesense.org/api/v1/parcels',
      responseExample: `{
  "data": [
    {
      "id": "parcel_123",
      "name": "Norrtalje Forest North",
      "hectares": 245.5,
      "health_score": 0.87,
      "last_updated": "2026-03-31T09:15:00Z",
      "boundary": { "type": "Polygon", "coordinates": [...] }
    }
  ],
  "meta": { "total": 42, "limit": 10, "offset": 0 }
}`,
      auth: true,
    },
    {
      method: 'GET',
      path: '/api/v1/parcels/{id}/health',
      title: 'Get Parcel Health Score',
      description: 'Real-time health metrics including NDVI, moisture, growth rate, and beetle risk.',
      params: ['id'],
      example: 'curl https://api.beetlesense.org/api/v1/parcels/parcel_123/health',
      responseExample: `{
  "parcel_id": "parcel_123",
  "timestamp": "2026-03-31T09:15:00Z",
  "metrics": {
    "ndvi": 0.68,
    "moisture_index": 0.71,
    "growth_rate_cm_year": 24.5,
    "beetle_risk_score": 0.12,
    "health_trend": "improving"
  },
  "alerts": []
}`,
      auth: true,
    },
    {
      method: 'POST',
      path: '/api/v1/detections/report',
      title: 'Report Beetle Detection',
      description: 'Submit a new bark beetle detection with field validation and automated classification.',
      params: ['parcel_id', 'latitude', 'longitude', 'severity', 'imagery_url'],
      example: `curl -X POST https://api.beetlesense.org/api/v1/detections/report \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "parcel_id": "parcel_123",
    "latitude": 59.4369,
    "longitude": 18.9724,
    "severity": "moderate",
    "imagery_url": "https://..."
  }'`,
      responseExample: `{
  "detection_id": "det_456",
  "status": "verified",
  "confidence": 0.94,
  "recommended_action": "immediate_inspection",
  "estimated_affected_area_hectares": 12.3,
  "alert_sent_to_stakeholders": true
}`,
      auth: true,
    },
    {
      method: 'GET',
      path: '/api/v1/satellite/history/{parcel_id}',
      title: 'Get Satellite History',
      description: 'Historical Sentinel-2 imagery analysis for a parcel over time.',
      params: ['parcel_id', 'start_date', 'end_date'],
      example: 'curl "https://api.beetlesense.org/api/v1/satellite/history/parcel_123?start_date=2025-01-01&end_date=2026-03-31"',
      responseExample: `{
  "parcel_id": "parcel_123",
  "observations": [
    {
      "date": "2026-03-15",
      "ndvi": 0.65,
      "sentinel_image_url": "https://...",
      "cloud_cover": 0.12
    }
  ],
  "trend_analysis": { "direction": "improving", "monthly_change": 0.03 }
}`,
      auth: true,
    },
    {
      method: 'GET',
      path: '/api/v1/climate/forecast/{parcel_id}',
      title: 'Get Climate Forecast',
      description: 'Integrated climate data with beetle outbreak risk modeling.',
      params: ['parcel_id', 'days_ahead'],
      example: 'curl https://api.beetlesense.org/api/v1/climate/forecast/parcel_123?days_ahead=30',
      responseExample: `{
  "parcel_id": "parcel_123",
  "forecast": [
    {
      "date": "2026-04-01",
      "temp_avg_c": 8.2,
      "precipitation_mm": 12.5,
      "beetle_pressure_index": 0.34
    }
  ],
  "seasonal_outlook": "moderate_risk_april_may"
}`,
      auth: true,
    },
    {
      method: 'POST',
      path: '/api/v1/exports/create',
      title: 'Create Data Export',
      description: 'Generate a comprehensive CSV export of all parcel data and metrics.',
      params: ['parcel_id', 'format', 'include_imagery'],
      example: `curl -X POST https://api.beetlesense.org/api/v1/exports/create \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{ "parcel_id": "parcel_123", "format": "csv", "include_imagery": false }'`,
      responseExample: `{
  "export_id": "exp_789",
  "status": "processing",
  "estimated_completion": "2026-03-31T11:00:00Z",
  "download_url": "https://exports.beetlesense.org/exp_789.csv"
}`,
      auth: true,
    },
  ];

  const methodColor = {
    GET: 'bg-blue-100 text-blue-700',
    POST: 'bg-green-100 text-green-700',
    PUT: 'bg-yellow-100 text-yellow-700',
    DELETE: 'bg-red-100 text-red-700',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
      {/* Header */}
      <div className="border-b border-blue-200 bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center gap-4">
            <Code2 className="w-10 h-10 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-slate-900">BeetleSense API Documentation</h1>
              <p className="text-slate-600">RESTful API for forest monitoring and analytics</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation & Quick Start */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white rounded-lg border border-slate-200 p-8">
            <div className="flex items-center gap-3 mb-4">
              <Zap className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-slate-900">Quick Start</h3>
            </div>
            <p className="text-slate-600 mb-4">Get your API key in minutes and start making requests.</p>
            <code className="block bg-slate-100 p-3 rounded text-xs font-mono text-slate-700 overflow-x-auto mb-4">
              Authorization: Bearer YOUR_API_KEY
            </code>
            <a href="#authentication" className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2">
              View Auth Guide <ChevronRight className="w-4 h-4" />
            </a>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-8">
            <div className="flex items-center gap-3 mb-4">
              <Globe className="w-6 h-6 text-cyan-600" />
              <h3 className="text-lg font-semibold text-slate-900">Base URL</h3>
            </div>
            <p className="text-slate-600 mb-4">All API requests use a single base URL with geographic routing.</p>
            <code className="block bg-slate-100 p-3 rounded text-xs font-mono text-slate-700 overflow-x-auto">
              https://api.beetlesense.org
            </code>
            <p className="text-xs text-slate-500 mt-3">EU data center (Frankfurt)</p>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-8">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-emerald-600" />
              <h3 className="text-lg font-semibold text-slate-900">Security</h3>
            </div>
            <p className="text-slate-600 mb-4">Enterprise-grade security with TLS encryption and rate limiting.</p>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>✓ TLS 1.3 encryption</li>
              <li>✓ JWT token auth</li>
              <li>✓ GDPR compliant</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Endpoints Section */}
      <section className="max-w-7xl mx-auto px-6 py-12 border-t border-blue-200">
        <h2 className="text-3xl font-bold text-slate-900 mb-12">API Endpoints</h2>

        <div className="space-y-8">
          {endpoints.map((endpoint, idx) => (
            <div key={idx} className="bg-white rounded-lg border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow">
              {/* Header */}
              <div className="bg-slate-50 border-b border-slate-200 p-6">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-3 py-1 rounded font-mono text-sm font-semibold ${methodColor[endpoint.method]}`}>
                        {endpoint.method}
                      </span>
                      <code className="text-slate-700 font-mono">{endpoint.path}</code>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">{endpoint.title}</h3>
                  </div>
                  {endpoint.auth && (
                    <div className="flex items-center gap-1 bg-blue-50 px-3 py-1 rounded text-xs font-medium text-blue-700 whitespace-nowrap">
                      <Shield className="w-3 h-3" />
                      Requires Auth
                    </div>
                  )}
                </div>
                <p className="text-slate-600">{endpoint.description}</p>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Parameters */}
                {endpoint.params && endpoint.params.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-3">Parameters</h4>
                    <div className="space-y-2">
                      {endpoint.params.map((param, pidx) => (
                        <code key={pidx} className="block bg-slate-100 px-3 py-2 rounded text-sm text-slate-700">
                          {param}
                        </code>
                      ))}
                    </div>
                  </div>
                )}

                {/* Example Request */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-slate-900">Example Request</h4>
                    <button
                      onClick={() => copyToClipboard(endpoint.example, `example-${idx}`)}
                      className="flex items-center gap-2 px-3 py-1 rounded text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                    >
                      {copiedId === `example-${idx}` ? (
                        <>
                          <Check className="w-4 h-4" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="bg-slate-900 text-slate-100 p-4 rounded overflow-x-auto text-sm font-mono">
                    {endpoint.example}
                  </pre>
                </div>

                {/* Example Response */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-slate-900">Example Response</h4>
                    <button
                      onClick={() => copyToClipboard(endpoint.responseExample, `response-${idx}`)}
                      className="flex items-center gap-2 px-3 py-1 rounded text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                    >
                      {copiedId === `response-${idx}` ? (
                        <>
                          <Check className="w-4 h-4" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="bg-slate-50 border border-slate-200 p-4 rounded overflow-x-auto text-sm font-mono text-slate-700">
                    {endpoint.responseExample}
                  </pre>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Integration Section */}
      <section className="max-w-7xl mx-auto px-6 py-12 border-t border-blue-200">
        <h2 className="text-3xl font-bold text-slate-900 mb-8">Integration Libraries</h2>

        <div className="grid md:grid-cols-2 gap-8">
          {[
            {
              lang: 'Python',
              code: `import requests

api_key = "your_api_key"
headers = {"Authorization": f"Bearer {api_key}"}

response = requests.get(
    "https://api.beetlesense.org/api/v1/parcels",
    headers=headers
)
data = response.json()`,
            },
            {
              lang: 'JavaScript',
              code: `const apiKey = "your_api_key";

const response = await fetch(
  "https://api.beetlesense.org/api/v1/parcels",
  {
    headers: {
      "Authorization": \`Bearer \${apiKey}\`
    }
  }
);

const data = await response.json();`,
            },
            {
              lang: 'cURL',
              code: `curl -H "Authorization: Bearer your_api_key" \\
  https://api.beetlesense.org/api/v1/parcels | jq

# For POST requests:
curl -X POST https://api.beetlesense.org/api/v1/detections/report \\
  -H "Authorization: Bearer your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{...}'`,
            },
            {
              lang: 'Go',
              code: `package main

import (
  "fmt"
  "net/http"
)

func main() {
  client := &http.Client{}
  req, _ := http.NewRequest(
    "GET",
    "https://api.beetlesense.org/api/v1/parcels",
    nil,
  )
  req.Header.Set("Authorization", "Bearer your_api_key")

  resp, _ := client.Do(req)
  defer resp.Body.Close()
}`,
            },
          ].map((sample, idx) => (
            <div key={idx} className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4">{sample.lang}</h3>
              <pre className="bg-slate-900 text-slate-100 p-4 rounded overflow-x-auto text-sm font-mono">
                {sample.code}
              </pre>
            </div>
          ))}
        </div>
      </section>

      {/* Support */}
      <section className="max-w-7xl mx-auto px-6 py-16 border-t border-blue-200">
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg p-12 text-center text-white">
          <BookOpen className="w-12 h-12 mx-auto mb-4 text-blue-100" />
          <h2 className="text-3xl font-bold mb-4">Full API Documentation Available</h2>
          <p className="text-lg mb-8 text-blue-50 max-w-2xl mx-auto">
            Complete API reference with webhooks, rate limiting, error codes, and advanced integration patterns.
          </p>
          <div className="flex gap-4 justify-center">
            <a
              href="https://docs.beetlesense.org"
              className="inline-flex items-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition"
            >
              Full Documentation
              <ChevronRight className="w-4 h-4" />
            </a>
            <a
              href="mailto:api-support@beetlesense.org"
              className="inline-flex items-center gap-2 border-2 border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Contact Support
              <ChevronRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-blue-200 bg-white/50 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-6 text-center text-slate-600 text-sm">
          <p>BeetleSense API v1.0</p>
          <p className="mt-2">REST endpoints for forest health monitoring and AI-powered analytics</p>
        </div>
      </footer>
    </div>
  );
}
