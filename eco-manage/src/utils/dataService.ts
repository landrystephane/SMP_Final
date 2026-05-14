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
    if (Capacitor.getPlatform() === 'web') {
        const allPending: any[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith('pending_grades_')) {
                const data = JSON.parse(localStorage.getItem(key) || '[]');
                allPending.push(...data);
            }
        }
        return allPending;
    }
    if (!this.db) return [];
    const res = await this.db.query('SELECT * FROM local_grades WHERE synced = 0');
    return res.values || [];
  }

  async getUnsyncedAttendance() {
      if (Capacitor.getPlatform() === 'web') {
          const allPending: any[] = [];
          for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key?.startsWith('pending_attendance_')) {
                  const data = JSON.parse(localStorage.getItem(key) || '[]');
                  allPending.push(...data);
              }
          }
          return allPending;
      }
      if (!this.db) return [];
      const res = await this.db.query('SELECT * FROM local_attendance WHERE synced = 0');
      return res.values || [];
  }

  async sync(serverIp: string, activationKey: string) {
    const grades = await this.getUnsyncedGrades();
    const attendance = await this.getUnsyncedAttendance();

    if (grades.length === 0 && attendance.length === 0) return { success: true, count: 0 };

    try {
      const response = await fetch(`http://${serverIp}:3001/api/sync/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-activation-key': activationKey
        },
        body: JSON.stringify({ grades, attendance })
      });

      if (response.ok) {
        if (Capacitor.getPlatform() === 'web') {
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key?.startsWith('pending_grades_') || key?.startsWith('pending_attendance_')) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(k => localStorage.removeItem(k));
        } else {
            if (grades.length > 0) {
                const gIds = grades.map((g: any) => g.id).join(',');
                await this.db.run(`UPDATE local_grades SET synced = 1 WHERE id IN (${gIds})`);
            }
            if (attendance.length > 0) {
                const aIds = attendance.map((a: any) => a.id).join(',');
                await this.db.run(`UPDATE local_attendance SET synced = 1 WHERE id IN (${aIds})`);
            }
        }
        return { success: true, count: grades.length + attendance.length };
      } else {
        const error = await response.text();
        throw new Error(error);
      }
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}

export const dataService = new DataService();
