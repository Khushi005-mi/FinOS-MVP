'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, handleApiError } from '@/lib/api';
import { 
  MessageSquare, Send, Bot, User, Loader2, ShieldCheck, 
  Terminal, FileText, ArrowRight, ExternalLink, X, 
  CheckCircle2, Info, Sparkles, ChevronRight, Eye, ShieldAlert, CornerDownRight
} from 'lucide-react';
import { 
  Eyebrow, 
  IndianCurrencyDisplay, 
  ThreeWayNode, 
  StatusBadge, 
  ProvenanceChip 
} from '@/components/ui/primitives';

interface KeyFigure {
  label: string;
  value_display: string;
  calculation: string;
}

interface EvidenceItem {
  source_file: string;
  file_type: string;
  row_number: number;
  field_name: string;
  value_display: string;
  reference: string;
  status: string;
}

interface GroundedResponse {
  direct_answer: string;
  verification_state: string;
  key_figures: KeyFigure[];
  evidence: EvidenceItem[];
  limitations_or_assumptions: string;
  recommended_next_action: string;
  action_cta?: { label: string; link: string };
}

interface ChatMessage {
  sender: 'user' | 'assistant';
  text?: string;
  grounded?: GroundedResponse;
}

export default function GuardedAskPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: 'assistant',
      text: 'Welcome to FinOS Guarded Ask. I answer operational finance queries strictly from your verified bank, gateway, and ledger records with deterministic calculations and row-level source citations.'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Lineage Micro-Inspector Modal State (Preserved)
  const [modalOpen, setModalOpen] = useState(false);
  const [inspectingItem, setInspectingItem] = useState<EvidenceItem | null>(null);

  const suggestedQueries = [
    "What is our match rate?",
    "Why is ₹4.39 lakh missing?",
    "Show evidence for settle_104",
    "Can we safely pay ₹3 lakh?",
    "Which vendor should I pay first?",
    "What happens if we defer Sharma Traders?",
    "Did GST on MDR get recorded?",
    "Which customer should I chase first?"
  ];

  const handleSend = async (queryText?: string) => {
    const q = (queryText || input).trim();
    if (!q || loading) return;

    setInput('');
    setMessages((prev) => [...prev, { sender: 'user', text: q }]);
    setLoading(true);

    try {
      const response = await api.post('/ask/', { question: q });
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          grounded: response.data
        }
      ]);
    } catch (err: unknown) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: `Verification Error: ${handleApiError(err)}`
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const openLineageInspector = (ev: EvidenceItem) => {
    setInspectingItem(ev);
    setModalOpen(true);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 font-sans pb-16">
      {/* 1. Header Banner */}
      <div className="hairline-card rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-ink-800 border border-white/10 flex items-center justify-center text-brass">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-sage animate-pulse" />
              <Eyebrow>Deterministic Grounded Intelligence</Eyebrow>
            </div>
            <h1 className="text-xl font-serif text-stone-100 tracking-tight">
              Guarded <span className="italic font-normal text-brass">Financial Assistant</span>
            </h1>
            <p className="text-xs text-stone-400 mt-0.5">
              Source-grounded answers derived strictly from bank, gateway, and ledger records. No generative hallucination.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono text-sage bg-sage-dim border border-sage-border px-3 py-1.5 rounded-lg font-medium">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>Hallucination Guard Active</span>
        </div>
      </div>

      {/* 2. Suggested Queries Strip */}
      <div className="space-y-2">
        <Eyebrow>Suggested Operational Queries</Eyebrow>
        <div className="flex flex-wrap gap-2">
          {suggestedQueries.map((sq, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(sq)}
              disabled={loading}
              className="px-3 py-1.5 bg-ink-900 hover:bg-ink-850 border border-white/[0.07] hover:border-brass/30 text-stone-300 hover:text-white rounded-lg text-xs font-mono transition text-left disabled:opacity-50"
            >
              {sq}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Conversational Message Stream */}
      <div className="space-y-4">
        {messages.map((m, idx) => (
          <div 
            key={idx}
            className={`flex items-start gap-3.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.sender === 'assistant' && (
              <div className="w-8 h-8 rounded-lg bg-ink-850 border border-white/10 flex items-center justify-center text-brass shrink-0 mt-1">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div className={`max-w-2xl rounded-2xl p-5 space-y-4 ${
              m.sender === 'user'
                ? 'bg-brass text-stone-950 font-semibold text-xs rounded-tr-none shadow-sm'
                : 'hairline-card rounded-tl-none border-white/[0.08]'
            }`}>
              {/* Plain Text Message */}
              {m.text && (
                <p className="text-xs leading-relaxed font-sans">{m.text}</p>
              )}

              {/* Grounded Rich Structured Response */}
              {m.grounded && (
                <div className="space-y-4 text-xs font-sans">
                  {/* Direct Answer & Verification Status Badge */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                      <span className="text-[10px] font-mono text-stone-500 uppercase tracking-wider">Verified Finding</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                        m.grounded.verification_state === 'VERIFIED_FACT'
                          ? 'bg-sage-dim text-sage border-sage-border'
                          : 'bg-amber-dim text-amber border-dashed border-amber-border'
                      }`}>
                        {m.grounded.verification_state === 'VERIFIED_FACT' ? '● VERIFIED FACT' : '○ INFERRED PROJECTION'}
                      </span>
                    </div>

                    <p className="text-sm font-medium text-stone-100 leading-relaxed">
                      {m.grounded.direct_answer}
                    </p>
                  </div>

                  {/* Key Figures Strip */}
                  {m.grounded.key_figures && m.grounded.key_figures.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                      {m.grounded.key_figures.map((kf, kfIdx) => (
                        <div key={kfIdx} className="p-3 bg-ink-950 rounded-xl border border-white/5 space-y-1">
                          <span className="text-[10px] font-mono uppercase text-stone-500 block">{kf.label}</span>
                          <div className="text-base font-mono font-bold text-stone-100">{kf.value_display}</div>
                          <span className="text-[10px] font-mono text-stone-500 block truncate">{kf.calculation}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Row-Level Evidence Citations (Motif 2) */}
                  {m.grounded.evidence && m.grounded.evidence.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-white/[0.06]">
                      <span className="text-[10px] font-mono uppercase text-stone-500">Cryptographic Source Lineage</span>
                      <div className="space-y-1.5">
                        {m.grounded.evidence.map((ev, evIdx) => (
                          <div 
                            key={evIdx}
                            className="p-2.5 bg-ink-950/80 rounded-lg border border-white/5 flex items-center justify-between text-xs font-mono"
                          >
                            <div className="flex items-center gap-2 truncate max-w-md">
                              <FileText className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                              <span className="text-stone-300 font-semibold truncate">{ev.source_file}</span>
                              <span className="text-stone-600">·</span>
                              <span className="text-stone-400">Row {ev.row_number}</span>
                              <span className="text-stone-600">·</span>
                              <span className="text-brass font-bold">{ev.value_display}</span>
                            </div>

                            <button
                              onClick={() => openLineageInspector(ev)}
                              className="text-[11px] text-brass hover:text-brass-hover flex items-center gap-1 font-sans shrink-0 ml-2"
                            >
                              <span>Inspect</span> <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Limitations or Assumptions */}
                  {m.grounded.limitations_or_assumptions && (
                    <div className="p-3 bg-amber-dim border border-amber-border/40 rounded-xl text-amber text-[11px] font-sans flex items-start gap-2">
                      <Info className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{m.grounded.limitations_or_assumptions}</span>
                    </div>
                  )}

                  {/* Recommended Next Action & CTA */}
                  {m.grounded.recommended_next_action && (
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-2 border-t border-white/[0.06]">
                      <div className="flex items-center gap-1.5 text-stone-300 text-xs">
                        <CornerDownRight className="w-3.5 h-3.5 text-brass shrink-0" />
                        <span>{m.grounded.recommended_next_action}</span>
                      </div>
                      {m.grounded.action_cta && (
                        <button
                          onClick={() => router.push(m.grounded?.action_cta?.link || '/queue')}
                          className="px-3 py-1 bg-brass hover:bg-brass-hover text-stone-950 font-bold rounded-lg text-xs transition flex items-center gap-1 shrink-0"
                        >
                          <span>{m.grounded.action_cta.label}</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {m.sender === 'user' && (
              <div className="w-8 h-8 rounded-lg bg-brass text-stone-950 font-bold flex items-center justify-center text-xs shrink-0 mt-1">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-3 text-stone-500 font-mono text-xs p-4 bg-ink-900 rounded-xl border border-white/5 animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-brass" />
            <span>Scanning PostgreSQL transactional vault with row-level proof verification...</span>
          </div>
        )}
      </div>

      {/* 4. Query Input Box */}
      <div className="hairline-card rounded-2xl p-2.5 flex items-center gap-2 bg-ink-900 border-white/10">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Ask any financial question: cash headroom, fee variance, vendor terms, missing payouts..."
          className="flex-1 bg-transparent px-4 py-2.5 text-xs text-white placeholder-stone-500 focus:outline-none"
        />
        <button
          onClick={() => handleSend()}
          disabled={loading || !input.trim()}
          className="px-4 py-2.5 bg-brass hover:bg-brass-hover text-stone-950 font-bold rounded-xl text-xs transition flex items-center gap-1.5 disabled:opacity-50"
        >
          <span>Send</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 5. Lineage Micro-Inspector Modal (Preserved) */}
      {modalOpen && inspectingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="hairline-card bg-ink-900 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-white/[0.06] pb-3">
              <div>
                <h3 className="text-base font-serif text-stone-100 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-brass" /> Row-Level Lineage Proof
                </h3>
                <span className="text-xs font-mono text-stone-400">{inspectingItem.source_file}</span>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-stone-500 hover:text-stone-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-ink-950 rounded-xl space-y-2 text-xs font-mono border border-white/5">
              <div className="flex justify-between">
                <span className="text-stone-500">File Type:</span>
                <span className="text-stone-200">{inspectingItem.file_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Row Number:</span>
                <span className="text-brass font-bold">Line {inspectingItem.row_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Field Target:</span>
                <span className="text-stone-200">{inspectingItem.field_name}</span>
              </div>
              <div className="flex justify-between border-t border-white/5 pt-1">
                <span className="text-stone-500">Recorded Amount / Value:</span>
                <span className="text-sage font-bold">{inspectingItem.value_display}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Transaction Reference:</span>
                <span className="text-stone-300 truncate max-w-xs">{inspectingItem.reference}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button 
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 bg-ink-800 hover:bg-ink-750 text-stone-300 rounded-lg text-xs font-semibold"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
