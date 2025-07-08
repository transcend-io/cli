import { gql } from 'graphql-request';

export const ADD_SILO_DISCOVERY_RESULTS = gql`
  mutation AddSiloDiscoveryResults(
    $pluginId: ID!
    $rawResults: [SiloDiscoveryRawResultInput!]!
  ) {
    addSiloDiscoveryResults(
      input: { pluginId: $pluginId, rawResults: $rawResults }
    ) {
      success
    }
  }
`;

export const ENABLED_PLUGINS = gql`
  query Plugins($dataSiloId: String!, $type: PluginType!) {
    plugins(filterBy: { dataSiloId: $dataSiloId, type: $type, enabled: true }) {
      plugins {
        id
        dataSilo {
          type
        }
      }
      totalCount
    }
  }
`;
