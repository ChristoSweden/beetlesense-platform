/**
 * Seed the BeetleSense knowledge base with curated forestry sources.
 *
 * Usage:
 *   npx tsx scripts/seed-knowledge-base.ts
 *
 * Requires:
 *   - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
 *
 * Schema:
 *   research_embeddings(paper_id text, chunk_index int, content text, embedding vector(1536), metadata jsonb)
 *   regulatory_embeddings(source text, chunk_index int, content text, embedding vector(1536), metadata jsonb)
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const supabase = createClient(
  process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY ?? '',
)

interface KBSource {
  title: string
  source?: string
  authors?: string[]
  year?: number
  institution?: string
  topicTags?: string[]
  pdfUrl?: string
  url?: string
  abstract?: string
  description?: string
  journal?: string
  jurisdiction?: string
  topic?: string
  doi?: string
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100)
}

async function main() {
  const dataPath = resolve(__dirname, '../data/knowledge-base-sources.json')
  const data = JSON.parse(readFileSync(dataPath, 'utf-8'))

  console.log('=== BeetleSense Knowledge Base Seeder ===\n')

  // ── Research papers → research_embeddings ──
  const papers: KBSource[] = data.research_papers ?? []
  console.log(`Research papers: ${papers.length}`)

  for (const paper of papers) {
    const paperId = slugify(paper.title)
    const content = paper.abstract ?? paper.description ?? ''
    const metadata = {
      title: paper.title,
      type: 'paper',
      authors: paper.authors,
      year: paper.year,
      institution: paper.institution,
      journal: paper.journal,
      pdf_url: paper.pdfUrl,
      topic_tags: paper.topicTags,
    }

    const { error } = await supabase.from('research_embeddings').insert({
      paper_id: paperId,
      chunk_index: 0,
      content,
      metadata,
      // embedding is null — run knowledgebase-ingestion worker with GOOGLE_API_KEY to generate
    })
    if (error && !error.message.includes('duplicate')) {
      console.error(`  ✗ ${paper.title}: ${error.message}`)
    } else {
      console.log(`  ✓ ${paper.title}`)
    }
  }

  // ── Open datasets → research_embeddings ──
  const datasets: KBSource[] = data.open_datasets ?? []
  console.log(`\nOpen datasets: ${datasets.length}`)

  for (const ds of datasets) {
    const paperId = `dataset-${slugify(ds.title)}`
    const content = ds.description ?? ''
    const metadata = {
      title: ds.title,
      type: 'dataset',
      source: ds.source,
      url: ds.url,
      jurisdiction: ds.jurisdiction,
      topic: ds.topic,
    }

    const { error } = await supabase.from('research_embeddings').insert({
      paper_id: paperId,
      chunk_index: 0,
      content,
      metadata,
    })
    if (error && !error.message.includes('duplicate')) {
      console.error(`  ✗ ${ds.title}: ${error.message}`)
    } else {
      console.log(`  ✓ ${ds.title}`)
    }
  }

  // ── Regulatory documents → regulatory_embeddings ──
  const regs: KBSource[] = data.regulatory_documents ?? []
  console.log(`\nRegulatory documents: ${regs.length}`)

  for (const reg of regs) {
    const source = slugify(reg.title)
    const content = reg.description ?? ''
    const metadata = {
      title: reg.title,
      type: 'regulation',
      source: reg.source,
      jurisdiction: reg.jurisdiction,
      topic: reg.topic,
    }

    const { error } = await supabase.from('regulatory_embeddings').insert({
      source,
      chunk_index: 0,
      content,
      metadata,
    })
    if (error && !error.message.includes('duplicate')) {
      console.error(`  ✗ ${reg.title}: ${error.message}`)
    } else {
      console.log(`  ✓ ${reg.title}`)
    }
  }

  // ── Satellite platforms → research_embeddings ──
  const satellites: KBSource[] = data.satellite_platforms ?? []
  console.log(`\nSatellite platforms: ${satellites.length}`)

  for (const sat of satellites) {
    const paperId = `satellite-${slugify(sat.title)}`
    const content = sat.description ?? ''
    const metadata = {
      title: sat.title,
      type: 'satellite_platform',
      source: sat.source,
      url: sat.url,
      topic: sat.topic,
    }

    const { error } = await supabase.from('research_embeddings').insert({
      paper_id: paperId,
      chunk_index: 0,
      content,
      metadata,
    })
    if (error && !error.message.includes('duplicate')) {
      console.error(`  ✗ ${sat.title}: ${error.message}`)
    } else {
      console.log(`  ✓ ${sat.title}`)
    }
  }

  // ── Technology & app references → research_embeddings ──
  const techRefs: KBSource[] = [
    ...(data.technology_references ?? []),
    ...(data.app_references ?? []),
  ]
  console.log(`\nTechnology & app references: ${techRefs.length}`)

  for (const ref of techRefs) {
    const paperId = `ref-${slugify(ref.title)}`
    const content = ref.description ?? ''
    const metadata = {
      title: ref.title,
      type: 'reference',
      source: ref.source,
      url: ref.url,
      topic: ref.topic,
    }

    const { error } = await supabase.from('research_embeddings').insert({
      paper_id: paperId,
      chunk_index: 0,
      content,
      metadata,
    })
    if (error && !error.message.includes('duplicate')) {
      console.error(`  ✗ ${ref.title}: ${error.message}`)
    } else {
      console.log(`  ✓ ${ref.title}`)
    }
  }

  // ── Education resources → research_embeddings ──
  const eduResources: KBSource[] = data.education_resources ?? []
  console.log(`\nEducation resources: ${eduResources.length}`)

  for (const edu of eduResources) {
    const paperId = `edu-${slugify(edu.title)}`
    const content = edu.description ?? ''
    const metadata = {
      title: edu.title,
      type: 'education',
      source: edu.source,
      url: edu.url,
      topic: edu.topic,
    }

    const { error } = await supabase.from('research_embeddings').insert({
      paper_id: paperId,
      chunk_index: 0,
      content,
      metadata,
    })
    if (error && !error.message.includes('duplicate')) {
      console.error(`  ✗ ${edu.title}: ${error.message}`)
    } else {
      console.log(`  ✓ ${edu.title}`)
    }
  }

  // ── Fire ecology sources → research_embeddings ──
  const fireEcology: KBSource[] = data.fire_ecology ?? []
  console.log(`\nFire ecology sources: ${fireEcology.length}`)

  for (const fire of fireEcology) {
    const paperId = `fire-${slugify(fire.title)}`
    const content = fire.abstract ?? fire.description ?? ''
    const metadata = {
      title: fire.title,
      type: 'fire_ecology',
      authors: fire.authors,
      year: fire.year,
      institution: fire.institution,
      journal: fire.journal,
      pdf_url: fire.pdfUrl,
      topic_tags: fire.topicTags,
    }

    const { error } = await supabase.from('research_embeddings').insert({
      paper_id: paperId,
      chunk_index: 0,
      content,
      metadata,
    })
    if (error && !error.message.includes('duplicate')) {
      console.error(`  ✗ ${fire.title}: ${error.message}`)
    } else {
      console.log(`  ✓ ${fire.title}`)
    }
  }

  // ── Academic citations → research_embeddings ──
  const academicCitations: KBSource[] = data.academic_citations ?? []
  console.log(`\nAcademic citations: ${academicCitations.length}`)

  for (const cite of academicCitations) {
    const paperId = `citation-${slugify(cite.title)}`
    const content = cite.abstract ?? cite.description ?? ''
    const metadata = {
      title: cite.title,
      type: 'academic_citation',
      authors: cite.authors,
      year: cite.year,
      institution: cite.institution,
      journal: cite.journal,
      doi: cite.doi,
      topic_tags: cite.topicTags,
    }

    const { error } = await supabase.from('research_embeddings').insert({
      paper_id: paperId,
      chunk_index: 0,
      content,
      metadata,
    })
    if (error && !error.message.includes('duplicate')) {
      console.error(`  ✗ ${cite.title}: ${error.message}`)
    } else {
      console.log(`  ✓ ${cite.title}`)
    }
  }

  const total = papers.length + datasets.length + satellites.length + regs.length + techRefs.length + eduResources.length + fireEcology.length + academicCitations.length
  console.log(`\n=== Knowledge base seeding complete: ${total} sources ===`)
  console.log('Note: Embeddings are null. Run the knowledgebase-ingestion worker')
  console.log('with GOOGLE_API_KEY configured to generate vector embeddings.')
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
