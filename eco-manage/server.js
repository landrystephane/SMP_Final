const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { initDb, db } = require('./electron/database/db');
const jwt = require('jsonwebtoken');
const session = require('./electron/database/session');

if (!process.env.JWT_SECRET) {
    console.warn('[⚠️  SÉCURITÉ] JWT_SECRET non défini ! Utilisation du secret par défaut. Définir JWT_SECRET en variable d\'environnement pour la production.');
}
const JWT_SECRET = process.env.JWT_SECRET || 'eco-manage-super-secret-key-' + crypto.randomBytes(16).toString('hex');
const apiHandlers = require('./electron/database/apiHandlers');

// Initialisation de la base de données
initDb();

const app = express();
const port = process.env.PORT || 3001;

// Derrière nginx/proxy : faire confiance au X-Forwarded-For pour le rate limiter
app.set('trust proxy', 1);

app.use(cors());
// Limite augmentée pour supporter les images base64 (logos, filigranes, etc.)
app.use(bodyParser.json({ limit: '20mb' }));
app.use(bodyParser.urlencoded({ limit: '20mb', extended: true }));

// Retourner du JSON pour les erreurs de parsing du body (413, syntaxe invalide...)
app.use((err, req, res, next) => {
    if (err.type === 'entity.too.large') {
        return res.status(413).json({ error: 'Corps de la requête trop volumineux (max 20 Mo).' });
    }
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'JSON invalide dans la requête.' });
    }
    next(err);
});

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false }
});

const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 200,
    message: { error: 'Trop de requêtes. Veuillez patienter.' },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false }
});

app.use('/api', apiLimiter);

app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    if (req.path === '/auth/login' || req.path === '/health' || req.path === '/verify-school-code' || req.path === '/auth/switchSchool' || req.path.startsWith('/school-by-slug/') || req.path === '/search-schools') return next();

    const authHeader = req.headers.authorization;
    let user = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
            user = jwt.verify(token, JWT_SECRET);
        } catch (e) {
            return res.status(401).json({ error: 'Token invalide ou expiré' });
        }
    }

    if (!user) {
        return res.status(401).json({ error: 'Authentification requise' });
    }

    if (req.path.startsWith('/saas/') && req.path !== '/saas/schools') {
        if (user.role !== 'SUPERADMIN') {
            return res.status(403).json({ error: 'Accès réservé au Super Admin' });
        }
    }

    session.run({ user }, () => {
        next();
    });
});

// ==========================================
// ROUTES API (Migration de l'ancien IPC)
// ==========================================

// Route générique pour toutes les requêtes IPC
app.post('/api/ipc', async (req, res) => {
    const { channel, args } = req.body;
    try {
        if (apiHandlers[channel]) {
            // L'application web envoie les arguments sous forme de tableau
            const result = await apiHandlers[channel](...(args || []));
            res.json({ success: true, result });
        } else {
            console.warn(`Channel IPC inconnu : ${channel}`);
            res.status(404).json({ error: 'Endpoint introuvable' });
        }
    } catch (error) {
        console.error(`[IPC Error Web] ${channel}:`, error.message);
        res.status(500).json({ error: error.message });
    }
});


// Route de vérification de santé
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'SaaS Web API is running perfectly!' });
});

// Public route: verify school access code (no school list exposed)
app.post('/api/verify-school-code', (req, res) => {
    try {
        const { code } = req.body;
        if (!code || code.trim().length < 3) return res.json({ found: false });
        const school = db.prepare("SELECT id, name, address FROM schools WHERE access_code = ? AND is_active = 1 AND deleted_at IS NULL").get(code.trim().toUpperCase());
        if (school) {
            res.json({ found: true, school: { id: school.id, name: school.name, address: school.address } });
        } else {
            res.json({ found: false });
        }
    } catch(e) {
        res.json({ found: false });
    }
});

// Public route: search schools by name
app.get('/api/search-schools', (req, res) => {
    try {
        const q = (req.query.q || '').trim();
        if (q.length < 2) return res.json({ schools: [] });
        const schools = db.prepare(
            "SELECT id, name, address FROM schools WHERE LOWER(name) LIKE ? AND is_active = 1 AND deleted_at IS NULL LIMIT 8"
        ).all(`%${q.toLowerCase()}%`);
        res.json({ schools });
    } catch(e) {
        res.json({ schools: [] });
    }
});

