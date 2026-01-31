#!/usr/bin/env node

const { program } = require('commander');
const path = require('path');
const {
  REPO_URL,
  SUBAGENT_DIR,
  discoverItems,
  resolveSkillDeps,
  cloneRepo,
  pullRepo,
  installAgents,
  installSkills,
  installScripts,
  ensureSettingsFiles,
  getPackageDir,
  getSourceDir,
  listInstalled,
} = require('../lib/installer');
const {
  promptAgents,
  promptAdditionalSkills,
  promptProjectSkills,
  promptScripts,
} = require('../lib/prompts');

program
  .name('claude-subagent')
  .description('Install Claude Code agents and skills into your project')
  .version(require('../package.json').version);

// ─── init ───────────────────────────────────────────────────────
program
  .command('init')
  .description('Install agents and skills (clone + symlink by default)')
  .option('--target <dir>', 'Target project directory', process.cwd())
  .option('--repo <url>', 'Git repository URL', REPO_URL)
  .option('--copy', 'Copy files instead of symlinking', false)
  .option('--agents <items>', 'Comma-separated agent names (skip interactive)')
  .option('--skills <items>', 'Comma-separated additional skill names')
  .option('--scripts', 'Install utility scripts')
  .option('--project-skills', 'Include project-specific skills')
  .action(async (options) => {
    try {
      const targetDir = path.resolve(options.target);
      const copyMode = options.copy;

      console.log('\n  claude-subagent init\n');

      // Step 1: Clone repo (or use npm package as source)
      let sourceDir;
      if (copyMode) {
        // In copy mode, use the npm package itself as source
        sourceDir = getPackageDir();
        console.log('  Mode: copy (from npm package)\n');
      } else {
        // In symlink mode, clone the repo
        console.log('  Mode: symlink (via git clone)\n');
        sourceDir = cloneRepo(targetDir, options.repo);
      }

      // Step 2: Discover available items
      const { agents, skills } = await discoverItems(sourceDir);

      // Step 3: Select agents
      let selectedAgents;
      if (options.agents) {
        selectedAgents = options.agents.split(',').map(s => s.trim());
      } else {
        selectedAgents = await promptAgents(agents);
      }

      if (selectedAgents.length === 0) {
        console.log('\n  No agents selected. Exiting.\n');
        return;
      }

      // Step 4: Resolve skill dependencies
      const autoDeps = await resolveSkillDeps(sourceDir, selectedAgents);

      // Step 5: Select additional skills
      let selectedSkills = [...autoDeps];
      if (options.skills) {
        const extra = options.skills.split(',').map(s => s.trim());
        selectedSkills = [...new Set([...selectedSkills, ...extra])];
      } else if (!options.agents) {
        // Only prompt if we're in interactive mode
        const additional = await promptAdditionalSkills(skills, autoDeps);
        selectedSkills = [...new Set([...selectedSkills, ...additional])];

        // Project-specific skills
        if (options.projectSkills) {
          const projectSkillNames = skills.filter(s => s.isProject).map(s => s.name);
          selectedSkills = [...new Set([...selectedSkills, ...projectSkillNames])];
        } else {
          const projectSelected = await promptProjectSkills(skills);
          selectedSkills = [...new Set([...selectedSkills, ...projectSelected])];
        }
      }

      // Step 6: Install scripts
      let shouldInstallScripts = options.scripts || false;
      if (!options.agents && !options.scripts) {
        shouldInstallScripts = await promptScripts();
      }

      // Step 7: Execute installation
      console.log('\n  Installing...\n');

      await installAgents(sourceDir, targetDir, selectedAgents, { copy: copyMode });
      await installSkills(sourceDir, targetDir, selectedSkills, { copy: copyMode });

      if (shouldInstallScripts) {
        await installScripts(sourceDir, targetDir, { copy: copyMode });
      }

      await ensureSettingsFiles(sourceDir, targetDir);

      console.log('\n  Installation complete!\n');
      console.log(`  Agents: ${selectedAgents.join(', ')}`);
      console.log(`  Skills: ${selectedSkills.join(', ')}`);
      if (shouldInstallScripts) console.log('  Scripts: installed');
      if (!copyMode) {
        console.log(`\n  Update anytime: claude-subagent update --target ${targetDir}\n`);
      }
    } catch (err) {
      console.error(`\n  Error: ${err.message}\n`);
      process.exit(1);
    }
  });

// ─── update ─────────────────────────────────────────────────────
program
  .command('update')
  .description('Pull latest changes and check for new items')
  .option('--target <dir>', 'Target project directory', process.cwd())
  .action(async (options) => {
    try {
      const targetDir = path.resolve(options.target);

      console.log('\n  claude-subagent update\n');

      // Pull latest
      const sourceDir = pullRepo(targetDir);

      // Check for new agents/skills that aren't installed yet
      const { agents, skills } = await discoverItems(sourceDir);
      const installed = await listInstalled(targetDir);

      const installedAgentNames = new Set(installed.agents.map(a => a.name));
      const newAgents = agents.filter(a => !installedAgentNames.has(a.name));

      if (newAgents.length > 0) {
        console.log(`\n  New agents available: ${newAgents.map(a => a.name).join(', ')}`);
        console.log('  Run "claude-subagent init" to install them.\n');
      }

      // Existing symlinks automatically point to updated content
      console.log('  Existing symlinks updated automatically.\n');
    } catch (err) {
      console.error(`\n  Error: ${err.message}\n`);
      process.exit(1);
    }
  });

// ─── list ───────────────────────────────────────────────────────
program
  .command('list')
  .description('List available and installed agents/skills')
  .option('--target <dir>', 'Target project directory', process.cwd())
  .action(async (options) => {
    try {
      const targetDir = path.resolve(options.target);

      console.log('\n  claude-subagent list\n');

      // Show available items from source
      const sourceDir = getSourceDir(targetDir);
      const { agents, skills } = await discoverItems(sourceDir);

      console.log('  Available agents:');
      for (const a of agents) {
        console.log(`    - ${a.name}`);
      }

      console.log('\n  Available skills:');
      for (const s of skills) {
        const tag = s.isProject ? ' (project-specific)' : '';
        console.log(`    - ${s.name}${tag}`);
      }

      // Show installed items
      const installed = await listInstalled(targetDir);

      if (installed.agents.length > 0 || installed.skills.length > 0) {
        console.log('\n  Installed:');

        if (installed.agents.length > 0) {
          console.log('    Agents:');
          for (const a of installed.agents) {
            console.log(`      - ${a.name} [${a.type}]`);
          }
        }

        if (installed.skills.length > 0) {
          console.log('    Skills:');
          for (const s of installed.skills) {
            console.log(`      - ${s.name} [${s.type}]`);
          }
        }
      } else {
        console.log('\n  No items installed yet.');
      }

      console.log('');
    } catch (err) {
      console.error(`\n  Error: ${err.message}\n`);
      process.exit(1);
    }
  });

program.parse();
