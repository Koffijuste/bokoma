// tests/unit/payment-flow.test.js
// ============================================================================
// 💳 Tests unitaires — payment-flow.service.js (helpers)
// ============================================================================

const {
  computePaymentAmounts,
  normalizePhoneNumber,
  resolveCinetPayMethod,
  buildPaymentDescription,
  OPERATOR_MAP,
  DEFAULT_PHONE,
  PARTIAL_PAYMENT_RATIO,
} = require('../../src/services/payment-flow.service');

describe('payment-flow.service — helpers', () => {
  // ───────────────────────────────────────────────────────────────────────
  describe('computePaymentAmounts', () => {
    it('50% acompte + reste pour cash_on_delivery', () => {
      const result = computePaymentAmounts(10000, 'cash_on_delivery');
      expect(result.paymentAmount).toBe(5000);
      expect(result.remainingAmount).toBe(5000);
      expect(result.isPartialPayment).toBe(true);
    });

    it('arrondi au supérieur (ceil) pour les valeurs impaires', () => {
      const result = computePaymentAmounts(10001, 'cash_on_delivery');
      // 50% de 10001 = 5000.5 → ceil = 5001
      expect(result.paymentAmount).toBe(5001);
      expect(result.remainingAmount).toBe(5000);
    });

    it('paiement intégral pour mobile_money', () => {
      const result = computePaymentAmounts(10000, 'mobile_money');
      expect(result.paymentAmount).toBe(10000);
      expect(result.remainingAmount).toBe(0);
      expect(result.isPartialPayment).toBe(false);
    });

    it('paiement intégral pour card', () => {
      const result = computePaymentAmounts(25000, 'card');
      expect(result.paymentAmount).toBe(25000);
      expect(result.remainingAmount).toBe(0);
      expect(result.isPartialPayment).toBe(false);
    });

    it('ratio configurable via constante', () => {
      expect(PARTIAL_PAYMENT_RATIO).toBe(0.5);
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  describe('normalizePhoneNumber', () => {
    it('gère le format +225XXXXXXXXXX', () => {
      expect(normalizePhoneNumber('+2250707070707')).toBe('+2250707070707');
    });

    it('gère le format 00225XXXXXXXXXX', () => {
      expect(normalizePhoneNumber('002250707070707')).toBe('+2250707070707');
    });

    it('gère le format 225XXXXXXXXXX (sans +)', () => {
      expect(normalizePhoneNumber('2250707070707')).toBe('+2250707070707');
    });

    it('gère le format 0XXXXXXXXXX (local)', () => {
      expect(normalizePhoneNumber('0707070707')).toBe('+2250707070707');
    });

    it('supprime les espaces, tirets et parenthèses', () => {
      expect(normalizePhoneNumber('07 07 07 07 07')).toBe('+2250707070707');
      expect(normalizePhoneNumber('07-07-07-07-07')).toBe('+2250707070707');
      expect(normalizePhoneNumber('(07) 07 07 07 07')).toBe('+2250707070707');
    });

    it('retourne le numéro par défaut si input vide', () => {
      expect(normalizePhoneNumber(null)).toBe(DEFAULT_PHONE);
      expect(normalizePhoneNumber(undefined)).toBe(DEFAULT_PHONE);
      expect(normalizePhoneNumber('')).toBe(DEFAULT_PHONE);
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  describe('resolveCinetPayMethod', () => {
    it('mappe les opérateurs Mobile Money correctement', () => {
      expect(resolveCinetPayMethod('mobile_money', 'OM')).toBe('OM_CI');
      expect(resolveCinetPayMethod('mobile_money', 'MTN')).toBe('MTN_CI');
      expect(resolveCinetPayMethod('mobile_money', 'WAVE')).toBe('WAVE_CI');
      expect(resolveCinetPayMethod('mobile_money', 'MOOV')).toBe('MOOV_CI');
    });

    it('utilise CARD pour la méthode card', () => {
      expect(resolveCinetPayMethod('card', null)).toBe('CARD');
      expect(resolveCinetPayMethod('card', 'OM')).toBe('OM_CI'); // operator prime
    });

    it('utilise OM_CI par défaut si aucun opérateur spécifié', () => {
      expect(resolveCinetPayMethod('mobile_money', null)).toBe('OM_CI');
      expect(resolveCinetPayMethod('mobile_money', undefined)).toBe('OM_CI');
    });

    it('exporte le mapping complet', () => {
      expect(OPERATOR_MAP).toEqual({
        OM: 'OM_CI',
        MTN: 'MTN_CI',
        WAVE: 'WAVE_CI',
        MOOV: 'MOOV_CI',
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  describe('buildPaymentDescription', () => {
    it('description simple pour paiement intégral', () => {
      const desc = buildPaymentDescription('CMD-ABC123', 10000, false, 0);
      expect(desc).toBe('Commande Bokoma #CMD-ABC123');
    });

    it('description détaillée pour paiement partiel (COD)', () => {
      const desc = buildPaymentDescription('CMD-ABC123', 10000, true, 5000);
      expect(desc).toContain('Acompte 50%');
      expect(desc).toContain('CMD-ABC123');
      expect(desc).toContain('5000 FCFA à la livraison');
    });
  });
});