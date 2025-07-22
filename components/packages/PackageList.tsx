'use client'

interface Package {
  package_id: number
  package_name: string
  pt_session_cnt: number
  group_session_cnt: number
  valid_date: number
  price: number
  created_at: string
}

type Props = {
  packages: Package[]
}

export default function PackageList({ packages }: Props) {
  const sorted = [...packages].sort((a, b) => a.package_name.localeCompare(b.package_name, 'ko'))

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mt-4">
      {sorted.map((pkg) => (
        <div key={pkg.package_id} className="p-4 bg-white rounded-lg shadow border border-gray-200">
          <h3 className="text-lg font-bold text-emerald-700">{pkg.package_name}</h3>
          <p className="text-sm text-gray-600">PT 세션: {pkg.pt_session_cnt}회</p>
          <p className="text-sm text-gray-600">그룹 세션: {pkg.group_session_cnt}회</p>
          <p className="text-sm text-gray-600">유효기간: {pkg.valid_date}달</p>
          <p className="text-sm text-gray-600">가격: {pkg.price.toLocaleString()}원</p>
        </div>
      ))}
    </div>
  )
}
