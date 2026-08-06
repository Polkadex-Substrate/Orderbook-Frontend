declare module "@apollo/client/core/defaultOptions" {
  namespace DeclareDefaultOptions {
    interface WatchQuery {
      errorPolicy: "all";
      returnPartialData: false;
    }
    interface Query {
      errorPolicy: "all";
    }
    interface Mutate {
      errorPolicy: "all";
    }
  }
}
