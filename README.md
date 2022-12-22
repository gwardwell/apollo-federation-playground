# Apollo Federation Playground

this repo hosts various Apollo federation examples.

## Getting started

[Install rover] by running the following:

```
curl -sSL https://rover.apollo.dev/nix/latest | sh
```

[Install router] by running the following:

```
curl -sSL https://router.apollo.dev/download/nix/latest | sh
```

## Composing an example supergraph schema

To compose an example, navigate to the example directory of your choice and run:

```
rover supergraph compose --config ./supergraph.yaml > supergraph.graphql
```

Some examples will fail to compose. This is intended if the example is meant to illustrate something
breaking supergraph composition.

To see the composed supergraph for your chosen example, open the corresponding `supergraph.graphql`

## Viewing an example query plan

### Viewing a Apollo Router query plan

To view the query plan using Apollo Router, navigate to the example directory of your choice and run:

```
rover supergraph compose --config ./supergraph.yaml > supergraph.graphql && ../../router --supergraph supergraph.graphql --dev
```

This will compose the supergraph schema for your example and start a Apollo Router using that
supergraph schema running on http://localhost:4000/.

You can then make whatever queries you like against http://localhost:4000/. Note that the examples here
will fail to resolve since the resolver endpoints are fake. You can view the query plan for your operation via
the Apollo Sandbox query planner tab.

### Viewing an Apollo Gateway query plan

To view the query plan using Apollo Gateway, you will need to install the dependencies for the `simple_gateway`.

Navigate to the `simple_gateway` directory and run:

```
npm i
```

Once the dependencies have installed, navigate to the example directory of your choice and run:

```
rover supergraph compose --config ./supergraph.yaml > supergraph.graphql && node ../../simple_gateway
```

This will compose the supergraph schema for your example and start a Node.JS Apollo Gateway using that
supergraph schema running on http://localhost:4001/.

You can then make whatever queries you like against http://localhost:4001/. Note that the examples here
will fail to resolve since the resolver endpoints are fake. The query plan will be printed to the terminal.

[install rover]: https://www.apollographql.com/docs/rover/getting-started
[install router]: https://www.apollographql.com/docs/router/quickstart
