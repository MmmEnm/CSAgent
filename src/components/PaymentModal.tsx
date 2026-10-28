/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CheckCircle2, ShieldCheck, X, QrCode, AlertCircle, ArrowRight } from 'lucide-react';
import { ConsultationOrder } from '../types';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: ConsultationOrder | null;
  onPaymentSuccess: (orderId: string) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  order,
  onPaymentSuccess,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paySuccess, setPaySuccess] = useState(false);

  if (!isOpen || !order) return null;

  const handleSimulatePay = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/pay`, { method: 'POST' });
      if (res.ok) {
        setPaySuccess(true);
        setTimeout(() => {
          onPaymentSuccess(order.id);
          setIsProcessing(false);
          setPaySuccess(false);
          onClose();
        }, 1500);
      }
    } catch (e) {
      console.error('Payment error', e);
      setIsProcessing(false);
    }
  };

  const amountToShow = order.paymentType === 'deposit' ? order.depositAmount : order.amount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="bg-emerald-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">
              支
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">微信支付安全收银台</h3>
              <p className="text-xs text-emerald-100">商户：知心谷心理咨询中心 (企业微信官方直连)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {paySuccess ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-1">微信支付成功</h4>
              <p className="text-sm text-slate-500 mb-4">
                已成功支付 ￥{amountToShow.toFixed(2)} 元
              </p>
              <div className="bg-emerald-50 text-emerald-800 text-xs p-3 rounded-lg text-left mb-2">
                • 预约定金已抵扣，已为您锁定咨询师独立排期<br />
                • 咨询顾问将于15分钟内通过微信客服发送到诊指引与健康问卷
              </div>
            </div>
          ) : (
            <>
              {/* Order summary */}
              <div className="bg-slate-50 rounded-xl p-4 mb-5 border border-slate-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-slate-500">服务项目</span>
                  <span className="text-xs font-semibold text-slate-800">{order.productName}</span>
                </div>
                {order.counselorName && (
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-slate-500">匹配咨询师</span>
                    <span className="text-xs text-slate-700">{order.counselorName}</span>
                  </div>
                )}
                {order.preferredTime && (
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-slate-500">预约时段</span>
                    <span className="text-xs text-slate-700">{order.preferredTime}</span>
                  </div>
                )}
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-slate-500">支付类型</span>
                  <span className="text-xs font-medium text-emerald-700">
                    {order.paymentType === 'deposit' ? '预约意向定金 (可抵扣尾款)' : '全额方案款'}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200/60 flex justify-between items-baseline">
                  <span className="text-xs font-medium text-slate-700">本次支付金额</span>
                  <span className="text-2xl font-bold text-emerald-600">
                    <span className="text-sm">￥</span>
                    {amountToShow.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* QR code simulation */}
              <div className="text-center mb-5">
                <div className="inline-block p-3 bg-white rounded-xl border border-slate-200 shadow-xs mb-2">
                  <div className="w-40 h-40 bg-slate-900 rounded-lg flex flex-col items-center justify-center text-white relative overflow-hidden group">
                    <QrCode className="w-28 h-28 text-white/90" />
                    <div className="absolute inset-0 bg-emerald-600/90 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity p-2 text-xs">
                      <span>微信扫一扫</span>
                      <span className="mt-1 font-semibold">支持直接点击模拟支付</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-500 flex items-center justify-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  微信支付企业商户安全认证 · 单次交易加密留痕
                </p>
              </div>

              {/* Refund Guarantee */}
              <div className="bg-amber-50/80 border border-amber-200/60 rounded-xl p-3 mb-5 text-xs text-amber-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">24小时无忧退改保障：</span>
                  咨询开始前24小时可随时无条件原路全额退款；24小时内可向值班顾问申请免费改期一次。
                </div>
              </div>

              {/* Pay Button */}
              <button
                onClick={handleSimulatePay}
                disabled={isProcessing}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {isProcessing ? (
                  <span>微信支付确认中...</span>
                ) : (
                  <>
                    <span>模拟微信支付完成 (￥{amountToShow})</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
