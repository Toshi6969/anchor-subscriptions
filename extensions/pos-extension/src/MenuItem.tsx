import {render} from 'preact';
import I18nProvider from './components/I18nProvider';

const ButtonComponent = () => {
  const handleButtonPress = () => {
    shopify.action.presentModal();
  };

  const hasSellingPlanGroups = shopify.cartLineItem?.hasSellingPlanGroups;
  const enabled = Boolean(hasSellingPlanGroups);

  const disabledReason = !hasSellingPlanGroups ? 'feature-disabled' : null;

  return (
    <s-button
      onClick={handleButtonPress}
      disabled={!enabled}
      variant="secondary"
      data-testid="subscription-menu-item"
      data-disabled-reason={disabledReason}
    />
  );
};

export default async () => {
  render(
    <I18nProvider locale={shopify.locale}>
      <ButtonComponent />
    </I18nProvider>,
    document.body,
  );
};
