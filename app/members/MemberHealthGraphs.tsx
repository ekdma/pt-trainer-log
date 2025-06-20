'use client';

import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer
} from 'recharts';
import { HealthMetric, Member, HealthMetricType } from './types';
// import AddHealthMetricOpen from './AddHealthMetricOpen';
import HealthMetricManager from './HealthMetricManager' 
import OrderHealthMetricModal from './OrderHealthMetricModal'
import { NotebookPen, ArrowLeft } from 'lucide-react';
// import { addHealthMetricsToDB, getHealthMetrics, deleteHealthMetricById } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { getHealthMetricTypes } from '../../lib/supabase' // 실제 경로에 맞춰 수정 필요

interface Props {
  healthLogs: HealthMetric[];
  member: Member;
  onBack: () => void;
}

// const normalizeMetricKey = (label: string): string =>
//   label.toLowerCase().replace(/\s+/g, '_');

// metric 별로 날짜별 값만 뽑아서 배열로 리턴
function createChartDataForMetric(logs: HealthMetric[], metricType: string) {
  const dataMap: Record<string, number | null> = {};

  logs.forEach(log => {
    if (log.metric_type === metricType) {
      const date = log.measure_date.slice(0, 10);
      dataMap[date] = log.metric_value;
    }
  });

  // 날짜별로 정렬된 배열 만들기
  // 로그의 날짜들을 모두 모아 정렬 후, 없는 날짜는 null로 채움
  const allDates = Array.from(
    new Set(logs.map(log => log.measure_date.slice(0, 10)))
  ).sort();

  return allDates.map(date => ({
    date,
    value: dataMap[date] ?? null,
  }));
};

const colorMap: { [key: string]: string } = {
  // Body Composition 
  'Weight': '#e74c3c',              // 진한 빨강 (기존 유지)
  'Skeletal Muscle Mass': '#27ae60', // 선명한 초록 (기존보다 조금 더 진함)
  'Body Fat Mass': '#2980b9',       // 진한 파랑 (기존보다 조금 더 진함)
  'Body Fat Percentage': '#8e44ad', // 보라 (기존과 비슷하지만 조금 더 짙음)

  // HP & BP  
  'Resting Heart Rate': '#f39c12',  // 선명한 주황 (기존 유지)
  'Systolic BP': '#d35400',         // 진한 오렌지
  'Diastolic BP': '#e67e22',        // 밝은 주황

  // Overall Fitness 
  'Cardiopulmonary Endurance': '#16a085',  // 청록색
  'Upper Body Strength': '#2980b9',        // 진한 파랑 (Body Fat Mass와 통일 가능)
  'Lower Body Strength': '#c0392b',        // 강렬한 빨강 (Weight와 비슷 톤)
};

