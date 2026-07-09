import {render} from 'preact';
import '@shopify/ui-extensions/customer-account';

import CustomerSubscriptionsQuery from './graphql/CustomerSubscriptionsQuery';
import {nodesFromEdges} from '@shopify/admin-graphql-api-utilities';
import {fetchCustomerApi} from '../../shared/services/customerApi';

interface SubscriptionContract {
  id: string;
  status: string;
}

const ACTIVE_STATUSES = new Set(['ACTIVE', 'PAUSED', 'FAILED']);

export default async function extension() {
  try {
    const {data} = await fetchCustomerApi(CustomerSubscriptionsQuery);

    const contracts: SubscriptionContract[] = nodesFromEdges(
      data?.customer?.subscriptionContracts?.edges || [],
    );

    const activeContracts = contracts.filter((c) =>
      ACTIVE_STATUSES.has(c.status),
    );

    if (activeContracts.length === 0) {
      return;
    }

    render(
      <SubscriptionNavCard count={activeContracts.length} />,
      document.body,
    );
  } catch (error) {
    console.error(
      '[order-index-subs-block] Failed to fetch subscriptions:',
      error,
    );
  }
}

interface SubscriptionNavCardProps {
  count: number;
}

function SubscriptionNavCard({count}: SubscriptionNavCardProps) {
  return (
    <s-section heading="定期便管理">
      <s-stack gap="base">
        <s-text>現在 {count} 件の定期便があります。</s-text>
        <s-button href="extension:buyer-subscriptions/" variant="primary">
          定期便を管理する
        </s-button>
      </s-stack>
    </s-section>
  );
}
