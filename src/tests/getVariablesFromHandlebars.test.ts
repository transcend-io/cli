import { expect } from 'chai';

import { getVariablesFromHandlebarsTemplate } from '../helpers/getVariablesFromHandlebarsTemplate';

const TEST_HBS = `
<p>
  You are an experienced project manager, constantly juggling a variety of different tasks.
  Other employees at your company are very busy.
  They quickly record notes in slack of things that they want to look into later.
  You are tasked with reviewing those raw notes, and turning them into a structured
  form that will make the notes more easily indexable by the employee when they have more time to review the information.
  {{{ description }}}. Return a JSON object in the following format:

  ({{#each parameters}}{{ name }} - {{slug}}, {{/each}}clarification).
</p>

{{> promptPartialTodaysDate }}

{{> promptPartialTranscendProducts }}


{{#with dog}}{{cat}} - {{fish}}{{/with}}

<p>
  The following rules define each of the input parameters:
  <ul>
  {{#each parameters}}
    <li>{{ name }}: {{{ description }}}</li>
  {{/each}}
  </ul>
</p>

{{#with dog}} {{meow}}{{/with}}

<p>
  If any of the parameters are not known, it should be set to null.
  If anything is not clear, return a prompt in the clarification key of the response asking for further detail
</p>`;

describe('getVariablesFromHandlebars', () => {
  it('should merge together', () => {
    expect(getVariablesFromHandlebarsTemplate(TEST_HBS)).to.deep.equal({
      description: null,
      parameters: [{ name: null, slug: null, description: null }],
      dog: { cat: null, fish: null, meow: null },
      promptPartialTodaysDate: 'partial',
      promptPartialTranscendProducts: 'partial',
    });
  });
});