// Public route: resolve school by subdomain slug
app.get('/api/school-by-slug/:slug', (req, res) => {
    try {
        const slug = (req.params.slug || '').toLowerCase().trim().replace(/[^a-z0-9-]/g, '');
        if (!slug) return res.json({ school: null });
        const school = db.prepare(
            "SELECT id, name, address, logo, primary_color FROM schools WHERE LOWER(slug) = ? AND is_active = 1 AND deleted_at IS NULL"
        ).get(slug);
        res.json({ school: school || null });
    } catch(e) {
        res.json({ school: null });
    }
});

// Migration de 'auth:login'
app.post('/api/auth/login', loginLimiter, (req, res) => {
    let { username, password, schoolId } = req.body;

    try {
        // Normalize phone number for parent login
        let normalizedUsername = (username || '').trim();
        if (normalizedUsername.startsWith('+237')) normalizedUsername = normalizedUsername.slice(4);
        if (normalizedUsername.startsWith('237') && normalizedUsername.length > 9) normalizedUsername = normalizedUsername.slice(3);

        let user;
        if (schoolId) {
            // School-scoped login (from access code flow)
            user = db.prepare('SELECT id, username, password as hash, full_name as fullName, role, school_id as schoolId, assigned_classes as assignedClasses, matricule, civility, section, gender, is_active as isActive FROM users WHERE (username = ? OR username = ? OR matricule = ?) AND school_id = ?').get(username, normalizedUsername, username, schoolId);
        } else {
            // SuperAdmin login (no school context)
            user = db.prepare('SELECT id, username, password as hash, full_name as fullName, role, school_id as schoolId, assigned_classes as assignedClasses, matricule, civility, section, gender, is_active as isActive FROM users WHERE (username = ? OR username = ? OR matricule = ?) AND (role = \'SUPERADMIN\' OR school_id IS NULL)').get(username, normalizedUsername, username);
        }

        if (!user) return res.status(401).json({ error: 'Utilisateur ou mot de passe incorrect' });

        // Block login if user is deactivated
        if (user.isActive === 0) {
            return res.status(403).json({ error: "Votre compte a été désactivé. Veuillez contacter l'administration." });
        }

        user.full_name = user.fullName;

        // Block login if school is deleted or suspended
        if (user.role !== 'SUPERADMIN') {
            const school = db.prepare('SELECT deleted_at, is_active FROM schools WHERE id = ?').get(user.schoolId);
            if (school) {
                if (school.deleted_at !== null) {
                    return res.status(403).json({ error: "Cet établissement a été supprimé. Accès refusé." });
                }
                if (school.is_active === 0) {
                    return res.status(403).json({ error: "L'accès de cet établissement a été temporairement suspendu. Veuillez contacter l'administrateur." });
                }
            }
        }

        let isValid = false;
        if (user.hash.length === 64 && !user.hash.startsWith('$2a$')) {
            const oldHash = crypto.createHash('sha256').update(password).digest('hex');
            isValid = (oldHash === user.hash);
            if (isValid) {
                const newHash = bcrypt.hashSync(password, 10);
                db.prepare('UPDATE users SET password = ? WHERE id = ?').run(newHash, user.id);
            }
        } else {
            isValid = bcrypt.compareSync(password, user.hash);
        }

        if (isValid) {
            delete user.hash;
            // Todo: Implement standard web tokens (JWT/Session) for the SaaS version
            // For now, we return the user object like Electron did
                        const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
            return res.json({ success: true, user, token });
        }
        
        return res.status(401).json({ error: 'Utilisateur ou mot de passe incorrect' });

    } catch (error) {
        console.error('Erreur login API:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

app.post('/api/auth/switchSchool', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    try {
        const token = authHeader.substring(7);
        const user = jwt.verify(token, JWT_SECRET);
        if (user.role !== 'SUPERADMIN') return res.status(403).json({ error: 'Unauthorized' });
        const { schoolId } = req.body;
        const updatedUser = { ...user, schoolId: schoolId || null };
        delete updatedUser.iat;
        delete updatedUser.exp;
        const newToken = jwt.sign(updatedUser, JWT_SECRET, { expiresIn: '7d' });
        res.json({ success: true, token: newToken });
    } catch (e) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

// ==========================================
// ROUTES SUPER ADMIN (Gestion SaaS)
// ==========================================

// Récupérer toutes les écoles (Pour le tableau de bord SuperAdmin)
app.get('/api/saas/schools', (req, res) => {
    try {
        // Todo: Add authentication middleware to verify SuperAdmin token
        const schools = db.prepare('SELECT * FROM schools WHERE deleted_at IS NULL').all();
        res.json({ success: true, schools });
    } catch (error) {
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

// Valider un paiement en espèces et activer/renouveler l'abonnement
app.post('/api/saas/validate-payment', (req, res) => {
    const { schoolId, monthsGranted, amount, superAdminId } = req.body;
    
    try {
        const transaction = db.transaction(() => {
            // 1. Enregistrer le paiement
            db.prepare(`
                INSERT INTO saas_subscriptions (school_id, amount, payment_method, months_granted, start_date, end_date, status, validated_by)
                VALUES (?, ?, 'CASH', ?, date('now'), date('now', '+' || ? || ' months'), 'VALIDATED', ?)
            `).run(schoolId, amount, monthsGranted, monthsGranted, superAdminId);

            // 2. Mettre à jour la date de fin d'abonnement de l'école
            db.prepare(`
                UPDATE schools 
                SET subscription_status = 'ACTIVE', 
                    subscription_end_date = date(COALESCE(subscription_end_date, date('now')), '+' || ? || ' months'),
                    is_active = 1
                WHERE id = ?
            `).run(monthsGranted, schoolId);
        });

        transaction();
        res.json({ success: true, message: 'Paiement validé et abonnement renouvelé avec succès.' });
    } catch (error) {
        console.error('Erreur validation paiement:', error);
        res.status(500).json({ error: 'Impossible de valider le paiement.' });
    }
});


// Gestionnaire d'erreur global pour toutes les routes /api (retourne toujours du JSON)
app.use('/api', (err, req, res, next) => {
    console.error('[API Uncaught Error]', err?.message || err);
    if (res.headersSent) return next(err);
    res.status(500).json({ error: err?.message || 'Erreur interne du serveur' });
});

// ==========================================
// SERVEUR FRONTEND (React)
// ==========================================
// Si on n'appelle pas l'API, on affiche le site web
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath, {
    setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
    }
}));
app.get(/.*/, (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(distPath, 'index.html'));
});

// Job périodique : auto-désactiver la saisie des notes quand la deadline est passée
const checkDeadlines = () => {
    try {
        const schools = db.prepare('SELECT id FROM schools WHERE deleted_at IS NULL').all();
        const now = new Date();
        now.setHours(23, 59, 59, 999);
        for (const school of schools) {
            const prefix = `s${school.id}_`;
            const endSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get(`${prefix}period_end`);
            const allowedSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get(`${prefix}period_editing_allowed`);
            if (endSetting && allowedSetting && allowedSetting.value === 'true') {
                const endDate = new Date(endSetting.value);
                endDate.setHours(23, 59, 59, 999);
                if (now > endDate) {
                    db.prepare("INSERT INTO settings (key, value) VALUES (?, 'false') ON CONFLICT(key) DO UPDATE SET value = 'false'").run(`${prefix}period_editing_allowed`);
                    console.log(`[Auto] Saisie des notes désactivée pour l'école ${school.id} (deadline ${endSetting.value} dépassée)`);
                }
            }
        }
    } catch (e) {
        console.error('[Auto] Erreur vérification deadlines:', e.message);
    }
};

// Démarrage
app.listen(port, '0.0.0.0', () => {
    console.log(`[🚀 SaaS Cloud] Serveur démarré et accessible sur le port ${port}`);
    checkDeadlines();
    setInterval(checkDeadlines, 60 * 60 * 1000);
});
