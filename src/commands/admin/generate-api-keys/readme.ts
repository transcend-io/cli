export default `#### Usage

\`\`\`sh
transcend admin generate-api-keys --email=test@transcend.io --password=$TRANSCEND_PASSWORD \\
   --scopes="View Email Templates,View Data Map" --apiKeyTitle="CLI Usage Cross Instance Sync" -file=./working/auth.json
\`\`\`

Specifying the backend URL, needed for US hosted backend infrastructure.

\`\`\`sh
transcend admin generate-api-keys --email=test@transcend.io --password=$TRANSCEND_PASSWORD \\
   --scopes="View Email Templates,View Data Map" --apiKeyTitle="CLI Usage Cross Instance Sync" -file=./working/auth.json \\
   --transcendUrl=https://api.us.transcend.io
\`\`\`

Filter for only a specific organization by ID, returning all child accounts associated with that organization. Can use the following GQL query on the [EU GraphQL Playground](https://api.us.transcend.io/graphql) or [US GraphQL Playground](https://api.us.transcend.io/graphql).

\`\`\`gql
query {
  user {
    organization {
      id
      parentOrganizationId
    }
  }
}
\`\`\`

\`\`\`sh
transcend admin generate-api-keys  --email=test@transcend.io --password=$TRANSCEND_PASSWORD \\
   --scopes="View Email Templates,View Data Map" --apiKeyTitle="CLI Usage Cross Instance Sync" -file=./working/auth.json \\
   --parentOrganizationId=7098bb38-070d-4f26-8fa4-1b61b9cdef77
\`\`\`

Delete all API keys with a certain title.

\`\`\`sh
transcend admin generate-api-keys  --email=test@transcend.io --password=$TRANSCEND_PASSWORD \\
   --scopes="View Email Templates,View Data Map" --apiKeyTitle="CLI Usage Cross Instance Sync" -file=./working/auth.json \\
   --createNewApiKey=false
\`\`\`

Throw error if an API key already exists with that title, default behavior is to delete the existing API key and create a new one with that same title.

\`\`\`sh
transcend admin generate-api-keys  --email=test@transcend.io --password=$TRANSCEND_PASSWORD \\
   --scopes="View Email Templates,View Data Map" --apiKeyTitle="CLI Usage Cross Instance Sync" -file=./working/auth.json \\
   --deleteExistingApiKey=false
\`\`\``;
