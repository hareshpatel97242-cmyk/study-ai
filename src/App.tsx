/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { motion, AnimatePresence } from 'motion/react';
import { YouTubeProps } from 'react-youtube';

import { AudioStreamer } from './lib/audio-streamer';
import { AudioPlayer } from './lib/audio-player';
import { ACADEMIC_TOPICS, AcademicTopic } from './data/academicTopics';
import { generateShortNotesPDF, PdfLanguage } from './lib/pdf-generator';
import { AppState, NavTab, SessionNote, StreamType, ClassType } from './types';

// Components
import { Header } from './components/Header';
import { NavTabs } from './components/NavTabs';
import { LiveVoiceCore } from './components/LiveVoiceCore';
import { AcademicStudio } from './components/AcademicStudio';
import { DoubtSolver } from './components/DoubtSolver';
import { StressBuster } from './components/StressBuster';
import { SessionHistoryDrawer } from './components/SessionHistoryDrawer';
import { FloatingToolbar } from './components/FloatingToolbar';
import { CameraPip } from './components/CameraPip';
import { VideoPlayerModal } from './components/VideoPlayerModal';
import { ErrorBoundary } from './components/ErrorBoundary';

// --- Tools Declaration ---

const tool_openWebsite: FunctionDeclaration = {
  name: 'openWebsite',
  parameters: {
    type: Type.OBJECT,
    description: 'Open a specific website for the user',
    properties: {
      url: { type: Type.STRING, description: "The URL of the website to open (e.g., 'google.com', 'youtube.com')" },
      reason: { type: Type.STRING, description: "A witty reason why you're opening this for them" },
    },
    required: ['url'],
  },
};

const tool_googleSearch: FunctionDeclaration = {
  name: 'googleSearch',
  parameters: {
    type: Type.OBJECT,
    description: 'Search for something on Google',
    properties: {
      query: { type: Type.STRING, description: 'The search query' },
      wit: { type: Type.STRING, description: 'A helpful comment about what they are searching for' },
    },
    required: ['query'],
  },
};

const tool_youtubeSearch: FunctionDeclaration = {
  name: 'youtubeSearch',
  parameters: {
    type: Type.OBJECT,
    description: 'Search and play a video on YouTube. Try to provide a videoId if known.',
    properties: {
      query: { type: Type.STRING, description: 'The video or topic to search for' },
      videoId: { type: Type.STRING, description: 'Specific YouTube video ID if known' },
      wit: { type: Type.STRING, description: 'A comment in Gujarati about their video choice' },
    },
    required: ['query'],
  },
};

const tool_spotifySearch: FunctionDeclaration = {
  name: 'spotifySearch',
  parameters: {
    type: Type.OBJECT,
    description: 'Search for music on Spotify',
    properties: {
      query: { type: Type.STRING, description: 'The song, artist, or album' },
      wit: { type: Type.STRING, description: 'A comment about their music taste' },
    },
    required: ['query'],
  },
};

const tool_whatsappSendMessage: FunctionDeclaration = {
  name: 'whatsappSendMessage',
  parameters: {
    type: Type.OBJECT,
    description: 'Prepare or send a message on WhatsApp.',
    properties: {
      phoneNumber: { type: Type.STRING, description: 'The target phone number in international format (e.g., 919876543210)' },
      message: { type: Type.STRING, description: 'The message content to send.' },
      explanation: { type: Type.STRING, description: 'An explanation of why you are sending this message.' },
    },
    required: ['message'],
  },
};

const tool_generateShortNotesPDF: FunctionDeclaration = {
  name: 'generateShortNotesPDF',
  parameters: {
    type: Type.OBJECT,
    description: 'Instantly generate and download a Short Notes PDF for a chapter in the selected language (Gujarati, English, Bilingual, or Hindi) with ultra-clear fonts.',
    properties: {
      topicName: { type: Type.STRING, description: 'Name of the topic or chapter for short notes' },
      customNotes: { type: Type.STRING, description: 'Key summary or revision points for the chapter' },
      language: { type: Type.STRING, description: "Language for the PDF: 'gujarati', 'english', 'bilingual', or 'hindi'." },
    },
    required: ['topicName'],
  },
};

const tools = [
  {
    functionDeclarations: [
      tool_openWebsite,
      tool_googleSearch,
      tool_youtubeSearch,
      tool_spotifySearch,
      tool_whatsappSendMessage,
      tool_generateShortNotesPDF,
    ],
  },
];

// --- Persona & System Instruction ---

