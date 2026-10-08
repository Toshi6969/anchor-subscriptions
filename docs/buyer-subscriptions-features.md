# 定期便管理画面（buyer-subscriptions）機能一覧

作成: 2026-10-08。UPGRADE-2026-01.md の手順 1「定期便管理画面の機能を書き出す」の成果物。
Polaris web components への作り直し（手順 2）と、作り直し後の動作確認（手順 3）のチェックリストとして使う。

根拠:

- コード: `extensions/buyer-subscriptions/src` を全ファイル読み取り（2026-10-08、HEAD = a3f2687）
- テスト: `vitest run extensions/buyer-subscriptions` を実行し 17 ファイル 117 件すべて成功（2026-10-08）
- 実画面: 未確認。お客様アカウントへの顧客ログインが必要なため、末尾「10. 実画面での確認」の手順で行う

## 1. 画面構成とルーティング

| 項目 | 内容 |
|---|---|
| target | `customer-account.page.render`（フルページ） |
| 一覧 | `extension:/` |
| 詳細 | `extension:/subscriptions/{数値ID}`（`src/App.tsx` の正規表現（`/subscriptions/` の直後に数字が続く時だけ詳細扱い）に一致した時だけ詳細。フォークで修正済み） |
| 他拡張からの導線 | order-action-extension（注文詳細の「サブスクリプションを管理」ボタン）が `extension:buyer-subscriptions/subscriptions/{id}`（契約が複数なら一覧）へ遷移 |
| capabilities | `api_access = true`、`network_access = true`（アプリ backend へのメール送信依頼に使用） |
| エラー境界 | `ErrorBoundary` が描画エラーを捕捉し「問題が発生しました。ページを更新してください」と `[debug] エラー名: メッセージ` を表示（debug 行はフォーク追加） |
| データ取得 | Customer Account API `shopify:customer-accounts/customer/api/2025-01/graphql` に `fetch`（`useGraphqlApi.ts` に API バージョン 2025-01 を直書き）。GraphQL の `errors` は画面のエラー状態にする（フォーク追加） |

## 2. 一覧画面（SubscriptionList）

クエリ: `customer.subscriptionContracts(first: 20, sortKey: CREATED_AT, reverse: true)`。21 件目以降は表示されない（ページネーションなし）。

### 2.1 画面状態

| 状態 | 表示 |
|---|---|
| 読み込み中 | ページタイトル「サブスクリプション」+ スケルトンカード 1 枚 |
| 取得エラー | critical バナー「サブスクリプションを取得できませんでした。もう一度お試しください」 |
| 0 件 | カード「購入したサブスクリプションはありません」「ストアに移動してサブスクリプションを購入する」 |
| 1 件以上 | グリッド。幅 small 未満 1 列、small 以上 2 列、medium 以上 3 列 |

### 2.2 契約カード（SubscriptionListItem）の表示

| 要素 | ルール |
|---|---|
| ステータス帯 | アイコン + ラベル。ACTIVE「有効」、PAUSED「一時停止」、CANCELLED「キャンセル済み」、EXPIRED「期限切れ」、FAILED「失敗」。在庫エラー時（下記）は info アイコン + 「保留中」 |
| 2 行目テキスト | 在庫エラー: 「次回の注文が遅れる可能性があります」。ACTIVE かつ次回請求日あり: 「次回の注文：{日付}」。それ以外: 「最終更新日：{updatedAt}」 |
| 画像 | 先頭ラインの商品画像（なければ非表示） |
| 見出し | ライン 1 本なら商品名（`name`）。複数なら「{合計数量}個のアイテム」 |
| 配達頻度 | 「毎月配達」「{n}か月ごとに配達」など（day / week / month / year × 1 or other） |
| 金額 | 次回見込み合計 = 各ラインの `lineDiscountedPrice` 合計 + `deliveryPrice`。税は含まない |
| カード全体 | `ResourceItem`。クリックで詳細へ。アクセシビリティラベル「{見出し}のサブスクリプションを管理」 |

在庫エラーの判定: `lastBillingAttemptErrorType === INVENTORY_ERROR` かつ status が ACTIVE または FAILED。

