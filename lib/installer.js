const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const { getAgentSkillDeps, parseAgentFrontmatter } = require('./parser');

const REPO_URL = 'https://github.com/xxziiko/subagent.git';
const SUBAGENT_DIR = '.subagent';

/**
 * Recursively scan agents directory.
 * Supports nested structure: agents/general/*.md, agents/project/sirloin/*.md
 */
async function scanAgents(agentsDir) {
  const agents = [];
  const entries = await fs.readdir(agentsDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(agentsDir, entry.name);
    if (entry.isDirectory()) {
      const subAgents = await scanAgents(fullPath);
      agents.push(...subAgents);
    } else if (entry.name.endsWith('.md')) {
      const frontmatter = await parseAgentFrontmatter(fullPath);
      agents.push({
        name: frontmatter.name || entry.name.replace('.md', ''),
        category: frontmatter.category || 'general',
        isProject: frontmatter.category === 'project',
        description: frontmatter.description || '',
        filePath: fullPath,
      });
    }
  }

  return agents;
}

/**
 * Discover available agents and skills from the source directory.
 */
async function discoverItems(sourceDir) {
  const agentsDir = path.join(sourceDir, 'agents');
  const skillsDir = path.join(sourceDir, 'skills');

  const agents = await scanAgents(agentsDir);

  // Discover skills (recursive scan for directories and categorized files)
  const skills = await scanSkills(skillsDir, skillsDir);

  return { agents, skills };
}

/**
 * Recursively scan skills directory.
 * Supports:
 *   - Directory with SKILL.md (e.g., coding-style-guide/SKILL.md)
 *   - .md files directly in categorized dirs (e.g., shared/review-checklist.md)
 *   - .md files directly in skills/ root (excluded: README.md)
 */
async function scanSkills(baseDir, currentDir, prefix = '') {
  const skills = [];
  const entries = await fs.readdir(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      // Check if it's a skill directory (has SKILL.md)
      const skillMd = path.join(fullPath, 'SKILL.md');
      if (await fs.pathExists(skillMd)) {
        const frontmatter = await parseAgentFrontmatter(skillMd);
        const isProjectByPath = relativePath.startsWith('project');
        const isProjectByCategory = frontmatter.category === 'project';
        skills.push({
          name: relativePath,
          type: 'directory',
          isProject: isProjectByPath || isProjectByCategory,
        });
      } else {
        // Recurse into subdirectories (e.g., shared/, reviewers/, project/)
        const subSkills = await scanSkills(baseDir, fullPath, relativePath);
        skills.push(...subSkills);
      }
    } else if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'README.md') {
      const name = relativePath.replace('.md', '');
      skills.push({
        name,
        type: 'file',
        isProject: name.startsWith('project/'),
      });
    }
  }

  return skills;
}

/**
 * Resolve all skill dependencies for selected agents from source agents/ directory.
 * @param {string} sourceDir
 * @param {string[]} agentNames
 * @param {{ includeProject?: boolean }} options - includeProject: include project-skills deps (default: true)
 */
async function resolveSkillDeps(sourceDir, agentNames, { includeProject = true } = {}) {
  const deps = new Set();
  const { agents } = await discoverItems(sourceDir);
  const agentMap = new Map(agents.map(a => [a.name, a]));

  for (const name of agentNames) {
    const agent = agentMap.get(name);
    if (!agent) continue;
    const skillDeps = await getAgentSkillDeps(agent.filePath, { includeProject });
    skillDeps.forEach(s => deps.add(s));
  }

  return Array.from(deps);
}

/**
 * Clone the subagent repo into the target project.
 */
function cloneRepo(targetDir, repoUrl) {
  const subagentPath = path.join(targetDir, SUBAGENT_DIR);

  if (fs.existsSync(subagentPath)) {
    console.log(`  ${SUBAGENT_DIR}/ already exists, skipping clone`);
    return subagentPath;
  }

  console.log(`  Cloning into ${SUBAGENT_DIR}/...`);
  execSync(`git clone --depth 1 "${repoUrl}" "${subagentPath}"`, {
    stdio: 'inherit',
  });

  return subagentPath;
}

/**
 * Pull latest changes in the subagent directory.
 */
function pullRepo(targetDir) {
  const subagentPath = path.join(targetDir, SUBAGENT_DIR);

  if (!fs.existsSync(subagentPath)) {
    throw new Error(`${SUBAGENT_DIR}/ not found. Run "init" first.`);
  }

  console.log(`  Pulling latest changes...`);
  execSync('git pull origin main', {
    cwd: subagentPath,
    stdio: 'inherit',
  });

  return subagentPath;
}

/**
 * Install selected agents to the target .claude/agents/ directory.
 * Agents are always installed flat into .claude/agents/{name}.md regardless of source structure.
 */
async function installAgents(sourceDir, targetDir, agentNames, { copy = false } = {}) {
  const targetAgentsDir = path.join(targetDir, '.claude', 'agents');
  await fs.ensureDir(targetAgentsDir);

  const { agents } = await discoverItems(sourceDir);
  const agentMap = new Map(agents.map(a => [a.name, a]));

  for (const name of agentNames) {
    const agent = agentMap.get(name);
    if (!agent) {
      console.log(`  Agent not found: ${name} (skipped)`);
      continue;
    }

    const destFile = path.join(targetAgentsDir, `${name}.md`);

    // Remove existing symlink or file before creating new one
    if (await fs.pathExists(destFile)) {
      await fs.remove(destFile);
    }

    if (copy) {
      await fs.copy(agent.filePath, destFile);
    } else {
      const relativeSrc = path.relative(targetAgentsDir, agent.filePath);
      await fs.symlink(relativeSrc, destFile);
    }

    console.log(`  ${copy ? 'Copied' : 'Linked'} agent: ${name}`);
  }
}

