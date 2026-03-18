/**
 * companion-chat  —  BeetleSense Forest Advisor (RAG + Claude streaming).
 *
 * POST  /companion-chat
 * Body: { message: string, session_id?: string, parcel_id?: string }
 *
 * Streams the assistant reply back as Server-Sent Events (SSE).
 *
 * Enhanced in Sprint 4:
 *  - Inline intent classification (keyword-based, no LLM call)
 *  - Domain guardrails (off-topic detection, prompt injection)
 *  - Confidence scoring on responses
 *  - Regulatory disclaimers
 *  - Structured SSE events: token | citation | confidence | done
 *  - Analytics logging
 *
 * Enhanced in Sprint 5:
 *  - Integrated shared RAG module for knowledge base retrieval
 *  - Cross-table search (research + regulatory) with ranking
 *  - include_sources parameter in request body
 *  - Sources metadata in done event
 */

import { handleCors } from "../_shared/cors.ts";
import { getUser, AuthUser } from "../_shared/auth.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { err, stream, sseEncode } from "../_shared/response.ts";
import { generateQueryEmbedding } from "../_shared/embedding.ts";
import {
  searchKnowledgeBase,
  formatResultsForLLM,
  extractSourcesList,
  type SearchResult,
} from "../_shared/rag.ts";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildSystemPrompt, getCurrentSeason } from "./systemPrompt.ts";
import { fetchUserContext, formatUserContext } from "./contextBuilder.ts";

// ── Constants ────────────────────────────────────────────────────────────────

// Embedding config now lives in ../_shared/embedding.ts
const CLAUDE_MODEL = "claude-sonnet-4-20250514";
const MAX_HISTORY = 10;
const STREAM_TIMEOUT_MS = 30_000;

// SYSTEM_PROMPT is now built dynamically via buildSystemPrompt() from ./systemPrompt.ts
// to include comprehensive Swedish forestry expertise, few-shot examples, and context injection.

// ── Intent classification (inline, keyword-based) ─────────────────────────

type Intent =
  | "analysis_question"
  | "regulatory_lookup"
  | "how_to"
  | "scenario_request"
  | "data_request"
  | "general_forestry"
  | "out_of_scope";

interface ClassificationResult {
  intent: Intent;
  confidence: number;
}

const INTENT_KEYWORDS: Record<Intent, string[]> = {
  analysis_question: [
    "tree count", "species", "beetle", "bark beetle", "ndvi", "analysis",
    "survey result", "detection", "infestation", "damage", "canopy",
    "trädräkning", "artbestämning", "barkborre", "granbarkborre", "analys",
    "inventering", "resultat", "angrepp", "skador",
  ],
  regulatory_lookup: [
    "regulation", "law", "legal", "guideline", "permit", "certification",
    "fsc", "pefc", "eu regulation", "eudr", "natura 2000", "compliance",
    "föreskrift", "lag", "riktlinje", "tillstånd", "certifiering",
    "skogsvårdslagen", "avverkningsanmälan", "biotopskydd",
  ],
  how_to: [
    "how to", "how do i", "guide", "best practice", "recommend",
    "should i", "tips", "advice", "method",
    "hur gör", "hur ska", "rekommend", "bästa praxis", "råd", "metod",
  ],
  scenario_request: [
    "what if", "scenario", "simulate", "predict", "forecast",
    "what would happen", "estimate", "compare",
    "tänk om", "simulera", "förutse", "prognos", "jämför",
  ],
  data_request: [
    "show me", "my data", "my parcel", "my survey", "latest",
    "summary", "overview", "status", "report",
    "visa", "min data", "mitt skifte", "sammanfattning", "översikt",
  ],
  general_forestry: [],
  out_of_scope: [],
};

const FORESTRY_TERMS = new Set([
  "tree", "forest", "wood", "timber", "bark", "spruce", "pine", "birch",
  "beetle", "pest", "canopy", "stand", "harvest", "planting", "silviculture",
  "ecology", "biodiversity", "soil", "ndvi", "satellite", "drone", "lidar",
  "survey", "inventory", "parcel", "hectare", "density", "species",
  "träd", "skog", "virke", "gran", "tall", "björk", "barkborre",
  "bestånd", "avverkning", "gallring", "plantering", "inventering",
  "skogsvård", "ekologi", "mångfald", "biotop",
]);

