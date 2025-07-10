export default `Each row in the CSV will include:

| Argument       | Description                                                                                               | Type                      | Default | Required |
| -------------- | --------------------------------------------------------------------------------------------------------- | ------------------------- | ------- | -------- |
| userId         | Unique ID identifying the user that the preferences ar efor                                               | string                    | N/A     | true     |
| timestamp      | Timestamp for when consent was collected for that user                                                    | string - timestamp        | N/A     | true     |
| purposes       | JSON map from consent purpose name -> boolean indicating whether user has opted in or out of that purpose | {[k in string]: boolean } | {}      | true     |
| airgapVersion  | Version of airgap where consent was collected                                                             | string                    | N/A     | false    |
| [purpose name] | Each consent purpose from \`purposes\` is also included in a column                                       | boolean                   | N/A     | false    |
| tcf            | IAB TCF string                                                                                            | string - TCF              | N/A     | false    |
| gpp            | IAB GPP string                                                                                            | string - GPP              | N/A     | false    |
`;
