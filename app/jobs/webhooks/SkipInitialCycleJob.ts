import type {Jobs} from '~/types';

import {Job} from '~/lib/jobs';
import {unauthenticated} from '~/shopify.server';
import {skipBillingCycleByDate} from '~/services/SubscriptionBillingCycleEditService';

// 契約作成時に initial billing cycle が cooling 期間内に落ちる場合、
// 該当サイクルを skip して次サイクル（アンカー日）に送るジョブ。
// 呼び出し判定は webhook 側（webhooks.subscription_contracts.create.tsx）で実施。
export class SkipInitialCycleJob extends Job<
  Jobs.Parameters<Jobs.SkipInitialCyclePayload>
> {
  public queue: string = 'webhooks';

  async perform(): Promise<void> {
    const {shop, payload} = this.parameters;
    const {contractId, billingCycleDate} = payload;

    const {admin} = await unauthenticated.admin(shop);
    const result = await skipBillingCycleByDate(
      admin.graphql,
      contractId,
      billingCycleDate,
    );

    if (result.userErrors && result.userErrors.length > 0) {
      this.logger.warn(
        {contractId, billingCycleDate, userErrors: result.userErrors},
        'SkipInitialCycleJob: userErrors returned from Shopify',
      );
    } else {
      this.logger.info(
        {contractId, billingCycleDate},
        'SkipInitialCycleJob: initial billing cycle skipped (cooling period)',
      );
    }
  }
}
