import chai, { expect } from 'chai';
import deepEqualInAnyOrder from 'deep-equal-in-any-order';

import { flattenOneTrustQuestions } from '../flattenOneTrustAssessment';
import { createDefaultCodec } from '@transcend-io/type-utils';
import {
  OneTrustAssessmentQuestionResponses,
  OneTrustAssessmentResponses,
} from '@transcend-io/privacy-types';
import { OneTrustEnrichedAssessmentQuestion } from '../../codecs';

chai.use(deepEqualInAnyOrder);

describe('flattenOneTrustQuestions', () => {
  const defaultQuestion: OneTrustEnrichedAssessmentQuestion =
    createDefaultCodec(OneTrustEnrichedAssessmentQuestion);
  const defaultQuestionResponses: OneTrustAssessmentQuestionResponses =
    createDefaultCodec(OneTrustAssessmentQuestionResponses);
  const defaultResponses: OneTrustAssessmentResponses = createDefaultCodec(
    OneTrustAssessmentResponses,
  );

  it('should return an empty flat object on empty list input', () => {
    const questions = [[]];
    const result = flattenOneTrustQuestions(questions, 'sections');
    expect(result).to.deep.equal({});
  });

  it('should correctly flatten flatten question responses for multiple sections', () => {
    const questions: OneTrustEnrichedAssessmentQuestion[][] = [
      //
      /**
       * the 1st section has
       *  - 1st question with 2 question responses with 1 responses
       *  - 2nd question with 1 questionResponses with 0 responses
       *  - 3rd question with 0 questionResponses
       * the second section has
       *  - 1st question with 1 questionResponses with 0 responses
       *  - 2nd question with 0 questionResponses
       * the third section has
       *  - 1st question with 0 question responses
       */
      // 1st section
      [
        // 1st section - 1st question
        {
          ...defaultQuestion,
          questionResponses: [
            {
              ...defaultQuestionResponses[0],
              responses: [
                {
                  ...defaultResponses[0],
                  response: 's1q1r1',
                },
              ],
            },
            {
              ...defaultQuestionResponses[0],
              responses: [
                {
                  ...defaultResponses[0],
                  response: 's1q1r2',
                },
              ],
            },
          ],
        },
        // 1st section - 2nd question
        {
          ...defaultQuestion,
          questionResponses: [
            {
              ...defaultQuestionResponses[0],
              responses: [],
            },
          ],
        },
        // 1st section - 3rd question
        {
          ...defaultQuestion,
          questionResponses: [],
        },
      ],
      // second section
      [
        // 2nd section - 1st question
        {
          ...defaultQuestion,
          questionResponses: [
            {
              ...defaultQuestionResponses[0],
              responses: [],
            },
          ],
        },
        // 2nd section - 2nd question
        {
          ...defaultQuestion,
          questionResponses: [],
        },
      ],
      // third section
      [
        // 3nd section - 2nd question
        {
          ...defaultQuestion,
          questionResponses: [],
        },
      ],
    ];
    const { sections_questions_questionResponses_response: responses } =
      flattenOneTrustQuestions(questions, 'sections');
    // 1st section has 3 questions, the first with 2 answers
    const section1 = '[[s1q1r1,s1q1r2],[],[]]';
    // 2nd section has 2 questions, none with answers.
    const section2 = '[[],[]]';
    // 2nd section has 1 question without answers
    const section3 = '[[]]';
    expect(responses).to.equal(`${section1},${section2},${section3}`);
  });
});
