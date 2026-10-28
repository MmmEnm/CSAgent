/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Sparkles,
  Heart,
  BarChart2,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
  Shield,
  X
} from 'lucide-react';
import { AssessmentResult } from '../types';

interface PsychAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleteAssessment?: (result: AssessmentResult) => void;
}

const PHQ9_QUESTIONS = [
  { id: 1, text: '做事时提不起劲或没有兴趣', options: [{ label: '完全没有', score: 0 }, { label: '有几天', score: 1 }, { label: '一半以上时间', score: 2 }, { label: '几乎天天', score: 3 }] },
  { id: 2, text: '感到心情低落、沮丧或绝望', options: [{ label: '完全没有', score: 0 }, { label: '有几天', score: 1 }, { label: '一半以上时间', score: 2 }, { label: '几乎天天', score: 3 }] },
  { id: 3, text: '入睡困难、睡不安稳或睡眠过多', options: [{ label: '完全没有', score: 0 }, { label: '有几天', score: 1 }, { label: '一半以上时间', score: 2 }, { label: '几乎天天', score: 3 }] },
  { id: 4, text: '感觉疲倦或没有活力', options: [{ label: '完全没有', score: 0 }, { label: '有几天', score: 1 }, { label: '一半以上时间', score: 2 }, { label: '几乎天天', score: 3 }] },
  { id: 5, text: '对自己的评价很差，觉得自己很失败或让家人失望', options: [{ label: '完全没有', score: 0 }, { label: '有几天', score: 1 }, { label: '一半以上时间', score: 2 }, { label: '几乎天天', score: 3 }] },
];

const GAD7_QUESTIONS = [
  { id: 1, text: '感觉紧张、焦虑或急躁', options: [{ label: '完全没有', score: 0 }, { label: '有几天', score: 1 }, { label: '一半以上时间', score: 2 }, { label: '几乎天天', score: 3 }] },
  { id: 2, text: '无法停止或无法控制担忧', options: [{ label: '完全没有', score: 0 }, { label: '有几天', score: 1 }, { label: '一半以上时间', score: 2 }, { label: '几乎天天', score: 3 }] },
  { id: 3, text: '对各种各样的事情过度担忧', options: [{ label: '完全没有', score: 0 }, { label: '有几天', score: 1 }, { label: '一半以上时间', score: 2 }, { label: '几乎天天', score: 3 }] },
  { id: 4, text: '很难放松下来', options: [{ label: '完全没有', score: 0 }, { label: '有几天', score: 1 }, { label: '一半以上时间', score: 2 }, { label: '几乎天天', score: 3 }] },
  { id: 5, text: '由于坐立不安而难以保持安静', options: [{ label: '完全没有', score: 0 }, { label: '有几天', score: 1 }, { label: '一半以上时间', score: 2 }, { label: '几乎天天', score: 3 }] },
];

