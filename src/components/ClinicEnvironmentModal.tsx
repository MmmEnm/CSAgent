/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Volume2,
  Compass,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  ShieldCheck,
  Sparkles,
  Layers,
  Calendar,
  Maximize2,
  Eye,
  Info
} from 'lucide-react';
import { CLINIC_LOCATIONS, ClinicLocation, ClinicPhoto } from '../data/clinicMediaData';

interface ClinicEnvironmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultLocation?: 'jingan' | 'xuhui';
  onBookCenter?: (centerName: string) => void;
  onOpenMap?: (centerId: 'jingan' | 'xuhui') => void;
}

export const ClinicEnvironmentModal: React.FC<ClinicEnvironmentModalProps> = ({
  isOpen,
  onClose,
  defaultLocation = 'jingan',
  onBookCenter,
  onOpenMap,
}) => {
  const [selectedCenter, setSelectedCenter] = useState<'jingan' | 'xuhui'>(defaultLocation);
  const [activePhotoIdx, setActivePhotoIdx] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'photos' | 'panorama360'>('photos');
  const [panAngle, setPanAngle] = useState<number>(0);
  const [activeHotspot, setActiveHotspot] = useState<string | null>(null);

  if (!isOpen) return null;

  const center: ClinicLocation = CLINIC_LOCATIONS[selectedCenter];
  const photos = center.photos;
  const currentPhoto: ClinicPhoto = photos[activePhotoIdx] || photos[0];
  const currentPanorama = center.panoramas[0];

  const handleNextPhoto = () => {
    setActivePhotoIdx((prev) => (prev + 1) % photos.length);
  };

  const handlePrevPhoto = () => {
    setActivePhotoIdx((prev) => (prev - 1 + photos.length) % photos.length);
  };

  const handleRotatePan = (delta: number) => {
    setPanAngle((prev) => (prev + delta + 360) % 360);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-4 sm:px-6 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-teal-600/30 border border-teal-500/40 flex items-center justify-center text-teal-300">
              <Eye className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base leading-tight truncate">
                  知心谷 · 360° 咨询室私密空间实景画廊
                </h3>
                <span className="hidden sm:inline text-[10px] bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded border border-teal-500/30">
                  真实空间交付 · 消除初访陌生感
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                {center.name} ({center.badge})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Center Switcher & Tab Bar */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
          {/* Location selector pills */}
          <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <button
              onClick={() => {
                setSelectedCenter('jingan');
                setActivePhotoIdx(0);
              }}
              className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1 ${
                selectedCenter === 'jingan'
                  ? 'bg-slate-900 text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-teal-400" />
              <span>上海静安中心</span>
              <span className="text-[10px] text-teal-300 hidden sm:inline">(1788广场高区)</span>
            </button>
            <button
              onClick={() => {
                setSelectedCenter('xuhui');
                setActivePhotoIdx(0);
              }}
              className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1 ${
                selectedCenter === 'xuhui'
                  ? 'bg-slate-900 text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-teal-400" />
              <span>上海徐汇中心</span>
              <span className="text-[10px] text-teal-300 hidden sm:inline">(衡复法式洋房)</span>
            </button>
          </div>

          {/* Mode switch: Photo Gallery vs 360 Panorama */}
          <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setActiveTab('photos')}
              className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer flex items-center gap-1 ${
                activeTab === 'photos'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-teal-600" />
              <span>实景照片画廊 ({photos.length}张)</span>
            </button>
            <button
              onClick={() => setActiveTab('panorama360')}
              className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer flex items-center gap-1 ${
                activeTab === 'panorama360'
                  ? 'bg-teal-700 text-white shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-teal-300 animate-spin" />
              <span>360° 空间沉浸全景</span>
            </button>
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {activeTab === 'photos' ? (
            /* ================= VIEW 1: 照片画廊 ================= */
            <div className="space-y-4">
              {/* Photo Display Frame with Navigation */}
              <div className="relative rounded-2xl overflow-hidden bg-slate-900 aspect-16/10 sm:aspect-16/9 border border-slate-200 shadow-inner group">
                <img
                  src={currentPhoto.imageUrl}
                  alt={currentPhoto.title}
                  className="w-full h-full object-cover transition-transform duration-700 ease-out"
                />

                {/* Ambient vignette overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/20 pointer-events-none" />

                {/* Left & Right Carousel arrows */}
                <button
                  onClick={handlePrevPhoto}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white flex items-center justify-center backdrop-blur-xs transition-colors cursor-pointer border border-white/20 shadow-md"
                  title="上一张照片"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={handleNextPhoto}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white flex items-center justify-center backdrop-blur-xs transition-colors cursor-pointer border border-white/20 shadow-md"
                  title="下一张照片"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                {/* Bottom Overlay Label */}
                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] bg-teal-500 text-white font-bold px-2 py-0.5 rounded-full shadow-xs">
                      {currentPhoto.categoryLabel}
                    </span>
                    <span className="text-xs font-semibold text-white drop-shadow-sm">
                      {currentPhoto.title}
                    </span>
                    <span className="text-[10px] text-slate-300 ml-auto font-mono">
                      {activePhotoIdx + 1} / {photos.length}
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 line-clamp-2 drop-shadow-sm">
                    {currentPhoto.description}
                  </p>
                </div>
              </div>

              {/* Thumbnails strip */}
              <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-thin">
                {photos.map((item, idx) => (
                  <button
                    key={item.id}
                    onClick={() => setActivePhotoIdx(idx)}
                    className={`relative shrink-0 w-24 sm:w-28 h-16 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                      activePhotoIdx === idx
                        ? 'border-teal-600 shadow-md scale-102 ring-2 ring-teal-200'
                        : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-1 left-1 text-[9px] bg-black/70 text-white px-1.5 py-0.2 rounded font-medium">
                      {item.categoryLabel}
                    </span>
                  </button>
                ))}
              </div>

              {/* Photo Acoustic & Privacy Specs Card */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/90 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4 text-teal-700" />
                    <span>声学隔音与环境交付标准</span>
                  </span>
                  <span className="text-[11px] text-teal-800 bg-teal-100 px-2 py-0.5 rounded font-medium">
                    {currentPhoto.acousticFeature}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs text-slate-600">
                  {currentPhoto.specDetails.map((spec, i) => (
                    <div key={i} className="flex items-center gap-1.5 p-2 bg-white rounded-lg border border-slate-100">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{spec}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* ================= VIEW 2: 360° 空间沉浸全景仿真 ================= */
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-16/10 sm:aspect-16/9 border border-slate-800 shadow-2xl flex items-center justify-center select-none group">
                {/* Simulated 360 panorama container with panoramic transform */}
                <div
                  className="absolute inset-0 transition-transform duration-300 ease-out"
                  style={{
                    backgroundImage: `url(${currentPhoto.imageUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: `${50 + (panAngle / 360) * 80}% center`,
                    filter: 'brightness(0.92) contrast(1.05)',
                  }}
                />

                {/* Vignette & Scanline effect */}
                <div className="absolute inset-0 bg-radial from-transparent via-black/20 to-black/60 pointer-events-none" />

                {/* 360 Interactive Hotspots */}
                {currentPanorama.hotspots.map((spot, i) => {
                  const xPos = ((spot.x + (panAngle / 3.6)) % 100);
                  return (
                    <div
                      key={i}
                      style={{ left: `${xPos}%`, top: `${spot.y}%` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 z-20 group/spot"
                    >
                      <button
                        onClick={() => setActiveHotspot(activeHotspot === spot.title ? null : spot.title)}
                        className="relative flex items-center justify-center w-8 h-8 rounded-full bg-teal-500/90 text-white shadow-lg border-2 border-white hover:scale-110 active:scale-95 transition-all cursor-pointer animate-pulse"
                      >
                        <Sparkles className="w-4 h-4" />
                      </button>

                      {/* Tooltip on hover or click */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2.5 bg-slate-900/95 text-white rounded-xl shadow-xl text-xs border border-teal-500/40 pointer-events-none opacity-0 group-hover/spot:opacity-100 transition-opacity z-30">
                        <div className="font-bold text-teal-300 mb-0.5">{spot.title}</div>
                        <p className="text-[11px] text-slate-300 leading-tight">{spot.desc}</p>
                      </div>
                    </div>
                  );
                })}

                {/* Compass & Rotation Controls */}
                <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 text-white text-xs">
                  <Compass className="w-4 h-4 text-teal-400" />
                  <span className="font-mono">{panAngle}°</span>
                  <div className="flex items-center gap-1 ml-2 border-l border-slate-700 pl-2">
                    <button
                      onClick={() => handleRotatePan(-45)}
                      className="p-1 hover:bg-slate-800 rounded transition-colors cursor-pointer text-[10px] font-bold"
                    >
                      ↺ 左旋45°
                    </button>
                    <button
                      onClick={() => handleRotatePan(45)}
                      className="p-1 hover:bg-slate-800 rounded transition-colors cursor-pointer text-[10px] font-bold"
                    >
                      ↻ 右旋45°
                    </button>
                  </div>
                </div>

                <div className="absolute top-4 right-4 z-20 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 text-teal-300 text-[11px] flex items-center gap-1">
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>支持全向平移角度</span>
                </div>
              </div>

              {/* Instructions below 360 canvas */}
              <div className="p-3.5 bg-teal-50 rounded-xl border border-teal-200 text-xs text-teal-900 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold">{currentPanorama.title}</p>
                  <p className="text-[11px] text-teal-800 leading-relaxed">
                    {currentPanorama.description}。点击画面中的高亮脉冲光点可了解各项隔音材料与灯光设置指标。
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Privacy & Confidentiality Invariants */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5 mb-2">
              <ShieldCheck className="w-4 h-4 text-teal-700" />
              <span>知心谷初次面访私密性与安全承诺</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600">
              {center.privacySetting.map((rule, idx) => (
                <div key={idx} className="flex items-start gap-1.5">
                  <span className="text-teal-600 font-bold">•</span>
                  <span>{rule}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer with Actions */}
        <div className="bg-slate-50 border-t border-slate-200 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
          <div className="text-slate-500">
            <span>地址: </span>
            <strong className="text-slate-800">{center.address}</strong>
          </div>

          <div className="flex items-center gap-2">
            {onOpenMap && (
              <button
                onClick={() => {
                  onClose();
                  onOpenMap(selectedCenter);
                }}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1"
              >
                <MapPin className="w-3.5 h-3.5 text-teal-600" />
                <span>查看腾讯地图路线指引</span>
              </button>
            )}

            {onBookCenter && (
              <button
                onClick={() => {
                  onClose();
                  onBookCenter(center.name);
                }}
                className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>预约该中心咨询排期</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