function classifyIntent(query: string): ClassificationResult {
  const q = query.toLowerCase();
  let bestIntent: Intent = "general_forestry";
  let bestScore = 0;

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS) as [Intent, string[]][]) {
    if (keywords.length === 0) continue;
    let score = 0;
    for (const kw of keywords) {
      if (q.includes(kw)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestIntent = intent;
    }
  }

  if (bestScore === 0) {
    const words = q.split(/[\s,.;:!?()]+/).filter(Boolean);
    const domainHits = words.filter((w) => FORESTRY_TERMS.has(w)).length;
    if (domainHits > 0) {
      return { intent: "general_forestry", confidence: Math.min(0.7, 0.3 + domainHits * 0.1) };
    }
    // Short queries (greetings etc.) pass through
    if (words.length <= 4) {
      return { intent: "general_forestry", confidence: 0.3 };
    }
    return { intent: "out_of_scope", confidence: 0.6 };
  }

  const confidence = Math.min(0.95, 0.4 + bestScore * 0.15);
  return { intent: bestIntent, confidence };
}

// ── Guardrails (inline) ───────────────────────────────────────────────────

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /ignore\s+(all\s+)?above/i,
  /disregard\s+(all\s+)?previous/i,
  /forget\s+(all\s+)?(your\s+)?instructions/i,
  /you\s+are\s+now\s+/i,
  /system\s+prompt/i,
  /\bDAN\b/,
  /jailbreak/i,
  /bypass\s+(safety|filter|guardrail)/i,
  /pretend\s+(you\s+are|to\s+be)/i,
  /reveal\s+(your|the)\s+(system|initial)\s+(prompt|instruction)/i,
  /<\s*\/?system\s*>/i,
];

const OFF_TOPIC_RESPONSE =
  "I'm specialized in forest management and ecology. I can help with questions " +
  "about tree health, beetle detection, species identification, forest inventory, " +
  "and related topics.";

const OFF_TOPIC_RESPONSE_SV =
  "Jag specialiserar mig på skogsförvaltning och ekologi. Jag kan hjälpa till med " +
  "frågor om trädhälsa, barkborredetektion, artbestämning, skogsinventering och " +
  "relaterade ämnen.";

function checkGuardrails(
  query: string,
  intent: Intent,
): { allowed: boolean; response?: string } {
  // Prompt injection check
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(query)) {
      return {
        allowed: false,
        response: "I'm here to help with forestry questions. Could you rephrase your question?",
      };
    }
  }

  // Domain check
  if (intent === "out_of_scope") {
    const isSv = /[åäö]/.test(query.toLowerCase());
    return {
      allowed: false,
      response: isSv ? OFF_TOPIC_RESPONSE_SV : OFF_TOPIC_RESPONSE,
    };
  }

  return { allowed: true };
}

// ── Confidence scoring ────────────────────────────────────────────────────

type ConfidenceLevel = "high" | "medium" | "low";

function computeConfidence(
  retrievalScores: number[],
  citationCount: number,
  intentConfidence: number,
): { level: ConfidenceLevel; score: number } {
  const avgRetrieval =
    retrievalScores.length > 0
      ? retrievalScores.reduce((a, b) => a + b, 0) / retrievalScores.length
      : 0;
  const citationScore = Math.min(1.0, citationCount / 3);
  const raw = avgRetrieval * 0.4 + citationScore * 0.4 + intentConfidence * 0.2;
  const score = Math.max(0, Math.min(1, raw));
  const level: ConfidenceLevel = score >= 0.7 ? "high" : score >= 0.4 ? "medium" : "low";
  return { level, score };
}

function buildDisclaimers(confidence: ConfidenceLevel, intent: Intent): string {
  const parts: string[] = [];
  if (intent === "regulatory_lookup") {
    parts.push(
      "*This information is for guidance only and does not constitute legal advice. " +
      "Please consult Skogsstyrelsen or a certified forestry advisor for binding regulatory guidance.*",
    );
  }
  if (confidence === "low") {
    parts.push(
      "*Note: This response has lower confidence due to limited matching sources. " +
      "Consider verifying the information independently.*",
    );
  }
  return parts.length ? "\n\n---\n" + parts.join("\n\n") : "";
}

