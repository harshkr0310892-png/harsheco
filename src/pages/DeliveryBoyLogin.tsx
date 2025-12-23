import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Package } from "lucide-react";

interface DeliveryBoy {
  id: string;
  username: string;
  phone?: string;
  email?: string;
  is_active: boolean;
  is_banned: boolean;
  created_at: string;
}

export default function DeliveryBoyLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Hash the password to match what's stored in the database
      const hashedPassword = await hashPassword(password);
      
      // Query the delivery_boys table for the user
      const result = await supabase
        .from('delivery_boys' as any)
        .select('id, username, is_active, is_banned')
        .eq('username', username)
        .eq('password_hash', hashedPassword)
        .single();

      if (result.error) {
        console.error("Login error:", result.error);
        toast.error("Invalid credentials");
        return;
      }

      if (!result.data || result.data === null) {
        toast.error("Invalid credentials");
        return;
      }

      // Check if the account is active
      if (!(result.data as any).is_active) {
        toast.error("Account is inactive. Please contact admin.");
        return;
      }

      // Check if the account is banned
      if ((result.data as any).is_banned) {
        toast.error("Account is banned. Please contact admin.");
        return;
      }

      // Store delivery boy session in sessionStorage
      sessionStorage.setItem('delivery_boy_logged_in', 'true');
      sessionStorage.setItem('delivery_boy_id', (result.data as any).id);
      sessionStorage.setItem('delivery_boy_username', (result.data as any).username);

      toast.success("Login successful!");
      navigate('/delivery-boy'); // Redirect to delivery boy dashboard
    } catch (err) {
      console.error("Login error:", err);
      toast.error("An error occurred during login");
    } finally {
      setLoading(false);
    }
  };

  const hashPassword = async (password: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Package className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Delivery Boy Login</CardTitle>
          <CardDescription>
            Enter your credentials to access your delivery dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="mt-1"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}