// import { expect } from 'chai';
import { OneTrustEnrichedAssessment } from '../../codecs';
import { oneTrustAssessmentToCsvRecord } from '../oneTrustAssessmentToCsvRecord';

// FIXME: add tests for the important helpers
describe('oneTrustAssessmentToCsvRecord', () => {
  it('test empty questions', () => {
    const assessment: OneTrustEnrichedAssessment = {
      assessmentId: 'assessment-id',
      sections: [],
      createDt: 'today',
      lastUpdated: 'yesterday',
      name: 'oneTrust assessment',
      number: 0,
      openRiskCount: 1,
      inherentRiskScore: 2,
      residualRiskScore: 3,
      targetRiskScore: null,
      orgGroupName: 'oneTrust group',
      primaryInventoryDetails: null,
      result: null,
      resultId: null,
      resultName: null,
      state: 'ACTIVE',
      tags: [],
      templateId: 'template-id',
      templateName: 'template',
      templateRootVersionId: 'template-root-version-id',
      approvers: [],
      assessmentNumber: 0,
      completedOn: 'tomorrow',
      status: 'IN_PROGRESS',
      createdBy: { id: 'id', name: 'name', nameKey: null },
      createdDT: 'today',
      deadline: 'today',
      description: 'description',
      lowRisk: 0,
      mediumRisk: 0,
      highRisk: 0,
      orgGroup: {
        id: '',
        name: '',
      },
      primaryEntityDetails: [],
      primaryRecordType: null,
      respondent: { id: '', name: '' },
      respondents: [],
      riskLevel: 'None',
      submittedOn: 'yesterday',
      template: {
        id: '',
        name: '',
        nameKey: null,
      },
      totalRiskCount: 0,
      veryHighRisk: 0,
      welcomeText: null,
    };

    const result = oneTrustAssessmentToCsvRecord(assessment);
    console.log({ result });
  });
});
