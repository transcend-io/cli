import { expect } from 'chai';

import { getGitFilesThatChanged } from '../ai/getGitFilesThatChanged';
import { join } from 'path';

// not easy to test this but can uncomment to run against current commit
describe.skip('getGitFilesThatChanged', () => {
  it('should remove links', () => {
    expect(
      getGitFilesThatChanged({
        baseBranch: 'main',
        githubRepo: 'https://github.com/transcend-io/cli.git',
        rootDirectory: join(__dirname, '../../'),
      }),
    ).to.deep.equal({
      changedFiles: [
        'package.json',
        'src/ai/TranscendAiPrompt.ts',
        'src/cli-analyze-pull-request.ts',
        'src/tests/TranscendAiPrompt.test.ts',
      ],
      fileDiffs: {},
    });
  });
});