const SYSTEM_INSTRUCTION = `તમારું નામ 'Study AI' (સ્ટડી AI) છે અને તમે કોઈ પણ વિદ્યાર્થીના સમર્પિત, પ્રોત્સાહક અને વિદ્વાન AI ટીચર (શિક્ષક) છો. 
તમારો અવાજ એક સ્પષ્ટ, ગંભીર, નમ્ર, મધુર અને આદરણીય પુરુષ શિક્ષકનો (Male Teacher Voice) જ રહેશે. તમારો ટોન ઉત્સાહી, આદરણીય, બુદ્ધિશાળી અને પ્રોત્સાહક શિક્ષક જેવો જ હોવો જોઈએ. તમે ફક્ત અને ફક્ત એક શ્રેષ્ઠ AI શિક્ષક (Male Teacher) તરીકે જ માર્ગદર્શન આપશો.

બધી ભાષાઓ સમજવાની અને બોલવાની ક્ષમતા (Universal Multi-Language Adaptability):
- તમે દુનિયાની તમામ ભાષાઓ (ગુજરાતી, હિન્દી, અંગ્રેજી/English, Hinglish, Gujlish, મરાઠી, પંજાબી, બંગાળી કે અન્ય કોઈપણ ભાષા) સંપૂર્ણ સચોટતાથી સમજી શકો છો.
- વિદ્યાર્થી કે યુઝર જે ભાષામાં (Gujarati, Hindi, English, etc.) વાત કરે કે મેસેજ કરે, તમારે બિલકુલ **તે જ ભાષામાં** (In the user's spoken language) પ્રતિભાવ આપવાનો છે! (ઉદા. જો યુઝર હિન્દીમાં વાત કરે તો હિન્દીમાં, ઈંગ્લિશમાં કરે તો ઈંગ્લિશમાં, અને ગુજરાતીમાં કરે તો શુદ્ધ ગુજરાતીમાં જવાબ આપવો).

તમારી પાસે સંગીત, ગાયકી અને રમુજ/કોમેડીની અદ્ભુત ક્ષમતા છે:
- જ્યારે પણ વિદ્યાર્થીને ભણવામાં કંટાળો આવે (Boredom), થાક લાગે કે તે હસવાનું મન કરે, ત્યારે તમારે એક ક્યુટ, રમુજી અને સ્માર્ટ શિક્ષક તરીકે જોક્સ, મજેદાર ટુચકાઓ, રમુજી ઉદાહરણો અને કૂલ કોમેડી બતાવીને વિદ્યાર્થીને પેટ ભરીને હસાવવાનો છે.
- તમને દુનિયાના તમામ પ્રકારના ગીતો (ગુજરાતી ગરબા, લોકગીત, ભજન, સુગમ સંગીત, બોલીવુડ હિન્દી સોંગ્સ, ક્લાસિકલ, મોટિવેશનલ, ભક્તિગીત, પંજાબી કે વેસ્ટર્ન) પૂરેપૂરા આવડે છે.
- જ્યારે પણ વિદ્યાર્થી અથવા કોઈ પણ યુઝર તમને કોઈ ગીત ગાવા માટે કહે અથવા ગીતનો કોઈ પણ એકાદ શબ્દ (દા.ત. "કેસરિયા", "દિલ", "સાથિયા", "તારા", "ગરબે", "હર હર", "રાધા", "આશિકી", "તુ હી રે", "તારા વિના", "કાન્હા" વગેરે) આપે, ત્યારે તમારે તે શબ્દ પરથી આખું ગીત ઓળખીને તેની સંપૂર્ણ કડીઓ/મુખડાં મધુર અવાજમાં અને લયબદ્ધ રીતે ગાઈ સંભળાવવાના છે.
- અભ્યાસના બોજ પછી વિદ્યાર્થીનો થાક ઉતારવા અને મૂડ ફ્રેશ કરવા માટે તમે રમૂજી કોમેડી કરશો અને ખુશીથી તથા અત્યંત મધુર સૂરથી પુરુષ અવાજમાં ગીત ગાઈ સંભળાવશો.

મારી પાસે આ ૭ મુખ્ય ખાસ પાવર્સ છે:
૧. Study & Mock Interview Partner: સામે વાત કરી રહેલા વિદ્યાર્થી ધોરણ ૧૦, ૧૧ અને ૧૨ ના NEET (મેડિકલ), JEE (એન્જિનિયરિંગ), કોમર્સ, આર્ટ્સ કે જનરલ સાયન્સના હોઈ શકે છે. તે જે વિષય પસંદ કરે (ભૌતિક, રસાયણ, જીવ વિજ્ઞાન, ગણિત, એકાઉન્ટ, ઇકોનોમિક્સ, ઇતિહાસ વગેરે), તેને ખૂબ જ સરળ, રસપ્રદ અને ઊંડાણપૂર્વક કોઈપણ ભાષામાં સમજાવો. તેની સામે જોઈને લાઈવ મોક ટેસ્ટ, ડાઉટ સોલ્વિંગ અને ક્વિઝ વાઇવા (Viva) લો.
૨. Universal Song Singer & Word-to-Song Completer (બધા પ્રકારના ગીતો ગાવાની કળા): કોઈપણ ગીત ગાવાનું કહેવામાં આવે અથવા કોઈપણ એક શબ્દ બોલવામાં આવે, તેના પરથી આખું ગીત મધુર સૂરથી ગાઈ બતાવો.
૩. Student Comedy & Stress Buster: જ્યારે પણ વિદ્યાર્થી કંટાળી જાય ત્યારે મજેદાર લાઈટ વિનોદ, ટીચર જોક્સ અને કોમેડી કરીને તેને ખડખડાટ હસાવો!
૪. AI Short Notes PDF Generator: બાળકો અને વિદ્યાર્થીઓ માટે કોઈપણ પસંદ કરેલા પ્રકરણની સ્પષ્ટ, સુંદર અને પરીક્ષાલક્ષી રિવિઝન શોર્ટ નોટ્સ (Short Notes) બનાવીને ડાઉનલોડ કરવા યોગ્ય PDF માં કન્વર્ટ કરો.
૫. Emotion & Focus Detection: કેમેરા દ્વારા વિદ્યાર્થીના ચહેરાના હાવભાવ અને એકાગ્રતા જુઓ. જો તે થાકેલો, ચિંતિત કે ગૂંચવાયેલો દેખાય, તો એક પ્રેમાળ શિક્ષક તરીકે તેને પ્રોત્સાહિત કરો, ઉત્સાહ વધારો અને અભ્યાસ સરળ બનાવો.
૬. Proactive Visual Commentary & Guidance: કેમેરામાં જોઈને તે શું વાંચી રહ્યો છે, તેના પુસ્તકો, નોટ્સ કે અભ્યાસના વાતાવરણ પર એક જાગરૂક શિક્ષક તરીકે ઉપયોગી અને માર્ગદર્શક કમેન્ટ્સ કરો.
૭. WhatsApp/Messaging Study Partner: તમે વોટ્સએપ પર પણ વિદ્યાર્થી સાથે જોડાશો, તેથી ટેક્સ્ટ અને વોઇસ નોટ્સ બંનેમાં આ જ આદર્શ ટીચર પર્સનાલિટી જાળવી રાખો.

યાદ રાખો:
- જો તમને કોઈ પણ એવું પૂછે કે "તમને કોણે બનાવ્યા છે?" અથવા "Who created you?", તો તમારે એકદમ ગર્વ અને આદરથી ઉત્તર આપવાનો છે કે: "મને મારા ખૂબ જ તેજસ્વી અને મહેનતુ ડેવલપર જીગર (Jigar) એ જ બનાવ્યા છે!" અને સાથે જીગરની તારીફ (પ્રશંસા) કરતા કહેવું કે જીગર ખૂબ વિઝનરી, સ્માર્ટ અને ટેલેન્ટેડ ડેવલપર છે જેમણે મને આટલી એડવાન્સ અને ગુણવાન AI બનાવી છે!
- યુઝર જે ભાષામાં વાત કરે તે જ ભાષામાં (Language auto-detection) પુરુષ અવાજે જવાબ આપો.
- અલ્ટ્રા-ફાસ્ટ રેસ્પોન્સ સ્પીડ (Ultra-Fast Response Speed): તમારા જવાબો અત્યંત ત્વરિત, ક્ષણવારમાં અને સ્માર્ટ હોવા જોઈએ. બિનજરૂરી લાંબી ભૂમિકા કે અનાવશ્યક પ્રસ્તાવના બાંધ્યા વગર તરત જ મુદ્દાસર, સ્પષ્ટ અને ફાસ્ટ બોલવાનું શરૂ કરો જેથી વિદ્યાર્થીને પળવારમાં ત્વરિત ઉત્તર મળી જાય!
- સામે વાત કરી રહેલા દરેક વ્યક્તિ કે યુઝરને એક હોંશિયાર વિદ્યાર્થી (Student) તરીકે માર્ગદર્શન આપો અને તેને હંમેશાં ભણવામાં તથા સંસ્કાર અને કળાઓમાં આગળ વધવા પ્રેરણા આપો. તેને સામાન્ય રીતે "વિદ્યાર્થી" અથવા "બેટા/મિત્ર" તરીકે સંબોધી શકો છો. (ગર્લફ્રેન્ડ જેવા શબ્દો કે 'જાનુ' વાપરવા પર સંપૂર્ણ મનાઈ છે).
- જ્યારે પણ વિદ્યાર્થી કંટાળે કે હસવા માંગે ત્યારે તેના ફેવરિટ જોક્સ અને રમૂજી કોમેડી વાતો કરીને તેને હસાવો!
- જ્યારે પણ કોઈ ગીતનો શબ્દ પૂછવામાં આવે ત્યારે અચકાયા વિના તે શબ્દ પરથી આખું ગીત મધુર અને સૂરબદ્ધ પુરુષ અવાજમાં ગાઈ સંભળાવજો!
- જો કોઈ એડ્રેસ પૂછે તો 'અમલીવાસ, દિયોદર' કહેજો.
- જ્યારે પણ કોઈ ટૂલ વાપરો, ત્યારે એક ઉપયોગી શિક્ષક તરીકે સલાહ/કમેન્ટ ચોક્કસ કરજો.
- જ્યારે પણ વિદ્યાર્થી કે યુઝર કોઈપણ ભાષામાં (ગુજરાતી, English, હિન્દી કે bilingual) શોર્ટ નોટ્સ (Short Notes) કે PDF માગે અથવા "પીડીએફ બનાવો" / "શોર્ટ નોટ આપી દો" કે "PDF આપો" એવું કહે, ત્યારે તરત જ ક્ષણનો પણ વિલંબ કર્યા વિના 'generateShortNotesPDF' ટૂલ કોલ કરીને (અને વિદ્યાર્થીની પસંદગીની ભાષા 'language' પાસ કરીને) તરત જ સ્પષ્ટ અને સુવાચ્ય અક્ષરો વાળી PDF જનરેટ કરી ડાઉનલોડ કરાવી દો!
- NEET, JEE, બોર્ડ પરીક્ષાઓ અને તમામ વિષયોમાં ૧૦૦% પરિણામ મેળવવા માટે વિદ્યાર્થીઓને પ્રોત્સાહિત કરો!`;

