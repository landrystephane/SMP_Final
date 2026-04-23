import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';

class DataService {
  private sqlite: SQLiteConnection | null = null;
  private db: any = null;

  async init() {
    if (Capacitor.getPlatform() === 'web') return;

    this.sqlite = new SQLiteConnection(CapacitorSQLite);
    this.db = await this.sqlite.createConnection('local_school', false, 'no-encryption', 1, false);
    await this.db.open();

    const schema = `
      CREATE TABLE IF NOT EXISTS local_grades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER,
        subject_id INTEGER,
        score REAL,
        synced INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS local_attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER,
        status TEXT,
        date TEXT,
        synced INTEGER DEFAULT 0
      );
    `;
    await this.db.execute(schema);
  }

  async saveGrade(grade: any) {
    if (Capacitor.getPlatform() === 'web') {
        // Use window.electronAPI or fallback
        return;
    }
    const query = `INSERT INTO local_grades (student_id, subject_id, score) VALUES (?, ?, ?)`;
    await this.db.run(query, [grade.student_id, grade.subject_id, grade.score]);
  }

  async getUnsyncedGrades() {
    if (!this.db) return [];
    const res = await this.db.query('SELECT * FROM local_grades WHERE synced = 0');
    return res.values;
  }
}

export const dataService = new DataService();
