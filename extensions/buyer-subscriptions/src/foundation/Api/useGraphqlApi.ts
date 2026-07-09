import {useCallback, useState} from 'react';

type UseApi<Data, Variables> = [
  (query: string, variables?: Variables) => Promise<Data | undefined>,
  {
    data: Data | undefined;
    loading: boolean;
    error: Error | undefined;
    refetchLoading: boolean;
  },
];

/**
 * Hook for use in components that need to query the Customer API
 * This hook takes care of:
 *    1) Getting the API `endpoint` from context
 *    2) Querying for an access token from customer-account-web before any API interactions
 *
 * @return Tuple of the query function and its result
 */
export function useGraphqlApi<Data, Variables = undefined>(): UseApi<
  Data,
  Variables
> {
  const apiVersion = '2025-01';
  const [loading, setLoading] = useState(true);
  const [firstFetchComplete, setFirstFetchComplete] = useState(false);
  const [error, setError] = useState<Error>();
  const [data, setData] = useState<Data>();

  const customerApiFetch = useCallback(
    async (query: string, variables?: Variables) => {
      setLoading(true);
      let resp: Response;

      try {
        resp = await fetch(
          `shopify:customer-accounts/customer/api/${apiVersion}/graphql`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({query, variables}),
          },
        );
      } catch (err) {
        setError(err as Error);
        setLoading(false);
        setFirstFetchComplete(true);

        return;
      }

      const body = (await resp.json()) as {
        data?: Data;
        errors?: {message: string; extensions?: Record<string, unknown>}[];
      };

      if (body.errors && body.errors.length > 0) {
        const message = body.errors.map((e) => e.message).join('; ');
        console.error(
          '[buyer-subscriptions] GraphQL errors:',
          body.errors,
        );
        setError(new Error(message));
        setLoading(false);
        setFirstFetchComplete(true);
        return;
      }

      setData(body.data);
      setLoading(false);
      setFirstFetchComplete(true);

      return body.data;
    },
    [],
  );

  return [
    customerApiFetch,
    {data, loading, error, refetchLoading: firstFetchComplete && loading},
  ];
}
