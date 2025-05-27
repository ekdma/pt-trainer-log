import { useState, useEffect } from "react";
import MemberGraphs from "./MemberGraphs"; // 대소문자 파일명 주의
import type { Member, WorkoutRecord } from "./types";
import { getMembers, getWorkoutRecords } from "@/lib/queries";
import { Button } from "@/components/ui/button";

export default function MemberDashboard() {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [records, setRecords] = useState<WorkoutRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchMembers = async () => {
      setLoading(true);
      const membersData = await getMembers();
      setMembers(membersData);
      setLoading(false);
    };
    fetchMembers();
  }, []);

  const handleSelectMember = async (member: Member) => {
    setSelectedMember(member);
    setLoading(true);
    const recordsData = await getWorkoutRecords(member.member_id);
    setRecords(recordsData);
    setLoading(false);
  };

  const handleBack = () => {
    setSelectedMember(null);
    setRecords([]);
  };

  if (loading) return <div>Loading...</div>;

  if (!selectedMember) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-4">회원 목록</h1>
        <ul>
          {members.map((member) => (
            <li key={member.member_id} className="mb-2">
              <Button onClick={() => handleSelectMember(member)}>
                {member.name}
              </Button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <MemberGraphs
      member={selectedMember}
      record={records}
      logs={records} // 여기서 logs도 record와 동일하게 넘깁니다
      onBack={handleBack}
    />
  );
}
