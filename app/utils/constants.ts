export const NUM_BILLING_CYCLES_TO_SHOW = 6;
export const POLLING_INTERVAL = 1000;
export const MAX_SELLING_PLAN_PRODUCTS = 250;
export const SELLING_PLAN_DELETED_PARAM = 'planDeleted';

// 新規契約の作成から次回課金までがこの日数未満なら初回サイクルを skip して
// 翌サイクル（アンカー日）に送る。物品定期便で「買った直後にまた引き落とし」を防ぐ運用ガード。
export const NEW_CONTRACT_COOLING_DAYS = 14;

export const SkipOrResume = {
  Skip: 'skip',
  Resume: 'resume',
};
