import {composeGid} from '@shopify/admin-graphql-api-utilities';

// VERY IMPORTANT: NOT SETTING THE APP ID WILL PREVENT SELLING PLANS FROM BEING SHOWN
export const YOUR_APP_ID = composeGid('App', 'YOUR_APP_ID_HERE');
