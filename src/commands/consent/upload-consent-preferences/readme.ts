export default `Each row in the CSV must include:

| Argument  | Description                                                                                               | Type                      | Default | Required |
| --------- | --------------------------------------------------------------------------------------------------------- | ------------------------- | ------- | -------- |
| userId    | Unique ID identifying the user that the preferences ar efor                                               | string                    | N/A     | true     |
| timestamp | Timestamp for when consent was collected for that user                                                    | string - timestamp        | N/A     | true     |
| purposes  | JSON map from consent purpose name -> boolean indicating whether user has opted in or out of that purpose | {[k in string]: boolean } | {}      | false    |
| confirmed | Whether consent preferences have been explicitly confirmed or inferred                                    | boolean                   | true    | false    |
| updated   | Has the consent been updated (including no-change confirmation) since default resolution                  | boolean                   | N/A     | false    |
| prompted  | Whether or not the UI has been shown to the end-user (undefined in older versions of airgap.js)           | boolean                   | N/A     | false    |
| gpp       | IAB GPP string                                                                                            | string - GPP              | N/A     | false    |

An sample CSV can be found [here](./examples/preference-upload.csv).`;
