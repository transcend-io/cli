export default `#### Usage

Scan a JavaScript package.json:

\`\`\`sh
transcend inventory discover-silos --scanPath=./myJavascriptProject --auth=$TRANSCEND_API_KEY ---dataSiloId=445ee241-5f2a-477b-9948-2a3682a43d0e
\`\`\`

Here are some examples of a [Podfile](./examples/code-scanning/test-cocoa-pods/Podfile) and [Gradle file](./examples/code-scanning/test-gradle/build.gradle). These are scanned like:

\`\`\`sh
transcend inventory discover-silos --scanPath=./examples/ --auth=$TRANSCEND_API_KEY ---dataSiloId=b6776589-0b7d-466f-8aad-4378ffd3a321
\`\`\`

This call will look for all the package.json files that in the scan path \`./myJavascriptProject\`, parse each of the dependencies into their individual package names, and send it to our Transcend backend for classification. These classifications can then be viewed [here](https://app.transcend.io/data-map/data-inventory/silo-discovery/triage). The process is the same for scanning requirements.txt, podfiles and build.gradle files.`;