### 2.3 カードのアクション（「管理する」ポップオーバー、SubscriptionActions）

| status | 表示されるボタン |
|---|---|
| ACTIVE | 詳細を表示 / 次の注文をスキップ（スキップ可能な時だけ。2.4 参照） / 一時停止 |
| PAUSED | 詳細を表示 / 再開 |
| CANCELLED, EXPIRED, FAILED, STALE | 詳細を表示 のみ |

各操作の成功時は toast を出し、ポップオーバーを閉じ、一覧を再取得する。モーダルの中身は「4. 操作モーダル」。

### 2.4 スキップ可否の共通ルール（`utilities/billing-cycles.ts`）

`upcomingBillingCycles(first: 6)` のうち `skipped = false` のものを取り、

- 1 件目 = 次回請求（`nextBillingDate`、スキップ対象の `cycleIndex`）
- 2 件目があればスキップ可能。2 件目の日付が「スキップ後の再開日」
- 2 件目がなければスキップ不可（6 件中 5 件スキップ済み、または先の請求が存在しない）

## 3. 詳細画面（SubscriptionDetails）

クエリ: `customer.subscriptionContract(id)`。lines は最大 50、orders は最新 5 件、upcomingBillingCycles は 6 件。

### 3.1 画面状態

| 状態 | 表示 |
|---|---|
| 読み込み中 | スケルトン（左 2 カード、右 2 カード） |
| 取得エラー | critical バナー「サブスクリプションの詳細を取得できませんでした。もう一度お試しください」 |
| 該当なし（null） | カード「サブスクリプションが見つかりません」「このサブスクリプションは存在しないか、サブスクリプションを表示する権限がありません。」 |

### 3.2 ページ枠

| 要素 | ルール |
|---|---|
| タイトル | CANCELLED なら「サブスクリプションの詳細」、それ以外「サブスクリプションを管理」 |
| 戻る | `extension:/`（一覧）へのボタン |
| ヘッダーの主要アクション（DetailsActions） | ACTIVE: 一時停止 + キャンセル。PAUSED: 再開 + キャンセル。CANCELLED: なし。それ以外（EXPIRED / FAILED / STALE）: キャンセル のみ |
| レイアウト | large 以上は 12 カラムで左 7 / 右 5。medium 以上 2 列、未満 1 列 |

### 3.3 次回の注文カード（UpcomingOrderCard）

表示条件: status が ACTIVE、または在庫エラーあり。かつ次回請求日が存在する。

| 要素 | ルール |
|---|---|
| 在庫エラーバナー | 「在庫切れのため、次回の注文が遅れる可能性があります」。閉じるボタンあり（閉じた状態はページ再読み込みまで） |
| 見出し + 日付 | 「次回の注文」+ 次回請求日 |
| スキップボタン | 2.4 のルールでスキップ可能な時だけ有効。押すと「次の注文をスキップ」モーダル |
| 不可時の説明 | 次回請求日が 1 年以内: 「最大注文数がスキップされました」。1 年より先: 「注文が1年以上先のためスキップはできません」 |
| 「次回の注文を表示する」 | プレーンボタン。今後の注文モーダルを開く（4.2） |

### 3.4 概要カード（OverviewCard）

| 要素 | ルール |
|---|---|
| 配達頻度 | 一覧と同じ文言 |
| 配送先住所 | 配送（shipping）またはローカル配達の時。`@shopify/address` で国別書式に整形（国コード不正時は固定書式にフォールバック）。CANCELLED 以外ではペンアイコンで編集（4.6） |
| 受取ロケーション | ピックアップの時。住所表示 + CANCELLED 以外は編集（4.6。空の住所から入力開始） |
| 配送方法 | `shippingOption.presentmentTitle` または `localDeliveryOption.presentmentTitle`。ピックアップ時は非表示 |
| 位置 | medium 以上は左列の次回注文カードの下、未満は右列の価格サマリーの下（同じカードを 2 か所に置き表示切替） |

### 3.5 価格サマリーカード（PriceSummaryCard）

