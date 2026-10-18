import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HardHat,
  ArrowRight,
  ShieldCheck,
  FileSpreadsheet,
  Users,
  Boxes,
  Truck,
  AlertTriangle,
  Camera,
  Coins,
  FileText,
  CheckCircle2,
  Building2,
  TrendingUp,
  Smartphone,
  ChevronRight,
  Zap,
  Clock,
  Layers
} from 'lucide-react';

export const LandingPage = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: HardHat,
      title: 'Labour, Activity & Equipment Forms',
      description: 'Capture shift progress, trade workforce headcounts, overtime hours, and machinery deployment in unified forms.'
    },
    {
      icon: Boxes,
      title: 'Material Needed Requisitions',
      description: 'Record required site materials with quantities, units, and delivery dates before concrete pours halt.'
    },
    {
      icon: Building2,
      title: 'Multi-Project Site Governance',
      description: 'Manage multiple construction developments across Kenya with strict database-backed access permissions.'
    },
    {
      icon: FileText,
      title: 'Client-Ready PDF Reports',
      description: 'One-click generate branded PDF field reports with verified workforce, task progression, and engineer sign-off blocks.'
    }
  ];

  const steps = [
    {
      num: '01',
      title: 'Create & Budget Project',
      desc: 'Set up project milestones, client contacts, BOQ contract values and allocated budget in KES.'
    },
    {
      num: '02',
      title: 'Site Crews Log Daily Events',
      desc: 'Foremen and engineers record weather, workforce, deliveries and machinery directly on smartphones.'
    },
    {
      num: '03',
      title: 'Instant Financial & Field Intelligence',
      desc: 'Managers view live cost variances, material stock burn rates and critical safety hazards on dashboards.'
    },
    {
      num: '04',
      title: 'Export Certified PDF Reports',
      desc: 'Send formal daily, weekly and monthly site progress dossiers to clients and consultants with digital sign-offs.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Navigation Header */}
      <nav className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 text-slate-950 shadow-lg shadow-amber-500/20">
              <HardHat className="h-6 w-6 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-extrabold text-white text-xl tracking-tight">
                NASAAB
              </span>
              <span className="ml-2 rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                CONSTRUCTION LIMITED
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-300">
            <a href="#features" className="hover:text-amber-400 transition-colors">Features</a>
            <a href="#workflow" className="hover:text-amber-400 transition-colors">How It Works</a>
            <a href="#modules" className="hover:text-amber-400 transition-colors">Modules</a>
            <a href="#reports" className="hover:text-amber-400 transition-colors">PDF Reports</a>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-colors"
            >
              Log In
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-28 lg:pt-28 lg:pb-36">
        {/* Ambient Gradient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-amber-500/10 blur-[130px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[200px] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-semibold text-amber-400 mb-8 backdrop-blur-xs">
            <Zap className="h-3.5 w-3.5" />
            <span>Built for Kenyan & African Site Engineering Teams</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.1]">
            Manage Your Construction Site <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-500 to-orange-400">
              From One Place.
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Enterprise construction intelligence for NASAAB Construction projects. Track site operations, verify Labour, Activity & Equipment forms, submit material requisitions, and generate instant client-ready PDF reports.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 px-8 py-4 text-sm font-bold text-slate-950 shadow-xl shadow-amber-500/25 hover:from-amber-400 hover:to-amber-500 transition-all active:scale-95 cursor-pointer"
            >
              <span>Access Project Workspace</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* Social Proof Metric Row */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto border-t border-slate-800/80 pt-10">
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">KES 3.2B+</div>
              <div className="text-xs text-slate-400 mt-1">Project Budgets Tracked</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">1,400+</div>
              <div className="text-xs text-slate-400 mt-1">Daily Site Diaries Filed</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">100%</div>
              <div className="text-xs text-slate-400 mt-1">NCA & EBK Compliant Logs</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">0 Manual</div>
              <div className="text-xs text-slate-400 mt-1">Excel Double-Entry Paperwork</div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Interactive UI Showcase Preview */}
      <section className="relative px-4 sm:px-6 lg:px-8 -mt-10 mb-24 max-w-7xl mx-auto">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-3 sm:p-5 shadow-2xl backdrop-blur-md">
          {/* Mock Browser Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4 px-2">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-rose-500/80" />
              <span className="h-3 w-3 rounded-full bg-amber-500/80" />
              <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
              <span className="ml-2 text-xs font-mono text-slate-400">app.nasaabconstruction.com/dashboard</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-amber-400 font-semibold">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> Live Site Feed
            </div>
          </div>

          {/* Realistic Dashboard UI Mockup Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-left">
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Kenyan Sites</span>
              <div className="text-2xl font-bold text-white mt-1">4 Major Projects</div>
              <div className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Mombasa, Nairobi, Diani, Kisumu
              </div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Daily Site Workforce</span>
              <div className="text-2xl font-bold text-white mt-1">142 Workers</div>
              <div className="text-xs text-amber-400 mt-2">Masons, Steel Fixers, Operators</div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Low Stock Warnings</span>
              <div className="text-2xl font-bold text-rose-400 mt-1">2 Materials Alert</div>
              <div className="text-xs text-slate-400 mt-2">River Sand & Rebar Y12</div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Contract Expenditure</span>
              <div className="text-2xl font-bold text-amber-400 mt-1">KES 1.83B</div>
              <div className="text-xs text-slate-400 mt-2">56.5% Budget Utilization</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 border-t border-slate-800/80 bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-xs font-bold uppercase tracking-widest text-amber-400">
              Complete Site Management Ecosystem
            </h2>
            <p className="mt-3 text-3xl sm:text-4xl font-extrabold text-white">
              Every Tool Construction Professionals Need
            </p>
            <p className="mt-4 text-sm text-slate-400">
              Designed from ground up to replace fragmented WhatsApp groups, paper logbooks, and fragile spreadsheets.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div
                  key={idx}
                  className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-6 hover:border-amber-500/50 hover:bg-slate-900 transition-all duration-200"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 text-base font-bold text-white group-hover:text-amber-400 transition-colors">
                    {feat.title}
                  </h3>
                  <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                    {feat.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Workflow */}
      <section id="workflow" className="py-20 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-xs font-bold uppercase tracking-widest text-amber-400">
              Streamlined Site-To-Office Flow
            </h2>
            <p className="mt-3 text-3xl sm:text-4xl font-extrabold text-white">
              How Nasaab Construction Limited Operates On Site
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-4 gap-6">
            {steps.map((st, idx) => (
              <div key={idx} className="relative rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
                <span className="text-3xl font-extrabold text-amber-500/30 font-mono block">
                  {st.num}
                </span>
                <h4 className="mt-3 text-sm font-bold text-white">
                  {st.title}
                </h4>
                <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                  {st.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 border-t border-slate-800/80 bg-gradient-to-b from-slate-900 to-slate-950">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-amber-500 text-slate-950 shadow-xl shadow-amber-500/30 mb-6">
            <HardHat className="h-9 w-9 stroke-[2.5]" />
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Ready to Take Full Control of Your Construction Sites?
          </h2>

          <p className="mt-4 text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
            Launch the interactive demo right now. No setup, no credit card, and realistic Kenyan project datasets preloaded.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full sm:w-auto rounded-2xl bg-amber-500 px-8 py-4 text-sm font-bold text-slate-950 shadow-xl shadow-amber-500/20 hover:bg-amber-400 transition-colors"
            >
              Open Nasaab Construction Workspace →
            </button>
            <button
              onClick={() => navigate('/reports')}
              className="w-full sm:w-auto rounded-2xl border border-slate-700 bg-slate-800 px-8 py-4 text-sm font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
            >
              Test PDF Report Generation
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <HardHat className="h-5 w-5 text-amber-500" />
            <span className="font-bold text-slate-300">Nasaab Construction Limited</span>
          </div>
          <div className="flex items-center gap-6">
            <span>Nairobi • Mombasa • Kisumu • Eldoret</span>
            <span>All rights reserved © 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
