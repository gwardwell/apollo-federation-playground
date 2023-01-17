# Node Relay Service Example

This example illustrates a solution to [incomplete representations for complex keys](../node-relay/README.md#problem-2-batching-subgraph-requests-is-missing-necessary-fields) as illustrated in the node-relay example.

## Problem Recap

When an entity has a complex nested key, a subgraph is responsible for federating on fields to both the
parent and child entity, and the field used from the child in the complex key _does not_ match the key
of the child, fields can be omitted from the representation that are necessary to complete the operation.

The `Book` entity is a good example of this. If used the `fullName` from the `Author` type as part of its
key, but the `Author` type uses the `authorId` field as its key.

When you run this query through Router:

```gql
query GET_BOOK {
  book {
    id
    author {
      id
    }
  }
}
```

It will result in the following Query plan:

```
QueryPlan {
  Sequence {
    Fetch(service: "book_subgraph") {
      {
        book {
          __typename
          bookId
          author {
            __typename
            authorId
          }
        }
      }
    },
    Flatten(path: "book.author") {
      Fetch(service: "author_subgraph") {
        {
          ... on Author {
            __typename
            authorId
          }
        } =>
        {
          ... on Author {
            fullName
          }
        }
      },
    },
    Flatten(path: "book") {
      Fetch(service: "node_relay_subgraph") {
        {
          ... on Book {
            __typename
            bookId
            author {
              fullName
            }
          }
        } =>
        {
          ... on Book {
            id
            author {
              id
            }
          }
        }
      },
    },
  },
}
```

Everything looks good until it gets to the `node_relay_subgraph`. The representation it provides
does not include the `authorId` which is necessary to return the `Author.id` field.

When running the same operation through Apollo Gateway, you see the following query plan:

```
QueryPlan {
  Sequence {
    Fetch(service: "book_subgraph") {
      {
        book {
          __typename
          bookId
          author {
            __typename
            authorId
          }
        }
      }
    },
    Parallel {
      Sequence {
        Flatten(path: "book.author") {
          Fetch(service: "author_subgraph") {
            {
              ... on Author {
                __typename
                authorId
              }
            } =>
            {
              ... on Author {
                fullName
              }
            }
          },
        },
        Flatten(path: "book") {
          Fetch(service: "node_relay_subgraph") {
            {
              ... on Book {
                __typename
                bookId
                author {
                  fullName
                }
              }
            } =>
            {
              ... on Book {
                id
              }
            }
          },
        },
      },
      Flatten(path: "book.author") {
        Fetch(service: "node_relay_subgraph") {
          {
            ... on Author {
              __typename
              authorId
            }
          } =>
          {
            ... on Author {
              id
            }
          }
        },
      },
    },
  },
}
```

## Proposed workaround

To mitigate this problem, and to get the query plan to look more like the one Gateway provides, we can split the node relay service federation into 2+ subgraphs instead of a single subgraph.

### Node Relay Subgraph

The [node_relay_subgraph](./node-relay-subgraph.graphqls) includes:

- The `Node` interface
- The `node` query, which returns the `Node` interface
- Resolvable entities which federate on the `id` field and implement the `Node` interface. These are _only_ entities that have simple, single-level keys. No entities with nested keys would be resolvable or have the `id` field federated by this subgraph.
- Entity references for all entities that have complex nested keys. These entities are referenced so that the `node` query can resolve them via the `Node` interface. These entities also implement the `Node` interface but reference the `id` field with the `@external` directive. These entities are `resolvable: false`

### Node Relay Complex Keys Subgraph

The [node_relay_complex_keys_subgraph](./node-relay-complex-keys-subgraph.graphqls) includes:

- The `Node` interface
- _No_ `node` query
- Resolvable entities that have complex keys which federate on the `id` fields and implement the `Node` interface
- Entity references and value types necessary for fulfilling the complex keys. These entities _do not_ implement the `Node` interface, receive the `id` field, and are set to `resolvable: false`

## Query plan

When implementing the same query using this new subgraph structure:

```gql
query GET_BOOK {
  book {
    id
    author {
      id
    }
  }
}
```

The query plan not looks like this:

```gql
QueryPlan {
  Sequence {
    Fetch(service: "book_subgraph") {
      {
        book {
          __typename
          bookId
          author {
            __typename
            authorId
          }
        }
      }
    },
    Parallel {
      Sequence {
        Flatten(path: "book.author") {
          Fetch(service: "author_subgraph") {
            {
              ... on Author {
                __typename
                authorId
              }
            } =>
            {
              ... on Author {
                fullName
              }
            }
          },
        },
        Flatten(path: "book") {
          Fetch(service: "node_relay_complex_keys_subgraph") {
            {
              ... on Book {
                __typename
                bookId
                author {
                  fullName
                }
              }
            } =>
            {
              ... on Book {
                id
              }
            }
          },
        },
      },
      Flatten(path: "book.author") {
        Fetch(service: "node_relay_subgraph") {
          {
            ... on Author {
              __typename
              authorId
            }
          } =>
          {
            ... on Author {
              id
            }
          }
        },
      },
    },
  },
}
```

This looks more like the Gateway version of the query plan, and solves for the missing keys that Router encountered.

When a `node` query is executed, the query plan is equally successful:

```gql
query GET_NODE {
  node(id: "asdf") {
    ... on Book {
      id
      author {
        id
      }
    }
  }
}
```

```gql
QueryPlan {
  Sequence {
    Fetch(service: "node_relay_subgraph") {
      {
        node(id: "asdf") {
          __typename
          ... on Book {
            __typename
            bookId
            author {
              __typename
              authorId
              id
            }
          }
        }
      }
    },
    Flatten(path: "node.author") {
      Fetch(service: "author_subgraph") {
        {
          ... on Author {
            __typename
            authorId
          }
        } =>
        {
          ... on Author {
            fullName
          }
        }
      },
    },
    Flatten(path: "node") {
      Fetch(service: "node_relay_complex_keys_subgraph") {
        {
          ... on Book {
            __typename
            bookId
            author {
              fullName
            }
          }
        } =>
        {
          ... on Book {
            id
          }
        }
      },
    },
  },
}
```

The query is able to successfully move between subgraphs, retrieving all entity values.

## Notes

If there are collisions between complex keys that would result in failure to resolve child entities, additional subgraphs could be created (`node_relay_complex_keys_subgraph_N`) that could resolve those problems. I could create a contrived example if it would help illustrate this problem.
