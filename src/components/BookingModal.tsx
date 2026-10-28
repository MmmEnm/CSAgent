/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  User,
  Phone,
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import { ServiceProduct, CounselorProfile, ConsultationOrder } from '../types';
import { SERVICE_PRODUCTS, COUNSELORS } from '../data/mockData';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ServiceProduct | null;
  preferredCounselorName?: string;
  onConfirmBooking: (bookingData: {
    userName: string;
    phone: string;
    productId: string;
    productName: string;
    amount: number;
    paymentType: 'deposit' | 'full';
    counselorName: string;
    preferredTime: string;
  }) => Promise<void>;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  product,
  preferredCounselorName,
  onConfirmBooking,
}) => {
  const [userName, setUserName] = useState('小林');
  const [phone, setPhone] = useState('13800138000');
  const [selectedCounselor, setSelectedCounselor] = useState(preferredCounselorName || '李晓华 老师');
  const [selectedSlot, setSelectedSlot] = useState('本周三 14:00');
  const [consentAgreed, setConsentAgreed] = useState(true);
  const [paymentType, setPaymentType] = useState<'deposit' | 'full'>('deposit');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (preferredCounselorName) {
      setSelectedCounselor(preferredCounselorName);
    }
  }, [preferredCounselorName]);

  if (!isOpen || !product) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!phone || phone.trim().length !== 11 || !/^\d{11}$/.test(phone.trim())) {
      setErrorMessage('请输入正确的11位中国大陆手机号（用于接收预约与到诊凭证）');
      return;
    }

    if (!consentAgreed) {
      setErrorMessage('请勾选知晓预约联系与24小时退改保障条款');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirmBooking({
        userName: userName.trim() || '咨询访客',
        phone: phone.trim(),
        productId: product.id,
        productName: product.name,
        amount: product.price,
        paymentType,
        counselorName: selectedCounselor,
        preferredTime: selectedSlot,
      });
      setIsSubmitting(false);
      onClose();
    } catch (err) {
      setErrorMessage('预约订单创建失败，请稍后重试');
      setIsSubmitting(false);
    }
  };

  const depositAmount = 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-teal-700 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">
              约
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">心理咨询预约登记与排期锁定</h3>
              <p className="text-xs text-teal-100">企业微信官方通道 · 24小时无忧退改保障</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Selected Product Summary */}
          <div className="bg-teal-50/70 border border-teal-200/80 rounded-xl p-3.5">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-teal-900">{product.name}</span>
                <p className="text-xs text-teal-700 mt-0.5">{product.duration} · {product.description}</p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-base font-bold text-teal-800">￥{product.price}</span>
                {product.originalPrice && product.originalPrice > product.price && (
                  <div className="text-[10px] text-slate-400 line-through">￥{product.originalPrice}</div>
                )}
              </div>
            </div>
          </div>

          {/* Counselor Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              匹配咨询师
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {COUNSELORS.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setSelectedCounselor(c.name)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedCounselor === c.name
                      ? 'border-teal-600 bg-teal-50/60 shadow-xs ring-1 ring-teal-500'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                  }`}
                >
                  <div className="font-bold text-xs text-slate-900">{c.name}</div>
                  <div className="text-[10px] text-teal-700 truncate">{c.modality.split('·')[0]}</div>
                  <div className="text-[10px] text-slate-400 mt-1">{c.priceRange}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Time Slot Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              期望咨询时段 (支持到诊前24小时免费改期)
            </label>
            <select
              value={selectedSlot}
              onChange={(e) => setSelectedSlot(e.target.value)}
              className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-xl bg-white focus:outline-hidden focus:border-teal-500 font-medium text-slate-800"
            >
              <option value="本周三 14:00 (李晓华老师时段)">本周三 14:00 (李晓华老师时段)</option>
              <option value="本周四 18:30 (陈梦琪老师时段)">本周四 18:30 (陈梦琪老师时段)</option>
              <option value="本周六 10:00 (李晓华老师时段)">本周六 10:00 (李晓华老师时段)</option>
              <option value="下周二 19:00 (王振华老师时段)">下周二 19:00 (王振华老师时段)</option>
              <option value="下周日 15:00 (王振华老师时段)">下周日 15:00 (王振华老师时段)</option>
            </select>
          </div>

          {/* User Contact Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                联系称呼 (支持化名/昵称)
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  placeholder="如：王女士 / 小林"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-teal-500"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-slate-700">
                  联系手机号
                </label>
                <button
                  type="button"
                  onClick={() => setPhone('13800138000')}
                  className="text-[10px] text-teal-700 hover:underline cursor-pointer"
                >
                  填入示例号码
                </button>
              </div>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="tel"
                  required
                  maxLength={11}
                  placeholder="11位手机号"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-teal-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Payment Type Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              支付方式选择
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentType('deposit')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  paymentType === 'deposit'
                    ? 'border-emerald-600 bg-emerald-50/70 shadow-xs ring-1 ring-emerald-500'
                    : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-xs text-slate-900">支付意向定金</span>
                  <span className="text-emerald-700 font-bold text-sm">￥100</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">锁定专属咨询时段，到诊全额抵扣</p>
              </button>

              <button
                type="button"
                onClick={() => setPaymentType('full')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  paymentType === 'full'
                    ? 'border-emerald-600 bg-emerald-50/70 shadow-xs ring-1 ring-emerald-500'
                    : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-xs text-slate-900">支付全额款项</span>
                  <span className="text-slate-900 font-bold text-sm">￥{product.price}</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">直接锁定全款，支持开具发票</p>
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Consent Checkbox */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={consentAgreed}
                onChange={(e) => setConsentAgreed(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-teal-700"
              />
              <span className="text-slate-600 text-[11px] leading-relaxed">
                我同意知心谷仅将手机号用于本次咨询预约联络；知悉享有<strong>咨询前24小时无条件全额退款保障</strong>（24小时内可免费改期一次）。
              </span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
          >
            <CreditCard className="w-4 h-4" />
            <span>
              {isSubmitting
                ? '正在生成预约单...'
                : paymentType === 'deposit'
                ? '前往微信支付 ￥100 锁定预约定金'
                : `前往微信支付全款 (￥${product.price})`}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
};
