import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  Package, 
  Plus, 
  Edit2, 
  Trash2, 
  Loader2, 
  RefreshCw 
} from "lucide-react";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

interface DeliveryBoy {
  id: string;
  username: string;
  password_hash?: string;
  phone?: string;
  email?: string;
  is_active: boolean;
  is_banned: boolean;
  created_at: string;
  updated_at?: string;
}

interface DeliveryBoyForm {
  username: string;
  phone?: string;
  email?: string;
  password: string;
  confirm_password: string;
  is_active: boolean;
}

export const DeliveryBoysManager = () => {
  const [deliveryBoys, setDeliveryBoys] = useState<DeliveryBoy[]>([]);
  const [deliveryBoyDialogOpen, setDeliveryBoyDialogOpen] = useState(false);
  const [editingDeliveryBoy, setEditingDeliveryBoy] = useState<DeliveryBoy | null>(null);
  const [deliveryBoyForm, setDeliveryBoyForm] = useState<DeliveryBoyForm>({
    username: '',
    phone: '',
    email: '',
    password: '',
    confirm_password: '',
    is_active: true,
  });
  const queryClient = useQueryClient();

  // Fetch delivery boys
  const { data: fetchedDeliveryBoys, isLoading, refetch } = useQuery({
    queryKey: ['admin-delivery-boys'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_boys' as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any as DeliveryBoy[];
    },
  });

  useEffect(() => {
    if (fetchedDeliveryBoys) {
      setDeliveryBoys(fetchedDeliveryBoys);
    }
  }, [fetchedDeliveryBoys]);

  // Mutation for adding/editing delivery boy
  const deliveryBoyMutation = useMutation({
    mutationFn: async (deliveryBoyData: DeliveryBoyForm & { id?: string }) => {
      let data: any = {
        username: deliveryBoyData.username,
        phone: deliveryBoyData.phone || null,
        email: deliveryBoyData.email || null,
        is_active: deliveryBoyData.is_active,
        is_banned: deliveryBoyData.id ? editingDeliveryBoy?.is_banned : false, // Keep existing ban status for edits
      };

      // Only update password if it's provided (for new users) or if it's changed (for editing)
      if (deliveryBoyData.id) {
        // Editing existing delivery boy
        if (deliveryBoyData.password) {
          // Only update password if a new one was provided
          const hashedPassword = await hashPassword(deliveryBoyData.password);
          data = { ...data, password_hash: hashedPassword };
        }
        
        const { error } = await supabase
          .from('delivery_boys' as any)
          .update(data)
          .eq('id', deliveryBoyData.id);
        if (error) throw error;
      } else {
        // Creating new delivery boy
        const hashedPassword = await hashPassword(deliveryBoyData.password);
        data = { ...data, password_hash: hashedPassword };
        
        const { error } = await supabase.from('delivery_boys' as any).insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-delivery-boys'] });
      toast.success(editingDeliveryBoy ? 'Delivery boy updated!' : 'Delivery boy created!');
      resetDeliveryBoyForm();
      setDeliveryBoyDialogOpen(false);
    },
    onError: (error) => {
      console.error('Error saving delivery boy:', error);
      toast.error('Failed to save delivery boy');
    },
  });

  // Mutation for deleting delivery boy
  const deleteDeliveryBoyMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('delivery_boys' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-delivery-boys'] });
      toast.success('Delivery boy deleted!');
    },
    onError: (error) => {
      console.error('Error deleting delivery boy:', error);
      toast.error('Failed to delete delivery boy');
    },
  });

  // Mutation for banning/unbanning delivery boy
  const banDeliveryBoyMutation = useMutation({
    mutationFn: async ({ id, is_banned }: { id: string; is_banned: boolean }) => {
      const { error } = await supabase
        .from('delivery_boys' as any)
        .update({ is_banned })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-delivery-boys'] });
      toast.success('Delivery boy status updated!');
    },
    onError: (error) => {
      console.error('Error updating delivery boy ban status:', error);
      toast.error('Failed to update delivery boy status');
    },
  });

  const hashPassword = async (password: string): Promise<string> => {
    // In a real application, you'd use a proper password hashing library
    // For now, we'll use a simple approach, but in production, use bcrypt or similar
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const resetDeliveryBoyForm = () => {
    setDeliveryBoyForm({
      username: '',
      phone: '',
      email: '',
      password: '',
      confirm_password: '',
      is_active: true,
    });
    setEditingDeliveryBoy(null);
  };

  const handleEditDeliveryBoy = (deliveryBoy: DeliveryBoy) => {
    setEditingDeliveryBoy(deliveryBoy);
    setDeliveryBoyForm({
      username: deliveryBoy.username,
      phone: deliveryBoy.phone || '',
      email: deliveryBoy.email || '',
      password: '', // Don't prefill password for security
      confirm_password: '',
      is_active: deliveryBoy.is_active,
    });
    setDeliveryBoyDialogOpen(true);
  };

  const handleSubmitDeliveryBoy = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!deliveryBoyForm.username.trim()) {
      toast.error('Please enter a username');
      return;
    }
    
    if (!editingDeliveryBoy && !deliveryBoyForm.password.trim()) {
      toast.error('Please enter a password');
      return;
    }
    
    if (!editingDeliveryBoy && deliveryBoyForm.password !== deliveryBoyForm.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }
    
    // If editing, password is optional (only update if provided)
    if (editingDeliveryBoy && deliveryBoyForm.password && deliveryBoyForm.password !== deliveryBoyForm.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }

    deliveryBoyMutation.mutate({
      ...deliveryBoyForm,
      id: editingDeliveryBoy?.id,
      password: deliveryBoyForm.password || 'dummy', // Use dummy if not changing password
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold">Delivery Boys</h2>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Dialog open={deliveryBoyDialogOpen} onOpenChange={(open) => {
            setDeliveryBoyDialogOpen(open);
            if (!open) resetDeliveryBoyForm();
          }}>
            <DialogTrigger asChild>
              <Button variant="royal">
                <Plus className="w-4 h-4 mr-2" />
                Add Delivery Boy
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display">
                  {editingDeliveryBoy ? 'Edit Delivery Boy' : 'Add New Delivery Boy'}
                </DialogTitle>
                <DialogDescription>
                  {editingDeliveryBoy 
                    ? 'Update delivery boy information' 
                    : 'Create a new delivery boy account'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmitDeliveryBoy} className="space-y-4">
                <div>
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    id="username"
                    value={deliveryBoyForm.username}
                    onChange={(e) => setDeliveryBoyForm({ ...deliveryBoyForm, username: e.target.value })}
                    placeholder="Enter username"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={deliveryBoyForm.phone}
                    onChange={(e) => setDeliveryBoyForm({ ...deliveryBoyForm, phone: e.target.value })}
                    placeholder="Enter phone number"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={deliveryBoyForm.email}
                    onChange={(e) => setDeliveryBoyForm({ ...deliveryBoyForm, email: e.target.value })}
                    placeholder="Enter email address"
                    className="mt-1"
                  />
                </div>
                
                {!editingDeliveryBoy && (
                  <>
                    <div>
                      <Label htmlFor="password">Password *</Label>
                      <Input
                        id="password"
                        type="password"
                        value={deliveryBoyForm.password}
                        onChange={(e) => setDeliveryBoyForm({ ...deliveryBoyForm, password: e.target.value })}
                        placeholder="Enter password"
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="confirm_password">Confirm Password *</Label>
                      <Input
                        id="confirm_password"
                        type="password"
                        value={deliveryBoyForm.confirm_password}
                        onChange={(e) => setDeliveryBoyForm({ ...deliveryBoyForm, confirm_password: e.target.value })}
                        placeholder="Confirm password"
                        className="mt-1"
                      />
                    </div>
                  </>
                )}
                
                {editingDeliveryBoy && (
                  <div>
                    <Label htmlFor="password">New Password (Optional)</Label>
                    <Input
                      id="password"
                      type="password"
                      value={deliveryBoyForm.password}
                      onChange={(e) => setDeliveryBoyForm({ ...deliveryBoyForm, password: e.target.value })}
                      placeholder="Enter new password (leave blank to keep current)"
                      className="mt-1"
                    />
                  </div>
                )}
                
                <div className="flex items-center gap-3 pt-2">
                  <Switch
                    id="is_active"
                    checked={deliveryBoyForm.is_active}
                    onCheckedChange={(checked) => setDeliveryBoyForm({ ...deliveryBoyForm, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Active Account</Label>
                </div>
                
                <Button
                  type="submit"
                  variant="royal"
                  className="w-full"
                  disabled={deliveryBoyMutation.isPending}
                >
                  {deliveryBoyMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  {editingDeliveryBoy ? 'Update Delivery Boy' : 'Add Delivery Boy'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
        </div>
      ) : deliveryBoys && deliveryBoys.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {deliveryBoys.map((deliveryBoy) => (
            <div
              key={deliveryBoy.id}
              className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border/50"
            >
              <div className="w-12 h-12 rounded-lg gradient-gold flex items-center justify-center flex-shrink-0">
                <Package className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-bold text-lg">{deliveryBoy.username}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-600">
                    {deliveryBoy.is_active ? 'Active' : 'Inactive'}
                  </span>
                  {deliveryBoy.is_banned && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-600">
                      Banned
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
                  {deliveryBoy.phone && (
                    <span>• {deliveryBoy.phone}</span>
                  )}
                  {deliveryBoy.email && (
                    <span>• {deliveryBoy.email}</span>
                  )}
                  <span>• Created: {new Date(deliveryBoy.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEditDeliveryBoy(deliveryBoy)}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => deleteDeliveryBoyMutation.mutate(deliveryBoy.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-card rounded-xl border border-border/50">
          <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No delivery boys yet. Add your first delivery boy!</p>
        </div>
      )}
    </div>
  );
};