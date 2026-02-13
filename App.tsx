import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { MessageBubble } from './components/MessageBubble';
import { Canvas } from './components/Canvas';
import { AppMode, Message, PptOptions, Session } from './types';
import { sendMessage, fetchSessions, loadSession } from './services/api';

const App: React.FC = () => {
  // State
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mode, setMode] = useState<AppMode>(AppMode.CHAT);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeFile, setActiveFile] = useState<File | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>(
    localStorage.getItem('ANYGEM_USER_ID') || `UID_${Date.now()}`
  );

  // Configuration State
  const [pptOptions, setPptOptions] = useState<PptOptions>({
    length: 6, 
    density: 'detailed', 
    theme: 'modern_blue', 
    pptMode: 'hybrid', 
    visualStyle: '',
    language: 'Traditional Chinese',
    audience: 'General'
  });
  const [reportStyle, setReportStyle] = useState('Professional');

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Effects
  useEffect(() => {
    localStorage.setItem('ANYGEM_USER_ID', currentSessionId);
    loadHistoryList();
    // Initial welcome message
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome', role: 'ai', timestamp: Date.now(),
        text: "👋 **Welcome to anyGem Next.**\n\nI am your upgraded AI agent. Select a mode above (Chat, Search, Report, Slides) to begin. I feature a split-view workspace for complex tasks."
      }]);
    }
  }, [currentSessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  const loadHistoryList = async () => {
    const data = await fetchSessions();
    if (data.sessions) setSessions(data.sessions);
  };

  const handleNewChat = () => {
    const newId = `UID_${Date.now()}`;
    setCurrentSessionId(newId);
    setMessages([]);
    setMode(AppMode.CHAT);
  };

  const handleSend = async () => {
    if (!input.trim() && !activeFile) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: Date.now(),
      meta: { fileName: activeFile?.name }
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Prepare Payload
    let fileData = undefined;
    if (activeFile) {
      fileData = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(activeFile);
      });
    }

    const payload = {
      message: userMsg.text,
      session_id: currentSessionId,
      mode: mode,
      file_data: fileData ? (fileData as string).split(',')[1] : undefined,
      mime_type: activeFile?.type,
      options: {
        ...pptOptions,
        style: reportStyle // For report mode
      }
    };

    setActiveFile(null); // Clear file after send

    // API Call
    const response = await sendMessage(payload);
    setLoading(false);

    if (response.status === 'success') {
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: response.reply || "Done.",
        thinking: response.thinking, // Assuming backend sends this now
        timestamp: Date.now(),
        meta: {
          model: response.model,
          image: response.image,
          mime: response.mime,
        }
      };
      setMessages(prev => [...prev, aiMsg]);
      loadHistoryList();
    } else {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'system',
        text: `🚨 Error: ${response.error || "Unknown error"}`,
        timestamp: Date.now()
      }]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setActiveFile(e.target.files[0]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const loadSessionHandler = async (id: string) => {
    setCurrentSessionId(id);
    const data = await loadSession(id);
    if (data.logs) {
      setMessages(data.logs.map((l: any, i: number) => ({
        id: `${id}_${i}`,
        role: l.role,
        text: l.text,
        timestamp: Date.now()
      })));
    }
  };

  const deleteSessionHandler = (id: string) => {
     // Optimistic update
     setSessions(prev => prev.filter(s => s.id !== id));
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden">
      {/* Mobile Sidebar Toggle */}
      <div className={`fixed inset-0 bg-black/50 z-40 transition-opacity ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'} md:hidden`} onClick={() => setSidebarOpen(false)} />

      <Sidebar 
        isOpen={sidebarOpen}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onNewChat={handleNewChat}
        onSelectSession={loadSessionHandler}
        onDeleteSession={deleteSessionHandler}
      />

      <div className="flex-1 flex flex-col h-full relative">
        {/* Header */}
        <header className="h-14 border-b border-slate-800 flex items-center px-4 justify-between bg-slate-900/50 backdrop-blur-sm z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden text-slate-400 hover:text-white">
              <i className="fas fa-bars"></i>
            </button>
            <div className="font-bold text-white tracking-wide">anyGem <span className="text-primary font-normal">Next</span></div>
          </div>
          
          <div className="flex items-center bg-slate-800 rounded-lg p-1">
            {Object.values(AppMode).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all capitalize ${mode === m ? 'bg-primary text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
              >
                {m}
              </button>
            ))}
          </div>
        </header>

        {/* Main Workspace */}
        <div className="flex-1 flex overflow-hidden">
          {/* Chat Area */}
          <div className="flex-1 flex flex-col relative">
            <div className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth">
              <div className="max-w-3xl mx-auto">
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}
                {loading && (
                  <div className="flex justify-start w-full mb-6 animate-pulse">
                    <div className="bg-slate-800 rounded-2xl rounded-tl-sm p-4 text-slate-400 text-sm flex items-center gap-2">
                       <i className="fas fa-circle-notch fa-spin text-primary"></i>
                       Processing...
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/80 backdrop-blur-md">
              <div className="max-w-3xl mx-auto relative">
                {activeFile && (
                  <div className="absolute -top-12 left-0 bg-slate-800 text-slate-300 text-xs px-3 py-2 rounded-lg border border-slate-700 flex items-center gap-2 shadow-lg">
                    <i className="fas fa-file"></i> {activeFile.name}
                    <button onClick={() => setActiveFile(null)} className="hover:text-red-400"><i className="fas fa-times"></i></button>
                  </div>
                )}
                
                <div className="flex items-end gap-2 bg-slate-800/50 border border-slate-700 rounded-xl p-2 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3 text-slate-400 hover:text-white transition-colors"
                    title="Upload File"
                  >
                    <i className="fas fa-paperclip"></i>
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileSelect}
                  />
                  
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Ask anything in ${mode} mode...`}
                    className="flex-1 bg-transparent border-none outline-none text-slate-200 text-sm resize-none max-h-32 py-3"
                    rows={1}
                    style={{ minHeight: '44px' }}
                  />
                  
                  <button 
                    onClick={handleSend}
                    disabled={loading || (!input.trim() && !activeFile)}
                    className="p-3 bg-primary hover:bg-emerald-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-900/20"
                  >
                    <i className="fas fa-paper-plane"></i>
                  </button>
                </div>
                <div className="text-center mt-2 text-[10px] text-slate-600">
                  AI can make mistakes. Check important info.
                </div>
              </div>
            </div>
          </div>

          {/* Canvas / Configuration Panel */}
          <Canvas 
            mode={mode} 
            pptOptions={pptOptions} 
            setPptOptions={setPptOptions}
            reportStyle={reportStyle}
            setReportStyle={setReportStyle}
            activeFile={activeFile}
          />
        </div>
      </div>
    </div>
  );
};

export default App;