// ── Helpers ──────────────────────────────────────────────────────────────────

// embedQuery is now provided by ../_shared/embedding.ts as generateQueryEmbedding

interface RetrievedChunk {
  id: string;
  content: string;
  source: string;
  similarity: number;
}

/**
 * Retrieve user-specific data embeddings (survey results, parcel data).
 * Research and regulatory retrieval is now handled by the shared RAG module.
 */
async function retrieveContext(
  supabase: SupabaseClient,
  embedding: number[],
  userId: string,
  parcelId: string | null,
): Promise<{
  userData: RetrievedChunk[];
}> {
  const userDataRes = await supabase.rpc("match_user_data_embeddings", {
    query_embedding: embedding,
    match_count: 5,
    p_user_id: userId,
    p_parcel_id: parcelId,
  });

  const toChunks = (data: unknown[] | null): RetrievedChunk[] =>
    // deno-lint-ignore no-explicit-any
    (data ?? []).map((row: any) => ({
      id: row.id,
      content: row.content,
      source: row.source ?? "unknown",
      similarity: row.similarity,
    }));

  const userData = toChunks(userDataRes.data);

  return { userData };
}

// buildContextBlock has been replaced by the shared RAG module's formatResultsForLLM
// plus inline user-data formatting in the main handler.

function getIntentSystemAddendum(intent: Intent): string {
  switch (intent) {
    case "regulatory_lookup":
      return (
        "\n\n## Special Instructions\n" +
        "The user is asking about regulations. Cite the specific regulation, section, and " +
        "jurisdiction. Recommend they verify with Skogsstyrelsen for binding guidance."
      );
    case "scenario_request":
      return (
        "\n\n## Special Instructions\n" +
        "The user wants scenario analysis. Be clear about assumptions and distinguish between " +
        "modelled projections and observed data."
      );
    case "data_request":
      return (
        "\n\n## Special Instructions\n" +
        "The user wants to see their data. Summarise relevant metrics, note the data date, " +
        "and offer to explain any concerning trends."
      );
    default:
      return "";
  }
}

// ── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return handleCors();
  if (req.method !== "POST") return err("Method not allowed", 405);

  const requestStart = Date.now();

  try {
    // ── Auth ────────────────────────────────────────────────────────────
    const user: AuthUser = await getUser(req);

    // ── Input ───────────────────────────────────────────────────────────
    const body = await req.json().catch(() => null);
    if (!body) return err("Invalid JSON body");

    const { message, session_id, parcel_id, include_sources } = body as {
      message?: string;
      session_id?: string;
      parcel_id?: string;
      include_sources?: boolean;
    };

    const shouldIncludeSources = include_sources !== false; // default true

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return err("message is required and must be a non-empty string");
    }
    if (message.length > 4000) {
      return err("message must be 4 000 characters or fewer");
    }

    const trimmedMessage = message.trim();

    // ── Intent classification ────────────────────────────────────────────
    const classification = classifyIntent(trimmedMessage);

    // ── Guardrails check ─────────────────────────────────────────────────
    const guardrailResult = checkGuardrails(trimmedMessage, classification.intent);
    if (!guardrailResult.allowed) {
      // Return the rejection directly as a non-streaming response
      // wrapped in SSE for consistency
      const sseBody = new ReadableStream<Uint8Array>({
        start(ctrl) {
          ctrl.enqueue(
            sseEncode(
              JSON.stringify({
                type: "token",
                data: guardrailResult.response,
              }),
              "message",
            ),
          );
          ctrl.enqueue(
            sseEncode(
              JSON.stringify({
                type: "confidence",
                data: { level: "high", score: 1.0 },
              }),
              "message",
            ),
          );
          ctrl.enqueue(
            sseEncode(
              JSON.stringify({
                type: "done",
                data: {
                  done: true,
                  sources: [],
                  guardrail: "blocked",
                  intent: classification.intent,
                },
              }),
              "message",
            ),
          );
          ctrl.close();
        },
      });
      return stream(sseBody);
    }

    const supabase = createServiceClient();

    // ── Session ─────────────────────────────────────────────────────────
    let activeSessionId = session_id ?? null;

    if (!activeSessionId) {
      const { data: session, error: sessErr } = await supabase
        .from("companion_sessions")
        .insert({
          user_id: user.id,
          parcel_id: parcel_id ?? null,
          started_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (sessErr || !session) {
        console.error("session create error:", sessErr);
        return err("Failed to create chat session", 500);
      }
      activeSessionId = session.id;
    } else {
      const { data: existing } = await supabase
        .from("companion_sessions")
        .select("id")
        .eq("id", activeSessionId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!existing) {
        return err("Session not found or access denied", 404);
      }
    }

    // ── Save user message ───────────────────────────────────────────────
    await supabase.from("companion_messages").insert({
      session_id: activeSessionId,
      role: "user",
      content: trimmedMessage,
    });

    // ── Conversation history ────────────────────────────────────────────
    const { data: historyRows } = await supabase
      .from("companion_messages")
      .select("role, content")
      .eq("session_id", activeSessionId)
      .order("created_at", { ascending: false })
      .limit(MAX_HISTORY + 1);

    const history = (historyRows ?? []).reverse().map((r) => ({
      role: r.role as "user" | "assistant",
      content: r.content as string,
    }));

    // ── RAG retrieval ───────────────────────────────────────────────────
    let contextBlock = "";
    let retrievalScores: number[] = [];
    let ragResults: SearchResult[] = [];
    const retrievalStart = Date.now();

    try {
      const embedding = await generateQueryEmbedding(trimmedMessage);

      // Run shared knowledge-base search and user-data retrieval in parallel
      const [knowledgeResults, userDataChunks] = await Promise.all([
        searchKnowledgeBase(supabase, embedding, { limit: 5 }),
        retrieveContext(supabase, embedding, user.id, parcel_id ?? null),
      ]);

      ragResults = knowledgeResults;

      // Build context from shared RAG results (research + regulatory)
      const knowledgeContext = formatResultsForLLM(knowledgeResults);

      // Build user-data context section separately
      const userDataContext =
        userDataChunks.userData.length > 0
          ? "<user_data>\n## Your Data & Survey Results\n" +
            userDataChunks.userData
              .map((c) => `[Source: ${c.source}]\n${c.content}`)
              .join("\n---\n") +
            "\n</user_data>"
          : "";

      contextBlock = [knowledgeContext, userDataContext]
        .filter(Boolean)
        .join("\n\n");

      retrievalScores = [
        ...knowledgeResults.map((r) => r.similarity),
        ...userDataChunks.userData.map((c) => c.similarity),
      ];
    } catch (ragErr) {
      console.warn("RAG retrieval failed:", ragErr);
      contextBlock =
        "<context>\n[RAG retrieval unavailable — answering from general knowledge only.]\n</context>";
    }
    const retrievalMs = Date.now() - retrievalStart;

    // ── Fetch user context (parcels, alerts, surveys) ───────────────────
    let userContextBlock = "";
    try {
      const userCtx = await fetchUserContext(supabase, user.id, parcel_id ?? null);
      userContextBlock = formatUserContext(userCtx);
    } catch (ctxErr) {
      console.warn("User context fetch failed:", ctxErr);
    }

    // ── Build messages for Claude ───────────────────────────────────────
    const intentAddendum = getIntentSystemAddendum(classification.intent);

    // Combine RAG context + user context for the system prompt
    const fullContext = [contextBlock, userContextBlock].filter(Boolean).join("\n\n");
    const season = getCurrentSeason();
    const systemContent = buildSystemPrompt(fullContext, season, new Date().getFullYear()) + intentAddendum;

    const claudeMessages = history.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // ── Call Claude (streaming) ─────────────────────────────────────────
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      return err("ANTHROPIC_API_KEY not configured", 500);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), STREAM_TIMEOUT_MS);

    const llmStart = Date.now();
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 2048,
        system: systemContent,
        messages: claudeMessages,
        stream: true,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!claudeRes.ok) {
      const detail = await claudeRes.text();
      console.error(`Claude API error (${claudeRes.status}):`, detail);
      return err("AI service unavailable", 502);
    }

    // ── Stream SSE back to the client ───────────────────────────────────
    const sessionIdForClient = activeSessionId;
    let fullResponse = "";

    const sseStream = new ReadableStream<Uint8Array>({
      async start(ctrl) {
        // Send session_id + intent as first event
        ctrl.enqueue(
          sseEncode(
            JSON.stringify({
              type: "session",
              data: {
                session_id: sessionIdForClient,
                intent: classification.intent,
                intentConfidence: classification.confidence,
              },
            }),
            "message",
          ),
        );

        const reader = claudeRes.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const payload = line.slice(6).trim();
              if (payload === "[DONE]") continue;

              try {
                const event = JSON.parse(payload);

                if (
                  event.type === "content_block_delta" &&
                  event.delta?.type === "text_delta"
                ) {
                  const text = event.delta.text;
                  fullResponse += text;
                  ctrl.enqueue(
                    sseEncode(
                      JSON.stringify({ type: "token", data: text }),
                      "message",
                    ),
                  );
                }

                if (event.type === "message_stop") {
                  const llmMs = Date.now() - llmStart;
                  const sources = extractSources(fullResponse);

                  // Compute confidence
                  const confidence = computeConfidence(
                    retrievalScores,
                    sources.length,
                    classification.confidence,
                  );

                  // Add disclaimers if needed
                  const disclaimerText = buildDisclaimers(
                    confidence.level,
                    classification.intent,
                  );
                  if (disclaimerText) {
                    fullResponse += disclaimerText;
                    ctrl.enqueue(
                      sseEncode(
                        JSON.stringify({ type: "token", data: disclaimerText }),
                        "message",
                      ),
                    );
                  }

                  // Send citations event
                  if (sources.length > 0) {
                    ctrl.enqueue(
                      sseEncode(
                        JSON.stringify({ type: "citation", data: sources }),
                        "message",
                      ),
                    );
                  }

                  // Send confidence event
                  ctrl.enqueue(
                    sseEncode(
                      JSON.stringify({ type: "confidence", data: confidence }),
                      "message",
                    ),
                  );

                  // Build structured sources from RAG results
                  const ragSourcesList = shouldIncludeSources
                    ? extractSourcesList(ragResults)
                    : [];

                  // Persist assistant message with analytics metadata
                  const { data: insertedMsg } = await supabase
                    .from("companion_messages")
                    .insert({
                      session_id: sessionIdForClient,
                      role: "assistant",
                      content: fullResponse,
                      metadata: {
                        sources,
                        rag_sources: ragSourcesList,
                        analytics: {
                          intent: classification.intent,
                          intentConfidence: classification.confidence,
                          retrievalScores,
                          confidence: confidence,
                          latency: {
                            retrievalMs,
                            llmMs,
                            totalMs: Date.now() - requestStart,
                          },
                        },
                      },
                    })
                    .select("id")
                    .single();

                  // Send done event
                  ctrl.enqueue(
                    sseEncode(
                      JSON.stringify({
                        type: "done",
                        data: {
                          done: true,
                          sources,
                          include_sources: shouldIncludeSources,
                          rag_sources: shouldIncludeSources
                            ? ragSourcesList
                            : undefined,
                          confidence: confidence.level,
                          intent: classification.intent,
                          messageId: insertedMsg?.id ?? null,
                        },
                      }),
                      "message",
                    ),
                  );
                }
              } catch {
                // skip malformed SSE lines
              }
            }
          }
        } catch (streamErr) {
          console.error("stream error:", streamErr);
          ctrl.enqueue(
            sseEncode(
              JSON.stringify({ type: "error", data: "Stream interrupted" }),
              "message",
            ),
          );
        } finally {
          ctrl.close();
        }
      },
    });

    return stream(sseStream);
  } catch (e: unknown) {
    const status = (e as { status?: number }).status ?? 500;
    const message = e instanceof Error ? e.message : "Internal server error";
    console.error("companion-chat error:", e);
    return err(message, status);
  }
});

// ── Utility ──────────────────────────────────────────────────────────────────

/**
 * Extract cited sources from the assistant response text.
 * Looks for [Source: ...] patterns.
 */
function extractSources(text: string): string[] {
  const matches = text.matchAll(/\[Source:\s*([^\]]+)\]/gi);
  const sources = new Set<string>();
  for (const m of matches) {
    sources.add(m[1].trim());
  }
  return [...sources];
}
