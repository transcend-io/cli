import { gql } from "graphql-request";

export const SOMBRA_VERSION = gql`
  query TranscendSombraVersion {
    organization {
      sombra {
        version
      }
    }
  }
`;
