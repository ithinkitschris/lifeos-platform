/**
 * World API Routes
 * Manages the LifeOS world canon - the source of truth for all design artifacts
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

const WORLD_PATH = path.join(__dirname, '../../data/world');
const DOMAINS_PATH = path.join(WORLD_PATH, 'domains');
const VERSIONS_PATH = path.join(WORLD_PATH, 'versions');

// Helper: Load YAML file
function loadYaml(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return yaml.load(content);
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error.message);
    return null;
  }
}

// Helper: Save YAML file
function saveYaml(filePath, data) {
  try {
    const content = yaml.dump(data, {
      indent: 2,
      lineWidth: 100,
      noRefs: true
    });
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  } catch (error) {
    console.error(`Error saving ${filePath}:`, error.message);
    return false;
  }
}

// Helper: Update meta.yaml last_modified
function updateLastModified() {
  const metaPath = path.join(WORLD_PATH, 'meta.yaml');
  const meta = loadYaml(metaPath);
  if (meta) {
    meta.last_modified = new Date().toISOString().split('T')[0];
    saveYaml(metaPath, meta);
  }
}

// ============================================
// META & FULL WORLD STATE
// ============================================

// GET /api/world - Full world state
router.get('/', (req, res) => {
  const meta = loadYaml(path.join(WORLD_PATH, 'meta.yaml'));
  const setting = loadYaml(path.join(WORLD_PATH, 'setting.yaml'));
  const thesis = loadYaml(path.join(WORLD_PATH, 'thesis.yaml'));
  const devices = loadYaml(path.join(WORLD_PATH, 'devices.yaml'));
  const systemArchitecture = loadYaml(path.join(WORLD_PATH, 'system-architecture.yaml'));
  const registry = loadYaml(path.join(DOMAINS_PATH, '_registry.yaml'));
  const openQuestions = loadYaml(path.join(WORLD_PATH, 'open-questions.yaml'));

  // Load all domains
  const domains = {};
  if (registry && registry.domains) {
    registry.domains.forEach(domainRef => {
      const domainData = loadYaml(path.join(DOMAINS_PATH, domainRef.file));
      if (domainData) {
        domains[domainRef.id] = domainData;
      }
    });
  }

  res.json({
    meta,
    setting,
    thesis,
    devices,
    systemArchitecture,
    domains,
    openQuestions: openQuestions?.questions || []
  });
});

// GET /api/world/meta - Version info only
router.get('/meta', (req, res) => {
  const meta = loadYaml(path.join(WORLD_PATH, 'meta.yaml'));
  if (!meta) {
    return res.status(500).json({ error: 'Failed to load meta.yaml' });
  }
  res.json(meta);
});

// PUT /api/world/meta - Update meta info
router.put('/meta', (req, res) => {
  const metaPath = path.join(WORLD_PATH, 'meta.yaml');
  const meta = loadYaml(metaPath);
  if (!meta) {
    return res.status(500).json({ error: 'Failed to load meta.yaml' });
  }

  // Only allow updating certain fields
  const { description } = req.body;
  if (description) meta.description = description;

  meta.last_modified = new Date().toISOString().split('T')[0];

  if (saveYaml(metaPath, meta)) {
    res.json(meta);
  } else {
    res.status(500).json({ error: 'Failed to save meta.yaml' });
  }
});

// ============================================
// SETTING (2030 WORLD CONTEXT)
// ============================================

// GET /api/world/setting - 2030 world context
router.get('/setting', (req, res) => {
  const setting = loadYaml(path.join(WORLD_PATH, 'setting.yaml'));
  if (!setting) {
    return res.status(500).json({ error: 'Failed to load setting.yaml' });
  }
  res.json(setting);
});

// PUT /api/world/setting - Update setting
router.put('/setting', (req, res) => {
  const settingPath = path.join(WORLD_PATH, 'setting.yaml');
  const setting = req.body;

  if (saveYaml(settingPath, setting)) {
    updateLastModified();
    res.json(setting);
  } else {
    res.status(500).json({ error: 'Failed to save setting.yaml' });
  }
});

// ============================================
// THESIS
// ============================================

// GET /api/world/thesis - Thesis structure
router.get('/thesis', (req, res) => {
  try {
    const thesisPath = path.join(WORLD_PATH, 'thesis.yaml');
    const thesis = loadYaml(thesisPath);
    if (!thesis) {
      console.error(`Failed to load thesis.yaml from ${thesisPath}`);
      return res.status(500).json({ error: 'Failed to load thesis.yaml', path: thesisPath });
    }
    res.json(thesis);
  } catch (error) {
    console.error('Error loading thesis:', error);
    res.status(500).json({ error: 'Failed to load thesis', details: error.message });
  }
});

// PUT /api/world/thesis - Update thesis
router.put('/thesis', (req, res) => {
  const thesisPath = path.join(WORLD_PATH, 'thesis.yaml');
  const thesis = req.body;

  if (saveYaml(thesisPath, thesis)) {
    updateLastModified();
    res.json(thesis);
  } else {
    res.status(500).json({ error: 'Failed to save thesis.yaml' });
  }
});

// ============================================
// DEVICES (MULTIMODAL ECOSYSTEM)
// ============================================

// GET /api/world/devices - Device ecosystem
router.get('/devices', (req, res) => {
  const devices = loadYaml(path.join(WORLD_PATH, 'devices.yaml'));
  if (!devices) {
    return res.status(500).json({ error: 'Failed to load devices.yaml' });
  }
  res.json(devices);
});

// PUT /api/world/devices - Update device ecosystem
router.put('/devices', (req, res) => {
  const devicesPath = path.join(WORLD_PATH, 'devices.yaml');
  const devices = req.body;

  if (saveYaml(devicesPath, devices)) {
    updateLastModified();
    res.json(devices);
  } else {
    res.status(500).json({ error: 'Failed to save devices.yaml' });
  }
});

// ============================================
// SYSTEM ARCHITECTURE
// ============================================

// GET /api/world/system-architecture - Full system architecture
router.get('/system-architecture', (req, res) => {
  const architecture = loadYaml(path.join(WORLD_PATH, 'system-architecture.yaml'));
  if (!architecture) {
    return res.status(500).json({ error: 'Failed to load system-architecture.yaml' });
  }
  res.json(architecture);
});

// PUT /api/world/system-architecture - Update system architecture
router.put('/system-architecture', (req, res) => {
  const archPath = path.join(WORLD_PATH, 'system-architecture.yaml');
  const architecture = req.body;

  if (saveYaml(archPath, architecture)) {
    updateLastModified();
    res.json(architecture);
  } else {
    res.status(500).json({ error: 'Failed to save system-architecture.yaml' });
  }
});

// ============================================
// DOMAINS
// ============================================

// GET /api/world/domains - List all domains with summaries
router.get('/domains', (req, res) => {
  const registry = loadYaml(path.join(DOMAINS_PATH, '_registry.yaml'));
  if (!registry) {
    return res.status(500).json({ error: 'Failed to load domain registry' });
  }

  // Enrich with actual domain data
  const domains = registry.domains.map(domainRef => {
    const domainData = loadYaml(path.join(DOMAINS_PATH, domainRef.file));
    return {
      id: domainRef.id,
      name: domainRef.name,
      file: domainRef.file,
      order: domainRef.order,
      description: domainData?.description || '',
      status: domainData?.status || 'unknown',
      version: domainData?.version || '0.0.0'
    };
  });

  res.json({ domains });
});

// GET /api/world/domains/:id - Single domain
router.get('/domains/:id', (req, res) => {
  const { id } = req.params;
  const registry = loadYaml(path.join(DOMAINS_PATH, '_registry.yaml'));

  const domainRef = registry?.domains?.find(d => d.id === id);
  if (!domainRef) {
    return res.status(404).json({
      error: 'Domain not found',
      available: registry?.domains?.map(d => d.id) || []
    });
  }

  const domain = loadYaml(path.join(DOMAINS_PATH, domainRef.file));
  if (!domain) {
    return res.status(500).json({ error: `Failed to load ${domainRef.file}` });
  }

  res.json(domain);
});

// PUT /api/world/domains/:id - Update domain
router.put('/domains/:id', (req, res) => {
  const { id } = req.params;
  const registry = loadYaml(path.join(DOMAINS_PATH, '_registry.yaml'));

  const domainRef = registry?.domains?.find(d => d.id === id);
  if (!domainRef) {
    return res.status(404).json({ error: 'Domain not found' });
  }

  const domainPath = path.join(DOMAINS_PATH, domainRef.file);
  const domain = req.body;

  // Ensure ID matches
  domain.id = id;

  if (saveYaml(domainPath, domain)) {
    updateLastModified();
    res.json(domain);
  } else {
    res.status(500).json({ error: 'Failed to save domain' });
  }
});

// POST /api/world/domains - Create new domain
router.post('/domains', (req, res) => {
  const { id, name, description } = req.body;

  if (!id || !name) {
    return res.status(400).json({ error: 'id and name are required' });
  }

  // Check if domain already exists
  const registryPath = path.join(DOMAINS_PATH, '_registry.yaml');
  const registry = loadYaml(registryPath);

  if (registry?.domains?.find(d => d.id === id)) {
    return res.status(409).json({ error: 'Domain already exists' });
  }

  // Create domain file
  const filename = `${id}.yaml`;
  const domain = {
    id,
    name,
    description: description || '',
    status: 'open',
    version: '0.1.0',
    sections: []
  };

  const domainPath = path.join(DOMAINS_PATH, filename);
  if (!saveYaml(domainPath, domain)) {
    return res.status(500).json({ error: 'Failed to create domain file' });
  }

  // Add to registry
  const maxOrder = Math.max(...(registry.domains.map(d => d.order) || [0]));
  registry.domains.push({
    id,
    name,
    file: filename,
    order: maxOrder + 1
  });

  if (!saveYaml(registryPath, registry)) {
    // Rollback: delete the created file
    fs.unlinkSync(domainPath);
    return res.status(500).json({ error: 'Failed to update registry' });
  }

  updateLastModified();
  res.status(201).json(domain);
});

// DELETE /api/world/domains/:id - Remove domain
router.delete('/domains/:id', (req, res) => {
  const { id } = req.params;
  const registryPath = path.join(DOMAINS_PATH, '_registry.yaml');
  const registry = loadYaml(registryPath);

  const domainIndex = registry?.domains?.findIndex(d => d.id === id);
  if (domainIndex === -1) {
    return res.status(404).json({ error: 'Domain not found' });
  }

  const domainRef = registry.domains[domainIndex];
  const domainPath = path.join(DOMAINS_PATH, domainRef.file);

  // Remove from registry
  registry.domains.splice(domainIndex, 1);

  if (!saveYaml(registryPath, registry)) {
    return res.status(500).json({ error: 'Failed to update registry' });
  }

  // Delete file
  try {
    fs.unlinkSync(domainPath);
  } catch (error) {
    console.error(`Failed to delete ${domainPath}:`, error.message);
  }

  updateLastModified();
  res.json({ message: 'Domain deleted', id });
});

// ============================================
// OPEN QUESTIONS
// ============================================

// GET /api/world/open-questions - All open questions
router.get('/open-questions', (req, res) => {
  const data = loadYaml(path.join(WORLD_PATH, 'open-questions.yaml'));
  if (!data) {
    return res.status(500).json({ error: 'Failed to load open-questions.yaml' });
  }
  res.json({ questions: data.questions || [] });
});

// GET /api/world/open-questions/:id - Single question
router.get('/open-questions/:id', (req, res) => {
  const { id } = req.params;
  const data = loadYaml(path.join(WORLD_PATH, 'open-questions.yaml'));
  const question = data?.questions?.find(q => q.id === id);

  if (!question) {
    return res.status(404).json({
      error: 'Question not found',
      available: data?.questions?.map(q => q.id) || []
    });
  }

  res.json(question);
});

// PUT /api/world/open-questions/:id - Update question
router.put('/open-questions/:id', (req, res) => {
  const { id } = req.params;
  const questionsPath = path.join(WORLD_PATH, 'open-questions.yaml');
  const data = loadYaml(questionsPath);

  const questionIndex = data?.questions?.findIndex(q => q.id === id);
  if (questionIndex === -1) {
    return res.status(404).json({ error: 'Question not found' });
  }

  // Update question, preserving ID
  const updated = { ...req.body, id };
  data.questions[questionIndex] = updated;

  if (saveYaml(questionsPath, data)) {
    updateLastModified();
    res.json(updated);
  } else {
    res.status(500).json({ error: 'Failed to save question' });
  }
});

// POST /api/world/open-questions - Create new question
router.post('/open-questions', (req, res) => {
  const questionsPath = path.join(WORLD_PATH, 'open-questions.yaml');
  const data = loadYaml(questionsPath) || { questions: [] };

  const { name, domain, question, notes } = req.body;

  if (!name || !question) {
    return res.status(400).json({ error: 'name and question are required' });
  }

  // Generate ID
  const maxNum = Math.max(
    ...data.questions.map(q => parseInt(q.id.replace('OQ-', '')) || 0),
    0
  );
  const id = `OQ-${maxNum + 1}`;

  const newQuestion = {
    id,
    name,
    status: 'open',
    domain: domain || 'architecture',
    question,
    notes: notes || '',
    created: new Date().toISOString().split('T')[0]
  };

  data.questions.push(newQuestion);

  if (saveYaml(questionsPath, data)) {
    updateLastModified();
    res.status(201).json(newQuestion);
  } else {
    res.status(500).json({ error: 'Failed to save question' });
  }
});

// DELETE /api/world/open-questions/:id - Delete question
router.delete('/open-questions/:id', (req, res) => {
  const { id } = req.params;
  const questionsPath = path.join(WORLD_PATH, 'open-questions.yaml');
  const data = loadYaml(questionsPath);

  if (!data || !data.questions) {
    return res.status(404).json({ error: 'Questions file not found' });
  }

  const questionIndex = data.questions.findIndex(q => q.id === id);
  if (questionIndex === -1) {
    return res.status(404).json({ error: 'Question not found' });
  }

  data.questions.splice(questionIndex, 1);

  if (saveYaml(questionsPath, data)) {
    updateLastModified();
    res.json({ message: 'Question deleted', id });
  } else {
    res.status(500).json({ error: 'Failed to save questions file' });
  }
});

// ============================================
// VERSIONING
// ============================================

// POST /api/world/versions - Create version snapshot
router.post('/versions', (req, res) => {
  const { version, notes } = req.body;

  if (!version) {
    return res.status(400).json({ error: 'version is required (e.g., "0.1.0")' });
  }

  // Check if version already exists
  const versionDir = path.join(VERSIONS_PATH, `v${version}`);
  if (fs.existsSync(versionDir)) {
    return res.status(409).json({ error: 'Version already exists' });
  }

  // Create version directory
  fs.mkdirSync(versionDir, { recursive: true });

  // Copy all current files to version snapshot
  const snapshot = {
    version,
    created: new Date().toISOString(),
    notes: notes || '',
    files: {}
  };

  // Copy meta.yaml
  snapshot.files['meta.yaml'] = loadYaml(path.join(WORLD_PATH, 'meta.yaml'));

  // Copy setting.yaml
  snapshot.files['setting.yaml'] = loadYaml(path.join(WORLD_PATH, 'setting.yaml'));

  // Copy thesis.yaml
  snapshot.files['thesis.yaml'] = loadYaml(path.join(WORLD_PATH, 'thesis.yaml'));

  // Copy devices.yaml
  snapshot.files['devices.yaml'] = loadYaml(path.join(WORLD_PATH, 'devices.yaml'));

  // Copy system-architecture.yaml
  snapshot.files['system-architecture.yaml'] = loadYaml(path.join(WORLD_PATH, 'system-architecture.yaml'));

  // Copy open-questions.yaml
  snapshot.files['open-questions.yaml'] = loadYaml(path.join(WORLD_PATH, 'open-questions.yaml'));

  // Copy all domains
  const registry = loadYaml(path.join(DOMAINS_PATH, '_registry.yaml'));
  snapshot.files['domains/_registry.yaml'] = registry;

  if (registry?.domains) {
    registry.domains.forEach(domainRef => {
      const domainData = loadYaml(path.join(DOMAINS_PATH, domainRef.file));
      snapshot.files[`domains/${domainRef.file}`] = domainData;
    });
  }

  // Save snapshot
  const snapshotPath = path.join(versionDir, 'snapshot.json');
  fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));

  // Update meta.yaml with new version
  const metaPath = path.join(WORLD_PATH, 'meta.yaml');
  const meta = loadYaml(metaPath);
  meta.version = version;
  meta.changelog = meta.changelog || [];
  meta.changelog.push({
    version,
    date: new Date().toISOString().split('T')[0],
    changes: [notes || 'Version snapshot created']
  });
  saveYaml(metaPath, meta);

  res.status(201).json({
    message: 'Version created',
    version,
    path: versionDir
  });
});

// GET /api/world/versions - List all versions
router.get('/versions', (req, res) => {
  if (!fs.existsSync(VERSIONS_PATH)) {
    return res.json({ versions: [] });
  }

  const versions = fs.readdirSync(VERSIONS_PATH)
    .filter(f => f.startsWith('v'))
    .map(versionDir => {
      const snapshotPath = path.join(VERSIONS_PATH, versionDir, 'snapshot.json');
      try {
        const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
        return {
          version: snapshot.version,
          created: snapshot.created,
          notes: snapshot.notes
        };
      } catch (error) {
        return { version: versionDir.replace('v', ''), error: 'Invalid snapshot' };
      }
    })
    .sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }));

  res.json({ versions });
});

// GET /api/world/versions/:version - Get specific version
router.get('/versions/:version', (req, res) => {
  const { version } = req.params;
  const versionDir = path.join(VERSIONS_PATH, `v${version}`);
  const snapshotPath = path.join(versionDir, 'snapshot.json');

  if (!fs.existsSync(snapshotPath)) {
    return res.status(404).json({ error: 'Version not found' });
  }

  try {
    const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
    res.json(snapshot);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load version snapshot' });
  }
});

// POST /api/world/versions/:version/restore - Restore to version
router.post('/versions/:version/restore', (req, res) => {
  const { version } = req.params;
  const versionDir = path.join(VERSIONS_PATH, `v${version}`);
  const snapshotPath = path.join(versionDir, 'snapshot.json');

  if (!fs.existsSync(snapshotPath)) {
    return res.status(404).json({ error: 'Version not found' });
  }

  try {
    const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));

    // Restore each file
    for (const [filePath, content] of Object.entries(snapshot.files)) {
      const fullPath = path.join(WORLD_PATH, filePath);
      const dir = path.dirname(fullPath);

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      saveYaml(fullPath, content);
    }

    // Update meta to reflect restore
    const metaPath = path.join(WORLD_PATH, 'meta.yaml');
    const meta = loadYaml(metaPath);
    meta.last_modified = new Date().toISOString().split('T')[0];
    meta.changelog.push({
      version: meta.version,
      date: new Date().toISOString().split('T')[0],
      changes: [`Restored from version ${version}`]
    });
    saveYaml(metaPath, meta);

    res.json({ message: 'Restored successfully', version });
  } catch (error) {
    res.status(500).json({ error: 'Failed to restore version', details: error.message });
  }
});

export default router;
