import { describe, expect, it } from 'vitest';
import { detectLanguage, parseProposalXml } from '../src/services/ideaOrchestrator.js';
import { ApiError } from '../src/middleware/errors.js';

const validXml = `
<proposal_data>
  <space_type>Public</space_type>
  <activity_title>סדנת קרמיקה קהילתית</activity_title>
  <description>מפגש שבועי ליצירה בחומר, פתוח לכל הגילאים.</description>
  <requirements>
    <tech>projector, speakers</tech>
    <analog>sand timers, physical notes</analog>
  </requirements>
  <estimated_duration>90</estimated_duration>
  <user_id>user-123</user_id>
</proposal_data>`;

describe('idea orchestrator XML → structured JSON', () => {
  it('parses the <proposal_data> block into a validated object', () => {
    const proposal = parseProposalXml(validXml);
    expect(proposal).toEqual({
      spaceType: 'Public',
      activityTitle: 'סדנת קרמיקה קהילתית',
      description: 'מפגש שבועי ליצירה בחומר, פתוח לכל הגילאים.',
      requirements: {
        tech: ['projector', 'speakers'],
        analog: ['sand timers', 'physical notes'],
      },
      estimatedDurationMinutes: 90,
      userId: 'user-123',
    });
  });

  it('rejects XML without a proposal_data root', () => {
    expect(() => parseProposalXml('<other>hi</other>')).toThrow(ApiError);
  });

  it('rejects invalid field values', () => {
    const bad = validXml.replace('Public', 'Mars').replace('90', '90');
    expect(() => parseProposalXml(bad)).toThrow(ApiError);
    const badDuration = validXml.replace('<estimated_duration>90</estimated_duration>', '<estimated_duration>soon</estimated_duration>');
    expect(() => parseProposalXml(badDuration)).toThrow(ApiError);
  });

  it('detects Hebrew vs English content', () => {
    expect(detectLanguage('סדנת יצירה')).toBe('he');
    expect(detectLanguage('Pottery workshop')).toBe('en');
  });
});
