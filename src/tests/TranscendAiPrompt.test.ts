import { expect } from 'chai';
import * as t from 'io-ts';
import { TranscendAiPrompt } from '../ai/TranscendAiPrompt';

const TEST_DATA = `
Unfortunately the sample dataset provided does not contain enough information to determine who is most important.
However, here is a JSON string list of fields that could be useful for answering such a question if more data were available:
<json>
["Name", "Title", "Department", "Salary", "Tenure"]
</json>
These fields like name, title, department, salary, and tenure co
`;

describe('TranscendAiPrompt', () => {
  const aiPrompt = new TranscendAiPrompt({
    title: 'test',
    codec: t.array(t.string),
    extractFromTag: 'json',
  });
  it('should remove links', () => {
    expect(aiPrompt.parseAiResponse(TEST_DATA)).to.deep.equal([
      'Name',
      'Title',
      'Department',
      'Salary',
      'Tenure',
    ]);
  });
});
