// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  // OneTrustApprover,
  OneTrustAssessment,
  OneTrustAssessmentQuestion,
  OneTrustAssessmentSection,
  OneTrustGetAssessmentResponse,
} from './types';

const flattenObject = (obj: any, prefix = ''): any =>
  Object.keys(obj).reduce((acc, key) => {
    const newKey = prefix ? `${prefix}_${key}` : key;

    const entry = obj[key];
    if (typeof entry === 'object' && entry !== null && !Array.isArray(entry)) {
      Object.assign(acc, flattenObject(entry, newKey));
    } else {
      acc[newKey] = Array.isArray(entry)
        ? entry
            .map((e) => {
              if (typeof e === 'string') {
                return e.replaceAll(',', '');
              }
              return e;
            })
            .join(', ')
        : typeof entry === 'string'
        ? entry.replaceAll(',', '')
        : entry;
    }
    return acc;
  }, {} as Record<string, any>);

const flattenList = (list: any[], prefix: string): any => {
  if (list.length === 0) {
    return {};
  }
  const flattenedList = list.map((obj) => flattenObject(obj, prefix));

  // get all possible keys from the flattenedList
  const allKeys = Array.from(
    new Set(flattenedList.flatMap((a) => Object.keys(a))),
  );

  // build a single object where all the keys contain the respective values of flattenedList
  return allKeys.reduce((acc, key) => {
    const values = flattenedList.map((a) => a[key] ?? '').join(', ');
    acc[key] = values;
    return acc;
  }, {} as Record<string, any>);
};

const flattenOneTrustQuestion = (
  oneTrustQuestion: OneTrustAssessmentQuestion,
  prefix: string,
): any => {
  const {
    question: { options: questionOptions, ...restQuestion },
    // TODO: continue from here
    // questionResponses,
    // risks,
    ...rest
  } = oneTrustQuestion;
  const newPrefix = `${prefix}_questions_${restQuestion.sequence}`;

  return {
    ...flattenObject({ ...restQuestion, ...rest }, newPrefix),
    ...flattenList(questionOptions ?? [], `${newPrefix}_options`),
  };
};

const flattenOneTrustQuestions = (
  questions: OneTrustAssessmentQuestion[],
  prefix: string,
): any =>
  questions
    .map((question) => flattenOneTrustQuestion(question, prefix))
    .reduce((acc, flattenedQuestion) => ({ ...acc, ...flattenedQuestion }), {});

const flattenOneTrustSection = (section: OneTrustAssessmentSection): any => {
  // TODO: flatten header
  const { questions, header, ...rest } = section;
  // append the section sequence as a prefix (e.g. sections_${sequence}_header_sectionId)
  const prefix = `sections_${section.sequence}`;

  return {
    ...flattenObject({ ...header, ...rest }, prefix),
    ...flattenOneTrustQuestions(questions, prefix),
  };
};

const flattenOneTrustSections = (sections: OneTrustAssessmentSection[]): any =>
  sections
    .map((s) => flattenOneTrustSection(s))
    .reduce((acc, flattenedSection) => ({ ...acc, ...flattenedSection }), {});

export const flattenOneTrustAssessment = (
  assessment: OneTrustAssessment & OneTrustGetAssessmentResponse,
): any => {
  const {
    approvers,
    primaryEntityDetails,
    respondents,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    respondent,
    sections,
    ...rest
  } = assessment;

  // console.log({ approvers: flattenApprovers(approvers) });
  return {
    ...flattenObject(rest),
    ...flattenList(approvers, 'approvers'),
    ...flattenList(primaryEntityDetails, 'primaryEntityDetails'),
    ...flattenList(respondents, 'respondents'),
    ...flattenOneTrustSections(sections),
  };
};

/**
 *
 *
 * TODO: convert to camelCase -> Title Case
 * TODO: section -> header is spread
 * TODO: section -> questions -> question is spread
 * TODO: section -> questions -> question -> questionOptions are aggregated
 * TODO: section -> questions -> question -> questionResponses -> responses are spread
 */
