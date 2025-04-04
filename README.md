# Multi-Currency Payment Gateway

A modern payment gateway that supports both fiat and cryptocurrency transactions, similar to Stake.com. This payment system allows users to deposit funds using various payment methods and automatically converts fiat deposits into cryptocurrency.

## Features

- **Multi-Currency Support**
  - Fiat currencies: INR, USD, EUR, GBP
  - Cryptocurrencies: BTC, ETH, USDT, USDC
  - Real-time currency conversion
  - Automatic conversion of fiat deposits to crypto

- **Payment Methods**
  - UPI (India)
    - Google Pay
    - PhonePe
    - Paytm
    - BHIM UPI
  - Bank Transfer
  - Cryptocurrency
    - Direct wallet deposits
    - Integration with MoonPay/Transak for fiat-to-crypto conversion

- **Security Features**
  - Secure payment processing
  - Real-time transaction status updates
  - Transaction history tracking
  - Input validation and error handling
  - Rate limiting and fraud prevention

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd <repository-name>
```

2. Install dependencies:
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

3. Set up environment variables:
Create a `.env` file in the backend directory with the following variables:
```env
PORT=5000
MONGODB_URI=your_mongodb_uri

# Payment Processor Keys
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
MOONPAY_API_KEY=your_moonpay_api_key
TRANSAK_API_KEY=your_transak_api_key

# UPI Settings
MERCHANT_UPI_ID=your_upi_id
MERCHANT_NAME=your_merchant_name

# Bank Account Details
BANK_ACCOUNT_NAME=your_bank_account_name
BANK_ACCOUNT_NUMBER=your_bank_account_number
BANK_IFSC_CODE=your_bank_ifsc_code
BANK_NAME=your_bank_name

# Security
JWT_SECRET=your_jwt_secret
PAYMENT_WEBHOOK_SECRET=your_webhook_secret

# Transaction Limits
MIN_DEPOSIT_AMOUNT_INR=100
MAX_DEPOSIT_AMOUNT_INR=1000000
MIN_DEPOSIT_AMOUNT_USD=1
MAX_DEPOSIT_AMOUNT_USD=10000

SUPABASE_URL=your_project_url
SUPABASE_SERVICE_KEY=your_service_role_key
```

4. Start the development servers:
```bash
# Backend
cd backend
npm run dev

# Frontend
cd ../frontend
npm start
```

## API Endpoints

### Deposits
- `POST /api/create-deposit`: Create a new deposit
- `GET /api/payment-status/:paymentId`: Check payment status
- `POST /api/payment-webhook`: Handle payment webhooks

### Withdrawals
- `POST /api/withdraw`: Process withdrawal requests
- `GET /api/withdrawal-status/:withdrawalId`: Check withdrawal status

## Usage

1. Select source currency (fiat) and target currency (crypto)
2. Choose payment method:
   - UPI: Select a UPI app and follow the payment link
   - Bank Transfer: Use the provided bank details
   - Crypto: Enter your wallet address for direct deposits
3. Enter the amount
4. Complete the payment
5. Track the transaction status in real-time

## Development

### Frontend Structure
```
frontend/
├── src/
│   ├── components/
│   │   ├── PaymentGateway.js
│   │   └── PaymentGateway.css
│   ├── App.js
│   └── index.js
└── public/
    └── icons/
        ├── gpay-icon.svg
        ├── phonepe-icon.svg
        ├── paytm-icon.svg
        └── bhim-icon.svg
```

### Backend Structure
```
backend/
├── server.js
├── routes/
│   ├── deposits.js
│   └── withdrawals.js
├── models/
│   ├── payment.js
│   └── wallet.js
└── middleware/
    ├── auth.js
    └── validation.js
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