| 要素 | ルール |
|---|---|
| 明細（SubscriptionLineItem） | サムネイル（数量バッジ付）、商品名 `title`、バリアント名、数量 2 以上なら「{単価}/ユニット」。`lineDiscountedPrice < currentPrice × 数量` なら元値を打消し表示し割引後価格を併記 |
| 小計 | `lineDiscountedPrice` の合計 |
| 配送 | `deliveryPrice` |
| 税 | `totalTax` がある時だけ表示。現状の計算（`pricebreakdown.ts`）は totalTax を作らないため常に非表示 |
| 合計 | 通貨コード（例 JPY）を小さく添えて太字 |

### 3.6 過去の注文カード（PastOrdersCard）

最新 5 件。各行「{注文日} 表示」で、`shopify:/customer-account/orders/{id}` に遷移。0 件でも見出しは出る。

## 4. 操作モーダル

共通: 「閉じる」/「キャンセル」で閉じるとエラー表示をリセット。実行ボタンは処理中 loading。失敗時はモーダル内に critical バナー（タイトル固定 + `userErrors[0].message`）。

| # | 操作 | 起点 | mutation（Customer Account API） | 成功判定 | 成功後 |
|---|---|---|---|---|---|
| 4.1 | 次の注文をスキップ | 一覧ポップオーバー / 詳細の次回注文カード | `subscriptionBillingCycleSkip(index = 次の未スキップ cycleIndex)` | `billingCycle.skipped === true` | toast「次の注文がスキップされました」、再取得 |
| 4.2 | 今後の注文（スキップ / スキップ中止） | 詳細「次回の注文を表示する」 | `subscriptionBillingCycleSkip` / `subscriptionBillingCycleUnskip` | skipped の値が反転 | 行ごとに toast「{日付}に注文がスキップされました」「…スキップが中止されました」、再取得。失敗はモーダル内バナー |
| 4.3 | 一時停止 | 一覧ポップオーバー / 詳細ヘッダー | `subscriptionContractPause` | `contract.status === PAUSED` | toast「サブスクリプションが一時停止されました」、再取得、アプリ backend に `PAUSE` を POST |
| 4.4 | 再開 | 一覧ポップオーバー / 詳細ヘッダー | `subscriptionContractActivate` | `contract.status === ACTIVE` | toast「サブスクリプションが再開されました」、再取得、backend に `RESUME` を POST |
| 4.5 | キャンセル | 詳細ヘッダーのみ | `subscriptionContractCancel` | `contract.status === CANCELLED` | toast「サブスクリプションがキャンセルされました」、再取得。backend 通知なし |
| 4.6 | 配送先 / 配達方法の変更 | 詳細の概要カード（ペンアイコン） | `subscriptionContractFetchDeliveryOptions` → `subscriptionContractSelectDeliveryMethod` | 下記 | toast「配達方法が更新されました」、再取得 |

### 4.1 次の注文をスキップ

本文: 再開日があれば「次の注文をスキップしますか？サブスクリプションは{再開日}に再開されます。」、なければ「次の注文をスキップしますか？」。ボタン「スキップ」。

### 4.2 今後の注文モーダル

- 表示対象: `upcomingBillingCycles` 6 件のうち末尾 1 件を除いた 5 件（末尾を除くのは、最後の 1 件をスキップすると次の再開日が取れなくなるため）
- 各行: 日付（スキップ済みは「{日付} (スキップ済み)」で subdued）+ 「スキップ」または「スキップを中止する」
- 押した行だけ loading。再取得完了で解除
- 閉じると バナーをクリア

### 4.3 一時停止

本文「サブスクリプションはすぐに一時停止され、これ以上の請求や今後の注文はありません。このサブスクリプションはいつでも再開できます。」。
成功後、`process.env.APP_URL` + `/customerAccount/emails/` へ `{operationName: 'PAUSE', admin_graphql_api_id}` を session token 付きで POST。backend は `CustomerSendEmailJob`（テンプレート `SUBSCRIPTION_PAUSED`）をキューに積む。POST の失敗は UI に出ない（結果を待たない）。

### 4.4 再開

