const core = require('@actions/core');
const github = require('@actions/github');
const yaml = require('js-yaml');

async function run() {
  try {
    let isPR = false;
    if (github.context.payload.pull_request === undefined) {
      core.debug('Labeler action not running for pull request.');
    } else {
      core.debug('Labeler action running for pull request.');
      isPR = true;
    }

    const org = github.context.payload.repository.owner.name;
    const library = github.context.payload.repository.name;

    const token = core.getInput('github-token', { required: true });
    if (!token) {
      // Not necessarily an error, PRs from forks end up here
      core.debug('Failed to get token');
      return;
    }
    const gh = new github.GitHub(token);

    // Get the branch for this library in each collection
    const owner = 'ignition-tooling';
    const repo = 'gazebodistro';

    const collections = [
      {name: 'blueprint', label: '📜 blueprint', branch: ''},
      {name: 'citadel', label: '🏰 citadel', branch: ''},
      {name: 'dome', label: '🔮 dome', branch: ''}
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

      collection.branch = lib.version;
    }

    // Get all PRs
    let prs = [];
    if (isPR) {
      prs.push(github.context.payload.pull_request)
    } else {
      prs = gh.pulls.list({owner: org, repo: library, state: 'open'});
    }

    // Iterate over PRs and label them
    for (const pr of prs) {
      let labels = [];

      for (const collection of collections) {
        if (collection.branch == pr.base.ref) {
          labels.push(collection.label);
        }
      }

      if (labels.length > 0) {
        const prNumber = pr.number;
        core.debug(`Adding labels: [${labels}] to PR [${prNumber}]`);
        gh.issues.addLabels(
          Object.assign({issue_number: prNumber, labels: labels },
          github.context.repo));
      }
    }
  }
  catch (error) {
    core.setFailed(error.message);
  }
}

run()
