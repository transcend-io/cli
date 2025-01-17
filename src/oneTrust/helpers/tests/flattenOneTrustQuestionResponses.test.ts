/* eslint-disable max-lines */
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
import {
  OneTrustEnrichedAssessmentQuestion,
  OneTrustEnrichedRisk,
} from '../../codecs';

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
  const defaultQuestionRisk: OneTrustEnrichedRisk =
    createDefaultCodec(OneTrustEnrichedRisk);

  it('should return an empty flat object on empty list input', () => {
    const questions = [[]];
    const result = flattenOneTrustQuestions(questions, 'sections');
    expect(result).to.deep.equal({});
  });

  it('should correctly flatten questions responses', () => {
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
    const allSectionQuestions: OneTrustEnrichedAssessmentQuestion[][] = [
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
    const { questions_questionResponses_response } = flattenOneTrustQuestions(
      allSectionQuestions,
      '',
    );
    // 1st section has 3 questions, the first with 2 answers
    const section1 = '[[s1q1r1,s1q1r2],[],[]]';
    // 2nd section has 2 questions, none with answers.
    const section2 = '[[],[]]';
    // 2nd section has 1 question without answers
    const section3 = '[[]]';
    expect(questions_questionResponses_response).to.equal(
      `${section1},${section2},${section3}`,
    );
  });

  it('should correctly flatten questions risks', () => {
    const allSectionQuestions: OneTrustEnrichedAssessmentQuestion[][] = [
      // section 1
      [
        // 1st section - 1st question
        {
          ...defaultQuestion,
          risks: [
            {
              ...defaultQuestionRisk,
              name: 's1q1r1',
            },
            {
              ...defaultQuestionRisk,
              name: 's1q1r2',
            },
          ],
        },
        // 1st section - 2nd question
        {
          ...defaultQuestion,
          risks: [
            {
              ...defaultQuestionRisk,
              name: 's1q2r1',
            },
          ],
        },
        {
          // 1st section - 3rd question
          ...defaultQuestion,
          risks: [],
        },
        // 1st section - 4th question
        {
          ...defaultQuestion,
          risks: null,
        },
      ],
      // section 2
      [
        {
          // 2nd section - 1st question
          ...defaultQuestion,
          risks: [],
        },
        // 2nd section - 2nd question
        {
          ...defaultQuestion,
          risks: [
            {
              ...defaultQuestionRisk,
              name: 's2q2r1',
            },
          ],
        },

        // 1st section - 3rd question
        {
          ...defaultQuestion,
          risks: null,
        },
      ],
      // section 3
      [
        {
          // 3rd - 1st question
          ...defaultQuestion,
          risks: [],
        },
        // 3rd - 2nd question
        {
          ...defaultQuestion,
          risks: null,
        },
      ],
      // section 4
      [
        // 4rth section - 1st question
        {
          ...defaultQuestion,
          risks: null,
        },
      ],
    ];
    const { sections_questions_risks_name } = flattenOneTrustQuestions(
      allSectionQuestions,
      'sections',
    );

    // 1st section has 4 questions, the 1st with 2 risks, the 2nd with 1, and the rest with none
    const section1 = '[[s1q1r1,s1q1r2],[s1q2r1],[],[]]';
    // 2nd section has 3 questions, one with one risk
    const section2 = '[[],[s2q2r1],[]]';
    // 4th section has 2 questions, none with risk
    const section3 = '[[],[]]';
    // 4th section has 1 question without risk
    const section4 = '[[]]';
    expect(sections_questions_risks_name).to.equal(
      `${section1},${section2},${section3},${section4}`,
    );
  });

  it('should correctly flatten nested questions', () => {
    const allSectionQuestions: OneTrustEnrichedAssessmentQuestion[][] = [
      // section 1 has 2 questions
      [
        {
          ...defaultQuestion,
          question: {
            ...defaultNestedQuestion,
            sequence: 0,
            questionType: 'ATTRIBUTE',
            content: 's1q1',
          },
        },
        {
          ...defaultQuestion,
          question: {
            ...defaultNestedQuestion,
            sequence: 1,
            questionType: 'ENGAGEMENT',
            content: 's1q2',
          },
        },
      ],
      // section 2 has 0 questions
      [],
    ];
    const {
      sections_questions_sequence,
      sections_questions_questionType,
      sections_questions_content,
    } = flattenOneTrustQuestions(allSectionQuestions, 'sections');
    expect(sections_questions_sequence).to.equal('[0,1],[]');
    expect(sections_questions_questionType).to.equal(
      '[ATTRIBUTE,ENGAGEMENT],[]',
    );
    expect(sections_questions_content).to.equal('[s1q1,s1q2],[]');
  });

  it('should correctly flatten nested question options', () => {
    const allSectionQuestions: OneTrustEnrichedAssessmentQuestion[][] = [
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
      allSectionQuestions,
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
/* eslint-enable max-lines */
