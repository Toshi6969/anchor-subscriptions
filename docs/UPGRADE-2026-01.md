# UI 拡張機能の API 2026-01 移行（引き継ぎメモ）

作成: 2026-10-08（amberang-jp のセッションで調査。まだ何も変更していない）

## きっかけ

Shopify から 2026-09-30 付のメール「UI拡張機能を Polaris Web コンポーネントにアップグレードする」。
要旨: API 2025-07 以前の UI 拡張機能が 1 個ある。2026-10-01 以降、アプリ内のすべての UI 拡張機能が
API 2026-01 以降になるまで、Shopify CLI でアプリの更新をデプロイできない。ストア上では動き続け、購入者への影響はない。

- 出典: 上記メール本文 / https://community.shopify.dev/t/will-deploys-to-ui-extensions-using-2025-07-succeed-all-the-way-until-1st-october-2026/35097 （2026-10-08 確認）
- 2025-07 が React 対応の最後の版。2025-10 以降は Polaris web components（Preact）前提
  https://shopify.dev/changelog/shopify-ai-toolkit-for-upgrading-extensions-to-polaris-web-components （2026-10-08 確認）
- 移行ガイド: https://shopify.dev/docs/api/customer-account-ui-extensions/latest/upgrading-to-2026-01
- フルページのお客様アカウント拡張はバンドル上限 128KB（メール本文）

## 現状（2026-10-08 時点、shopify.extension.toml を確認）

| 拡張機能 | api_version | target |
|---|---|---|
| buyer-subscriptions（Management page） | **2025-07**（React、今回の対象） | customer-account.page.render |
| order-index-subs-block | 2025-10 | customer-account.order-index.block.render |
| order-action-extension | 2025-10 | customer-account.order.action.menu-item.render |
| thank-you-page | 2025-10 | purchase.thank-you.block.render |
| pos-extension | 2025-10 | pos.* |
| admin-subs-action | unstable | admin.product-purchase-option.action.render ほか |
| buyer-subscriptions-collection / subscription-admin-link | toml に api_version なし | （未確認） |

buyer-subscriptions の規模: src 配下 109 ファイル・約 8,100 行、`@shopify/ui-extensions-react` を直接 import しているのが 29 ファイル。

## 未確認 → 回答（2026-10-08、出典は UPGRADE-2026-01-plan.md 1 章）

- 「すべて 2026-01 以降」が条件なら、2025-10 / unstable の拡張も上げる必要があるか → 2025-10 の 4 拡張は必要。unstable の admin 拡張は未確認
- 定期課金（Vercel Cron）はこの制限の影響を受けないか → 受けない。止まるのは `shopify app deploy` のみ
- 現在の buyer-subscriptions のバンドルサイズ → minify 後 314,906 バイト、gzip 後 92,142 バイト。上限は圧縮後 128 KB で 2025-10 以降に適用。現行版は適用外、Preact 版は余裕がある見込み
- Customer Account API のバージョンが `useGraphqlApi.ts` に 2025-01 と直書き → 作り直し時に `extensions/shared/services/customerApi.ts`（2025-10）へ寄せる

## 進捗

- 手順 1（2026-10-08）: コード側の機能一覧を `docs/buyer-subscriptions-features.md` に書いた。テスト 117 件成功を確認。実画面の確認は、本番ストアには確認に使えるお客様アカウントがないため、手順 3 の開発ストアでの確認に含める（決定 2026-10-08）。チェックリストは同ドキュメントの「10. 実画面での確認」

- 手順 2（2026-10-08）: 移行計画を `docs/UPGRADE-2026-01-plan.md` に書いた。目標は 2026-07、作業は Phase 0〜4、見積もり 5〜7 営業日

## 次にやること

1. 定期便管理画面の機能を書き出す（一覧、詳細、スキップ、解約、変更など。実画面とコードの両方で）→ コード側は完了。実画面は手順 3 で
2. 移行計画を立てる（buyer-subscriptions を Polaris web components で作り直す。他の拡張も 2026-01 に揃える）→ 完了。次は plan の Phase 0 から
3. 開発ストアで作り直して、1 の全機能を確かめる
4. 本番 deploy

実顧客が使う解約・変更画面なので、壊すと問い合わせに直結する。段階的に確かめながら進める。
