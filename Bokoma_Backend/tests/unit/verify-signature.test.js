// tests/unit/verify-signature.test.js
// ============================================================================
// 🔐 Tests unitaires — middleware verifyCinetPaySignature
// ============================================================================

const crypto = require('crypto');
const verifyCinetPaySignature = require('../../src/middlewares/verifyCinetPaySignature');

const SECRET = 'test-webhook-secret-abc123';

const buildReq = ({ rawBody, signature, timestamp } = {}) => {
  const body = rawBody || JSON.stringify({ transaction_id: 'CMD-123', status: 'ACCEPTED', timestamp });
  const buf = Buffer.from(body);
  const headers = {};
  if (signature !== undefined) headers['x-cinetpay-signature'] = signature;
  return {
    headers,
    rawBody: buf,
    body: JSON.parse(body),
  };
};

const buildRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('verifyCinetPaySignature middleware', () => {
  // ───────────────────────────────────────────────────────────────────────
  describe('avec signature valide', () => {
    it('appelle next() et marque req.webhookVerified = true', () => {
      const body = { transaction_id: 'CMD-XYZ', status: 'ACCEPTED', timestamp: new Date().toISOString() };
      const bodyStr = JSON.stringify(body);
      const sig = crypto.createHmac('sha256', SECRET).update(bodyStr).digest('hex');

      const req = buildReq({ rawBody: bodyStr, signature: sig });
      const res = buildRes();
      const next = jest.fn();

      const middleware = verifyCinetPaySignature({ secret: SECRET, allowInsecure: false });
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.webhookVerified).toBe(true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  describe('avec signature invalide', () => {
    it('rejette 401 si signature différente', () => {
      const body = JSON.stringify({ transaction_id: 'CMD-XYZ', status: 'ACCEPTED' });
      const wrongSig = crypto.createHmac('sha256', 'OTHER-SECRET').update(body).digest('hex');

      const req = buildReq({ rawBody: body, signature: wrongSig });
      const res = buildRes();
      const next = jest.fn();

      const middleware = verifyCinetPaySignature({ secret: SECRET, allowInsecure: false });
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 401 }),
      );
      expect(req.webhookVerified).toBeUndefined();
    });

    it('rejette 401 si signature manquante en mode strict', () => {
      const req = buildReq({ signature: undefined });
      const res = buildRes();
      const next = jest.fn();

      const middleware = verifyCinetPaySignature({ secret: SECRET, allowInsecure: false });
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 401 }),
      );
    });

    it('rejette 401 si longueur de signature différente', () => {
      const body = JSON.stringify({ transaction_id: 'CMD-XYZ' });
      const req = buildReq({ rawBody: body, signature: 'short' });
      const res = buildRes();
      const next = jest.fn();

      const middleware = verifyCinetPaySignature({ secret: SECRET, allowInsecure: false });
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 401 }),
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  describe('mode dev (allowInsecure)', () => {
    it('autorise sans signature en dev', () => {
      const req = buildReq({ signature: undefined });
      const res = buildRes();
      const next = jest.fn();

      const middleware = verifyCinetPaySignature({ secret: SECRET, allowInsecure: true });
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.webhookVerified).toBe(false);
    });

    it('autorise sans secret configuré en dev', () => {
      const req = buildReq({ signature: 'anything' });
      const res = buildRes();
      const next = jest.fn();

      const middleware = verifyCinetPaySignature({ secret: null, allowInsecure: true });
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.webhookVerified).toBe(false);
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  describe('anti-replay (timestamp)', () => {
    it('rejette un timestamp trop ancien (>5 min)', () => {
      const oldTimestamp = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const body = JSON.stringify({ transaction_id: 'CMD-XYZ', status: 'ACCEPTED', timestamp: oldTimestamp });
      const sig = crypto.createHmac('sha256', SECRET).update(body).digest('hex');

      const req = buildReq({ rawBody: body, signature: sig });
      const res = buildRes();
      const next = jest.fn();

      const middleware = verifyCinetPaySignature({ secret: SECRET, allowInsecure: false });
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 401 }),
      );
    });

    it('accepte un timestamp récent', () => {
      const recentTimestamp = new Date().toISOString();
      const body = JSON.stringify({ transaction_id: 'CMD-XYZ', status: 'ACCEPTED', timestamp: recentTimestamp });
      const sig = crypto.createHmac('sha256', SECRET).update(body).digest('hex');

      const req = buildReq({ rawBody: body, signature: sig });
      const res = buildRes();
      const next = jest.fn();

      const middleware = verifyCinetPaySignature({ secret: SECRET, allowInsecure: false });
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.webhookVerified).toBe(true);
    });

    it('ignore le timestamp absent (pas obligatoire)', () => {
      const body = JSON.stringify({ transaction_id: 'CMD-XYZ', status: 'ACCEPTED' });
      const sig = crypto.createHmac('sha256', SECRET).update(body).digest('hex');

      const req = buildReq({ rawBody: body, signature: sig });
      const res = buildRes();
      const next = jest.fn();

      const middleware = verifyCinetPaySignature({ secret: SECRET, allowInsecure: false });
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  describe('edge cases', () => {
    it('rejette 400 si rawBody manquant', () => {
      const req = { headers: { 'x-cinetpay-signature': 'x' }, rawBody: null };
      const res = buildRes();
      const next = jest.fn();

      const middleware = verifyCinetPaySignature({ secret: SECRET, allowInsecure: false });
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 400 }),
      );
    });

    it('rejette 500 si secret non configuré en prod', () => {
      const req = buildReq({ signature: 'anything' });
      const res = buildRes();
      const next = jest.fn();

      const middleware = verifyCinetPaySignature({ secret: null, allowInsecure: false });
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 500 }),
      );
    });
  });
});