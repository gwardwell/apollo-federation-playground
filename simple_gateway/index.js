const { ApolloServer, gql } = require('apollo-server');
const { ApolloGateway } = require('@apollo/gateway');
const { readFileSync } = require('fs');
const { serializeQueryPlan } = require('@apollo/query-planner');

const supergraphSdl = readFileSync('./supergraph.graphql').toString();

// Initialize an ApolloGateway instance and pass it
// the supergraph schema as a string
const gateway = new ApolloGateway({
  supergraphSdl,
  experimental_didResolveQueryPlan: function (options) {
    if (options.requestContext.operationName !== 'IntrospectionQuery') {
      console.log(serializeQueryPlan(options.queryPlan));
    }
  },
});

// Pass the ApolloGateway to the ApolloServer constructor
const server = new ApolloServer({
  gateway,
});

server.listen({ port: 4001 }).then(({ url }) => {
  console.log(`🚀 Server ready at ${url}`);
});