const MemberHealthGraphsClient: React.FC<Props> = ({ healthLogs, member, onBack }) => {
  const [logs, setLogs] = useState<HealthMetric[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  // const [isAddOpen, setIsAddOpen] = useState(false);
  // const [isListOpen, setIsListOpen] = useState(false);
  const [isHealthMetricManagerOpen, setIsHealthMetricManagerOpen] = useState(false)
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false)
  const [allTypes, setAllTypes] = useState<HealthMetricType[]>([]);
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');

  useEffect(() => {
    setLogs(healthLogs);
  }, [healthLogs]);

  useEffect(() => {
    getHealthMetricTypes()
      .then(types => {
        setAllTypes(types)
      })
      .catch(console.error)
  }, [])

  function fetchHealthMetricTypes() {
    getHealthMetricTypes()
      .then(types => setAllTypes(types))
      .catch(console.error);
  }

  useEffect(() => {
    if (isOrderModalOpen) {
      fetchHealthMetricTypes();
    }
  }, [isOrderModalOpen]);
  
  if (!member || !member.name) {
    return <p className="text-center text-gray-500 mt-8">회원 정보가 없습니다.</p>;
  }

  const targetGroups: { [target: string]: HealthMetric[] } = {};
  logs.forEach(log => {
    if (!targetGroups[log.metric_target]) {
      targetGroups[log.metric_target] = [];
    }
    targetGroups[log.metric_target].push(log);
  });

  const targets = Object.keys(targetGroups);
  const targetsSorted = [...targets].sort((a, b) => {
    const aOrder = allTypes.find(t => t.metric_target === a)?.order_target ?? 999;
    const bOrder = allTypes.find(t => t.metric_target === b)?.order_target ?? 999;
    return aOrder - bOrder;
  });
  const currentTargets = selectedTarget === null ? targetsSorted : [selectedTarget];

  // ✅ 월 단위 첫 데이터만 추출하는 함수
  const getMonthlyFirstData = <T extends { date: string }>(data: T[]): T[] => {
    const monthMap = new Map<string, T>();
    data.forEach((item) => {
      const monthKey = item.date.slice(0, 7); // "YYYY-MM"
      if (!monthMap.has(monthKey) || new Date(item.date) < new Date(monthMap.get(monthKey)!.date)) {
        monthMap.set(monthKey, item);
      }
    });
    return Array.from(monthMap.values());
  };  


  return (
    <div className="p-4 max-w-screen-lg mx-auto space-y-10">
      <div className="space-y-6">
        {/* 상단 버튼 영역 */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
          <h2 className="text-xl text-black font-semibold">{member.name} 님의 건강 기록</h2>
          <div className="flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0">
            <Button 
              className="w-full sm:w-auto flex items-center gap-1 text-sm text-yellow-600 border border-yellow-600 px-3 py-1.5 rounded-lg hover:bg-yellow-100 transition duration-200"
              onClick={() => setIsOrderModalOpen(true)}
            >
              순서관리
            </Button>
            <Button 
              onClick={() => setIsHealthMetricManagerOpen(true)}
              className="w-full sm:w-auto flex items-center gap-1 text-sm text-purple-600 border border-purple-600 px-3 py-1.5 rounded-lg hover:bg-purple-100 transition duration-200"
            >
              <NotebookPen size={16} />
              기록관리
            </Button>
            <Button
              onClick={onBack}
              className="w-full sm:w-auto flex items-center gap-1 text-sm text-indigo-600 border border-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition duration-200"
            >
              <ArrowLeft size={16} />
              뒤로
            </Button>
          </div>
        </div>

        {/* 타겟 선택 필터 */}
        {targets.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedTarget(null)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 shadow-sm ${
                selectedTarget === null
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                  : 'bg-white text-gray-700 hover:bg-blue-100 border-gray-300'
              }`}
            >
              통합
            </button>
            {targetsSorted.map((target) => (
              <button
                key={target}
                onClick={() => setSelectedTarget(target)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 shadow-sm ${
                  selectedTarget === target
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                    : 'bg-white text-gray-700 hover:bg-blue-100 border-gray-300'
                }`}
              >
                {target}
              </button>
            ))}
          </div>
        )}
        {targets.length > 0 && (
          <div className="flex justify-end mb-4">
            <div className="inline-flex rounded-md shadow-sm border border-gray-300 overflow-hidden">
              <button
                onClick={() => setViewMode('daily')}
                className={`px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                  viewMode === 'daily'
                    ? 'bg-indigo-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                일 단위
              </button>
              <button
                onClick={() => setViewMode('monthly')}
                className={`px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                  viewMode === 'monthly'
                    ? 'bg-indigo-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                월 단위
              </button>
            </div>
          </div>
        )}


        {/* 그래프 영역 */}
        {currentTargets.length === 0 || currentTargets.every(target => !targetGroups[target] || targetGroups[target].length === 0) ? (
          <p className="text-center text-gray-500 mt-8">등록된 건강 지표가 없습니다.</p>
        ) : (
          currentTargets.map(target => {
            const groupLogs = targetGroups[target];
            if (!groupLogs || groupLogs.length === 0) return null;

            // 날짜별 운동별 값 변환
            const metricTypesMap: Record<string, Record<string, number>> = {};
            groupLogs.forEach((log) => {
              if (!metricTypesMap[log.measure_date]) metricTypesMap[log.measure_date] = {};
              metricTypesMap[log.measure_date][log.metric_type] = log.metric_value;
            });
            // const valueData = Object.entries(metricTypesMap).map(([date, metric_types]) => ({ date, ...metric_types }));

            // 운동 종류 추출 및 정렬
            const typesInGroup = Array.from(new Set(groupLogs.map((log) => log.metric_type)));
            const sortedWorkouts = typesInGroup.sort((a, b) => {
              const aOrder = allTypes.find(w => w.metric_type === a && w.metric_target === target)?.order_type ?? 999;
              const bOrder = allTypes.find(w => w.metric_type === b && w.metric_target === target)?.order_type ?? 999;
              return aOrder - bOrder;
            });

            return (
              <section key={target}>
                <h3 className="text-l font-semibold text-indigo-500 mb-4">{target} 종합 그래프</h3>

                <div className="space-y-0">
                  {sortedWorkouts.map((metric, index) => {
                    let data = createChartDataForMetric(groupLogs, metric);
                    if (viewMode === 'monthly') {
                      data = getMonthlyFirstData(data);
                    }
                    const maxVal = Math.max(...data.map(d => d.value ?? 0));
                    const isLast = index === sortedWorkouts.length - 1;

                    return (
                      <div
                        key={metric}
                        className="flex items-center space-x-4 w-full"
                        style={{ height: 110, marginBottom: 0, paddingBottom: 0 }}
                      >
                        <div
                          className="w-[15%] text-right pr-2 font-semibold text-gray-700 text-sm"
                          style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}
                        >
                          {metric}
                        </div>
                        <div className="w-[85%] h-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data} margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis
                                dataKey="date"
                                tick={isLast ? { fontSize: 13, fontWeight: 'bold' } : false}
                                axisLine={true}
                                tickLine={true}
                                tickFormatter={(date: string) => dayjs(date).format('YY.MM.DD')}
                              />
                              <YAxis
                                tick={false}
                                domain={['auto', maxVal + 1]}
                                width={40}
                              />
                              <Line
                                type="monotone"
                                dataKey="value"
                                stroke={colorMap[metric] || '#8884d8'}
                                strokeWidth={2}
                                dot={{ r: 3 }}
                                name={metric}
                                isAnimationActive={false}
                                label={({ x, y, value }) => (
                                  <text
                                    x={x}
                                    y={y - 6}
                                    fill="#555"
                                    fontSize={13}
                                    fontWeight="bold"
                                    textAnchor="middle"
                                  >
                                    {Number(value).toFixed(1)}
                                  </text>
                                )}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}


        {isOrderModalOpen && (
          <OrderHealthMetricModal
            isOpen={isOrderModalOpen}
            onClose={() => setIsOrderModalOpen(false)}
            allTypes={allTypes}
            onRefreshAllTypes={fetchHealthMetricTypes}  // ✅ 여기 추가
          />
        )}

        {isHealthMetricManagerOpen && (
          <HealthMetricManager
            member={member}
            logs={logs}
            onClose={() => setIsHealthMetricManagerOpen(false)}
            onUpdateLogs={(updatedLogs) => setLogs(updatedLogs)}
          />
        )}
      </div>
    </div>
  );
};

export default MemberHealthGraphsClient;
