// =============================================================================
// HOME PAGE - CREDIT DECISION LLM RAG PLATFORM
// =============================================================================

import { Metadata } from 'next';
import Link from 'next/link';
import { 
  ArrowRightIcon, 
  ChartBarIcon, 
  ShieldCheckIcon, 
  CpuChipIcon,
  DocumentTextIcon,
  UserGroupIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// =============================================================================
// METADATA
// =============================================================================

export const metadata: Metadata = {
  title: 'Home',
  description: 'Welcome to the Credit Decision Platform - AI-powered lending decisions with RAG capabilities.',
};

// =============================================================================
// FEATURES DATA
// =============================================================================

const features = [
  {
    name: 'AI-Powered Analysis',
    description: 'Advanced machine learning models analyze credit applications with unprecedented accuracy and speed.',
    icon: CpuChipIcon,
    color: 'bg-blue-500',
  },
  {
    name: 'RAG Technology',
    description: 'Retrieval-Augmented Generation provides contextual insights from your knowledge base.',
    icon: DocumentTextIcon,
    color: 'bg-purple-500',
  },
  {
    name: 'Risk Assessment',
    description: 'Comprehensive risk evaluation with real-time scoring and probability calculations.',
    icon: ShieldCheckIcon,
    color: 'bg-green-500',
  },
  {
    name: 'Real-time Decisions',
    description: 'Instant credit decisions with detailed explanations and compliance documentation.',
    icon: ClockIcon,
    color: 'bg-orange-500',
  },
  {
    name: 'Advanced Analytics',
    description: 'Deep insights into lending patterns, risk factors, and portfolio performance.',
    icon: ChartBarIcon,
    color: 'bg-indigo-500',
  },
  {
    name: 'Team Collaboration',
    description: 'Seamless workflow management with role-based access and audit trails.',
    icon: UserGroupIcon,
    color: 'bg-pink-500',
  },
];

// =============================================================================
// STATS DATA
// =============================================================================

const stats = [
  { name: 'Applications Processed', value: '10,000+', change: '+12%' },
  { name: 'Average Decision Time', value: '2.3 min', change: '-45%' },
  { name: 'Accuracy Rate', value: '94.7%', change: '+8%' },
  { name: 'Risk Reduction', value: '23%', change: '+15%' },
];

// =============================================================================
// HOME PAGE COMPONENT
// =============================================================================

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-gray-900">
                  Credit Decision Platform
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/auth/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button size="sm">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <Badge variant="secondary" className="mb-6">
              🚀 Now with Advanced RAG Technology
            </Badge>
            
            <h1 className="text-4xl sm:text-6xl font-bold text-gray-900 mb-6">
              AI-Powered
              <span className="text-brand-600 block">Credit Decisions</span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Transform your lending process with intelligent automation, 
              comprehensive risk assessment, and real-time decision making 
              powered by cutting-edge AI and RAG technology.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/register">
                <Button size="lg" className="w-full sm:w-auto">
                  Start Free Trial
                  <ArrowRightIcon className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/demo">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  View Demo
                </Button>
              </Link>
            </div>
          </div>
        </div>
        
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-brand-100 rounded-full blur-3xl opacity-30"></div>
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-purple-100 rounded-full blur-3xl opacity-30"></div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.name} className="text-center">
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-600 mb-1">{stat.name}</div>
                <div className="text-sm text-green-600 font-medium">
                  {stat.change} from last month
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Powerful Features for Modern Lending
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Our platform combines artificial intelligence, machine learning, 
              and advanced analytics to revolutionize credit decision making.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <Card key={feature.name} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center mb-4">
                  <div className={`p-2 rounded-lg ${feature.color}`}>
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 ml-3">
                    {feature.name}
                  </h3>
                </div>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-brand-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Transform Your Lending Process?
          </h2>
          <p className="text-xl text-brand-100 mb-8 max-w-2xl mx-auto">
            Join thousands of financial institutions already using our platform 
            to make smarter, faster, and more accurate credit decisions.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/register">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                Start Your Free Trial
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-white text-white hover:bg-white hover:text-brand-600">
                Contact Sales
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <h3 className="text-lg font-semibold mb-4">Credit Decision Platform</h3>
              <p className="text-gray-400 mb-4">
                AI-powered credit decision platform with RAG capabilities 
                for intelligent lending decisions.
              </p>
              <div className="text-sm text-gray-400">
                © 2024 Your Company. All rights reserved.
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/features" className="hover:text-white">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-white">Pricing</Link></li>
                <li><Link href="/demo" className="hover:text-white">Demo</Link></li>
                <li><Link href="/docs" className="hover:text-white">Documentation</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-sm font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/about" className="hover:text-white">About</Link></li>
                <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
                <li><Link href="/privacy" className="hover:text-white">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-white">Terms</Link></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
