import type {ActionFunctionArgs} from '@remix-run/node';
import {authenticate} from '~/shopify.server';
import {logger} from '~/utils/logger.server';
import {
  CustomerSendEmailJob,
  jobs,
  SkipInitialCycleJob,
  TagSubscriptionOrderJob,
} from '~/jobs';
import {CustomerEmailTemplateName} from '~/services/CustomerSendEmailService';
import type {Jobs, Webhooks} from '~/types';
import {FIRST_ORDER_TAGS} from '~/jobs/tags/constants';
import {NEW_CONTRACT_COOLING_DAYS} from '~/utils/constants';

export const action = async ({request}: ActionFunctionArgs) => {
  const {topic, shop, payload} = await authenticate.webhook(request);

  logger.info({topic, shop, payload}, 'Received webhook');

  const contractPayload = payload as Webhooks.SubscriptionContractsCreate;

  const {admin_graphql_api_origin_order_id: orderId} = contractPayload;
  if (orderIsFromCheckout(orderId)) {
    const emailParams: Jobs.Parameters<Webhooks.SubscriptionContractEvent> = {
      shop,
      payload: {
        ...contractPayload,
        emailTemplate: CustomerEmailTemplateName.NewSubscription,
      },
    };

    jobs.enqueue(new CustomerSendEmailJob(emailParams));
  }

  const tagParams: Jobs.Parameters<Jobs.TagSubscriptionsOrderPayload> = {
    shop,
    payload: {
      orderId: contractPayload.admin_graphql_api_origin_order_id,
      tags: FIRST_ORDER_TAGS,
    },
  };

  jobs.enqueue(new TagSubscriptionOrderJob(tagParams));

  enqueueCoolingPeriodSkipIfNeeded(shop, contractPayload);

  return new Response();
};

function orderIsFromCheckout(orderId: string | null): boolean {
  return orderId !== null;
}

// 契約作成から次回課金までが NEW_CONTRACT_COOLING_DAYS 未満の場合、
// 初回サイクルを skip して翌サイクル（selling plan のアンカー日）に送る。
// 冪等: 二度目に webhook が来たとき next_billing_date は既に翌サイクルに
// 進んでいるので閾値越えて enqueue されない。
function enqueueCoolingPeriodSkipIfNeeded(
  shop: string,
  contractPayload: Webhooks.SubscriptionContractsCreate,
): void {
  const {
    admin_graphql_api_id: contractId,
    next_billing_date: nextBillingDateRaw,
    created_at: createdAtRaw,
  } = contractPayload;

  if (!nextBillingDateRaw || !createdAtRaw) {
    logger.warn(
      {contractId},
      'Cooling period check skipped: next_billing_date or created_at missing from payload',
    );
    return;
  }

  const nextBillingDate = new Date(nextBillingDateRaw);
  const createdAt = new Date(createdAtRaw);

  if (Number.isNaN(nextBillingDate.getTime()) || Number.isNaN(createdAt.getTime())) {
    logger.warn(
      {contractId, nextBillingDateRaw, createdAtRaw},
      'Cooling period check skipped: unparsable date fields',
    );
    return;
  }

  const daysUntilNext =
    (nextBillingDate.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

  if (daysUntilNext >= NEW_CONTRACT_COOLING_DAYS) {
    return;
  }

  logger.info(
    {contractId, daysUntilNext, thresholdDays: NEW_CONTRACT_COOLING_DAYS},
    'Enqueueing SkipInitialCycleJob (new contract cooling period)',
  );

  const params: Jobs.Parameters<Jobs.SkipInitialCyclePayload> = {
    shop,
    payload: {
      contractId,
      billingCycleDate: nextBillingDate.toISOString(),
    },
  };

  jobs.enqueue(new SkipInitialCycleJob(params));
}