/**
 * Install selected skills to the target .claude/skills/ directory.
 */
async function installSkills(sourceDir, targetDir, skillNames, { copy = false } = {}) {
  const srcSkillsDir = path.join(sourceDir, 'skills');
  const targetSkillsDir = path.join(targetDir, '.claude', 'skills');
  await fs.ensureDir(targetSkillsDir);

  for (const name of skillNames) {
    // Determine source: could be a .md file or a directory
    const srcFile = path.join(srcSkillsDir, `${name}.md`);
    const srcDir = path.join(srcSkillsDir, name);

    let src;
    let dest;
    let isDir = false;

    if (await fs.pathExists(srcDir) && (await fs.stat(srcDir)).isDirectory()) {
      src = srcDir;
      dest = path.join(targetSkillsDir, name);
      isDir = true;
    } else if (await fs.pathExists(srcFile)) {
      src = srcFile;
      dest = path.join(targetSkillsDir, `${name}.md`);
    } else {
      console.log(`  Skill not found: ${name} (skipped)`);
      continue;
    }

    // Ensure parent directory exists (for nested skills like shared/review-checklist)
    await fs.ensureDir(path.dirname(dest));

    // Remove existing before creating new
    if (await fs.pathExists(dest)) {
      await fs.remove(dest);
    }

    if (copy) {
      await fs.copy(src, dest);
    } else {
      const relativeSrc = path.relative(path.dirname(dest), src);
      await fs.symlink(relativeSrc, dest);
    }

    console.log(`  ${copy ? 'Copied' : 'Linked'} skill: ${name}`);
  }
}

/**
 * Install scripts to the target project.
 */
async function installScripts(sourceDir, targetDir, { copy = false } = {}) {
  const srcScriptsDir = path.join(sourceDir, 'scripts');
  const targetScriptsDir = path.join(targetDir, 'scripts');

  if (!await fs.pathExists(srcScriptsDir)) return;

  await fs.ensureDir(targetScriptsDir);

  const scripts = await fs.readdir(srcScriptsDir);
  for (const script of scripts) {
    const src = path.join(srcScriptsDir, script);
    const dest = path.join(targetScriptsDir, script);

    if (await fs.pathExists(dest)) {
      await fs.remove(dest);
    }

    if (copy) {
      await fs.copy(src, dest);
      await fs.chmod(dest, 0o755);
    } else {
      const relativeSrc = path.relative(targetScriptsDir, src);
      await fs.symlink(relativeSrc, dest);
    }

    console.log(`  ${copy ? 'Copied' : 'Linked'} script: ${script}`);
  }
}

/**
 * Ensure settings files exist (create from templates if missing).
 */
async function ensureSettingsFiles(sourceDir, targetDir) {
  const claudeDir = path.join(targetDir, '.claude');
  await fs.ensureDir(claudeDir);

  const files = [
    { name: 'settings.local.json', template: 'settings.local.json.example' },
    { name: 'hooks.json', template: 'hooks.json.example' },
  ];

  for (const { name, template } of files) {
    const dest = path.join(claudeDir, name);
    if (await fs.pathExists(dest)) {
      console.log(`  ${name} exists, skipping`);
      continue;
    }

    const templatePath = path.join(sourceDir, 'templates', '.claude', template);
    if (await fs.pathExists(templatePath)) {
      await fs.copy(templatePath, dest);
      console.log(`  Created ${name} from template`);
    }
  }
}

/**
 * Get the source directory for the subagent.
 * When running via npx, the source is the package itself.
 * When running from a cloned .subagent/, the source is that directory.
 */
function getPackageDir() {
  return path.resolve(__dirname, '..');
}

/**
 * Determine if a source is a local .subagent clone or the npm package.
 */
function getSourceDir(targetDir) {
  const subagentPath = path.join(targetDir, SUBAGENT_DIR);
  if (fs.existsSync(subagentPath)) {
    return subagentPath;
  }
  return getPackageDir();
}

/**
 * List installed items (symlinks and copies) in the target .claude/ directory.
 */
async function listInstalled(targetDir) {
  const claudeDir = path.join(targetDir, '.claude');
  const installed = { agents: [], skills: [] };

  const agentsDir = path.join(claudeDir, 'agents');
  if (await fs.pathExists(agentsDir)) {
    const files = await fs.readdir(agentsDir);
    for (const file of files) {
      if (!file.endsWith('.md')) continue;
      const fullPath = path.join(agentsDir, file);
      const stat = await fs.lstat(fullPath);
      installed.agents.push({
        name: file.replace('.md', ''),
        type: stat.isSymbolicLink() ? 'symlink' : 'copy',
      });
    }
  }

  const skillsDir = path.join(claudeDir, 'skills');
  if (await fs.pathExists(skillsDir)) {
    const scanInstalled = async (dir, prefix = '') => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const name = prefix ? `${prefix}/${entry.name}` : entry.name;
        const stat = await fs.lstat(fullPath);

        if (stat.isSymbolicLink()) {
          installed.skills.push({ name: name.replace('.md', ''), type: 'symlink' });
        } else if (entry.isDirectory()) {
          // Check if it's a skill dir or category dir
          if (await fs.pathExists(path.join(fullPath, 'SKILL.md'))) {
            installed.skills.push({ name, type: 'copy' });
          } else {
            await scanInstalled(fullPath, name);
          }
        } else if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'README.md') {
          installed.skills.push({ name: name.replace('.md', ''), type: 'copy' });
        }
      }
    };
    await scanInstalled(skillsDir);
  }

  return installed;
}

module.exports = {
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
};
