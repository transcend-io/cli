import { expect } from 'chai';
import * as t from 'io-ts';
import { TranscendAiPrompt } from '../ai/TranscendAiPrompt';

describe('TranscendAiPrompt', () => {
  const aiPrompt = new TranscendAiPrompt({
    title: 'test',
    codec: t.array(t.string),
    extractFromTag: 'json',
  });

  const TEST_DATA = `
Unfortunately the sample dataset provided does not contain enough information to determine who is most important.
However, here is a JSON string list of fields that could be useful for answering such a question if more data were available:
<json>
["Name", "Title", "Department", "Salary", "Tenure"]
</json>
These fields like name, title, department, salary, and tenure co
`;

  it('should remove links', () => {
    expect(aiPrompt.parseAiResponse(TEST_DATA)).to.deep.equal([
      'Name',
      'Title',
      'Department',
      'Salary',
      'Tenure',
    ]);
  });

  const TEST2_DATA = `
  <json>
  {
    "title": "Ai usage of cli should not require assessment template title",
    "description": "The note indicates that the AI usage of the CLI should not require an assessment template title.",
    "actionItem": "Update CLI to not require template title when AI is using it.",
    "type": "Feature Request",
    "priority": "P2",
    "taskForm": "User Story"
  }
  </json>
  `;

  const aiPrompt2 = new TranscendAiPrompt({
    title: 'test',
    codec: t.record(t.string, t.string),
    extractFromTag: 'json',
  });

  it('should remove links', () => {
    expect(aiPrompt2.parseAiResponse(TEST2_DATA)).to.deep.equal({
      title: 'Ai usage of cli should not require assessment template title',
      description:
        'The note indicates that the AI usage of the CLI should not require an assessment template title.',
      actionItem:
        'Update CLI to not require template title when AI is using it.',
      type: 'Feature Request',
      priority: 'P2',
      taskForm: 'User Story',
    });
  });
});
