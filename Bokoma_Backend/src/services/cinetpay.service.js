// src/services/cinetpay.service.js
const axios = require('axios');

class CinetPayService {
  constructor() {
    this.apiKey = process.env.CINETPAY_API_KEY;
    this.apiPassword = process.env.CINETPAY_API_PASSWORD;
    // ✅ URL SANS /v2 à la fin
    this.baseUrl = process.env.CINETPAY_API_URL || 'https://api-checkout.cinetpay.com';
    
    if (!this.apiKey || !this.apiPassword) {
      console.warn('⚠️ [CinetPay] API_KEY ou API_PASSWORD manquant dans .env');
    }
  }

  /**
   * Vérifie le statut d'une transaction
   */
  async checkTransactionStatus(transactionId) {
    try {
      console.log(`\n🔍 [CinetPay] ═══════════════════════════════════════`);
      console.log(`🔍 [CinetPay] Vérification transaction: ${transactionId}`);

      // ✅ URL corrigée : /v2/transaction/check
      const checkUrl = `${this.baseUrl}/v2/transaction/check`;
      console.log(`🔍 [CinetPay] URL: ${checkUrl}`);

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

      console.log('✅ [CinetPay] Réponse complète:', JSON.stringify(response.data, null, 2));

      const data = response.data;

      if (data.code === '00' || data.status === 'ACCEPTED' || data.status === 'SUCCESS') {
        console.log(`✅ [CinetPay] Transaction ${transactionId} = PAYÉE`);
        return {
          status: 'paid',
          transactionId: data.transaction_id || transactionId,
          amount: data.amount,
          currency: data.currency,
          raw: data,
        };
      } else if (data.code === '01' || data.status === 'REFUSED' || data.status === 'FAILED') {
        console.log(`❌ [CinetPay] Transaction ${transactionId} = ÉCHOUÉE`);
        return {
          status: 'failed',
          transactionId: data.transaction_id || transactionId,
          reason: data.description || data.message || 'Paiement refusé',
          raw: data,
        };
      } else {
        console.log(`⏳ [CinetPay] Transaction ${transactionId} = EN ATTENTE`);
        return {
          status: 'pending',
          transactionId: data.transaction_id || transactionId,
          raw: data,
        };
      }
    } catch (err) {
      console.error('❌ [CinetPay] Erreur vérification:', err.message);
      
      if (err.response?.status === 404) {
        console.error('❌ [CinetPay] ENDPOINT 404 - Vérifier l\'URL');
        console.error('   URLs possibles:');
        console.error('   - https://api-checkout.cinetpay.com/v2/transaction/check');
        console.error('   - https://api.cinetpay.com/v1/transaction/check');
      }
      
      if (err.response) {
        console.error('❌ [CinetPay] Status:', err.response.status);
        console.error('❌ [CinetPay] Data:', err.response.data);
      }
      
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
      console.log(`\n💳 [CinetPay] ═══════════════════════════════════════`);
      console.log('💳 [CinetPay] Initialisation paiement:', {
        transactionId,
        amount,
        currency,
        customerEmail,
      });

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

      console.log('💳 [CinetPay] Payload:', JSON.stringify(payload, null, 2));

      // ✅ URL corrigée : /v2/payment
      const paymentUrl = `${this.baseUrl}/v2/payment`;
      console.log(`💳 [CinetPay] URL: ${paymentUrl}`);

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

      console.log('✅ [CinetPay] Réponse initialisation:', JSON.stringify(response.data, null, 2));

      const data = response.data;

      if (data.code === '00') {
        const paymentUrlResult = data.data?.payment_url || data.payment_url;
        console.log(`✅ [CinetPay] URL de paiement: ${paymentUrlResult}`);
        
        return {
          success: true,
          paymentUrl: paymentUrlResult,
          transactionId,
          raw: data,
        };
      } else {
        console.error('❌ [CinetPay] Erreur initialisation:', data);
        return {
          success: false,
          error: data.description || data.message || 'Erreur lors de l\'initialisation',
          code: data.code,
          raw: data,
        };
      }
    } catch (err) {
      console.error('❌ [CinetPay] Erreur initialisation:', err.message);
      if (err.response) {
        console.error('❌ [CinetPay] Status:', err.response.status);
        console.error('❌ [CinetPay] Data:', err.response.data);
      }
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
      console.log('🧪 [CinetPay] Test de connexion...');
      
      const testUrl = `${this.baseUrl}/v2/transaction/check`;
      console.log(`🧪 [CinetPay] URL: ${testUrl}`);
      
      const response = await axios.post(
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

      console.log('✅ [CinetPay] Connexion réussie:', response.data);
      return {
        success: true,
        message: 'Connexion à CinetPay établie',
      };
    } catch (err) {
      if (err.response && err.response.data) {
        console.log('✅ [CinetPay] Connexion établie (API répond)');
        return {
          success: true,
          message: 'Connexion à CinetPay établie',
          note: 'Transaction de test non trouvée (normal)',
        };
      }
      
      console.error('❌ [CinetPay] Échec connexion:', err.message);
      return {
        success: false,
        error: err.message,
      };
    }
  }
}

module.exports = new CinetPayService();