/**
 * Mastercard Service
 *
 * Handles Mastercard Agent Pay API integration
 */

const axios = require('axios');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

class MastercardService {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.environment = config.environment || 'sandbox';
    this.apiUrl = config.apiUrl || this.getDefaultApiUrl();
    this.merchantId = config.merchantId || 'VENDING_MERCHANT_001';
  }

  getDefaultApiUrl() {
    return this.environment === 'production'
      ? 'https://api.mastercard.com'
      : 'https://sandbox.api.mastercard.com';
  }

  /**
   * Create a payment session
   */
  async createPaymentSession(options) {
    const {
      amount,
      currency,
      productId,
      productName,
      agentId,
      paymentMethod,
      metadata
    } = options;

    const paymentId = `mc_pay_${uuidv4()}`;
    const sessionId = `mc_sess_${uuidv4()}`;

    // In production, this would make a real API call to Mastercard
    // For now, we'll create a mock session
    if (process.env.MOCK_PAYMENTS !== 'false') {
      return {
        paymentId,
        sessionId,
        merchantId: this.merchantId,
        amount,
        currency,
        status: 'pending',
        authorizationEndpoint: `${this.apiUrl}/agent-pay/v1/authorize`,
        expiresAt: Date.now() + (15 * 60 * 1000), // 15 minutes
        metadata
      };
    }

    try {
      // Real Mastercard API call
      const response = await axios.post(
        `${this.apiUrl}/agent-pay/v1/sessions`,
        {
          merchantId: this.merchantId,
          amount: {
            value: amount,
            currency
          },
          order: {
            reference: paymentId,
            description: productName
          },
          agent: {
            id: agentId,
            type: 'autonomous'
          },
          paymentMethod,
          expiresIn: 900 // 15 minutes
        },
        {
          headers: {
            'Authorization': `Bearer ${this.getAccessToken()}`,
            'Content-Type': 'application/json',
            'X-API-Key': this.apiKey
          }
        }
      );

      return {
        paymentId,
        sessionId: response.data.sessionId,
        merchantId: this.merchantId,
        amount,
        currency,
        status: 'pending',
        authorizationEndpoint: response.data.authorizationUrl,
        expiresAt: response.data.expiresAt,
        metadata
      };

    } catch (error) {
      console.error('Mastercard session creation error:', error.response?.data || error.message);
      throw new Error('Failed to create Mastercard payment session');
    }
  }

  /**
   * Process payment with card details
   */
  async processPayment(options) {
    const {
      paymentId,
      sessionId,
      amount,
      currency,
      cardDetails,
      billingAddress,
      metadata
    } = options;

    // Mock payment processing for development
    if (process.env.MOCK_PAYMENTS !== 'false') {
      return this.mockProcessPayment(paymentId, cardDetails, amount);
    }

    try {
      // Real Mastercard API call
      const response = await axios.post(
        `${this.apiUrl}/agent-pay/v1/payments`,
        {
          sessionId,
          paymentMethod: {
            type: 'card',
            card: {
              number: cardDetails.number,
              expiryMonth: cardDetails.expMonth,
              expiryYear: cardDetails.expYear,
              securityCode: cardDetails.cvc,
              holderName: cardDetails.holderName
            }
          },
          billingAddress: {
            line1: billingAddress.line1,
            line2: billingAddress.line2,
            city: billingAddress.city,
            state: billingAddress.state,
            postalCode: billingAddress.postalCode,
            country: billingAddress.country
          },
          amount: {
            value: amount,
            currency
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.getAccessToken()}`,
            'Content-Type': 'application/json',
            'X-API-Key': this.apiKey,
            'X-Idempotency-Key': paymentId
          }
        }
      );

      const data = response.data;

      return {
        status: data.status === 'APPROVED' ? 'approved' : 'declined',
        transactionId: data.transactionId,
        authorizationCode: data.authorizationCode,
        responseCode: data.responseCode,
        responseMessage: data.responseMessage,
        cardLast4: data.card?.last4,
        cardBrand: data.card?.brand,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Mastercard payment error:', error.response?.data || error.message);

      return {
        status: 'declined',
        transactionId: null,
        authorizationCode: null,
        responseCode: error.response?.data?.responseCode || '05',
        responseMessage: error.response?.data?.message || 'Payment processing failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Mock payment processing for development
   */
  mockProcessPayment(paymentId, cardDetails, amount) {
    const cardNumber = cardDetails.number?.replace(/\s/g, '');
    const last4 = cardNumber?.slice(-4) || '0000';

    // Simulate different card outcomes
    const declinedCards = ['4000000000000002', '5555555555555557'];
    const isDeclined = declinedCards.includes(cardNumber);

    // Simulate processing delay
    return new Promise((resolve) => {
      setTimeout(() => {
        if (isDeclined) {
          resolve({
            status: 'declined',
            transactionId: `MC${Date.now()}DECLINED`,
            authorizationCode: null,
            responseCode: '05',
            responseMessage: 'Do not honor',
            cardLast4: last4,
            cardBrand: this.detectCardBrand(cardNumber),
            timestamp: new Date().toISOString()
          });
        } else {
          resolve({
            status: 'approved',
            transactionId: `MC${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
            authorizationCode: Math.random().toString(36).substr(2, 6).toUpperCase(),
            responseCode: '00',
            responseMessage: 'Approved',
            cardLast4: last4,
            cardBrand: this.detectCardBrand(cardNumber),
            timestamp: new Date().toISOString()
          });
        }
      }, 1000); // 1 second delay to simulate processing
    });
  }

  /**
   * Detect card brand from number
   */
  detectCardBrand(cardNumber) {
    if (!cardNumber) return 'unknown';

    if (cardNumber.startsWith('4')) return 'visa';
    if (cardNumber.startsWith('5')) return 'mastercard';
    if (cardNumber.startsWith('3')) return 'amex';
    if (cardNumber.startsWith('6')) return 'discover';

    return 'unknown';
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload, signature) {
    if (!signature || !this.clientSecret) {
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.clientSecret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Get access token for API calls
   */
  getAccessToken() {
    // In production, implement proper OAuth 2.0 token management
    // For now, return the API key as Bearer token
    return this.apiKey || 'mock_access_token';
  }

  /**
   * Refund a payment
   */
  async refundPayment(transactionId, amount, reason) {
    if (process.env.MOCK_PAYMENTS !== 'false') {
      return {
        refundId: `mc_ref_${uuidv4()}`,
        status: 'approved',
        amount,
        transactionId,
        reason,
        timestamp: new Date().toISOString()
      };
    }

    try {
      const response = await axios.post(
        `${this.apiUrl}/agent-pay/v1/refunds`,
        {
          transactionId,
          amount: {
            value: amount,
            currency: 'USD'
          },
          reason
        },
        {
          headers: {
            'Authorization': `Bearer ${this.getAccessToken()}`,
            'Content-Type': 'application/json',
            'X-API-Key': this.apiKey
          }
        }
      );

      return {
        refundId: response.data.refundId,
        status: response.data.status,
        amount,
        transactionId,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Mastercard refund error:', error.response?.data || error.message);
      throw new Error('Failed to process refund');
    }
  }

  /**
   * Get payment details
   */
  async getPaymentDetails(transactionId) {
    if (process.env.MOCK_PAYMENTS !== 'false') {
      return {
        transactionId,
        status: 'approved',
        amount: 1000,
        currency: 'USD',
        cardLast4: '1234',
        timestamp: new Date().toISOString()
      };
    }

    try {
      const response = await axios.get(
        `${this.apiUrl}/agent-pay/v1/payments/${transactionId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.getAccessToken()}`,
            'X-API-Key': this.apiKey
          }
        }
      );

      return response.data;

    } catch (error) {
      console.error('Mastercard get payment error:', error.response?.data || error.message);
      throw new Error('Failed to get payment details');
    }
  }

  /**
   * Validate agent authorization
   */
  async validateAgentAuthorization(agentId, merchantId) {
    // In production, this would check Mastercard's agent registry
    const authorizedAgents = (process.env.MASTERCARD_AUTHORIZED_AGENTS || '').split(',');

    if (authorizedAgents.length === 0) {
      return { authorized: true }; // No restrictions if list is empty
    }

    return {
      authorized: authorizedAgents.includes(agentId),
      agentId,
      merchantId
    };
  }
}

module.exports = MastercardService;
