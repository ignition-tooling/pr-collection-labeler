const core = require('@actions/core');
const github = require('@actions/github');
const yaml = require('js-yaml');

async function run() {
  try {

    core.debug(JSON.stringify(github, null, '\t'));
    core.debug(JSON.stringify(github.repository, null, '\t'));

    let isPR = false;
    let library = '';
    if (github.context.payload.pull_request === undefined) {
      core.debug('Labeler action not running for pull request.');
      library = core.getInput('repository', { required: false });
      if (!library) {
        core.debug('Non-PR action requires repository name.');
        library = 'testing';
        // return;
      }
      library = library.split('/')[1];
    } else {
      core.debug('Labeler action running for pull request.');
      library = github.context.payload.repository.name;
      isPR = true;
    }

    let distroBranch = core.getInput('gazebodistro-branch', { required: false });
    if (!distroBranch) {
      distroBranch = 'master';
    }

    const token = core.getInput('github-token', { required: false });
    if (!token) {
      // Not necessarily an error, PRs from forks end up here
      core.debug('Failed to get token');
      return;
    }
    const gh = new github.GitHub(token);

    // Get the branch for this library in each collection
    const collections = [
      {name: 'blueprint', label: '📜 blueprint', branch: ''},
      {name: 'citadel', label: '🏰 citadel', branch: ''},
      {name: 'dome', label: '🔮 dome', branch: ''}
    ];

    for (const collection of collections) {

      const path = 'collection-' + collection.name + '.yaml';

      const collectionRes = await gh.repos.getContents({
        owner: 'ignition-tooling',
        repo: 'gazebodistro',
        path: path,
        ref: distroBranch});
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
      prs = gh.pulls.list({owner: 'ignitionrobotics', repo: library, state: 'open'});
    }

    // Iterate over PRs and label them
    for (var i = 0; i < prs.length; i++) {
      let labels = [];

      for (const collection of collections) {
        if (collection.branch == prs[i].base.ref) {
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
