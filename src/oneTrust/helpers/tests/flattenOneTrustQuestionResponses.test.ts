/* eslint-disable max-lines */
import chai, { expect } from 'chai';
import deepEqualInAnyOrder from 'deep-equal-in-any-order';

import {
  flattenOneTrustQuestions,
  flattenOneTrustSections,
} from '../flattenOneTrustAssessment';
import { createDefaultCodec } from '@transcend-io/type-utils';
import {
  OneTrustAssessmentNestedQuestion,
  OneTrustAssessmentQuestionOption,
  OneTrustAssessmentQuestionResponses,
  OneTrustAssessmentResponses,
  OneTrustAssessmentSectionHeader,
  OneTrustEnrichedAssessmentQuestion,
  OneTrustEnrichedAssessmentSection,
  OneTrustEnrichedRisk,
  OneTrustRiskCategories,
} from '@transcend-io/privacy-types';

chai.use(deepEqualInAnyOrder);

describe('flattenOneTrustAssessment', () => {
  const defaultQuestion: OneTrustEnrichedAssessmentQuestion =
    createDefaultCodec(OneTrustEnrichedAssessmentQuestion);
  const defaultNestedQuestion: OneTrustAssessmentNestedQuestion =
    createDefaultCodec(OneTrustAssessmentNestedQuestion);

  describe('flattenOneTrustSections', () => {
    const defaultSection: OneTrustEnrichedAssessmentSection =
      createDefaultCodec(OneTrustEnrichedAssessmentSection);
    const defaultSectionHeader: OneTrustAssessmentSectionHeader =
      createDefaultCodec(OneTrustAssessmentSectionHeader);

    it('should correctly flatten the section headers', () => {
      const sections: OneTrustEnrichedAssessmentSection[] = [
        {
          ...defaultSection,
          header: {
            ...defaultSectionHeader,
            sectionId: 'section-0-id',
            name: 'section-0',
            riskStatistics: {
              maxRiskLevel: 10,
              riskCount: 5,
              sectionId: 'section-0-id',
            },
          },
        },
        {
          ...defaultSection,
          header: {
            ...defaultSectionHeader,
            sectionId: 'section-1-id',
            name: 'section-1',
            riskStatistics: null,
          },
        },
      ];

      const {
        sections_name,
        sections_sectionId,
        sections_riskStatistics_maxRiskLevel,
        sections_riskStatistics_riskCount,
        sections_riskStatistics_sectionId,
      } = flattenOneTrustSections(sections);
      expect(sections_name).to.equal('section-0,section-1');
      expect(sections_sectionId).to.equal('section-0-id,section-1-id');
      expect(sections_riskStatistics_maxRiskLevel).to.equal('10,');
      expect(sections_riskStatistics_riskCount).to.equal('5,');
      expect(sections_riskStatistics_sectionId).to.equal('section-0-id,');
    });

    it('should correctly flatten the section questions', () => {
      const sections: OneTrustEnrichedAssessmentSection[] = [
        {
          ...defaultSection,
          questions: [
            {
              ...defaultQuestion,
              question: {
                ...defaultNestedQuestion,
                content: 'section0-question0',
              },
            },
          ],
        },
        {
          ...defaultSection,
          questions: [],
        },
        {
          ...defaultSection,
          questions: [
            {
              ...defaultQuestion,
              question: {
                ...defaultNestedQuestion,
                content: 'section1-question0',
              },
            },
          ],
        },
      ];

      const result = flattenOneTrustSections(sections);
      // should ignore sections without questions
      const { sections_questions_content } = result;
      expect(sections_questions_content).to.equal(
        '[section0-question0],[section1-question0]',
      );
    });
  });

  describe('flattenOneTrustQuestions', () => {
    const defaultQuestionResponses: OneTrustAssessmentQuestionResponses =
      createDefaultCodec(OneTrustAssessmentQuestionResponses);
    const defaultResponses: OneTrustAssessmentResponses = createDefaultCodec(
      OneTrustAssessmentResponses,
    );
    const defaultQuestionOption: OneTrustAssessmentQuestionOption =
      createDefaultCodec(OneTrustAssessmentQuestionOption);
    const defaultRisk: OneTrustEnrichedRisk =
      createDefaultCodec(OneTrustEnrichedRisk);
    const defaultRiskCategory: OneTrustRiskCategories = createDefaultCodec(
      OneTrustRiskCategories,
    );

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
      const { sections_questions_questionResponses_response } =
        flattenOneTrustQuestions(allSectionQuestions, 'sections');
      // 1st section has 3 questions, the first with 2 answers
      const section1 = '[[s1q1r1,s1q1r2],[],[]]';
      // 2nd section has 2 questions, none with answers.
      const section2 = '[[],[]]';
      // 2nd section has 1 question without answers
      const section3 = '[[]]';
      expect(sections_questions_questionResponses_response).to.equal(
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
                ...defaultRisk,
                name: 's1q1r1',
              },
              {
                ...defaultRisk,
                name: 's1q1r2',
              },
            ],
          },
          // 1st section - 2nd question
          {
            ...defaultQuestion,
            risks: [
              {
                ...defaultRisk,
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
                ...defaultRisk,
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

    it('should correctly flatten questions risks categories', () => {
      const allSectionQuestions: OneTrustEnrichedAssessmentQuestion[][] = [
        // section 0
        [
          // question 0
          {
            ...defaultQuestion,
            risks: [
              // risk 0
              {
                ...defaultRisk,
                categories: [
                  // category 0
                  {
                    ...defaultRiskCategory[0],
                    name: 's010r0c0',
                  },
                  // category 1
                  {
                    ...defaultRiskCategory[0],
                    name: 's010r0c1',
                  },
                ],
              },
              // risk 1
              {
                ...defaultRisk,
                categories: [],
              },
            ],
          },
          // question 1
          {
            ...defaultQuestion,
            risks: [
              // risk 1
              {
                ...defaultRisk,
                // empty categories
                categories: [],
              },
              // risk 2
              {
                ...defaultRisk,
                // empty categories
                categories: [],
              },
            ],
          },
          // question 2
          {
            ...defaultQuestion,
            risks: [
              // risk 0
              {
                ...defaultRisk,
                // empty categories
                categories: [],
              },
              // risk 1
              {
                ...defaultRisk,
                categories: [
                  // category 0
                  {
                    ...defaultRiskCategory[0],
                    name: 's0q2r1c0',
                  },
                ],
              },
              // risk 2
              {
                ...defaultRisk,
                // empty categories
                categories: [],
              },
            ],
          },
          // question 3
          {
            ...defaultQuestion,
            // empty risks
            risks: [],
          },
          // TODO: test with null risks
        ],
        // section 1
        [
          // question 0
          {
            ...defaultQuestion,
            risks: [
              // risk 0
              {
                ...defaultRisk,
                // empty categories
                categories: [],
              },
            ],
          },
        ],
        // section 2
        [
          // question 0
          {
            ...defaultQuestion,
            // empty risks
            risks: [],
          },
          // question 1
          {
            ...defaultQuestion,
            // empty risks
            risks: [],
          },
        ],
        // section 3
        [
          // question 0
          {
            ...defaultQuestion,
            risks: [
              {
                ...defaultRisk,
                // empty categories
                categories: [],
              },
            ],
          },
          // question 1
          {
            ...defaultQuestion,
            // empty risks
            risks: [],
          },
        ],
      ];

      // section 0 question 0 has 2 risks, the first with 2 categories
      const section0Question0 = '[[s010r0c0,s010r0c1],[]]';
      // section 0 question 1 has 2 risks, none with categories
      const section0Question1 = '[[],[]]';
      // section 0 question 2 has 3 risks, the middle one with 1 category
      const section0Question2 = '[[],[s0q2r1c0],[]]';
      // section 0 question 3 has 0 risks
      const section0Question3 = '[]';
      const section0 = `[${section0Question0},${section0Question1},${section0Question2},${section0Question3}]`;
      // section 1 question 0 has 1 risk with empty categories
      const section1question0 = '[[]]';
      const section1 = `[${section1question0}]`;
      // section 2 questions have 0 risk
      const section2 = '[]';
      // section 3 question 0 has 1 risk with empty categories
      const section3question0 = '[[]]';
      // section 3 question 1 has 0 risks
      const section3question1 = '[]';
      const section3 = `[${section3question0},${section3question1}]`;
      const { sections_questions_risks_categories_name } =
        flattenOneTrustQuestions(allSectionQuestions, 'sections');
      expect(sections_questions_risks_categories_name).to.equal(
        `${section0},${section1},${section2},${section3}`,
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
});

/* eslint-enable max-lines */