本文: 次回請求日があれば「このサブスクリプションを再開すると、請求は{日付}に再開されます。」、なければ「…請求はすぐに再開されます。」。さらに前回注文の `totalPrice` と次回見込み合計の `amount` が異なる時「このサブスクリプションの価格が変更され、今後の注文ごとに{金額}が請求されます。」を追記。ボタン「続行」。成功後 backend に `RESUME`（テンプレート `SUBSCRIPTION_RESUMED`）。

### 4.5 キャンセル

本文「サブスクリプションをキャンセルすると、請求と配達はすぐに終了します。サブスクリプションをキャンセルすると、元に戻すことはできません。注文の受け取りを一時的に停止するには、サブスクリプションを一時停止します。」。実行ボタンは critical 色「サブスクリプションをキャンセル」。

### 4.6 配送先 / 配達方法の変更（2 段階、DeliveryModal）

段階 1「配送先住所を編集する」（AddressModal）

- 国リストと国別のフィールド順は `@shopify/address`（`AddressFormatter(locale).getCountries()`、`buildOrderedFields`）。取得中はスケルトン
- 国 / 州はセレクト。現在の住所を初期値にする。ピックアップからの変更は空住所（国のみ）から
- 「続行」で `subscriptionContractFetchDeliveryOptions(address)` を呼ぶ。結果が出るまで 1 秒間隔で最大 20 回ポーリング
- `userErrors` があればその文言、`SubscriptionDeliveryOptionsResultFailure` またはタイムアウトなら「このサブスクリプションは入力した住所に配送できません。…」をバナー表示して段階 1 に留まる

段階 2「配達方法を選択する」（DeliveryMethodSelectModal）

- 候補を ChoiceList で表示（先頭を初期選択）。種別: 配送 / ローカル配達 / 受取（「集荷：{場所}」+ 受取住所）。価格は金額または「無料」
- ローカル配達を選ぶと「携帯電話番号」（PhoneField、初期値は住所の電話）と「配達手順 (任意)」（TextField）が出る
- 「保存」で `subscriptionContractSelectDeliveryMethod(token, shipping | localDelivery | pickup)`。`userErrors` があればバナー。成功で閉じて toast
- 段階 2 の「キャンセル」は住所を元に戻して段階 1 に戻る（モーダルは閉じない。`DeliveryMethodSelectModal` の onClose が `overlay.close` を呼ばないため）。段階 1 の「キャンセル」とモーダルの X はモーダルを閉じる

## 5. 横断的な仕様

| 項目 | 内容 |
|---|---|
| 言語 | `locales/` に 33 言語（`en.default.json` 基準、`ja.json` あり）。文言はすべて `i18n.translate` |
| 日付 | `useFormatDate`: 今年なら「月 日」、それ以外は年付き（`i18n.formatDate`） |
| 金額 | `formatMoney`: `i18n.formatCurrency` + narrowSymbol。JPY など zero-decimal 通貨は小数 0 桁（フォーク追加、commit e44c4d8） |
| ステータス型 | ACTIVE / PAUSED / CANCELLED / EXPIRED / FAILED / STALE |
| 在庫エラー | 一覧: 「保留中」+「遅れる可能性」。詳細: 次回注文カードを FAILED でも表示し、バナーを出す |
| 住所整形 | `@shopify/address`（表示とフォーム両方）。移行後も同じライブラリを使うか、バンドル上限との兼ね合いで要判断 |

## 6. 使われていないコード（移行時に持ち越さない候補）

| 場所 | 状況 |
|---|---|
| `src/OrderActionMenuItem/` | toml の targeting にない。注文アクションは別拡張 `order-action-extension`（2025-10、Preact）が担当。テスト 3 件もここに含まれる |
| `src/utilities/navigation.ts` | `getSubscriptionIdFromPath` は Router 改修（commit 7847e18）で未使用 |
| `src/utilities/constants.ts` | `brandLabels`（カードブランド名）未使用 |
| `src/foundation/graphql/ShopQuery.ts` | 未使用 |
| locale の `paymentModal.*`、`paymentMethodInvalid*`、`overviewCard.payment / billingAddress / changePaymentMethodButtonLabel` | 決済方法の表示・変更 UI は存在しない |
| `SuccessToastType.PaymentUpdated / ShippingUpdated / Hidden` | 呼び出しなし |

