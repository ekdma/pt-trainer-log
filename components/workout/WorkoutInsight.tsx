import React, { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { WorkoutRecord, Member } from '@/components/members/types'; // ✅ 기존 Member 타입 그대로 사용
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import TargetSelectListbox from '@/components/ui/TargetSelectListbox';
import { BarChart3 } from 'lucide-react'; // 아이콘
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import { useLanguage } from '@/context/LanguageContext'

dayjs.extend(isBetween);
dayjs.extend(isSameOrAfter);

interface WorkoutType {
  target: string;
  workout: string;
  order_target: number;
  order_workout: number;
}

interface TotalStats {
  thisWeekWorkoutCount: number;
  lastWeekWorkoutCount: number;
  updatedBestRecords: BestRecord[];
}

interface WorkoutInsightProps {
  member: Member;
}

interface BestRecord {
  workout: string;
  weight: number;
  date: string;
  isNewRecord: boolean;
  recentWeight: number | undefined;
  recentDate: string | undefined;
}

const WorkoutInsight = ({ member }: WorkoutInsightProps) => {

  const { t } = useLanguage()

  const [workoutLogs, setWorkoutLogs] = useState<WorkoutRecord[]>([]);
  const [isEmptyLog, setIsEmptyLog] = useState(false);
  const [showGraph, setShowGraph] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [totalStats, setTotalStats] = useState<TotalStats | null>(null);
  // const [chartData, setChartData] = useState<any[]>([]);
  const [workoutTypes, setWorkoutTypes] = useState<WorkoutType[]>([]);

  useEffect(() => {
    const fetchWorkoutTypes = async () => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('workout_types')
        .select('target, workout, order_target, order_workout')
        .order('order_target', { ascending: true })
        .order('order_workout', { ascending: true });

      if (error) {
        console.error('운동 타입 정보를 불러오는 중 오류:', error.message);
        return;
      }

      setWorkoutTypes(data ?? []);
    };

    fetchWorkoutTypes();
  }, []);


  useEffect(() => {
    const fetchWorkoutLogs = async () => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('member_id', member.member_id)
        .order('workout_date', { ascending: true });

      if (error) {
        console.error('운동 기록을 불러오는 중 오류:', error.message);
        return;
      }

      setWorkoutLogs(data ?? []);
      setIsEmptyLog((data ?? []).length === 0);
    };

    if (member?.member_id) fetchWorkoutLogs();
  }, [member]);

  useEffect(() => {
    if (workoutLogs.length > 0) {
      const stats = getTotalStats(workoutLogs);
      // const chart = getChartData(workoutLogs);
      setTotalStats(stats);
      // setChartData(chart);
    }
  }, [workoutLogs]);

  // --- 데이터 전처리 ---
  const groupedByTargetAndWorkout = workoutLogs.reduce((acc, log) => {
    if (!acc[log.target]) acc[log.target] = {};
    if (!acc[log.target][log.workout]) acc[log.target][log.workout] = [];
    acc[log.target][log.workout].push(log);
    return acc;
  }, {} as Record<string, Record<string, WorkoutRecord[]>>);

  const getLatestWorkoutDate = (logs: WorkoutRecord[]) =>
    logs.reduce((latest, log) => {
      const currentDate = dayjs(log.workout_date);
      return currentDate.isAfter(latest) ? currentDate : latest;
    }, dayjs(0));

  const getLast7WorkoutDates = (logs: WorkoutRecord[], latestDate: dayjs.Dayjs) => {
    const dates = logs.map((log) => dayjs(log.workout_date));
    const selectedDates: dayjs.Dayjs[] = [];
    let currentDate = latestDate;
    while (selectedDates.length < 7 && currentDate.isAfter(dayjs('1970-01-01'))) {
      const foundDate = dates.find((date) => date.isSame(currentDate, 'day'));
      if (foundDate) selectedDates.push(foundDate);
      currentDate = currentDate.subtract(1, 'day');
    }
    return selectedDates.reverse();
  };

  const getLogsForDates = (logs: WorkoutRecord[], selectedDates: dayjs.Dayjs[]) =>
    logs.filter((log) =>
      selectedDates.some((date) => dayjs(log.workout_date).isSame(date, 'day'))
    );

  const getChartData = (logs: WorkoutRecord[]) =>
    logs.map((log) => ({
      date: log.workout_date,
      weight: log.weight,
    }));

  const getTotalStats = (logs: WorkoutRecord[]) => {
    // 이번 주 운동 횟수 (날짜 기준으로 집계)
    const thisWeekStart = dayjs().startOf('week');
    const thisWeekLogs = logs.filter(log => dayjs(log.workout_date).isSameOrAfter(thisWeekStart));
    const uniqueThisWeekDates = new Set(thisWeekLogs.map(log => dayjs(log.workout_date).format('YYYY-MM-DD')));
    const thisWeekWorkoutCount = uniqueThisWeekDates.size;

    // 저번주 운동 횟수
    const lastWeekStart = dayjs().subtract(1, 'week').startOf('week');
    const lastWeekLogs = logs.filter(log => dayjs(log.workout_date).isSameOrAfter(lastWeekStart) && dayjs(log.workout_date).isBefore(thisWeekStart));
    const uniqueLastWeekDates = new Set(lastWeekLogs.map(log => dayjs(log.workout_date).format('YYYY-MM-DD')));
    const lastWeekWorkoutCount = uniqueLastWeekDates.size;

    // 최고 기록 갱신 여부
    const bestPerformances = logs.reduce((acc, log) => {
      if (!acc[log.workout]) {
        acc[log.workout] = { weight: log.weight, date: log.workout_date };
      } else if (log.weight > acc[log.workout].weight) {
        acc[log.workout] = { weight: log.weight, date: log.workout_date };
      }
      return acc;
    }, {} as Record<string, { weight: number; date: string }>);

    const updatedBestRecords: BestRecord[] = Object.keys(bestPerformances).map((workout) => {
      const record = bestPerformances[workout];
      const lastRecord = logs.find(
        (log) => log.workout === workout && log.weight === record.weight
      );
      const isNewRecord = dayjs(lastRecord?.workout_date).isSame(dayjs(), "week");
      const recentWeight = lastRecord?.weight;
      const recentDate = lastRecord?.workout_date;

      return {
        workout,
        weight: record.weight,
        date: record.date,
        isNewRecord,
        recentWeight,
        recentDate
      };
    });

    return { thisWeekWorkoutCount, lastWeekWorkoutCount, updatedBestRecords };
  };

  const targets = Array.from(new Set(workoutLogs.map((log) => log.target)));

  // ✅ workout_types 테이블의 order_target 순으로 재정렬
  const orderedTargets = targets.sort((a, b) => {
    const orderA =
      workoutTypes.find((t) => t.target === a)?.order_target ?? Number.MAX_SAFE_INTEGER;
    const orderB =
      workoutTypes.find((t) => t.target === b)?.order_target ?? Number.MAX_SAFE_INTEGER;
    return orderA - orderB;
  });

  return (
    <div className="p-5 bg-gray-50 rounded-xl shadow-lg max-w-6xl mx-auto">
      <h2 className="text-xl font-bold text-center mb-4 text-gray-800">🏋️ {t("workout_insight.workoutInsight")}</h2>

      {isEmptyLog ? (
        <div className="text-center text-gray-500">{t("workout_insight.noData")}</div>
      ) : (
        <>
          {/* Target 선택 */}
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-lg font-semibold text-gray-700">📍 Target </div>
            <TargetSelectListbox
              targets={orderedTargets}
              value={selectedTarget}
              onChange={setSelectedTarget}
            />
          </div>

          {selectedTarget ? (
            <div key={selectedTarget} className="space-y-8">
              <h3 className="text-2xl font-semibold text-gray-800 border-b border-gray-300 pb-2">
                {selectedTarget}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {Object.keys(groupedByTargetAndWorkout[selectedTarget])
                .sort((a, b) => {
                  const orderA =
                    workoutTypes.find(
                      (t) => t.target === selectedTarget && t.workout === a
                    )?.order_workout ?? Number.MAX_SAFE_INTEGER;
                  const orderB =
                    workoutTypes.find(
                      (t) => t.target === selectedTarget && t.workout === b
                    )?.order_workout ?? Number.MAX_SAFE_INTEGER;
                  return orderA - orderB;
                })
                .map((workout) => {
                  const logs = groupedByTargetAndWorkout[selectedTarget][workout];
                  const latestDate = getLatestWorkoutDate(logs);
                  const last7WorkoutDates = getLast7WorkoutDates(logs, latestDate);
                  const recentLogs = getLogsForDates(logs, last7WorkoutDates);

                  return (
                    <div
                      key={workout}
                      className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
                    >
                      <div>
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-blue-50 to-white">
                          <h4 className="text-xl font-bold text-gray-800">{workout}</h4>
                          <button
                            onClick={() => setShowGraph(showGraph === workout ? null : workout)}
                            className={`flex items-center gap-1 px-3 py-1 text-sm rounded-md font-medium transition 
                              ${showGraph === workout 
                                ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
                          >
                            <BarChart3 className="w-4 h-4 text-sm" />
                            {showGraph === workout ? t("workout_insight.hide") : t("workout_insight.graph")}
                          </button>
                        </div>

                        {/* 최근 기록 */}
                        <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
                          <h5 className="text-sm font-semibold text-gray-700 mb-3">📅 {t("workout_insight.recent7records")}</h5>

                          <div className="flex items-end justify-between gap-2 h-40 px-2 relative">
                            {recentLogs.length > 0 ? (
                              recentLogs
                                .sort((a, b) => dayjs(a.workout_date).diff(dayjs(b.workout_date)))
                                .map((log) => {
                                  const weight = Number(log.weight) || 0;
                                  const maxWeight = Math.max(...recentLogs.map((l) => Number(l.weight) || 0), 1);
                                  const heightPx = Math.max((weight / maxWeight) * 100, 10);
                                  const isMax = weight === maxWeight; // 최고기록 강조

                                  return (
                                    <div key={log.workout_id} className="flex flex-col items-center flex-1">
                                      {/* 무게 수치 표시 */}
                                      <span
                                        className="text-[11px] text-gray-700 mb-1"
                                        style={{
                                          fontWeight: isMax ? 700 : 500,
                                          color: isMax ? '#9333ea' : '#4b5563', // 최고기록은 보라색
                                        }}
                                      >
                                        {weight}
                                      </span>

                                      {/* 막대 */}
                                      <div
                                        className={`w-3 rounded-t-md shadow-sm transition-all duration-300 ${
                                          isMax ? 'bg-purple-500' : 'bg-blue-400'
                                        }`}
                                        style={{
                                          height: `${heightPx}px`,
                                        }}
                                      ></div>

                                      {/* 날짜 */}
                                      <span className="text-xs text-gray-600 mt-1">
                                        {dayjs(log.workout_date).format('MM.DD')}
                                      </span>
                                    </div>
                                  );
                                })
                            ) : (
                              <div className="text-center text-gray-400 w-full">{t("workout_insight.noDataAvailable")}</div>
                            )}
                          </div>
                        </div>




                      </div>

                      {/* 그래프 */}
                      {showGraph === workout && (
                        <div className="p-4 bg-white border-t border-gray-100">
                          <ResponsiveContainer width="100%" height={200}>
                            {/* ✅ 미리 정렬된 데이터 한 번만 계산 */}
                            {(() => {
                              const sortedData = getChartData(recentLogs).sort(
                                (a, b) => dayjs(a.date).diff(dayjs(b.date))
                              );

                              return (
                                <LineChart data={sortedData}>
                                  <CartesianGrid strokeDasharray="3 3" />

                                  {/* ✅ 월이 바뀌면 MM.DD, 아니면 DD만 표시 */}
                                  <XAxis
                                    dataKey="date"
                                    tickFormatter={(date, index) => {
                                      const current = dayjs(date);
                                      const prev = index > 0 ? dayjs(sortedData[index - 1].date) : null;

                                      if (!prev || current.month() !== prev.month()) {
                                        return current.format('MM.DD');
                                      }
                                      return current.format('DD');
                                    }}
                                    tick={{ fontSize: 12, fill: '#4b5563' }}
                                    tickLine={false}
                                  />

                                  <YAxis
                                    tick={{ fontSize: 12, fill: '#4b5563' }}
                                    tickLine={false}
                                    axisLine={false}
                                  />

                                  <Tooltip
                                    contentStyle={{
                                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                      borderRadius: '8px',
                                      border: '1px solid #e5e7eb',
                                      fontSize: '12px',
                                    }}
                                    labelFormatter={(date) => dayjs(date).format('MM.DD')}
                                  />


                                  <Line
                                    type="monotone"
                                    dataKey="weight"
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    dot={{ r: 4 }}
                                  />
                                </LineChart>
                              );
                            })()}
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* 1️⃣ 주간 비교 카드 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center shadow-sm">
                  <p className="text-gray-600 text-sm">{t("workout_insight.thisWeek")} <br /> {t("workout_insight.workoutCnt")} </p>
                  <p className="text-2xl font-bold text-blue-700">
                    {totalStats?.thisWeekWorkoutCount || 0}{t("workout_insight.workoutUnit")}
                  </p>
                </div>
                <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center shadow-sm">
                  <p className="text-gray-600 text-sm">{t("workout_insight.lastWeek")} <br /> {t("workout_insight.workoutCnt")} </p>
                  <p className="text-2xl font-bold text-green-700">
                    {totalStats?.lastWeekWorkoutCount || 0}{t("workout_insight.workoutUnit")}
                  </p>
                </div>
              </div>

              {/* 2️⃣ 최근 3개 운동 카드 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">💪 {t("workout_insight.recent3Workouts")}</h3>

                {(() => {
                  const sortedLogs = [...workoutLogs].sort((a, b) =>
                    dayjs(b.workout_date).diff(dayjs(a.workout_date))
                  );

                  const recentWorkouts: string[] = [];
                  for (const log of sortedLogs) {
                    if (!recentWorkouts.includes(log.workout)) {
                      recentWorkouts.push(log.workout);
                    }
                    if (recentWorkouts.length === 3) break;
                  }

                  const recentWorkoutLogs = recentWorkouts.map((workout) => {
                    const logs = workoutLogs.filter((l) => l.workout === workout);
                    return { workout, logs };
                  });

                  return (
                    <div className="grid md:grid-cols-3 gap-4">
                      {recentWorkoutLogs.map(({ workout, logs }) => {
                        const bestRecord = logs.reduce(
                          (best, log) => (log.weight > best.weight ? log : best),
                          logs[0]
                        );
                        const latestRecord = logs.reduce((latest, log) =>
                          dayjs(log.workout_date).isAfter(latest.workout_date) ? log : latest
                        );

                        const isNew = dayjs(bestRecord.workout_date).isSame(
                          latestRecord.workout_date,
                          'day'
                        );

                        return (
                          <div
                            key={workout}
                            className="bg-white rounded-xl p-5 shadow-md border hover:shadow-lg transition-all duration-300 relative overflow-hidden"
                          >
                            {/* 상단 타이틀 */}
                            <h4 className="font-semibold text-gray-800 mb-3 text-lg flex justify-between items-center">
                              {workout}
                              {/* ✅ 로그 개수가 3개 미만일 때 NEW 표시 */}
                              {logs.length < 3 && (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                                  NEW
                                </span>
                              )}
                            </h4>


                            {/* 한 줄 요약형 */}
                            <div className="space-y-3">
                              <div className="flex justify-between items-baseline">
                                <span className="text-sm text-gray-600">🏆 {t("workout_insight.personalBest")}</span>
                                <span className="text-xl font-bold text-purple-600 tracking-tight">
                                  {bestRecord.weight}
                                  <span className="text-sm text-gray-500 ml-1 font-normal">
                                    kg ({dayjs(bestRecord.workout_date).format('YY.MM.DD')})
                                  </span>
                                </span>
                              </div>

                              <div className="flex justify-between items-baseline">
                                <span className="text-sm text-gray-600">🕒 {t("workout_insight.latestRecord")}</span>
                                <span className="text-xl font-bold text-blue-600 tracking-tight">
                                  {latestRecord.weight}
                                  <span className="text-sm text-gray-500 ml-1 font-normal">
                                    kg ({dayjs(latestRecord.workout_date).format('YY.MM.DD')})
                                  </span>
                                </span>
                              </div>
                            </div>

                            {/* 상태 메시지 */}
                            <p
                              className={`mt-4 text-sm font-semibold text-center ${
                                isNew ? 'text-green-600' : 'text-gray-500'
                              }`}
                            >
                              {isNew ? t("workout_insight.newBest") : t("workout_insight.keepitup")}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>


          )}
        </>
      )}
    </div>
  );
};

export default WorkoutInsight;
