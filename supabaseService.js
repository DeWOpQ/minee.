import { supabase } from '../config/supabase';

// User operations
export const createUser = async (userData) => {
  const { data, error } = await supabase
    .from('users')
    .insert([userData])
    .select();
  
  if (error) throw error;
  return data[0];
};

export const getUser = async (userId) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) throw error;
  return data;
};

// Game operations
export const saveGameResult = async (gameData) => {
  const { data, error } = await supabase
    .from('game_results')
    .insert([gameData])
    .select();
  
  if (error) throw error;
  return data[0];
};

export const getGameHistory = async (userId) => {
  const { data, error } = await supabase
    .from('game_results')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
};

// Wallet operations
export const updateUserBalance = async (userId, newBalance) => {
  const { data, error } = await supabase
    .from('users')
    .update({ balance: newBalance })
    .eq('id', userId)
    .select();
  
  if (error) throw error;
  return data[0];
};

// Leaderboard operations
export const getLeaderboard = async () => {
  const { data, error } = await supabase
    .from('users')
    .select('username, total_wins, total_profit')
    .order('total_profit', { ascending: false })
    .limit(10);
  
  if (error) throw error;
  return data;
}; 