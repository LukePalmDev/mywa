import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Upload, Search, Moon, Sun, Trash2, MessageCircle, X, Database } from 'lucide-react';

const STORAGE_KEYS = {
  chats: 'whatsapp_chats',
  myName: 'whatsapp_my_name',
  darkMode: 'whatsapp_dark_mode',
};

const DEFAULT_MY_NAME = 'Luke';

const SAMPLE_CHAT_FILES = [
  'sample-chats/anna-cicero.txt',
  'sample-chats/progetto-x-team.txt',
  'sample-chats/famiglia-rossi.txt',
  'sample-chats/coach-matteo.txt',
  'sample-chats/viaggio-londra.txt',
];

const BRACKET_HEADER_REGEX =
  /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?)\]\s?(.*)$/;
const DASH_HEADER_REGEX =
  /^(\d{1,2}\/\d{1,2}\/\d{2,4}),\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?)\s+-\s+(.*)$/;
const SENDER_REGEX = /^([^:]+):\s*([\s\S]*)$/;

const makeChatId = () => `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const parseTimestamp = (date, time) => {
  const [dayText, monthText, yearText] = date.split('/');
  if (!dayText || !monthText || !yearText) return 0;

  const day = Number(dayText);
  const month = Number(monthText) - 1;
  const yearNumber = Number(yearText);
  const year = yearText.length === 2 ? 2000 + yearNumber : yearNumber;

  const parsedTime = time.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AaPp][Mm])?$/);
  if (!parsedTime) {
    const fallback = new Date(year, month, day).getTime();
    return Number.isNaN(fallback) ? 0 : fallback;
  }

  let hours = Number(parsedTime[1]);
  const minutes = Number(parsedTime[2]);
  const seconds = Number(parsedTime[3] || 0);
  const meridian = parsedTime[4]?.toLowerCase();

  if (meridian === 'pm' && hours < 12) hours += 12;
  if (meridian === 'am' && hours === 12) hours = 0;

  const timestamp = new Date(year, month, day, hours, minutes, seconds).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const parseLineHeader = (line) => {
  const cleanLine = line.replace(/\u200e/g, '').replace(/\u202f/g, ' ');
  const bracketMatch = cleanLine.match(BRACKET_HEADER_REGEX);
  if (bracketMatch) {
    return {
      date: bracketMatch[1],
      time: bracketMatch[2].replace(/\s+/g, ' ').trim(),
      body: bracketMatch[3].trim(),
    };
  }

  const dashMatch = cleanLine.match(DASH_HEADER_REGEX);
  if (dashMatch) {
    return {
      date: dashMatch[1],
      time: dashMatch[2].replace(/\s+/g, ' ').trim(),
      body: dashMatch[3].trim(),
    };
  }

  return null;
};

const parseWhatsAppFile = (content, filename) => {
  const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalizedContent.split('\n');
  const messages = [];
  let currentMessage = null;

  for (const rawLine of lines) {
    const header = parseLineHeader(rawLine);

    if (header) {
      if (currentMessage) messages.push(currentMessage);

      const senderMatch = header.body.match(SENDER_REGEX);
      const sender = senderMatch ? senderMatch[1].trim() : 'Sistema';
      const text = senderMatch ? senderMatch[2].trim() : header.body.trim();

      currentMessage = {
        date: header.date,
        time: header.time,
        sender,
        text,
        isSystem: !senderMatch,
        timestamp: parseTimestamp(header.date, header.time),
      };
      continue;
    }

    if (currentMessage) {
      currentMessage.text = currentMessage.text
        ? `${currentMessage.text}\n${rawLine}`
        : rawLine;
    }
  }

  if (currentMessage) messages.push(currentMessage);

  const lastMessage = messages[messages.length - 1];
  return {
    id: makeChatId(),
    name: filename.replace(/\.[^/.]+$/, ''),
    messages,
    lastMessage: lastMessage?.text || '',
    lastTime: lastMessage?.time || '',
    lastTimestamp: lastMessage?.timestamp || 0,
    messageCount: messages.length,
  };
};

const mergeChatsByName = (previousChats, incomingChats) => {
  const byName = new Map(previousChats.map((chat) => [chat.name.toLowerCase(), chat]));

  for (const chat of incomingChats) {
    const key = chat.name.toLowerCase();
    const previous = byName.get(key);
    byName.set(key, previous ? { ...chat, id: previous.id } : chat);
  }

  return Array.from(byName.values()).sort((a, b) => (b.lastTimestamp || 0) - (a.lastTimestamp || 0));
};

const getPublicAssetPath = (path) => {
  const base = process.env.PUBLIC_URL || '';
  if (!base || base === '/') return `/${path}`;
  if (base === '.') return `./${path}`;
  return `${base.replace(/\/$/, '')}/${path}`;
};

const WhatsAppReader = () => {
  const [chats, setChats] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [darkMode, setDarkMode] = useState(true);
  const [myName, setMyName] = useState(DEFAULT_MY_NAME);
  const [loadingSamples, setLoadingSamples] = useState(false);
  const [sampleError, setSampleError] = useState('');

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const savedChats = localStorage.getItem(STORAGE_KEYS.chats);
    if (savedChats) {
      try {
        const parsed = JSON.parse(savedChats);
        if (Array.isArray(parsed)) {
          setChats(parsed);
          if (parsed.length > 0) setSelectedChatId(parsed[0].id);
        }
      } catch (error) {
        localStorage.removeItem(STORAGE_KEYS.chats);
      }
    }

    const savedMyName = localStorage.getItem(STORAGE_KEYS.myName);
    if (savedMyName?.trim()) setMyName(savedMyName);

    const savedDarkMode = localStorage.getItem(STORAGE_KEYS.darkMode);
    if (savedDarkMode === 'false') setDarkMode(false);
  }, []);

  useEffect(() => {
    if (chats.length === 0) {
      localStorage.removeItem(STORAGE_KEYS.chats);
      return;
    }
    localStorage.setItem(STORAGE_KEYS.chats, JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.myName, myName.trim() || DEFAULT_MY_NAME);
  }, [myName]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.darkMode, String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    if (selectedChatId && !chats.some((chat) => chat.id === selectedChatId)) {
      setSelectedChatId(null);
    }
  }, [chats, selectedChatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedChatId, chats]);

  const normalizedMyName = (myName.trim() || DEFAULT_MY_NAME).toLowerCase();

  const selectedChat = useMemo(
    () => chats.find((chat) => chat.id === selectedChatId) || null,
    [chats, selectedChatId]
  );

  const filteredChats = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return chats;
    return chats.filter(
      (chat) =>
        chat.name.toLowerCase().includes(term) ||
        (chat.lastMessage || '').toLowerCase().includes(term)
    );
  }, [chats, searchTerm]);

  const handleParsedChats = (parsedChats) => {
    if (parsedChats.length === 0) return;

    const firstChatName = parsedChats[0].name.toLowerCase();
    setChats((previousChats) => {
      const merged = mergeChatsByName(previousChats, parsedChats);
      const firstChat = merged.find((chat) => chat.name.toLowerCase() === firstChatName);
      if (firstChat) setSelectedChatId(firstChat.id);
      return merged;
    });
  };

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const parsedChats = [];
    for (const file of files) {
      const text = await file.text();
      parsedChats.push(parseWhatsAppFile(text, file.name));
    }

    handleParsedChats(parsedChats);
    setSampleError('');
    event.target.value = '';
  };

  const loadSampleChats = async () => {
    setLoadingSamples(true);
    setSampleError('');

    try {
      const parsedChats = await Promise.all(
        SAMPLE_CHAT_FILES.map(async (filePath) => {
          const response = await fetch(getPublicAssetPath(filePath));
          if (!response.ok) {
            throw new Error(`Errore nel caricamento di ${filePath}`);
          }
          const content = await response.text();
          const filename = filePath.split('/').pop() || filePath;
          return parseWhatsAppFile(content, filename);
        })
      );

      handleParsedChats(parsedChats);
    } catch (error) {
      setSampleError('Impossibile caricare le chat demo. Riprova.');
    } finally {
      setLoadingSamples(false);
    }
  };

  const deleteChat = (chatId, event) => {
    event.stopPropagation();
    setChats((previousChats) => previousChats.filter((chat) => chat.id !== chatId));
    if (selectedChatId === chatId) setSelectedChatId(null);
  };

  const clearAllChats = () => {
    if (!window.confirm('Vuoi cancellare tutte le chat salvate?')) return;
    setChats([]);
    setSelectedChatId(null);
    setSampleError('');
  };

  const hasChats = chats.length > 0;

  const bgColor = darkMode ? 'bg-gray-900' : 'bg-gray-100';
  const textColor = darkMode ? 'text-white' : 'text-gray-900';
  const sidebarBg = darkMode ? 'bg-gray-800' : 'bg-white';
  const chatBg = darkMode ? 'bg-gray-800' : 'bg-white';
  const inputBg = darkMode ? 'bg-gray-700' : 'bg-gray-200';
  const hoverBg = darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100';
  const subtleText = darkMode ? 'text-gray-400' : 'text-gray-600';

  return (
    <div className={`h-screen flex flex-col md:flex-row ${bgColor} ${textColor}`}>
      <aside
        className={`w-full md:w-96 h-[46vh] md:h-screen ${sidebarBg} border-b md:border-b-0 md:border-r ${
          darkMode ? 'border-gray-700' : 'border-gray-300'
        } flex flex-col`}
      >
        <div className={`p-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold">WhatsApp Reader</h1>
            <div className="flex gap-2">
              <button
                onClick={() => setDarkMode((prev) => !prev)}
                className={`p-2 rounded-full ${hoverBg}`}
                title="Tema"
              >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              {hasChats && (
                <button
                  onClick={clearAllChats}
                  className={`p-2 rounded-full ${hoverBg} text-red-500`}
                  title="Cancella tutte le chat"
                >
                  <Trash2 size={20} />
                </button>
              )}
            </div>
          </div>

          <div className={`flex items-center gap-2 ${inputBg} rounded-lg px-3 py-2`}>
            <Search size={18} className="text-gray-400" />
            <input
              type="text"
              placeholder="Cerca chat..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className={`flex-1 bg-transparent outline-none ${textColor}`}
            />
          </div>

          <div className={`mt-3 rounded-lg px-3 py-2 ${inputBg}`}>
            <label htmlFor="my-name" className={`block text-xs uppercase tracking-wide ${subtleText}`}>
              Il tuo nome
            </label>
            <input
              id="my-name"
              type="text"
              value={myName}
              onChange={(event) => setMyName(event.target.value)}
              placeholder={DEFAULT_MY_NAME}
              className={`mt-1 w-full bg-transparent outline-none ${textColor}`}
            />
          </div>
        </div>

        <div className="p-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`w-full flex items-center justify-center gap-2 ${
              darkMode ? 'bg-green-600 hover:bg-green-700' : 'bg-green-500 hover:bg-green-600'
            } text-white py-3 rounded-lg transition-colors`}
          >
            <Upload size={20} />
            Carica Chat WhatsApp
          </button>
          <button
            onClick={loadSampleChats}
            disabled={loadingSamples}
            className={`w-full mt-2 flex items-center justify-center gap-2 ${
              darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
            } text-white py-3 rounded-lg transition-colors disabled:opacity-70`}
          >
            <Database size={18} />
            {loadingSamples ? 'Caricamento demo...' : 'Carica 5 chat demo'}
          </button>
          {sampleError && <p className="text-sm text-red-400 mt-2">{sampleError}</p>}
          {hasChats && (
            <p className={`text-center text-sm mt-2 ${subtleText}`}>{chats.length} chat salvate</p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredChats.length === 0 && hasChats && (
            <div className={`text-center mt-8 ${subtleText}`}>
              <MessageCircle size={48} className="mx-auto mb-2 opacity-50" />
              <p>Nessuna chat trovata</p>
            </div>
          )}
          {filteredChats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => setSelectedChatId(chat.id)}
              className={`p-4 cursor-pointer border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} ${
                selectedChatId === chat.id ? (darkMode ? 'bg-gray-700' : 'bg-gray-200') : hoverBg
              } relative group`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{chat.name}</h3>
                  <p className={`text-sm truncate ${subtleText}`}>{chat.lastMessage}</p>
                </div>
                <div className="flex flex-col items-end gap-1 ml-2">
                  <span className={`text-xs ${subtleText}`}>{chat.lastTime}</span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      darkMode ? 'bg-green-600' : 'bg-green-500'
                    } text-white`}
                  >
                    {chat.messageCount}
                  </span>
                </div>
              </div>
              <button
                onClick={(event) => deleteChat(chat.id, event)}
                className="absolute top-2 right-2 p-1 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                title="Elimina chat"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      </aside>

      <main className="flex-1 h-[54vh] md:h-screen flex flex-col min-h-0">
        {!selectedChat && !hasChats ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center max-w-md">
              <MessageCircle size={64} className="mx-auto mb-4 opacity-30" />
              <h2 className="text-2xl font-semibold mb-2">Benvenuto su WhatsApp Reader</h2>
              <p className={`${subtleText} mb-6`}>
                Carica i tuoi file esportati o prova subito le 5 chat demo incluse.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex items-center justify-center gap-2 ${
                    darkMode ? 'bg-green-600 hover:bg-green-700' : 'bg-green-500 hover:bg-green-600'
                  } text-white px-6 py-3 rounded-lg transition-colors`}
                >
                  <Upload size={20} />
                  Carica Chat
                </button>
                <button
                  onClick={loadSampleChats}
                  disabled={loadingSamples}
                  className={`flex items-center justify-center gap-2 ${
                    darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
                  } text-white px-6 py-3 rounded-lg transition-colors disabled:opacity-70`}
                >
                  <Database size={18} />
                  Demo
                </button>
              </div>
            </div>
          </div>
        ) : !selectedChat ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle size={64} className="mx-auto mb-4 opacity-30" />
              <h2 className="text-xl font-semibold mb-2">Seleziona una chat</h2>
              <p className={subtleText}>Scegli una conversazione dalla lista</p>
            </div>
          </div>
        ) : (
          <>
            <div
              className={`${chatBg} ${darkMode ? 'border-gray-700' : 'border-gray-300'} border-b p-4 flex items-center justify-between`}
            >
              <div>
                <h2 className="text-lg font-semibold">{selectedChat.name}</h2>
                <p className={`text-sm ${subtleText}`}>{selectedChat.messageCount} messaggi</p>
              </div>
            </div>

            <div
              className="flex-1 overflow-y-auto p-4"
              style={{
                backgroundImage: darkMode
                  ? 'url("data:image/svg+xml,%3Csvg width="60" height="60" xmlns="http://www.w3.org/2000/svg"%3E%3Cpath d="M30 0l30 30-30 30L0 30z" fill="%23374151" fill-opacity="0.05"/%3E%3C/svg%3E")'
                  : 'url("data:image/svg+xml,%3Csvg width="60" height="60" xmlns="http://www.w3.org/2000/svg"%3E%3Cpath d="M30 0l30 30-30 30L0 30z" fill="%23000" fill-opacity="0.03"/%3E%3C/svg%3E")',
              }}
            >
              <div className="max-w-4xl mx-auto space-y-3">
                {selectedChat.messages.map((message, index) => {
                  if (message.isSystem) {
                    return (
                      <div key={`${selectedChat.id}-system-${index}`} className="flex justify-center">
                        <div
                          className={`text-xs px-3 py-1 rounded-full ${
                            darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {message.text}
                        </div>
                      </div>
                    );
                  }

                  const isOwnMessage =
                    (message.sender || '').trim().toLowerCase() === normalizedMyName;

                  return (
                    <div
                      key={`${selectedChat.id}-${index}`}
                      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-lg px-4 py-2 rounded-lg ${
                          isOwnMessage
                            ? darkMode
                              ? 'bg-green-700'
                              : 'bg-green-500 text-white'
                            : darkMode
                            ? 'bg-gray-700'
                            : 'bg-white'
                        } shadow-sm`}
                      >
                        {!isOwnMessage && (
                          <p
                            className={`font-semibold text-sm mb-1 ${
                              darkMode ? 'text-green-400' : 'text-green-600'
                            }`}
                          >
                            {message.sender}
                          </p>
                        )}
                        <p className="whitespace-pre-wrap break-words">{message.text}</p>
                        <p className={`text-xs mt-1 text-right ${subtleText}`}>{message.time}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default WhatsAppReader;