## 7. フォークで加えた変更（upstream 575a825 との差分、11 ファイル）

| 変更 | commit |
|---|---|
| toml: api_version 2025-01 → 2025-07、uid 追加 | cdcbcff |
| Router: `/subscriptions/{数字}` の正規表現で判定（基底パスの誤判定修正） | 7847e18 |
| useGraphqlApi: GraphQL `errors` を error 状態にし console に出す | f4d251e, d39929e |
| ErrorBoundary: `[debug]` 行を表示 | d39929e |
| formatMoney 追加、金額表示 5 か所を置換 | e44c4d8 |

作り直し時はこの 5 点を新実装にも反映する。

## 8. テスト（移行後の回帰確認に使う）

2026-10-08 実行: 17 ファイル 117 件すべて成功。

```
pnpm exec dotenv -c test -- pnpm exec vitest run extensions/buyer-subscriptions
```

| ファイル | 件数 |
|---|---|
| SubscriptionDetails.test.tsx | 19 |
| SubscriptionList.test.tsx | 10 |
| ResumeSubscriptionModal.test.tsx | 10 |
| UpcomingOrderCard.test.tsx | 10 |
| SubscriptionListItem.test.tsx | 8 |
| SubscriptionActions.test.tsx | 7 |
| UpcomingOrdersModal.test.tsx | 7 |
| DeliveryModal.test.tsx | 7 |
| CancelSubscriptionModal / PauseSubscriptionModal / SkipNextOrderModal | 各 6 |
| Address.test.tsx / AddressModal.test.tsx | 各 5 |
| OverviewCard.test.tsx | 4 |
| DeliveryMethodSelectModal.test.tsx / OrderActionMenuItem.test.tsx | 各 3 |
| pricebreakdown.test.ts | 1 |

テストは `@shopify/react-testing` + React 前提なので、Preact / web components へ移行するとそのまま流用できない。期待値（文言、表示条件）は上の表に写してある。

## 9. バンドルサイズ（未確認事項の一部回答）

- `extensions/buyer-subscriptions/dist/buyer-subscriptions.js` は 314,906 バイト（minify 済み、2026-07-09 ビルド、git 管理外）
- UPGRADE-2026-01.md に書いた上限 128KB に対して約 2.4 倍。React ランタイムと `@shopify/address` を含む
- 未確認: これが `shopify app dev` のビルドか `deploy` 時のビルドか。また 128KB 上限が現行の React 拡張にも適用されるか（適用されるなら現状すでに超過していることになるので、上限の正確な条件を Shopify のドキュメントで確認する）

## 10. 実画面での確認（未実施）

顧客ログイン（メールのワンタイムコード）が必要で、こちらからはできない。確認者は amberang ストアのお客様アカウントにログインし、以下を見て本書と食い違う点を書き足す。

一覧:

- [ ] 契約カードに ステータス / 次回注文日 / 画像 / 商品名 / 配達頻度 / 金額 が出る
- [ ] 「管理する」で ステータスに応じたボタン（2.3 の表）が出る
- [ ] 金額が JPY で小数なし

詳細:

- [ ] タイトル、戻るボタン、ヘッダーの 一時停止 / 再開 / キャンセル
- [ ] 次回の注文カード（日付、スキップボタンの有効・無効と説明文、「次回の注文を表示する」）
- [ ] 概要カード（配達頻度、配送先住所とペンアイコン、配送方法）
- [ ] 価格サマリー（明細、小計、配送、合計。税の行が出ないこと）
- [ ] 過去の注文と「表示」リンクの遷移先

操作（本番契約では実行しない。開発ストアで行う）:

- [ ] スキップ → toast と日付の更新
- [ ] 今後の注文モーダル → スキップ / スキップ中止
- [ ] 一時停止 → toast、ステータス、メール受信
- [ ] 再開 → toast、ステータス、メール受信、価格変更文言
- [ ] 配送先変更 → 住所フォーム → 配達方法選択 → toast と住所の更新
- [ ] キャンセル → toast、タイトルが「サブスクリプションの詳細」に変わり操作ボタンが消える

スクリーンショットは `docs/screenshots/buyer-subscriptions/` に置く（移行後の見た目比較用）。
