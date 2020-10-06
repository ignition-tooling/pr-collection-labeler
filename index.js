const core = require('@actions/core');
const github = require('@actions/github');
const yaml = require('js-yaml');

async function run() {
  try {
    if (github.context.payload.pull_request === undefined) {
      core.debug('Labeler action must be run for pull requests.');
      return;
    }

    const library = github.context.payload.repository.name;
    const target = github.context.payload.pull_request.base.ref;

    const token = core.getInput('github-token', { required: true });
    if (!token) {
      core.debug('Failed to get token');
      return;
    }
    const gh = new github.GitHub(token);

    const owner = 'ignition-tooling';
    const repo = 'gazebodistro';

    let labels = [];

    const collections = [
      {name: 'blueprint', label: '📜 blueprint'},
      {name: 'citadel', label: '🏰 citadel'},
      {name: 'dome', label: '🔮 dome'},
      {name: 'edifice', label: '🏢 edifice'}
    ];

    for (const collection of collections) {

      const path = 'collection-' + collection.name + '.yaml';

      const collectionRes = await gh.repos.getContents({owner, repo, path});
      const collectionContent = Buffer.from(collectionRes.data.content, 'base64').toString();
      const collectionYaml = yaml.safeLoad(collectionContent);

      let lib = collectionYaml.repositories[library];

      if (lib == undefined)
      {
        continue;
      }

      if (lib.version == target) {
        labels.push(collection.label);
      }
    }

    if (labels.length > 0) {
      const prNumber = github.context.payload.pull_request.number;
      core.debug(`Adding labels: [${labels}] to PR [${prNumber}]`);
      gh.issues.addLabels(
        Object.assign({issue_number: prNumber, labels: labels },
        github.context.repo));
    }
  }
  catch (error) {
    core.setFailed(error.message);
  }
}

run()
