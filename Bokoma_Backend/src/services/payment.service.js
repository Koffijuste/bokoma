// src/services/payment.service.js
const axios = require('axios');
const AppError = require('../utils/AppError');

class PaymentService {
  constructor() {
    this.apiKey = process.env.CINETPAY_API_KEY;
    this.apiPassword = process.env.CINETPAY_API_PASSWORD_CI;
    this.baseUrl = process.env.CINETPAY_API_URL || 'https://api.cinetpay.net';
    
    this.accessToken = null;
    this.tokenExpiry = null;
    
    console.log('✅ [CinetPay] Initialized:', {
      apiKey: this.apiKey ? `${this.apiKey.slice(0, 15)}...` : 'MISSING',
      baseUrl: this.baseUrl,
    });
  }

  async authenticate() {
    console.log('\n🔐 [CinetPay] Authenticating...');
    
    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/oauth/login`,
        {
          api_key: this.apiKey,
          api_password: this.apiPassword,
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        }
      );
      
      const data = response.data;
      
      // ✅ Le token est dans access_token (pas data.token)
      const token = data.access_token || data.data?.token || data.token;
      
      if (token) {
        this.accessToken = token;
        this.tokenExpiry = Date.now() + (data.expires_in * 1000); // Utiliser expires_in
        console.log('✅ [CinetPay] Authenticated, token expires in', data.expires_in, 'seconds');
        return token;
      }
      
      throw new AppError('Token non reçu', 401);
      
    } catch (error) {
      const errData = error.response?.data;
      console.error('❌ [CinetPay] Auth Error:', errData || error.message);
      throw new AppError(errData?.description || 'Authentification échouée', 401);
    }
  }

  async getAccessToken() {
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry - 30000) {
      return this.accessToken;
    }
    return await this.authenticate();
  }

  initializePayment = async ({
    transactionId,
    amount,
    description,
    customer,
    return_url,
    notify_url,
    payment_method = 'OM_CI',
  }) => {
    try {
      const token = await this.getAccessToken();
      const safeAmount = Math.round(Number(amount) / 5) * 5;

      // ✅ S'assurer que tous les champs sont des strings
      const payload = {
        currency: 'XOF',
        payment_method: payment_method,
        merchant_transaction_id: transactionId,
        amount: safeAmount,
        success_url: return_url,
        failed_url: return_url,
        notify_url: notify_url,
        lang: 'fr',
        designation: description || 'Commande Bokoma Store',
        client_first_name: String(customer?.name || 'Client').slice(0, 255),
        client_last_name: String(customer?.surname || 'Bokoma').slice(0, 255),
        client_phone_number: String(customer?.phone || '+2250707070700'), // ✅ String obligatoire
        client_email: String(customer?.email || 'client@bokoma.ci'),
        direct_pay: false,
      };

      console.log('\n💳 [CinetPay] Initializing payment:', {
        transactionId,
        amount: safeAmount,
        phone: payload.client_phone_number,
      });

      const response = await axios.post(
        `${this.baseUrl}/v1/payment`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          timeout: 15000,
        }
      );

      const data = response.data;
      console.log('📥 [CinetPay] Payment response:', JSON.stringify(data, null, 2));

      if (data.code === 200 || data.status === 'OK') {
        // ✅ Construire l'URL de paiement si absente
        const paymentUrl = data.payment_url || 
          `https://secure.cinetpay.net/checkout/${data.payment_token}`;
        
        console.log('✅ [CinetPay] Payment initialized');
        console.log('   payment_url:', paymentUrl);
        
        return {
          success: true,
          paymentToken: data.payment_token,
          paymentUrl: paymentUrl,
          transactionId: data.merchant_transaction_id || transactionId,
          notifyToken: data.notify_token,
        };
      }

      throw new AppError(data.description || data.message || 'Erreur initialisation paiement', 400);

    } catch (error) {
      console.error('❌ [CinetPay] Error:', error.response?.data || error.message);
      
      if (error instanceof AppError) throw error;
      
      const apiError = error.response?.data;
      throw new AppError(
        apiError?.description || apiError?.message || 'Impossible d\'initialiser le paiement',
        500
      );
    }
  }

  verifyPayment = async (transactionId) => {
    try {
      const token = await this.getAccessToken();
      
      const response = await axios.get(
        `${this.baseUrl}/v1/payment/${transactionId}`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
          timeout: 10000,
        }
      );

      const data = response.data;

      if (data.code === 100 || data.status === 'SUCCESS') {
        return {
          success: true,
          status: 'SUCCESS',
          amount: data.amount,
          transactionId: data.merchant_transaction_id || transactionId,
        };
      }

      return {
        success: false,
        status: data.status || 'UNKNOWN',
      };

    } catch (error) {
      console.error('❌ [CinetPay] Verify Error:', error.response?.data || error.message);
      throw new AppError('Impossible de vérifier le paiement', 500);
    }
  }
}

module.exports = new PaymentService();