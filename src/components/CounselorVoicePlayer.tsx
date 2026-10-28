/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Play, Pause, Volume2, ShieldCheck, FileText, ChevronDown, ChevronUp, Sparkles, Check } from 'lucide-react';
import { CounselorProfile } from '../types';
import { voiceEngine } from '../utils/voiceSynthesizer';

interface CounselorVoicePlayerProps {
  counselor: CounselorProfile;
  onBookCounselor?: (counselorName: string) => void;
  compact?: boolean;
}

export const CounselorVoicePlayer: React.FC<CounselorVoicePlayerProps> = ({
  counselor,
  onBookCounselor,
  compact = false,
}) => {
  const greeting = counselor.voiceGreeting;
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentSeconds, setCurrentSeconds] = useState<number>(0);
  const [progressRatio, setProgressRatio] = useState<number>(0);
  const [showTranscript, setShowTranscript] = useState<boolean>(false);

  const duration = greeting?.durationSeconds || 15;
  const waveformHeights = greeting?.waveformHeights || [40, 60, 80, 50, 70, 90, 65, 45, 85, 75, 55, 35];

  useEffect(() => {
    // If another counselor started playing, stop this one
    const checkActive = setInterval(() => {
      if (isPlaying && voiceEngine.getActiveCounselorId() !== counselor.id) {
        setIsPlaying(false);
      }
    }, 200);

    return () => {
      clearInterval(checkActive);
    };
  }, [isPlaying, counselor.id]);

  useEffect(() => {
    return () => {
      if (voiceEngine.getActiveCounselorId() === counselor.id) {
        voiceEngine.stop();
      }
    };
  }, [counselor.id]);

  const togglePlay = () => {
    if (isPlaying) {
      voiceEngine.stop();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      setCurrentSeconds(0);
      setProgressRatio(0);

      voiceEngine.playGreeting(
        counselor.id,
        counselor.name,
        counselor.gender,
        greeting?.spokenText || '您好，我是心理咨询师。在这里，每一个情绪都会被温暖倾听。',
        duration,
        (passedSec, ratio) => {
          setCurrentSeconds(passedSec);
          setProgressRatio(ratio);
        },
        () => {
          setIsPlaying(false);
          setCurrentSeconds(0);
          setProgressRatio(0);
        }
      );
    }
  };

  const formatTime = (sec: number) => {
    const s = Math.min(duration, sec);
    return `00:${s.toString().padStart(2, '0')}`;
  };

  if (!greeting) return null;

  return (
    <div className={`mt-2 rounded-xl border transition-all ${
      isPlaying 
        ? 'bg-gradient-to-r from-teal-50/90 via-emerald-50/80 to-sky-50/90 border-teal-300 ring-2 ring-teal-200/60 shadow-xs' 
        : 'bg-white border-slate-200/90 hover:border-teal-200'
    } p-2.5 text-slate-800`}>
      {/* Top Bar: Title & Timbre */}
      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100">
        <div className="flex items-center gap-1.5">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-teal-600 text-white text-[10px] shadow-2xs">
            <Volume2 className="w-3 h-3" />
          </span>
          <span className="text-xs font-bold text-slate-900">
            {counselor.name.split(' ')[0]} 15秒真人语音名片
          </span>
          <span className="text-[9px] bg-teal-100 text-teal-800 font-semibold px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
            <ShieldCheck className="w-2.5 h-2.5 text-teal-700" />
            <span>真声认证</span>
          </span>
        </div>

        <span className="text-[10px] text-teal-800 font-medium bg-teal-50 px-2 py-0.5 rounded border border-teal-200/60">
          {greeting.toneStyle.split('·')[0].trim()}
        </span>
      </div>

      {/* Audio Waveform & Control Bar */}
      <div className="flex items-center gap-2.5">
        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={togglePlay}
          className={`w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 shadow-xs transition-all cursor-pointer ${
            isPlaying
              ? 'bg-rose-600 hover:bg-rose-700 ring-4 ring-rose-200/60 animate-pulse'
              : 'bg-teal-700 hover:bg-teal-800 active:scale-95'
          }`}
          title={isPlaying ? '暂停试听' : '点击试听15秒真人原声'}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
        </button>

        {/* Dynamic Waveform Visualizer */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="flex items-center gap-0.5 sm:gap-1 h-6">
            {waveformHeights.map((h, idx) => {
              const activeThreshold = (idx / waveformHeights.length);
              const isPast = progressRatio >= activeThreshold;
              return (
                <div
                  key={idx}
                  className="flex-1 rounded-full transition-all duration-150"
                  style={{
                    height: isPlaying ? `${Math.max(20, (h * (0.6 + Math.sin(Date.now() / 200 + idx) * 0.4)))}%` : `${h * 0.7}%`,
                    backgroundColor: isPlaying
                      ? isPast ? '#0f766e' : '#5eead4'
                      : isPast ? '#0d9488' : '#cbd5e1'
                  }}
                />
              );
            })}
          </div>

          {/* Time & Progress Bar */}
          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mt-1">
            <span className={isPlaying ? 'text-teal-800 font-bold' : ''}>
              {formatTime(currentSeconds)}
            </span>
            <span className="text-[9px] text-slate-400">
              {isPlaying ? '正在播放真人语音 · 请开启音量' : '点击左侧按钮播放'}
            </span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      {/* Transcript Collapsible Toggle */}
      <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
        <button
          type="button"
          onClick={() => setShowTranscript(prev => !prev)}
          className="text-slate-600 hover:text-teal-700 flex items-center gap-1 cursor-pointer font-medium"
        >
          <FileText className="w-3 h-3 text-teal-600" />
          <span>{showTranscript ? '收起语音文稿' : '查看原声口述文稿'}</span>
          {showTranscript ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {onBookCounselor && (
          <button
            type="button"
            onClick={() => onBookCounselor(counselor.name)}
            className="text-[11px] font-semibold text-teal-700 hover:text-teal-900 hover:underline cursor-pointer"
          >
            预约该老师 →
          </button>
        )}
      </div>

      {/* Expanded Transcript */}
      {showTranscript && (
        <div className="mt-2 p-2 bg-slate-50 rounded-lg border border-slate-200/80 text-[11px] text-slate-700 leading-relaxed italic animate-fadeIn">
          <p>{greeting.spokenText}</p>
          <div className="mt-1 text-[9px] text-slate-400 not-italic flex items-center justify-between">
            <span>声调气场：{greeting.toneStyle}</span>
            <span>录音地点：知心谷静安中心A01声学室</span>
          </div>
        </div>
      )}
    </div>
  );
};
