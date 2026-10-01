const { db, logActivity } = require('../config/database');

// GET /api/auth/users - List users
exports.getUsers = (req, res) => {
  try {
    const users = db.prepare('SELECT id, username, email, full_name, role, avatar_url, auth_provider, created_at FROM users ORDER BY id ASC').all();
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};


// POST /api/auth/register - User Registration with create password & confirm password
exports.register = (req, res) => {
  try {
    const { username, full_name, email, password, confirm_password, role = 'Staff' } = req.body;

    // 1. Validation
    if (!username || !username.trim()) {
      return res.status(400).json({ success: false, error: 'Username is required' });
    }
    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ success: false, error: 'Full name is required' });
    }
    if (!password || password.length < 4) {
      return res.status(400).json({ success: false, error: 'Password must be at least 4 characters long' });
    }
    if (password !== confirm_password) {
      return res.status(400).json({ success: false, error: 'Passwords do not match. Please verify your confirm password.' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanFullName = full_name.trim();
    const cleanEmail = email && email.trim() !== '' ? email.trim().toLowerCase() : `${cleanUsername}@warehousepro.io`;
    const validRoles = ['Admin', 'Warehouse Manager', 'Staff'];
    const assignedRole = validRoles.includes(role) ? role : 'Staff';

    // 2. Check if username or email already exists
    const existingUser = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(cleanUsername, cleanEmail);
    if (existingUser) {
      return res.status(400).json({ success: false, error: `Username '${cleanUsername}' or email '${cleanEmail}' is already registered.` });
    }

    // Default avatar
    const defaultAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanFullName)}&backgroundColor=2563eb`;

    // 3. Insert new user into SQLite
    const stmt = db.prepare(`
      INSERT INTO users (username, password, email, full_name, role, avatar_url, auth_provider)
      VALUES (?, ?, ?, ?, ?, ?, 'local')
    `);

    const result = stmt.run(cleanUsername, password, cleanEmail, cleanFullName, assignedRole, defaultAvatar);
    const newUserId = result.lastInsertRowid;

    logActivity('USER_REGISTERED', 'USER', newUserId, `User ${cleanUsername} (${cleanEmail}) registered as ${assignedRole}`, assignedRole);

    const createdUser = db.prepare('SELECT id, username, email, full_name, role, avatar_url, auth_provider, created_at FROM users WHERE id = ?').get(newUserId);

    res.status(201).json({
      success: true,
      message: 'Account successfully registered!',
      user: createdUser
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/auth/login - Local User Login
exports.login = (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const user = db.prepare(`
      SELECT id, username, password, email, full_name, role, avatar_url, auth_provider 
      FROM users 
      WHERE username = ? OR email = ?
    `).get(cleanUsername, cleanUsername);

    if (!user || user.password !== password) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password. Please verify your credentials and try again.'
      });
    }

    logActivity('USER_LOGIN', 'USER', user.id, `User ${user.username} logged in via local credentials`, user.role);

    res.json({
      success: true,
      message: `Welcome back, ${user.full_name}!`,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        avatar_url: user.avatar_url,
        auth_provider: user.auth_provider
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/auth/google - Google Account Authentication & Authorization
exports.googleLogin = (req, res) => {
  try {
    const { google_id, email, full_name, avatar_url, role = 'Staff' } = req.body;

    if (!email || !full_name) {
      return res.status(400).json({ success: false, error: 'Google authentication profile is incomplete (email and name are required)' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = full_name.trim();
    const gid = google_id || `g_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    // 1. Check if user already exists in SQLite by email or google_id
    let user = db.prepare('SELECT * FROM users WHERE email = ? OR google_id = ?').get(cleanEmail, gid);

    if (user) {
      // Update Google profile details
      db.prepare(`
        UPDATE users SET 
          google_id = COALESCE(google_id, ?),
          avatar_url = COALESCE(?, avatar_url),
          full_name = COALESCE(?, full_name)
        WHERE id = ?
      `).run(gid, avatar_url, cleanName, user.id);

      user = db.prepare('SELECT id, username, email, full_name, role, avatar_url, auth_provider, created_at FROM users WHERE id = ?').get(user.id);
      logActivity('USER_GOOGLE_LOGIN', 'USER', user.id, `User ${user.email} authenticated via Google Sign-In`, user.role);

      return res.json({
        success: true,
        message: `Authenticated with Google as ${user.full_name}`,
        auth_provider: 'google',
        user
      });
    } else {
      // 2. Auto-provision new Google Account
      const baseUsername = cleanEmail.split('@')[0].replace(/[^a-z0-9_]/g, '') || `g_user_${Date.now().toString().slice(-4)}`;
      let finalUsername = baseUsername;
      let counter = 1;
      while (db.prepare('SELECT id FROM users WHERE username = ?').get(finalUsername)) {
        finalUsername = `${baseUsername}${counter++}`;
      }

      const assignedRole = ['Admin', 'Warehouse Manager', 'Staff'].includes(role) ? role : 'Staff';
      const avatar = avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}&backgroundColor=2563eb`;

      const insertStmt = db.prepare(`
        INSERT INTO users (username, password, email, full_name, role, avatar_url, google_id, auth_provider)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'google')
      `);

      const result = insertStmt.run(
        finalUsername,
        'GOOGLE_OAUTH_VERIFIED', // Placeholder token for Google SSO account
        cleanEmail,
        cleanName,
        assignedRole,
        avatar,
        gid
      );

      const newUser = db.prepare('SELECT id, username, email, full_name, role, avatar_url, auth_provider, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);

      logActivity('USER_GOOGLE_REGISTERED', 'USER', newUser.id, `New Google user ${cleanEmail} registered as ${assignedRole}`, assignedRole);

      return res.status(201).json({
        success: true,
        message: `Google Account registered successfully as ${newUser.full_name}!`,
        auth_provider: 'google',
        user: newUser
      });
    }
  } catch (error) {
    console.error('googleLogin error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/auth/me - Current user session
exports.getCurrentUser = (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
};
