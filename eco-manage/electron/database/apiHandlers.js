const fs = require('fs');
const { db } = require('./db');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const session = require('./session');



const getActiveSchoolId = (providedId = null) => {
    if (providedId) return providedId;
    const user = session.getStore()?.user;
    if (!user) return null;
    return user.schoolId || user.school_id;
};

const handlers = {};

handlers['db:getErrorLogs'] = async () => {
    if ((session.getStore()?.user)?.role !== 'SUPERADMIN') throw new Error('Unauthorized');
    if (fs.existsSync(logPath)) {
        return fs.readFileSync(logPath, 'utf8');
    }
    return 'Aucun journal d\'erreurs détecté.';

};

handlers['db:clearErrorLogs'] = async () => {
    if ((session.getStore()?.user)?.role !== 'SUPERADMIN') throw new Error('Unauthorized');
    if (fs.existsSync(logPath)) {
        fs.writeFileSync(logPath, '', 'utf8');
    }
    return true;

};

handlers['db:logFrontendError'] = async (errorDetails) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [Frontend Error] ${errorDetails.message}\nStack: ${errorDetails.stack}\nComponent Info: ${errorDetails.componentStack}\n\n`;
    try {
        fs.appendFileSync(logPath, logMessage, 'utf8');
    } catch (err) {
        console.error('Failed to write frontend error to log:', err);
    }
    return true;

};

handlers['auth:restoreSession'] = async (user) => {
    if (user) {
        user.full_name = user.fullName;
    }
    // session is readonly here
    return true;

};

handlers['auth:login'] = async ({ username, password }) => {
  const user = db.prepare('SELECT id, username, password as hash, full_name as fullName, role, school_id as schoolId, assigned_classes as assignedClasses, matricule, civility, section, gender FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(matricule) = LOWER(?)').get(username, username);
  
  if (!user) return null;
  user.full_name = user.fullName;

  // Block login if school is deleted or suspended
  if (user.role !== 'SUPERADMIN') {
      const school = db.prepare('SELECT deleted_at, is_active FROM schools WHERE id = ?').get(user.schoolId);
      if (school) {
          if (school.deleted_at !== null) {
              throw new Error("Cet établissement a été supprimé. Accès refusé.");
          }
          if (school.is_active === 0) {
              throw new Error("L'accès de cet établissement a été temporairement suspendu. Veuillez contacter l'administrateur.");
          }
      }
  }

  // Fallback for existing SHA256 passwords
  let isValid = false;
  if (user.hash.length === 64 && !user.hash.startsWith('$2a$')) {
      const oldHash = crypto.createHash('sha256').update(password).digest('hex');
      isValid = (oldHash === user.hash);
      // Auto-migrate to bcrypt
      if (isValid) {
          const newHash = bcrypt.hashSync(password, 10);
          db.prepare('UPDATE users SET password = ? WHERE id = ?').run(newHash, user.id);
      }
  } else {
      isValid = bcrypt.compareSync(password, user.hash);
  }

  if (isValid) {
      delete user.hash;
      // session is readonly here

      // Deadline notification check
      try {
          if (user.role === 'TEACHER') {
              const periodEndSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('period_end');
              if (periodEndSetting && periodEndSetting.value) {
                  const endDate = new Date(periodEndSetting.value);
                  endDate.setHours(23, 59, 59, 999);
                  const now = new Date();
                  const diffTime = endDate.getTime() - now.getTime();
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  
                  if (diffDays >= 0 && diffDays <= 3) {
                      // Only insert if not already warned today
                      const todayDateStr = now.toISOString().split('T')[0];
                      const recentNotif = db.prepare("SELECT id FROM notifications WHERE user_id = ? AND message LIKE 'Attention: Il vous reste%' AND DATE(created_at) = ?").get(user.id, todayDateStr);
                      if (!recentNotif) {
                          db.prepare(`
                              INSERT INTO notifications (school_id, user_id, message, type)
                              VALUES (?, ?, ?, ?)
                          `).run(user.schoolId, user.id, `Attention: Il vous reste ${diffDays} jour(s) pour terminer la saisie de vos notes (jusqu'au ${periodEndSetting.value}).`, 'SYSTEM');
                      }
                  }
              }
          }
      } catch (err) {
          console.error("Erreur check deadline login:", err);
      }

      return user;
  }
  return null;

};

handlers['auth:logout'] = async () => {
    // session handled by frontend clearing token now
    return true;

};

handlers['auth:switchSchool'] = async (schoolId) => {
    if ((session.getStore()?.user) && (session.getStore()?.user).role === 'SUPERADMIN') {
        (session.getStore()?.user).schoolId = schoolId;
        return true;
    }
    throw new Error('Unauthorized');
};

handlers['db:getSchools'] = async () => {
    return db.prepare('SELECT * FROM schools WHERE deleted_at IS NULL').all();
};

handlers['db:getDeletedSchools'] = async () => {
    if ((session.getStore()?.user)?.role !== 'SUPERADMIN') throw new Error('Unauthorized');
    return db.prepare('SELECT * FROM schools WHERE deleted_at IS NOT NULL').all();
};

handlers['db:addSchool'] = async (school) => {
    const { name, address, contact_email, contact_phone, bp, motto } = school;
    const info = db.prepare('INSERT INTO schools (name, address, contact_email, contact_phone, bp, motto) VALUES (?, ?, ?, ?, ?, ?)').run(name, address, contact_email, contact_phone, bp, motto);
    const newSchoolId = info.lastInsertRowid;

    const transaction = db.transaction(() => {
        // Create a default founder for this school
        const hash = bcrypt.hashSync('admin', 10);
        db.prepare('INSERT INTO users (username, password, full_name, role, school_id) VALUES (?, ?, ?, ?, ?)')
          .run(`admin_${newSchoolId}`, hash, `Fondateur ${name}`, 'FOUNDER', newSchoolId);
    });
    transaction();

    return { success: true, id: newSchoolId };

};

handlers['db:updateSchool'] = async (school) => {
    const { id, name, address, contact_email, contact_phone, bp, motto } = school;
    return db.prepare('UPDATE schools SET name = ?, address = ?, contact_email = ?, contact_phone = ?, bp = ?, motto = ? WHERE id = ?')
        .run(name, address, contact_email, contact_phone, bp, motto, id);
};

handlers['db:deleteSchool'] = async ({ id, password }) => {
    if ((session.getStore()?.user)?.role !== 'SUPERADMIN') throw new Error('Unauthorized');
    
    const superadmin = db.prepare('SELECT password FROM users WHERE id = ?').get((session.getStore()?.user).id);
    if (!superadmin) return { error: 'Utilisateur introuvable' };

    let isValid = false;
    if (superadmin.password.length === 64 && !superadmin.password.startsWith('$2a$')) {
        const oldHash = crypto.createHash('sha256').update(password).digest('hex');
        isValid = (oldHash === superadmin.password);
    } else {
        isValid = bcrypt.compareSync(password, superadmin.password);
    }

    if (!isValid) {
        return { error: 'Mot de passe incorrect' };
    }

    // Soft delete
    db.prepare("UPDATE schools SET deleted_at = datetime('now') WHERE id = ?").run(id);
    return { success: true };

};

handlers['db:restoreSchool'] = async (id) => {
    if ((session.getStore()?.user)?.role !== 'SUPERADMIN') throw new Error('Unauthorized');
    db.prepare("UPDATE schools SET deleted_at = NULL WHERE id = ?").run(id);
    return { success: true };

};

const permanentlyDeleteSchool = (id) => {
    const transaction = db.transaction(() => {
        const queries = [
            'DELETE FROM grades WHERE class_id IN (SELECT id FROM classes WHERE school_id = ?)',
            'DELETE FROM class_subjects WHERE class_id IN (SELECT id FROM classes WHERE school_id = ?)',
            'DELETE FROM grade_overrides WHERE class_id IN (SELECT id FROM classes WHERE school_id = ?)',
            'DELETE FROM class_subject_validation WHERE class_id IN (SELECT id FROM classes WHERE school_id = ?)',
            'DELETE FROM students WHERE school_id = ?',
            'DELETE FROM classes WHERE school_id = ?',
            'DELETE FROM subjects WHERE school_id = ?',
            'DELETE FROM attendance WHERE school_id = ?',
            'DELETE FROM payments WHERE school_id = ?',
            'DELETE FROM tuition_fees WHERE school_id = ?',
            'DELETE FROM school_installment_deadlines WHERE school_id = ?',
            'DELETE FROM tickets WHERE school_id = ?',
            'DELETE FROM announcements WHERE school_id = ?',
            'DELETE FROM notifications WHERE school_id = ?',
            'DELETE FROM grading_scales WHERE school_id = ?',
            'DELETE FROM archives WHERE school_id = ?',
            'DELETE FROM transport_points WHERE school_id = ?',
            'DELETE FROM report_templates WHERE school_id = ?',
            'DELETE FROM expenses WHERE school_id = ?',
            'DELETE FROM bursar_balances WHERE school_id = ?',
            'DELETE FROM users WHERE school_id = ?',
            'DELETE FROM schools WHERE id = ?'
        ];

        for (const q of queries) {
            try {
                db.prepare(q).run(id);
            } catch (err) {
                console.error(`Failed to execute: ${q}`, err);
            }
        }
    });
    transaction();
};

handlers['db:permanentlyDeleteSchool'] = async ({ id, password }) => {
    if ((session.getStore()?.user)?.role !== 'SUPERADMIN') throw new Error('Unauthorized');
    
    const superadmin = db.prepare('SELECT password FROM users WHERE id = ?').get((session.getStore()?.user).id);
    if (!superadmin) return { error: 'Utilisateur introuvable' };

    let isValid = false;
    if (superadmin.password.length === 64 && !superadmin.password.startsWith('$2a$')) {
        const oldHash = crypto.createHash('sha256').update(password).digest('hex');
        isValid = (oldHash === superadmin.password);
    } else {
        isValid = bcrypt.compareSync(password, superadmin.password);
    }

    if (!isValid) {
        return { error: 'Mot de passe incorrect' };
    }

    permanentlyDeleteSchool(id);
    return { success: true };

};

handlers['db:toggleSchoolStatus'] = async ({ id, isActive }) => {
    if ((session.getStore()?.user)?.role !== 'SUPERADMIN') throw new Error('Unauthorized');
    db.prepare('UPDATE schools SET is_active = ? WHERE id = ?').run(isActive ? 1 : 0, id);
    return { success: true };

};

handlers['db:getStudents'] = async (schoolId) => {
  const sid = getActiveSchoolId(schoolId);
  return db.prepare(`
    SELECT s.*, 
           (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE student_id = s.id AND payment_type = 'Inscription') >= COALESCE(tf.registration_fee, 0) AS has_paid_registration
    FROM students s
    LEFT JOIN tuition_fees tf ON s.class_id = tf.class_id
    WHERE s.school_id = ?
    ORDER BY s.last_name ASC, s.first_name ASC
  `).all(sid);
};

