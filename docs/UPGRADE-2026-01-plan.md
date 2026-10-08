# UI 拡張機能の API 2026-01 以降への移行計画

作成: 2026-10-08。UPGRADE-2026-01.md の手順 2 の成果物。機能の仕様は `docs/buyer-subscriptions-features.md` を正とする。

## 1. 確認した前提（出典付き）

| # | 事実 | 出典（確認日 2026-10-08） |
|---|---|---|
| 1 | 2026-10-01 以降、API 2025-07 以前の checkout / customer account UI 拡張を含むアプリは更新できない | https://shopify.dev/changelog/shopify-ai-toolkit-for-upgrading-extensions-to-polaris-web-components |
| 2 | 「2026-10-01 以降も deploy 可能であるためには、既存のすべての UI 拡張が API 2026-01 以降を使っていなければならない」。つまり 2025-10 の拡張も対象 | https://shopify.dev/changelog/request-a-bundle-size-exception-for-existing-ui-extensions |
| 3 | Shopify CLI は 12 か月より古い API バージョンを対象にした deploy をすでに止めている | https://shopify.dev/docs/apps/build/app-extensions |
| 4 | バンドル上限は圧縮後 64 KB、フルページのお客様アカウント拡張は 128 KB。2025-10 以降に適用。超過時は `shopify app build` の成果物と esbuild metafile を添えて例外申請できる | 同上 2 行目の changelog |
| 5 | 安定版は 2026-01 / 2026-04 / 2026-07 / 2026-10（最新、2027-10-16 まで利用可）。2026-01 は 2027-01-16 まで | https://shopify.dev/docs/api/usage/versioning |
| 6 | 2025-10 以降は Preact + Polaris web components（`s-*` タグ）。React 版からの移行は package / tsconfig / エントリポイント / コンポーネント / API の 5 点を変える | https://shopify.dev/docs/apps/build/customer-accounts/migrate-to-web-components |
| 7 | Shopify AI Toolkit は Claude Code のプラグインとして入れられ、「extensions/{folder} を 2026-04 に移行して」と指示すると変換を代行する | https://shopify.dev/docs/apps/build/ai-toolkit |
| 8 | npm の `@shopify/ui-extensions` は 2026.1.5 / 2026.4.4 / 2026.7.4 が安定版、2026.10 は rc.13 まで。CLI 最新は 4.8.5（当リポジトリは 3.81.2） | `npm view`（2026-10-08） |
| 9 | `s-modal` を JS から閉じるには要素の `hideOverlay()` を使う。旧 `ui.overlay.close()` は Preact 拡張では動かないという報告あり | https://community.shopify.dev/t/impossible-to-programatically-close-s-modal/ と `@shopify/ui-extensions@2025.10.0` の型定義 `ModalElementMethods` |
| 10 | 現行 React 版バンドルは minify 後 314,906 バイト、gzip 後 92,142 バイト（128 KB 未満）。2025-07 なので上限の適用外 | ローカル計測（2026-10-08、dist は 2026-07-09 ビルド） |

引き継ぎメモの未確認事項への回答:

- 2025-10 / unstable の拡張も上げる必要があるか → **2025-10 の 4 拡張は必要**（事実 2、3）。`unstable` の admin 拡張は未確認（下記 7 章）
- 定期課金（Vercel Cron）への影響 → **なし**。止まるのは `shopify app deploy`（拡張とアプリ設定の push）だけで、Vercel へのアプリ本体の deploy は別経路
- バンドルサイズ → 事実 4、10。Preact 版は React と remote-ui が消えるので、現行の gzip 92 KB より小さくなる見込み

今日（2026-10-08）は期限を過ぎているので、**現時点ですでに `shopify app deploy` は通らない**はず。つまり拡張の修正は、この移行が終わるまで本番に出せない（未確認: 実際に deploy を試していない。Phase 0 で確かめる）。

## 2. 対象と方針

| 拡張 | 現在 | 作業 | 規模 |
|---|---|---|---|
| buyer-subscriptions | 2025-07 React | **Preact + web components で作り直し** | 大（src 109 ファイル、約 8,100 行、React import 29 ファイル） |
| order-index-subs-block | 2025-10 Preact | api_version と package の更新 | 小 |
| order-action-extension | 2025-10 Preact | 同上 | 小 |
| thank-you-page | 2025-10 Preact | 同上 | 小 |
| pos-extension | 2025-10 Preact | 同上（POS は別ガイド。未確認） | 小 |
| admin-subs-action | unstable React | 要判断（7 章） | 未定 |
| buyer-subscriptions-collection | editor_extension_collection | api_version なし。対象外の見込み | なし |
| subscription-admin-link | subscription_link_extension | 同上 | なし |

### 目標 API バージョン

**2026-07** を第一候補にする。理由: 安定版の npm パッケージ（2026.7.4）があり、2027-07-16 まで使える。2026-10 は npm がまだ rc のため見送る。移行ガイドの例は 2026-04 だが、同じ web components 世代なので手順は変わらない。条件を満たす最低ラインは 2026-01。

