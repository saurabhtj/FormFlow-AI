import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { FileText, Sparkles, Shield, ArrowRight } from 'lucide-react';
import { Hero3D } from '../components/ui/Hero3D';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-navy-900 text-white selection:bg-indigo-500/30 relative">
      {/* Navbar */}
      <nav className="container mx-auto px-6 py-4 flex items-center justify-between border-b border-white/10 relative z-20">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-indigo-500" />
          <span className="text-xl font-bold">FormFlow AI</span>
        </div>
        <div className="flex gap-4">
          <Link to="/auth">
            <Button variant="ghost">Log in</Button>
          </Link>
          <Link to="/auth">
            <Button variant="primary">Get Started</Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative">
        <Hero3D />
        <section className="container mx-auto px-6 py-24 text-center relative z-10 flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 mb-8 border border-indigo-500/20 backdrop-blur-md">
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-medium">AI-Powered Form Filling</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
          Never fill out another<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
            boring form again.
          </span>
        </h1>
        <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
          Upload any PDF or image form. Our AI extracts the fields and auto-fills them using your secure encrypted profile. Done in seconds.
        </p>
        <div className="flex justify-center gap-4">
          <Link to="/auth">
            <Button size="lg" className="gap-2">
              Start Free <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>
      </div>

      {/* Features */}
      <section className="container mx-auto px-6 py-24 border-t border-white/10">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl bg-navy-800/50 border border-white/5 hover:border-indigo-500/30 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center mb-6 text-indigo-400">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Any Format</h3>
            <p className="text-gray-400">Upload PDFs or images. Government forms, college apps, visas—we handle it all.</p>
          </div>
          <div className="p-6 rounded-2xl bg-navy-800/50 border border-white/5 hover:border-indigo-500/30 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-6 text-purple-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Smart AI Mapping</h3>
            <p className="text-gray-400">Our AI understands the context of fields and maps them to your profile perfectly.</p>
          </div>
          <div className="p-6 rounded-2xl bg-navy-800/50 border border-white/5 hover:border-indigo-500/30 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center mb-6 text-green-400">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Bank-Grade Security</h3>
            <p className="text-gray-400">Your profile data is AES-256 encrypted. Only you can access your personal vault.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