handlers['db:addStudent'] = async (student) => {
  const { firstName, lastName, birthDate, birthPlace, gender, parentName, parentContact, emergencyContact, medicalInfo, address, neighborhood, section, classId, schoolId, entryYear, scholarshipReduction, hasMoratoire } = student;
  const sid = getActiveSchoolId(schoolId);
  const parsedClassId = parseInt(classId, 10);
  const year = entryYear || new Date().getFullYear();
  const yearShort = year.toString().slice(-2);

  // Validate birthDate is N-2
  const birthYear = new Date(birthDate).getFullYear();
  if (birthYear > year - 2) {
    throw new Error(`Date de naissance non valide. L'élève doit être né au plus tard le 31 décembre de l'année ${year - 2}.`);
  }

  // Get class code
  const classObj = db.prepare('SELECT code FROM classes WHERE id = ? AND school_id = ?').get(parsedClassId, sid);
  if (!classObj) throw new Error(`Classe introuvable ou non autorisée (ClassID: ${parsedClassId}, SchoolID: ${sid})`);
  const classCode = classObj.code;

  // Generate order number securely using transaction (global per school/year)
  let matricule = '';
  let orderNumber = 1;
  
  const transaction = db.transaction(() => {
    const maxOrderRow = db.prepare("SELECT COALESCE(MAX(order_number), 0) as max_order FROM students WHERE class_id = ? AND registration_year = ?").get(parsedClassId, year);
    orderNumber = maxOrderRow.max_order + 1;
    matricule = `${yearShort}${classCode}${orderNumber.toString().padStart(3, '0')}`;

    db.prepare(`
      INSERT INTO students (matricule, registration_year, order_number, first_name, last_name, birth_date, birth_place, gender, parent_name, parent_contact, emergency_contact, medical_info, address, neighborhood, section, class_id, school_id, scholarship_reduction, has_moratoire, bus_route_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(matricule, year, orderNumber, firstName, lastName, birthDate, birthPlace, gender, parentName, parentContact, emergencyContact, medicalInfo, address || '', neighborhood || '', section, parsedClassId, sid, scholarshipReduction || 0, hasMoratoire ? 1 : 0, student.busRouteId ? parseInt(student.busRouteId, 10) : null);

    // Auto-create PARENT account
    if (parentContact && parentContact.trim()) {
      const parentUsername = parentContact.trim();
      const existingParent = db.prepare('SELECT id FROM users WHERE username = ?').get(parentUsername);
      if (!existingParent) {
        const hash = bcrypt.hashSync(parentUsername, 10);
        db.prepare('INSERT INTO users (username, password, full_name, role, school_id) VALUES (?, ?, ?, ?, ?)')
          .run(parentUsername, hash, parentName || 'Parent', 'PARENT', sid);
      }
    }
  });
      transaction();
  return { success: true, matricule };

};

handlers['db:getParentsDirectory'] = async (schoolIdParam) => {
  const schoolId = getActiveSchoolId(schoolIdParam);
  return db.prepare(`
    SELECT s.id as student_id, s.first_name, s.last_name, s.parent_name, s.parent_contact,
           c.name as class_name, c.level as cycle, c.section
    FROM students s
    LEFT JOIN classes c ON s.class_id = c.id
    WHERE s.school_id = ? AND s.parent_contact IS NOT NULL
    ORDER BY c.name, s.first_name
  `).all(schoolId);
};

handlers['db:deleteStudent'] = async (id) => {
    return db.prepare('DELETE FROM students WHERE id = ?').run(id);
};

handlers['db:getAnnouncements'] = async (schoolId) => {
  const sid = getActiveSchoolId(schoolId);
  return db.prepare(`
    SELECT a.*, u.full_name as sender_name 
    FROM announcements a 
    LEFT JOIN users u ON a.sender_id = u.id 
    WHERE a.school_id = ? 
    ORDER BY a.created_at DESC
  `).all(sid);
};

handlers['db:sendAnnouncement'] = async (announcement) => {
  const { sender_id, target, title, content, school_id } = announcement;
  const sid = getActiveSchoolId(school_id);
  
  const transaction = db.transaction(() => {
      db.prepare(`
        INSERT INTO announcements (school_id, sender_id, target, title, content) 
        VALUES (?, ?, ?, ?, ?)
      `).run(sid, sender_id, target, title, content);
      
      let usersToNotify = [];
      if (target === 'ALL') {
          usersToNotify = db.prepare("SELECT id FROM users WHERE school_id = ? AND is_active = 1 AND id != ?").all(sid, sender_id);
      } else if (target === 'PARENTS') {
          usersToNotify = db.prepare("SELECT id FROM users WHERE school_id = ? AND role = 'PARENT' AND is_active = 1 AND id != ?").all(sid, sender_id);
      } else if (target === 'STAFF') {
          usersToNotify = db.prepare("SELECT id FROM users WHERE school_id = ? AND role != 'PARENT' AND role != 'SUPERADMIN' AND is_active = 1 AND id != ?").all(sid, sender_id);
      }

      if (usersToNotify.length > 0) {
          const insertNotif = db.prepare("INSERT INTO notifications (school_id, user_id, message, type) VALUES (?, ?, ?, 'INFO')");
          for (const u of usersToNotify) {
              insertNotif.run(sid, u.id, `Nouveau communiqué : ${title}`);
          }
      }
  });
  
  transaction();
  return { success: true };
};

handlers['db:assignStudentToBus'] = async ({ studentId, routeId }) => {
    return db.prepare('UPDATE students SET bus_route_id = ? WHERE id = ?').run(routeId, studentId);
};

handlers['db:getGrades'] = async ({ classId, term }) => {
  return db.prepare('SELECT * FROM grades WHERE class_id = ? AND term = ?').all(classId, term);
};

handlers['db:saveGrades'] = async (grades) => {
  const checkLock = db.prepare('SELECT locked FROM grades WHERE student_id = ? AND subject_id = ? AND term = ? AND month = ?');
  const upsert = db.prepare(`
    INSERT INTO grades (student_id, subject_id, class_id, term, month, score, letter_score, teacher_id, locked, validated)
    VALUES (@student_id, @subject_id, @class_id, @term, @month, @score, @letter_score, @teacher_id, 0, 0)
    ON CONFLICT(student_id, subject_id, class_id, term, month) DO UPDATE SET
    score = excluded.score,
    letter_score = excluded.letter_score,
    locked = 0,
    validated = 0,
    updated_at = CURRENT_TIMESTAMP
    WHERE locked = 0
  `);

  const transaction = db.transaction((gradesList) => {
    for (const g of gradesList) {
      if (g.score == null && g.letter_score == null) continue;

      // 1. Validation de l'affectation enseignant si le rôle est TEACHER
      if (g.teacher_id) {
        const user = db.prepare('SELECT role FROM users WHERE id = ?').get(g.teacher_id);
        if (user && user.role === 'TEACHER') {
          const isAssigned = db.prepare('SELECT 1 FROM class_teacher_subjects WHERE class_id = ? AND subject_id = ? AND teacher_id = ?').get(g.class_id, g.subject_id, g.teacher_id);
          if (!isAssigned) {
            throw new Error(`Vous n'êtes pas assigné à enseigner cette matière dans cette classe.`);
          }

          // 2. Validation du délai de saisie (verrouillage automatique)
          const periodEndSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('period_end');
          if (periodEndSetting && periodEndSetting.value) {
            const endDate = new Date(periodEndSetting.value);
            endDate.setHours(23, 59, 59, 999);
            if (new Date() > endDate) {
              const override = db.prepare('SELECT deadline FROM grade_overrides WHERE teacher_id = ? AND class_id = ? AND term = ? AND month = ?').get(g.teacher_id, g.class_id, g.term, g.month);
              let hasValidOverride = false;
              if (override) {
                const overrideDate = new Date(override.deadline);
                overrideDate.setHours(23, 59, 59, 999);
                if (new Date() <= overrideDate) {
                  hasValidOverride = true;
                }
              }
              if (!hasValidOverride) {
                throw new Error(`Le délai de saisie pour cette période est dépassé (${periodEndSetting.value}).`);
              }
            }
          }
        }
      }

      const existing = checkLock.get(g.student_id, g.subject_id, g.term, g.month);
      if (existing && existing.locked === 1) throw new Error(`Note déjà verrouillée pour cet élève.`);

      // 3. Mode A auto-conversion
      const classInfo = db.prepare('SELECT grading_scale_id FROM classes WHERE id = ?').get(g.class_id);
      let letterScore = g.letter_score || null;
      let finalScore = g.score;

      if (classInfo && classInfo.grading_scale_id) {
        const scale = db.prepare('SELECT * FROM grading_scales WHERE id = ?').get(classInfo.grading_scale_id);
        if (scale) {
          const options = db.prepare('SELECT * FROM grading_scale_options WHERE scale_id = ?').all(scale.id);
          if (scale.is_numerical === 1) {
            // Mode A : teachers enter numeric grades, system maps to letter symbol
            const match = options.find(opt => finalScore >= opt.min_range && finalScore <= opt.max_range);
            if (match) {
              letterScore = match.symbol;
            }
          } else {
            // Literal scale : teacher enters or chooses letter symbol, system sets numeric equivalent for avg/rank
            if (letterScore) {
              const match = options.find(opt => opt.symbol === letterScore);
              if (match) {
                finalScore = match.numeric_equivalent;
              }
            }
          }
        }
      }

      upsert.run({
        ...g,
        score: finalScore,
        letter_score: letterScore
      });
    }
  });

  try {
    transaction(grades);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

handlers['db:unlockGrades'] = async ({ classId, term, month }) => {
  return db.prepare('UPDATE grades SET locked = 0, validated = 0 WHERE class_id = ? AND term = ? AND month = ?').run(classId, term, month);
};

handlers['db:getClassSubjectsValidationStatus'] = async ({ classId, term, month }) => {
  const parsedClassId = parseInt(classId, 10);
  const parsedTerm = parseInt(term, 10);
  const subjects = db.prepare(`
    SELECT s.id, s.name, s.domain, cs.coefficient,
           (SELECT COUNT(*) FROM grades g WHERE g.class_id = ? AND g.subject_id = s.id AND g.term = ? AND g.month = ?) as gradeCount,
           (SELECT MIN(g.locked) FROM grades g WHERE g.class_id = ? AND g.subject_id = s.id AND g.term = ? AND g.month = ?) as isLocked,
           (SELECT MIN(g.validated) FROM grades g WHERE g.class_id = ? AND g.subject_id = s.id AND g.term = ? AND g.month = ?) as isValidated
    FROM class_subjects cs
    JOIN subjects s ON cs.subject_id = s.id
    WHERE cs.class_id = ?
  `).all(parsedClassId, parsedTerm, month, parsedClassId, parsedTerm, month, parsedClassId, parsedTerm, month, parsedClassId);

  return subjects.map(s => ({
    id: s.id,
    name: s.name,
    domain: s.domain,
    coefficient: s.coefficient,
    hasGrades: s.gradeCount > 0,
    isLocked: s.isLocked === 1,
    isValidated: s.isValidated === 1
  }));
};

handlers['db:validateSubjectGrades'] = async ({ classId, subjectId, term, month }) => {
  const parsedClassId = parseInt(classId, 10);
  const parsedSubjectId = parseInt(subjectId, 10);
  const parsedTerm = parseInt(term, 10);
  return db.prepare(`
    UPDATE grades
    SET validated = 1, locked = 1
    WHERE class_id = ? AND subject_id = ? AND term = ? AND month = ?
  `).run(parsedClassId, parsedSubjectId, parsedTerm, month);
};

handlers['db:validateClassGrades'] = async ({ classId, term, month }) => {
  const parsedClassId = parseInt(classId, 10);
  const parsedTerm = parseInt(term, 10);
  return db.prepare(`
    UPDATE grades
    SET validated = 1, locked = 1
    WHERE class_id = ? AND term = ? AND month = ?
  `).run(parsedClassId, parsedTerm, month);
};

handlers['db:getPayments'] = async (schoolId) => {
  const sid = getActiveSchoolId(schoolId);
  return db.prepare(`
    SELECT p.*, s.first_name, s.last_name, s.class_id, i.name as installment_name
    FROM payments p
    JOIN students s ON p.student_id = s.id
    LEFT JOIN installments i ON p.installment_id = i.id
    WHERE s.school_id = ?
  `).all(sid);
};

handlers['db:addPayment'] = async (payment) => {
  const { studentId, amount, type, userId, installmentId, depositorName } = payment;
  const receiptNumber = `RCP-${crypto.randomUUID().slice(0,8).toUpperCase()}-${Date.now().toString().slice(-4)}`;

  if (['Inscription', 'Transport', 'Examen'].includes(type)) {
      const student = db.prepare('SELECT class_id FROM students WHERE id = ?').get(studentId);
      if (student) {
          const feeConfig = db.prepare('SELECT * FROM tuition_fees WHERE class_id = ?').get(student.class_id);
          if (feeConfig) {
              let expected = 0;
              if (type === 'Inscription') expected = feeConfig.registration_fee || 0;
              if (type === 'Transport') expected = feeConfig.transport_fee || 0;
              if (type === 'Examen') expected = feeConfig.exam_fee || 0;
              
              if (parseFloat(amount) !== expected) {
                  throw new Error(`Paiement refusé : Le montant exact pour ${type} est de ${expected} FCFA.`);
              }
          }
      }
  }

  const result = db.prepare(`
    INSERT INTO payments (student_id, amount, payment_type, received_by, receipt_number, installment_id, depositor_name)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(studentId, amount, type, userId, receiptNumber, installmentId, depositorName || '');

  if (result.changes > 0) {
      if (type === 'Transport') {
          db.prepare('UPDATE students SET has_transport = 1 WHERE id = ?').run(studentId);
      }
      return { success: true, receiptNumber };
  }
  return { success: false };

};

handlers['db:deletePayment'] = async (id) => {
    const payment = db.prepare('SELECT student_id, payment_type FROM payments WHERE id = ?').get(id);
    const result = db.prepare('DELETE FROM payments WHERE id = ?').run(id);
    if (result.changes > 0 && payment && payment.payment_type === 'Transport') {
        const otherPayments = db.prepare('SELECT COUNT(*) as count FROM payments WHERE student_id = ? AND payment_type = "Transport"').get(payment.student_id);
        if (!otherPayments || otherPayments.count === 0) {
            db.prepare('UPDATE students SET has_transport = 0 WHERE id = ?').run(payment.student_id);
        }
    }
    return result;

};

handlers['db:getTuitionFees'] = async (schoolId) => {
  const sid = getActiveSchoolId(schoolId);
  return db.prepare(`
    SELECT c.id as classId, c.name as className, COALESCE(t.total_fee, 0) as totalFee, COALESCE(t.registration_fee, 0) as registrationFee, COALESCE(t.transport_fee, 0) as transportFee, COALESCE(t.exam_fee, 0) as examFee
    FROM classes c
    LEFT JOIN tuition_fees t ON c.id = t.class_id
    WHERE c.school_id = ?
  `).all(sid);
};

handlers['db:getInstallments'] = async () => {
    return db.prepare('SELECT * FROM installments ORDER BY display_order').all();
};

handlers['db:addInstallment'] = async (name) => {
    const count = db.prepare('SELECT COUNT(*) as count FROM installments').get().count;
    return db.prepare('INSERT INTO installments (name, display_order) VALUES (?, ?)').run(name, count + 1);
};

handlers['db:deleteInstallment'] = async (id) => {
    db.prepare('DELETE FROM class_installment_fees WHERE installment_id = ?').run(id);
    return db.prepare('DELETE FROM installments WHERE id = ?').run(id);
};

handlers['db:getClassInstallmentFees'] = async (schoolId) => {
    const sid = getActiveSchoolId(schoolId);
    return db.prepare('SELECT cif.* FROM class_installment_fees cif JOIN classes c ON cif.class_id = c.id WHERE c.school_id = ?').all(sid);
};

handlers['db:updateTuitionFee'] = async ({ classId, totalFee, registrationFee, transportFee = 0, examFee = 0 }) => {
  return db.prepare(`
    INSERT INTO tuition_fees (class_id, total_fee, registration_fee, transport_fee, exam_fee)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(class_id) DO UPDATE SET total_fee = excluded.total_fee, registration_fee = excluded.registration_fee, transport_fee = excluded.transport_fee, exam_fee = excluded.exam_fee
  `).run(classId, totalFee, registrationFee, transportFee, examFee);
};

handlers['db:updateClassInstallmentFee'] = async ({ classId, installmentId, amount }) => {
    return db.prepare(`
        INSERT INTO class_installment_fees (class_id, installment_id, amount)
        VALUES (?, ?, ?)
        ON CONFLICT(class_id, installment_id) DO UPDATE SET amount = excluded.amount
    `).run(classId, installmentId, amount);
};

handlers['db:getInstallmentDeadlines'] = async (schoolId) => {
    const sid = getActiveSchoolId(schoolId);
    return db.prepare('SELECT * FROM school_installment_deadlines WHERE school_id = ?').all(sid);
};

handlers['db:saveInstallmentDeadlines'] = async ({ schoolId, deadlines }) => {
    const sid = getActiveSchoolId(schoolId);
    const stmt = db.prepare(`
        INSERT INTO school_installment_deadlines (school_id, installment_id, deadline_date)
        VALUES (?, ?, ?)
        ON CONFLICT(school_id, installment_id) DO UPDATE SET deadline_date = excluded.deadline_date
    `);
    const transaction = db.transaction((list) => {
        for (const d of list) {
            stmt.run(sid, d.installmentId, d.deadlineDate);
        }
    });
    transaction(deadlines);
    return { success: true };

};

handlers['db:notifyLateInstallments'] = async ({ schoolId, installmentId, senderId }) => {
    const sid = getActiveSchoolId(schoolId);
    
    // 1. Get the target installment name and deadline
    const installment = db.prepare('SELECT name FROM installments WHERE id = ?').get(installmentId);
    const deadlineRecord = db.prepare('SELECT deadline_date FROM school_installment_deadlines WHERE school_id = ? AND installment_id = ?').get(sid, installmentId);
    
    if (!installment || !deadlineRecord || !deadlineRecord.deadline_date) {
        return { success: false, error: 'Échéance non configurée pour cette tranche.' };
    }

    // 2. Find students who haven't fully paid this installment
    // Note: payments table has installment_id OR payment_type = 'Scolarité'.
    // In our current schema, we check total paid for "Scolarité" vs required per class.
    // However, to be simple, we can check payments specifically linked to this installment_id.
    const lateStudents = db.prepare(`
        SELECT s.id, s.first_name, s.parent_contact, cif.amount as required_amount,
               COALESCE((SELECT SUM(amount) FROM payments p WHERE p.student_id = s.id AND p.installment_id = ? AND p.payment_type = 'Scolarité'), 0) as paid_amount
        FROM students s
        JOIN class_installment_fees cif ON s.class_id = cif.class_id AND cif.installment_id = ?
        WHERE s.school_id = ?
    `).all(installmentId, installmentId, sid);

    let notifiedCount = 0;
    const notifyStmt = db.prepare(`
        INSERT INTO announcements (school_id, sender_id, target, title, content) 
        VALUES (?, ?, 'PARENTS', 'Alerte Échéance Scolarité', ?)
    `);

    for (const student of lateStudents) {
        if (student.paid_amount < student.required_amount) {
            const msg = `⚠️ Rappel Important : Le délai pour le paiement de la ${installment.name} approche (${deadlineRecord.deadline_date}). Le montant attendu est de ${student.required_amount} FCFA, dont ${student.paid_amount} FCFA ont été versés. Veuillez régulariser la situation de votre enfant ${student.first_name} dans les plus brefs délais.`;
            notifyStmt.run(sid, senderId, msg);
            notifiedCount++;
        }
    }

    return { success: true, notifiedCount };

};

handlers['db:getGlobalSubjects'] = async () => {
  return db.prepare('SELECT * FROM subjects').all();
};

handlers['db:addGlobalSubject'] = async (subject) => {
  const { name, domain, level, section } = subject;
  const existing = db.prepare('SELECT id FROM subjects WHERE UPPER(name) = UPPER(?)').get(name);
  if (existing) {
    throw new Error('Une matière avec ce nom exact existe déjà. Les noms doivent être uniques.');
  }

  const activeUser = session.getStore()?.user;
  if (activeUser && activeUser.schoolId && activeUser.role !== 'SUPERADMIN') {
    const school = db.prepare('SELECT requires_subject_code FROM schools WHERE id = ?').get(activeUser.schoolId);
    if (school && school.requires_subject_code === 1) {
      const activation_code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const result = db.prepare(`
        INSERT INTO pending_subjects (school_id, name, domain, level, section, activation_code, status)
        VALUES (?, ?, ?, ?, ?, ?, 'PENDING')
      `).run(activeUser.schoolId, name, domain, level, section, activation_code);

      const reqData = JSON.stringify({
        pending_id: result.lastInsertRowid,
        school_id: activeUser.schoolId,
        name,
        domain,
        level,
        section
      });

      // Send the code to the DEVELOPER (school_id NULL) so the founder doesn't see it!
      db.prepare(`
        INSERT INTO notifications (school_id, message, type, request_type, request_data, action_status)
        VALUES (NULL, ?, 'INFO', 'SUBJECT_ACTIVATION', ?, 'PENDING')
      `).run(`Demande de création de la matière '${name}' par l'école ID ${activeUser.schoolId}. Code généré à leur transmettre : ${activation_code}`, reqData);

      return { pending: true, pendingId: result.lastInsertRowid, message: "La matière a été soumise pour validation. Veuillez entrer le code fourni par le développeur." };
    }
  }

  const result = db.prepare('INSERT INTO subjects (name, domain, level, section) VALUES (?, ?, ?, ?)')
    .run(name, domain, level, section);
  
  if (activeUser && activeUser.schoolId && activeUser.role !== 'SUPERADMIN') {
    db.prepare('INSERT OR IGNORE INTO school_subjects (school_id, subject_id, is_active) VALUES (?, ?, 1)')
      .run(activeUser.schoolId, result.lastInsertRowid);
  }
  return result;
};

