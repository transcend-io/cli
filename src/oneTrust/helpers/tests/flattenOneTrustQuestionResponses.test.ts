import chai, { expect } from 'chai';
import deepEqualInAnyOrder from 'deep-equal-in-any-order';

import { flattenOneTrustQuestions } from '../flattenOneTrustAssessment';
import { createDefaultCodec } from '@transcend-io/type-utils';
import {
  OneTrustAssessmentNestedQuestion,
  OneTrustAssessmentQuestionOption,
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
  const defaultNestedQuestion: OneTrustAssessmentNestedQuestion =
    createDefaultCodec(OneTrustAssessmentNestedQuestion);
  const defaultQuestionOption: OneTrustAssessmentQuestionOption =
    createDefaultCodec(OneTrustAssessmentQuestionOption);

  it('should return an empty flat object on empty list input', () => {
    const questions = [[]];
    const result = flattenOneTrustQuestions(questions, 'sections');
    expect(result).to.deep.equal({});
  });

  it('should correctly flatten questions responses for multiple sections', () => {
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
    const questions: OneTrustEnrichedAssessmentQuestion[][] = [
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
    const { questions_questionResponses_response: responses } =
      flattenOneTrustQuestions(questions, '');
    // 1st section has 3 questions, the first with 2 answers
    const section1 = '[[s1q1r1,s1q1r2],[],[]]';
    // 2nd section has 2 questions, none with answers.
    const section2 = '[[],[]]';
    // 2nd section has 1 question without answers
    const section3 = '[[]]';
    expect(responses).to.equal(`${section1},${section2},${section3}`);
  });

  it.only('should correctly flatten nested question options for multiple sections', () => {
    const questions: OneTrustEnrichedAssessmentQuestion[][] = [
      // 1st section
      [
        // 1st section - 1st question
        {
          ...defaultQuestion,
          question: {
            ...defaultNestedQuestion,
            options: [
              {
                ...defaultQuestionOption,
                option: 's1q1o1',
              },
              {
                ...defaultQuestionOption,
                option: 's1q1o2',
              },
            ],
          },
        },
        // 1st section - 2nd question
        {
          ...defaultQuestion,
          question: {
            ...defaultNestedQuestion,
            options: [
              {
                ...defaultQuestionOption,
                option: 's1q2o1',
              },
            ],
          },
        },
        // 1st section - 3rd question
        {
          ...defaultQuestion,
          question: {
            ...defaultNestedQuestion,
            options: [],
          },
        },
        // 1st section - 4th question
        {
          ...defaultQuestion,
          question: {
            ...defaultNestedQuestion,
            options: null,
          },
        },
      ],
      // 2nd section
      [
        // 2nd section - 1st question
        {
          ...defaultQuestion,
          question: {
            ...defaultNestedQuestion,
            options: [],
          },
        },
        // 2nd section - 2nd question
        {
          ...defaultQuestion,
          question: {
            ...defaultNestedQuestion,
            options: null,
          },
        },
      ],
      // 3rd section
      [
        // 3rd section - 1st question
        {
          ...defaultQuestion,
          question: {
            ...defaultNestedQuestion,
            options: null,
          },
        },
      ],
    ];

    const { sections_questions_options_option } = flattenOneTrustQuestions(
      questions,
      'sections',
    );

    // [[s1q1o1,s1q1o2],[s1q2o1],[],[]],[[],[]],[[]]
    // [[s1q1o1,s1q1o2],[s1q2o1],[],[]],[[],[]][[]]

    // 1st section has 4 questions, the first with 2 options, the second with 1 option,
    const section1 = '[[s1q1o1,s1q1o2],[s1q2o1],[],[]]';
    // 2nd section has 2 questions, none with options
    const section2 = '[[],[]]';
    // 3rd section has 1 question without options
    const section3 = '[[]]';
    expect(sections_questions_options_option).to.equal(
      `${section1},${section2},${section3}`,
    );
  });
});
