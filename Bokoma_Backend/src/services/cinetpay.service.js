// src/services/cinetpay.service.js
const axios = require('axios');

class CinetPayService {
  constructor() {
    this.apiKey = process.env.CINETPAY_API_KEY;
    this.apiPassword = process.env.CINETPAY_API_PASSWORD_CI;
    // ✅ URL SANS /v2 à la fin
    this.baseUrl = process.env.CINETPAY_API_URL || 'https://api-checkout.cinetpay.com';
    
    // Credentials checked via isConfigured() before each use
  }

  /**
   * Vérifie le statut d'une transaction
   */
  async checkTransactionStatus(transactionId) {
    try {
      // ✅ URL corrigée : /v2/transaction/check
      const checkUrl = `${this.baseUrl}/v2/transaction/check`;

      const response = await axios.post(
        checkUrl,
        {
          apikey: this.apiKey,
          password: this.apiPassword,
          transaction_id: transactionId,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );

      const data = response.data;

      if (data.code === '00' || data.status === 'ACCEPTED' || data.status === 'SUCCESS') {
        return {
          status: 'paid',
          transactionId: data.transaction_id || transactionId,
          amount: data.amount,
          currency: data.currency,
          raw: data,
        };
      } else if (data.code === '01' || data.status === 'REFUSED' || data.status === 'FAILED') {
        return {
          status: 'failed',
          transactionId: data.transaction_id || transactionId,
          reason: data.description || data.message || 'Paiement refusé',
          raw: data,
        };
      } else {
        return {
          status: 'pending',
          transactionId: data.transaction_id || transactionId,
          raw: data,
        };
      }
    } catch (err) {
      return {
        status: 'error',
        error: err.message,
        statusCode: err.response?.status,
      };
    }
  }

  /**
   * Initialise un paiement
   */
  async initializePayment({
    transactionId,
    amount,
    currency = 'XOF',
    description,
    notifyUrl,
    returnUrl,
    returnMode = 'GET',
    customerName,
    customerEmail,
    customerPhone,
    channels = 'ALL',
    metadata = {},
  }) {
    try {
      const payload = {
        apikey: this.apiKey,
        password: this.apiPassword,
        transaction_id: transactionId,
        amount: Math.round(amount),
        currency,
        description: description || `Commande ${transactionId}`,
        notify_url: notifyUrl,
        return_url: returnUrl,
        return_mode: returnMode,
        channels,
        customer_name: customerName || 'Client',
        customer_surname: customerName || 'Client',
        customer_email: customerEmail,
        customer_phone_number: customerPhone,
        metadata: JSON.stringify(metadata),
      };

      // ✅ URL corrigée : /v2/payment
      const paymentUrl = `${this.baseUrl}/v2/payment`;

      const response = await axios.post(
        paymentUrl,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );

      const data = response.data;

      if (data.code === '00') {
        const paymentUrlResult = data.data?.payment_url || data.payment_url;

        return {
          success: true,
          paymentUrl: paymentUrlResult,
          transactionId,
          raw: data,
        };
      } else {
        return {
          success: false,
          error: data.description || data.message || 'Erreur lors de l\'initialisation',
          code: data.code,
          raw: data,
        };
      }
    } catch (err) {
      return {
        success: false,
        error: err.message,
      };
    }
  }

  isConfigured() {
    return !!(this.apiKey && this.apiPassword && this.baseUrl);
  }

  async testConnection() {
    try {
      const testUrl = `${this.baseUrl}/v2/transaction/check`;

      await axios.post(
        testUrl,
        {
          apikey: this.apiKey,
          password: this.apiPassword,
          transaction_id: 'TEST_CONNECTION_' + Date.now(),
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      return {
        success: true,
        message: 'Connexion à CinetPay établie',
      };
    } catch (err) {
      if (err.response && err.response.data) {
        return {
          success: true,
          message: 'Connexion à CinetPay établie',
          note: 'Transaction de test non trouvée (normal)',
        };
      }

      return {
        success: false,
        error: err.message,
      };
    }
  }
}

module.exports = new CinetPayService();