handlers['db:validateSubjectCode'] = async ({ pendingId, code }) => {
  const pending = db.prepare('SELECT * FROM pending_subjects WHERE id = ?').get(pendingId);
  if (!pending) {
    throw new Error("Demande de création de matière introuvable.");
  }
  if (pending.status === 'APPROVED') {
    throw new Error("Cette matière a déjà été activée.");
  }
  if (pending.activation_code !== code) {
    db.prepare("UPDATE pending_subjects SET status = 'FAILED' WHERE id = ?").run(pendingId);
    throw new Error("Code de validation incorrect.");
  }

  const tx = db.transaction(() => {
    const existing = db.prepare('SELECT id FROM subjects WHERE UPPER(name) = UPPER(?)').get(pending.name);
    let subjectId;
    if (existing) {
      subjectId = existing.id;
    } else {
      const insertSubj = db.prepare('INSERT INTO subjects (name, domain, level, section) VALUES (?, ?, ?, ?)')
        .run(pending.name, pending.domain, pending.level, pending.section);
      subjectId = insertSubj.lastInsertRowid;
    }

    db.prepare('INSERT OR IGNORE INTO school_subjects (school_id, subject_id, is_active) VALUES (?, ?, 1)')
      .run(pending.school_id, subjectId);

    db.prepare("UPDATE pending_subjects SET status = 'APPROVED' WHERE id = ?").run(pendingId);

    const notifs = db.prepare("SELECT id, request_data FROM notifications WHERE request_type = 'SUBJECT_ACTIVATION' AND action_status = 'PENDING'").all();
    for (const n of notifs) {
      try {
        const data = JSON.parse(n.request_data);
        if (data && parseInt(data.pending_id, 10) === parseInt(pendingId, 10)) {
          db.prepare("UPDATE notifications SET action_status = 'APPROVED' WHERE id = ?").run(n.id);
        }
      } catch (e) {}
    }
  });

  tx();
  return { success: true };
};

handlers['db:resendSubjectCode'] = async (pendingId) => {
  const pending = db.prepare("SELECT * FROM pending_subjects WHERE id = ?").get(pendingId);
  if (!pending) throw new Error("Demande introuvable.");
  
  const activation_code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const tx = db.transaction(() => {
    db.prepare("UPDATE pending_subjects SET status = 'PENDING', activation_code = ? WHERE id = ?").run(activation_code, pendingId);
    
    const reqData = JSON.stringify({
      pending_id: pending.id,
      school_id: pending.school_id,
      name: pending.name,
      domain: pending.domain,
      level: pending.level,
      section: pending.section
    });

    db.prepare(`
      INSERT INTO notifications (school_id, message, type, request_type, request_data, action_status)
      VALUES (?, ?, 'ACTION_REQUIRED', 'SUBJECT_ACTIVATION', ?, 'PENDING')
    `).run(pending.school_id, `[NOUVELLE TENTATIVE] L'école souhaite créer la matière '${pending.name}'. Nouveau code requis : ${activation_code}.`, reqData);
  });
  tx();
  return { success: true };
};

handlers['db:getPendingSubjects'] = async (schoolId) => {
  const sid = getActiveSchoolId(schoolId);
  return db.prepare("SELECT * FROM pending_subjects WHERE school_id = ? AND status IN ('PENDING', 'FAILED')").all(sid);
};

handlers['db:updateGlobalSubject'] = async (subject) => {
  const { id, name, domain, level, section } = subject;
  const existing = db.prepare('SELECT id FROM subjects WHERE UPPER(name) = UPPER(?) AND id != ?').get(name, id);
  if (existing) {
    throw new Error('Une matière avec ce nom exact existe déjà. Les noms doivent être uniques.');
  }

  return db.prepare('UPDATE subjects SET name = ?, domain = ?, level = ?, section = ? WHERE id = ?')
    .run(name, domain, level, section, id);
};

handlers['db:deleteGlobalSubject'] = async (id) => {
  db.transaction((subjectId) => {
    db.prepare('DELETE FROM grades WHERE subject_id = ?').run(subjectId);
    db.prepare('DELETE FROM class_subjects WHERE subject_id = ?').run(subjectId);
    db.prepare('DELETE FROM school_subjects WHERE subject_id = ?').run(subjectId);
    db.prepare('DELETE FROM schedules WHERE subject_id = ?').run(subjectId);
    db.prepare('DELETE FROM subjects WHERE id = ?').run(subjectId);
  })(id);
  return true;

};

handlers['db:getSchoolSubjects'] = async (schoolId) => {
  const sid = getActiveSchoolId(schoolId);
  // Use LEFT JOIN to ensure we see all subjects even if not yet mapped to this school
  return db.prepare(`
    SELECT s.*, COALESCE(ss.is_active, 0) as is_active
    FROM subjects s
    LEFT JOIN school_subjects ss ON s.id = ss.subject_id AND ss.school_id = ?
  `).all(sid);
};

handlers['db:toggleSchoolSubject'] = async ({ schoolId, subjectId, isActive }) => {
  const result = db.prepare(`
    INSERT INTO school_subjects (school_id, subject_id, is_active)
    VALUES (?, ?, ?)
    ON CONFLICT(school_id, subject_id) DO UPDATE SET is_active = excluded.is_active
  `).run(schoolId, subjectId, isActive ? 1 : 0);

  if (isActive) {
    const subject = db.prepare('SELECT name, level, section FROM subjects WHERE id = ?').get(subjectId);
    if (subject) {
      db.prepare(`
        INSERT INTO announcements (school_id, sender_id, target, title, content)
        VALUES (?, ?, 'STAFF', 'Nouvelle Matière Autorisée', ?)
      `).run(
        schoolId,
        (session.getStore()?.user) ? (session.getStore()?.user).id : null,
        `La matière globale "${subject.name}" (${subject.level} - ${subject.section}) a été autorisée pour votre établissement. Vous pouvez dès à présent l'associer à vos classes.`
      );
    }
  }

  return result;

};

handlers['db:getClassSubjects'] = async (classId) => {
  return db.prepare(`
    SELECT s.*, cs.coefficient, cs.is_optional
    FROM subjects s
    JOIN class_subjects cs ON s.id = cs.subject_id
    WHERE cs.class_id = ?
  `).all(classId);
};

handlers['db:assignSubjectToClass'] = async ({ classId, subjectId, coefficient, isOptional }) => {
  return db.prepare(`
    INSERT INTO class_subjects (class_id, subject_id, coefficient, is_optional)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(class_id, subject_id) DO UPDATE SET
      coefficient = excluded.coefficient,
      is_optional = excluded.is_optional
  `).run(classId, subjectId, coefficient || 1, isOptional ? 1 : 0);
};

handlers['db:removeSubjectFromClass'] = async ({ classId, subjectId }) => {
  return db.prepare('DELETE FROM class_subjects WHERE class_id = ? AND subject_id = ?')
    .run(classId, subjectId);
};

handlers['db:getClasses'] = async (schoolId) => {
  const sid = getActiveSchoolId(schoolId);
  return db.prepare('SELECT * FROM classes WHERE school_id = ?').all(sid);
};

