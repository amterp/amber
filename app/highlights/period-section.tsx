import { Submission } from "@/lib/types";
import SubmissionCard from "@/components/submission-card";

interface Props {
  title: string;
  submissions: Submission[];
}

export default function PeriodSection({ title, submissions }: Props) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 border-b-2 border-orange-400 pb-1 mb-2">
        {title}
      </h2>
      {submissions.length === 0 ? (
        <p className="py-4 text-gray-400 text-sm">No data available</p>
      ) : (
        submissions.map((s, i) => (
          <SubmissionCard key={s.id} submission={s} rank={i + 1} />
        ))
      )}
    </section>
  );
}
