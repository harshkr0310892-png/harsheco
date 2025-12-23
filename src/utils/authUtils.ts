// Utility functions to handle authentication for delivery boys and other session-based users

import { supabase } from "@/integrations/supabase/client";

// Function to check if a delivery boy is logged in
export const isDeliveryBoyLoggedIn = (): boolean => {
  return sessionStorage.getItem('delivery_boy_logged_in') === 'true';
};

// Function to get delivery boy ID
export const getDeliveryBoyId = (): string | null => {
  return sessionStorage.getItem('delivery_boy_id');
};

// Function to get delivery boy username
export const getDeliveryBoyUsername = (): string | null => {
  return sessionStorage.getItem('delivery_boy_username');
};

// Function to ensure proper session for database operations
export const ensureSessionForDeliveryBoy = async (): Promise<boolean> => {
  // Since we're using session-based auth, we don't need to do anything special
  // The Supabase client will work with the current session
  return isDeliveryBoyLoggedIn();
};

// Function to send a message ensuring proper authentication
export const sendDeliveryBoyMessage = async (
  orderId: string, 
  message: string
): Promise<{ success: boolean; error?: any }> => {
  try {
    // Check if delivery boy is logged in
    if (!isDeliveryBoyLoggedIn()) {
      throw new Error('Delivery boy not logged in');
    }

    const { error } = await supabase
      .from('order_messages')
      .insert({
        order_id: orderId,
        message: message.trim(),
        is_admin: false,
        is_delivery_boy: true,
      });

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error sending delivery boy message:', error);
    return { success: false, error };
  }
};