handlers['db:addClass'] = async (classData) => {
    const { name, code, section, level, mainTeacherId, assistantTeacherId, schoolId, baseClassId } = classData;
    const sid = getActiveSchoolId(schoolId);
    
    let newClassId;
    db.transaction(() => {
        const info = db.prepare(`
            INSERT INTO classes (school_id, name, code, section, level, main_teacher_id, assistant_teacher_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(sid, name, code, section, level, mainTeacherId || null, assistantTeacherId || null);

        newClassId = info.lastInsertRowid;

        // Sync teacher's assigned_classes
        const updateTeacherAssignedClasses = (teacherId, classId) => {
            if (!teacherId) return;
            const teacher = db.prepare('SELECT assigned_classes FROM users WHERE id = ?').get(teacherId);
            let teacherClasses = [];
            if (teacher && teacher.assigned_classes) {
                try { teacherClasses = JSON.parse(teacher.assigned_classes); } catch(e) {}
            }
            if (!Array.isArray(teacherClasses)) teacherClasses = [];
            if (!teacherClasses.includes(classId) && !teacherClasses.includes(String(classId))) {
                teacherClasses.push(Number(classId));
            }
            db.prepare('UPDATE users SET assigned_classes = ? WHERE id = ?').run(JSON.stringify(teacherClasses), teacherId);
        };

        if (mainTeacherId) updateTeacherAssignedClasses(mainTeacherId, newClassId);
        if (assistantTeacherId) updateTeacherAssignedClasses(assistantTeacherId, newClassId);

        if (baseClassId) {
            // Duplicate class subjects
            const subjectsToCopy = db.prepare('SELECT subject_id, coefficient, is_optional FROM class_subjects WHERE class_id = ?').all(baseClassId);
            const insertSubject = db.prepare('INSERT INTO class_subjects (class_id, subject_id, coefficient, is_optional) VALUES (?, ?, ?, ?)');
            for (const sub of subjectsToCopy) {
                insertSubject.run(newClassId, sub.subject_id, sub.coefficient, sub.is_optional);
            }

            // Duplicate tuition_fees
            const tuitionToCopy = db.prepare('SELECT total_fee, registration_fee FROM tuition_fees WHERE class_id = ?').get(baseClassId);
            if (tuitionToCopy) {
                db.prepare('INSERT INTO tuition_fees (class_id, total_fee, registration_fee) VALUES (?, ?, ?)').run(newClassId, tuitionToCopy.total_fee, tuitionToCopy.registration_fee);
            }

            // Duplicate class_installment_fees
            const installmentsToCopy = db.prepare('SELECT installment_id, amount FROM class_installment_fees WHERE class_id = ?').all(baseClassId);
            const insertInstallment = db.prepare('INSERT INTO class_installment_fees (class_id, installment_id, amount) VALUES (?, ?, ?)');
            for (const inst of installmentsToCopy) {
                insertInstallment.run(newClassId, inst.installment_id, inst.amount);
            }
        }
    })();

    return { success: true, id: newClassId };

};

handlers['db:updateClass'] = async (classData) => {
    const { id, name, code, section, level, mainTeacherId, assistantTeacherId } = classData;
    
    db.transaction(() => {
        // Find previous teachers of this class
        const prevClass = db.prepare('SELECT main_teacher_id, assistant_teacher_id FROM classes WHERE id = ?').get(id);
        const prevTeacherId = prevClass ? prevClass.main_teacher_id : null;
        const prevAssistantId = prevClass ? prevClass.assistant_teacher_id : null;

        const updateTeacherAssignedClasses = (teacherId, removeClassId, addClassId) => {
            if (!teacherId) return;
            const teacher = db.prepare('SELECT assigned_classes FROM users WHERE id = ?').get(teacherId);
            let classesArr = [];
            if (teacher && teacher.assigned_classes) {
                try { classesArr = JSON.parse(teacher.assigned_classes); } catch(e) {}
            }
            if (!Array.isArray(classesArr)) classesArr = [];
            
            if (removeClassId) {
                classesArr = classesArr.filter(cid => Number(cid) !== Number(removeClassId));
            }
            if (addClassId) {
                if (!classesArr.includes(Number(addClassId)) && !classesArr.includes(String(addClassId))) {
                    classesArr.push(Number(addClassId));
                }
            }
            db.prepare('UPDATE users SET assigned_classes = ? WHERE id = ?').run(JSON.stringify(classesArr), teacherId);
        };

        // If main teacher is different
        if (mainTeacherId !== prevTeacherId) {
            updateTeacherAssignedClasses(prevTeacherId, id, null); // Remove from old
            updateTeacherAssignedClasses(mainTeacherId, null, id); // Add to new
        }

        // If assistant teacher is different
        if (assistantTeacherId !== prevAssistantId) {
            updateTeacherAssignedClasses(prevAssistantId, id, null); // Remove from old
            updateTeacherAssignedClasses(assistantTeacherId, null, id); // Add to new
        }

        db.prepare(`
            UPDATE classes 
            SET name = ?, code = ?, section = ?, level = ?, main_teacher_id = ?, assistant_teacher_id = ?
            WHERE id = ?
        `).run(name, code, section, level, mainTeacherId || null, assistantTeacherId || null, id);
    })();
    
    return { success: true };

};

handlers['db:deleteClass'] = async (classId) => {
    // Prevent deletion if students are assigned
    const studentCount = db.prepare('SELECT COUNT(*) as count FROM students WHERE class_id = ?').get(classId).count;
    if (studentCount > 0) {
        throw new Error('Impossible de supprimer cette classe car des élèves y sont inscrits.');
    }

    db.transaction(() => {
        db.prepare('DELETE FROM class_subjects WHERE class_id = ?').run(classId);
        db.prepare('DELETE FROM tuition_fees WHERE class_id = ?').run(classId);
        db.prepare('DELETE FROM class_installment_fees WHERE class_id = ?').run(classId);
        db.prepare('DELETE FROM schedules WHERE class_id = ?').run(classId);
        db.prepare('DELETE FROM grades WHERE class_id = ?').run(classId);

        // Find teachers who had this class assigned and remove it
        const teachers = db.prepare("SELECT id, assigned_classes FROM users WHERE role = 'TEACHER' AND assigned_classes LIKE ?").all(`%${classId}%`);
        for (const t of teachers) {
            try {
                let parsed = JSON.parse(t.assigned_classes);
                if (Array.isArray(parsed)) {
                    parsed = parsed.filter(cid => Number(cid) !== Number(classId));
                    db.prepare('UPDATE users SET assigned_classes = ? WHERE id = ?').run(JSON.stringify(parsed), t.id);
                }
            } catch(e) {}
        }

        db.prepare('DELETE FROM classes WHERE id = ?').run(classId);
    })();

    return { success: true };

};

handlers['db:getSchedules'] = async (schoolId) => {
    const sid = getActiveSchoolId(schoolId);
    return db.prepare('SELECT * FROM schedules WHERE school_id = ?').all(sid);
};

handlers['db:updateSchedule'] = async (schedule) => {
    const { id, class_id, teacher_id, subject_id, day_of_week, start_time, end_time, type, school_id } = schedule;
    const sid = getActiveSchoolId(school_id);
    if (id) {
        return db.prepare(`UPDATE schedules SET class_id=?, teacher_id=?, subject_id=?, day_of_week=?, start_time=?, end_time=?, type=? WHERE id=?`).run(class_id, teacher_id, subject_id, day_of_week, start_time, end_time, type, id);
    } else {
        return db.prepare(`INSERT INTO schedules (class_id, teacher_id, subject_id, day_of_week, start_time, end_time, type, school_id) VALUES (?,?,?,?,?,?,?,?)`).run(class_id, teacher_id, subject_id, day_of_week, start_time, end_time, type, sid);
    }

};

handlers['db:deleteSchedule'] = async (id) => {
    return db.prepare('DELETE FROM schedules WHERE id = ?').run(id);
};

handlers['db:getEvaluationSchedules'] = async (schoolId) => {
    const sid = getActiveSchoolId(schoolId);
    return db.prepare('SELECT * FROM evaluation_schedules WHERE school_id = ?').all(sid);
};

handlers['db:addEvaluationSchedule'] = async (schedule) => {
    const { school_id, class_id, subject_id, teacher_id, evaluation_period_id, date, start_time, end_time } = schedule;
    const sid = getActiveSchoolId(school_id);
    return db.prepare(`INSERT INTO evaluation_schedules (school_id, class_id, subject_id, teacher_id, evaluation_period_id, date, start_time, end_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(sid, class_id, subject_id, teacher_id, evaluation_period_id, date, start_time, end_time);
};

handlers['db:deleteEvaluationSchedule'] = async (id) => {
    return db.prepare('DELETE FROM evaluation_schedules WHERE id = ?').run(id);
};

handlers['db:getBusRoutes'] = async (schoolId) => {
    const sid = getActiveSchoolId(schoolId);
    return db.prepare('SELECT * FROM bus_routes WHERE school_id = ?').all(sid);
};

handlers['db:addBusRoute'] = async ({ name, bus_number, driver_id, schoolId }) => {
    const sid = getActiveSchoolId(schoolId);
    return db.prepare('INSERT INTO bus_routes (name, bus_number, driver_id, school_id) VALUES (?, ?, ?, ?)').run(name, bus_number, driver_id, sid);
};

handlers['db:addTransportPoint'] = async ({ routeId, name, latitude, longitude, estimatedTime }) => {
    return db.prepare('INSERT INTO transport_points (route_id, name, latitude, longitude, estimated_time_from_start) VALUES (?, ?, ?, ?, ?)').run(routeId, name, latitude, longitude, estimatedTime);
};

handlers['db:deleteTransportPoint'] = async (pointId) => {
    return db.prepare('DELETE FROM transport_points WHERE id = ?').run(pointId);
};

handlers['db:getTransportPoints'] = async (routeId) => {
    if (!routeId) return [];
    return db.prepare('SELECT * FROM transport_points WHERE route_id = ? ORDER BY estimated_time_from_start').all(routeId);
};

handlers['db:getRouteStudents'] = async (routeId) => {
    // Only fetch students who have made a transport payment, sorted by class
    return db.prepare(`
        SELECT s.*, c.name as class_name
        FROM students s
        JOIN classes c ON s.class_id = c.id
        WHERE s.bus_route_id = ? AND EXISTS (
            SELECT 1 FROM payments p 
            WHERE p.student_id = s.id AND p.payment_type = 'Transport'
        )
        ORDER BY c.name ASC, s.last_name ASC
    `).all(routeId);
};

handlers['db:getTransportEligibleStudents'] = async (schoolId) => {
    const sid = getActiveSchoolId(schoolId);
    return db.prepare(`
        SELECT s.*, c.name as class_name, c.level as level, c.section as section
        FROM students s
        JOIN classes c ON s.class_id = c.id
        WHERE s.school_id = ? 
        AND s.transport_point_id IS NULL
        AND EXISTS (
            SELECT 1 FROM payments p 
            WHERE p.student_id = s.id AND p.payment_type = 'Transport' AND p.amount > 0
        )
        ORDER BY c.name ASC, s.last_name ASC
    `).all(sid);
};

handlers['db:assignStudentToTransportPoint'] = async ({ studentId, pointId, routeId }) => {
    // 1. Assign in DB
    db.prepare('UPDATE students SET bus_route_id = ?, transport_point_id = ? WHERE id = ?').run(routeId, pointId, studentId);
    
    // 2. Fetch point details
    const point = db.prepare('SELECT name, latitude, longitude, estimated_time_from_start FROM transport_points WHERE id = ?').get(pointId);
    if (!point) return { success: false, error: 'Point introuvable' };

    // 3. Create announcement for parent
    const student = db.prepare('SELECT parent_contact, first_name FROM students WHERE id = ?').get(studentId);
    if (student && student.parent_contact) {
        const parentUser = db.prepare('SELECT id FROM users WHERE username = ?').get(student.parent_contact.trim());
        if (parentUser) {
            const mapLink = (point.latitude && point.longitude && point.latitude !== 0) ? `https://www.google.com/maps?q=${point.latitude},${point.longitude}` : '';
            const msg = `🚌 **Abonnement Transport Validé**\n\nVotre enfant ${student.first_name} a été assigné au point de ramassage : **${point.name}**.\nLe bus passera approximativement à **+${point.estimated_time_from_start} minutes** après le départ de la tournée.\n\n${mapLink ? `📍 [Voir sur Google Maps](${mapLink})` : ''}`;
            
            db.prepare('INSERT INTO tickets (school_id, sender_id, receiver_id, receiver_role, subject, message) VALUES (?, ?, ?, ?, ?, ?)')
              .run(getActiveSchoolId(), (session.getStore()?.user)?.id || 1, parentUser.id, 'PARENT', 'Info Transport', msg);
        }
    }
    return { success: true };

};

handlers['db:getParentStudents'] = async (parentPhone) => {
    return db.prepare('SELECT * FROM students WHERE parent_contact = ?').all(parentPhone);
};

handlers['db:logTransport'] = async (log) => {
    const { route_id, event_type, latitude, longitude } = log;
    return db.prepare(`INSERT INTO transport_logs (route_id, event_type, latitude, longitude) VALUES (?, ?, ?, ?)`).run(route_id, event_type, latitude, longitude);
};

handlers['db:logTransportAttendance'] = async ({ studentId, routeId, direction, status, recordedBy }) => {
    const existing = db.prepare(`
        SELECT id FROM transport_attendance 
        WHERE student_id = ? AND route_id = ? AND date = date('now') AND direction = ?
    `).get(studentId, routeId, direction);

    let res;
    if (existing) {
        res = db.prepare(`
            UPDATE transport_attendance 
            SET status = ?, recorded_by = ?, recorded_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(status, recordedBy, existing.id);
    } else {
        res = db.prepare(`
            INSERT INTO transport_attendance (student_id, route_id, date, direction, status, recorded_by)
            VALUES (?, ?, date('now'), ?, ?, ?)
        `).run(studentId, routeId, direction, status, recordedBy);
    }

    if (status === 'PRESENT') {
        const student = db.prepare('SELECT first_name, school_id FROM students WHERE id = ?').get(studentId);
        if (student) {
            const msg = `🚌 Votre enfant ${student.first_name} est bien à bord du bus scolaire.`;
            db.prepare(`
                INSERT INTO announcements (school_id, sender_id, target, title, content) 
                VALUES (?, ?, 'PARENTS', 'Appel Bus Scolaire', ?)
            `).run(student.school_id, recordedBy, msg);
        }
    }
    return res;
};

handlers['db:notifyTransportProximity'] = async ({ pointId, driverId }) => {
    const point = db.prepare('SELECT name, route_id FROM transport_points WHERE id = ?').get(pointId);
    if (!point) return false;
    
    // Find all students assigned to this point
    const students = db.prepare('SELECT first_name, school_id FROM students WHERE transport_point_id = ?').all(pointId);
    
    let sentCount = 0;
    for (const student of students) {
        const msg = `📍 Alerte Proximité : Le bus scolaire est bientôt au point de ramassage "${point.name}" pour ${student.first_name}. Veuillez vous préparer !`;
        db.prepare(`
            INSERT INTO announcements (school_id, sender_id, target, title, content) 
            VALUES (?, ?, 'PARENTS', 'Alerte Bus', ?)
        `).run(student.school_id, driverId, msg);
        sentCount++;
    }
    return { success: true, notified: sentCount };

};

handlers['db:getMobileKeys'] = async () => {
    return db.prepare('SELECT * FROM mobile_access_keys').all();
};

handlers['db:generateMobileKey'] = async ({ name, userId }) => {
    const key = `KEY-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    return db.prepare('INSERT INTO mobile_access_keys (access_key, assigned_to_name, assigned_to_user_id) VALUES (?, ?, ?)')
        .run(key, name, userId);
};

handlers['db:deleteMobileKey'] = async (keyId) => {
    return db.prepare('DELETE FROM mobile_access_keys WHERE id = ?').run(keyId);
};

handlers['db:getSetting'] = async (key) => {
  const res = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return res ? res.value : null;

};

handlers['db:setSetting'] = async ({ key, value }) => {
  return db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value);
};

handlers['db:saveAttendanceBulk'] = async ({ records, userId }) => {
    const upsert = db.prepare(`
        INSERT INTO attendance (student_id, date, status, hours_absent, recorded_by, schedule_id)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(student_id, date, schedule_id) DO UPDATE SET
            status = excluded.status,
            hours_absent = excluded.hours_absent,
            recorded_by = excluded.recorded_by
    `);
    
    const exceeders = [];
    
    const transaction = db.transaction(() => {
        for (const r of records) {
            const status = r.hours > 0 ? 'ABSENT' : 'PRESENT';
            
            // Get previous total to avoid spamming (only notify when crossing the 15h threshold)
            const prevTotal = db.prepare('SELECT COALESCE(SUM(hours_absent), 0) as total FROM attendance WHERE student_id = ?').get(r.studentId).total;
            
            const schedId = r.scheduleId ? parseInt(r.scheduleId) : 0;
            upsert.run(r.studentId, r.date, status, r.hours, userId, schedId);
            
            const newTotal = db.prepare('SELECT COALESCE(SUM(hours_absent), 0) as total FROM attendance WHERE student_id = ?').get(r.studentId).total;
            
            if (newTotal >= 15 && prevTotal < 15) {
                const student = db.prepare('SELECT first_name, last_name, parent_contact, school_id FROM students WHERE id = ?').get(r.studentId);
                if (student) {
                    exceeders.push({ studentId: r.studentId, firstName: student.first_name, lastName: student.last_name, total: newTotal });
                    
                    // Find parent user
                    if (student.parent_contact) {
                        const parentUser = db.prepare('SELECT id FROM users WHERE username = ?').get(student.parent_contact.trim());
                        if (parentUser) {
                            const message = `URGENT - CONVOCATION PARENTALE : Votre enfant ${student.first_name} ${student.last_name} a cumulé ${newTotal} heures d'absence non justifiées. Veuillez vous présenter à la direction de l'école dans les plus brefs délais.`;
                            db.prepare('INSERT INTO tickets (sender_id, receiver_id, receiver_role, subject, message, school_id) VALUES (?, ?, ?, ?, ?, ?)').run(userId, parentUser.id, 'PARENT', 'CONVOCATION PARENTALE', message, student.school_id);
                        }
                    }
                }
            }
        }
    });

    try {
        transaction();
        return { success: true, exceeders };
    } catch (err) {
        return { success: false, error: err.message };
    }

};

handlers['db:getAttendance'] = async ({ classId, date, scheduleId }) => {
    if (scheduleId !== undefined && scheduleId !== null && scheduleId !== '') {
        return db.prepare(`
          SELECT a.*, s.first_name, s.last_name
          FROM attendance a
          JOIN students s ON a.student_id = s.id
          WHERE s.class_id = ? AND a.date = ? AND a.schedule_id = ?
        `).all(classId, date, scheduleId);
    } else {
        return db.prepare(`
          SELECT a.*, s.first_name, s.last_name
          FROM attendance a
          JOIN students s ON a.student_id = s.id
          WHERE s.class_id = ? AND a.date = ? AND (a.schedule_id = 0 OR a.schedule_id IS NULL)
        `).all(classId, date);
    }
};

handlers['db:getAttendanceReport'] = async ({ classId, startDate, endDate }) => {
    // Return all schedules summed per student, per date
    return db.prepare(`
      SELECT a.student_id, a.date, s.first_name, s.last_name, s.matricule, SUM(a.hours_absent) as hours_absent
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      WHERE s.class_id = ? AND a.date >= ? AND a.date <= ?
      GROUP BY a.student_id, a.date
    `).all(classId, startDate, endDate);
};

handlers['db:getUsers'] = async (schoolId) => {
  const sid = getActiveSchoolId(schoolId);
  const users = db.prepare('SELECT id, username, full_name as fullName, role, assigned_classes as assignedClasses, matricule, civility, section, gender, phone, is_active FROM users WHERE school_id = ?').all(sid);
  return users.map(u => ({ ...u, full_name: u.fullName }));
};

handlers['db:addUser'] = async (user) => {
  const { username, password, fullName, role, schoolId, assignedClasses, civility, section, gender, phone, classRole } = user;
  const sid = getActiveSchoolId(schoolId);
  
  const existingUsername = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existingUsername) {
      throw new Error("Ce nom d'utilisateur est déjà utilisé");
  }

  const hash = bcrypt.hashSync(password, 10);
  
  // Auto-generate staff matricule (incremental and duplicate-safe)
  const yearShort = new Date().getFullYear().toString().slice(-2);
  const roleCodes = {
      TEACHER: 'ENS',
      DRIVER: 'CHF',
      BURSAR: 'ECO',
      SECRETARY: 'SG',
      DIRECTOR: 'DIR',
      FOUNDER: 'FND'
  };
  const roleCode = roleCodes[role] || 'STF';
  
  const pattern = `${yearShort}${roleCode}%`;
  const existingUsers = db.prepare("SELECT matricule FROM users WHERE school_id = ? AND role = ? AND matricule LIKE ?").all(sid, role, pattern);
  let maxOrder = 0;
  for (const u of existingUsers) {
      if (u.matricule) {
          const suffix = parseInt(u.matricule.slice(5)); // after Year(2) + RoleCode(3)
          if (!isNaN(suffix) && suffix > maxOrder) {
              maxOrder = suffix;
          }
      }
  }
  const order = maxOrder + 1;
  const matricule = `${yearShort}${roleCode}${order.toString().padStart(4, '0')}`;

  const transaction = db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO users (username, password, full_name, role, school_id, assigned_classes, matricule, civility, section, gender, phone)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(username, hash, fullName, role, sid, JSON.stringify(assignedClasses || []), matricule, civility, section, gender, phone || null);
    
    if (role === 'TEACHER' && assignedClasses && assignedClasses.length > 0) {
        if (classRole === 'ASSISTANT') {
            db.prepare('UPDATE classes SET assistant_teacher_id = ? WHERE id IN (' + assignedClasses.map(() => '?').join(',') + ')').run(result.lastInsertRowid, ...assignedClasses);
        } else {
            db.prepare('UPDATE classes SET main_teacher_id = ? WHERE id IN (' + assignedClasses.map(() => '?').join(',') + ')').run(result.lastInsertRowid, ...assignedClasses);
        }
    }
  });
  transaction();
  
  return { success: true, matricule };

};

handlers['db:deleteUser'] = async (id) => {
  // Check if user is linked to grades
  const gradesCount = db.prepare('SELECT COUNT(*) as count FROM grades WHERE teacher_id = ?').get(id).count;
  if (gradesCount > 0) throw new Error('Impossible de supprimer cet utilisateur : des notes lui sont associées. Veuillez désactiver le compte.');

  // Check if user is linked to payments
  const paymentsCount = db.prepare('SELECT COUNT(*) as count FROM payments WHERE received_by = ?').get(id).count;
  if (paymentsCount > 0) throw new Error('Impossible de supprimer cet utilisateur : des paiements lui sont associés. Veuillez désactiver le compte.');

  // Check if user is linked to attendance
  const attendanceCount = db.prepare('SELECT COUNT(*) as count FROM attendance WHERE recorded_by = ?').get(id).count;
  if (attendanceCount > 0) throw new Error('Impossible de supprimer cet utilisateur : des présences lui sont associées. Veuillez désactiver le compte.');

  // Verify if user is main teacher of any class
  const mainTeacherClasses = db.prepare('SELECT name FROM classes WHERE main_teacher_id = ?').all(id);
  if (mainTeacherClasses.length > 0) {
      const classNames = mainTeacherClasses.map(c => c.name).join(', ');
      throw new Error(`Mesure de sécurité : Impossible de supprimer ce compte car il est Titulaire des classes suivantes : ${classNames}. Veuillez d'abord affecter un autre titulaire à ces classes.`);
  }

  // Assistant teacher can be safely removed from their class
  db.prepare('UPDATE classes SET assistant_teacher_id = NULL WHERE assistant_teacher_id = ?').run(id);

  return db.prepare('DELETE FROM users WHERE id = ?').run(id);
};

handlers['db:toggleUserActive'] = async ({ id, isActive }) => {
    return db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(isActive ? 1 : 0, id);
};

handlers['db:updateUser'] = async (userToUpdate) => {
  const { id, username, fullName, role, phone, assignedClasses, civility, section, gender, password, classRole } = userToUpdate;
  if (!id) throw new Error("ID de l'utilisateur requis");

  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!existing) throw new Error("Utilisateur introuvable");

  // Check username uniqueness if changed
  if (username && username !== existing.username) {
      const taken = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, id);
      if (taken) throw new Error("Ce nom d'utilisateur est déjà utilisé par un autre compte");
  }

  const finalUsername = username || existing.username;
  const finalFullName = fullName || existing.full_name;
  const finalRole = role || existing.role;
  const finalPhone = phone !== undefined ? phone : existing.phone;
  const finalAssignedClasses = assignedClasses !== undefined ? JSON.stringify(assignedClasses) : existing.assigned_classes;
  const finalCivility = civility || existing.civility;
  const finalSection = section || existing.section;
  const finalGender = gender || existing.gender;

  const transaction = db.transaction(() => {
    if (password && password.trim()) {
        const hash = bcrypt.hashSync(password.trim(), 10);
        db.prepare(`
          UPDATE users SET 
            username = ?, full_name = ?, role = ?, phone = ?, assigned_classes = ?, civility = ?, section = ?, gender = ?, password = ? 
          WHERE id = ?
        `).run(finalUsername, finalFullName, finalRole, finalPhone, finalAssignedClasses, finalCivility, finalSection, finalGender, hash, id);
    } else {
        db.prepare(`
          UPDATE users SET 
            username = ?, full_name = ?, role = ?, phone = ?, assigned_classes = ?, civility = ?, section = ?, gender = ? 
          WHERE id = ?
        `).run(finalUsername, finalFullName, finalRole, finalPhone, finalAssignedClasses, finalCivility, finalSection, finalGender, id);
    }

    if (finalRole === 'TEACHER') {
        db.prepare('UPDATE classes SET main_teacher_id = NULL WHERE main_teacher_id = ?').run(id);
        db.prepare('UPDATE classes SET assistant_teacher_id = NULL WHERE assistant_teacher_id = ?').run(id);
        if (assignedClasses && assignedClasses.length > 0) {
            if (classRole === 'ASSISTANT') {
                db.prepare('UPDATE classes SET assistant_teacher_id = ? WHERE id IN (' + assignedClasses.map(() => '?').join(',') + ')').run(id, ...assignedClasses);
            } else {
                db.prepare('UPDATE classes SET main_teacher_id = ? WHERE id IN (' + assignedClasses.map(() => '?').join(',') + ')').run(id, ...assignedClasses);
            }
        }
    }
  });
  transaction();
  return { success: true };

};

