const express = require('express');
const path = require('path');
const config = require('./config');
const apiRoutes = require('./routes/api');

const app = express();

// Parse JSON request bodies
app.use(express.json({ limit: '10mb' }));

// Mount API routes
app.use('/api', apiRoutes);

// Secure static file serving: exclusively serve Frontend directory
app.use(express.static(config.FRONTEND_DIR, { dotfiles: 'ignore' }));

// Explicit static route mounts for backwards compatibility
app.use('/dashboard', express.static(path.join(config.FRONTEND_DIR, 'dashboard'), { dotfiles: 'ignore' }));
app.use('/markers', express.static(config.MARKERS_DIR, { dotfiles: 'ignore' }));
app.use('/assets', express.static(path.join(config.FRONTEND_DIR, 'assets'), { dotfiles: 'ignore' }));

module.exports = app;
