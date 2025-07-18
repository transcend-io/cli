import { describe, expect, it } from 'vitest';
import { removeLinks } from '../ai/removeLinks';

const TEST_DATA = `
"title": "move health check to /test /health https://app.datadoghq.com/logs?query=service%3Aprod-&live=true",
"due_date": "Fri Sep 29 2023",
"priority": "P3",
"ticket_type": "implementation"
}`;

describe('removeLinks', () => {
  it('should remove links', () => {
    expect(removeLinks(TEST_DATA)).to.deep.equal(`
"title": "move health check to /test /health <link-omitted>
"due_date": "Fri Sep 29 2023",
"priority": "P3",
"ticket_type": "implementation"
}`);
  });
});
