'use client';

import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { HealthMetric, Member, NewHealthMetric } from './types';
import AddHealthMetricOpen from './AddHealthMetricOpen';
import { Plus, ArrowLeft, Minus } from 'lucide-react';
import { addHealthMetricsToDB, getHealthMetrics, deleteHealthMetricById } from '@/lib/supabase';
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
  const [isListOpen, setIsListOpen] = useState(false);

  useEffect(() => {
    setLogs(healthLogs);
  }, [healthLogs]);

  if (!member || !member.name) {
    return <p className="text-center text-gray-500 mt-8">회원 정보가 없습니다.</p>;
  }

//   if (!logs || logs.length === 0) {
//     return <p className="text-center text-gray-500 mt-8">등록된 건강 기록이 없습니다.</p>;
//   }

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
  
    // 모든 날짜 수집 (이 metric_target 내에서)
    const allDatesSet = new Set(logs.map(log => log.measure_date.slice(0, 10)));
    const allDates = Array.from(allDatesSet).sort();
  
    // 날짜를 기준으로 기본 구조 만들기
    const dataMap: Record<string, { date: string; [k: string]: number | string | null }> = {};
    allDates.forEach(date => {
      dataMap[date] = { date, [key]: null };  // 초기화
    });
  
    logs.forEach(log => {
      if (log.metric_type !== metricType) return;
      const date = log.measure_date.slice(0, 10);
      dataMap[date][key] = log.metric_value;
    });
  
    return Object.values(dataMap);
  };
  
  const getMetricTypes = (logs: HealthMetric[]) =>
    Array.from(new Set(logs.map(log => log.metric_type)));

  // 초기 데이터 세팅
  useEffect(() => {
    if (!healthLogs) return;
    setLogs(healthLogs);
  }, [healthLogs]);
  
  if (!healthLogs) {
    return null;
  }


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

  const handleDelete = async (id: number) => {
    if (!confirm('해당 기록을 삭제하시겠습니까?')) return;
    try {
      await deleteHealthMetricById(id);
      const updated = await getHealthMetrics(member.member_id.toString());
      setLogs(updated);
      alert('기록 삭제를 완료하였습니다 😊');
    } catch (e) {
      console.error('삭제 중 오류:', e);
      alert('기록 삭제 중 문제가 발생했어요 😥');
    }
  };

  return (
    <div className="p-4 max-w-screen-lg mx-auto space-y-6">
      {/* 상단 버튼 영역 (항상 보임) */}
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
            onClick={() => setIsListOpen(true)} 
            className="w-full sm:w-auto flex items-center gap-1 text-sm text-red-600 border border-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100 transition duration-200"
          >
            <Minus size={16} />
            기록 삭제
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
  
      {/* 기록이 없을 경우 메시지 출력 */}
      {!logs || logs.length === 0 ? (
        <p className="text-center text-gray-500 mt-8">등록된 건강 기록이 없습니다.</p>
      ) : (
        <>
          {/* 타겟 선택 필터 */}
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
                            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip wrapperStyle={{ fontSize: 12 }} labelStyle={{ color: 'black' }} />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
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
        </>
      )}
  
      {/* 기록 추가 모달 */}
      {isAddOpen && (
        <AddHealthMetricOpen
          isOpen={isAddOpen}
          member={member}
          onSave={handleAddRecord}
          onCancel={() => setIsAddOpen(false)}
        />
      )}

      {isListOpen && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5 border border-gray-100 max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-red-600 border-b pb-2">건강 기록 삭제</h3>

            {/* 건강 기록 리스트 */}
            {logs.length === 0 ? (
              <p className="text-sm text-gray-500">삭제할 건강 기록이 없습니다.</p>
            ) : (
              <ul className="space-y-3">
                {logs.map(log => (
                  <li
                    key={log.health_id}
                    className="flex justify-between items-center border rounded-lg px-3 py-2 bg-gray-50 hover:bg-gray-100 transition"
                  >
                    <div className="text-sm text-gray-700">
                      <strong className="text-gray-900">{log.metric_type}</strong> | {log.metric_value} |{' '}
                      <span className="text-gray-500">{log.measure_date.slice(0, 10)}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(log.health_id)}
                      className="text-xs"
                    >
                      삭제
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            {/* 닫기 버튼 */}
            <div className="flex justify-end pt-4">
              <Button onClick={() => setIsListOpen(false)} className="text-gray-700" variant="outline">
                닫기
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
  
};

export default MemberHealthGraphsClient;
