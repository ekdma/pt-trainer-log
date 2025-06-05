'use client';

import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { HealthMetric, Member, NewHealthMetric } from './types';
import AddHealthMetricOpen from './AddHealthMetricOpen';
import { Plus, ArrowLeft } from 'lucide-react';
import { addHealthMetricsToDB, getHealthMetrics } from '@/lib/supabase';
import { Button } from '@/components/ui/button'

interface Props {
  healthLogs: HealthMetric[];
  member: Member;
  onBack: () => void;  // onBack prop 추가
}

const colorMap: { [key: string]: string } = {
  'Weight': '#e74c3c',
  'Body Fat Mass': '#3498db',
  'Skeletal Muscle Mass': '#2ecc71',
  'Body Fat Percentage': '#9b59b6',
  'Resting Heart Rate': '#f39c12',
};

const normalizeMetricKey = (label: string): string =>
  label.toLowerCase().replace(/\s+/g, '_');

const MemberHealthGraphsClient: React.FC<Props> = ({ healthLogs, member, onBack }) => {
  const [logs, setLogs] = useState<HealthMetric[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  useEffect(() => {
    setLogs(healthLogs);
  }, [healthLogs]);

  if (!member || !member.name) {
    return <p className="text-center text-gray-500 mt-8">회원 정보가 없습니다.</p>;
  }

  if (!logs || logs.length === 0) {
    return <p className="text-center text-gray-500 mt-8">등록된 건강 기록이 없습니다.</p>;
  }

  const targetGroups: { [target: string]: HealthMetric[] } = {};
  logs.forEach(log => {
    if (!targetGroups[log.metric_target]) {
      targetGroups[log.metric_target] = [];
    }
    targetGroups[log.metric_target].push(log);
  });

  const targets = Object.keys(targetGroups);

  const createChartData = (logs: HealthMetric[], metricType: string) => {
    const key = normalizeMetricKey(metricType);
    const dataMap: Record<string, { date: string; [k: string]: number | string }> = {};

    logs.forEach(log => {
      if (log.metric_type !== metricType) return;
      const date = log.measure_date.slice(0, 10);
      if (!dataMap[date]) dataMap[date] = { date };
      dataMap[date][key] = log.metric_value;
    });

    const data = Object.values(dataMap);
    data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return data;
  };

  const getMetricTypes = (logs: HealthMetric[]) =>
    Array.from(new Set(logs.map(log => log.metric_type)));

  // ✅ 건강 기록 추가 처리 함수
  const handleAddRecord = async (newRecord: NewHealthMetric): Promise<void> => {
    try {
      await addHealthMetricsToDB(newRecord);
      const updatedLogs = await getHealthMetrics(member.member_id.toString());
      setLogs(updatedLogs);
      setIsAddOpen(false);
      alert('기록 저장을 완료하였습니다 😊');
    } catch (error) {
      console.error('기록 저장 실패:', error);
      alert('기록 저장 중 문제가 발생했어요 😥');
    }
  };

  return (
    <div className="p-4 max-w-screen-lg mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
        <h2 className="text-xl text-black font-semibold">{member.name} 님의 건강 기록</h2>
        <div className="flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0">
            <Button
            onClick={() => setIsAddOpen(true)}
            className="w-full sm:w-auto flex items-center gap-1 text-sm text-green-600 border border-green-600 px-3 py-1.5 rounded-lg hover:bg-green-100 transition duration-200"
            >
            <Plus size={16} />
            기록 추가
            </Button>
            <Button
            onClick={onBack}  // 여기서 prop으로 받은 onBack 함수 호출
            className="w-full sm:w-auto flex items-center gap-1 text-sm text-indigo-600 border border-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition duration-200"
            >
            <ArrowLeft size={16} />
            뒤로
            </Button>
        </div>
      </div>

      {/* 타겟 선택 */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedTarget(null)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition duration-150 border ${
            selectedTarget === null
              ? 'bg-blue-600 text-white shadow-md border-transparent'
              : 'bg-white text-gray-700 hover:bg-blue-50 border-gray-300'
          }`}
        >
          통합
        </button>
        {targets.map(target => (
          <button
            key={target}
            onClick={() => setSelectedTarget(target)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition duration-150 border ${
              selectedTarget === target
                ? 'bg-blue-600 text-white shadow-md border-transparent'
                : 'bg-white text-gray-700 hover:bg-blue-50 border-gray-300'
            }`}
          >
            {target}
          </button>
        ))}
      </div>

      {/* 그래프 렌더링 */}
      {(selectedTarget === null ? targets : [selectedTarget]).map(target => {
        const groupLogs = targetGroups[target];
        const metricTypes = getMetricTypes(groupLogs);

        return (
          <div key={target} className="mb-10">
            <h3 className="text-l font-semibold text-indigo-500 mb-4">{target} 지표별 그래프</h3>
            <div className="flex flex-col gap-10">
              {metricTypes.map(metric => {
                const data = createChartData(groupLogs, metric);
                const key = normalizeMetricKey(metric);
                return (
                  <div key={metric} className="w-full">
                    <h4 className="text-sm text-black font-medium mb-2">{metric}</h4>
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip wrapperStyle={{ fontSize: 10 }} labelStyle={{ color: 'black' }} />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Line
                          type="monotone"
                          dataKey={key}
                          stroke={colorMap[metric] || '#8884d8'}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          name={metric}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* 기록 추가 모달에 콜백 함수 전달 */}
      <AddHealthMetricOpen
        isOpen={isAddOpen}
        onCancel={() => setIsAddOpen(false)} // ✅ prop 이름 일치
        onSave={handleAddRecord}
        member={member}                     // ✅ member prop 추가
      />
    </div>
  );
};

export default MemberHealthGraphsClient;
