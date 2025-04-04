const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { v4: uuidv4 } = require('uuid');
const axios = require("axios");
const { createClient } = require('@supabase/supabase-js');
const Web3 = require('web3');

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// In-memory storage
const payments = new Map();
const users = new Map();
const wallets = new Map();

// Supported currencies and payment methods
const SUPPORTED_CURRENCIES = {
  fiat: ['INR', 'USD', 'EUR', 'GBP'],
  crypto: ['BTC', 'ETH', 'USDT', 'USDC']
};

const PAYMENT_METHODS = {
  fiat: ['BANK', 'UPI', 'CARD'],
  crypto: ['BTC', 'ETH', 'USDT', 'USDC']
};

// Create new deposit
app.post("/api/create-deposit", async (req, res) => {
  try {
    const { 
      amount, 
      sourceCurrency, 
      targetCurrency = 'BTC',
      paymentMethod,
      userId,
      upiApp,
      bankName
    } = req.body;

    // Validate request
    if (!amount || !sourceCurrency || !paymentMethod || !userId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    // Create payment record
    const paymentId = uuidv4();
    const payment = {
      id: paymentId,
      userId,
      amount,
      sourceCurrency,
      targetCurrency,
      paymentMethod,
      status: 'pending',
      createdAt: new Date().toISOString(),
      upiApp,
      bankName
    };

    // Store payment in memory
    payments.set(paymentId, payment);

    // Process payment based on method
    let result;
    switch (paymentMethod) {
      case 'UPI':
        result = await processUPIPayment(payment);
        break;
      case 'BANK':
        result = await processBankTransfer(payment);
        break;
      case 'CARD':
        result = await processCardPayment(payment);
        break;
      case 'BTC':
      case 'ETH':
      case 'USDT':
      case 'USDC':
        result = await processCryptoPayment(payment);
        break;
      default:
        throw new Error('Unsupported payment method');
    }

    // Store payment in Supabase
    const { data, error } = await supabase
      .from('deposits')
      .insert([{
        id: paymentId,
        user_id: userId,
        amount: amount,
        source_currency: sourceCurrency,
        target_currency: targetCurrency,
        payment_method: paymentMethod,
        status: 'pending',
        created_at: new Date().toISOString(),
        upi_app: upiApp,
        bank_name: bankName
      }]);

    if (error) throw error;

    res.json({
      success: true,
      paymentId,
      ...result
    });

  } catch (error) {
    console.error('Deposit creation error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Process withdrawal request
app.post("/api/withdraw", async (req, res) => {
  try {
    const {
      amount,
      currency,
      userId,
      withdrawalAddress,
      withdrawalMethod
    } = req.body;

    // Validate request
    if (!amount || !currency || !userId || !withdrawalAddress) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters'
      });
    }

    // Check user balance
    const userWallet = wallets.get(userId) || {};
    if (!userWallet[currency] || userWallet[currency] < amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance'
      });
    }

    const withdrawalId = uuidv4();

    // Create withdrawal record
    const withdrawal = {
      id: withdrawalId,
      userId,
      amount,
      currency,
      address: withdrawalAddress,
      method: withdrawalMethod,
      status: 'pending',
      createdAt: new Date()
    };

    // Process withdrawal based on method
    let withdrawalResponse;
    
    if (SUPPORTED_CURRENCIES.crypto.includes(currency)) {
      withdrawalResponse = await processCryptoWithdrawal(withdrawal);
    } else {
      withdrawalResponse = await processFiatWithdrawal(withdrawal);
    }

    // Update user's wallet
    userWallet[currency] -= amount;
    wallets.set(userId, userWallet);

    res.json({
      success: true,
      withdrawalId,
      ...withdrawalResponse
    });

  } catch (error) {
    console.error('Withdrawal error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process withdrawal'
    });
  }
});

// Check payment status
app.get("/api/payment-status/:paymentId", async (req, res) => {
  try {
    const { paymentId } = req.params;
    const payment = payments.get(paymentId);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Check status with appropriate payment processor
    let status;
    switch(payment.method) {
      case 'UPI':
        status = await checkUPIStatus(payment);
        break;
      case 'CRYPTO':
        status = await checkCryptoStatus(payment);
        break;
      default:
        status = payment.status;
    }

    // If payment is completed, update user's wallet
    if (status === 'completed' && payment.status !== 'completed') {
      const userWallet = wallets.get(payment.userId) || {};
      userWallet[payment.targetCurrency] = (userWallet[payment.targetCurrency] || 0) + payment.cryptoAmount;
      wallets.set(payment.userId, userWallet);
      
      payment.status = 'completed';
      payments.set(paymentId, payment);
    }

    res.json({
      success: true,
      status,
      payment
    });

  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to check status'
    });
  }
});

