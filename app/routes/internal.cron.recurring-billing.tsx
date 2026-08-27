import type {LoaderFunctionArgs} from '@remix-run/node';

import {json} from '@remix-run/node';

import {jobs, RecurringBillingChargeJob} from '~/jobs';
import {logger} from '~/utils/logger.server';

export async function loader({request}: LoaderFunctionArgs) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    logger.error('CRON_SECRET env var is not configured');
    return json({error: 'server misconfigured'}, {status: 500});
  }

  const auth = request.headers.get('authorization') ?? '';
  if (auth !== `Bearer ${secret}`) {
    return json({error: 'unauthorized'}, {status: 401});
  }

  const job = new RecurringBillingChargeJob({});
  await jobs.enqueue(job);

  return json({status: 'success'}, {status: 200});
}
