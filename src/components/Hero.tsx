import { Button } from "@/components/ui/button";
import { Brain, Sparkles, Zap } from "lucide-react";

interface HeroProps {
  onGetStarted: () => void;
}

export const Hero = ({ onGetStarted }: HeroProps) => {
  return (
    <div className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-float" style={{ animationDelay: "1s" }} />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
        {/* Icon */}
        <div className="flex justify-center mb-8">
          <div className="p-4 rounded-2xl gradient-primary shadow-glow animate-pulse-glow">
            <Brain className="w-16 h-16 text-primary-foreground" />
          </div>
        </div>

        {/* Heading */}
        <h1 className="mb-6 bg-clip-text text-transparent gradient-hero">
          Learn Smarter, Not Harder
        </h1>
        
        <p className="text-xl md:text-2xl text-muted-foreground mb-4 max-w-2xl mx-auto">
          Transform any study material into <span className="text-primary font-semibold">bite-sized chunks</span> designed for ADHD-friendly learning
        </p>

        <p className="text-lg text-muted-foreground mb-12 max-w-xl mx-auto">
          Upload PDFs or images, get AI-powered learning chunks with quizzes in minutes
        </p>

        {/* CTA Button */}
        <Button 
          size="lg"
          onClick={onGetStarted}
          className="gradient-primary text-primary-foreground hover:opacity-90 transition-smooth shadow-soft text-lg px-8 py-6 rounded-xl"
        >
          <Sparkles className="w-5 h-5 mr-2" />
          Start Learning Free
        </Button>

        {/* Features */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <FeatureCard
            icon={<Zap className="w-8 h-8" />}
            title="5-Minute Chunks"
            description="Perfect bite-sized learning sessions designed for focus"
          />
          <FeatureCard
            icon={<Brain className="w-8 h-8" />}
            title="AI-Powered"
            description="Smart content breakdown with personalized quizzes"
          />
          <FeatureCard
            icon={<Sparkles className="w-8 h-8" />}
            title="Progress Tracking"
            description="Visual rewards and achievements to stay motivated"
          />
        </div>
      </div>
    </div>
  );
};

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const FeatureCard = ({ icon, title, description }: FeatureCardProps) => {
  return (
    <div className="p-6 rounded-2xl bg-card border border-border shadow-soft hover:shadow-glow transition-smooth">
      <div className="flex justify-center mb-4 text-primary">
        {icon}
      </div>
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  );
};
