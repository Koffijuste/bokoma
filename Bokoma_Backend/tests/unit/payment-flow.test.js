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

  // ───────────────────────────────────────────────────────────────────────
  // 🔒 Tests de NON-RÉGRESSION : vérifient qu'on envoie bien 50% à CinetPay
  //    pour les paiements cash_on_delivery, et JAMAIS le total.
  //    Bug historique : on écrasait amountPaid avec order.total, faisant
  //    apparaître le total comme "montant payé" et cassant l'UI admin
  //    et la page de confirmation.
  // ───────────────────────────────────────────────────────────────────────
  describe('🔒 NON-RÉGRESSION : acompte 50% pour cash_on_delivery', () => {
    it('un total de 20200 XOF débite 10100 XOF, pas le total', () => {
      const { paymentAmount, remainingAmount, isPartialPayment } =
        computePaymentAmounts(20200, 'cash_on_delivery');
      expect(paymentAmount).toBe(10100);
      expect(remainingAmount).toBe(10100);
      expect(isPartialPayment).toBe(true);
      // Le client est débité EXACTEMENT de 50% du total
      expect(paymentAmount).toBe(Math.ceil(20200 * 0.5));
    });

    it('un total impair (10001) arrondit le ceil vers le haut', () => {
      const { paymentAmount, remainingAmount } = computePaymentAmounts(10001, 'cash_on_delivery');
      // 50% de 10001 = 5000.5 → ceil = 5001
      expect(paymentAmount).toBe(5001);
      expect(remainingAmount).toBe(5000);
    });

    it('le total = paymentAmount + remainingAmount (pas de fuite)', () => {
      const totals = [5000, 10000, 19500, 20200, 50000, 100000, 99999];
      for (const t of totals) {
        const { paymentAmount, remainingAmount } = computePaymentAmounts(t, 'cash_on_delivery');
        expect(paymentAmount + remainingAmount).toBe(t);
      }
    });

    it('le ratio est exactement 50% (pas 60%, pas 100%)', () => {
      const { paymentAmount } = computePaymentAmounts(50000, 'cash_on_delivery');
      // 50000 * 0.5 = 25000 exactement
      expect(paymentAmount).toBe(25000);
      expect(paymentAmount / 50000).toBe(0.5);
    });

    it('mobile_money débite le TOTAL intégral (pas 50%)', () => {
      const { paymentAmount, remainingAmount, isPartialPayment } =
        computePaymentAmounts(20200, 'mobile_money');
      expect(paymentAmount).toBe(20200);
      expect(remainingAmount).toBe(0);
      expect(isPartialPayment).toBe(false);
    });

    it('card débite le TOTAL intégral (pas 50%)', () => {
      const { paymentAmount, remainingAmount, isPartialPayment } =
        computePaymentAmounts(20200, 'card');
      expect(paymentAmount).toBe(20200);
      expect(remainingAmount).toBe(0);
      expect(isPartialPayment).toBe(false);
    });

    it('PARTIAL_PAYMENT_RATIO est bien 0.5 (pas modifié par erreur)', () => {
      expect(PARTIAL_PAYMENT_RATIO).toBe(0.5);
    });
  });
});