const fs = require('fs-extra');
const path = require('path');

/**
 * Parse YAML frontmatter from a markdown file.
 * Returns an object with key-value pairs from the frontmatter.
 */
async function parseAgentFrontmatter(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');
  const match = content.match(/^---\n([\s\S]*?)\n---/);

  if (!match) return {};

  const frontmatter = {};
  const lines = match[1].split('\n');

  for (const line of lines) {
    const kvMatch = line.match(/^([\w-]+):\s*(.+)$/);
    if (kvMatch) {
      frontmatter[kvMatch[1]] = kvMatch[2].trim();
    }
  }

  return frontmatter;
}

/**
 * Extract skill dependencies from an agent file.
 * Returns an array of skill paths (e.g., ['shared/review-checklist', 'reviewers/react-patterns']).
 * @param {string} agentFilePath
 * @param {{ includeProject?: boolean }} options - includeProject: whether to include project-skills (default: true)
 */
async function getAgentSkillDeps(agentFilePath, { includeProject = true } = {}) {
  const frontmatter = await parseAgentFrontmatter(agentFilePath);

  const general = (frontmatter.skills || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  if (!includeProject) return general;

  const project = (frontmatter['project-skills'] || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  return [...general, ...project];
}

module.exports = { parseAgentFrontmatter, getAgentSkillDeps };
