import '@shopify/ui-extensions';

//@ts-ignore
declare module './src/OrderIndexBlock.tsx' {
  const shopify: import('@shopify/ui-extensions/customer-account.order-index.block.render').Api;
  const globalThis: { shopify: typeof shopify };
}

//@ts-ignore
declare module './src/graphql/CustomerSubscriptionsQuery.ts' {
  const shopify: import('@shopify/ui-extensions/customer-account.order-index.block.render').Api;
  const globalThis: { shopify: typeof shopify };
}
