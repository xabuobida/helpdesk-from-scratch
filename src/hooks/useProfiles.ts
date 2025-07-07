import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export const useProfiles = () => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Array<{ id: string; name: string; email: string }>>([]);

  const fetchProfiles = async () => {
    if (user?.role === 'customer') {
      return;
    }
    
    const { data } = await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('role', 'customer');
    
    if (data) {
      setProfiles(data);
    }
  };

  useEffect(() => {
    if (user) {
      fetchProfiles();
    }
  }, [user]);

  return { profiles };
};