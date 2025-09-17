import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

let db: Database.Database;

export function initializeDatabase(dbPath: string) {
  db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      current_stage INTEGER DEFAULT 1,
      is_completed BOOLEAN DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now')),
      settings TEXT
    );
    CREATE TABLE IF NOT EXISTS stage_data (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      stage_number INTEGER NOT NULL,
      version INTEGER DEFAULT 1,
      content TEXT,
      questions TEXT,
      feedback TEXT,
      is_accepted BOOLEAN DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      UNIQUE(project_id, stage_number, version)
    );
    CREATE TABLE IF NOT EXISTS context (
      id TEXT PRIMARY KEY,
      project_id TEXT UNIQUE NOT NULL,
      global_context TEXT,
      tech_stack TEXT,
      style_guide TEXT,
      data_models TEXT,
      updated_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS exports (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      file_path TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS llm_config (
      id INTEGER PRIMARY KEY,
      provider TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      model TEXT,
      is_active BOOLEAN DEFAULT 0,
      parameters TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_projects_updated ON projects(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_stage_data_lookup ON stage_data(project_id, stage_number);
    CREATE INDEX IF NOT EXISTS idx_exports_project ON exports(project_id, created_at DESC);
  `);
  return db;
}

export function createProject(data: any) {
  const id = uuidv4();
  db.prepare(`INSERT INTO projects (id, name, description) VALUES (?, ?, ?)`)
    .run(id, data.name, data.description ?? null);
  db.prepare(`INSERT INTO context (id, project_id, global_context) VALUES (?, ?, ?)`)
    .run(uuidv4(), id, JSON.stringify({}));
  return { id, ...data };
}

export function loadProject(id: string) {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as any;
  const stages = db.prepare('SELECT * FROM stage_data WHERE project_id = ? ORDER BY stage_number, version').all(id) as any[];
  const context = db.prepare('SELECT * FROM context WHERE project_id = ?').get(id) as any;
  return {
    ...project,
    // Normalise settings so renderer gets a parsed object instead of raw JSON string
    settings: project && project.settings ? JSON.parse(project.settings) : null,
    stages,
    context: context ? JSON.parse(context.global_context) : {}
  };
}

export function saveStageData(data: any) {
  // determine version: if caller supplies one, keep it; otherwise auto-increment
  let version = data.version;
  if (version === undefined) {
    const row = db
      .prepare(
        'SELECT COALESCE(MAX(version),0)+1 AS nextVersion FROM stage_data WHERE project_id = ? AND stage_number = ?'
      )
      .get(data.projectId, data.stageNumber) as any;
    version = row?.nextVersion ?? 1;
  }

  const id = uuidv4();
  db.prepare(
    `INSERT INTO stage_data (id, project_id, stage_number, version, content, questions, feedback, is_accepted)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    data.projectId,
    data.stageNumber,
    version,
    JSON.stringify(data.content),
    JSON.stringify(data.questions ?? []),
    JSON.stringify(data.feedback ?? []),
    data.isAccepted ? 1 : 0
  );

  /* -----------------------------------------------------------
     Advance project.current_stage only when this version is
     explicitly accepted. When accepted, move to the *next*
     stage (clamped 1‥8). Draft / evaluation iterations leave
     current_stage unchanged.
  ----------------------------------------------------------- */
  if (data.isAccepted) {
    const nextStage = Math.min(8, Math.max(1, (data.stageNumber ?? 1) + 1));
    db.prepare(
      `UPDATE projects SET current_stage = ?, updated_at = strftime('%s', 'now') WHERE id = ?`
    ).run(nextStage, data.projectId);
  }

  return id;
}

export function listProjects() {
  return db.prepare('SELECT id, name, description, current_stage, is_completed, created_at, updated_at FROM projects ORDER BY updated_at DESC').all();
}

export function updateProject(id: string, data: any) {
  const { name, description, current_stage, is_completed, settings } = data;
  db.prepare(`
    UPDATE projects 
    SET name = ?, description = ?, current_stage = ?, is_completed = ?, settings = ?, updated_at = strftime('%s', 'now')
    WHERE id = ?
  `).run(
    name, 
    description, 
    current_stage ?? (db.prepare('SELECT current_stage FROM projects WHERE id = ?').get(id) as any)?.current_stage, 
    is_completed ? 1 : 0, 
    settings ? JSON.stringify(settings) : (db.prepare('SELECT settings FROM projects WHERE id = ?').get(id) as any)?.settings,
    id
  );
  return loadProject(id);
}

export function updateContext(projectId: string, data: any) {
  const { global_context, tech_stack, style_guide, data_models } = data;
  db.prepare(`
    UPDATE context
    SET global_context = ?, tech_stack = ?, style_guide = ?, data_models = ?, updated_at = strftime('%s', 'now')
    WHERE project_id = ?
  `).run(
    global_context ? JSON.stringify(global_context) : (db.prepare('SELECT global_context FROM context WHERE project_id = ?').get(projectId) as any)?.global_context,
    tech_stack ? JSON.stringify(tech_stack) : (db.prepare('SELECT tech_stack FROM context WHERE project_id = ?').get(projectId) as any)?.tech_stack,
    style_guide ? JSON.stringify(style_guide) : (db.prepare('SELECT style_guide FROM context WHERE project_id = ?').get(projectId) as any)?.style_guide,
    data_models ? JSON.stringify(data_models) : (db.prepare('SELECT data_models FROM context WHERE project_id = ?').get(projectId) as any)?.data_models,
    projectId
  );
  return db.prepare('SELECT * FROM context WHERE project_id = ?').get(projectId);
}

export function saveLLMConfig(data: any) {
  const { provider, endpoint, model, is_active, parameters } = data;
  
  // If setting as active, deactivate all others first
  if (is_active) {
    db.prepare('UPDATE llm_config SET is_active = 0').run();
  }
  
  // Check if config already exists for this provider
  const existing = db.prepare('SELECT id FROM llm_config WHERE provider = ?').get(provider) as any;
  
  if (existing) {
    db.prepare(`
      UPDATE llm_config
      SET endpoint = ?, model = ?, is_active = ?, parameters = ?
      WHERE id = ?
    `).run(endpoint, model, is_active ? 1 : 0, JSON.stringify(parameters), existing.id);
    return existing.id;
  } else {
    const result = db.prepare(`
      INSERT INTO llm_config (provider, endpoint, model, is_active, parameters)
      VALUES (?, ?, ?, ?, ?)
    `).run(provider, endpoint, model, is_active ? 1 : 0, JSON.stringify(parameters));
    return result.lastInsertRowid;
  }
}

export function getLLMConfigs() {
  const configs = db.prepare('SELECT * FROM llm_config').all();
  return configs.map((config: any) => ({
    ...config,
    parameters: config.parameters ? JSON.parse(config.parameters) : {},
    is_active: Boolean(config.is_active)
  }));
}

export function getActiveLLMConfig() {
  const config = db.prepare('SELECT * FROM llm_config WHERE is_active = 1').get() as any;
  if (!config) return null;
  
  return {
    ...config,
    parameters: config.parameters ? JSON.parse(config.parameters) : {},
    is_active: Boolean(config.is_active)
  };
}

export function saveExport(data: any) {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO exports (id, project_id, platform, file_path)
    VALUES (?, ?, ?, ?)
  `).run(id, data.projectId, data.platform, data.filePath);
  return id;
}

export function getProjectExports(projectId: string) {
  return db.prepare('SELECT * FROM exports WHERE project_id = ? ORDER BY created_at DESC').all(projectId);
}

export function deleteProject(id: string) {
  // This will cascade to stage_data, context, and exports due to foreign key constraints
  db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  return { success: true };
}
