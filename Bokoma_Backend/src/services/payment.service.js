// src/services/payment.service.js
const axios = require('axios');
const AppError = require('../utils/AppError');

class PaymentService {
  constructor() {
    this.apiKey = process.env.CINETPAY_API_KEY;
    this.apiPassword = process.env.CINETPAY_API_PASSWORD_CI;
    this.baseUrl = process.env.CINETPAY_API_URL || 'https://api.cinetpay.net';
    this.clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';

    this.accessToken = null;
    this.tokenExpiry = null;
  }

  isConfigured() {
    return !!(this.apiKey && this.apiPassword && this.baseUrl);
  }

  async authenticate() {
    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/oauth/login`,
        { api_key: this.apiKey, api_password: this.apiPassword },
        { headers: { 'Content-Type': 'application/json' }, timeout: 10_000 }
      );

      const token = response.data.access_token || response.data.token;
      if (!token) throw new AppError('Token CinetPay non reçu', 401);

      this.accessToken = token;
      this.tokenExpiry = Date.now() + (response.data.expires_in ?? 3600) * 1000;
      return token;
    } catch (err) {
      throw err;
    }
  }

  async getAccessToken() {
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry - 30_000) {
      return this.accessToken;
    }
    return this.authenticate();
  }

  async initializePayment({
    transactionId,
    amount,
    description,
    customer,
    orderId,
    payment_method = 'OM_CI',
  }) {
    const token = await this.getAccessToken();
    const safeAmount = Math.round(Number(amount) / 5) * 5;

    const successUrl = `${this.clientUrl}/payment/success?orderId=${orderId}`;
    const failedUrl = `${this.clientUrl}/payment/echec?orderId=${orderId}`;
    const notifyUrl = `${process.env.API_URL}/api/v1/webhook/cinetpay`;

    const payload = {
      currency: 'XOF',
      payment_method,
      merchant_transaction_id: transactionId,
      amount: safeAmount,
      success_url: successUrl,
      failed_url: failedUrl,
      notify_url: notifyUrl,
      lang: 'fr',
      designation: description || 'Commande Bokoma Store',
      client_first_name: String(customer?.name || 'Client').slice(0, 255),
      client_last_name: String(customer?.surname || 'Bokoma').slice(0, 255),
      client_phone_number: String(customer?.phone || '+2250707070700'),
      client_email: String(customer?.email || 'client@bokoma.ci'),
      direct_pay: false,
    };

    const response = await axios.post(
      `${this.baseUrl}/v1/payment`,
      payload,
      {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        timeout: 15_000,
      }
    );

    const data = response.data;

    if (data.code === 200 || data.status === 'OK') {
      const paymentUrl = data.payment_url || `https://secure.cinetpay.net/checkout/${data.payment_token}`;
      return {
        success: true,
        paymentToken: data.payment_token,
        paymentUrl,
        transactionId: data.merchant_transaction_id || transactionId,
        notifyToken: data.notify_token,
      };
    }

    throw new AppError(data.description || 'Erreur initialisation paiement', 400);
  }

  // ✅ Amélioration : gestion robuste des erreurs
  async verifyPayment(transactionId) {
    try {
      const token = await this.getAccessToken();

      const response = await axios.get(
        `${this.baseUrl}/v1/payment/${transactionId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10_000,
          validateStatus: () => true, // ✅ Ne pas lancer d'erreur sur 4xx/5xx
        }
      );

      // ✅ Gérer les codes HTTP d'erreur
      if (response.status >= 400) {
        return {
          success: false,
          status: 'ERROR',
          error: `HTTP ${response.status}: ${response.data?.message || response.statusText}`,
          transactionId
        };
      }

      const data = response.data;

      if (data.code === 100 || data.status === 'SUCCESS') {
        return { success: true, status: 'SUCCESS', amount: data.amount, transactionId };
      }

      if (['FAILED', 'REFUSED', 'EXPIRED', 'CANCELED'].includes(data.status)) {
        return { success: false, status: data.status, transactionId };
      }

      return { success: false, status: data.status || 'PENDING', transactionId };
    } catch (err) {
      // ✅ Retourner une structure cohérente même en cas d'erreur
      return {
        success: false,
        status: 'ERROR',
        error: err.message,
        transactionId
      };
    }
  }
}

module.exports = new PaymentService();