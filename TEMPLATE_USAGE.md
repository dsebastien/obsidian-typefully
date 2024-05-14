# Usage

- Copy this project
- Modify package.json (name, description, scripts, PLUGIN_NAME, etc)
- Modify the plugin name in manifest.json
- Modify the plugin name in .github/workflows/release.yml
- Install the project dependencies using ´npm install`
- Run `npx nx connect` to generate a Nx Cloud access token, add, commit and push the changes. After that, make sure to connect the workspace to your Nx cloud organization
- Grant Read/Write access for workflows (pipelines). Go to https://github.com/<user>/<project>/settings/actions and select "Read and write permissions" under "Workflow permissions"

For the first release, don't use `npm version ...`. Simply call `git tag 1.0.0` and push that tag.
