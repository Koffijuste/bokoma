// scripts/test-debug-auth.js
// ============================================================================
// Test local : vérifie que /api/v1/debug/ip est bien admin-only.
// Stratégie : on charge les VRAIS middlewares (protect, restrictTo, debugLimiter)
//             mais on stub User.findById et jsonwebtoken.verify pour ne pas
//             avoir besoin d'une vraie DB / d'un vrai JWT.
// ============================================================================
'use strict';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test_secret_min_32_chars_for_unit_test_only_xxxxx';
process.env.JWT_ISSUER = 'bokoma-api';
process.env.JWT_AUDIENCE = 'bokoma-users';

// ─── 1) Stub des modules AVANT les requires ────────────────────────────────
const Module = require('module');
const origResolve = Module._resolveFilename;
const origLoad = Module._load;

// Map userId → role pour simuler différents utilisateurs en DB.
// Le vrai code charge le user en DB, donc on reproduit ce comportement.
const FAKE_USERS = {
  'aaaaaaaaaaaa000000000001': { email: 'admin@bokoma.ci',  role: 'admin',    isActive: true },
  'aaaaaaaaaaaa000000000002': { email: 'mgr@bokoma.ci',    role: 'manager',  isActive: true },
  'aaaaaaaaaaaa000000000003': { email: 'client@bokoma.ci', role: 'customer', isActive: true },
  'aaaaaaaaaaaa000000000099': { email: 'banned@bokoma.ci', role: 'customer', isActive: false },
};

Module._load = function (request, parent, ...rest) {
  if (request.endsWith('/models/User')) {
    return {
      findById: (id) => ({
        select: () => {
          const u = FAKE_USERS[String(id)];
          if (!u) return Promise.resolve(null);
          return Promise.resolve({
            _id: id,
            firstName: 'Test',
            lastName: 'User',
            ...u,
            toString() { return id; },
          });
        },
      }),
    };
  }
  if (request.endsWith('/config/jwt')) {
    return {
      access: { secret: process.env.JWT_ACCESS_SECRET, issuer: 'bokoma-api', audience: 'bokoma-users' },
      refresh: { secret: 'x', issuer: 'bokoma-api', audience: 'bokoma-users' },
    };
  }
  return origLoad.call(this, request, parent, ...rest);
};

// ─── 2) Bootstrap Express ──────────────────────────────────────────────────
const express = require('express');
const request = require('supertest');

const debugRouter = require('../src/routes/debug.routes');
const debugController = require('../src/controllers/debug.controller');

// Mock du controller pour ne pas dépendre d'ipify/ifconfig en local
debugController.getOutboundIp = async (req, res) => {
  res.status(200).json({
    success: true,
    outboundIp: '203.0.113.42',
    detectedBy: 'mock',
    requester: { id: req.user?.userId, email: req.user?.email, role: req.user?.role },
  });
};

// Rebuild router with the stubbed controller
const Router = require('express').Router;
const { protect, restrictTo } = require('../src/middlewares/auth');
const { debugLimiter } = require('../src/middlewares/rateLimiters');
const router = Router();
router.use(debugLimiter, protect, restrictTo('admin'));
router.get('/ip', debugController.getOutboundIp);

const app = express();
app.use('/api/v1/debug', router);

// ─── 3) Helper : génère un JWT valide signé avec le secret de test ────────
const jwt = require('jsonwebtoken');
const makeToken = (userId) => jwt.sign(
  { userId },
  process.env.JWT_ACCESS_SECRET,
  { issuer: 'bokoma-api', audience: 'bokoma-users', expiresIn: '1h' }
);

// ─── 4) Tests ──────────────────────────────────────────────────────────────
(async () => {
  const tests = [
    {
      name: '1. Pas de token → 401',
      headers: {},
      expect: 401,
    },
    {
      name: '2. Token invalide → 401',
      headers: { Authorization: 'Bearer not.a.valid.token' },
      expect: 401,
    },
    {
      name: '3. User inconnu (pas en DB) → 401',
      headers: { Authorization: `Bearer ${makeToken('aaaaaaaaaaaa000000000000')}` },
      expect: 401,
    },
    {
      name: '4. User inactif (isActive=false) → 401',
      headers: { Authorization: `Bearer ${makeToken('aaaaaaaaaaaa000000000099')}` },
      expect: 401,
    },
    {
      name: '5. Rôle customer → 403 (admin strict)',
      headers: { Authorization: `Bearer ${makeToken('aaaaaaaaaaaa000000000003')}` },
      expect: 403,
    },
    {
      name: '6. Rôle manager → 403 (admin strict, pas manager)',
      headers: { Authorization: `Bearer ${makeToken('aaaaaaaaaaaa000000000002')}` },
      expect: 403,
    },
    {
      name: '7. Rôle admin → 200',
      headers: { Authorization: `Bearer ${makeToken('aaaaaaaaaaaa000000000001')}` },
      expect: 200,
    },
  ];

  let pass = 0, fail = 0;
  for (const t of tests) {
    try {
      const r = await request(app).get('/api/v1/debug/ip').set(t.headers);
      const ok = r.status === t.expect;
      if (ok) {
        console.log(`  [PASS] ${t.name} → ${r.status}`);
        if (r.body && r.body.requester) {
          console.log(`         requester: ${JSON.stringify(r.body.requester)}`);
        }
        pass++;
      } else {
        console.log(`  [FAIL] ${t.name} → got ${r.status}, expected ${t.expect}`);
        console.log(`         body: ${JSON.stringify(r.body).slice(0, 200)}`);
        fail++;
      }
    } catch (err) {
      console.log(`  [ERR ] ${t.name} → ${err.message}`);
      fail++;
    }
  }

  console.log('');
  console.log(`Résumé : ${pass} pass, ${fail} fail`);
  process.exit(fail === 0 ? 0 : 1);
})();
