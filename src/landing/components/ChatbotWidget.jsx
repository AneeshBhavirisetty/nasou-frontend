import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';

const ChatbotWidget = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const isManufacturer = location.pathname.includes('/manufacturer');
  const isRetailer = location.pathname.includes('/retailer');
  const isCustomer = location.pathname.includes('/customer');
  const isAuth = location.pathname.includes('/auth');
  const assistantName = isManufacturer ? 'Nasuo Manufacturing Assistant' : isRetailer ? 'Nasuo Retail Assistant' : isCustomer ? 'Nasuo Shopping Assistant' : 'Nasuo AI Assistant';
  const capabilities = useMemo(
    () => isManufacturer
      ? ['Inventory Questions', 'Production Reports', 'Order Status', 'Supply Chain Insights', 'Smart Recommendations']
      : isCustomer
        ? ['Product Recommendations', 'Order Tracking', 'Return Support', 'Shopping Suggestions', 'Deal Discovery', 'Voice Input', 'Image Upload']
        : ['Product Search', 'Supplier Comparison', 'Inventory Questions', 'Order Tracking', 'Business Insights'],
    [isCustomer, isManufacturer],
  );
  const [messages, setMessages] = useState([{ text: 'How can I help with operations today?', sender: 'bot' }]);
  const [input, setInput] = useState('');

  useEffect(() => {
    const openAssistant = () => setIsOpen(true);
    window.addEventListener('nasuo:open-assistant', openAssistant);
    return () => window.removeEventListener('nasuo:open-assistant', openAssistant);
  }, []);

  const sendMessage = () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { text: input, sender: 'user' }]);
    setTimeout(() => {
      setMessages((prev) => [...prev, { text: "Thanks! I'll connect you to a supply chain expert soon.", sender: 'bot' }]);
    }, 500);
    setInput('');
  };

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className={`fixed z-50 rounded-full border border-white/30 bg-[#1F5C4A] text-white shadow-[0_20px_50px_rgba(31,92,74,0.35)] ${isAuth ? 'bottom-5 right-5 p-2.5' : 'bottom-6 right-6 p-4'}`}
        aria-label="Open AI assistant"
        title="AI Assistant"
      >
        <svg viewBox="0 0 24 24" className={isAuth ? 'h-4 w-4' : 'h-6 w-6'} fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="8.5" />
          <path d="M8.5 10.5a3.5 3.5 0 1 1 7 0v3.5h-7v-3.5Z" />
          <circle cx="10.2" cy="11.2" r="0.8" fill="currentColor" stroke="none" />
          <circle cx="13.8" cy="11.2" r="0.8" fill="currentColor" stroke="none" />
          <path d="M9.5 15.8c.7.6 1.5.9 2.5.9s1.8-.3 2.5-.9" />
          <path d="M12 3v2.2" />
        </svg>
      </motion.button>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, y: 100, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 100, scale: 0.9 }} className="fixed bottom-24 right-6 z-50 flex w-96 max-w-[90vw] flex-col overflow-hidden rounded-[20px] border border-white/70 bg-[#F7F9F8]/95 shadow-[0_28px_80px_rgba(31,59,52,0.24)] backdrop-blur-2xl">
            <div className="flex items-center justify-between border-b border-[#DCE5E1] bg-[#1F3B34] p-4 text-white"><span className="font-bold">{assistantName}</span><button onClick={() => setIsOpen(false)} aria-label="Close assistant" className="text-xl leading-none">&times;</button></div>
            <div className="flex flex-wrap gap-2 border-b border-[#E1E8E5] p-3">
              {capabilities.map((capability) => <button key={capability} type="button" onClick={() => setInput(capability)} className="rounded-full bg-[#E6ECEA] px-3 py-1.5 text-[11px] font-bold text-[#1F5C4A]">{capability}</button>)}
            </div>
            <div className="h-64 space-y-3 overflow-auto p-4">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[78%] rounded-[14px] p-3 text-sm ${msg.sender === 'user' ? 'bg-[#1F5C4A] text-white' : 'bg-white text-[#1F3B34] shadow-sm'}`}>{msg.text}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 border-t border-[#E1E8E5] p-4">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Ask me anything..."
                className="min-w-0 flex-1 rounded-xl border border-[#DCE5E1] bg-white px-4 py-2 text-sm text-[#1F3B34] outline-none"
              />
              <button onClick={sendMessage} className="rounded-xl bg-[#1F5C4A] px-4 py-2 text-sm font-bold text-white">Send</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatbotWidget;