handlers['db:changePassword'] = async ({ userId, newPassword }) => {
  const hash = crypto.createHash('sha256').update(newPassword).digest('hex');
  return db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, userId);
};

handlers['db:sendTicket'] = async (ticket) => {
  const { sender_id, receiver_role, receiver_id, subject, message, school_id, request_type, request_data } = ticket;
  const sid = getActiveSchoolId(school_id);
  return db.prepare('INSERT INTO tickets (sender_id, receiver_role, receiver_id, subject, message, school_id, request_type, request_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(sender_id, receiver_role, receiver_id, subject, message, sid, request_type || null, request_data ? JSON.stringify(request_data) : null);
};

handlers['db:getTickets'] = async ({ userId, role, schoolId }) => {
  const sid = getActiveSchoolId(schoolId);
  const querySelect = `
    SELECT t.*, 
           u.full_name as sender_name, 
           u.role as sender_role, 
           u.civility as sender_civility,
           (SELECT GROUP_CONCAT(c.name, ', ') FROM classes c WHERE c.main_teacher_id = u.id OR c.assistant_teacher_id = u.id) as teacher_classes,
           (SELECT GROUP_CONCAT(s.first_name || ' ' || s.last_name, ', ') FROM students s WHERE s.parent_contact = u.username) as parent_students
    FROM tickets t 
    JOIN users u ON t.sender_id = u.id 
    WHERE t.school_id = ?
  `;
  if (role === 'SUPERADMIN' || role === 'FOUNDER') {
      return db.prepare(querySelect + ' ORDER BY t.created_at DESC').all(sid);
  }
  return db.prepare(querySelect + ' AND (t.sender_id = ? OR t.receiver_id = ? OR t.receiver_role = ?) ORDER BY t.created_at DESC').all(sid, userId, userId, role);
};

handlers['db:getUnreadTicketsCount'] = async ({ userId, role, schoolId }) => {
  const sid = getActiveSchoolId(schoolId);
  if (role === 'SUPERADMIN' || role === 'FOUNDER') {
    return db.prepare("SELECT COUNT(*) as count FROM tickets WHERE school_id = ? AND status = 'OPEN'").get(sid).count;
  } else if (role === 'DIRECTOR' || role === 'SG') {
    return db.prepare("SELECT COUNT(*) as count FROM tickets WHERE school_id = ? AND status = 'OPEN' AND (receiver_id = ? OR receiver_role = 'DIRECTOR' OR receiver_role = 'SG')").get(sid, userId).count;
  } else {
    return db.prepare("SELECT COUNT(*) as count FROM tickets WHERE school_id = ? AND status = 'OPEN' AND (receiver_id = ? OR receiver_role = ?)").get(sid, userId, role).count;
  }
};

handlers['db:resolveTicket'] = async ({ ticketId, status, responseMessage, actionData }) => {
    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
    if (!ticket) throw new Error("Ticket introuvable");
    
    // Si c'est une demande d'extension de délai et qu'elle est approuvée avec un nombre d'heures
    if (status === 'RESOLVED' && (ticket.request_type === 'GRADE_EXTENSION' || ticket.request_type === 'GRADE_REACTIVATION') && actionData && actionData.hours) {
        let rData = {};
        try { rData = JSON.parse(ticket.request_data); } catch(e) {}
        
        const classId = rData.classId || rData.class_id;
        const term = rData.term;
        const sequence = rData.sequence || rData.month;

        if (classId && term && sequence) {
            const deadline = new Date();
            deadline.setHours(deadline.getHours() + parseInt(actionData.hours));
            
            const existing = db.prepare('SELECT id FROM grade_overrides WHERE teacher_id = ? AND class_id = ? AND term = ? AND month = ?').get(ticket.sender_id, classId, term, sequence);
            if (existing) {
                db.prepare('UPDATE grade_overrides SET deadline = ?, granted_by = ? WHERE id = ?').run(deadline.toISOString(), ticket.receiver_id || ticket.receiver_role || 1, existing.id);
            } else {
                db.prepare('INSERT INTO grade_overrides (teacher_id, class_id, term, month, deadline, granted_by) VALUES (?, ?, ?, ?, ?, ?)').run(ticket.sender_id, classId, term, sequence, deadline.toISOString(), ticket.receiver_id || ticket.receiver_role || 1);
            }
        }
    }
    
    // Si c'est un justificatif d'absence
    if (status === 'RESOLVED' && ticket.request_type === 'ABSENCE_JUSTIFICATION') {
        let rData = {};
        try { rData = JSON.parse(ticket.request_data); } catch(e) {}
        if (rData.studentId && rData.date) {
            db.prepare("UPDATE attendance SET status = 'JUSTIFIED', remark = ? WHERE student_id = ? AND date = ?")
              .run(rData.reason || 'Justifiée par la direction', rData.studentId, rData.date);
        }
    }

    // Mettre à jour le ticket
    db.prepare('UPDATE tickets SET status = ? WHERE id = ?').run(status, ticketId);
    
    return { success: true };
};

handlers['db:createExpense'] = async (expense) => {
  const { amount, reason, requested_by, school_id } = expense;
  const sid = getActiveSchoolId(school_id);
  return db.prepare('INSERT INTO expenses (amount, reason, requested_by, school_id) VALUES (?, ?, ?, ?)')
    .run(amount, reason, requested_by, sid);
};

handlers['db:getExpenses'] = async (schoolId) => {
  const sid = getActiveSchoolId(schoolId);
  return db.prepare('SELECT e.*, u.full_name as requester_name, v.full_name as validator_name FROM expenses e JOIN users u ON e.requested_by = u.id LEFT JOIN users v ON e.validated_by = v.id WHERE e.school_id = ? ORDER BY e.created_at DESC').all(sid);
};

handlers['db:updateExpenseStatus'] = async ({ expenseId, status, validatedBy }) => {
  return db.prepare('UPDATE expenses SET status = ?, validated_by = ? WHERE id = ?').run(status, validatedBy, expenseId);
};

handlers['db:createNotification'] = async (notification) => {
  const { user_id, message, type, school_id } = notification;
  const sid = getActiveSchoolId(school_id);

  if (user_id) {
      return db.prepare('INSERT INTO notifications (school_id, user_id, message, type) VALUES (?, ?, ?, ?)')
        .run(sid, user_id, message, type || 'INFO');
  } else {
      // If no user_id, it's a global/admin notification
      return db.prepare('INSERT INTO notifications (school_id, message, type) VALUES (?, ?, ?)')
        .run(sid, message, type || 'INFO');
  }
};

handlers['db:sendParentAnnouncement'] = async ({ sender_id, school_id, subject, message, filter_cycle, filter_section, filter_class, target_student_id }) => {
    const sid = getActiveSchoolId(school_id);
    let query = `
        SELECT DISTINCT u.id 
        FROM users u 
        JOIN students s ON u.username = s.parent_contact 
        LEFT JOIN classes c ON s.class_id = c.id 
        WHERE s.school_id = ? AND u.role = 'PARENT'
    `;
    const params = [sid];

    if (target_student_id) {
        query += " AND s.id = ?";
        params.push(target_student_id);
    } else {
        if (filter_cycle && filter_cycle !== 'ALL') {
            query += " AND c.level = ?";
            params.push(filter_cycle);
        }
        if (filter_section && filter_section !== 'ALL') {
            query += " AND c.section = ?";
            params.push(filter_section);
        }
        if (filter_class && filter_class !== 'ALL') {
            query += " AND c.name = ?";
            params.push(filter_class);
        }
    }

    const parents = db.prepare(query).all(...params);
    if (parents.length === 0) return { success: true, count: 0 };

    const transaction = db.transaction(() => {
        const stmtTicket = db.prepare('INSERT INTO tickets (sender_id, receiver_id, subject, message, school_id) VALUES (?, ?, ?, ?, ?)');
        const stmtNotif = db.prepare("INSERT INTO notifications (school_id, user_id, message, type) VALUES (?, ?, ?, 'INFO')");
        for (const p of parents) {
            stmtTicket.run(sender_id, p.id, subject, message, sid);
            stmtNotif.run(sid, p.id, `Nouveau communiqué : ${subject}`);
        }
    });
    transaction();
    return { success: true, count: parents.length };

};

handlers['db:getNotifications'] = async ({ userId, schoolId, role }) => {
  const sid = getActiveSchoolId(schoolId);
  let userRole = role;
  if (!userRole && userId) {
    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId);
    userRole = user?.role;
  }

  if (userRole === 'SUPERADMIN') {
    return db.prepare(`
      SELECT * FROM notifications 
      WHERE request_type = 'SUBJECT_ACTIVATION' OR (school_id = ? AND (user_id = ? OR user_id IS NULL))
      ORDER BY created_at DESC LIMIT 50
    `).all(sid, userId);
  } else if (userRole === 'FOUNDER' || userRole === 'DIRECTOR' || userRole === 'SG') {
    return db.prepare(`
      SELECT * FROM notifications 
      WHERE school_id = ? AND (
        (type = 'ACTION_REQUIRED' AND (request_type IS NULL OR request_type != 'SUBJECT_ACTIVATION')) 
        OR user_id = ? 
        OR (user_id IS NULL AND (request_type IS NULL OR request_type != 'SUBJECT_ACTIVATION'))
      )
      ORDER BY created_at DESC LIMIT 50
    `).all(sid, userId);
  } else {
    return db.prepare(`
      SELECT * FROM notifications 
      WHERE school_id = ? AND user_id = ?
      ORDER BY created_at DESC LIMIT 50
    `).all(sid, userId);
  }
};

