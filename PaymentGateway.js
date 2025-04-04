import React, { useState, useEffect } from 'react';
import { paymentApi } from '../lib/supabase';
import './PaymentGateway.css';

const PaymentGateway = ({ onSuccess, userId, balance, onClose }) => {
  const [mode, setMode] = useState('deposit'); // 'deposit' or 'withdraw'
  const [amount, setAmount] = useState('');
  const [sourceCurrency, setSourceCurrency] = useState('INR');
  const [targetCurrency, setTargetCurrency] = useState('BTC');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [selectedUpiApp, setSelectedUpiApp] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [upiId, setUpiId] = useState('');
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  const MIN_WITHDRAWAL = 1000;
  
  const quickAmounts = {
    INR: [2000, 5000, 10000, 20000],
    USD: [25, 100, 200, 500],
    EUR: [25, 100, 200, 500],
    GBP: [25, 100, 200, 500]
  };

  const MIN_AMOUNT = {
    INR: 100,
    USD: 1,
    EUR: 1,
    GBP: 1
  };

  const MAX_AMOUNT = {
    INR: 1000000,
    USD: 10000,
    EUR: 10000,
    GBP: 10000
  };

  const SUPPORTED_CURRENCIES = {
    fiat: ['INR', 'USD', 'EUR', 'GBP'],
    crypto: ['BTC', 'ETH', 'USDT', 'USDC']
  };

  const upiApps = [
    { id: 'gpay', name: 'Google Pay', icon: '/gpay-icon.svg' },
    { id: 'phonepe', name: 'PhonePe', icon: '/phonepe-icon.svg' },
    { id: 'paytm', name: 'Paytm', icon: '/paytm-icon.svg' },
    { id: 'bhim', name: 'BHIM UPI', icon: '/bhim-icon.svg' }
  ];

  const banks = [
    { id: 'sbi', name: 'State Bank of India' },
    { id: 'hdfc', name: 'HDFC Bank' },
    { id: 'icici', name: 'ICICI Bank' },
    { id: 'axis', name: 'Axis Bank' },
    { id: 'kotak', name: 'Kotak Mahindra Bank' }
  ];

  useEffect(() => {
    fetchTransactions();
  }, [userId]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const transactions = await paymentApi.getTransactions(userId);
      setTransactions(transactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAmount = (value) => {
    setAmount(value.toString());
    setError(null);
  };

  const handleAmountChange = (e) => {
    const value = e.target.value;
    if (value === '' || /^\d+$/.test(value)) {
      setAmount(value);
      setError(null);
    }
  };

  const validateDeposit = () => {
    if (!amount || parseInt(amount) < MIN_AMOUNT[sourceCurrency]) {
      setError(`Minimum deposit amount is ${sourceCurrency} ${MIN_AMOUNT[sourceCurrency]}`);
      return false;
    }

    if (parseInt(amount) > MAX_AMOUNT[sourceCurrency]) {
      setError(`Maximum deposit amount is ${sourceCurrency} ${MAX_AMOUNT[sourceCurrency]}`);
      return false;
    }

    if (paymentMethod === 'UPI' && !selectedUpiApp) {
      setError('Please select a UPI app');
      return false;
    }

    if (paymentMethod === 'BANK' && !bankName) {
      setError('Please select a bank');
      return false;
    }

    return true;
  };

  const validateWithdrawal = () => {
    if (!amount || parseInt(amount) < MIN_WITHDRAWAL) {
      setError(`Minimum withdrawal amount is ₹${MIN_WITHDRAWAL}`);
      return false;
    }

    if (parseInt(amount) > balance) {
      setError('Insufficient balance');
      return false;
    }

    if (paymentMethod === 'UPI' && !upiId) {
      setError('Please enter your UPI ID');
      return false;
    }

    if (paymentMethod === 'BANK') {
      if (!accountNumber) {
        setError('Please enter your account number');
        return false;
      }
      if (!ifscCode) {
        setError('Please enter IFSC code');
        return false;
      }
      if (!accountHolderName) {
        setError('Please enter account holder name');
        return false;
      }
    }

    return true;
  };

  const handleDeposit = async () => {
    if (!validateDeposit()) return;

    setProcessing(true);
    setError(null);
    setPaymentStatus('processing');

    try {
      const deposit = await paymentApi.createDeposit({
        userId,
        amount: parseInt(amount),
        sourceCurrency,
        paymentMethod,
        upiApp: selectedUpiApp,
        bankName
      });

      if (deposit) {
        if (paymentMethod === 'UPI') {
          // Generate UPI payment URL based on the app
          const upiUrl = generateUPIUrl(deposit.id, amount, selectedUpiApp);
          window.location.href = upiUrl;
        } else if (paymentMethod === 'BANK') {
          setPaymentStatus('bank_details');
        }

        // Start polling for payment status
        const checkPaymentStatus = setInterval(async () => {
          try {
            const status = await paymentApi.checkPaymentStatus(deposit.id);
            if (status === 'completed') {
              clearInterval(checkPaymentStatus);
              setPaymentStatus('success');
              await paymentApi.updateUserBalance(userId, parseInt(amount));
              onSuccess(parseInt(amount));
              fetchTransactions();
            } else if (status === 'failed') {
              clearInterval(checkPaymentStatus);
              setPaymentStatus('failed');
              setError('Payment failed. Please try again.');
            }
          } catch (err) {
            clearInterval(checkPaymentStatus);
            setPaymentStatus('failed');
            setError('Error checking payment status');
          }
        }, 3000);
      }
    } catch (err) {
      setPaymentStatus('failed');
      setError(err.message || 'Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleWithdrawal = async () => {
    if (!validateWithdrawal()) return;

    setProcessing(true);
    setError(null);
    setPaymentStatus('processing');

    try {
      const withdrawal = await paymentApi.createWithdrawal({
        userId,
        amount: parseInt(amount),
        paymentMethod,
        upiId,
        bankDetails: paymentMethod === 'BANK' ? {
          accountNumber,
          ifscCode,
          accountHolderName,
          bankName
        } : null
      });

      if (withdrawal) {
        setPaymentStatus('success');
        await paymentApi.updateUserBalance(userId, -parseInt(amount));
        onSuccess(-parseInt(amount));
        fetchTransactions();
      }
    } catch (err) {
      setPaymentStatus('failed');
      setError(err.message || 'Withdrawal failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const generateUPIUrl = (orderId, amount, upiApp) => {
    const merchantUpiId = process.env.REACT_APP_MERCHANT_UPI_ID;
    const merchantName = process.env.REACT_APP_MERCHANT_NAME;
    const transactionNote = `Payment for Order ${orderId}`;
    
    const upiParams = new URLSearchParams({
      pa: merchantUpiId,
      pn: merchantName,
      tn: transactionNote,
      am: amount,
      cu: 'INR'
    });

    const upiUrls = {
      gpay: `gpay://upi/pay?${upiParams}`,
      phonepe: `phonepe://pay?${upiParams}`,
      paytm: `paytmmp://pay?${upiParams}`,
      bhim: `upi://pay?${upiParams}`
    };

    return upiUrls[upiApp] || upiUrls.bhim;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (mode === 'deposit') {
      handleDeposit();
    } else {
      handleWithdrawal();
    }
  };

  return (
    <div className="payment-gateway">
      <button className="close-button" onClick={onClose}>×</button>
      <div className="payment-header">
        <h2>{mode === 'deposit' ? 'Deposit Funds' : 'Withdraw Funds'}</h2>
        <div className="mode-toggle">
          <button
            className={`mode-btn ${mode === 'deposit' ? 'active' : ''}`}
            onClick={() => setMode('deposit')}
          >
            Deposit
          </button>
          <button
            className={`mode-btn ${mode === 'withdraw' ? 'active' : ''}`}
            onClick={() => setMode('withdraw')}
          >
            Withdraw
          </button>
        </div>
      </div>

      <div className="payment-content">
        {mode === 'deposit' && (
          <div className="currency-selector">
            <div className="currency-group">
              <label>Pay with</label>
              <select
                value={sourceCurrency}
                onChange={(e) => setSourceCurrency(e.target.value)}
                className="currency-dropdown"
              >
                {SUPPORTED_CURRENCIES.fiat.map(currency => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="payment-methods">
          <button
            className={`payment-method-btn ${paymentMethod === 'UPI' ? 'active' : ''}`}
            onClick={() => setPaymentMethod('UPI')}
          >
            <img src="/upi-icon.svg" alt="UPI" className="payment-icon" />
            <span>UPI</span>
          </button>
          {mode === 'withdraw' && (
            <button
              className={`payment-method-btn ${paymentMethod === 'BANK' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('BANK')}
            >
              <img src="/icons/bank-icon.svg" alt="Bank Transfer" className="payment-icon" />
              <span>Bank Transfer</span>
            </button>
          )}
          {mode === 'deposit' && (
            <button
              className={`payment-method-btn ${paymentMethod === 'CARD' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('CARD')}
            >
              <img src="/icons/card-icon.svg" alt="Card" className="payment-icon" />
              <span>Card</span>
            </button>
          )}
        </div>

        {mode === 'deposit' && paymentMethod === 'UPI' && (
          <div className="upi-apps">
            {upiApps.map(app => (
              <button
                key={app.id}
                className={`upi-app-btn ${selectedUpiApp === app.id ? 'active' : ''}`}
                onClick={() => setSelectedUpiApp(app.id)}
              >
                <img src={app.icon} alt={app.name} />
                <span>{app.name}</span>
              </button>
            ))}
          </div>
        )}

        {mode === 'withdraw' && paymentMethod === 'UPI' && (
          <div className="upi-input">
            <input
              type="text"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="Enter your UPI ID"
              className="input-field"
            />
          </div>
        )}

        {paymentMethod === 'BANK' && (
          <div className="bank-form">
            <select
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="bank-dropdown"
            >
              <option value="">Select Bank</option>
              {banks.map(bank => (
                <option key={bank.id} value={bank.id}>
                  {bank.name}
                </option>
              ))}
            </select>
            
            {mode === 'withdraw' && (
              <>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Account Number"
                  className="input-field"
                />
                <input
                  type="text"
                  value={ifscCode}
                  onChange={(e) => setIfscCode(e.target.value)}
                  placeholder="IFSC Code"
                  className="input-field"
                />
                <input
                  type="text"
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                  placeholder="Account Holder Name"
                  className="input-field"
                />
              </>
            )}
          </div>
        )}

        <div className="quick-amounts">
          {quickAmounts[sourceCurrency].map((value) => (
            <button
              key={value}
              className={`quick-amount-btn ${amount === value.toString() ? 'active' : ''}`}
              onClick={() => handleQuickAmount(value)}
            >
              {sourceCurrency} {value.toLocaleString()}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="amount-input">
            <input
              type="text"
              value={amount}
              onChange={handleAmountChange}
              placeholder={`Enter Amount in ${sourceCurrency}`}
              className="amount-field"
            />
          </div>

          <div className="amount-limits">
            {mode === 'deposit' ? (
              <>
                Minimum: {sourceCurrency} {MIN_AMOUNT[sourceCurrency]} | 
                Maximum: {sourceCurrency} {MAX_AMOUNT[sourceCurrency]}
              </>
            ) : (
              <>
                Minimum: ₹{MIN_WITHDRAWAL}
              </>
            )}
          </div>

          {error && <div className="error-message">{error}</div>}

          {paymentStatus === 'bank_details' && (
            <div className="bank-details">
              <h3>Bank Transfer Details</h3>
              <p>Account Name: {process.env.BANK_ACCOUNT_NAME}</p>
              <p>Account Number: {process.env.BANK_ACCOUNT_NUMBER}</p>
              <p>IFSC Code: {process.env.BANK_IFSC_CODE}</p>
              <p>Bank: {process.env.BANK_NAME}</p>
              <p className="note">Please include your Order ID in the payment reference</p>
            </div>
          )}

          <button
            type="submit"
            className="submit-btn"
            disabled={processing || !amount}
          >
            {processing ? 'Processing...' : mode === 'deposit' ? 
              `Deposit ${sourceCurrency} ${amount || '0'}` : 
              `Withdraw ₹${amount || '0'}`}
          </button>
        </form>

        <div className="transactions">
          <h3>Transaction History</h3>
          {loading ? (
            <div className="loading">Loading transactions...</div>
          ) : transactions.length > 0 ? (
            <div className="transaction-list">
              {transactions.map(transaction => (
                <div key={transaction.id} className={`transaction-item ${transaction.status}`}>
                  <div className="transaction-type">
                    {transaction.type === 'deposit' ? '↓ Deposit' : '↑ Withdrawal'}
                  </div>
                  <div className="transaction-amount">
                    {transaction.type === 'deposit' ? '+' : '-'}
                    {transaction.currency} {transaction.amount}
                  </div>
                  <div className="transaction-status">{transaction.status}</div>
                  <div className="transaction-date">
                    {new Date(transaction.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-transactions">No transactions yet</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentGateway; 