export const PsychAssessmentModal: React.FC<PsychAssessmentModalProps> = ({
  isOpen,
  onClose,
  onCompleteAssessment,
}) => {
  const [scaleType, setScaleType] = useState<'phq9' | 'gad7'>('phq9');
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<AssessmentResult | null>(null);

  if (!isOpen) return null;

  const currentQuestions = scaleType === 'phq9' ? PHQ9_QUESTIONS : GAD7_QUESTIONS;

  const handleSelectOption = (score: number) => {
    const nextAnswers = [...answers, score];
    setAnswers(nextAnswers);

    if (currentStep + 1 < currentQuestions.length) {
      setCurrentStep(currentStep + 1);
    } else {
      const totalScore = nextAnswers.reduce((a, b) => a + b, 0);
      let severity: 'normal' | 'mild' | 'moderate' | 'severe' = 'mild';
      let severityLabel = '轻度情绪压力';
      let advice = '您目前经历轻度情绪波动，适合通过单次或短程心理沟通梳理症结。';
      let recommendedProductId = 'p1';
      let recommendedProductName = '首次心理评估与深度访谈 (单次)';

      if (totalScore <= 2) {
        severity = 'normal';
        severityLabel = '身心状态相对平稳';
        advice = '您的心理弹性良好，建议保持规律作息与身心觉察。';
      } else if (totalScore >= 3 && totalScore <= 7) {
        severity = 'mild';
        severityLabel = '轻度身心疲惫与情绪紧绷';
        advice = '存在一定的压力累积，推荐【首次心理评估】或【4次深度探索方案】进行认知情绪归因。';
        recommendedProductId = 'p3';
        recommendedProductName = '4次深度心理探索与梳理方案';
      } else if (totalScore >= 8 && totalScore <= 11) {
        severity = 'moderate';
        severityLabel = '中度情绪困扰与失眠焦虑';
        advice = '情绪对睡眠或工作专注力已产生实质影响，强烈建议选择【4次深度方案】建立稳定心理支持。';
        recommendedProductId = 'p3';
        recommendedProductName = '4次深度心理探索与梳理方案 (打包特惠 1800元)';
      } else {
        severity = 'severe';
        severityLabel = '较高负荷心理压力';
        advice = '您正在承受沉重心理负荷，建议尽快与资深主任咨询师李老师或王老师进行深度访谈评估。';
        recommendedProductId = 'p3';
        recommendedProductName = '4次深度心理探索与梳理方案';
      }

      const calculatedResult: AssessmentResult = {
        scaleId: scaleType,
        scaleName: scaleType === 'phq9' ? 'PHQ-9 情绪活力初筛简表' : 'GAD-7 焦虑与紧绷自评简表',
        totalScore,
        severity,
        severityLabel,
        advice,
        recommendedProductId,
        recommendedProductName,
        completedAt: new Date().toLocaleTimeString().slice(0, 5),
      };

      setResult(calculatedResult);
    }
  };

  const handleResetTest = () => {
    setCurrentStep(0);
    setAnswers([]);
    setResult(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn text-slate-800">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-scaleIn">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
              <BarChart2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">标准化心理健康自测</h3>
              <p className="text-[11px] text-slate-500">科学量表快速筛查情绪状态与压力负荷</p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4">
          {!result ? (
            <div className="space-y-4">
              {/* Scale Tabs */}
              <div className="flex gap-2 text-xs">
                <button
                  onClick={() => { setScaleType('phq9'); handleResetTest(); }}
                  className={`flex-1 py-1.5 px-3 rounded-lg border text-center font-medium cursor-pointer ${
                    scaleType === 'phq9'
                      ? 'border-teal-500 bg-teal-50 text-teal-800 font-bold'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  PHQ-9 情绪活力初筛 (5题)
                </button>
                <button
                  onClick={() => { setScaleType('gad7'); handleResetTest(); }}
                  className={`flex-1 py-1.5 px-3 rounded-lg border text-center font-medium cursor-pointer ${
                    scaleType === 'gad7'
                      ? 'border-teal-500 bg-teal-50 text-teal-800 font-bold'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  GAD-7 焦虑与紧张度自评 (5题)
                </button>
              </div>

              {/* Progress bar */}
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>第 {currentStep + 1} / {currentQuestions.length} 题</span>
                <span>根据过去两周的实际感受作答</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-600 transition-all duration-300 rounded-full"
                  style={{ width: `${((currentStep + 1) / currentQuestions.length) * 100}%` }}
                />
              </div>

              {/* Question */}
              <div className="py-2">
                <h4 className="text-sm font-bold text-slate-900 leading-snug">
                  {currentQuestions[currentStep].text}
                </h4>
              </div>

              {/* Options */}
              <div className="space-y-2">
                {currentQuestions[currentStep].options.map((opt, oIdx) => (
                  <button
                    key={oIdx}
                    onClick={() => handleSelectOption(opt.score)}
                    className="w-full p-3 rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50/60 transition-all text-left flex items-center justify-between text-xs cursor-pointer group"
                  >
                    <span className="font-medium text-slate-700 group-hover:text-teal-900">
                      {opt.label}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-teal-600 group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Test Result View */
            <div className="space-y-4 animate-scaleIn text-xs">
              <div className="p-4 bg-teal-50 rounded-2xl border border-teal-200 text-center space-y-1.5">
                <span className="text-[11px] text-teal-700 font-semibold block">自测结果报告</span>
                <div className="text-2xl font-bold text-teal-950 font-mono">
                  得分: {result.totalScore} 分
                </div>
                <div className="inline-block px-3 py-1 rounded-full bg-teal-200 text-teal-900 font-bold text-xs">
                  {result.severityLabel}
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <span className="font-bold text-slate-800 text-xs block">💡 专业心理建议</span>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {result.advice}
                </p>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-amber-700 font-semibold block">推荐服务方案</span>
                  <strong className="text-xs text-amber-950">{result.recommendedProductName}</strong>
                </div>
                <span className="text-[10px] px-2 py-0.5 bg-amber-200 text-amber-900 rounded font-bold">
                  匹配度 96%
                </span>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  onClick={handleResetTest}
                  className="px-3 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 text-xs cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>重新测评</span>
                </button>
                <button
                  onClick={() => {
                    if (onCompleteAssessment) onCompleteAssessment(result);
                    onClose();
                  }}
                  className="flex-1 py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl text-xs cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>将自测结果同步至对话中</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
