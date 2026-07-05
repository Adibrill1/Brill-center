import { XMLParser } from 'fast-xml-parser';
import { z } from 'zod';
import { ApiError } from '../middleware/errors.js';

/**
 * The Idea Orchestrator agent finalizes user interviews as a
 * <proposal_data> XML block (see docs/idea_orchestrator.md). This service
 * converts that XML into a validated, structured JSON payload before DB
 * insertion — per the handoff instructions.
 */

const toList = (value: unknown): string[] => {
  if (value == null) return [];
  if (Array.isArray(value)) return value.map(String).map((s) => s.trim()).filter(Boolean);
  return String(value)
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
};

const proposalSchema = z.object({
  spaceType: z.enum(['Public', 'Private']),
  activityTitle: z.string().min(1),
  description: z.string().min(1),
  requirements: z.object({
    tech: z.array(z.string()),
    analog: z.array(z.string()),
  }),
  estimatedDurationMinutes: z.number().int().positive(),
  userId: z.string().min(1),
});

export type ProposalData = z.infer<typeof proposalSchema>;

const HEBREW_RE = /[֐-׿]/;

export function detectLanguage(text: string): 'he' | 'en' {
  return HEBREW_RE.test(text) ? 'he' : 'en';
}

export function parseProposalXml(xml: string): ProposalData {
  const parser = new XMLParser({
    ignoreAttributes: true,
    trimValues: true,
    parseTagValue: false,
  });

  let parsed: unknown;
  try {
    parsed = parser.parse(xml);
  } catch {
    throw new ApiError(400, 'invalid_proposal_xml', 'idea.invalid_proposal_xml');
  }

  const root = (parsed as Record<string, unknown>)?.proposal_data as
    | Record<string, unknown>
    | undefined;
  if (!root) {
    throw new ApiError(400, 'invalid_proposal_xml', 'idea.invalid_proposal_xml');
  }

  const requirements = (root.requirements ?? {}) as Record<string, unknown>;
  const duration = Number(root.estimated_duration);

  const candidate = {
    spaceType: String(root.space_type ?? ''),
    activityTitle: String(root.activity_title ?? ''),
    description: String(root.description ?? ''),
    requirements: {
      tech: toList(requirements.tech),
      analog: toList(requirements.analog),
    },
    estimatedDurationMinutes: Number.isFinite(duration) ? Math.round(duration) : NaN,
    userId: String(root.user_id ?? ''),
  };

  const result = proposalSchema.safeParse(candidate);
  if (!result.success) {
    throw new ApiError(
      400,
      'invalid_proposal_xml',
      'idea.invalid_proposal_xml',
      result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    );
  }
  return result.data;
}