### buyer-subscriptions の作り方

AI Toolkit で機械変換した叩き台を作り、`buyer-subscriptions-features.md` に照らして手で仕上げる。ゼロから書くより、既存の GraphQL クエリ・ユーティリティ・文言（locales 33 言語）をそのまま残せる。

- 残すもの: `graphql/*.ts`（Customer Account API のクエリと mutation）、`utilities/`（billing-cycles、pricebreakdown、formatMoney）、`locales/`、ルーティングの正規表現
- 捨てるもの: `@shopify/ui-extensions-react`、`react` / `react-dom`、`useGraphqlApi`（`extensions/shared/services/customerApi.ts` に寄せる）、未使用コード（features.md 6 章）
- 検討: `@shopify/address`（esm 24 KB、国データは実行時に取得）は残す。`@shopify/dates` は `isSameYear` / `isLessThanOneYearAway` の 2 関数だけなので自前実装に置き換える

既に移行済みの `order-action-extension` と `thank-you-page`（commit 575a825）をローカルの手本にする。package.json、tsconfig（`jsxImportSource: preact`）、エントリポイント（`export default async () => render(<App />, document.body)`）、テスト（`@testing-library/preact`）の形はそこに揃える。

## 3. 対応表（React → web components / API）

部品:

| 現行 | 移行先 | 備考 |
|---|---|---|
| Page（title, primaryAction, secondaryAction, loading） | `s-page`（heading、slot `primary-action` / `secondary-actions` / `breadcrumb-actions`） | 戻るボタンは `breadcrumb-actions` に `s-button href="extension:/"` |
| Grid / GridItem（Style.default().when() の幅切替） | `s-grid` / `s-grid-item gridColumn="span n"` + `s-query-container` のコンテナクエリ | `@container (inline-size > 500px) ..., ...` 形式 |
| Card | `s-box border="base" borderRadius="base" padding="base"` | thank-you-page と同じ |
| BlockStack / InlineStack / InlineLayout / View | `s-stack`（direction を block または inline、gap を指定）/ `s-box` | |
| Heading / Text / TextBlock | `s-heading` / `s-text` / `s-paragraph` | |
| Banner / Button / Link / Icon / Image / ImageGroup / ProductThumbnail | `s-banner` / `s-button` / `s-link` / `s-icon` / `s-image` / `s-image-group` / `s-product-thumbnail` | アイコン名は要確認 |
| Modal（overlay prop で開く、`ui.overlay.close(id)` で閉じる） | `s-modal id=...` を `s-button commandFor=... command="--show"` で開き、成功時は ref 経由 `hideOverlay()` で閉じる | 事実 9 |
| ResourceItem（カード全体クリック + 「管理する」ポップオーバー） | 相当なし。`s-box` + `s-link`（詳細へ）+ `s-button commandFor` → `s-popover` + `s-menu`（スキップ / 一時停止 / 再開） | 見た目が変わる。開発ストアで確認 |
| ChoiceList / Choice | `s-choice-list` / `s-choice` | |
| TextField / PhoneField / Select | `s-text-field` / `s-phone-field` / `s-select` | イベントは `onInput` / `onChange` |
| SkeletonTextBlock / SkeletonImage | `s-skeleton-paragraph` / 相当なし（`s-box` の灰色枠で代替） | |
| Toast（`ui.toast.show`） | `shopify.toast.show(text)` | |

API:

| 現行 | 移行先 |
|---|---|
| `useApi()` の `i18n.translate / formatCurrency / formatDate` | `shopify.i18n.translate / formatCurrency / formatDate`（プレーン関数） |
| `localization.extensionLanguage.current.isoCode` | `shopify.localization.extensionLanguage.value.isoCode`（signal） |
| `sessionToken.get()` | `shopify.sessionToken.get()` |
| `useNavigationCurrentEntry()` | `shopify.navigation.currentEntry.url` + `addEventListener('currententrychange', ...)` |
| `fetch('shopify:customer-accounts/customer/api/2025-01/graphql')` | `extensions/shared/services/customerApi.ts`（既定 2025-10。GraphQL errors を throw する処理を足す） |
| `process.env.APP_URL` | 同じ（CLI がビルド時に埋める。要確認） |
| `reactExtension('customer-account.page.render', ...)` | `export default async () => render(<App />, document.body)` |

## 4. 作業の段階

### Phase 0: 準備（半日）

1. ブランチ `upgrade/ui-extensions-2026` を切る
2. 開発ストアに定期便のテスト契約を 3 種類作る（有効、一時停止、在庫エラーが出るもの）。ピックアップ配送の契約もあれば配送先変更の受取パスを確認できる
3. `shopify app deploy` を試し、現状でブロックされることを確認（メッセージを引き継ぎメモに残す）
4. Shopify CLI を 4.x に上げる（`@shopify/cli` 3.81.2 → 4.8.5。dev 時の `shopify.d.ts` 生成に必要）。上げた後 `pnpm dev` が動くこと、既存の Preact 拡張のテストが通ることを確認
5. `claude plugin install shopify-ai-toolkit@claude-plugins-official`

