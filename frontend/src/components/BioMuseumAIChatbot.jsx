import React, { useState, useRef, useEffect } from 'react';
import { askBiologyQuestion } from '../services/aiChatService';
import { getTimestampIST, getCurrentDateIST } from '../utils/dateFormatter';

const BioMuseumAIChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const messagesEndRef = useRef(null);
  const chatBoxRef = useRef(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize with welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: getTimestampIST(),
          type: 'bot',
          text: 'Hey! I\'m BioMuseum Intelligence !',
          timestamp: getCurrentDateIST(),
          subtext: '“Exploring Life, One Question at a Time.”'
        }
      ]);
    }
  }, [isOpen]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!inputValue.trim() || loading) return;

    const userMessage = inputValue.trim();
    
    // Add user message to chat
    const userMsg = {
      id: getTimestampIST(),
      type: 'user',
      text: userMessage,
      timestamp: getCurrentDateIST()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setLoading(true);

    try {
      const result = await askBiologyQuestion(userMessage);
      
      if (result.success) {
        // Show cache indicator if using cached response
        const cacheIndicator = result.cached ? ' <i className="fas fa-box"></i> (cached)' : '';
        
        const botMessage = {
          id: getTimestampIST() + 1,
          type: 'bot',
          text: result.data.answer + cacheIndicator,
          timestamp: getCurrentDateIST(),
          organisms: result.data.related_organisms || [],
          suggestions: result.data.suggestions || [],
          confidence: result.data.confidence
        };
        setMessages(prev => [...prev, botMessage]);
        setConversationHistory(prev => [...prev, { user: userMessage, bot: result.data.answer }]);
      } else {
        // Show quota error differently
        const isQuotaError = result.isQuotaError;
        const errorMsg = {
          id: getTimestampIST() + 1,
          type: 'bot',
          text: '<i className="fas fa-times-circle"></i> ' + (result.error || 'Failed to get response. Please try again!'),
          timestamp: getCurrentDateIST(),
          isError: true,
          isQuotaError: isQuotaError
        };
        setMessages(prev => [...prev, errorMsg]);
      }
    } catch (error) {
      const errorMsg = {
        id: getTimestampIST() + 1,
        type: 'bot',
        text: '<i className="fas fa-exclamation-triangle"></i> Something went wrong. Please try again in a moment!',
        timestamp: getCurrentDateIST(),
        isError: true
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestion = (suggestion) => {
    setInputValue(suggestion);
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const clearChat = () => {
    setMessages([
      {
        id: getTimestampIST(),
        type: 'bot',
        text: 'Hey! I\'m BioMuseum Intelligence. How can I help you?',
        timestamp: getCurrentDateIST(),
        subtext: '“Exploring Life, One Question at a Time.”'
      }
    ]);
    setConversationHistory([]);
  };

  return (
    <>
      {/* Chatbot Bubble Button */}
      <button
        onClick={toggleChat}
        className={`fixed bottom-6 right-6 z-40 w-14 h-14 sm:w-16 sm:h-16 rounded-full shadow-2xl transition-all duration-500 transform hover:scale-110 ${
          isOpen 
            ? 'bg-gradient-to-br from-red-500 to-pink-600 opacity-100 scale-100' 
            : 'bg-gradient-to-br from-green-500 to-emerald-600 opacity-100 scale-100'
        } flex items-center justify-center cursor-pointer hover:shadow-2xl overflow-hidden`}
        style={{
          animation: isOpen ? 'none' : 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
        }}
        title="Ask AI"
      >
        {isOpen ? (
          <i className="fas fa-times text-2xl sm:text-3xl text-white"></i>
        ) : (
          <img 
            src="https://res.cloudinary.com/dse4vnxdi/image/upload/v1766857765/BiomuseumIntel_yt5jjk.jpg" 
            alt="BioMuseum AI" 
            className="w-full h-full object-cover rounded-full"
          />
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div
          ref={chatBoxRef}
          className="fixed inset-0 sm:inset-auto bottom-0 sm:bottom-6 right-0 sm:right-6 w-full sm:w-[450px] max-h-[100dvh] sm:max-h-[750px] bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-4 duration-300"
          style={{ fontFamily: 'Poppins, sans-serif' }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-3 sm:p-5 flex justify-between items-center flex-shrink-0">
            <div className="flex items-center gap-3">
              <img 
                src="https://res.cloudinary.com/dse4vnxdi/image/upload/v1766857765/BiomuseumIntel_yt5jjk.jpg" 
                alt="BioMuseum AI" 
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-white"
              />
              <div>
                <h3 className="font-bold text-lg sm:text-2xl">BioMuseum AI</h3>
                <p className="text-xs sm:text-sm text-green-100 mt-0.5">Ask me anything about biology</p>
              </div>
            </div>
            <button
              onClick={toggleChat}
              className="text-2xl sm:text-3xl hover:scale-125 transition-transform ml-2 flex-shrink-0"
              title="Close"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 sm:space-y-4 bg-gradient-to-b from-gray-50 to-white">
            {messages.map((message, index) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
              >
                <div
                  className={`max-w-[85vw] sm:max-w-sm px-3 sm:px-4 py-2 sm:py-3 rounded-2xl shadow-sm transition-all text-xs sm:text-base ${
                    message.type === 'user'
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-br-none'
                      : message.isError
                      ? 'bg-red-100 text-red-800 rounded-bl-none border border-red-300'
                      : 'bg-gray-100 text-gray-800 rounded-bl-none'
                  }`}
                >
                  <p className="text-xs sm:text-sm leading-relaxed break-words">{message.text}</p>
                  
                  {/* Organisms related to answer */}
                  {message.organisms && message.organisms.length > 0 && (
                    <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-300">
                      <p className="text-xs sm:text-sm font-semibold text-gray-600 mb-1 sm:mb-2"><i className="fas fa-microscope mr-1"></i>Related organisms:</p>
                      <div className="flex flex-wrap gap-1 sm:gap-2">
                        {message.organisms.map((org, idx) => (
                          <span key={idx} className="inline-block text-xs sm:text-sm bg-gray-200 text-gray-700 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full">
                            {org}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Suggestions */}
                  {message.suggestions && message.suggestions.length > 0 && (
                    <div className="mt-3 sm:mt-4 pt-2 sm:pt-3 border-t border-gray-300 space-y-1 sm:space-y-2">
                      <p className="text-xs sm:text-sm font-semibold text-gray-600"><i className="fas fa-lightbulb mr-1"></i>Ask me about:</p>
                      {message.suggestions.map((sugg, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSuggestion(sugg)}
                          className="block w-full text-left text-xs sm:text-sm bg-green-50 hover:bg-green-100 text-green-700 px-2 sm:px-3 py-1.5 sm:py-2 rounded transition-colors font-medium"
                        >
                          • {sugg}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {/* Subtext for welcome message */}
                  {message.subtext && (
                    <p className="text-xs sm:text-sm mt-2 sm:mt-3 opacity-90 leading-relaxed">{message.subtext}</p>
                  )}
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start animate-in fade-in">
                <div className="bg-gray-100 text-gray-800 px-4 sm:px-5 py-3 sm:py-4 rounded-2xl rounded-bl-none shadow-sm">
                  <div className="flex gap-2 items-center">
                    <span className="inline-block w-2 h-2 sm:w-3 sm:h-3 bg-gray-400 rounded-full animate-bounce"></span>
                    <span className="inline-block w-2 h-2 sm:w-3 sm:h-3 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                    <span className="inline-block w-2 h-2 sm:w-3 sm:h-3 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 p-3 sm:p-4 bg-white flex-shrink-0">
            <form onSubmit={handleSendMessage} className="flex gap-2 sm:gap-3">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask about Biology..."
                disabled={loading}
                className="flex-1 px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 text-sm sm:text-base font-medium"
              />
              <button
                type="submit"
                disabled={loading || !inputValue.trim()}
                className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-3 sm:px-6 py-2 sm:py-3 rounded-full font-bold text-base sm:text-lg hover:shadow-lg disabled:opacity-50 transition-all duration-200 hover:scale-105 flex-shrink-0"
              >
                {loading ? <i className="fas fa-hourglass-end"></i> : <i className="fas fa-arrow-right"></i>}
              </button>
            </form>
            
            {conversationHistory.length > 0 && (
              <button
                onClick={clearChat}
                className="text-xs sm:text-sm text-gray-500 hover:text-gray-700 mt-2 sm:mt-3 w-full py-1 sm:py-2 font-medium"
              >
                 Clear conversation
              </button>
            )}
          </div>
        </div>
      )}

      {/* Add animation keyframes */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
          }
          50% {
            opacity: 0.9;
          }
          75% {
            box-shadow: 0 0 0 10px rgba(34, 197, 94, 0);
          }
        }
        
        @keyframes slideInFromBottom {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-in {
          animation: slideInFromBottom 0.3s ease-out;
        }
      `}</style>
    </>
  );
};

export default BioMuseumAIChatbot;