handlers['db:markNotificationRead'] = async (notificationId) => {
  return db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(notificationId);
};

handlers['db:getStudentDetails'] = async (studentId) => {
  const student = db.prepare('SELECT s.*, c.name as className FROM students s LEFT JOIN classes c ON s.class_id = c.id WHERE s.id = ?').get(studentId);
  const payments = db.prepare('SELECT p.*, i.name as installmentName FROM payments p LEFT JOIN installments i ON p.installment_id = i.id WHERE p.student_id = ?').all(studentId);
  const attendance = db.prepare('SELECT * FROM attendance WHERE student_id = ?').all(studentId);
  const grades = db.prepare('SELECT g.*, s.name as subjectName, s.domain, COALESCE(cs.coefficient, 1) as coefficient FROM grades g JOIN subjects s ON g.subject_id = s.id LEFT JOIN class_subjects cs ON g.class_id = cs.class_id AND g.subject_id = cs.subject_id WHERE g.student_id = ?').all(studentId);

  return { student, payments, attendance, grades };

};

handlers['db:searchStudentsDetailed'] = async ({ name, schoolId, section, level, classId }) => {
    const sid = getActiveSchoolId(schoolId);
    let query = `
        SELECT s.*, c.name as class_name, c.section, c.level,
               (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE student_id = s.id AND payment_type = 'Inscription') >= COALESCE(tf.registration_fee, 0) AS has_paid_registration
        FROM students s 
        JOIN classes c ON s.class_id = c.id 
        LEFT JOIN tuition_fees tf ON s.class_id = tf.class_id
        WHERE s.school_id = ?
    `;
    const params = [sid];

    if (name) {
        query += ` AND (s.first_name LIKE ? OR s.last_name LIKE ?)`;
        params.push(`%${name}%`, `%${name}%`);
    }
    if (section && section !== 'ALL') {
        query += ` AND c.section = ?`;
        params.push(section);
    }
    if (level && level !== 'ALL') {
        query += ` AND c.level = ?`;
        params.push(level);
    }
    if (classId && classId !== 'ALL') {
        query += ` AND c.id = ?`;
        params.push(classId);
    }

    query += ` ORDER BY c.name ASC, s.last_name ASC LIMIT 50`;
    
    return db.prepare(query).all(...params);
};

handlers['db:updateStudent'] = async (student) => {
  const { id, firstName, lastName, birthDate, birthPlace, gender, parentName, parentContact, emergencyContact, medicalInfo, address, neighborhood, section, classId, scholarshipReduction, hasMoratoire, busRouteId } = student;
  const parsedClassId = parseInt(classId, 10);
  
  const runResult = db.prepare(`
    UPDATE students 
    SET first_name = ?, last_name = ?, birth_date = ?, birth_place = ?, gender = ?, parent_name = ?, parent_contact = ?, emergency_contact = ?, medical_info = ?, address = ?, neighborhood = ?, section = ?, class_id = ?, scholarship_reduction = ?, has_moratoire = ?, bus_route_id = ?
    WHERE id = ?
  `).run(firstName, lastName, birthDate, birthPlace, gender, parentName, parentContact, emergencyContact, medicalInfo, address || '', neighborhood || '', section, parsedClassId, scholarshipReduction || 0, hasMoratoire ? 1 : 0, busRouteId ? parseInt(busRouteId, 10) : null, id);

  if (runResult.changes > 0 && parentContact && parentContact.trim()) {
      const studentInDb = db.prepare('SELECT parent_name, school_id FROM students WHERE id = ?').get(id);
      if (studentInDb) {
          const parentUsername = parentContact.trim();
          const existingParent = db.prepare('SELECT id FROM users WHERE username = ?').get(parentUsername);
          if (!existingParent) {
              const hash = bcrypt.hashSync(parentUsername, 10);
              db.prepare('INSERT INTO users (username, password, full_name, role, school_id) VALUES (?, ?, ?, ?, ?)')
                .run(parentUsername, hash, studentInDb.parent_name || 'Parent', 'PARENT', studentInDb.school_id || getActiveSchoolId());
          }
      }
  }
  return runResult;

};

handlers['db:getReportTemplate'] = async (schoolId) => {
  if (!schoolId) return null;
  return db.prepare('SELECT * FROM report_templates WHERE school_id = ?').get(schoolId);
};

