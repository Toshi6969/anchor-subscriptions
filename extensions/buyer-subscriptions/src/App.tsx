import {SubscriptionList} from './SubscriptionList';
import {SubscriptionDetails} from './SubscriptionDetails';
import {useNavigationCurrentEntry} from '@shopify/ui-extensions-react/customer-account';

// Match /subscriptions/<numericId> at the end of the pathname. The
// original implementation used includes('subscriptions'), which matched
// the extension's own base path `/account/pages/buyer-subscriptions` and
// then threw "Not found" from getSubscriptionIdFromPath. Anchor the
// check to an exact `subscriptions` path segment followed by a numeric id.
const SUBSCRIPTION_DETAIL_PATTERN = /\/subscriptions\/(\d+)(?:\/|$)/;

export function Router() {
  const currentEntry = useNavigationCurrentEntry();

  const url = new URL(currentEntry.url);
  const detailMatch = url.pathname.match(SUBSCRIPTION_DETAIL_PATTERN);

  if (detailMatch) {
    return <SubscriptionDetails id={detailMatch[1]} />;
  }
  return <SubscriptionList />;
}