### Phase 1: 小さい 4 拡張を 2026-07 に上げる（半日）

- 各 `shopify.extension.toml` の `api_version = "2026-07"`、`package.json` の `@shopify/ui-extensions` を `2026.7.x`
- `pnpm install` → `pnpm test`（order-index-subs-block / order-action-extension / thank-you-page / pos-extension）
- 開発ストアで `pnpm dev` し、注文一覧のカード、注文詳細のボタン、サンキューページを目視
- この時点では buyer-subscriptions が残っているので deploy はまだ通らない

### Phase 2: buyer-subscriptions の作り直し（3〜5 日。順番が重要）

1. **土台**: package.json / tsconfig / エントリポイント / Router / customerApi / i18n・金額・日付ユーティリティ。空の一覧が出るまで
2. **一覧**: カード表示 → 空・エラー・読み込み状態 → アクションポップオーバー（4 のモーダルができるまでは「詳細を表示」のみ）
3. **詳細（表示のみ）**: 次回の注文カード、概要カード、価格サマリー、過去の注文、NotFound、レスポンシブ配置
4. **操作モーダル**: キャンセル → 一時停止 → 再開 → 次の注文をスキップ → 今後の注文モーダル。`hideOverlay()` でのクローズと `userErrors` の表示を最初の 1 つで確立し、残りは同じ型にする
5. **配送先 / 配達方法の変更**: 最難。住所フォーム（`@shopify/address` の国別フィールド順）→ 配達方法選択 → 保存。配送 / ローカル配達 / 受取の 3 パス
6. **未使用コードの削除**と locale の不要キー整理（任意）

各ステップで `@testing-library/preact` のテストを書く（既存 117 件の期待値を features.md から写す）。コミットはステップ単位。

### Phase 3: 検証（1 日）

- `shopify app build` でバンドルサイズを測り 128 KB（圧縮後）以内を確認
- 開発ストアで `buyer-subscriptions-features.md` 10 章のチェックリストを全項目実施。操作系（スキップ、一時停止、再開、キャンセル、配送先変更）はテスト契約で実行し、メール送信（一時停止 / 再開）も届くことを確認
- 390px / 1440px でスクリーンショットを `docs/screenshots/buyer-subscriptions/` に保存
- `pnpm test`、`pnpm lint`、`pnpm typecheck` 相当を通す

### Phase 4: 本番（半日）

- admin-subs-action の扱いを決める（7 章）
- `shopify app deploy` が通ることを確認し、本番で一覧と詳細を表示確認（操作はしない）
- UPGRADE-2026-01.md を完了に更新。features.md に実画面で見つけた差分を反映

## 5. リスク

| リスク | 対策 |
|---|---|
| `s-modal` を非同期処理の後に閉じられない（事実 9） | Phase 2-4 の最初のモーダルで `hideOverlay()` の動作を確認。駄目なら成功時にモーダル内容を「完了」表示に切り替え、閉じるは利用者操作に委ねる |
| ResourceItem 相当がなく一覧カードの見た目・操作が変わる | 開発ストアで確認し、必要なら art-direction スキルで整える。機能（詳細へ遷移、3 操作）が揃っていれば出荷する |
| `extension:/subscriptions/{id}` の URL 形式が新 API で変わる | ナビゲーション API の例は `extension://orders` 形式。order-action-extension（2025-10）は `extension:buyer-subscriptions/subscriptions/{id}` で動いているので、まず現行形式で試す |
| CLI 4.x への更新で `pnpm dev` / deploy の挙動が変わる | Phase 0 で単独に行い、問題があればそこで止めて記録する |
| 配送先変更の 3 パス（配送 / ローカル配達 / 受取）を全部テストできる契約がない | 配送パスを必須、他 2 つは開発ストアに配送方法を追加して確認。無理なら「未確認」として記録し本番では既存顧客の利用状況から優先度を判断 |
| 本番の実顧客が使う解約・変更画面を壊す | Phase 3 の全項目チェックを通すまで deploy しない。deploy 後は問い合わせ窓口に「画面を更新した」旨を共有 |

## 6. 見積もり

合計 5〜7 営業日。内訳は Phase 0: 0.5、Phase 1: 0.5、Phase 2: 3〜5、Phase 3: 1、Phase 4: 0.5。AI Toolkit の変換がうまく当たれば Phase 2 は短くなる。

## 7. 未確認（Phase 0 で確かめる）

- `admin-subs-action`（admin 拡張、`unstable`、React 18 + `@shopify/ui-extensions-react` 2025.7.1）が deploy ブロックの対象か。admin 拡張の web components 移行ガイドの有無
- POS 拡張の 2026-07 対応に追加作業があるか（POS は別の移行ガイド https://shopify.dev/docs/apps/build/pos/upgrading-to-2025-10 の系統）
- `process.env.APP_URL` が新しい CLI でも拡張のビルドに埋め込まれるか
- `s-icon` の名前（`reorder`、`disabled`、`error`、`info`、`pen` に相当するもの）
- `shopify.toast.show` と `s-page` の `loading` 相当の有無
