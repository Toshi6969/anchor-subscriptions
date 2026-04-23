import {Cart} from '@shopify/ui-extensions/point-of-sale';
import {getSubscriptionItems} from '../utils/cart';
import {useState} from 'preact/hooks';
import {PreactI18n} from '../i18n/config';
import {getPlural} from '../utils/locale';

export interface SellingPlansTile {
  title: string;
  subtitle: string;
  enabled: boolean;
  disabledReason: 'feature-disabled' | null;
  onCartChange: (cart: Cart) => void;
}

export const useSellingPlanTile = (
  initialCart: Cart,
  i18n: PreactI18n,
): SellingPlansTile => {
  const [subscriptionItemsCount, setSubscriptionItemsCount] = useState(
    getSubscriptionItems(initialCart).length,
  );

  const handleCartChange = (cart: Cart) => {
    setSubscriptionItemsCount(getSubscriptionItems(cart).length);
  };

  const hasSubscriptions = subscriptionItemsCount > 0;

  const disabledReason = !hasSubscriptions ? 'feature-disabled' : null;

  return {
    title: i18n.t('Tile.title'),
    subtitle: getPlural(
      i18n,
      'Tile.subtitle.available',
      subscriptionItemsCount,
    ),
    enabled: hasSubscriptions,
    disabledReason,
    onCartChange: handleCartChange,
  };
};