// Get user's wallet balances
app.get("/api/wallet/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const wallet = wallets.get(userId) || {};
    
    // Get current rates for all supported currencies
    const rates = {};
    for (const crypto of SUPPORTED_CURRENCIES.crypto) {
      rates[crypto] = await getConversionRate('USD', crypto);
    }

    res.json({
      success: true,
      wallet,
      rates
    });

  } catch (error) {
    console.error('Wallet fetch error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch wallet'
    });
  }
});

// Helper functions
async function getConversionRate(from, to) {
  try {
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price?ids=${to.toLowerCase()}&vs_currencies=${from.toLowerCase()}`
    );
    return response.data[to.toLowerCase()][from.toLowerCase()];
  } catch (error) {
    console.error('Rate conversion error:', error);
    throw new Error('Failed to get conversion rate');
  }
}

async function processUPIPayment(payment) {
  const upiUrl = generateUPIUrl(payment);
  return { paymentUrl: upiUrl };
}

async function processBankTransfer(payment) {
  return {
    bankDetails: {
      accountName: process.env.BANK_ACCOUNT_NAME,
      accountNumber: process.env.BANK_ACCOUNT_NUMBER,
      ifscCode: process.env.BANK_IFSC_CODE,
      bankName: process.env.BANK_NAME,
      reference: payment.id
    }
  };
}

async function processCardPayment(payment) {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(payment.amount * 100),
    currency: payment.sourceCurrency.toLowerCase(),
    payment_method_types: ['card']
  });
  return { clientSecret: paymentIntent.client_secret };
}

async function processCryptoPayment(payment) {
  // Initialize crypto payment with MoonPay/Transak
  const response = await moonpay.createTransaction({
    currencyCode: payment.targetCurrency,
    baseCurrencyCode: payment.sourceCurrency,
    baseCurrencyAmount: payment.amount,
    email: payment.metadata.email
  });
  return { redirectUrl: response.redirectUrl };
}

async function processCryptoWithdrawal(withdrawal) {
  // Process crypto withdrawal through your chosen provider
  // This is a placeholder implementation
  return { status: 'pending', estimatedTime: '10-30 minutes' };
}

async function processFiatWithdrawal(withdrawal) {
  // Process fiat withdrawal through your banking provider
  // This is a placeholder implementation
  return { status: 'pending', estimatedTime: '1-3 business days' };
}

function generateUPIUrl(payment) {
  const merchantUpiId = process.env.MERCHANT_UPI_ID;
  const merchantName = encodeURIComponent(process.env.MERCHANT_NAME);
  const transactionNote = encodeURIComponent(`Payment for order ${payment.id}`);
  
  const baseUrl = 'upi://pay';
  const params = new URLSearchParams({
    pa: merchantUpiId,
    pn: merchantName,
    tn: transactionNote,
    am: payment.amount,
    cu: payment.sourceCurrency,
    tr: payment.id
  });

  switch(payment.metadata.upiApp) {
    case 'gpay':
      return `tez://upi/pay?${params.toString()}`;
    case 'phonepe':
      return `phonepe://pay?${params.toString()}`;
    case 'paytm':
      return `paytmmp://pay?${params.toString()}`;
    default:
      return `${baseUrl}?${params.toString()}`;
  }
}

// Add this function to handle crypto conversion
async function convertToMetamask(payment) {
  try {
    // Get current crypto price
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price?ids=${payment.targetCurrency.toLowerCase()}&vs_currencies=${payment.sourceCurrency.toLowerCase()}`
    );
    
    const rate = response.data[payment.targetCurrency.toLowerCase()][payment.sourceCurrency.toLowerCase()];
    const cryptoAmount = payment.amount / rate;
    
    // Store the transaction with crypto details
    const { data, error } = await supabase
      .from('crypto_transactions')
      .insert([{
        payment_id: payment.id,
        fiat_amount: payment.amount,
        fiat_currency: payment.sourceCurrency,
        crypto_amount: cryptoAmount,
        crypto_currency: payment.targetCurrency,
        wallet_address: process.env.OWNER_METAMASK_ADDRESS,
        status: 'pending'
      }]);

    if (error) throw error;
    
    return {
      success: true,
      cryptoAmount,
      walletAddress: process.env.OWNER_METAMASK_ADDRESS
    };
  } catch (error) {
    console.error('Crypto conversion error:', error);
    throw new Error('Failed to process crypto conversion');
  }
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
