import { createAwsTools } from './tools/aws.js';
import {
  createSyntheticTools,
  FIXTURE_INSTANCE,
  type Scenario,
} from './tools/aws-synthetic.js';

const live = process.argv.includes('--live');
const tools = live
  ? createAwsTools({ expectedAccountId: process.env.AWS_EXPECTED_ACCOUNT_ID })
  : createSyntheticTools((process.argv[2] ?? 'A') as Scenario);
try {
  if (live) {
    // A bounded inventory smoke check; no resource details, tags or account IDs logged.
    const result = await tools.getEC2Instances();
    console.log(
      JSON.stringify(
        {
          mode: 'live',
          status: result.status,
          instanceCount: result.evidence.length,
          issueCodes: result.issues.map((i) => i.code),
        },
        null,
        2,
      ),
    );
    if (['error', 'unavailable'].includes(result.status)) process.exitCode = 1;
  } else {
    console.log(
      JSON.stringify(
        {
          inventory: await tools.getEC2Instances(),
          utilization: await tools.getUtilization(FIXTURE_INSTANCE),
          billing: await tools.getCostEvidence(FIXTURE_INSTANCE),
          operations: await tools.getOperationalEvidence(FIXTURE_INSTANCE),
        },
        null,
        2,
      ),
    );
  }
} finally {
  tools.close();
}
