import {SubscriptionList} from './SubscriptionList';
import {SubscriptionDetails} from './SubscriptionDetails';
import {useNavigationCurrentEntry} from '@shopify/ui-extensions-react/customer-account';

const SUBSCRIPTION_DETAIL_PATTERN = /\/subscriptions\/(\d+)(?:\/|$)/;

export function Router() {
  const currentEntry = useNavigationCurrentEntry();

  let detailId: string | undefined;
  try {
    const rawUrl = currentEntry?.url;
    if (rawUrl) {
      const url = new URL(rawUrl);
      const detailMatch = url.pathname.match(SUBSCRIPTION_DETAIL_PATTERN);
      if (detailMatch) {
        detailId = detailMatch[1];
      }
    }
  } catch (err) {
    console.error('[buyer-subscriptions] Router URL parse failed:', err);
  }

  if (detailId) {
    return <SubscriptionDetails id={detailId} />;
  }
  return <SubscriptionList />;
}
