import type {SubscriptionBillingCycleScheduleEditMutation} from 'types/admin.generated';
import type {SubscriptionBillingCycleScheduleEditInputScheduleEditReason} from 'types/admin.types';
import SubscriptionBillingCycleScheduleEdit from '~/graphql/SubscriptionBillingCycleScheduleEditMutation';
import type {GraphQLClient} from '~/types';

export async function skipOrResumeBillingCycle(
  graphql: GraphQLClient,
  subscriptionContractId: string,
  billingCycleIndex: number,
  skip: string,
) {
  const response = await graphql(SubscriptionBillingCycleScheduleEdit, {
    variables: {
      billingCycleInput: {
        contractId: subscriptionContractId,
        selector: {
          index: billingCycleIndex,
        },
      },
      input: {
        reason:
          'MERCHANT_INITIATED' as SubscriptionBillingCycleScheduleEditInputScheduleEditReason,
        skip: skip === 'skip',
      },
    },
  });

  const error = new Error(
    `Failed to skip or resume billing cycle for contract: ${subscriptionContractId}`,
  );

  try {
    const {
      data: {subscriptionBillingCycleScheduleEdit},
    } = (await response.json()) as {
      data: SubscriptionBillingCycleScheduleEditMutation;
    };

    if (!subscriptionBillingCycleScheduleEdit) {
      throw error;
    }

    return subscriptionBillingCycleScheduleEdit;
  } catch (e) {
    throw error;
  }
}

// index ずれ問題を避けたい場面（webhook 直後の新規契約など）向けに date 選択版を用意。
// billingCycleDate は Shopify Admin API の DateTime を受け付ける ISO 文字列。
export async function skipBillingCycleByDate(
  graphql: GraphQLClient,
  subscriptionContractId: string,
  billingCycleDate: string,
) {
  const response = await graphql(SubscriptionBillingCycleScheduleEdit, {
    variables: {
      billingCycleInput: {
        contractId: subscriptionContractId,
        selector: {
          date: billingCycleDate,
        },
      },
      input: {
        reason:
          'MERCHANT_INITIATED' as SubscriptionBillingCycleScheduleEditInputScheduleEditReason,
        skip: true,
      },
    },
  });

  const error = new Error(
    `Failed to skip billing cycle by date for contract: ${subscriptionContractId}`,
  );

  try {
    const {
      data: {subscriptionBillingCycleScheduleEdit},
    } = (await response.json()) as {
      data: SubscriptionBillingCycleScheduleEditMutation;
    };

    if (!subscriptionBillingCycleScheduleEdit) {
      throw error;
    }

    return subscriptionBillingCycleScheduleEdit;
  } catch (e) {
    throw error;
  }
}
