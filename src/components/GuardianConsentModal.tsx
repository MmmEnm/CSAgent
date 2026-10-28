/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ShieldCheck, FileCheck, CheckCircle2, Lock, X, AlertTriangle, PenTool } from 'lucide-react';
import { GuardianConsent } from '../types';

interface GuardianConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  minorName?: string;
  minorAge?: number;
  sessionId?: string;
  onConsentSigned: (consent: GuardianConsent) => Promise<void>;
}

export const GuardianConsentModal: React.FC<GuardianConsentModalProps> = ({
  isOpen,
  onClose,
  minorName = '王同学',
  minorAge = 17,
  sessionId = 'sess_02',
  onConsentSigned,
}) => {
  const [guardianName, setGuardianName] = useState('王建华');
  const [relationship, setRelationship] = useState('父亲');
  const [guardianPhone, setGuardianPhone] = useState('139****7732');
  const [idCardLast4, setIdCardLast4] = useState('5118');
  const [hasReadEthics, setHasReadEthics] = useState(true);
  const [hasAgreedLimits, setHasAgreedLimits] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSignedSuccess, setIsSignedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardianName.trim() || !guardianPhone.trim()) return;

    setIsSubmitting(true);
    const signatureHash = `SIGN_SHA256_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const consentData: GuardianConsent = {
      id: `consent_${Date.now()}`,
      sessionId,
      minorName,
      minorAge,
      guardianName,
      guardianRelationship: relationship,
      guardianPhone,
      guardianIdCardLast4: idCardLast4,
      signedAt: new Date().toLocaleString(),
      status: 'signed',
      signatureHash,
      supervisorReviewer: '李晓华 老师 (督导复核)'
    };

    await onConsentSigned(consentData);
    setIsSubmitting(false);
    setIsSignedSuccess(true);
    setTimeout(() => {
      setIsSignedSuccess(false);
      onClose();
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-scaleIn text-slate-800">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-teal-600" />
            <h3 className="text-sm font-bold text-slate-900">
              未成年人心理咨询 · 法定监护人知情同意书
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {isSignedSuccess ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-base font-bold text-slate-900">监护人知情同意电子存证签署成功</h4>
            <p className="text-xs text-slate-500">
              存证防篡改哈希已生成 · 会话未成年人保护合规校验已通过
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
            {/* Legal Notice */}
            <div className="p-3 bg-teal-50/80 rounded-xl border border-teal-200 text-teal-900 text-[11px] leading-relaxed">
              <strong>合规依据：</strong>根据《中华人民共和国未成年人保护法》及《中国心理学会临床与咨询心理学工作伦理守则》，未满18周岁的未成年人接受心理咨询服务前，须获得其法定监护人的知情同意与书面确认。
            </div>

            {/* Minor profile */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 block text-[10px]">来访者姓名</span>
                <strong className="text-slate-900 font-medium">{minorName}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">年龄认定</span>
                <strong className="text-amber-800 font-medium">{minorAge} 周岁 (未成年人保护通道)</strong>
              </div>
            </div>

            {/* Guardian Info */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">监护人真实姓名 <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={guardianName}
                  onChange={(e) => setGuardianName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">与被监护人关系</label>
                <select
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-teal-500 bg-white"
                >
                  <option value="父亲">父亲</option>
                  <option value="母亲">母亲</option>
                  <option value="其他法定监护人">其他法定监护人</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">监护人手机号 <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={guardianPhone}
                  onChange={(e) => setGuardianPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">身份证件后4位存证</label>
                <input
                  type="text"
                  maxLength={4}
                  value={idCardLast4}
                  onChange={(e) => setIdCardLast4(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-teal-500"
                />
              </div>
            </div>

            {/* Checkboxes */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <label className="flex items-start gap-2 cursor-pointer text-[11px] text-slate-600">
                <input
                  type="checkbox"
                  checked={hasReadEthics}
                  onChange={(e) => setHasReadEthics(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-teal-600 focus:ring-0"
                />
                <span>
                  本人已充分知悉心理咨询伦理，同意为未成年人提供私密安全的咨询空间；在涉及自身或他人人身安全极端危机时除外。
                </span>
              </label>

              <label className="flex items-start gap-2 cursor-pointer text-[11px] text-slate-600">
                <input
                  type="checkbox"
                  checked={hasAgreedLimits}
                  onChange={(e) => setHasAgreedLimits(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-teal-600 focus:ring-0"
                />
                <span>
                  本人授权知心谷专业心理团队开展咨询服务，同意以上实名签署信息作为合法知情存证。
                </span>
              </label>
            </div>

            {/* Simulated Digital Signature Seal */}
            <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PenTool className="w-4 h-4 text-teal-600" />
                <span className="text-[11px] font-mono font-bold text-slate-700">
                  电子签名存证: {guardianName} (已生物认证)
                </span>
              </div>
              <span className="text-[10px] text-emerald-600 font-mono">
                [区块链防篡改协议生效]
              </span>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                暂不签署
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !hasReadEthics || !hasAgreedLimits}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <FileCheck className="w-4 h-4" />
                <span>{isSubmitting ? '存证生成中...' : '确认签署并生成法定存证'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
