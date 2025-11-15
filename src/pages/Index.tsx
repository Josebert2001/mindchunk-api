import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Hero } from "@/components/Hero";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleGetStarted = () => {
    if (user) {
      navigate("/study");
    } else {
      navigate("/auth");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold gradient-primary bg-clip-text text-transparent">
            MindChunk
          </h1>
          
          <div className="flex items-center gap-4">
            {user ? (
              <Button
                onClick={() => navigate("/study")}
                className="gradient-primary text-primary-foreground hover:opacity-90"
              >
                Go to Study
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => navigate("/auth")}
                  variant="ghost"
                >
                  Log In
                </Button>
                <Button
                  onClick={() => navigate("/auth")}
                  className="gradient-primary text-primary-foreground hover:opacity-90"
                >
                  Sign Up Free
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <Hero onGetStarted={handleGetStarted} />

      <footer className="border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2024 MindChunk. Built for ADHD-friendly learning.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
