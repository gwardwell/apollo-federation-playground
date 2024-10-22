# Listing Collection Example

This example illustrated federated collections of items (Listing Collections).
These collections leverage server-driven layouts and federated separation of concerns.

## Composable

The schema is designed to be composable, leveraging interfaces for easier client operations.

## Federated

The layouts are driven by a CMS, with products within the listing collection and the product
data being provided via federation.

## Example query

```graphql
query Experience {
  experience {
    blocks {
      ... on CategoryListingCollection {
        ...ListingCollectionFields
      }
      ... on SearchListingCollection {
        ...ListingCollectionFields
      }
    }
  }
}

fragment ListingCollectionFields on ListingCollection {
  items {
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
    edges {
      cursor
      node {
        ...ListingCollectionItemFields
      }
    }
  }
}

fragment ListingCollectionItemFields on ListingCollectionItem {
  blocks {
    ... on ListingCollectionItemImage {
      size
      product {
        leadImage {
          src
        }
      }
    }
    ... on ListingCollectionItemName {
      maxLines
      product {
        name
      }
    }
  }
}
```
