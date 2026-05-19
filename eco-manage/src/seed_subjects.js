const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const userData = path.join(process.env.APPDATA, 'eco-manage');
const dbFile = path.join(userData, 'school.db');

try {
    const db = new Database(dbFile);
    console.log('Opening database:', dbFile);

    const standardSubjects = [
        // Francophone Maternelle
        { name: 'Activités Langagières', domain: 'Langage & Communication', level: 'MATERNELLE', section: 'FRANCOPHONE' },
        { name: 'Activités Mathématiques', domain: 'Logique & Nombres', level: 'MATERNELLE', section: 'FRANCOPHONE' },
        { name: 'Activités Graphiques', domain: 'Pré-écriture', level: 'MATERNELLE', section: 'FRANCOPHONE' },
        { name: 'Activités Sensorielles', domain: 'Éveil & Exploration', level: 'MATERNELLE', section: 'FRANCOPHONE' },
        { name: 'Activités Pratiques & Esthétiques', domain: 'Créativité & Autonomie', level: 'MATERNELLE', section: 'FRANCOPHONE' },
        // Francophone Primaire
        { name: 'Mathématiques', domain: 'Sciences', level: 'PRIMAIRE', section: 'FRANCOPHONE' },
        { name: 'Langue Française', domain: 'Lettres & Communication', level: 'PRIMAIRE', section: 'FRANCOPHONE' },
        { name: 'Sciences et Technologies', domain: 'Sciences', level: 'PRIMAIRE', section: 'FRANCOPHONE' },
        { name: 'Histoire & Géographie', domain: 'Sciences Humaines', level: 'PRIMAIRE', section: 'FRANCOPHONE' },
        { name: 'Éducation Civique & Morale', domain: 'Culture', level: 'PRIMAIRE', section: 'FRANCOPHONE' },
        { name: 'Informatique / TICE', domain: 'Technologies', level: 'PRIMAIRE', section: 'FRANCOPHONE' },
        { name: 'Arts Plastiques & Musique', domain: 'Culture', level: 'PRIMAIRE', section: 'FRANCOPHONE' },
        { name: 'Éducation Physique & Sportive', domain: 'Santé', level: 'PRIMAIRE', section: 'FRANCOPHONE' },
        // Anglophone Nursery (Maternelle)
        { name: 'Language Activities', domain: 'Language & Communication', level: 'MATERNELLE', section: 'ANGLOPHONE' },
        { name: 'Mathematical Activities', domain: 'Logic & Numbers', level: 'MATERNELLE', section: 'ANGLOPHONE' },
        { name: 'Pre-Writing & Drawing', domain: 'Fine Motor Skills', level: 'MATERNELLE', section: 'ANGLOPHONE' },
        { name: 'Sensory & Science Activities', domain: 'Discovery', level: 'MATERNELLE', section: 'ANGLOPHONE' },
        { name: 'Creative & Practical Activities', domain: 'Creativity', level: 'MATERNELLE', section: 'ANGLOPHONE' },
        // Anglophone Primary (Primaire)
        { name: 'Mathematics', domain: 'Sciences', level: 'PRIMAIRE', section: 'ANGLOPHONE' },
        { name: 'English Language', domain: 'Letters & Communication', level: 'PRIMAIRE', section: 'ANGLOPHONE' },
        { name: 'Science and Technology', domain: 'Sciences', level: 'PRIMAIRE', section: 'ANGLOPHONE' },
        { name: 'Social Studies', domain: 'Social Sciences', level: 'PRIMAIRE', section: 'ANGLOPHONE' },
        { name: 'Citizenship & Moral Education', domain: 'Culture', level: 'PRIMAIRE', section: 'ANGLOPHONE' },
        { name: 'ICT / Computer Science', domain: 'Technologies', level: 'PRIMAIRE', section: 'ANGLOPHONE' },
        { name: 'Creative Arts & Music', domain: 'Culture', level: 'PRIMAIRE', section: 'ANGLOPHONE' },
        { name: 'Physical Education & Sports', domain: 'Health', level: 'PRIMAIRE', section: 'ANGLOPHONE' }
    ];

    const checkSubject = db.prepare('SELECT id FROM subjects WHERE name = ? AND level = ? AND section = ?');
    const insertSub = db.prepare('INSERT INTO subjects (name, domain, level, section) VALUES (?, ?, ?, ?)');
    const insertSchoolSub = db.prepare('INSERT OR IGNORE INTO school_subjects (school_id, subject_id, is_active) VALUES (1, ?, 1)');
    const updateSchoolSub = db.prepare('UPDATE school_subjects SET is_active = 1 WHERE school_id = 1 AND subject_id = ?');

    db.transaction(() => {
        for (const sub of standardSubjects) {
            const existing = checkSubject.get(sub.name, sub.level, sub.section);
            let subjectId;
            if (!existing) {
                const res = insertSub.run(sub.name, sub.domain, sub.level, sub.section);
                subjectId = res.lastInsertRowid;
                console.log(`Inserted subject: ${sub.name} (${sub.level} - ${sub.section})`);
            } else {
                subjectId = existing.id;
            }
            insertSchoolSub.run(subjectId);
            updateSchoolSub.run(subjectId);
        }
    })();

    console.log('Finished updating standard subjects.');
} catch (err) {
    console.error('General Error:', err.message);
}
process.exit(0);
