const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration');
}

// Create Supabase client with service key for admin access
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper functions for payment operations
const paymentDb = {
  async createDeposit({ userId, amount, currency, paymentMethod, upiApp, bankName }) {
    const { data, error } = await supabase
      .from('deposits')
      .insert([{
        user_id: userId,
        amount,
        currency,
        payment_method: paymentMethod,
        upi_app: upiApp,
        bank_name: bankName,
        status: 'pending',
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateDepositStatus(depositId, status) {
    const { data, error } = await supabase
      .from('deposits')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', depositId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async createWithdrawal({ userId, amount, paymentMethod, upiId, bankDetails }) {
    const { data, error } = await supabase
      .from('withdrawals')
      .insert([{
        user_id: userId,
        amount,
        payment_method: paymentMethod,
        upi_id: upiId,
        bank_details: bankDetails,
        status: 'pending',
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateWithdrawalStatus(withdrawalId, status) {
    const { data, error } = await supabase
      .from('withdrawals')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', withdrawalId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getUserTransactions(userId) {
    const [{ data: deposits, error: depositsError }, { data: withdrawals, error: withdrawalsError }] = await Promise.all([
      supabase
        .from('deposits')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      supabase
        .from('withdrawals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
    ]);

    if (depositsError) throw depositsError;
    if (withdrawalsError) throw withdrawalsError;

    return {
      deposits: deposits || [],
      withdrawals: withdrawals || []
    };
  },

  async getUserBalance(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('balance')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data?.balance || 0;
  },

  async updateUserBalance(userId, amount) {
    const { data, error } = await supabase.rpc('update_user_balance', {
      user_id: userId,
      amount_change: amount
    });

    if (error) throw error;
    return data;
  },

  async getPaymentById(paymentId, type = 'deposit') {
    const table = type === 'deposit' ? 'deposits' : 'withdrawals';
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('id', paymentId)
      .single();

    if (error) throw error;
    return data;
  }
};

module.exports = {
  supabase,
  paymentDb
}; 