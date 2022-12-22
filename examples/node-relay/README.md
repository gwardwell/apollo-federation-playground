# Node Relay Service Example

This example illustrates two problems with how Apollo Router forms query plans
and handles response data.

## Problem 1: `__typename` can return `null`

When an entity has a complex nested key, such as the `Book` entity in this example,
the `__typename` of the child objects is not included in the representation when performing
and `__entities` federation query. You can see this by running the `book` query.

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

the `Book` representation omits the `author` object's corresponding `__typename`:

```
{
  __typename
  bookId
  author {
    fullName

    ^ __typename should be here
  }
}
```

For an implementation like [Node FROID], which encodes the representation into an `id`, this
presents a problem. The `id` returned does not include the child object `__typename` (in this
case `author`).

When you run the following operation through Router:

```gql
query GET_NODE {
  node(id: "ENCODED_ID_HERE") {
    ... on Book {
      id
      author {
        id
      }
    }
  }
}
```

The `id` argument is decoded and the representation is used as the stub response for the corresponding
entity. This means that the `__typename` returned by the `node` query is `null`.

A `null` value in the response for the `__typename` should not be possible.

## Problem 2: Batching subgraph requests is missing necessary fields

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

The `Book.id` field is requested via an entities query to `node_relay_subgraph`, while `Author.id` field
is requested via a _separate_ `__entities` query. this is the behavior I would expect to see from Router
as it ensures that the correct representation is sent for each entity being federated.

[node froid]: https://github.com/wayfair-incubator/node-froid