handlers['db:saveReportTemplate'] = async (data) => {
  const { schoolId, headerImage, watermarkImage, footerImage, primaryColor, secondaryColor } = data;
  if (!schoolId) return { success: false, error: 'No school ID' };
  
  const existing = db.prepare('SELECT id FROM report_templates WHERE school_id = ?').get(schoolId);
  if (existing) {
    db.prepare(`
      UPDATE report_templates SET 
        header_image = ?, watermark_image = ?, footer_image = ?, primary_color = ?, secondary_color = ?
      WHERE school_id = ?
    `).run(headerImage, watermarkImage, footerImage, primaryColor || '#0f172a', secondaryColor || '#f59e0b', schoolId);
  } else {
    db.prepare(`
      INSERT INTO report_templates (school_id, header_image, watermark_image, footer_image, primary_color, secondary_color)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(schoolId, headerImage, watermarkImage, footerImage, primaryColor || '#0f172a', secondaryColor || '#f59e0b');
  }
  return { success: true };

};

handlers['db:getDashboardStats'] = async (params) => {
  const schoolId = getActiveSchoolId(params ? params.schoolId : null);
  const section = (params && params.section) ? params.section : null;
  const level = (params && params.level) ? params.level : null;

  let queryParams = [schoolId];
  let studentFilters = [];
  let classFilters = [];

  if (section) {
    studentFilters.push("s.section = ?");
    classFilters.push("c.section = ?");
    queryParams.push(section);
  }

  if (level && level !== 'ALL') {
    studentFilters.push("c.level = ?");
    classFilters.push("c.level = ?");
    queryParams.push(level);
  }

  const studentWhereStr = studentFilters.length > 0 ? "AND " + studentFilters.join(" AND ") : "";
  const classWhereStr = classFilters.length > 0 ? "AND " + classFilters.join(" AND ") : "";

  const totalStudents = db.prepare(`
    SELECT COUNT(*) as count 
    FROM students s
    JOIN classes c ON s.class_id = c.id
    WHERE s.school_id = ? ${studentWhereStr}
  `).get(...queryParams).count;

  const boys = db.prepare(`
    SELECT COUNT(*) as count 
    FROM students s
    JOIN classes c ON s.class_id = c.id
    WHERE s.gender = 'M' AND s.school_id = ? ${studentWhereStr}
  `).get(...queryParams).count;

  const girls = db.prepare(`
    SELECT COUNT(*) as count 
    FROM students s
    JOIN classes c ON s.class_id = c.id
    WHERE s.gender = 'F' AND s.school_id = ? ${studentWhereStr}
  `).get(...queryParams).count;

  const totalRevenue = db.prepare(`
    SELECT SUM(p.amount) as total
    FROM payments p
    JOIN students s ON p.student_id = s.id
    JOIN classes c ON s.class_id = c.id
    WHERE s.school_id = ? ${studentWhereStr}
  `).get(...queryParams).total || 0;

  const totalTuitionDue = db.prepare(`
    SELECT SUM(t.total_fee) as total
    FROM tuition_fees t
    JOIN students s ON s.class_id = t.class_id
    JOIN classes c ON s.class_id = c.id
    WHERE s.school_id = ? ${studentWhereStr}
  `).get(...queryParams).total || 0;

  const classStats = db.prepare(`
    SELECT c.name as level, c.section, AVG(g.score) as avg,
    (COUNT(CASE WHEN g.score >= 10 THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)) as passRate
    FROM classes c
    LEFT JOIN grades g ON g.class_id = c.id
    WHERE c.school_id = ? ${classWhereStr}
    GROUP BY c.id
    ORDER BY c.section ASC, passRate DESC
  `).all(...(section || (level && level !== 'ALL') ? [schoolId, ...(section ? [section] : []), ...(level && level !== 'ALL' ? [level] : [])] : [schoolId]));

  const schoolConfig = db.prepare('SELECT honor_roll_threshold FROM schools WHERE id = ?').get(schoolId) || {};
  const honorThreshold = schoolConfig.honor_roll_threshold !== undefined ? schoolConfig.honor_roll_threshold : 15.0;

  const honorRoll = db.prepare(`
    SELECT s.first_name, s.last_name, c.name as class_name, c.level as class_level, c.section as class_section, AVG(g.score) as avg
    FROM students s
    JOIN classes c ON s.class_id = c.id
    JOIN grades g ON g.student_id = s.id
    WHERE s.school_id = ? ${studentWhereStr}
    GROUP BY s.id
    HAVING avg >= ?
    ORDER BY c.level ASC, c.section ASC, c.name ASC, avg DESC
  `).all(...(section || (level && level !== 'ALL') ? [schoolId, ...(section ? [section] : []), ...(level && level !== 'ALL' ? [level] : []), honorThreshold] : [schoolId, honorThreshold]));

  return {
    totalStudents,
    genderDist: { boys, girls },
    totalRevenue,
    totalTuitionDue,
    classStats: classStats.map(c => ({ ...c, avg: c.avg || 0, passRate: c.passRate || 0 })),
    honorRoll: honorRoll.map(h => ({ name: (h.last_name + ' ' + (h.first_name || '')).trim(), class: h.class_name, level: h.class_level, section: h.class_section, avg: h.avg || 0 })),
    honorRollThreshold: honorThreshold,
    financialAlerts: []
  };

};

handlers['db:getBursarDashboardStats'] = async (params) => {
  const schoolId = getActiveSchoolId(params ? params.schoolId : null);
  
  const students = db.prepare(`
    SELECT s.id, s.class_id, s.scholarship_reduction, c.name as class_name, c.level as class_level,
           (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE student_id = s.id AND payment_type = 'Inscription') >= COALESCE(tf.registration_fee, 0) AS has_paid_registration
    FROM students s
    JOIN classes c ON s.class_id = c.id
    LEFT JOIN tuition_fees tf ON s.class_id = tf.class_id
    WHERE s.school_id = ?
  `).all(schoolId);

  const tuitionFees = db.prepare(`
    SELECT t.* 
    FROM tuition_fees t
    JOIN classes c ON t.class_id = c.id
    WHERE c.school_id = ?
  `).all(schoolId);
  const tuitionPayments = db.prepare(`
    SELECT p.student_id, SUM(p.amount) as total_paid 
    FROM payments p
    JOIN students s ON p.student_id = s.id
    WHERE p.payment_type IN ('Scolarité', 'Inscription') AND s.school_id = ?
    GROUP BY p.student_id
  `).all(schoolId);

  const allRevenue = db.prepare(`
    SELECT SUM(p.amount) as total_paid
    FROM payments p
    JOIN students s ON p.student_id = s.id
    WHERE s.school_id = ?
  `).get(schoolId).total_paid || 0;

  const paymentMap = {};
  tuitionPayments.forEach(p => { paymentMap[p.student_id] = p.total_paid; });

  let totalRevenue = allRevenue; // Global Recettes include ALL fees
  let totalTuitionDue = 0;
  let totalTuitionPaid = 0;
  const classMap = {};

  students.forEach(s => {
    if (!classMap[s.class_name]) {
        classMap[s.class_name] = { name: s.class_name, level: s.class_level, totalStudents: 0, upToDateStudents: 0 };
    }
    classMap[s.class_name].totalStudents++;

    const classFeeConfig = tuitionFees.find(f => f.class_id === s.class_id);
    const totalReg = classFeeConfig ? classFeeConfig.registration_fee : 0;
    const totalPension = classFeeConfig ? classFeeConfig.total_fee : 0;
    
    const scholarship = s.scholarship_reduction || 0;
    const due = totalReg + Math.max(0, totalPension - scholarship);
    const paid = paymentMap[s.id] || 0;

    totalTuitionDue += due;
    totalTuitionPaid += paid;

    if (paid >= due) {
        classMap[s.class_name].upToDateStudents++;
    }
  });

  const validatedExpenses = db.prepare(`
    SELECT SUM(amount) as total 
    FROM expenses 
    WHERE status = 'VALIDATED' AND school_id = ?
  `).get(schoolId).total || 0;

  return {
      totalRevenue,
      totalTuitionPaid,
      totalExpenses: validatedExpenses,
      totalTuitionDue,
      totalStudents: students.length,
      classStats: Object.values(classMap).sort((a, b) => b.totalStudents - a.totalStudents)
  };

};

handlers['db:getAdvisorDashboardStats'] = async (params) => {
  const schoolId = getActiveSchoolId(params ? params.schoolId : null);
  
  // Get all classes
  const classes = db.prepare(`SELECT id, name, level, section FROM classes WHERE school_id = ?`).all(schoolId);
  const students = db.prepare(`
      SELECT s.id, s.class_id, 
             (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE student_id = s.id AND payment_type = 'Inscription') >= COALESCE(tf.registration_fee, 0) AS has_paid_registration
      FROM students s 
      LEFT JOIN tuition_fees tf ON s.class_id = tf.class_id
      WHERE s.school_id = ?
  `).all(schoolId).filter(s => s.has_paid_registration);
  
  // Calculate absences
  const absences = db.prepare(`
    SELECT a.student_id, COUNT(*) as absence_count
    FROM attendance a
    JOIN students s ON a.student_id = s.id
    WHERE s.school_id = ? AND a.status = 'ABSENT'
    GROUP BY a.student_id
  `).all(schoolId);

  const absenceMap = {};
  absences.forEach(a => { absenceMap[a.student_id] = a.absence_count; });

  // Calculate pass rates
  const grades = db.prepare(`
    SELECT g.student_id, g.class_id, AVG(g.score) as avg
    FROM grades g
    JOIN classes c ON g.class_id = c.id
    WHERE c.school_id = ?
    GROUP BY g.student_id
  `).all(schoolId);

  const classMap = {};
  classes.forEach(c => {
      classMap[c.id] = { ...c, totalStudents: 0, totalAbsences: 0, passedStudents: 0, totalGraded: 0 };
  });

  students.forEach(s => {
      if (classMap[s.class_id]) {
          classMap[s.class_id].totalStudents++;
          classMap[s.class_id].totalAbsences += (absenceMap[s.id] || 0);
      }
  });

  grades.forEach(g => {
      if (classMap[g.class_id]) {
          classMap[g.class_id].totalGraded++;
          if (g.avg >= 10) {
              classMap[g.class_id].passedStudents++;
          }
      }
  });

  let totalAbsences = 0;
  let overallPassed = 0;
  let overallGraded = 0;

  const finalClassStats = Object.values(classMap).map((c) => {
      totalAbsences += c.totalAbsences;
      overallPassed += c.passedStudents;
      overallGraded += c.totalGraded;
      const passRate = c.totalGraded > 0 ? (c.passedStudents / c.totalGraded) * 100 : 0;
      return {
          name: c.name,
          level: c.level,
          section: c.section,
          totalStudents: c.totalStudents,
          totalAbsences: c.totalAbsences,
          passRate
      };
  });

  const overallPassRate = overallGraded > 0 ? (overallPassed / overallGraded) * 100 : 0;

  return {
      totalStudents: students.length,
      totalAbsences,
      overallPassRate,
      classStats: finalClassStats
  };

};

handlers['db:getTeacherDashboardStats'] = async (params) => {
    const { schoolId, teacherId } = params;
    const sid = getActiveSchoolId(schoolId);
    const tId = teacherId ? parseInt(teacherId, 10) : null;

    let classIds = [];
    if (tId) {
        // 1. Get from direct main/assistant links
        const directClasses = db.prepare('SELECT id FROM classes WHERE school_id = ? AND (main_teacher_id = ? OR assistant_teacher_id = ?)').all(sid, tId, tId);
        directClasses.forEach(c => classIds.push(c.id));

        // 2. Get from user's assigned_classes
        const teacher = db.prepare('SELECT assigned_classes FROM users WHERE id = ?').get(tId);
        if (teacher && teacher.assigned_classes) {
            try {
                const parsed = JSON.parse(teacher.assigned_classes);
                if (Array.isArray(parsed)) {
                    parsed.forEach(id => {
                        const numId = Number(id);
                        if (!isNaN(numId) && !classIds.includes(numId)) {
                            classIds.push(numId);
                        }
                    });
                }
            } catch (e) {
                console.error("Error parsing teacher assigned_classes:", e);
            }
        }
        
        // 3. Get from schedules
        const scheduleClasses = db.prepare('SELECT DISTINCT class_id FROM schedules WHERE school_id = ? AND teacher_id = ?').all(sid, tId);
        scheduleClasses.forEach(sc => {
            if (sc.class_id && !classIds.includes(sc.class_id)) classIds.push(sc.class_id);
        });
    }

    let classes = [];
    let totalStudents = 0;
    let boys = 0;
    let girls = 0;
    let studentsAverages = [];
    
    if (classIds.length > 0) {
        classes = db.prepare(`SELECT * FROM classes WHERE id IN (${classIds.join(',')}) AND school_id = ?`).all(sid);
        if (classes.length > 0) {
            const activeClassIds = classes.map(c => c.id).join(',');
            const studentStats = db.prepare(`
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN gender = 'M' THEN 1 ELSE 0 END) as boys,
                    SUM(CASE WHEN gender = 'F' THEN 1 ELSE 0 END) as girls
                FROM students s
                WHERE s.class_id IN (${activeClassIds}) AND s.school_id = ?
            `).get(sid);
            totalStudents = studentStats.total || 0;
            boys = studentStats.boys || 0;
            girls = studentStats.girls || 0;

            studentsAverages = db.prepare(`
                SELECT s.id, s.first_name, s.last_name, s.matricule, c.name as className,
                    AVG(g.score) as average
                FROM students s
                JOIN classes c ON s.class_id = c.id
                LEFT JOIN grades g ON g.student_id = s.id
                WHERE s.class_id IN (${activeClassIds})
                GROUP BY s.id
                ORDER BY average DESC NULLS LAST
            `).all();
        }
    }

    const schoolConfig = db.prepare('SELECT timetable_slots FROM schools WHERE id = ?').get(sid);
    const subjects = db.prepare('SELECT id, name FROM subjects').all();
    
    let schedules = [];
    let examSchedules = [];
    if (tId) {
        if (classIds.length > 0) {
            schedules = db.prepare(`SELECT * FROM schedules WHERE school_id = ? AND (teacher_id = ? OR (type = 'PAUSE' AND class_id IN (${classIds.join(',')})))`).all(sid, tId);
        } else {
            schedules = db.prepare('SELECT * FROM schedules WHERE school_id = ? AND teacher_id = ?').all(sid, tId);
        }
        
        examSchedules = db.prepare(`
            SELECT e.*, c.name as class_name, s.name as subject_name
            FROM evaluation_schedules e
            LEFT JOIN classes c ON e.class_id = c.id
            LEFT JOIN subjects s ON e.subject_id = s.id
            WHERE e.school_id = ? AND e.teacher_id = ?
        `).all(sid, tId);
    }

    return {
        totalStudents,
        genderDist: { boys, girls },
        classes,
        subjects,
        students: studentsAverages.map(s => ({ ...s, average: s.average || 0 })),
        schedules,
        examSchedules,
        timetable_slots: schoolConfig ? schoolConfig.timetable_slots : null
    };

};

handlers['db:updateSchoolSettings'] = async (settings) => {
    const { 
        id, 
        name,
        motto,
        address,
        bp,
        contact_email,
        contact_phone,
        primary_color, 
        secondary_color, 
        receipt_sig_title, 
        bulletin_sig_left, 
        bulletin_sig_middle, 
        bulletin_sig_right, 
        header_french,
        header_english,
        bulletin_pdf_use_custom,
        bulletin_pdf_template,
        bulletin_pdf_mapping,
        transport_fee_model,
        transport_fee_amount,
        honor_roll_threshold,
        timetable_slots,
        evaluation_periods,
        term_structure
    } = settings;

    let finalEvaluationPeriods = evaluation_periods;
    if (term_structure) {
        try {
            const parsed = JSON.parse(term_structure);
            if (Array.isArray(parsed)) {
                finalEvaluationPeriods = JSON.stringify(parsed.map(t => ({ id: t.term_id, name: t.name })));
            }
        } catch (e) {
            console.error("Failed to parse term_structure in settings:", e.message);
        }
    }

    return db.prepare(`
        UPDATE schools SET
            name = COALESCE(?, name),
            motto = COALESCE(?, motto),
            address = COALESCE(?, address),
            bp = COALESCE(?, bp),
            contact_email = COALESCE(?, contact_email),
            contact_phone = COALESCE(?, contact_phone),
            primary_color = COALESCE(?, primary_color),
            secondary_color = COALESCE(?, secondary_color),
            receipt_sig_title = COALESCE(?, receipt_sig_title),
            bulletin_sig_left = COALESCE(?, bulletin_sig_left),
            bulletin_sig_middle = COALESCE(?, bulletin_sig_middle),
            bulletin_sig_right = COALESCE(?, bulletin_sig_right),
            header_french = COALESCE(?, header_french),
            header_english = COALESCE(?, header_english),
            bulletin_pdf_use_custom = COALESCE(?, bulletin_pdf_use_custom),
            bulletin_pdf_template = COALESCE(?, bulletin_pdf_template),
            bulletin_pdf_mapping = COALESCE(?, bulletin_pdf_mapping),
            transport_fee_model = COALESCE(?, transport_fee_model),
            transport_fee_amount = COALESCE(?, transport_fee_amount),
            honor_roll_threshold = COALESCE(?, honor_roll_threshold),
            timetable_slots = COALESCE(?, timetable_slots),
            evaluation_periods = COALESCE(?, evaluation_periods),
            term_structure = COALESCE(?, term_structure)
        WHERE id = ?
    `).run(
        name !== undefined ? name : null,
        motto !== undefined ? motto : null,
        address !== undefined ? address : null,
        bp !== undefined ? bp : null,
        contact_email !== undefined ? contact_email : null,
        contact_phone !== undefined ? contact_phone : null,
        primary_color !== undefined ? primary_color : null,
        secondary_color !== undefined ? secondary_color : null,
        receipt_sig_title !== undefined ? receipt_sig_title : null,
        bulletin_sig_left !== undefined ? bulletin_sig_left : null,
        bulletin_sig_middle !== undefined ? bulletin_sig_middle : null,
        bulletin_sig_right !== undefined ? bulletin_sig_right : null,
        header_french !== undefined ? header_french : null,
        header_english !== undefined ? header_english : null,
        bulletin_pdf_use_custom !== undefined ? bulletin_pdf_use_custom : null,
        bulletin_pdf_template !== undefined ? bulletin_pdf_template : null,
        bulletin_pdf_mapping !== undefined ? bulletin_pdf_mapping : null,
        transport_fee_model !== undefined ? transport_fee_model : null,
        transport_fee_amount !== undefined ? transport_fee_amount : null,
        honor_roll_threshold !== undefined ? honor_roll_threshold : null,
        timetable_slots !== undefined ? timetable_slots : null,
        finalEvaluationPeriods !== undefined ? finalEvaluationPeriods : null,
        term_structure !== undefined ? term_structure : null,
        id);
};

handlers['db:getSchoolArchives'] = async (schoolId) => {
    const sid = getActiveSchoolId(schoolId);
    return db.prepare('SELECT * FROM school_year_archives WHERE school_id = ? ORDER BY created_at DESC').all(sid);
};

handlers['db:createSchoolYearArchive'] = async ({ schoolId, yearName }) => {
    const sid = getActiveSchoolId(schoolId);
    const totalStudents = db.prepare('SELECT COUNT(*) as count FROM students WHERE school_id = ?').get(sid).count;
    const totalRevenue = db.prepare(`
        SELECT SUM(p.amount) as total
        FROM payments p
        JOIN students s ON p.student_id = s.id
        WHERE s.school_id = ?
    `).get(sid).total || 0;
    
    const avgObj = db.prepare(`
        SELECT AVG(g.score) as avg
        FROM grades g
        JOIN students s ON g.student_id = s.id
        WHERE s.school_id = ?
    `).get(sid);
    const averageGrade = avgObj && avgObj.avg ? avgObj.avg : 14.5;

    const backupsDir = path.join(app.getAppPath(), 'backups');
    if (!fs.existsSync(backupsDir)) {
        fs.mkdirSync(backupsDir, { recursive: true });
    }
    const backupFileName = `school_backup_${sid}_${yearName.replace(/[\/\s\\:]+/g, '_')}_${Date.now()}.db`;
    const backupFilePath = path.join(backupsDir, backupFileName);

    // Online backup execution
    await db.backup(backupFilePath);

    const result = db.prepare(`
        INSERT INTO school_year_archives (school_id, year_name, total_students, total_revenue, average_grade, backup_file_path)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(sid, yearName, totalStudents, totalRevenue, averageGrade, backupFilePath);

    return { success: true, id: result.lastInsertRowid, backupFilePath };

};

handlers['db:getGradeOverrides'] = async ({ teacherId, classId, term, month }) => {
    const tId = teacherId ? parseInt(teacherId, 10) : null;
    const cId = classId ? parseInt(classId, 10) : null;
    return db.prepare('SELECT * FROM grade_overrides WHERE teacher_id = ? AND class_id = ? AND term = ? AND month = ?').get(tId, cId, term, month);
};

handlers['db:addGradeOverride'] = async ({ teacherId, classId, term, month, deadline, grantedBy }) => {
    const tId = teacherId ? parseInt(teacherId, 10) : null;
    const cId = classId ? parseInt(classId, 10) : null;
    const gBy = grantedBy ? parseInt(grantedBy, 10) : null;
    return db.prepare('INSERT INTO grade_overrides (teacher_id, class_id, term, month, deadline, granted_by) VALUES (?, ?, ?, ?, ?, ?)').run(tId, cId, term, month, deadline, gBy);
};

handlers['db:getParentMessages'] = async ({ schoolId, userId }) => {
    const sid = getActiveSchoolId(schoolId);
    // Fetch announcements meant for PARENTS or ALL
    const announcements = db.prepare(`
        SELECT a.id, a.title, a.content, a.created_at, u.full_name as sender_name, u.role as sender_role 
        FROM announcements a 
        LEFT JOIN users u ON a.sender_id = u.id 
        WHERE a.school_id = ? AND a.target IN ('PARENTS', 'ALL')
    `).all(sid);

    // Fetch direct tickets to the parent
    const tickets = db.prepare(`
        SELECT t.id, t.subject as title, t.message as content, t.created_at, u.full_name as sender_name, u.role as sender_role
        FROM tickets t
        LEFT JOIN users u ON t.sender_id = u.id
        WHERE t.school_id = ? AND t.receiver_id = ?
    `).all(sid, userId);

    const allMessages = [...announcements, ...tickets];
    allMessages.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    return allMessages;

};

handlers['db:getClassGradingScale'] = async (classId) => {
  const cls = db.prepare('SELECT grading_scale_id FROM classes WHERE id = ?').get(classId);
  if (!cls || !cls.grading_scale_id) {
    return null;
  }
  const scale = db.prepare('SELECT * FROM grading_scales WHERE id = ?').get(cls.grading_scale_id);
  if (!scale) return null;
  const options = db.prepare('SELECT * FROM grading_scale_options WHERE scale_id = ? ORDER BY min_range DESC, numeric_equivalent DESC').all(scale.id);
  return { scale, options };
};

handlers['db:getGradingScales'] = async (schoolId) => {
  const sid = getActiveSchoolId(schoolId);
  const scales = db.prepare('SELECT * FROM grading_scales WHERE school_id = ?').all(sid);
  return scales.map(scale => {
    const options = db.prepare('SELECT * FROM grading_scale_options WHERE scale_id = ? ORDER BY min_range DESC, numeric_equivalent DESC').all(scale.id);
    return { ...scale, options };
  });
};

handlers['db:saveGradingScale'] = async ({ id, schoolId, name, is_numerical, min_value, max_value, options }) => {
  const sid = getActiveSchoolId(schoolId);
  let scaleId = id;
  const tx = db.transaction(() => {
    if (id) {
      db.prepare('UPDATE grading_scales SET name = ?, is_numerical = ?, min_value = ?, max_value = ? WHERE id = ? AND school_id = ?')
        .run(name, is_numerical, min_value, max_value, id, sid);
      db.prepare('DELETE FROM grading_scale_options WHERE scale_id = ?').run(id);
    } else {
      const result = db.prepare('INSERT INTO grading_scales (school_id, name, is_numerical, min_value, max_value) VALUES (?, ?, ?, ?, ?)')
        .run(sid, name, is_numerical, min_value, max_value);
      scaleId = result.lastInsertRowid;
    }

    if (options && Array.isArray(options)) {
      const insertOpt = db.prepare('INSERT INTO grading_scale_options (scale_id, symbol, min_range, max_range, numeric_equivalent, description) VALUES (?, ?, ?, ?, ?, ?)');
      for (const opt of options) {
        insertOpt.run(scaleId, opt.symbol, opt.min_range, opt.max_range, opt.numeric_equivalent, opt.description || '');
      }
    }
  });
  tx();
  return { success: true, id: scaleId };
};

handlers['db:updateSchoolSuperAdminSettings'] = async ({ schoolId, requiresSubjectCode, allowFounderTermEdit }) => {
  const tx = db.transaction(() => {
    db.prepare('UPDATE schools SET requires_subject_code = ?, allow_founder_term_edit = ? WHERE id = ?')
      .run(requiresSubjectCode, allowFounderTermEdit, schoolId);
  });
  tx();
  return { success: true };
};

handlers['db:deleteGradingScale'] = async (id) => {
  const tx = db.transaction(() => {
    db.prepare('UPDATE classes SET grading_scale_id = NULL WHERE grading_scale_id = ?').run(id);
    db.prepare('DELETE FROM grading_scale_options WHERE scale_id = ?').run(id);
    db.prepare('DELETE FROM grading_scales WHERE id = ?').run(id);
  });
  tx();
  return { success: true };
};

handlers['db:setClassGradingScale'] = async ({ classId, scaleId }) => {
  const sId = scaleId ? parseInt(scaleId, 10) : null;
  return db.prepare('UPDATE classes SET grading_scale_id = ? WHERE id = ?').run(sId, classId);
};

handlers['db:getTeacherAssignedSubjects'] = async ({ classId, teacherId }) => {
  return db.prepare(`
    SELECT s.*, cs.coefficient, cs.is_optional
    FROM class_teacher_subjects cts
    JOIN subjects s ON cts.subject_id = s.id
    JOIN class_subjects cs ON cs.class_id = cts.class_id AND cs.subject_id = cts.subject_id
    WHERE cts.class_id = ? AND cts.teacher_id = ?
  `).all(classId, teacherId);
};

handlers['db:getClassTeacherAssignments'] = async (classId) => {
  return db.prepare(`
    SELECT cts.*, u.full_name as teacherName, s.name as subjectName
    FROM class_teacher_subjects cts
    JOIN users u ON cts.teacher_id = u.id
    JOIN subjects s ON cts.subject_id = s.id
    WHERE cts.class_id = ?
  `).all(classId);
};

handlers['db:saveClassTeacherAssignments'] = async ({ classId, assignments }) => {
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM class_teacher_subjects WHERE class_id = ?').run(classId);
    if (assignments && Array.isArray(assignments)) {
      const insert = db.prepare('INSERT INTO class_teacher_subjects (class_id, subject_id, teacher_id) VALUES (?, ?, ?)');
      for (const a of assignments) {
        insert.run(classId, a.subject_id, a.teacher_id);
      }
    }
  });
  tx();
  return { success: true };
};

