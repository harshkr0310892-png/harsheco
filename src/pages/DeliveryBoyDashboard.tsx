import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  Package, 
  LogOut, 
  Loader2, 
  RefreshCw, 
  MessageCircle, 
  Send
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Order {
  id: string;
  order_id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_email: string | null;
  status: string;
  payment_method: 'online' | 'cod';
  total: number;
  created_at: string;
  updated_at: string;
  delivery_boy_id: string | null;
}

interface OrderMessage {
  id: string;
  order_id: string;
  message: string;
  is_admin: boolean;
  is_delivery_boy?: boolean;
  created_at: string;
}

export default function DeliveryBoyDashboard() {
  const navigate = useNavigate();
  const [isDeliveryBoyLoggedIn, setIsDeliveryBoyLoggedIn] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderMessages, setOrderMessages] = useState<Record<string, OrderMessage[]>>({});
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const queryClient = useQueryClient();

  // Check delivery boy login on mount
  useEffect(() => {
    const isDeliveryBoy = sessionStorage.getItem('delivery_boy_logged_in') === 'true';
    setIsDeliveryBoyLoggedIn(isDeliveryBoy);
    if (!isDeliveryBoy) {
      navigate('/delivery-boy/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    sessionStorage.removeItem('delivery_boy_logged_in');
    sessionStorage.removeItem('delivery_boy_id');
    sessionStorage.removeItem('delivery_boy_username');
    navigate('/delivery-boy/login');
  };

  // Get delivery boy ID from session
  const deliveryBoyId = sessionStorage.getItem('delivery_boy_id');

  // Fetch orders assigned to this delivery boy
  const { data: orders, isLoading: ordersLoading, refetch: refetchOrders } = useQuery({
    queryKey: ['delivery-boy-orders', deliveryBoyId],
    queryFn: async () => {
      if (!deliveryBoyId) return [];
      
      const { data, error } = await supabase
        .from('orders' as any)
        .select('*')
        .eq('delivery_boy_id', deliveryBoyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any as Order[];
    },
    enabled: !!deliveryBoyId,
  });

  // Update order status
  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['delivery-boy-orders', deliveryBoyId] });
      toast.success('Order status updated!');
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update order status');
    }
  };

  // Fetch messages for selected order
  useEffect(() => {
    if (!selectedOrder) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('order_messages')
        .select('*')
        .eq('order_id', selectedOrder.id)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching messages:', error);
        toast.error('Failed to fetch messages');
        return;
      }
      
      if (data) {
        setOrderMessages(prev => ({ ...prev, [selectedOrder.id]: data as OrderMessage[] }));
      }
    };

    fetchMessages();
    
    // Set up real-time subscription to get new messages
    const channel = supabase
      .channel(`order_messages:${selectedOrder.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'order_messages',
        filter: `order_id=eq.${selectedOrder.id}`
      }, (payload) => {
        setOrderMessages(prev => {
          const currentMessages = prev[selectedOrder.id] || [];
          // Avoid duplicates by checking if message already exists
          const messageExists = currentMessages.some(msg => msg.id === payload.new.id);
          if (!messageExists) {
            return {
              ...prev,
              [selectedOrder.id]: [...currentMessages, payload.new as OrderMessage].sort((a, b) => 
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              )
            };
          }
          return prev;
        });
      })
      .subscribe();

    // Cleanup subscription on unmount or when selectedOrder changes
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedOrder]);

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedOrder) return;
    setSendingMessage(true);

    try {
      const { error } = await supabase
        .from('order_messages')
        .insert({
          order_id: selectedOrder.id,
          message: newMessage.trim(),
          is_admin: false,
          is_delivery_boy: true,
        });

      if (error) throw error;

      // Fetch all messages again to ensure we have the latest data
      const { data, error: fetchError } = await supabase
        .from('order_messages')
        .select('*')
        .eq('order_id', selectedOrder.id)
        .order('created_at', { ascending: true });
        
      if (fetchError) {
        console.error('Error fetching updated messages:', fetchError);
        toast.error('Message sent but failed to refresh messages');
        setNewMessage('');
        setSendingMessage(false);
        return;
      }
      
      if (data) {
        setOrderMessages(prev => ({
          ...prev,
          [selectedOrder.id]: data as OrderMessage[]
        }));
      }
      
      setNewMessage('');
      toast.success('Message sent!');
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error(error.message || 'Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  if (!isDeliveryBoyLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-primary" />
            <span className="font-display text-xl font-bold gradient-gold-text">
              Delivery Dashboard
            </span>
          </div>
          <div className="flex gap-1 items-center">
            <span className="text-sm mr-4">
              Welcome, {sessionStorage.getItem('delivery_boy_username')}
            </span>
            <Button variant="royalOutline" size="sm" onClick={handleLogout} className="px-2 py-1 text-sm">
              <LogOut className="w-4 h-4 mr-1" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-display text-3xl font-bold">Your Orders</h1>
          <Button variant="ghost" size="icon" onClick={() => refetchOrders()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {ordersLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          </div>
        ) : orders && orders.length > 0 ? (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-xl">Order #{order.order_id}</CardTitle>
                      <CardDescription>
                        {new Date(order.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "text-xs px-2 py-1 rounded-full",
                        order.status === 'pending' ? "bg-yellow-100 text-yellow-800" :
                        order.status === 'confirmed' ? "bg-blue-100 text-blue-800" :
                        order.status === 'packed' ? "bg-indigo-100 text-indigo-800" :
                        order.status === 'shipped' ? "bg-purple-100 text-purple-800" :
                        order.status === 'delivered' ? "bg-green-100 text-green-800" :
                        order.status === 'cancelled' ? "bg-red-100 text-red-800" :
                        "bg-gray-100 text-gray-800"
                      )}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => setSelectedOrder(order)}>
                            <MessageCircle className="w-4 h-4 mr-2" />
                            Message
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Messages - {order.order_id}</DialogTitle>
                            <DialogDescription>
                              Send and receive messages related to order {order.order_id}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="h-60 overflow-y-auto space-y-3 bg-muted/30 rounded-lg p-4">
                              {orderMessages[order.id] && orderMessages[order.id].length > 0 ? (
                                orderMessages[order.id].map((msg) => (
                                  <div key={msg.id} className={cn(
                                    "flex",
                                    (msg.is_admin || msg.is_delivery_boy) ? "justify-end" : "justify-start"
                                  )}>
                                    <div className={cn(
                                      "max-w-[80%] px-4 py-2 rounded-2xl text-sm",
                                      (msg.is_admin || msg.is_delivery_boy)
                                        ? "bg-primary text-primary-foreground rounded-br-md" 
                                        : "bg-muted rounded-bl-md"
                                    )}>
                                      <p>{msg.message}</p>
                                      <p className="text-xs opacity-70 mt-1">
                                        {new Date(msg.created_at).toLocaleString()}
                                      </p>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p className="text-center text-muted-foreground text-sm py-8">No messages yet</p>
                              )}
                            </div>
                            <div className="flex justify-between items-center">
                              <Button variant="outline" size="sm" onClick={() => {
                                if (selectedOrder) {
                                  const fetchMessages = async () => {
                                    const { data, error } = await supabase
                                      .from('order_messages')
                                      .select('*')
                                      .eq('order_id', selectedOrder.id)
                                      .order('created_at', { ascending: true });
                                                                 
                                    if (error) {
                                      console.error('Error fetching messages:', error);
                                      toast.error('Failed to refresh messages');
                                      return;
                                    }
                                                                 
                                    if (data) {
                                      setOrderMessages(prev => ({ ...prev, [selectedOrder.id]: data as OrderMessage[] }));
                                    }
                                  };
                                  fetchMessages();
                                }
                              }}>
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Refresh
                              </Button>
                            </div>
                            <div className="flex gap-2">
                              <Textarea
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Send update to customer/admin..."
                                className="min-h-[60px] resize-none"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    sendMessage();
                                  }
                                }}
                              />
                              <Button 
                                variant="royal" 
                                onClick={sendMessage}
                                disabled={sendingMessage || !newMessage.trim()}
                              >
                                {sendingMessage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold mb-2">Customer Information</h3>
                      <p className="text-sm"><span className="font-medium">Name:</span> {order.customer_name}</p>
                      <p className="text-sm"><span className="font-medium">Phone:</span> {order.customer_phone}</p>
                      <p className="text-sm"><span className="font-medium">Email:</span> {order.customer_email || 'N/A'}</p>
                      <p className="text-sm mt-2"><span className="font-medium">Address:</span> {order.customer_address}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Order Details</h3>
                      <p className="text-sm"><span className="font-medium">Total:</span> ₹{Number(order.total).toFixed(2)}</p>
                      <p className="text-sm"><span className="font-medium">Payment:</span> {order.payment_method === 'online' ? 'Online' : 'Cash on Delivery'}</p>
                      <div className="mt-4">
                        <label className="text-sm font-medium">Update Status</label>
                        <Select 
                          value={order.status} 
                          onValueChange={(value) => updateOrderStatus(order.id, value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="confirmed">Confirmed</SelectItem>
                            <SelectItem value="packed">Packed</SelectItem>
                            <SelectItem value="shipped">Shipped</SelectItem>
                            <SelectItem value="delivered">Delivered</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-card rounded-xl border border-border/50">
            <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No orders assigned to you yet.</p>
          </div>
        )}
      </main>
    </div>
  );
}