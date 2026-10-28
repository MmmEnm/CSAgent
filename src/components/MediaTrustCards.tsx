/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  MapPin,
  Navigation,
  Car,
  Clock,
  PhoneCall,
  Copy,
  Check,
  Eye,
  ShieldCheck,
  Volume2,
  ChevronRight,
  ExternalLink,
  Layers,
  Sparkles,
  Compass
} from 'lucide-react';
import { CLINIC_LOCATIONS, ClinicLocation } from '../data/clinicMediaData';

// ==================== 1. 咨询室私密环境实景展示卡片 ====================

interface ClinicEnvironmentCardProps {
  cardData?: {
    defaultCenter?: 'jingan' | 'xuhui';
    title?: string;
  };
  onOpenEnvironmentModal: (centerId: 'jingan' | 'xuhui') => void;
  onOpenMapNavigation: (centerId: 'jingan' | 'xuhui') => void;
}

export const ClinicEnvironmentCard: React.FC<ClinicEnvironmentCardProps> = ({
  cardData,
  onOpenEnvironmentModal,
  onOpenMapNavigation,
}) => {
  const [selectedCenter, setSelectedCenter] = useState<'jingan' | 'xuhui'>(
    cardData?.defaultCenter || 'jingan'
  );

  const center: ClinicLocation = CLINIC_LOCATIONS[selectedCenter];
  const photos = center.photos;

  return (
    <div className="mt-3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-slate-800">
      {/* Header */}
      <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-teal-500/20 text-teal-300 flex items-center justify-center">
            <Eye className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold leading-tight">
              {cardData?.title || '知心谷 · 咨询室私密环境与360°实景'}
            </h4>
            <p className="text-[10px] text-slate-400">独立声学隔音 · 绿植茶歇 · 单向私密动线</p>
          </div>
        </div>

        {/* Center Toggle Switch */}
        <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg text-[10px]">
          <button
            onClick={() => setSelectedCenter('jingan')}
            className={`px-2 py-0.5 rounded transition-all cursor-pointer font-medium ${
              selectedCenter === 'jingan' ? 'bg-teal-700 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            静安中心
          </button>
          <button
            onClick={() => setSelectedCenter('xuhui')}
            className={`px-2 py-0.5 rounded transition-all cursor-pointer font-medium ${
              selectedCenter === 'xuhui' ? 'bg-teal-700 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            徐汇中心
          </button>
        </div>
      </div>

      {/* Main Image Grid Showcase */}
      <div className="p-3.5 space-y-3">
        {/* Featured Big Photo */}
        <div
          onClick={() => onOpenEnvironmentModal(selectedCenter)}
          className="relative rounded-xl overflow-hidden aspect-16/9 bg-slate-900 cursor-pointer group shadow-xs"
        >
          <img
            src={photos[0].imageUrl}
            alt={photos[0].title}
            className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/10" />

          {/* Badge & Caption */}
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
            <span className="text-[10px] bg-teal-600/90 text-white font-bold px-2 py-0.5 rounded-full shadow-xs backdrop-blur-xs flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" />
              <span>360° 实景</span>
            </span>
            <span className="text-[10px] bg-black/60 text-slate-200 px-2 py-0.5 rounded-full backdrop-blur-xs">
              {photos[0].categoryLabel}
            </span>
          </div>

          <div className="absolute bottom-2.5 left-2.5 right-2.5 text-white">
            <div className="font-bold text-xs drop-shadow-sm flex items-center justify-between">
              <span>{photos[0].title}</span>
              <span className="text-[10px] text-teal-300 flex items-center gap-0.5">
                <span>点击全屏全景</span>
                <ChevronRight className="w-3 h-3" />
              </span>
            </div>
            <p className="text-[11px] text-slate-200 truncate mt-0.5 drop-shadow-xs">
              {photos[0].description}
            </p>
          </div>
        </div>

        {/* 3 Secondary Mini Thumbnails */}
        <div className="grid grid-cols-3 gap-2">
          {photos.slice(1, 4).map((p, idx) => (
            <div
              key={idx}
              onClick={() => onOpenEnvironmentModal(selectedCenter)}
              className="relative rounded-lg overflow-hidden aspect-4/3 bg-slate-100 cursor-pointer group border border-slate-100 shadow-2xs"
            >
              <img
                src={p.imageUrl}
                alt={p.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <span className="absolute bottom-1 left-1 right-1 text-[9px] text-white font-medium truncate drop-shadow-xs">
                {p.categoryLabel}
              </span>
            </div>
          ))}
        </div>

        {/* Key Delivery Specs Badges */}
        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-600 pt-0.5">
          <span className="px-2 py-0.5 bg-teal-50 text-teal-800 rounded-md border border-teal-200 font-medium flex items-center gap-1">
            <Volume2 className="w-3 h-3 text-teal-600" />
            <span>德国声学隔音 (55dB)</span>
          </span>
          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-medium">
            独立单向离场动线
          </span>
          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-medium">
            白噪音微声掩蔽
          </span>
          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-medium">
            绿植有机茶歇
          </span>
        </div>

        {/* Interactive CTA buttons */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
          <button
            onClick={() => onOpenEnvironmentModal(selectedCenter)}
            className="flex-1 py-1.5 bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
          >
            <Compass className="w-3.5 h-3.5 text-teal-300" />
            <span>进入 360° 沉浸画廊</span>
          </button>
          <button
            onClick={() => onOpenMapNavigation(selectedCenter)}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1"
          >
            <MapPin className="w-3.5 h-3.5 text-teal-600" />
            <span>路线与停车指引</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== 2. 到诊一键腾讯地图导航与停车指引卡片 ====================

interface MapNavigationCardProps {
  cardData?: {
    centerId?: 'jingan' | 'xuhui';
    orderNo?: string;
    counselorName?: string;
    appointmentTime?: string;
    title?: string;
  };
  onOpenEnvironmentModal?: (centerId: 'jingan' | 'xuhui') => void;
}

export const MapNavigationCard: React.FC<MapNavigationCardProps> = ({
  cardData,
  onOpenEnvironmentModal,
}) => {
  const [selectedCenter, setSelectedCenter] = useState<'jingan' | 'xuhui'>(
    cardData?.centerId || 'jingan'
  );
  const [copied, setCopied] = useState<boolean>(false);
  const [showNavToast, setShowNavToast] = useState<boolean>(false);

  const center: ClinicLocation = CLINIC_LOCATIONS[selectedCenter];

  const handleCopyAddress = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(`${center.name}：${center.address} (${center.floor})`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleTriggerTencentMap = () => {
    setShowNavToast(true);
    setTimeout(() => setShowNavToast(false), 4000);
  };

  return (
    <div className="mt-3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-slate-800">
      {/* Card Header with WeChat/Tencent Maps Styling */}
      <div className="bg-emerald-700 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-white">
            <Navigation className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-bold leading-tight">
                {cardData?.title || '知心谷到诊 · 一键腾讯地图导航与停车指引'}
              </h4>
              <span className="text-[9px] bg-emerald-800/80 text-emerald-200 px-1.5 py-0.2 rounded font-mono">
                微信小程序直通
              </span>
            </div>
            <p className="text-[10px] text-emerald-100 mt-0.5">
              已为您的面询预约匹配最优交通路线及免费停车
            </p>
          </div>
        </div>

        {/* Center Selector Tabs */}
        <div className="flex items-center gap-1 bg-emerald-900/60 p-0.5 rounded-lg text-[10px]">
          <button
            onClick={() => setSelectedCenter('jingan')}
            className={`px-2 py-0.5 rounded transition-all cursor-pointer font-medium ${
              selectedCenter === 'jingan' ? 'bg-white text-emerald-900 font-bold shadow-xs' : 'text-emerald-200 hover:text-white'
            }`}
          >
            静安
          </button>
          <button
            onClick={() => setSelectedCenter('xuhui')}
            className={`px-2 py-0.5 rounded transition-all cursor-pointer font-medium ${
              selectedCenter === 'xuhui' ? 'bg-white text-emerald-900 font-bold shadow-xs' : 'text-emerald-200 hover:text-white'
            }`}
          >
            徐汇
          </button>
        </div>
      </div>

      {/* Interactive Map Visual Mockup (Stylized Tencent Map Simulation) */}
      <div className="relative bg-slate-900 aspect-16/8 overflow-hidden select-none border-b border-slate-100">
        {/* Map Grid / Topology graphics representation */}
        <div className="absolute inset-0 bg-slate-800 opacity-90">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="map-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#map-grid)" />
            {/* Road lines simulation */}
            <path d="M -10,80 Q 150,90 320,60 T 600,100" fill="none" stroke="#3b82f6" strokeWidth="4" strokeDasharray="6,4" />
            <path d="M 120,-10 L 220,180" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="8" />
            <path d="M 0,110 L 500,110" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="12" />
          </svg>
        </div>

        {/* Transit ETA Tags Overlay */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10">
          <span className="text-[10px] bg-slate-900/85 backdrop-blur-xs text-white px-2 py-0.8 rounded-lg border border-white/10 flex items-center gap-1 shadow-sm font-medium">
            <Car className="w-3 h-3 text-sky-400" />
            <span>自驾 18分</span>
          </span>
          <span className="text-[10px] bg-emerald-900/90 backdrop-blur-xs text-emerald-200 px-2 py-0.8 rounded-lg border border-emerald-500/30 flex items-center gap-1 shadow-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>地铁 25分 (直通)</span>
          </span>
        </div>

        {/* Center Pin Marker */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10 animate-bounce">
          <div className="bg-emerald-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-xl shadow-lg border-2 border-white flex items-center gap-1 whitespace-nowrap">
            <MapPin className="w-3.5 h-3.5 fill-current" />
            <span>{center.name.split('·')[1]?.trim() || center.name}</span>
          </div>
          <div className="w-2 h-2 bg-emerald-600 rotate-45 -mt-1 border-r border-b border-white" />
        </div>

        {/* Bottom subtle bar on map */}
        <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-[10px] text-white/90 bg-slate-950/70 backdrop-blur-xs px-2.5 py-1 rounded-lg">
          <span className="truncate">坐标：{center.latitude}° N, {center.longitude}° E · 腾讯地图SDK定位校对</span>
          <span className="text-teal-300 shrink-0 font-medium ml-1">点击下方直接唤起导航</span>
        </div>
      </div>

      {/* Map Card Details Content */}
      <div className="p-3.5 space-y-3">
        {/* Address and Floor */}
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1 text-slate-500 text-[11px] mb-0.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>到诊具体地址</span>
            </div>
            <p className="text-xs font-bold text-slate-900 leading-snug">
              {center.address}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {center.buildingName} · {center.floor}
            </p>
          </div>

          <button
            onClick={handleCopyAddress}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-all flex items-center gap-1 cursor-pointer border ${
              copied
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>已复制地址</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>复制地址</span>
              </>
            )}
          </button>
        </div>

        {/* Metro Transit Guide */}
        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>地铁直达指引</span>
          </div>
          {center.metroGuide.map((step, idx) => (
            <p key={idx} className="text-[11px] text-slate-600 pl-3 leading-relaxed">
              • {step}
            </p>
          ))}
        </div>

        {/* Parking & Free Voucher */}
        <div className="p-2.5 bg-amber-50/80 rounded-xl border border-amber-200/80 text-xs space-y-1 text-amber-900">
          <div className="flex items-center justify-between font-bold text-[11px]">
            <div className="flex items-center gap-1.5 text-amber-900">
              <Car className="w-3.5 h-3.5 text-amber-700" />
              <span>自驾与访客停车福利</span>
            </div>
            <span className="bg-amber-200/80 text-amber-900 px-1.5 py-0.2 rounded text-[10px] font-bold">
              2小时免费停车券
            </span>
          </div>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            {center.parkingTip}。地库直通高区客梯厅，专人无感放行。
          </p>
        </div>

        {/* Privacy Note */}
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 bg-slate-50 p-2 rounded-lg">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>初访须知：实行单向动线独立迎候，咨询师提前5分钟在静音室等待，零公开叫号，保证私密。</span>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <button
            onClick={handleTriggerTencentMap}
            className="flex-1 min-w-[140px] py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>唤起腾讯地图一键导航</span>
          </button>

          {onOpenEnvironmentModal && (
            <button
              onClick={() => onOpenEnvironmentModal(selectedCenter)}
              className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-medium transition-colors cursor-pointer flex items-center gap-1"
            >
              <Eye className="w-3.5 h-3.5 text-teal-600" />
              <span>360° 实景照片</span>
            </button>
          )}

          <a
            href={`tel:${center.contactPhone.split('/')[0].trim()}`}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
            title="拨打到诊接待热线"
          >
            <PhoneCall className="w-3.5 h-3.5 text-slate-600" />
          </a>
        </div>

        {/* Tencent Map Simulated Launch Toast */}
        {showNavToast && (
          <div className="p-2.5 bg-slate-900 text-white rounded-xl text-xs flex items-center justify-between animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <Navigation className="w-4 h-4 text-emerald-400 animate-spin" />
              <span>已唤起微信腾讯地图插件，正为您规划【{center.name.split('·')[1]}】最优路线...</span>
            </div>
            <a
              href={`https://apis.map.qq.com/uri/v1/marker?marker=coord:${center.latitude},${center.longitude};title:${encodeURIComponent(center.name)};addr:${encodeURIComponent(center.address)}`}
              target="_blank"
              rel="noreferrer"
              className="text-emerald-400 hover:underline flex items-center gap-0.5 text-[11px] shrink-0 font-medium"
            >
              <span>外部打开</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