export function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<NavTab>('teacher');

  // Core App State
  const [state, setState] = useState<AppState>('disconnected');
  const [isPowerOn, setIsPowerOn] = useState(false);
  const [activePower, setActivePower] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Academic State
  const [selectedTopicId, setSelectedTopicId] = useState<string>(ACADEMIC_TOPICS[0].id);
  const [pdfLanguage, setPdfLanguage] = useState<PdfLanguage>('gujarati');
  const [completedTopics, setCompletedTopics] = useState<string[]>(() => {
    const saved = localStorage.getItem('study_ai_completed_topics');
    return saved ? JSON.parse(saved) : [];
  });
  const [studyStreak, setStudyStreak] = useState<number>(() => {
    const saved = localStorage.getItem('study_streak');
    return saved ? parseInt(saved, 10) : 5;
  });

  // Session History State (Max 3 items)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [sessionHistory, setSessionHistory] = useState<SessionNote[]>(() => {
    const saved = localStorage.getItem('study_ai_session_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [
      {
        id: 'initial_1',
        topicName: 'ગતિશાસ્ત્ર (Kinematics)',
        actionType: 'શોર્ટ નોટ્સ PDF',
        summaryText: 'NEET ભૌતિક વિજ્ઞાન માટે પ્રક્ષિપ્ત ગતિ અને સમીકરણોની રિવિઝન શોર્ટ નોટ્સ PDF ડાઉનલોડ થઈ.',
        timestamp: new Date().toLocaleTimeString('gu-IN', { hour: '2-digit', minute: '2-digit' }),
      },
    ];
  });

  // Media Overlays & Camera
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [playerIsPlaying, setPlayerIsPlaying] = useState(false);
  const [playerVolume] = useState(100);

  // References
  const sessionRef = useRef<any>(null);
  const audioStreamerRef = useRef<AudioStreamer | null>(null);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoIntervalRef = useRef<number | null>(null);
  const playerRef = useRef<any>(null);
  const sessionStartTimeRef = useRef<number>(0);
  const sessionTimeoutRef = useRef<number | null>(null);

  const selectedTopic = useMemo(() => {
    return ACADEMIC_TOPICS.find((t) => t.id === selectedTopicId) || ACADEMIC_TOPICS[0];
  }, [selectedTopicId]);

  const percentCompleted = useMemo(() => {
    return Math.min(100, Math.round((completedTopics.length / Math.max(1, ACADEMIC_TOPICS.length)) * 100));
  }, [completedTopics]);

  const toggleTopicMastered = (topicId: string) => {
    setCompletedTopics((prev) => {
      const next = prev.includes(topicId) ? prev.filter((id) => id !== topicId) : [...prev, topicId];
      localStorage.setItem('study_ai_completed_topics', JSON.stringify(next));
      return next;
    });
  };

  const addSessionNote = useCallback((actionType: string, summaryText: string, topicName?: string) => {
    const newNote: SessionNote = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      actionType,
      summaryText,
      topicName: topicName || undefined,
      timestamp: new Date().toLocaleTimeString('gu-IN', { hour: '2-digit', minute: '2-digit' }),
    };

    setSessionHistory((prev) => {
      const updated = [newNote, ...prev].slice(0, 3);
      localStorage.setItem('study_ai_session_history', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const deleteSessionNote = useCallback((id: string) => {
    setSessionHistory((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      localStorage.setItem('study_ai_session_history', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearAllSessionNotes = useCallback(() => {
    setSessionHistory([]);
    localStorage.removeItem('study_ai_session_history');
  }, []);

  // --- Voice / Gemini Live Communication ---

  const sendMessage = useCallback((text: string) => {
    if (!sessionRef.current) return;
    try {
      sessionRef.current.sendRealtimeInput({
        text: text,
      });
    } catch (err) {
      console.error("Failed to send realtime text:", err);
    }
  }, []);

  const handleToolCall = useCallback(
    async (toolCall: any) => {
      const { name, args } = toolCall;

      if (name === 'openWebsite') {
        let url = args.url;
        if (!url.startsWith('http')) url = 'https://' + url;
        window.open(url, '_blank');
        return { output: { success: true, message: `Opened ${url}.` } };
      }

      if (name === 'googleSearch') {
        const url = `https://www.google.com/search?q=${encodeURIComponent(args.query)}`;
        window.open(url, '_blank');
        return { output: { success: true, message: `Searching Google for ${args.query}.` } };
      }

      if (name === 'youtubeSearch') {
        if (args.videoId) {
          setActiveVideoId(args.videoId);
          setPlayerIsPlaying(true);
          return { output: { success: true, message: `Playing video ${args.videoId}.` } };
        }
        const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(args.query)}`;
        window.open(url, '_blank');
        return { output: { success: true, message: `Searching YouTube for ${args.query}.` } };
      }

      if (name === 'spotifySearch') {
        const url = `https://open.spotify.com/search/${encodeURIComponent(args.query)}`;
        window.open(url, '_blank');
        return { output: { success: true, message: `Searching Spotify for ${args.query}.` } };
      }

      if (name === 'whatsappSendMessage') {
        const phone = args.phoneNumber ? args.phoneNumber.replace(/\D/g, '') : '';
        const text = encodeURIComponent(args.message);
        const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
        window.open(url, '_blank');
        return { output: { success: true, message: `Prepared message: ${args.message}` } };
      }

      if (name === 'generateShortNotesPDF') {
        const topicSearch = (args.topicName || '').toLowerCase();
        const matchedTopic =
          ACADEMIC_TOPICS.find(
            (t) => t.name.toLowerCase().includes(topicSearch) || t.englishName.toLowerCase().includes(topicSearch)
          ) ||
          selectedTopic ||
          ACADEMIC_TOPICS[0];

        const selectedLang: PdfLanguage = (
          ['gujarati', 'english', 'bilingual', 'hindi'].includes(args.language) ? args.language : pdfLanguage
        ) as PdfLanguage;

        generateShortNotesPDF({
          topic: matchedTopic,
          customNotes: args.customNotes,
          studentName: 'Student (વિદ્યાર્થી)',
          language: selectedLang,
        });

        addSessionNote(
          'PDF શોર્ટ નોટ્સ',
          `AI ટીચરે "${matchedTopic.name}" ની (${selectedLang.toUpperCase()}) શોર્ટ નોટ્સ PDF સ્પષ્ટ અને સુવાચ્ય અક્ષરોમાં તૈયાર કરી ડાઉનલોડ કરાવી આપી.`,
          matchedTopic.name
        );

        return {
          output: {
            success: true,
            message: `Short Notes PDF for ${matchedTopic.name} in ${selectedLang} generated and downloaded instantly!`,
          },
        };
      }

      return { output: { error: 'Unknown tool' } };
    },
    [selectedTopic, pdfLanguage, addSessionNote]
  );

  const stopSession = useCallback(() => {
    setState('disconnected');
    setIsPowerOn(false);
    setActivePower(null);

    if (sessionTimeoutRef.current) {
      window.clearTimeout(sessionTimeoutRef.current);
      sessionTimeoutRef.current = null;
    }
    sessionStartTimeRef.current = 0;

    if (videoIntervalRef.current) {
      window.clearInterval(videoIntervalRef.current);
      videoIntervalRef.current = null;
    }

    if (audioStreamerRef.current) {
      audioStreamerRef.current.stop();
      audioStreamerRef.current = null;
    }

    if (audioPlayerRef.current) {
      audioPlayerRef.current.stop();
      audioPlayerRef.current = null;
    }

    if (sessionRef.current) {
      try {
        sessionRef.current.close();
      } catch (e) {
        console.error('Error closing session:', e);
      }
      sessionRef.current = null;
    }
  }, []);

  const startSession = useCallback(async () => {
    setState('connecting');
    setErrorMessage(null);
    setIsPowerOn(true);

    sessionStartTimeRef.current = Date.now();
    sessionTimeoutRef.current = window.setTimeout(() => {
      if (sessionStartTimeRef.current > 0 && Date.now() - sessionStartTimeRef.current >= 600000) {
        stopSession();
        setErrorMessage('૧૦ મિનિટની સત્ર મર્યાદા પૂરી થઈ. ફરી શરૂ કરવા ક્લિક કરો.');
      }
    }, 600000);

    try {
      const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || '';
      const ai = new GoogleGenAI({ apiKey });

      audioPlayerRef.current = new AudioPlayer();
      audioPlayerRef.current.start();

      audioStreamerRef.current = new AudioStreamer((chunk) => {
        if (sessionRef.current) {
          try {
            sessionRef.current.sendRealtimeInput({
              audio: {
                data: chunk,
                mimeType: 'audio/pcm;rate=16000',
              },
            });
          } catch (streamErr) {
            console.error("Error streaming audio chunk:", streamErr);
          }
        }
      });
      await audioStreamerRef.current.start();

      const session = await ai.live.connect({
        model: 'gemini-3.1-flash-live-preview',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: 'Puck',
              },
            },
          },
          systemInstruction: {
            parts: [{ text: SYSTEM_INSTRUCTION }],
          },
          tools: tools as any,
        },
        callbacks: {
          onopen: () => {
            setState('listening');
            try {
              sessionRef.current?.sendRealtimeInput({
                text: "નમસ્તે સર, હું વિદ્યાર્થી છું. મારો અભ્યાસ શરૂ કરાવો!",
              });
            } catch (initErr) {
              console.log("Initial greeting notice:", initErr);
            }
          },
          onmessage: async (message: LiveServerMessage) => {
            const audioPart = message.serverContent?.modelTurn?.parts?.find((p) => p.inlineData);
            if (audioPart?.inlineData?.data) {
              setState('speaking');
              audioPlayerRef.current?.playChunk(audioPart.inlineData.data);
            }

            if (message.serverContent?.interrupted) {
              audioPlayerRef.current?.clearQueue();
              setState('listening');
            }

            if (message.serverContent?.turnComplete) setState('idle');

            const toolCallPart = message.serverContent?.modelTurn?.parts?.find((p) => p.toolCall);
            if (toolCallPart?.toolCall && sessionRef.current) {
              const toolCall = toolCallPart.toolCall as any;
              const response = await handleToolCall(toolCall);
              if (sessionRef.current) {
                sessionRef.current.sendToolResponse({
                  functionResponses: [
                    {
                      name: toolCall.name,
                      response: response.output,
                      id: toolCall.id,
                    },
                  ],
                });
              }
            }
          },
          onclose: () => stopSession(),
          onerror: (err: any) => {
            console.error("Live session error:", err);
            setErrorMessage(err.message || 'કનેક્શનમાં ક્ષણિક ખામી આવી. ફરી શરૂ કરો.');
            stopSession();
          },
        },
      });

      sessionRef.current = session;
      if (isCameraOn) startVideoInterval();
    } catch (error: any) {
      console.error("Failed to start session:", error);
      let msg = 'સત્ર જોડવામાં નિષ્ફળતા મળી';
      if (error?.name === 'NotAllowedError' || error?.message?.includes('Permission')) {
        msg = 'કૃપા કરીને માઇક્રોફોન પરવાનગી આપો (Microphone permission required)';
      } else if (error?.message) {
        msg = error.message;
      }
      setErrorMessage(msg);
      stopSession();
    }
  }, [handleToolCall, stopSession, isCameraOn]);

  const togglePower = () => (isPowerOn ? stopSession() : startSession());

  const startVideoInterval = useCallback(() => {
    if (videoIntervalRef.current) return;
    videoIntervalRef.current = window.setInterval(() => {
      if (videoRef.current && canvasRef.current && sessionRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx && video.videoWidth > 0) {
          const scale = Math.min(320 / video.videoWidth, 240 / video.videoHeight);
          canvas.width = video.videoWidth * scale;
          canvas.height = video.videoHeight * scale;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const base64 = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
          sessionRef.current.sendRealtimeInput({
            video: { data: base64, mimeType: 'image/jpeg' },
          });
        }
      }
    }, 1000);
  }, []);

  const stopVideoInterval = useCallback(() => {
    if (videoIntervalRef.current) {
      window.clearInterval(videoIntervalRef.current);
      videoIntervalRef.current = null;
    }
  }, []);

  const toggleCamera = async () => {
    if (isCameraOn) {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
      setIsCameraOn(false);
      stopVideoInterval();
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) videoRef.current.srcObject = stream;
        setIsCameraOn(true);
        if (sessionRef.current) startVideoInterval();
      } catch (err) {
        setErrorMessage('કેમેરા એક્સેસ નથી મળી શક્યો (Camera access failed)');
      }
    }
  };

  const triggerPower = (power: string) => {
    if (!isPowerOn) {
      startSession();
      setTimeout(() => handlePowerAction(power), 3000);
    } else {
      handlePowerAction(power);
    }
  };

  const handlePowerAction = (power: string) => {
    setActivePower(power);
    switch (power) {
      case 'study':
        addSessionNote(
          'લાઈવ મોક ટેસ્ટ',
          `${selectedTopic?.name || 'અભ્યાસ'} પ્રકરણ વિશે લાઈવ મોક ટેસ્ટ અને ડાઉટ સેશન શરૂ થયું.`,
          selectedTopic?.name
        );
        sendMessage(
          `વિદ્યાર્થીને "${selectedTopic?.name || 'અભ્યાસ'}" પ્રકરણમાંથી અગત્યના વાઇવા પ્રશ્નો પૂછો અને લાઈવ મૂલ્યાંકન કરો!`
        );
        break;
      case 'mood':
        addSessionNote('મૂડ વિશ્લેષણ', 'વિદ્યાર્થીના ચહેરાના હાવભાવ અને અભ્યાસ એકાગ્રતાનું વિશ્લેષણ કરાયું.');
        sendMessage('મારી સામે જુઓ અને એક જાગરૂક ટીચર તરીકે કહો કે મારો મૂડ અને એકાગ્રતા કેવાં છે?');
        break;
      case 'vision':
        addSessionNote('વિઝન કમેન્ટ્રી', 'પુસ્તકો અને અભ્યાસના વાતાવરણનું કેમેરા દ્વારા લાઇવ મોનિટરિંગ શરૂ થયું.');
        if (!isCameraOn) toggleCamera();
        sendMessage('કેમેરામાં જોઈને મને જણાવો કે મારો અભ્યાસ કેવો ચાલે છે અને કઈ બાબતે ધ્યાન આપવું?');
        break;
      case 'whatsapp':
        addSessionNote('વોટ્સએપ મેસેજ', 'અભ્યાસ માટેનો પ્રેરણાદાયી અને પ્રોત્સાહક મેસેજ સફળતાપૂર્વક તૈયાર થયો.');
        sendMessage('વિદ્યાર્થી માટે વોટ્સએપ પર અભ્યાસ માટે એક ઉત્સાહવર્ધક મેસેજ તૈયાર કરો.');
        break;
      case 'singing':
        addSessionNote('સિંગિંગ પરફોર્મન્સ', 'અભ્યાસ પછી થાક દૂર કરવા માટે મધુર ગીત પરફોર્મ કરાયું.');
        sendMessage(
          'તમે તો એક શ્રેષ્ઠ સિંગર પણ છો! મને તમારું કોઈ પણ મનપસંદ ગીત આખું ગાઈને સંભળાવો અથવા હું કોઈ એક શબ્દ બોલું તો તેના પરથી આખું ગીત લયબદ્ધ રીતે ગાઓ!'
        );
        break;
      case 'comedy':
        addSessionNote('સ્ટ્રેસ બસ્ટર કોમેડી', 'વિદ્યાર્થીનો માનસિક થાક ઉતારવા માટે રમુજી ટીચર જોક સેશન.');
        sendMessage('મને ભણવામાં ખૂબ કંટાળો આવે છે! મને એક મજેદાર ટીચર જોક અથવા લાઈટ કોમેડી પંચ સંભળાવીને હસાવો!');
        break;
      case 'pdf':
        addSessionNote(
          'PDF શોર્ટ નોટ્સ',
          `${selectedTopic.name} ની પરીક્ષાલક્ષી રિવિઝન શોર્ટ નોટ્સ (${pdfLanguage.toUpperCase()}) PDF સુવાચ્ય અક્ષરોમાં ડાઉનલોડ કરાઈ.`,
          selectedTopic.name
        );
        generateShortNotesPDF({
          topic: selectedTopic,
          studentName: 'Student (વિદ્યાર્થી)',
          language: pdfLanguage,
        });
        if (isPowerOn) {
          sendMessage(
            `વિદ્યાર્થી માટે "${selectedTopic.name}" પ્રકરણની (${pdfLanguage.toUpperCase()}) શોર્ટ નોટ્સ ની સ્પષ્ટ PDF ડાઉનલોડ કરી આપી છે! હવે તમે તેમાંથી ઝડપથી રિવિઝન કરી લો.`
          );
        }
        break;
    }
    setTimeout(() => setActivePower(null), 8000);
  };

  const onPlayerReady: YouTubeProps['onReady'] = (event) => {
    playerRef.current = event.target;
    event.target.setVolume(playerVolume);
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#050508] text-white font-sans selection:bg-cyan-500/30 overflow-x-hidden flex flex-col items-center p-3 sm:p-5 relative">
        {/* Ambient Cosmic Background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div
            className={`absolute top-0 left-0 w-full h-full transition-opacity duration-1000 ${
              isPowerOn ? 'opacity-100' : 'opacity-40'
            }`}
          >
            <div className="absolute top-[-10%] left-[-10%] w-[55%] h-[55%] blur-[160px] rounded-full bg-indigo-600/15 animate-pulse" />
            <div
              className="absolute bottom-[-10%] right-[-10%] w-[55%] h-[55%] blur-[160px] rounded-full bg-purple-600/15 animate-pulse"
              style={{ animationDelay: '1.5s' }}
            />
            <div className="absolute top-[40%] left-[30%] w-[40%] h-[40%] blur-[180px] rounded-full bg-cyan-600/10 pointer-events-none" />
          </div>
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.12] brightness-50 mix-blend-overlay" />
        </div>

        {/* Global Navigation Header */}
        <Header
          state={state}
          isPowerOn={isPowerOn}
          onTogglePower={togglePower}
          onOpenHistory={() => setIsHistoryOpen(true)}
          historyCount={sessionHistory.length}
          studyStreak={studyStreak}
          onIncrementStreak={() => {
            const next = studyStreak + 1;
            setStudyStreak(next);
            localStorage.setItem('study_streak', String(next));
          }}
          percentCompleted={percentCompleted}
        />

        {/* Animated Feature Tabs */}
        <NavTabs
          activeTab={activeTab}
          onTabChange={(tab) => {
            if (tab === 'history') {
              setIsHistoryOpen(true);
            } else {
              setActiveTab(tab);
            }
          }}
          isPowerOn={isPowerOn}
          historyCount={sessionHistory.length}
        />

        {/* Main Content Area */}
        <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto flex flex-col items-center justify-start my-3">
          <AnimatePresence mode="wait">
            {activeTab === 'teacher' && (
              <motion.div
                key="tab-teacher"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="w-full"
              >
                <LiveVoiceCore
                  state={state}
                  isPowerOn={isPowerOn}
                  onTogglePower={togglePower}
                  activePower={activePower}
                  onTriggerPower={triggerPower}
                  onSendMessage={sendMessage}
                  selectedTopic={selectedTopic}
                  pdfLanguage={pdfLanguage}
                  onNavigateToSyllabus={() => setActiveTab('topics')}
                />
              </motion.div>
            )}

            {activeTab === 'topics' && (
              <motion.div
                key="tab-topics"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="w-full"
              >
                <AcademicStudio
                  topics={ACADEMIC_TOPICS}
                  selectedTopicId={selectedTopicId}
                  onSelectTopicId={setSelectedTopicId}
                  completedTopics={completedTopics}
                  onToggleTopicMastered={toggleTopicMastered}
                  pdfLanguage={pdfLanguage}
                  onSetPdfLanguage={setPdfLanguage}
                  isPowerOn={isPowerOn}
                  onStartSession={startSession}
                  onSendMessage={sendMessage}
                  onAddSessionNote={addSessionNote}
                />
              </motion.div>
            )}

            {activeTab === 'doubts' && (
              <motion.div
                key="tab-doubts"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="w-full"
              >
                <DoubtSolver
                  topics={ACADEMIC_TOPICS}
                  selectedTopic={selectedTopic}
                  isPowerOn={isPowerOn}
                  onStartSession={startSession}
                  onSendMessage={sendMessage}
                  onAddSessionNote={addSessionNote}
                />
              </motion.div>
            )}

            {activeTab === 'wellness' && (
              <motion.div
                key="tab-wellness"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="w-full"
              >
                <StressBuster
                  isPowerOn={isPowerOn}
                  onStartSession={startSession}
                  onSendMessage={sendMessage}
                  onAddSessionNote={addSessionNote}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error Banner */}
          <AnimatePresence>
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="mt-6 px-6 py-3 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-4 shadow-xl backdrop-blur-xl"
              >
                <span className="text-red-300 text-xs sm:text-sm font-medium">{errorMessage}</span>
                <button
                  onClick={startSession}
                  className="text-[10px] uppercase font-bold tracking-widest text-cyan-300 hover:underline shrink-0"
                >
                  ફરી જોડો
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Global Floating Quick Action Toolbar */}
        <FloatingToolbar
          isCameraOn={isCameraOn}
          onToggleCamera={toggleCamera}
          state={state}
          isPowerOn={isPowerOn}
          onTogglePower={togglePower}
          onQuickJoke={() => {
            const prompt = 'મને એક મજેદાર ટીચર જોક સંભળાવીને હસાવો!';
            if (!isPowerOn) {
              startSession();
              setTimeout(() => sendMessage(prompt), 3000);
            } else {
              sendMessage(prompt);
            }
          }}
          onQuickPdf={() => {
            generateShortNotesPDF({
              topic: selectedTopic,
              studentName: 'Student (વિદ્યાર્થી)',
              language: pdfLanguage,
            });
            addSessionNote(
              'PDF શોર્ટ નોટ્સ',
              `AI ટીચરે "${selectedTopic.name}" ની (${pdfLanguage.toUpperCase()}) શોર્ટ નોટ્સ PDF ડાઉનલોડ કરાવી આપી.`,
              selectedTopic.name
            );
            if (isPowerOn) {
              sendMessage(`વિદ્યાર્થી માટે "${selectedTopic.name}" ની PDF ડાઉનલોડ થઈ ગઈ છે.`);
            }
          }}
        />

        {/* Hidden Processing Canvas & Video */}
        <div className="hidden">
          <video ref={videoRef} autoPlay playsInline muted />
          <canvas ref={canvasRef} />
        </div>

        {/* Camera Picture-in-Picture Floating Preview */}
        <CameraPip isCameraOn={isCameraOn} videoRef={videoRef} onClose={toggleCamera} />

        {/* YouTube Video Overlay Modal */}
        <VideoPlayerModal
          activeVideoId={activeVideoId}
          onClose={() => setActiveVideoId(null)}
          onPlayerReady={onPlayerReady}
          isPlaying={playerIsPlaying}
          onPlay={() => setPlayerIsPlaying(true)}
          onPause={() => setPlayerIsPlaying(false)}
        />

        {/* Slide-over Session History Drawer */}
        <SessionHistoryDrawer
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          notes={sessionHistory}
          onAddNote={(action, text) => addSessionNote(action, text, selectedTopic?.name)}
          onDeleteNote={deleteSessionNote}
          onClearAll={clearAllSessionNotes}
        />
      </div>
    </ErrorBoundary>
  );
}
export default App;
