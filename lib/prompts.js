const inquirer = require('inquirer');

/**
 * Prompt user to select agents from available list.
 */
async function promptAgents(agents) {
  const { selected } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selected',
      message: 'Select agents to install:',
      choices: agents.map(a => ({
        name: `${a.name} - ${truncate(a.description, 60)}`,
        value: a.name,
        checked: true,
      })),
    },
  ]);

  return selected;
}

/**
 * Prompt user to select additional skills (beyond auto-resolved dependencies).
 */
async function promptAdditionalSkills(skills, autoSelected) {
  const autoSet = new Set(autoSelected);
  const available = skills.filter(s => !autoSet.has(s.name) && !s.isProject);

  if (available.length === 0) return [];

  console.log(`\n  Auto-included skills: ${autoSelected.join(', ') || '(none)'}\n`);

  const { selected } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selected',
      message: 'Select additional skills:',
      choices: available.map(s => ({
        name: s.name,
        value: s.name,
        checked: false,
      })),
    },
  ]);

  return selected;
}

/**
 * Prompt for project-specific skills inclusion.
 */
async function promptProjectSkills(skills) {
  const projectSkills = skills.filter(s => s.isProject);
  if (projectSkills.length === 0) return [];

  const { include } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'include',
      message: `Include project-specific skills? (${projectSkills.map(s => s.name).join(', ')})`,
      default: false,
    },
  ]);

  if (!include) return [];

  const { selected } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selected',
      message: 'Select project-specific skills:',
      choices: projectSkills.map(s => ({
        name: s.name,
        value: s.name,
        checked: true,
      })),
    },
  ]);

  return selected;
}

/**
 * Prompt for scripts installation.
 */
async function promptScripts() {
  const { install } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'install',
      message: 'Install utility scripts (bug-context.sh, verify.sh)?',
      default: true,
    },
  ]);

  return install;
}

function truncate(str, maxLen) {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen - 3) + '...' : str;
}

module.exports = {
  promptAgents,
  promptAdditionalSkills,
  promptProjectSkills,
  promptScripts,
};