handlers['db:submitSystemRequest'] = async ({ schoolId, senderId, requestType, requestData }) => {
  const sid = getActiveSchoolId(schoolId);
  const reqDataStr = typeof requestData === 'string' ? requestData : JSON.stringify(requestData);
  
  let message = `Nouvelle demande de la part d'un utilisateur.`;
  if (requestType === 'GRADE_REACTIVATION') {
    const data = typeof requestData === 'string' ? JSON.parse(requestData) : requestData;
    const teacher = db.prepare('SELECT full_name FROM users WHERE id = ?').get(senderId);
    const cls = db.prepare('SELECT name FROM classes WHERE id = ?').get(data.classId);
    message = `L'enseignant ${teacher?.full_name || 'Inconnu'} demande la réactivation de la saisie des notes pour la classe ${cls?.name || 'Inconnue'} (${data.month}, Trimestre ${data.term}).`;
  } else if (requestType === 'ABSENCE_JUSTIFICATION') {
    const data = typeof requestData === 'string' ? JSON.parse(requestData) : requestData;
    const student = db.prepare('SELECT first_name, last_name FROM students WHERE id = ?').get(data.studentId);
    message = `Justification d'absence demandée pour l'élève ${student?.first_name || ''} ${student?.last_name || ''} le ${data.date}. Raison : ${data.reason}`;
  }

  return db.prepare(`
    INSERT INTO tickets (school_id, sender_id, receiver_role, subject, message, request_type, request_data)
    VALUES (?, ?, 'DIRECTOR', 'Demande Système', ?, ?, ?)
  `).run(sid, senderId, message, requestType, reqDataStr);
};

handlers['db:resolveSystemRequest'] = async ({ notificationId, action, durationHours, resolvedBy }) => {
  const notif = db.prepare('SELECT * FROM notifications WHERE id = ?').get(notificationId);
  if (!notif) throw new Error("Notification introuvable.");
  if (notif.action_status !== 'PENDING') throw new Error("Cette demande a déjà été résolue.");

  const tx = db.transaction(() => {
    if (action === 'APPROVED') {
      const data = JSON.parse(notif.request_data);
      if (notif.request_type === 'GRADE_REACTIVATION') {
        const deadlineDate = new Date();
        const hrs = parseInt(durationHours, 10) || 24;
        deadlineDate.setHours(deadlineDate.getHours() + hrs);
        const deadlineStr = deadlineDate.toISOString().replace('T', ' ').substring(0, 19);

        const existing = db.prepare('SELECT id FROM grade_overrides WHERE teacher_id = ? AND class_id = ? AND term = ? AND month = ?')
          .get(data.teacherId, data.classId, data.term, data.month);
        
        if (existing) {
          db.prepare('UPDATE grade_overrides SET deadline = ?, granted_by = ? WHERE id = ?')
            .run(deadlineStr, resolvedBy, existing.id);
        } else {
          db.prepare('INSERT INTO grade_overrides (teacher_id, class_id, term, month, deadline, granted_by) VALUES (?, ?, ?, ?, ?, ?)')
            .run(data.teacherId, data.classId, data.term, data.month, deadlineStr, resolvedBy);
        }

        db.prepare(`
          INSERT INTO notifications (school_id, user_id, message, type)
          VALUES (?, ?, ?, 'SYSTEM')
        `).run(notif.school_id, data.teacherId, `Votre demande de réactivation pour la classe ${data.className || ''} a été approuvée pour une durée de ${hrs} heures.`);

      } else if (notif.request_type === 'ABSENCE_JUSTIFICATION') {
        db.prepare("UPDATE attendance SET status = 'JUSTIFIED', remark = ? WHERE student_id = ? AND date = ?")
          .run(data.reason || 'Justifiée par la direction', data.studentId, data.date);
      }
      
      db.prepare("UPDATE notifications SET action_status = 'APPROVED' WHERE id = ?").run(notificationId);
    } else {
      db.prepare("UPDATE notifications SET action_status = 'REJECTED' WHERE id = ?").run(notificationId);
      
      if (notif.request_type === 'GRADE_REACTIVATION') {
        const data = JSON.parse(notif.request_data);
        db.prepare(`
          INSERT INTO notifications (school_id, user_id, message, type)
          VALUES (?, ?, ?, 'SYSTEM')
        `).run(notif.school_id, data.teacherId, `Votre demande de réactivation pour la classe ${data.className || ''} a été refusée.`);
      }
    }
  });

  tx();
  return { success: true };
};

handlers['db:getTodayTransportAttendance'] = async ({ routeId, direction }) => {
  return db.prepare(`
    SELECT student_id, status 
    FROM transport_attendance 
    WHERE route_id = ? AND date = date('now') AND direction = ?
  `).all(routeId, direction);
};

handlers['db:getTodayTransportAttendance'] = async ({ routeId, direction }) => {
  return db.prepare(`
    SELECT student_id, status 
    FROM transport_attendance 
    WHERE route_id = ? AND date = date('now') AND direction = ?
  `).all(routeId, direction);
};

handlers['db:updateSchoolSuperAdminSettings'] = async ({ schoolId, requiresSubjectCode, allowFounderTermEdit }) => {
  const tx = db.transaction(() => {
    db.prepare('UPDATE schools SET requires_subject_code = ?, allow_founder_term_edit = ? WHERE id = ?')
      .run(requiresSubjectCode, allowFounderTermEdit, schoolId);
  });
  tx();
  return { success: true };
};

module.exports = handlers;
