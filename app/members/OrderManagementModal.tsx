import React, { useEffect, useState } from "react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { WorkoutType } from './types'
import type { DragEndEvent } from "@dnd-kit/core";
import { useSensors, useSensor, TouchSensor, MouseSensor } from "@dnd-kit/core";
import { Button } from '@/components/ui/button'

import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createClient } from "@supabase/supabase-js";

// Supabase client 설정
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Sortable 항목 컴포넌트
function SortableItem({ id }: { id: string }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    touchAction: "none" as const
  };
  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white text-gray-800 rounded border px-3 py-2 shadow-sm cursor-move hover:bg-gray-100"
    >
      {id}
    </li>
  );
}

type Props = {
  isOpen: boolean;
  onClose: () => void;
  allTypes: WorkoutType[];
  onRefreshAllTypes: () => void;
}

export default function OrderManagementModal({ allTypes, isOpen, onClose, onRefreshAllTypes }: Props) {
  const [activeTab, setActiveTab] = useState<"target" | "workout">("target");
  const [targetOrder, setTargetOrder] = useState<string[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [workoutOrder, setWorkoutOrder] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const filteredTypes = allTypes.filter(t => t.level !== 'GROUP');
  const uniqueTargets = Array.from(new Set(filteredTypes.map(t => t.target)));

  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    })
  );

  // 초기 Target 순서 설정
  useEffect(() => {
    const targetMap = new Map<string, number>();
    for (const t of filteredTypes) {
      if (!targetMap.has(t.target)) {
        const found = filteredTypes.find((x) => x.target === t.target);
        if (typeof found?.order_target === "number") {
          targetMap.set(t.target, found.order_target);
        } else {
          targetMap.set(t.target, 999);
        }
      }
    }
    const sorted = [...uniqueTargets].sort(
      (a, b) => (targetMap.get(a) ?? 999) - (targetMap.get(b) ?? 999)
    );
    setTargetOrder(sorted);
  }, [filteredTypes]);

  // Workout 순서 설정 (Target 선택 시)
  useEffect(() => {
    if (!selectedTarget) return;
    const filtered = filteredTypes.filter((t) => t.target === selectedTarget);
    const workoutMap = new Map<string, number>();
    for (const f of filtered) {
      if (typeof f.order_workout === "number") {
        workoutMap.set(f.workout, f.order_workout);
      } else {
        workoutMap.set(f.workout, 999);
      }
    }
    const sorted = filtered
      .map((f) => f.workout)
      .filter((w, i, arr) => arr.indexOf(w) === i)
      .sort((a, b) => (workoutMap.get(a) ?? 999) - (workoutMap.get(b) ?? 999));
    setWorkoutOrder(sorted);
  }, [selectedTarget, filteredTypes]);
  
  // DND 핸들러
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    if (activeTab === "target") {
      const oldIndex = targetOrder.indexOf(active.id as string);
      const newIndex = targetOrder.indexOf(over.id as string);
      setTargetOrder(arrayMove(targetOrder, oldIndex, newIndex));
    } else if (activeTab === "workout") {
      const oldIndex = workoutOrder.indexOf(active.id as string);
      const newIndex = workoutOrder.indexOf(over.id as string);
      setWorkoutOrder(arrayMove(workoutOrder, oldIndex, newIndex));
    }
  };


  type WorkoutOrderUpdate =
    | { target: string; order_target: number }
    | { workout_type_id: number; order_workout: number };

  const handleSave = async () => {
    setLoading(true);
    const updates: WorkoutOrderUpdate[] = [];
  
    if (activeTab === "target") {
      // 모든 target에 대해 일괄 업데이트
      for (let i = 0; i < targetOrder.length; i++) {
        const target = targetOrder[i];
        updates.push({ target, order_target: i });
      }
    } else if (activeTab === "workout" && selectedTarget) {
      // 선택된 target의 workout 목록을 기준으로 전체 workout_type_id 찾기
      for (let i = 0; i < workoutOrder.length; i++) {
        const workoutName = workoutOrder[i];
        const matchingWorkoutIds = allTypes
          .filter((t) => t.target === selectedTarget && t.workout === workoutName)
          .map((t) => t.workout_type_id);
  
        for (const id of matchingWorkoutIds) {
          updates.push({ workout_type_id: id, order_workout: i });
        }
      }
    }
  
    const { error } = await supabase.rpc("update_workout_orders", {
      changes: updates,
    });
  
    setLoading(false);
    if (error) {
      alert("순서 저장 중 오류 발생: " + error.message);
    } else {
      alert("순서가 저장되었습니다 😊");
      onClose();
      onRefreshAllTypes();
    }
  };
    
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center">
      <div className="bg-white w-full max-w-lg rounded-lg shadow-lg p-6 space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">순서 관리</h2>

        {/* 탭 */}
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab("target")}
            className={`px-3 py-2 rounded text-sm ${
              activeTab === "target" ? "bg-indigo-500 text-white" : "bg-gray-100 text-gray-700"
            }`}
          >
            Target 순서
          </button>
          <button
            onClick={() => setActiveTab("workout")}
            className={`px-3 py-2 rounded text-sm ${
              activeTab === "workout" ? "bg-indigo-500 text-white" : "bg-gray-100 text-gray-700"
            }`}
          >
            Workout 순서
          </button>
        </div>

        {/* Workout 선택 */}
        {activeTab === "workout" && (
          <select
            value={selectedTarget || ""}
            onChange={(e) => setSelectedTarget(e.target.value)}
            className="w-full border px-3 py-2 rounded text-gray-800 text-sm"
          >
            <option value="">-- Target 선택 --</option>
            {targetOrder.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        )}

        {/* 정렬 리스트 */}
        
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={activeTab === "target" ? targetOrder : workoutOrder}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-2 max-h-64 overflow-y-auto border p-2 rounded bg-gray-50 text-sm">
              {(activeTab === "target" ? targetOrder : workoutOrder).map((item) => (
                <SortableItem key={item} id={item} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>

        <div className="flex justify-end space-x-2 pt-2">
          
          <Button
            onClick={handleSave}
            disabled={loading}
            variant="outline"
            className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 text-sm"
          >
            {loading ? "저장 중..." : "저장"}
          </Button>
          <Button
            onClick={onClose}
            type="button"
            variant="outline"
            className="px-4 py-2 text-sm"
          >
            닫기
          </Button>
        </div>
      </div>
    </div>
  );
}
