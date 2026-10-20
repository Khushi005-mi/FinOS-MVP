'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, handleApiError } from '@/lib/api';
import { 
  MessageSquare, Send, Bot, User, Loader2, ShieldCheck, 
  Terminal, FileText, ArrowRight, ExternalLink, X, 
  CheckCircle2, Info, Sparkles, ChevronRight 
} from 'lucide-react';

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
      text: 'Welcome to FinOS Guarded Ask. I answer operational queries strictly from your verified company records with deterministic calculations and row-level source citations.'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Lineage Micro-Inspector Modal State
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
    <div className="max-w-5xl mx-auto space-y-6">
      {/* 1. Top Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Guarded Financial Assistant</h1>
            <p className="text-xs text-slate-500 mt-0.5">Source-grounded answers derived strictly from verified bank, gateway, and ledger records.</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Source Record Grounding Active</span>
        </div>
      </div>

      {/* 2. Suggested Verified Query Chips */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Suggested Verified Queries</p>
        <div className="flex flex-wrap gap-2">
          {suggestedQueries.map((sq, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(sq)}
              disabled={loading}
              className="bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-900 px-3 py-1.5 rounded-lg text-xs font-medium transition shadow-sm flex items-center space-x-1.5 disabled:opacity-50"
            >
              <span>{sq}</span>
              <ChevronRight className="w-3 h-3 text-slate-400" />
            </button>
          ))}
        </div>
      </div>

      {/* 3. Chat & Grounded Answer Feed */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5 min-h-[440px] max-h-[620px] overflow-y-auto">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex items-start space-x-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.sender === 'assistant' && (
              <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                F
              </div>
            )}

            {/* Plain User Query */}
            {msg.sender === 'user' && (
              <div className="max-w-xl bg-slate-900 text-white rounded-xl px-4 py-2.5 text-xs font-medium shadow-sm leading-relaxed">
                {msg.text}
              </div>
            )}

            {/* Introductory Assistant Note */}
            {msg.sender === 'assistant' && msg.text && (
              <div className="max-w-xl bg-slate-50 border border-slate-200 text-slate-700 rounded-xl p-4 text-xs leading-relaxed">
                {msg.text}
              </div>
            )}

            {/* STRUCTURED 6-PART GROUNDED ANSWER CARD */}
            {msg.sender === 'assistant' && msg.grounded && (
              <div className="w-full max-w-3xl bg-slate-50/70 border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 text-xs">
                {/* A: Header & Verification State */}
                <div className="flex justify-between items-center border-b border-slate-200/80 pb-2.5">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Verified Answer</span>
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                    msg.grounded.verification_state === 'ACTION_REQUIRED' 
                      ? 'bg-rose-50 text-rose-800 border border-rose-200' 
                      : msg.grounded.verification_state === 'SAFE' || msg.grounded.verification_state === 'VERIFIED'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}>
                    {msg.grounded.verification_state}
                  </span>
                </div>

                {/* B: Direct Answer */}
                <div className="text-slate-900 text-sm leading-relaxed font-medium">
                  {msg.grounded.direct_answer}
                </div>

                {/* C: Key Figures Grid */}
                {msg.grounded.key_figures && msg.grounded.key_figures.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    {msg.grounded.key_figures.map((fig, fIdx) => (
                      <div key={fIdx} className="p-3 bg-white border border-slate-200 rounded-lg space-y-0.5 shadow-sm">
                        <span className="text-[11px] text-slate-500 font-medium block">{fig.label}</span>
                        <span className="text-base font-bold text-slate-900 block tabular-nums">{fig.value_display}</span>
                        <span className="text-[10px] text-slate-400 block pt-1 border-t border-slate-100 truncate" title={fig.calculation}>
                          {fig.calculation}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* D: Cited Evidence (Click-to-Source) */}
                {msg.grounded.evidence && msg.grounded.evidence.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-200/80">
                    <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider flex items-center space-x-1">
                      <Terminal className="w-3.5 h-3.5 text-slate-500" />
                      <span>Cited Source Records (Click to Inspect Lineage)</span>
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {msg.grounded.evidence.map((ev, eIdx) => (
                        <div
                          key={eIdx}
                          onClick={() => openLineageInspector(ev)}
                          className="p-3 bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 rounded-lg cursor-pointer transition group flex justify-between items-center shadow-sm"
                        >
                          <div>
                            <span className="text-slate-900 font-semibold block group-hover:text-blue-700 tabular-nums">
                              {ev.reference} &bull; {ev.value_display}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {ev.source_file} (Row #{ev.row_number}) &bull; {ev.status}
                            </span>
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* E: Limitations or Assumptions */}
                {msg.grounded.limitations_or_assumptions && (
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-amber-900 text-xs leading-relaxed flex items-start space-x-2">
                    <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-semibold text-amber-950">Data Limitations: </strong>
                      <span>{msg.grounded.limitations_or_assumptions}</span>
                    </div>
                  </div>
                )}

                {/* F: Recommended Next Action & CTA Button */}
                <div className="pt-2 border-t border-slate-200/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="text-slate-600 text-xs">
                    <strong className="text-slate-900 font-semibold">Recommended Action: </strong>
                    <span>{msg.grounded.recommended_next_action}</span>
                  </div>

                  {msg.grounded.action_cta && (
                    <button
                      onClick={() => router.push(msg.grounded.action_cta!.link)}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3.5 py-1.5 rounded-lg transition text-xs flex items-center space-x-1.5 shrink-0 shadow-sm"
                    >
                      <span>{msg.grounded.action_cta.label}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {msg.sender === 'user' && (
              <div className="w-7 h-7 rounded-lg bg-slate-200 flex items-center justify-center text-slate-700 shrink-0 mt-0.5 text-xs font-bold">
                <User className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center space-x-2.5 text-xs text-slate-500 bg-slate-50 border border-slate-200 p-3 rounded-lg w-fit">
            <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
            <span>Querying verified records under tenant RLS...</span>
          </div>
        )}
      </div>

      {/* 4. Query Input Bar */}
      <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex space-x-2 bg-white border border-slate-200 p-2 rounded-xl shadow-sm">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a verified operational query (e.g., 'What is our match rate?' or 'Can we safely pay ₹3 lakh?')..."
          className="flex-1 bg-white px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none text-xs transition"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg transition text-xs font-semibold shadow-sm disabled:opacity-50 flex items-center space-x-1.5 shrink-0"
        >
          <span>Verify</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>

      {/* 5. Click-to-Source Micro-Inspector Modal */}
      {modalOpen && inspectingItem && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 shadow-xl space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <FileText className="w-4 h-4 text-slate-600" />
                <span>Source Provenance Inspector</span>
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-700 transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-1.5 text-slate-600">
              <p><span className="text-slate-500">Source File:</span> <strong className="text-slate-900">{inspectingItem.source_file}</strong></p>
              <p><span className="text-slate-500">System Type:</span> <strong className="text-blue-700">{inspectingItem.file_type}</strong></p>
              <p><span className="text-slate-500">Physical Row:</span> <strong className="text-slate-900">#{inspectingItem.row_number}</strong></p>
              <p><span className="text-slate-500">Cited Field:</span> <strong className="text-slate-900">{inspectingItem.field_name}</strong></p>
              <p><span className="text-slate-500">Normalized Value:</span> <strong className="text-emerald-700 font-semibold tabular-nums">{inspectingItem.value_display}</strong></p>
              <p><span className="text-slate-500">Audit Status:</span> <strong className="text-amber-700 font-semibold">{inspectingItem.status}</strong></p>
            </div>

            <p className="text-[11px] text-slate-500 italic">
              Record verified against PostgreSQL kernel with tamper-evident SHA-256 seal.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}