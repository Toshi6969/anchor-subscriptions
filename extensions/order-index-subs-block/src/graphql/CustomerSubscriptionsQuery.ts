const CustomerSubscriptionsQuery = `#graphql
  query CustomerSubscriptions {
    customer {
      subscriptionContracts(first: 10, sortKey: CREATED_AT, reverse: true) {
        edges {
          node {
            id
            status
          }
        }
      }
    }
  }
`;

export default CustomerSubscriptionsQuery;
